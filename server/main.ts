// Servidor do Portal Spraytec.
import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cookie from '@fastify/cookie';
import fstatic from '@fastify/static';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { abrirBanco, migrar } from './db.ts';
import { carregar, salvar, gravarTudo } from './estado.ts';
import { ACOES, type Aviso } from './acoes.ts';
import { visaoPara } from './visao.ts';
import { coletaRodando, coletarMeta, metaConfigurado } from './integracoes/meta.ts';
import { dadosDemo, USUARIOS_DEMO } from './seed.ts';
import { ErroAcao, NOME_PAPEL, PAPEIS, agoraBR, clone, hojeBR, novoId, type Usuario } from './dominio.ts';
import {
  COOKIE_DEMO, codigoDemoConfere, consultarToken, criarSessao, criarToken, demoLiberado, emailConfigurado, encerrarSessao,
  enviarAviso, enviarConvite, enviarRedefinicao, bloqueado, hashSenha, liberarDemo, linkDoToken, modoDemo, permitido, problemaNaSenha,
  registrar, usarToken, usuarioDaRequisicao, verificarSenha,
} from './auth.ts';

const PORTA = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORTA}`;
const b = await abrirBanco();
const aplicadas = await migrar(b);

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
  rep.header('Cache-Control', req.url.startsWith('/api/') ? 'no-store' : 'no-cache');
  rep.header('X-Content-Type-Options', 'nosniff');
  rep.header('X-Frame-Options', 'DENY');
  rep.header('Referrer-Policy', 'same-origin');
  rep.header('Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  return payload;
});
// Pedidos que alteram dados precisam vir do próprio portal.
app.addHook('preHandler', async (req, rep) => {
  if (req.method !== 'POST') return;
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

app.post('/api/acao', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  const { acao, ...d } = (req.body as any) || {};
  const def = ACOES[acao];
  if (!def) return rep.code(400).send({ erro: 'Ação desconhecida.' });
  if (!def.papeis.includes(u.papel)) return rep.code(403).send({ erro: 'Seu papel não permite esta ação.' });
  try {
    const res = await emFila(() => b.tx(async (q) => {
      const e = await carregar(q);
      const antes = clone(e);
      const r = def.fn({ e, u, d, hoje: hojeBR(), agora: agoraBR(), pessoas: await pessoasAtivas(q) });
      const mud = await salvar(q, antes, e, u.nome);
      if (!def.semAuditoria) await auditar(q, u, acao, r.resumo, d, mud, req.ip);
      return r;
    }));
    if (res.avisos?.length) avisar(res.avisos, u).catch((err) => req.log.error({ err }, 'falha ao enviar aviso'));
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
// Números que chegam do Meta (coletados pelo servidor). A produtora não recebe.
app.get('/api/metricas', async (req, rep) => {
  const u = await exigir(req, rep); if (!u) return;
  if (u.papel === 'produtora') return rep.code(403).send({ erro: 'Não permitido.' });
  const r: any = { conectado: metaConfigurado(), ig: { perfil: null, dias: [], posts: [], stories: [] }, fb: { perfil: null, dias: [], posts: [] }, ads: { anuncios: [], dias: [] } };
  const lista: Record<string, string> = { dia: 'dias', post: 'posts', story: 'stories', anuncio: 'anuncios', anuncio_dia: 'dias' };
  const { rows } = await b.query(`select fonte, tipo, id, dados from metricas order by fonte, tipo, id`);
  for (const x of rows) {
    if (!r[x.fonte]) continue;
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
  if (!metaConfigurado()) return rep.code(503).send({ erro: 'A chave do Meta ainda não foi configurada no servidor.' });
  if (coletaRodando()) return { ok: true, jaRodando: true };
  coletarMeta(b, app.log, true).catch((err) => app.log.error({ err }, 'falha na coleta do Meta'));
  return { ok: true };
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
app.log.info({ banco: b.tipo, migracoes: aplicadas, demo: modoDemo(), meta: metaConfigurado() }, 'Portal Spraytec no ar');
// Coleta do Meta: a primeira meio minuto depois de subir, depois de hora em hora.
if (metaConfigurado()) {
  const coletar = () => coletarMeta(b, app.log).catch((err) => app.log.error({ err }, 'falha na coleta do Meta'));
  setTimeout(coletar, 30e3);
  setInterval(coletar, 3600e3);
}
