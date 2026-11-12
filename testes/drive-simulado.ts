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
const raiz = [...arquivos.values()].find((a) => a.name === 'Portal Spraytec USA');
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
const ev2 = await D.iniciarEnvio(b, 'u1', 'a:x', ['Anúncios'], 'x.bin', 'application/octet-stream', 10);
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

console.log('Regras do portal (arquivos dos anúncios)');
const agora = new Date().toISOString(), hoje = '2026-11-11';
const cancha = { id: 'uc', nome: 'Ana Cancha', papel: 'cancha' as const, email: null, demo: false, idioma: 'pt-BR' as const };
const renato = { id: 'ur', nome: 'Renato', papel: 'aprovador' as const, email: null, demo: false, idioma: 'en-US' as const };
const prod = { id: 'up', nome: 'Produtora', papel: 'produtora' as const, email: null, demo: false, idioma: 'en-US' as const };
const e: any = { rotacoes: [{ id: 'r1', ini: '2026-11-30', fim: '2026-12-13', prazo: '2026-11-23', status: 'montando', saem: [], comentarios: [], hist: [] }],
  anuncios: [{ id: 'a1', rotacaoId: 'r1', titulo: 'Tractus', canal: 'meta', formato: 'imagem', locais: ['feed'], objetivo: 'contatos', produtos: [], textos: {}, origem: 'novo', versao: 1, status: 'rascunho', arquivos: [], comentarios: [], hist: [] }],
  eventos: [] };
const rodar = (acao: string, u: any, d: any) => ACOES[acao].fn({ e, u, d, hoje, agora, pessoas: [{ id: 'ur', nome: 'Renato', papel: 'aprovador' }] } as any);
const anexar = async (u: any, ref: string, nome: string) => {
  const caminho = destinoArquivo(e, u, ref);
  const x = await D.iniciarEnvio(b, u.id, ref, caminho, nome, 'image/jpeg', 4); await D.enviarParte(x, 0, Buffer.from('arte'));
  return rodar('arquivo-anexar', u, { envio: x.token });
};
await espera(() => Promise.resolve(destinoArquivo(e, renato, 'a:a1')), 'a Spraytec não anexa peça em anúncio');
await espera(() => Promise.resolve(destinoArquivo(e, prod, 'a:a1')), 'a produtora não anexa peça em anúncio');
await espera(() => Promise.resolve(destinoArquivo(e, cancha, 'p:p1')), 'destino que não é anúncio é recusado');
await anexar(cancha, 'a:a1', 'feed-1.jpg'); await anexar(cancha, 'a:a1', 'feed-2.jpg');
const a = e.anuncios[0];
checa(a.arquivos.length === 2 && a.arquivos.every((x: any) => x.por === 'Ana Cancha'), 'peças anexadas com quem enviou');
checa(JSON.stringify(a.pastaDrive) === JSON.stringify(['Anúncios', '2026-11-30 a 2026-12-13', 'Tractus (a1)']), 'anúncio guarda a própria pasta no Drive');
checa(!visaoPara(e, renato).anuncios.length, 'rascunho com peça: a Spraytec ainda não vê');
rodar('anuncio-enviar', cancha, { rotacaoId: 'r1' });
checa(visaoPara(e, renato).anuncios[0].arquivos.length === 2, 'enviado: a Spraytec vê as peças');
await espera(() => Promise.resolve(destinoArquivo(e, cancha, 'a:a1')), 'não troca a peça enquanto está em aprovação');
await espera(async () => rodar('arquivo-remover', cancha, { anuncioId: 'a1', id: a.arquivos[0].id }), 'em aprovação, a peça não sai');
rodar('anuncio-ajuste', renato, { id: 'a1', texto: 'Swap image 2' });
rodar('arquivo-remover', cancha, { anuncioId: 'a1', id: a.arquivos[1].id });
await anexar(cancha, 'a:a1', 'feed-2-novo.jpg');
const vr = visaoPara(e, renato).anuncios[0];
checa(vr.arquivos.length === 2 && vr.arquivos.some((x: any) => x.nome === 'feed-2.jpg') && !vr.arquivos.some((x: any) => x.nome === 'feed-2-novo.jpg'), 'durante o ajuste a Spraytec continua vendo a versão enviada');
rodar('anuncio-enviar', cancha, { rotacaoId: 'r1' });
const vr2 = visaoPara(e, renato).anuncios[0];
checa(vr2.versao === 2 && vr2.arquivos.length === 2 && vr2.arquivos.some((x: any) => x.nome === 'feed-2-novo.jpg'), 'reenviado: a Spraytec vê a versão 2 (a peça tirada some para ela)');
checa(a.arquivos.find((x: any) => x.nome === 'feed-2.jpg').removido && visaoPara(e, cancha).anuncios[0].arquivos.length === 3, 'a peça tirada fica no histórico da Cancha');
const x = await D.iniciarEnvio(b, cancha.id, 'a:a1', ['Anúncios'], 'a.jpg', 'image/jpeg', 1); await D.enviarParte(x, 0, Buffer.from('a'));
rodar('anuncio-ajuste', renato, { id: 'a1', texto: 'One more' });
rodar('arquivo-anexar', cancha, { envio: x.token });
await espera(async () => rodar('arquivo-anexar', cancha, { envio: x.token }), 'o mesmo envio não é registrado duas vezes');

console.log('Arquivo que já está no Drive, pelo link');
checa(D.idDoLink('https://drive.google.com/file/d/1AbCdEfGhIjK_lm-nop/view?usp=sharing') === '1AbCdEfGhIjK_lm-nop' && D.idDoLink('https://drive.google.com/open?id=1AbCdEfGhIjK') === '1AbCdEfGhIjK' && D.idDoLink('qualquer coisa') === null, 'entende os formatos de link do Drive');
arquivos.set('videoDaProdutora1', { id: 'videoDaProdutora1', name: 'Revendedor 02.mp4', mimeType: 'video/mp4', parents: ['root'], dados: Buffer.from('video-pesado'), pasta: false });
await espera(() => D.copiarDoDrive(b, 'videoDaProdutora1', ['Anúncios', 'a9']), 'sem a permissão de leitura, pede para conectar o Drive de novo');
comLeitura = true;
await D.concluirAutorizacao(b, 'codigo-bom', 'http://x/retorno');
checa(D.driveConectado()?.leitura === true, 'conectado de novo com leitura');
const cp = await D.copiarDoDrive(b, 'videoDaProdutora1', ['Anúncios', 'a9']);
checa(cp.id !== 'videoDaProdutora1' && cp.tipo === 'video/mp4' && arquivos.get(cp.id)!.dados.toString() === 'video-pesado', 'o Google copia o vídeo para a pasta do anúncio (o original fica onde está)');
await espera(() => D.copiarDoDrive(b, 'naoExisteEsseArquivo', ['Anúncios']), 'link de arquivo que o portal não enxerga dá mensagem clara');
const raizId = [...arquivos.values()].find((f) => !f.parents.length || f.parents[0] === 'root' && f.pasta)!.id;
await espera(() => D.copiarDoDrive(b, raizId, ['Anúncios']), 'link de pasta é recusado');
e.anuncios.push({ ...JSON.parse(JSON.stringify(e.anuncios[0])), id: 'a9', titulo: 'Vídeo', status: 'rascunho', arquivos: [], enviado: undefined, pastaDrive: undefined });
rodar('arquivo-anexar', cancha, { envio: D.registrarCopia(cancha.id, 'a:a9', { ...cp, origem: 'https://drive.google.com/file/d/videoDaProdutora1/view' }) });
const a9 = e.anuncios.find((y: any) => y.id === 'a9');
checa(a9.arquivos.length === 1 && a9.arquivos[0].origem && a9.arquivos[0].por === 'Ana Cancha', 'cópia entra no anúncio como peça, com o link de origem');


console.log('Desconexão');
await D.desconectarDrive(b);
checa(!D.driveConectado() && !(await b.query(`select 1 from segredos`)).rows.length, 'desconectar apaga a autorização');
await espera(() => D.iniciarEnvio(b, 'u1', 'p:x', ['Posts'], 'x.jpg', 'image/jpeg', 1), 'sem conexão, o envio é recusado');

await b.fechar();
servidor.close();
rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
