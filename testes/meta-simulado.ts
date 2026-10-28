// Testa a coleta do Meta contra um Meta simulado (servidor local), num banco temporário.
// Uso: node testes/meta-simulado.ts
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };

// ---------- Meta simulado ----------
const pedidos: string[] = [];
let quebrado = false;
const agora = Date.now(), dia = 864e5;
const iso = (t: number) => new Date(t).toISOString().replace('Z', '+0000');
const servidor = createServer((req, res) => {
  const u = new URL(req.url!, 'http://x');
  const p = u.pathname.replace(/^\/v[\d.]+\//, '');
  pedidos.push(p + '?' + u.searchParams.get('metric'));
  const json = (code: number, o: any) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.searchParams.get('access_token') !== (p === 'pg1/posts' || p.startsWith('pg1') || p.startsWith('fbp') ? 'chave-da-pagina' : 'chave-teste'))
    return json(400, { error: { message: 'Invalid OAuth access token.', code: 190 } });
  if (quebrado) return json(400, { error: { message: 'Error validating access token: Session has expired', code: 190 } });
  const m = u.searchParams.get('metric') || '';
  if (p === 'me/accounts') return json(200, { data: [{ id: 'pg9', name: 'Spraytec', followers_count: 90000, access_token: 'chave-da-pagina' }, { id: 'pg1', name: 'Spraytec Brasil', followers_count: 11, access_token: 'chave-da-pagina', instagram_business_account: { id: 'ig1', username: 'spraytec.brasil' } }] });
  if (p === 'ig1') return json(200, { id: 'ig1', username: 'spraytec.brasil', followers_count: 18640, media_count: 413 });
  if (p === 'ig1/stories') return json(200, { data: [{ id: 'st1', media_type: 'IMAGE', permalink: 'https://instagram.com/stories/x/1', timestamp: iso(agora - 3600e3) }] });
  if (p === 'ig1/media') {
    if (!u.searchParams.get('after')) return json(200, { data: [
      { id: 'm1', caption: 'Pós-emergência', media_type: 'CAROUSEL_ALBUM', media_product_type: 'FEED', permalink: 'https://instagram.com/p/AAA', timestamp: iso(agora - 2 * dia), like_count: 120, comments_count: 8 },
    ], paging: { next: `http://localhost:${porta}/v23.0/ig1/media?access_token=chave-teste&after=2` } });
    return json(200, { data: [{ id: 'm2', caption: 'Reel do ensaio', media_type: 'VIDEO', media_product_type: 'REELS', permalink: 'https://instagram.com/reel/BBB', timestamp: iso(agora - 400 * dia), like_count: 300, comments_count: 20 }] });
  }
  if (/^(m\d|st\d)\/insights$/.test(p)) {
    // "views" não existe para carrossel neste simulado: o pedido em grupo falha e a coleta tenta uma por uma
    if (p.startsWith('m1') && m.split(',').includes('views')) return json(400, { error: { message: '(#100) metric views not supported', code: 100 } });
    return json(200, { data: m.split(',').map((n, i) => ({ name: n, total_value: { value: 100 * (i + 1) } })) });
  }
  if (p === 'pg1') return json(200, { name: 'Spraytec Brasil', followers_count: 25010, fan_count: 24800 });
  if (p === 'pg1/posts') return json(200, { data: [{ id: 'fbp1', message: 'Dia de campo', created_time: iso(agora - dia), permalink_url: 'https://facebook.com/1', shares: { count: 3 }, reactions: { summary: { total_count: 41 } }, comments: { summary: { total_count: 5 } } }] });
  if (p === 'fbp1/insights') return json(200, { data: m.split(',').map((n) => ({ name: n, values: [{ value: 900 }] })) });
  if (p === 'me/adaccounts') return json(200, { data: [{ id: 'act_1', name: 'Spraytec Brasil', currency: 'BRL' }, { id: 'act_2', name: 'Outro cliente', currency: 'BRL' }] });
  if (p === 'act_1/ads') return json(200, { data: [{ id: 'ad1', name: 'Remarketing foliar', effective_status: 'ACTIVE', campaign: { id: 'c1', name: 'Remarketing', objective: 'OUTCOME_LEADS' }, adset: { id: 's1', name: 'Visitantes 60 dias' } }] });
  if (p === 'act_1/insights') return json(200, { data: [
    { ad_id: 'ad1', adset_id: 's1', campaign_id: 'c1', date_start: '2026-10-25', spend: '120.50', impressions: '8000', reach: '5000', inline_link_clicks: '140', actions: [{ action_type: 'lead', value: '4' }] },
    { ad_id: 'ad1', adset_id: 's1', campaign_id: 'c1', date_start: '2026-10-26', spend: '98.10', impressions: '7100', reach: '4600', inline_link_clicks: '120', actions: [{ action_type: 'lead', value: '3' }] }] });
  json(404, { error: { message: 'Unknown path ' + p, code: 803 } });
});
await new Promise<void>((r) => servidor.listen(0, r));
const porta = (servidor.address() as any).port;

// ---------- banco temporário ----------
const dir = mkdtempSync(join(tmpdir(), 'spraytec-meta-'));
process.env.PGLITE_DIR = dir;
process.env.META_TOKEN = 'chave-teste';
process.env.META_GRAPH_URL = `http://localhost:${porta}`;
const { abrirBanco, migrar } = await import('../server/db.ts');
const { coletarMeta } = await import('../server/integracoes/meta.ts');
const b = await abrirBanco();
await migrar(b);
const log = { info: () => {}, warn: () => {} };
const linhas = async (fonte: string, tipo: string) => (await b.query(`select id, dados from metricas where fonte=$1 and tipo=$2 order by id`, [fonte, tipo])).rows;
const sit = async (f: string) => (await b.query(`select * from integracoes where fonte=$1`, [f])).rows[0];

console.log('Coleta completa');
await coletarMeta(b, log, true);
const posts = await linhas('ig', 'post');
checa(posts.length === 2, 'lê todos os posts do Instagram, seguindo a paginação');
const m1 = posts.find((x: any) => x.id === 'm1')!.dados;
checa(m1.metricas.reach === 100 && m1.metricas.views === undefined && m1.metricas.saved > 0, 'métrica que não existe para o tipo é pulada sem perder as outras');
checa((await linhas('ig', 'story')).length === 1, 'guarda o story que está no ar');
checa((await linhas('ig', 'perfil'))[0].dados.followers_count === 18640, 'guarda o perfil do Instagram');
checa((await linhas('ig', 'dia')).length === 1, 'guarda os seguidores do dia');
const fb = (await linhas('fb', 'post'))[0]?.dados;
checa(!pedidos.some((x) => x.startsWith('pg9')), 'Página oficial é a ligada ao Instagram, não a Spraytec dos EUA com mais seguidores');
checa(fb && fb.reacoes === 41 && fb.metricas.post_impressions_unique === 900, 'Página: reações e alcance do post (com a chave da página)');
const ads = await linhas('ads', 'anuncio_dia');
checa(ads.length === 2 && ads[0].dados.investido === 120.5 && ads[0].dados.acoes.lead === 4, 'anúncios: investimento e contatos por dia');
checa(!pedidos.some((x) => x.startsWith('act_2')), 'escolhe a conta de anúncios da Spraytec entre várias');
for (const f of ['ig', 'fb', 'ads']) checa((await sit(f))?.ultimo_ok && !(await sit(f)).erro, `situação de ${f}: ok`);

console.log('Coleta seguinte e falhas');
const nAntes = pedidos.filter((x) => x.startsWith('m2/insights')).length;
await coletarMeta(b, log, true);
checa(pedidos.filter((x) => x.startsWith('m2/insights')).length === nAntes, 'post antigo com métricas não é relido');
checa((await linhas('ig', 'post')).find((x: any) => x.id === 'm2')!.dados.metricas.reach > 0, 'post antigo mantém as métricas já guardadas');
quebrado = true;
await coletarMeta(b, log, true);
const s = await sit('ig');
checa(/expired/.test(s.erro) && s.ultimo_ok, 'chave vencida: registra o erro e mantém a data da última coleta boa');
checa((await linhas('ig', 'post')).length === 2, 'falha na coleta não apaga os dados guardados');

await b.fechar();
servidor.close();
rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
