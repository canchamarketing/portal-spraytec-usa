// Testa a integração com o YouTube contra um YouTube simulado (servidor local), num banco temporário.
// Uso: node testes/youtube-simulado.ts
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };
const espera = async (fn: () => unknown, msg: string) => { try { await fn(); checa(false, msg); } catch (e) { checa(true, msg + ` (${(e as Error).message})`); } };

// ---------- YouTube simulado ----------
const ESC = 'openid https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly';
const idToken = (email: string) => 'x.' + Buffer.from(JSON.stringify({ email })).toString('base64url') + '.y';
let semCanal = false, consultasShorts = 0;
const pedidosDia: any[] = [];
// 60 vídeos (duas páginas da playlist): v1 é Short, v2 é curto mas não é Short, v3 é privado
const VIDEOS = [...Array(60)].map((_, i) => ({ id: 'v' + (i + 1), dur: i === 0 ? 'PT45S' : i === 1 ? 'PT2M10S' : 'PT8M42S', priv: i === 2 ? 'private' : 'public' }));
const servidor = createServer(async (req, res) => {
  const u = new URL(req.url!, 'http://x');
  const corpo: Buffer = await new Promise((r) => { const b: Buffer[] = []; req.on('data', (c) => b.push(c)); req.on('end', () => r(Buffer.concat(b))); });
  const json = (code: number, o: any) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/token') {
    const p = new URLSearchParams(corpo.toString());
    if (p.get('grant_type') === 'authorization_code') {
      if (p.get('code') === 'sem-analytics') return json(200, { access_token: 'acesso-1', expires_in: 3600, refresh_token: 'r', scope: 'openid https://www.googleapis.com/auth/youtube.readonly' });
      return json(200, { access_token: 'acesso-1', expires_in: 3600, refresh_token: 'renovar-yt', scope: ESC, id_token: idToken('spraytecfertilizantes@gmail.com') });
    }
    return json(200, { access_token: 'acesso-2', expires_in: 3600 });
  }
  if (u.pathname.startsWith('/shorts/')) { consultasShorts++; res.writeHead(u.pathname === '/shorts/v1' ? 200 : 303, { location: '/watch' }); return res.end(); }
  if (u.pathname === '/revoke') return json(200, {});
  if (!/^Bearer acesso-\d$/.test(String(req.headers.authorization || ''))) return json(401, { error: { message: 'sem token' } });
  if (u.pathname === '/youtube/v3/channels') return json(200, { items: semCanal ? [] : [{
    id: 'UCspray', snippet: { title: 'Spraytec Brasil', customUrl: '@spraytecbrasil', thumbnails: { high: { url: 'https://yt3.ggpht.com/logo' } } },
    statistics: { subscriberCount: '3100', viewCount: '250000', videoCount: '60' }, brandingSettings: { image: { bannerExternalUrl: 'https://yt3.googleusercontent.com/banner' } },
    contentDetails: { relatedPlaylists: { uploads: 'UUspray' } },
  }] });
  if (u.pathname === '/youtube/v3/playlistItems') {
    const pg = u.searchParams.get('pageToken') ? 1 : 0;
    return json(200, { items: VIDEOS.slice(pg * 50, pg * 50 + 50).map((v) => ({ contentDetails: { videoId: v.id } })), ...(pg ? {} : { nextPageToken: 'p2' }) });
  }
  if (u.pathname === '/youtube/v3/videos') {
    const ids = u.searchParams.get('id')!.split(',');
    if (ids.length > 50) return json(400, { error: { message: 'máximo 50' } });
    return json(200, { items: ids.map((id) => { const v = VIDEOS.find((x) => x.id === id)!; return {
      id, snippet: { title: 'Vídeo ' + id, publishedAt: '2026-10-20T15:00:00Z', liveBroadcastContent: 'none', thumbnails: { high: { url: 'https://i.ytimg.com/vi/' + id + '/hq.jpg' } } },
      statistics: { viewCount: '120', likeCount: '8', commentCount: '2' }, contentDetails: { duration: v.dur }, status: { privacyStatus: v.priv } }; }) });
  }
  if (u.pathname === '/v2/reports') {
    const q = Object.fromEntries(u.searchParams);
    if (q.ids !== 'channel==MINE') return json(400, { error: { message: 'ids' } });
    if (q.dimensions === 'video') return json(200, { columnHeaders: [{ name: 'video' }, { name: 'estimatedMinutesWatched' }, { name: 'averageViewDuration' }, { name: 'averageViewPercentage' }], rows: [['v4', 300, 200, 38.5]] });
    if (q.dimensions === 'day') { pedidosDia.push(q); return json(200, {
      columnHeaders: ['day', 'views', 'estimatedMinutesWatched', 'subscribersGained', 'subscribersLost', 'likes', 'comments', 'shares'].map((name) => ({ name })),
      rows: [['2026-10-26', 80, 240, 5, 1, 6, 1, 2], ['2026-10-27', 60, 180, 3, 0, 4, 0, 1]] }); }
  }
  json(404, { error: { message: 'rota ' + u.pathname } });
});
await new Promise<void>((r) => servidor.listen(0, r));
const porta = (servidor.address() as any).port;

// ---------- banco temporário ----------
const dir = mkdtempSync(join(tmpdir(), 'spraytec-yt-'));
process.env.PGLITE_DIR = dir;
process.env.GOOGLE_API_URL = `http://localhost:${porta}`;
process.env.YT_SHORTS_URL = `http://localhost:${porta}/shorts/`;
process.env.GOOGLE_CLIENT_ID = 'cliente.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'segredo-de-teste';
process.env.DRIVE_CHAVE = 'ef'.repeat(32);
const { abrirBanco, migrar } = await import('../server/db.ts');
const Y = await import('../server/integracoes/youtube.ts');
const b = await abrirBanco();
await migrar(b);
const log = { info: () => {}, warn: (o: any) => console.log('    aviso:', o.erro) };

console.log('Conexão');
await Y.carregarYT(b);
checa(Y.ytConfigurado() && !Y.ytConectado(), 'configurado e ainda sem conexão');
await espera(() => Y.concluirYT(b, 'sem-analytics', 'http://x/retorno'), 'sem a permissão de estatísticas, a conexão é recusada');
semCanal = true;
await espera(() => Y.concluirYT(b, 'codigo-bom', 'http://x/retorno'), 'conta sem canal é recusada');
semCanal = false;
const c = await Y.concluirYT(b, 'codigo-bom', 'http://x/retorno');
checa(c.conta === 'spraytecfertilizantes@gmail.com' && c.canal.titulo === 'Spraytec Brasil', 'identifica a conta e o canal');
const seg = (await b.query(`select valor from segredos where nome='youtube'`)).rows[0].valor;
checa(!seg.includes('renovar-yt') && !seg.includes('spraytecfert'), 'autorização guardada cifrada no banco');
await Y.carregarYT(b);
checa(Y.ytConectado()?.canal.id === 'UCspray', 'conexão volta depois de reiniciar o servidor');

console.log('Coleta');
await Y.coletarYT(b, log, true);
const linhas = async (tipo: string) => (await b.query(`select id, dados from metricas where fonte='yt' and tipo=$1 order by id`, [tipo])).rows;
const perfil = (await linhas('perfil'))[0]?.dados;
checa(perfil?.inscritos === 3100 && perfil.logo && perfil.banner && perfil.url === '@spraytecbrasil', 'canal com inscritos, logo e capa');
const vids = await linhas('video');
checa(vids.length === 60, 'pega os 60 vídeos (duas páginas da lista, em lotes de 50)');
const v = (id: string) => vids.find((x: any) => x.id === id)!.dados;
checa(v('v1').formato === 'short' && v('v2').formato === 'video' && v('v4').formato === 'video', 'separa Shorts de vídeos comuns');
checa(consultasShorts === 2, 'só confere como Short o que tem até 3 minutos');
checa(v('v4').duracao === 522 && v('v4').views === 120 && v('v4').pctVisto === 38.5, 'duração, visualizações e retenção do vídeo');
checa(v('v3').privacidade === 'private', 'guarda a privacidade (a tela mostra só os públicos)');
const dias = await linhas('dia');
checa(dias.length === 2 && dias[0].id === '2026-10-26' && dias[0].dados.ganhos === 5 && dias[0].dados.minutos === 240, 'números do canal por dia');
const span = (p: any) => (Date.parse(p.endDate) - Date.parse(p.startDate)) / 864e5;
checa(span(pedidosDia[0]) === 400, 'primeira coleta busca 13 meses');
const sit = (await b.query(`select ultimo_ok, erro from integracoes where fonte='yt'`)).rows[0];
checa(sit.ultimo_ok && !sit.erro, 'situação da integração registrada');
await Y.coletarYT(b, log);
checa(pedidosDia.length === 1, 'sem forçar, não coleta de novo antes de 6 horas');
consultasShorts = 0;
await Y.coletarYT(b, log, true);
checa(span(pedidosDia[1]) === 10 && consultasShorts === 0 && (await linhas('video')).length === 60, 'coletas seguintes: 10 dias, sem reconferir Shorts nem duplicar');

console.log('Desconexão');
await Y.desconectarYT(b);
checa(!Y.ytConectado() && !(await b.query(`select 1 from segredos where nome='youtube'`)).rows.length, 'desconectar apaga a autorização');
checa((await linhas('video')).length === 60, 'números já coletados continuam');

await b.fechar();
servidor.close();
rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
