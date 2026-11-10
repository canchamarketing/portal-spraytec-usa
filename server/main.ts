// Servidor do Portal Spraytec.
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import fstatic from '@fastify/static';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { abrirBanco, migrar } from './db.ts';
import { carregar, salvar, gravarTudo } from './estado.ts';
import { ACOES, destinoArquivo, type Aviso } from './acoes.ts';
import { visaoPara } from './visao.ts';
import { coletaRodando, coletarMeta, metaConfigurado } from './integracoes/meta.ts';
import {
  ErroDrive, PARTE, abrirConteudo, carregarDrive, concluirAutorizacao, desconectarDrive, driveConectado, driveConfigurado, envioDe,
  enviarParte, iniciarEnvio, miniatura, situacaoDrive, urlAutorizacao,
} from './integracoes/drive.ts';
import {
  carregarGA4, coletaGA4Rodando, coletarGA4, concluirGA4, desconectarGA4, escolherPropriedade, ga4Conectado, ga4Configurado, urlAutorizacaoGA4,
} from './integracoes/ga4.ts';
import { carregarGAds, coletaGAdsRodando, coletarGAds, concluirGAds, desconectarGAds, escolherClienteGAds, gadsConectado, gadsConfigurado, urlAutorizacaoGAds } from './integracoes/googleads.ts';
import { carregarYT, coletaYTRodando, coletarYT, concluirYT, desconectarYT, urlAutorizacaoYT, ytConectado, ytConfigurado } from './integracoes/youtube.ts';
import { dadosDemo, USUARIOS_DEMO } from './seed.ts';
import { ErroAcao, NOME_PAPEL, PAPEIS, agoraBR, clone, definirFeriadosExtras, hojeBR, novoId, type Usuario } from './dominio.ts';
import {
  COOKIE_DEMO, codigoDemoConfere, consultarToken, criarSessao, criarToken, demoLiberado, emailConfigurado, encerrarSessao,
  enviarAviso, enviarConvite, enviarRedefinicao, bloqueado, hashSenha, liberarDemo, linkDoToken, modoDemo, permitido, problemaNaSenha,
  registrar, usarToken, usuarioDaRequisicao, verificarSenha,
} from './auth.ts';

const PORTA = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORTA}`;
const b = await abrirBanco();
const aplicadas = await migrar(b);
await carregarDrive(b);
await carregarGA4(b);
await carregarYT(b);
await carregarGAds(b);

// Pessoas de demonstração e dados fictícios (só em modo demonstração e com o banco vazio).
async function garantirUsuariosDemo() {
  await b.query('update usuarios set ativo=false where demo and not (id = any($1))', [USUARIOS_DEMO.map((u) => u.id)]);
  for (const u of USUARIOS_DEMO)
    await b.query(
      `insert into usuarios (id, nome, papel, demo, ordem) values ($1,$2,$3,true,$4)
       on conflict (id) do update set nome=excluded.nome, papel=excluded.papel, ordem=excluded.ordem, ativo=true`,
      [u.id, u.nome, u.papel, u.ordem]);
}
async function auditar(q: { query: typeof b.query }, u: Partial<Usuario> | null, acao: string, resumo: string, entrada: any, mudancas: any, ip?: string) {
  await q.query(
    'insert into auditoria (usuario_id, usuario_nome, papel, acao, resumo, entrada, mudancas, ip) values ($1,$2,$3,$4,$5,$6,$7,$8)',
    [u?.id ?? null, u?.nome ?? 'sistema', u?.papel ?? null, acao, resumo, JSON.stringify(entrada ?? null), JSON.stringify(mudancas ?? null), ip ?? null]);
}
async function restaurarDemo(u: Partial<Usuario> | null, ancora = process.env.DEMO_HOJE || hojeBR()) {
  await b.tx(async (q) => {
    await gravarTudo(q, dadosDemo(ancora), 'sistema');
    await auditar(q, u, 'demo-restaurar', `Dados iniciais carregados (referência: ${ancora})`, null, null);
  });
}
if (modoDemo()) {
  await garantirUsuariosDemo();
  const { rows } = await b.query('select count(*)::int as n from docs');
  if (!rows[0].n) await restaurarDemo(null);
}

// Um pedido de alteração por vez: evita que duas aprovações simultâneas se atropelem.
let fila: Promise<unknown> = Promise.resolve();
function emFila<T>(fn: () => Promise<T>): Promise<T> {
  const r = fila.then(fn, fn);
  fila = r.catch(() => {});
  return r;
}

const app = Fastify({ logger: { level: process.env.LOG_LEVEL || 'info' }, disableRequestLogging: true, trustProxy: true, bodyLimit: 1_000_000 });
await app.register(cookie, { secret: process.env.COOKIE_SEGREDO || randomBytes(32).toString('hex') });

app.addHook('onSend', async (req, rep, payload) => {
  // O navegador sempre confere se há versão nova da tela (e nunca guarda respostas da API).
  // Arquivos do Drive podem ficar uma hora no navegador de quem já os abriu (cada rota decide).
  if (!(req.url.startsWith('/api/arquivos/') && rep.getHeader('Cache-Control'))) rep.header('Cache-Control', req.url.startsWith('/api/') ? 'no-store' : 'no-cache');
  rep.header('X-Content-Type-Options', 'nosniff');
  rep.header('X-Frame-Options', 'DENY');
  rep.header('Referrer-Policy', 'same-origin');
  rep.header('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: https://*.cdninstagram.com https://*.fbcdn.net https://i.ytimg.com https://yt3.ggpht.com https://yt3.googleusercontent.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  return payload;
});
// Pedidos que alteram dados precisam vir do próprio portal.
app.addHook('preHandler', async (req, rep) => {
  if (req.method === 'GET' || req.method === 'HEAD') return;
  const o = req.headers.origin;
  if (o && new URL(o).host !== req.headers.host) return rep.code(403).send({ erro: 'Origem não permitida.' });
});

async function exigir(req: FastifyRequest, rep: FastifyReply): Promise<Usuario | null> {
  const u = await usuarioDaRequisicao(b, req);
  if (!u) { rep.code(401).send({ erro: 'Entre de novo para continuar.' }); return null; }
  return u;
}
async function versao(): Promise<number> {
  const { rows } = await b.query('select coalesce(max(id),0)::int as v from auditoria');
  return rows[0].v;
}
async function pessoasAtivas(q: { query: typeof b.query } = b) {
  return (await q.query(`select id, nome, papel from usuarios where ativo and (demo = $1 or not demo) order by demo, nome`, [modoDemo()])).rows;
}
async function estadoPara(u: Usuario) {
  const e = await carregar(b);
  const r: any = { eu: u, hoje: hojeBR(), versao: await versao(), demo: modoDemo(), dados: visaoPara(e, u) };
  // A Cancha escolhe quem da Operação aprovou quando registra aprovação por WhatsApp ou e-mail.
  const pessoas = await pessoasAtivas();
  if (u.papel === 'cancha') r.aprovadores = pessoas.filter((p: any) => p.papel === 'operacao');
  // Quem pode ser mencionado com @ (quem lê comentários e conversas).
  const dc = driveConectado();
  r.drive = { configurado: driveConfigurado(), conectado: !!dc, ...(u.papel === 'cancha' && dc ? { conta: dc.conta } : {}) };
  const ga = ga4Conectado();
  const ga2 = gadsConectado();
  r.gads = { configurado: gadsConfigurado(), conectado: !!ga2, conta: ga2?.cliente?.nome || null, ...(u.papel === 'cancha' && ga2 ? { email: ga2.conta, opcoes: ga2.cliente ? [] : ga2.opcoes } : {}) };
  const yt = ytConectado();
  r.yt = { configurado: ytConfigurado(), conectado: !!yt, canal: yt?.canal.titulo || null, ...(u.papel === 'cancha' && yt ? { conta: yt.conta } : {}) };
  r.ga4 = { configurado: ga4Configurado(), conectado: !!ga, propriedade: ga?.propriedade?.nome || null, ...(u.papel === 'cancha' && ga ? { conta: ga.conta, opcoes: ga.propriedade ? [] : ga.opcoes } : {}) };
  if (['operacao', 'cancha', 'leitor'].includes(u.papel)) r.mencionaveis = pessoas.filter((p: any) => ['operacao', 'cancha', 'leitor'].includes(p.papel) && p.id !== u.id);
  return r;
}

// ---------- saúde (para o monitor externo) ----------
app.get('/saude', async (_req, rep) => {
  try { await b.query('select 1'); return { ok: true }; } catch { return rep.code(503).send({ ok: false }); }
});

// ---------- login ----------
app.get('/api/entrar/opcoes', async (req) => {
  const liberado = demoLiberado(req);
  const pessoas = liberado ? (await b.query('select id, nome, papel from usuarios where demo and ativo order by ordem')).rows : [];
  return { demo: modoDemo(), demoLiberado: liberado, pessoas, email: emailConfigurado(), senha: true };
});
app.post('/api/entrar/demo-codigo', async (req, rep) => {
  if (!modoDemo()) return rep.code(404).send({ erro: 'Modo demonstração desligado.' });
  if (bloqueado('demo:' + req.ip)) return rep.code(429).send({ erro: 'Muitas tentativas erradas. Espere alguns minutos.' });
  if (!codigoDemoConfere((req.body as any)?.codigo)) { registrar('demo:' + req.ip); return rep.code(400).send({ erro: 'Código incorreto.' }); }
  liberarDemo(rep);
  return { ok: true };
});
app.post('/api/entrar/demo', async (req, rep) => {
  if (!demoLiberado(req)) return rep.code(403).send({ erro: 'Digite o código de acesso da demonstração.' });
  const id = (req.body as any)?.usuarioId;
  const { rows } = await b.query('select id from usuarios where id=$1 and demo and ativo', [id]);
  if (!rows[0]) return rep.code(400).send({ erro: 'Pessoa não encontrada.' });
  await encerrarSessao(b, req, rep);
  await criarSessao(b, rows[0].id, req, rep);
  return { ok: true };
});
// E-mail e senha. Depois de 5 senhas erradas a conta fica bloqueada por 15 minutos.
// A resposta de erro é sempre a mesma, para não revelar se o e-mail existe.
const ERRO_LOGIN = 'E-mail ou senha incorretos.';
app.post('/api/entrar/senha', async (req, rep) => {
  if (!permitido('senha:' + req.ip, 30)) return rep.code(429).send({ erro: 'Muitas tentativas. Espere alguns minutos.' });
  const email = String((req.body as any)?.email || '').trim().toLowerCase().slice(0, 200);
  const senha = String((req.body as any)?.senha || '').slice(0, 200);
  const u = (await b.query(
    `select id, nome, papel, senha_hash, bloqueado_ate > now() as bloqueado from usuarios where lower(email)=$1 and ativo and not demo`, [email])).rows[0];
  const ok = await verificarSenha(senha, u ? u.senha_hash : null);
  if (u && u.bloqueado) return rep.code(429).send({ erro: 'Conta bloqueada por alguns minutos depois de várias tentativas. Tente de novo mais tarde ou use "Esqueci minha senha".' });
  if (!u || !ok) {
    if (u) {
      const r = (await b.query(`update usuarios set falhas_login = falhas_login + 1 where id=$1 returning falhas_login`, [u.id])).rows[0];
      if (r.falhas_login >= 5) {
        await b.query(`update usuarios set falhas_login = 0, bloqueado_ate = now() + interval '15 minutes' where id=$1`, [u.id]);
        await auditar(b, { id: u.id, nome: u.nome, papel: u.papel }, 'login-bloqueado', 'Conta bloqueada por 15 minutos depois de 5 senhas erradas', null, null, req.ip);
      }
    }
    return rep.code(400).send({ erro: ERRO_LOGIN });
  }
  await b.query(`update usuarios set falhas_login = 0, bloqueado_ate = null where id=$1`, [u.id]);
  await encerrarSessao(b, req, rep);
  await criarSessao(b, u.id, req, rep);
  return { ok: true };
});
// Página de criar senha: mostra de quem é o link (sem gastar o link).
app.get('/api/senha/link', async (req, rep) => {
  if (!permitido('link:' + req.ip, 40)) return rep.code(429).send({ erro: 'Muitas tentativas. Espere alguns minutos.' });
  const t = String((req.query as any)?.t || '');
  const r = t && (await consultarToken(b, t));
  if (!r) return rep.code(400).send({ erro: 'Este link já foi usado ou venceu. Peça um novo.' });
  return { nome: r.nome, email: r.email, tipo: r.tipo };
});
app.post('/api/senha/definir', async (req, rep) => {
  if (!permitido('link:' + req.ip, 40)) return rep.code(429).send({ erro: 'Muitas tentativas. Espere alguns minutos.' });
  const t = String((req.body as any)?.t || ''), senha = (req.body as any)?.senha;
  const antes = t && (await consultarToken(b, t));
  if (!antes) return rep.code(400).send({ erro: 'Este link já foi usado ou venceu. Peça um novo.' });
  const problema = problemaNaSenha(senha, antes.email);
  if (problema) return rep.code(400).send({ erro: problema });
  const r = await usarToken(b, t);
  if (!r) return rep.code(400).send({ erro: 'Este link já foi usado ou venceu. Peça um novo.' });
  await b.query(`update usuarios set senha_hash=$2, senha_definida_em=now(), falhas_login=0, bloqueado_ate=null where id=$1`, [r.id, await hashSenha(senha)]);
  await b.query('delete from sessoes where usuario_id=$1', [r.id]); // sai dos outros aparelhos
  await encerrarSessao(b, req, rep);
  await criarSessao(b, r.id, req, rep);
  const u = (await b.query('select id, nome, papel from usuarios where id=$1', [r.id])).rows[0];
  await auditar(b, u, r.tipo === 'convite' ? 'senha-criada' : 'senha-redefinida', r.tipo === 'convite' ? 'Criou a senha e entrou pela primeira vez' : 'Criou uma nova senha', null, null, req.ip);
  return { ok: true };
});
app.post('/api/senha/esqueci', async (req, rep) => {
  if (!permitido('esqueci:' + req.ip, 5)) return rep.code(429).send({ erro: 'Muitos pedidos. Espere alguns minutos.' });
  if (!emailConfigurado()) return rep.code(503).send({ erro: 'O envio de e-mail ainda não está configurado. Peça à Cancha um link para criar uma nova senha.' });
  const email = String((req.body as any)?.email || '').trim().toLowerCase().slice(0, 200);
  const u = (await b.query(`select id, nome, email, papel from usuarios where lower(email)=$1 and ativo and not demo`, [email])).rows[0];
  if (u) {
    const t = await criarToken(b, u.id, 'redefinir', 1);
    await enviarRedefinicao(BASE_URL, u, linkDoToken(BASE_URL, t, 'redefinir')).catch((err) => req.log.error({ err }, 'falha ao enviar redefinição'));
    await auditar(b, u, 'senha-esqueci', 'Pediu link para criar nova senha', null, null, req.ip);
  }
  return { ok: true, msg: 'Se o e-mail estiver cadastrado, o link para criar uma nova senha chega em instantes.' };
});
app.post('/api/sair', async (req, rep) => { await encerrarSessao(b, req, rep); return { ok: true }; });
app.post('/api/sair-demo', async (req, rep) => { await encerrarSessao(b, req, rep); rep.clearCookie(COOKIE_DEMO, { path: '/' }); return { ok: true }; });

// ---------- dados ----------
app.get('/api/estado', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  // "Desde a sua última visita": guarda a visita anterior quando a pessoa volta depois de 1 hora.
  const { rows } = await b.query(
    `update usuarios set visita_anterior = case when visto_em is null or visto_em < now() - interval '1 hour' then visto_em else visita_anterior end,
       visto_em = now() where id=$1 returning visita_anterior`, [u.id]);
  const r: any = await estadoPara(u);
  r.ultimaVisita = rows[0]?.visita_anterior || null;
  return r;
});
app.get('/api/versao', async (req, rep) => { const u = await exigir(req, rep); if (!u) return; return { versao: await versao() }; });

// Avisos por e-mail (menções). Saem depois de gravar; se o envio falhar, a ação continua valendo.
// Quem está no modo demonstração não dispara e-mail para pessoas reais.
async function avisar(avisos: Aviso[], autor: Usuario) {
  if (autor.demo || !emailConfigurado()) return;
  for (const a of avisos) {
    const { rows } = await b.query(`select id, nome, email from usuarios where id = any($1) and ativo and not demo and email is not null`, [a.para]);
    for (const p of rows) if (p.id !== autor.id) await enviarAviso(BASE_URL, p, a.assunto, a.paragrafos, `${BASE_URL}/?abrir=${encodeURIComponent(a.abrir)}`);
  }
}

// Aplica uma ação: carrega, confere a regra, grava só o que mudou e registra na auditoria, numa transação.
async function executarAcao(u: Usuario, acao: string, d: any, ip?: string) {
  const def = ACOES[acao];
  const res = await emFila(() => b.tx(async (q) => {
    const e = await carregar(q);
    const antes = clone(e);
    definirFeriadosExtras(e.marcos);
    const r = def.fn({ e, u, d, hoje: hojeBR(), agora: agoraBR(), pessoas: await pessoasAtivas(q) });
    const mud = await salvar(q, antes, e, u.nome);
    if (!def.semAuditoria) await auditar(q, u, acao, r.resumo, d, mud, ip);
    return r;
  }));
  if (res.avisos?.length) avisar(res.avisos, u).catch((err) => app.log.error({ err }, 'falha ao enviar aviso'));
  return res;
}

app.post('/api/acao', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  const { acao, ...d } = (req.body as any) || {};
  const def = ACOES[acao];
  if (!def) return rep.code(400).send({ erro: 'Ação desconhecida.' });
  if (!def.papeis.includes(u.papel)) return rep.code(403).send({ erro: 'Seu papel não permite esta ação.' });
  try {
    const res = await executarAcao(u, acao, d, req.ip);
    return { ok: true, criado: res.criado, ...(await estadoPara(u)) };
  } catch (err) {
    if (err instanceof ErroAcao) return rep.code(400).send({ erro: err.message, codigo: err.codigo });
    req.log.error({ err }, 'falha na ação');
    return rep.code(500).send({ erro: 'Não foi possível salvar. Nada foi alterado.' });
  }
});

// Atividade recente (registro de auditoria) para a equipe da Cancha.
app.get('/api/atividade', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a equipe da Cancha vê o registro completo.' });
  const { rows } = await b.query(`select id, em, usuario_nome, papel, acao, resumo from auditoria order by id desc limit 100`);
  return { itens: rows };
});

// ---------- pessoas (quem entra no portal) — só a Cancha gerencia ----------
app.get('/api/pessoas', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a equipe da Cancha gerencia os acessos.' });
  const { rows } = await b.query(`select id, nome, email, papel, ativo, visto_em, senha_definida_em is not null as tem_senha, convite_enviado_em from usuarios where not demo order by ativo desc, papel, nome`);
  return { pessoas: rows, papeis: NOME_PAPEL, email: emailConfigurado() };
});
app.post('/api/pessoas/salvar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a equipe da Cancha gerencia os acessos.' });
  const d = (req.body as any) || {};
  const nome = String(d.nome || '').trim().slice(0, 120);
  const email = String(d.email || '').trim().toLowerCase().slice(0, 200);
  const papel = String(d.papel || '');
  const ativo = d.ativo !== false;
  if (!nome) return rep.code(400).send({ erro: 'Preencha o nome.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return rep.code(400).send({ erro: 'E-mail inválido.' });
  if (!(PAPEIS as readonly string[]).includes(papel)) return rep.code(400).send({ erro: 'Papel inválido.' });
  if (d.id === u.id && (!ativo || papel !== 'cancha')) return rep.code(400).send({ erro: 'Você não pode tirar o seu próprio acesso de Cancha.' });
  const dup = (await b.query('select id from usuarios where lower(email)=$1 and id <> $2', [email, d.id || ''])).rows[0];
  if (dup) return rep.code(400).send({ erro: 'Já existe uma pessoa com este e-mail.' });
  const r = await b.tx(async (q) => {
    let antes: any = null, id = d.id;
    if (id) {
      antes = (await q.query('select nome, email, papel, ativo from usuarios where id=$1 and not demo', [id])).rows[0];
      if (!antes) throw new ErroAcao('Pessoa não encontrada.');
      await q.query('update usuarios set nome=$2, email=$3, papel=$4, ativo=$5, atualizado_em=now() where id=$1', [id, nome, email, papel, ativo]);
      if (!ativo || antes.papel !== papel) await q.query('delete from sessoes where usuario_id=$1', [id]);
    } else {
      id = novoId('u-');
      await q.query('insert into usuarios (id, nome, email, papel, ativo) values ($1,$2,$3,$4,$5)', [id, nome, email, papel, ativo]);
    }
    const resumo = !antes ? `Cadastrou ${nome} (${email}) como ${NOME_PAPEL[papel]}`
      : !ativo && antes.ativo ? `Desativou o acesso de ${nome}`
      : ativo && !antes.ativo ? `Reativou o acesso de ${nome}`
      : `Atualizou o cadastro de ${nome} (${NOME_PAPEL[papel]})`;
    await auditar(q, u, 'pessoa-salvar', resumo, { id, nome, email, papel, ativo }, { antes }, req.ip);
    return { id };
  }).catch((err) => { if (err instanceof ErroAcao) return { erro: err.message }; throw err; });
  if ((r as any).erro) return rep.code(400).send(r);
  return { ok: true, id: (r as any).id };
});

// Convite: gera o link para a pessoa criar a senha (ou uma nova senha, se ela já tiver uma).
// Com e-mail configurado, envia; sem e-mail, a Cancha copia o link e manda por outro canal.
app.post('/api/pessoas/convite', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a equipe da Cancha gerencia os acessos.' });
  const d = (req.body as any) || {};
  const p = (await b.query('select id, nome, email, senha_definida_em is not null as tem_senha from usuarios where id=$1 and ativo and not demo', [d.id])).rows[0];
  if (!p) return rep.code(400).send({ erro: 'Pessoa não encontrada ou com acesso desativado.' });
  if (!p.email) return rep.code(400).send({ erro: 'Cadastre o e-mail da pessoa antes.' });
  const tipo = p.tem_senha ? 'redefinir' : 'convite';
  const link = linkDoToken(BASE_URL, await criarToken(b, p.id, tipo, tipo === 'convite' ? 24 * 7 : 24), tipo);
  let enviado = false;
  if (d.enviar) {
    if (!emailConfigurado()) return rep.code(503).send({ erro: 'O envio de e-mail ainda não está configurado. Use "Copiar link".' });
    try {
      await (tipo === 'convite' ? enviarConvite(BASE_URL, p, link) : enviarRedefinicao(BASE_URL, p, link));
      enviado = true;
    } catch (err) {
      req.log.error({ err }, 'falha ao enviar convite');
      return rep.code(502).send({ erro: 'Não consegui enviar o e-mail agora. Tente de novo ou use "Copiar link".' });
    }
  }
  await b.query('update usuarios set convite_enviado_em = now() where id=$1', [p.id]);
  const oque = tipo === 'convite' ? 'convite' : 'link de nova senha';
  await auditar(b, u, 'pessoa-convite', enviado ? `Enviou ${oque} por e-mail para ${p.nome}` : `Gerou ${oque} para ${p.nome} (copiado para enviar por outro canal)`, { id: p.id, tipo, enviado }, null, req.ip);
  return { ok: true, tipo, enviado, link: enviado ? undefined : link };
});

// ---------- integrações ----------
// Números que chegam do Meta e do Google Analytics (coletados pelo servidor). A produtora não recebe.
app.get('/api/metricas', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel === 'produtora') return rep.code(403).send({ erro: 'Não permitido.' });
  const r: any = { conectado: metaConfigurado(), ig: { perfil: null, dias: [], posts: [], stories: [] }, fb: { perfil: null, dias: [], posts: [] }, ads: { anuncios: [], dias: [] },
    ga4: { dias: [], canais: [], paginas: [], eventos: [] }, yt: { perfil: null, dias: [], videos: [] },
    gads: { campanhas: [], dias: [], anuncios: [], adDias: [] } };
  const lista: Record<string, string> = { dia: 'dias', post: 'posts', story: 'stories', anuncio: 'anuncios', anuncio_dia: 'dias', canal_dia: 'canais', pagina_dia: 'paginas', evento_dia: 'eventos', video: 'videos', campanha: 'campanhas', campanha_dia: 'dias', anuncio_g_dia: 'adDias' };
  const { rows } = await b.query(`select fonte, tipo, id, dados from metricas order by fonte, tipo, id`);
  for (const x of rows) {
    if (!r[x.fonte]) continue;
    if (x.dados?.removido_em) continue; // apagado ou arquivado na rede (ver marcarSumidos)
    if (x.tipo === 'perfil') r[x.fonte].perfil = x.dados;
    else if (lista[x.tipo]) r[x.fonte][lista[x.tipo]].push(x.tipo === 'dia' ? { d: x.id, ...x.dados } : x.dados);
  }
  // O texto do erro (que pode citar configuração) só vai para a Cancha.
  const st = (await b.query(`select fonte, ultimo_ok, ultima_tentativa, erro from integracoes`)).rows;
  r.situacao = Object.fromEntries(st.map((x: any) => [x.fonte, { ultimoOk: x.ultimo_ok, tentativa: x.ultima_tentativa, erro: x.erro ? (u.papel === 'cancha' ? x.erro : 'falha na última coleta') : null }]));
  return r;
});
app.post('/api/integracoes/atualizar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha atualiza as integrações.' });
  const ga = !!ga4Conectado()?.propriedade, yt = !!ytConectado(), gads = !!gadsConectado()?.cliente;
  if (!metaConfigurado() && !ga && !yt && !gads) return rep.code(503).send({ erro: 'Nenhuma integração está configurada no servidor.' });
  if (coletaRodando() || coletaGA4Rodando() || coletaYTRodando() || coletaGAdsRodando()) return { ok: true, jaRodando: true };
  if (metaConfigurado()) coletarMeta(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do Meta'));
  if (ga) coletarGA4(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do Google Analytics'));
  if (yt) coletarYT(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do YouTube'));
  if (gads) coletarGAds(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do Google Ads'));
  return { ok: true };
});

// ---------- Google Drive: conexão (a Cancha conecta uma vez, logada na conta Google da Spraytec) ----------
const RETORNO_DRIVE = BASE_URL + '/api/drive/retorno';
const pedidosDrive = new Map<string, { uid: string; ate: number; tipo?: 'ga4' | 'yt' | 'gads' }>();
app.get('/api/drive/conectar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha conecta o Drive.' });
  if (!driveConfigurado()) return rep.redirect('/?drive=sem-config');
  const s = randomBytes(18).toString('base64url');
  for (const [k, v] of pedidosDrive) if (v.ate < Date.now()) pedidosDrive.delete(k);
  pedidosDrive.set(s, { uid: u.id, ate: Date.now() + 15 * 60e3 });
  return rep.redirect(urlAutorizacao(RETORNO_DRIVE, s));
});
app.get('/api/drive/retorno', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  const qy: any = req.query || {}, st = pedidosDrive.get(String(qy.state || ''));
  pedidosDrive.delete(String(qy.state || ''));
  const aviso = st?.tipo || 'drive';
  if (!st || st.ate < Date.now() || st.uid !== u.id) return rep.redirect(`/?${aviso}=expirou`);
  if (qy.error || !qy.code) return rep.redirect(`/?${aviso}=cancelado`);
  if (st.tipo === 'gads') {
    try {
      const r = await concluirGAds(b, String(qy.code), RETORNO_DRIVE);
      await auditar(b, u, 'gads-conectar', `Conectou o Google Ads pela conta ${r.conta || '(sem e-mail)'}${r.cliente ? ', conta de anúncios ' + r.cliente.nome : ''}`, { conta: r.conta, cliente: r.cliente }, null, req.ip);
      if (r.cliente) coletarGAds(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do Google Ads'));
      return rep.redirect(r.cliente ? '/?gads=ok' : '/?gads=escolher');
    } catch (err) {
      req.log.error({ err }, 'falha ao conectar o Google Ads');
      return rep.redirect('/?gads=erro&msg=' + encodeURIComponent(String((err as Error).message).slice(0, 200)));
    }
  }
  if (st.tipo === 'yt') {
    try {
      const r = await concluirYT(b, String(qy.code), RETORNO_DRIVE);
      await auditar(b, u, 'yt-conectar', `Conectou o canal ${r.canal.titulo} do YouTube pela conta ${r.conta || '(sem e-mail)'}`, { conta: r.conta, canal: r.canal }, null, req.ip);
      coletarYT(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do YouTube'));
      return rep.redirect('/?yt=ok');
    } catch (err) {
      req.log.error({ err }, 'falha ao conectar o YouTube');
      return rep.redirect('/?yt=erro&msg=' + encodeURIComponent(String((err as Error).message).slice(0, 200)));
    }
  }
  if (st.tipo === 'ga4') {
    try {
      const r = await concluirGA4(b, String(qy.code), RETORNO_DRIVE);
      await auditar(b, u, 'ga4-conectar', `Conectou o Google Analytics pela conta ${r.conta || '(sem e-mail)'}${r.propriedade ? ', propriedade ' + r.propriedade.nome : ''}`, { conta: r.conta, propriedade: r.propriedade }, null, req.ip);
      if (r.propriedade) coletarGA4(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do Google Analytics'));
      return rep.redirect(r.propriedade ? '/?ga4=ok' : '/?ga4=escolher');
    } catch (err) {
      req.log.error({ err }, 'falha ao conectar o Google Analytics');
      return rep.redirect('/?ga4=erro&msg=' + encodeURIComponent(String((err as Error).message).slice(0, 200)));
    }
  }
  try {
    const r = await concluirAutorizacao(b, String(qy.code), RETORNO_DRIVE);
    await auditar(b, u, 'drive-conectar', `Conectou o Google Drive da conta ${r.conta}`, { conta: r.conta }, null, req.ip);
    return rep.redirect('/?drive=ok');
  } catch (err) {
    req.log.error({ err }, 'falha ao conectar o Drive');
    return rep.redirect('/?drive=erro&msg=' + encodeURIComponent(String((err as Error).message).slice(0, 200)));
  }
});
app.post('/api/drive/desconectar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha desconecta o Drive.' });
  const conta = driveConectado()?.conta;
  await desconectarDrive(b);
  await auditar(b, u, 'drive-desconectar', `Desconectou o Google Drive${conta ? ' da conta ' + conta : ''} (os arquivos continuam no Drive)`, null, null, req.ip);
  return { ok: true };
});
// ---------- Google Analytics: conexão (a Cancha conecta uma vez, com uma conta que enxerga a propriedade) ----------
app.get('/api/ga4/conectar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha conecta o Google Analytics.' });
  if (!ga4Configurado()) return rep.redirect('/?ga4=sem-config');
  const s = randomBytes(18).toString('base64url');
  for (const [k, v] of pedidosDrive) if (v.ate < Date.now()) pedidosDrive.delete(k);
  pedidosDrive.set(s, { uid: u.id, ate: Date.now() + 15 * 60e3, tipo: 'ga4' });
  return rep.redirect(urlAutorizacaoGA4(RETORNO_DRIVE, s));
});
// ---------- YouTube: conexão (a Cancha conecta uma vez, com a conta dona do canal) ----------
app.get('/api/yt/conectar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha conecta o YouTube.' });
  if (!ytConfigurado()) return rep.redirect('/?yt=sem-config');
  const s = randomBytes(18).toString('base64url');
  for (const [k, v] of pedidosDrive) if (v.ate < Date.now()) pedidosDrive.delete(k);
  pedidosDrive.set(s, { uid: u.id, ate: Date.now() + 15 * 60e3, tipo: 'yt' });
  return rep.redirect(urlAutorizacaoYT(RETORNO_DRIVE, s));
});
// ---------- Google Ads: conexão (a Cancha conecta uma vez, com uma conta que é usuária do MCC) ----------
app.get('/api/gads/conectar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha conecta o Google Ads.' });
  if (!gadsConfigurado()) return rep.redirect('/?gads=sem-config');
  const s = randomBytes(18).toString('base64url');
  for (const [k, v] of pedidosDrive) if (v.ate < Date.now()) pedidosDrive.delete(k);
  pedidosDrive.set(s, { uid: u.id, ate: Date.now() + 15 * 60e3, tipo: 'gads' });
  return rep.redirect(urlAutorizacaoGAds(RETORNO_DRIVE, s));
});
app.post('/api/gads/conta', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha escolhe a conta de anúncios.' });
  try {
    const c = await escolherClienteGAds(b, String((req.body as any)?.id || ''));
    await auditar(b, u, 'gads-conta', `Escolheu a conta ${c.nome} do Google Ads`, { cliente: c }, null, req.ip);
    coletarGAds(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do Google Ads'));
    return { ok: true };
  } catch (err) { return rep.code((err as any).status || 400).send({ erro: (err as Error).message }); }
});
app.post('/api/gads/desconectar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha desconecta o Google Ads.' });
  const g = gadsConectado();
  await desconectarGAds(b);
  await auditar(b, u, 'gads-desconectar', `Desconectou o Google Ads${g?.conta ? ' da conta ' + g.conta : ''}; os números já coletados continuam no portal`, null, null, req.ip);
  return { ok: true };
});
app.post('/api/yt/desconectar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha desconecta o YouTube.' });
  const yt = ytConectado();
  await desconectarYT(b);
  await auditar(b, u, 'yt-desconectar', `Desconectou o YouTube${yt ? ' (canal ' + yt.canal.titulo + ')' : ''}; os números já coletados continuam no portal`, null, null, req.ip);
  return { ok: true };
});
app.post('/api/ga4/propriedade', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha escolhe a propriedade.' });
  try {
    const p = await escolherPropriedade(b, String((req.body as any)?.id || ''));
    await auditar(b, u, 'ga4-propriedade', `Escolheu a propriedade ${p.nome} do Google Analytics`, { propriedade: p }, null, req.ip);
    coletarGA4(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do Google Analytics'));
    return { ok: true };
  } catch (err) { return rep.code((err as any).status || 400).send({ erro: (err as Error).message }); }
});
app.post('/api/ga4/desconectar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Só a Cancha desconecta o Google Analytics.' });
  const ga = ga4Conectado();
  await desconectarGA4(b);
  await auditar(b, u, 'ga4-desconectar', `Desconectou o Google Analytics${ga?.conta ? ' da conta ' + ga.conta : ''} (os números já coletados continuam no portal)`, null, null, req.ip);
  return { ok: true };
});
app.get('/api/drive/situacao', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel !== 'cancha') return rep.code(403).send({ erro: 'Não permitido.' });
  if (!driveConectado()) return { conectado: false, configurado: driveConfigurado() };
  try { return { conectado: true, configurado: true, ...(await situacaoDrive()) }; }
  catch (err) { return { conectado: true, configurado: true, conta: driveConectado()?.conta, erro: (err as Error).message }; }
});

// ---------- arquivos: envio em partes pelo portal e leitura para quem pode ver o item ----------
const MAX_ARQUIVO = 5 * 1024 ** 3;
app.post('/api/arquivos/iniciar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (!driveConectado()) return rep.code(503).send({ erro: 'O Google Drive da Spraytec ainda não está conectado ao portal. Fale com a Cancha.' });
  const d = (req.body as any) || {};
  const ref = String(d.ref || ''), nome = String(d.nome || '').trim().slice(0, 200), tam = Number(d.tam);
  const tipo = /^[\w.+-]+\/[\w.+-]+$/.test(String(d.tipo || '')) ? String(d.tipo) : 'application/octet-stream';
  if (!nome) return rep.code(400).send({ erro: 'Arquivo sem nome.' });
  if (!Number.isInteger(tam) || tam < 1) return rep.code(400).send({ erro: `"${nome}" está vazio.` });
  if (tam > MAX_ARQUIVO) return rep.code(400).send({ erro: `"${nome}" passa de 5 GB. Comprima o arquivo antes de enviar.` });
  try {
    const caminho = destinoArquivo(await carregar(b), u, ref);
    const ev = await iniciarEnvio(b, u.id, ref, caminho, nome, tipo, tam);
    return { envio: ev.token, parte: PARTE };
  } catch (err) {
    if (err instanceof ErroAcao) return rep.code(400).send({ erro: err.message });
    req.log.error({ err }, 'falha ao iniciar envio ao Drive');
    return rep.code(err instanceof ErroDrive && err.status === 503 ? 503 : 502).send({ erro: err instanceof ErroDrive ? err.message : 'Não foi possível falar com o Google Drive. Tente de novo.' });
  }
});
app.addContentTypeParser('application/octet-stream', { parseAs: 'buffer', bodyLimit: PARTE + 1024 }, (_req, body, done) => done(null, body));
app.put('/api/arquivos/enviar/:token', { bodyLimit: PARTE + 1024 }, async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  const ev = envioDe(String((req.params as any).token), u.id);
  if (!ev || ev.usado) return rep.code(404).send({ erro: 'Envio não encontrado. Mande o arquivo de novo.' });
  const pedaco = req.body as Buffer;
  if (!Buffer.isBuffer(pedaco) || !pedaco.length) return rep.code(400).send({ erro: 'Parte vazia.' });
  try { await enviarParte(ev, Number(req.headers['x-inicio']), pedaco); }
  catch (err) {
    if (err instanceof ErroDrive && err.status === 409) return rep.code(409).send({ erro: err.message, recebido: ev.recebido });
    req.log.error({ err }, 'falha no envio ao Drive');
    return rep.code(502).send({ erro: err instanceof ErroDrive ? err.message : 'O envio ao Google Drive falhou. Tente de novo.', recebido: ev.recebido });
  }
  if (!ev.arquivo) return { feito: false, recebido: ev.recebido };
  try { await executarAcao(u, 'arquivo-anexar', { envio: ev.token }, req.ip); }
  catch (err) {
    if (err instanceof ErroAcao) return rep.code(400).send({ erro: `O arquivo chegou ao Drive, mas não foi registrado: ${err.message}` });
    throw err;
  }
  return { feito: true, recebido: ev.tam, ...(await estadoPara(u)) };
});

// Só abre arquivo que a pessoa vê no portal (a mesma regra das telas). O estado é relido só quando algo muda.
let memoEstado: { v: number; e: any } = { v: -1, e: null };
async function arquivoVisivel(u: Usuario, id: string): Promise<any> {
  const v = await versao();
  if (memoEstado.v !== v) memoEstado = { v, e: await carregar(b) };
  const e: any = visaoPara(memoEstado.e, u);
  for (const l of ['posts', 'videos', 'demandas']) for (const x of e[l] || []) { const a = (x.arquivos || []).find((y: any) => y.id === id); if (a) return a; }
  const m = (e.materiais || []).find((x: any) => x.id === id);
  if (m) return m;
  if (u.papel !== 'produtora') {
    // Cópia do story (vídeo ou imagem) e, nos vídeos, a capa guardada à parte.
    const s = (await b.query(`select dados from metricas where fonte='ig' and tipo='story' and (dados->>'drive'=$1 or dados->>'drive_capa'=$1)`, [id])).rows[0];
    if (s) return s.dados.drive === id ? { nome: 'story', tipo: s.dados.drive_tipo } : { nome: 'capa do story', tipo: 'image/jpeg' };
  }
  return null;
}
// Imagem, vídeo, áudio e PDF abrem no navegador; o resto só baixa (um HTML ou script enviado nunca roda no portal).
const ABRE_NA_TELA = /^(image\/(png|jpeg|gif|webp|heic|heif)|video\/[\w.+-]+|audio\/[\w.+-]+|application\/pdf)$/;
app.get('/api/arquivos/:id/conteudo', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  const id = String((req.params as any).id), a = await arquivoVisivel(u, id);
  if (!a) return rep.code(404).send({ erro: 'Arquivo não encontrado.' });
  try {
    const r = await abrirConteudo(id, typeof req.headers.range === 'string' ? req.headers.range : undefined);
    const tipo = (r.headers.get('content-type') || a.tipo || '').split(';')[0], tela = ABRE_NA_TELA.test(tipo) && !(req.query as any)?.baixar;
    rep.code(r.status);
    rep.header('content-type', tela ? tipo : 'application/octet-stream');
    for (const h of ['content-length', 'content-range']) { const v = r.headers.get(h); if (v) rep.header(h, v); }
    rep.header('accept-ranges', 'bytes');
    rep.header('content-disposition', `${tela ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(a.nome || 'arquivo')}`);
    rep.header('Cache-Control', 'private, max-age=3600');
    return rep.send(Readable.fromWeb(r.body as any));
  } catch (err) {
    req.log.warn({ err: (err as Error).message, id }, 'falha ao abrir arquivo do Drive');
    return rep.code(err instanceof ErroDrive && err.status === 404 ? 404 : 502).send({ erro: err instanceof ErroDrive ? err.message : 'Não foi possível abrir o arquivo.' });
  }
});
app.get('/api/arquivos/:id/miniatura', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  const id = String((req.params as any).id), a = await arquivoVisivel(u, id);
  if (!a) return rep.code(404).send({ erro: 'Arquivo não encontrado.' });
  const t = Math.min(1600, Math.max(100, Number((req.query as any)?.t) || 400));
  const m = await miniatura(id, t).catch(() => null);
  if (!m) {
    // Logo depois do envio o Google ainda não gerou a miniatura: imagem vai inteira.
    if (/^image\/(png|jpeg|gif|webp)$/.test(a.tipo || '')) return rep.redirect(`/api/arquivos/${encodeURIComponent(id)}/conteudo`);
    return rep.code(404).send({ erro: 'Sem miniatura.' });
  }
  rep.header('content-type', m.tipo).header('Cache-Control', 'private, max-age=3600');
  return rep.send(m.dados);
});

// Recarregar os dados fictícios (só em demonstração, só a Cancha).
app.post('/api/demo/restaurar', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (!modoDemo() || u.papel !== 'cancha') return rep.code(403).send({ erro: 'Não permitido.' });
  await emFila(() => restaurarDemo(u));
  return { ok: true };
});

// ---------- arquivos da interface ----------
await app.register(fstatic, { root: join(import.meta.dirname, '..', 'public'), index: 'index.html', cacheControl: false });
app.setNotFoundHandler((req, rep) => {
  if (req.url.startsWith('/api/')) return rep.code(404).send({ erro: 'Não encontrado.' });
  return rep.sendFile('index.html');
});

await app.listen({ port: PORTA, host: '0.0.0.0' });
app.log.info({ banco: b.tipo, migracoes: aplicadas, demo: modoDemo(), meta: metaConfigurado(), drive: driveConectado() ? 'conectado' : driveConfigurado() ? 'configurado' : 'sem chave' }, 'Portal Spraytec no ar');
// Coleta do Meta: a primeira meio minuto depois de subir, depois de hora em hora.
if (metaConfigurado()) {
  const coletar = () => coletarMeta(b, app.log).catch((err) => app.log.error({ err }, 'falha na coleta do Meta'));
  setTimeout(coletar, 30e3);
  setInterval(coletar, 3600e3);
}
// Coleta do Google Analytics: confere de hora em hora; busca de novo a cada 6 horas.
const coletarSite = () => coletarGA4(b, app.log).catch((err) => app.log.error({ err }, 'falha na coleta do Google Analytics'));
setTimeout(coletarSite, 45e3);
setInterval(coletarSite, 3600e3);
// Coleta do YouTube: mesma cadência do Google Analytics.
const coletarCanal = () => coletarYT(b, app.log).catch((err) => app.log.error({ err }, 'falha na coleta do YouTube'));
setTimeout(coletarCanal, 60e3);
setInterval(coletarCanal, 3600e3);
// Coleta do Google Ads: mesma cadência.
const coletarAnuncios = () => coletarGAds(b, app.log).catch((err) => app.log.error({ err }, 'falha na coleta do Google Ads'));
setTimeout(coletarAnuncios, 75e3);
setInterval(coletarAnuncios, 3600e3);
