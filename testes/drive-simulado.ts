// Testa a integração com o Google Drive contra um Drive simulado (servidor local), num banco temporário.
// Uso: node testes/drive-simulado.ts
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };
const espera = async (fn: () => unknown, msg: string) => { try { await fn(); checa(false, msg); } catch (e) { checa(true, msg + ` (${(e as Error).message})`); } };
const checaSemErro = (fn: () => unknown, msg: string) => { try { fn(); checa(true, msg); } catch (e) { checa(false, msg + ` (${(e as Error).message})`); } };

// ---------- Drive simulado ----------
const arquivos = new Map<string, { id: string; name: string; mimeType: string; parents: string[]; dados: Buffer; pasta: boolean }>();
const sessoes = new Map<string, { meta: any; tam: number; partes: Buffer[]; recebido: number }>();
let seq = 0, acessos = 0, tokensRenovados = 0, comLeitura = false;
const servidor = createServer(async (req, res) => {
  const u = new URL(req.url!, 'http://x');
  const corpo: Buffer = await new Promise((r) => { const b: Buffer[] = []; req.on('data', (c) => b.push(c)); req.on('end', () => r(Buffer.concat(b))); });
  const json = (code: number, o: any, h: Record<string, string> = {}) => { res.writeHead(code, { 'content-type': 'application/json', ...h }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/token') {
    const p = new URLSearchParams(corpo.toString());
    if (p.get('grant_type') === 'authorization_code') return p.get('code') === 'codigo-bom'
      ? json(200, { access_token: 'acesso-1', expires_in: 3600, refresh_token: 'renovar-1', scope: 'https://www.googleapis.com/auth/drive.file' + (comLeitura ? ' https://www.googleapis.com/auth/drive.readonly' : '') })
      : json(400, { error: 'invalid_grant' });
    if (p.get('grant_type') === 'refresh_token') { tokensRenovados++; return p.get('refresh_token') === 'renovar-1' ? json(200, { access_token: 'acesso-2', expires_in: 3600 }) : json(400, { error: 'invalid_grant' }); }
  }
  if (u.pathname === '/revoke') return json(200, {});
  if (!/^Bearer acesso-\d$/.test(String(req.headers.authorization || '')) && !u.pathname.startsWith('/sessao/')) return json(401, { error: { message: 'sem token' } });
  acessos++;
  if (u.pathname === '/drive/v3/about') return json(200, { user: { emailAddress: 'spraytec@gmail.com', displayName: 'Spraytec' }, storageQuota: { limit: '16106127360', usage: '1000' } });
  if (u.pathname === '/drive/v3/files' && req.method === 'POST') {
    const m = JSON.parse(corpo.toString()); const id = 'f' + ++seq;
    if (m.parents?.[0] !== 'root' && !arquivos.has(m.parents?.[0])) return json(404, { error: { message: 'File not found: ' + m.parents?.[0] } });
    arquivos.set(id, { id, name: m.name, mimeType: m.mimeType, parents: m.parents, dados: Buffer.alloc(0), pasta: true });
    return json(200, { id });
  }
  if (u.pathname === '/upload/drive/v3/files' && u.searchParams.get('uploadType') === 'resumable') {
    const m = JSON.parse(corpo.toString());
    if (!arquivos.has(m.parents?.[0])) return json(404, { error: { message: 'File not found: ' + m.parents?.[0] } });
    const s = 's' + ++seq; sessoes.set(s, { meta: m, tam: Number(req.headers['x-upload-content-length']), partes: [], recebido: 0 });
    res.writeHead(200, { location: `http://localhost:${porta}/sessao/${s}` }); return res.end();
  }
  if (u.pathname.startsWith('/sessao/') && req.method === 'PUT') {
    const s = sessoes.get(u.pathname.slice(8))!; const [, ini, fim, tot] = String(req.headers['content-range']).match(/bytes (\d+)-(\d+)\/(\d+)/)!.map(Number);
    if (ini !== s.recebido || fim - ini + 1 !== corpo.length || tot !== s.tam) return json(400, { error: { message: 'range errado' } });
    s.partes.push(corpo); s.recebido = fim + 1;
    if (s.recebido < s.tam) { res.writeHead(308, { range: `bytes=0-${fim}` }); return res.end(); }
    const id = 'f' + ++seq; arquivos.set(id, { id, name: s.meta.name, mimeType: s.meta.mimeType, parents: s.meta.parents, dados: Buffer.concat(s.partes), pasta: false });
    return json(200, { id, name: s.meta.name, mimeType: s.meta.mimeType, size: String(s.tam) });
  }
  const mp = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/);
  if (mp && req.method === 'PATCH') {
    const a = arquivos.get(decodeURIComponent(mp[1])); if (!a) return json(404, { error: { message: 'File not found' } });
    const add = u.searchParams.get('addParents'), rem = (u.searchParams.get('removeParents') || '').split(',').filter(Boolean);
    if (add && !arquivos.has(add)) return json(404, { error: { message: 'File not found: ' + add } });
    a.parents = [...a.parents.filter((x) => !rem.includes(x)), ...(add ? [add] : [])]; return json(200, { id: a.id });
  }
  const mc = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)\/copy$/);
  if (mc && req.method === 'POST') {
    const a = arquivos.get(decodeURIComponent(mc[1])); if (!a) return json(404, { error: { message: 'File not found' } });
    const m = JSON.parse(corpo.toString()); if (!arquivos.has(m.parents?.[0])) return json(404, { error: { message: 'File not found: ' + m.parents?.[0] } });
    const id = 'f' + ++seq; arquivos.set(id, { ...a, id, name: m.name, parents: m.parents });
    return json(200, { id, name: m.name, mimeType: a.mimeType, size: String(a.dados.length) });
  }
  const mf = u.pathname.match(/^\/drive\/v3\/files\/([^/]+)$/);
  if (mf) {
    const a = arquivos.get(decodeURIComponent(mf[1])); if (!a) return json(404, { error: { message: 'File not found' } });
    if (u.searchParams.get('alt') === 'media') {
      const rg = String(req.headers.range || '').match(/bytes=(\d+)-(\d*)/);
      if (rg) { const i = Number(rg[1]), f = rg[2] ? Number(rg[2]) : a.dados.length - 1; res.writeHead(206, { 'content-type': a.mimeType, 'content-length': String(f - i + 1), 'content-range': `bytes ${i}-${f}/${a.dados.length}` }); return res.end(a.dados.subarray(i, f + 1)); }
      res.writeHead(200, { 'content-type': a.mimeType, 'content-length': String(a.dados.length) }); return res.end(a.dados);
    }
    return json(200, { id: a.id, parents: a.parents, name: a.name, size: String(a.dados.length), thumbnailLink: a.mimeType.startsWith('image/') ? `http://localhost:${porta}/miniatura/${a.id}=s220` : undefined, mimeType: a.mimeType });
  }
  if (u.pathname.startsWith('/miniatura/')) { res.writeHead(200, { 'content-type': 'image/jpeg' }); return res.end(Buffer.from('mini:' + u.pathname)); }
  json(404, { error: { message: 'rota ' + u.pathname } });
});
await new Promise<void>((r) => servidor.listen(0, r));
const porta = (servidor.address() as any).port;

// ---------- banco temporário ----------
const dir = mkdtempSync(join(tmpdir(), 'spraytec-drive-'));
process.env.PGLITE_DIR = dir;
process.env.GOOGLE_API_URL = `http://localhost:${porta}`;
process.env.GOOGLE_CLIENT_ID = 'cliente.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'segredo-de-teste';
process.env.DRIVE_CHAVE = 'ab'.repeat(32);
const { abrirBanco, migrar } = await import('../server/db.ts');
const D = await import('../server/integracoes/drive.ts');
const { ACOES, destinoArquivo } = await import('../server/acoes.ts');
const { visaoPara } = await import('../server/visao.ts');
const b = await abrirBanco();
await migrar(b);

console.log('Conexão');
await D.carregarDrive(b);
checa(D.driveConfigurado() && !D.driveConectado(), 'configurado e ainda sem conexão');
await espera(() => D.concluirAutorizacao(b, 'codigo-ruim', 'http://x/retorno'), 'código inválido é recusado');
const c = await D.concluirAutorizacao(b, 'codigo-bom', 'http://x/retorno');
checa(c.conta === 'spraytec@gmail.com', 'conecta e identifica a conta da Spraytec');
const seg = (await b.query(`select valor from segredos where nome='drive'`)).rows[0].valor;
checa(!seg.includes('renovar-1') && !seg.includes('spraytec@'), 'autorização guardada cifrada no banco');
const raiz = [...arquivos.values()].find((a) => a.name === 'Portal Spraytec');
checa(raiz && raiz.parents[0] === 'root', 'cria a pasta "Portal Spraytec" na raiz do Drive');
await D.carregarDrive(b);
checa(D.driveConectado()?.conta === 'spraytec@gmail.com', 'conexão volta depois de reiniciar o servidor');

console.log('Envio em partes e pastas');
const conteudo = Buffer.alloc(D.PARTE * 2 + 1234, 7); conteudo.write('inicio');
const ev = await D.iniciarEnvio(b, 'u1', 'p:x', ['Posts', '2026-11', '2026-11-04 Teste/barra (x)'], 'arte final.jpg', 'image/jpeg', conteudo.length);
for (let i = 0; i < conteudo.length; i += D.PARTE) await D.enviarParte(ev, i, conteudo.subarray(i, i + D.PARTE));
checa(ev.arquivo && ev.arquivo.tam === conteudo.length && arquivos.get(ev.arquivo.id)!.dados.equals(conteudo), 'arquivo de 16 MB chega inteiro em 3 partes');
const pastaPost = arquivos.get(arquivos.get(ev.arquivo!.id)!.parents[0])!;
checa(pastaPost.name === '2026-11-04 Teste barra (x)', 'pasta do post com nome limpo (sem barra)');
checa(arquivos.get(pastaPost.parents[0])!.name === '2026-11' && arquivos.get(arquivos.get(pastaPost.parents[0])!.parents[0])!.name === 'Posts', 'caminho Portal Spraytec/Posts/2026-11/...');
const nPastas = [...arquivos.values()].filter((a) => a.pasta).length;
await D.iniciarEnvio(b, 'u1', 'p:x', ['Posts', '2026-11', '2026-11-04 Teste/barra (x)'], 'outra.jpg', 'image/jpeg', 10);
checa([...arquivos.values()].filter((a) => a.pasta).length === nPastas, 'pastas já criadas são reaproveitadas');
const ev2 = await D.iniciarEnvio(b, 'u1', 'p:x', ['Posts'], 'x.bin', 'application/octet-stream', 10);
await espera(() => D.enviarParte(ev2, 5, Buffer.alloc(5)), 'parte fora de ordem é recusada');
checa(D.envioDe(ev2.token, 'outra-pessoa') === null, 'só quem começou o envio pode continuar');
// alguém apagou a pasta no Drive: o portal cria de novo
arquivos.delete(arquivos.get(pastaPost.parents[0])!.id); arquivos.delete(pastaPost.id);
const ev3 = await D.iniciarEnvio(b, 'u1', 'p:x', ['Posts', '2026-11', '2026-11-04 Teste/barra (x)'], 'depois.jpg', 'image/jpeg', 3);
await D.enviarParte(ev3, 0, Buffer.from('abc'));
checa(ev3.arquivo?.id, 'pasta apagada no Drive é recriada no próximo envio');

console.log('Leitura');
const r = await D.abrirConteudo(ev.arquivo!.id, 'bytes=0-5');
checa(r.status === 206 && Buffer.from(await r.arrayBuffer()).toString() === 'inicio', 'vídeo/arquivo abre por partes (Range)');
const mini = await D.miniatura(ev.arquivo!.id, 800);
checa(mini && mini.dados.toString().endsWith('=s800'), 'miniatura no tamanho pedido');
const salvo = await D.salvarArquivo(b, ['Stories', '2026-10'], 'story.jpg', 'image/jpeg', Buffer.from('story'));
checa(arquivos.get(salvo.id)?.dados.toString() === 'story', 'story salvo no Drive de uma vez');

console.log('Regras do portal');
const agora = '28/10 10:00', hoje = '2026-10-28';
const cancha = { id: 'uc', nome: 'Ana Cancha', papel: 'cancha' as const, email: null, demo: false };
const oper = { id: 'uo', nome: 'Matheus', papel: 'operacao' as const, email: null, demo: false };
const prod = { id: 'up', nome: 'Produtora', papel: 'produtora' as const, email: null, demo: false };
const e: any = { posts: [{ id: 'p1', titulo: 'Manejo', rede: 'ig', formato: 'carrossel', status: 'producao', date: '2026-11-04', comments: [], hist: [] }],
  videos: [{ id: 'v1', titulo: 'Ensaio', stage: 'gravacao', hist: [] }], demandas: [{ id: 'd1', t: 'Fotos da feira', data: '2026-11-10', quem: 'spraytec' }],
  materiais: [], threads: [], marcos: [], ano: [], conc: [], aprendizados: [], relatorios: [], links: [], plano: null, guia: {}, lanes: [], concAcoes: [] };
const anexar = async (u: any, ref: string, nome: string) => {
  const caminho = destinoArquivo(e, u, ref);
  const x = await D.iniciarEnvio(b, u.id, ref, caminho, nome, 'image/jpeg', 4); await D.enviarParte(x, 0, Buffer.from('arte'));
  return ACOES['arquivo-anexar'].fn({ e, u, d: { envio: x.token }, hoje, agora, pessoas: [] });
};
await espera(() => Promise.resolve(destinoArquivo(e, oper, 'p:p1')), 'Spraytec não anexa peça em post');
await espera(() => Promise.resolve(destinoArquivo(e, prod, 'd:d1')), 'produtora não anexa em demanda');
await anexar(cancha, 'p:p1', 'card-1.jpg'); await anexar(cancha, 'p:p1', 'card-2.jpg');
const p = e.posts[0];
checa(p.arquivos.length === 2 && p.arquivos.every((a: any) => a.v === 1 && a.por === 'Ana Cancha'), 'peças da versão 1 com quem enviou');
checa(JSON.stringify(p.pastaDrive) === JSON.stringify(['Posts', '2026-11', '2026-11-04 Manejo (p1)']), 'post guarda a própria pasta no Drive');
checa(!visaoPara(e, oper).posts[0].arquivos, 'Spraytec não vê as peças enquanto o post está em produção');
p.status = 'texto_aprovacao';
checa(!visaoPara(e, oper).posts[0].arquivos.length, 'arte anexada durante a aprovação dos textos fica escondida da Spraytec');
checaSemErro(() => destinoArquivo(e, cancha, 'p:p1'), 'com os textos em aprovação, a Cancha já pode anexar a arte');
p.status = 'producao';
ACOES.enviar.fn({ e, u: cancha, d: { id: 'p1' }, hoje, agora, pessoas: [] });
checa(p.status === 'aprovacao' && p.vEnviada === 1, 'envio para aprovação marca a versão 1 como enviada');
checa(visaoPara(e, oper).posts[0].arquivos.length === 2, 'na aprovação a Spraytec vê as peças');
await espera(() => Promise.resolve(destinoArquivo(e, cancha, 'p:p1')), 'não troca a peça enquanto está em aprovação');
await espera(async () => ACOES['arquivo-remover'].fn({ e, u: cancha, d: { ref: 'p:p1', id: p.arquivos[0].id }, hoje, agora, pessoas: [] }), 'versão enviada não sai do histórico');
ACOES.ajuste.fn({ e, u: oper, d: { id: 'p1', txt: 'Trocar a foto do card 2' }, hoje, agora, pessoas: [] });
await anexar(cancha, 'p:p1', 'card-2-ajustado.jpg');
checa(p.arquivos[2].v === 2 && p.vPeca === 2, 'peça enviada depois do ajuste vira versão 2');
checa(visaoPara(e, oper).posts[0].arquivos.length === 2, 'versão 2 só aparece para a Spraytec depois de reenviada');
ACOES['nova-versao'].fn({ e, u: cancha, d: { id: 'p1' }, hoje, agora, pessoas: [] });
checa(p.vEnviada === 2 && visaoPara(e, oper).posts[0].arquivos.length === 3, 'reenviada: Spraytec vê as versões 1 e 2');
await anexar(prod, 'v:v1', 'video-final.mp4');
checa(e.videos[0].arquivos[0].etapa === 'gravacao' && visaoPara(e, prod).videos[0].arquivos.length === 1, 'produtora envia o vídeo final e vê no cartão');
await anexar(oper, 'd:d1', 'foto-feira.jpg');
await anexar(oper, 'm:Fotos de campo', 'lavoura.jpg');
checa(e.demandas[0].arquivos.length === 1 && e.materiais[0].pasta === 'Fotos de campo', 'Spraytec envia fotos na demanda e nos materiais');
await espera(async () => ACOES['arquivo-remover'].fn({ e, u: prod, d: { ref: 'm:Fotos de campo', id: e.materiais[0].id }, hoje, agora, pessoas: [] }), 'quem não enviou não tira o arquivo');
ACOES['arquivo-remover'].fn({ e, u: oper, d: { ref: 'm:Fotos de campo', id: e.materiais[0].id }, hoje, agora, pessoas: [] });
checa(e.materiais[0].removido && visaoPara(e, oper).materiais.length === 0 && visaoPara(e, cancha).materiais.length === 1, 'tirado do portal: some para a Spraytec, fica no histórico da Cancha');
const x = await D.iniciarEnvio(b, cancha.id, 'd:d1', ['Demandas'], 'a.jpg', 'image/jpeg', 1); await D.enviarParte(x, 0, Buffer.from('a'));
ACOES['arquivo-anexar'].fn({ e, u: cancha, d: { envio: x.token }, hoje, agora, pessoas: [] });
await espera(async () => ACOES['arquivo-anexar'].fn({ e, u: cancha, d: { envio: x.token }, hoje, agora, pessoas: [] }), 'o mesmo envio não é registrado duas vezes');

console.log('Arquivo que já está no Drive, pelo link');
checa(D.idDoLink('https://drive.google.com/file/d/1AbCdEfGhIjK_lm-nop/view?usp=sharing') === '1AbCdEfGhIjK_lm-nop' && D.idDoLink('https://drive.google.com/open?id=1AbCdEfGhIjK') === '1AbCdEfGhIjK' && D.idDoLink('qualquer coisa') === null, 'entende os formatos de link do Drive');
arquivos.set('videoDaProdutora1', { id: 'videoDaProdutora1', name: 'Revendedor 02.mp4', mimeType: 'video/mp4', parents: ['root'], dados: Buffer.from('video-pesado'), pasta: false });
await espera(() => D.copiarDoDrive(b, 'videoDaProdutora1', ['Posts', '2026-11', 'p9']), 'sem a permissão de leitura, pede para conectar o Drive de novo');
comLeitura = true;
await D.concluirAutorizacao(b, 'codigo-bom', 'http://x/retorno');
checa(D.driveConectado()?.leitura === true, 'conectado de novo com leitura');
const cp = await D.copiarDoDrive(b, 'videoDaProdutora1', ['Posts', '2026-11', 'p9']);
checa(cp.id !== 'videoDaProdutora1' && cp.tipo === 'video/mp4' && arquivos.get(cp.id)!.dados.toString() === 'video-pesado', 'o Google copia o vídeo para a pasta do post (o original fica onde está)');
await espera(() => D.copiarDoDrive(b, 'naoExisteEsseArquivo', ['Posts']), 'link de arquivo que o portal não enxerga dá mensagem clara');
const raizId = [...arquivos.values()].find((a) => a.name === 'Portal Spraytec')!.id;
await espera(() => D.copiarDoDrive(b, raizId, ['Posts']), 'link de pasta é recusado');
e.posts.push({ id: 'p9', titulo: 'Parceria com a revenda', rede: 'ig', formato: 'reel', status: 'texto_aprovacao', date: '2026-11-12', pauta: 'Revenda', legenda: 'Produto bom chega mais longe', comments: [], hist: [] });
ACOES['arquivo-anexar'].fn({ e, u: cancha, d: { envio: D.registrarCopia(cancha.id, 'p:p9', { ...cp, origem: 'https://drive.google.com/file/d/videoDaProdutora1/view' }) }, hoje, agora, pessoas: [] });
const p9 = e.posts.find((x: any) => x.id === 'p9');
checa(p9.arquivos.length === 1 && p9.arquivos[0].origem && p9.arquivos[0].por === 'Ana Cancha', 'cópia entra no post como peça, com o link de origem');
ACOES.aprovar.fn({ e, u: oper, d: { id: 'p9' }, hoje, agora, pessoas: [] });
checa(p9.textoOk && p9.status === 'aprovacao', 'Reel com o vídeo da produtora já anexado: copy aprovada vai direto para a aprovação do vídeo (sem "arte em criação")');
checa(visaoPara(e, oper).posts.find((x: any) => x.id === 'p9').arquivos.length === 1, 'na aprovação do vídeo, a Spraytec vê o vídeo');

console.log('Versões antigas depois da aprovação');
const { versoesParaArquivar } = await import('../server/acoes.ts');
checa(!versoesParaArquivar(e).some((x) => x.id === 'p1'), 'antes da aprovação, nenhuma versão sai do lugar');
ACOES.aprovar.fn({ e, u: oper, d: { id: 'p1' }, hoje, agora, pessoas: [] });
const alvo = versoesParaArquivar(e).find((x) => x.id === 'p1')!;
const v1 = p.arquivos.filter((a: any) => (a.v || 1) === 1).map((a: any) => a.id);
checa(alvo && v1.every((id: string) => alvo.ids.includes(id)) && !p.arquivos.filter((a: any) => a.v === 2 && !a.removido).some((a: any) => alvo.ids.includes(a.id)), 'aprovada a versão 2: a versão 1 vai para "Versões antigas"; a aprovada fica');
for (const id of alvo.ids) await D.moverPara(b, id, alvo.caminho);
const antigas = arquivos.get(arquivos.get(alvo.ids[0])!.parents[0])!;
checa(antigas.name === 'Versões antigas' && arquivos.get(antigas.parents[0])!.name === p.pastaDrive.at(-1), 'no Drive, a versão 1 fica em <pasta do post>/Versões antigas');
checa((await D.moverPara(b, alvo.ids[0], alvo.caminho)) === false, 'mover de novo não faz nada');
ACOES['versoes-arquivadas'].fn({ e, u: cancha, d: { id: 'p1', ids: alvo.ids }, hoje, agora, pessoas: [] });
checa(!versoesParaArquivar(e).some((x) => x.id === 'p1') && p.arquivos.filter((a: any) => alvo.ids.includes(a.id)).every((a: any) => a.antiga), 'portal marca as versões guardadas e não move de novo');

console.log('Desconexão');
await D.desconectarDrive(b);
checa(!D.driveConectado() && !(await b.query(`select 1 from segredos`)).rows.length, 'desconectar apaga a autorização');
await espera(() => D.iniciarEnvio(b, 'u1', 'p:x', ['Posts'], 'x.jpg', 'image/jpeg', 1), 'sem conexão, o envio é recusado');

await b.fechar();
servidor.close();
rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
