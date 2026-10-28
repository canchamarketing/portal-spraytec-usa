// Integração com o Meta: Instagram, Página do Facebook e conta de anúncios da Spraytec. Só leitura.
// A chave (META_TOKEN no .env) é de um usuário do sistema do portfólio da Cancha: não expira e não
// depende do login de ninguém. Página, Instagram e conta de anúncios são achados pela própria chave;
// se houver mais de um, META_PAGINA_ID e META_CONTA_ANUNCIOS dizem qual usar.
import type { Consulta } from '../db.ts';
import { hojeBR } from '../dominio.ts';

const BASE = () => (process.env.META_GRAPH_URL || 'https://graph.facebook.com') + '/' + (process.env.META_VERSAO || 'v23.0');
export const metaConfigurado = () => !!process.env.META_TOKEN;
export const FONTES_META = ['ig', 'fb', 'ads'] as const;

class ErroMeta extends Error { codigo?: number; constructor(msg: string, codigo?: number) { super(msg); this.codigo = codigo; } }
type Log = { info: (o: any, m?: string) => void; warn: (o: any, m?: string) => void };

async function graph(caminho: string, params: Record<string, string | number> = {}, token = process.env.META_TOKEN || ''): Promise<any> {
  const u = new URL(caminho.startsWith('http') ? caminho : BASE() + '/' + caminho);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  if (!u.searchParams.has('access_token')) u.searchParams.set('access_token', token);
  const r = await fetch(u, { signal: AbortSignal.timeout(30000) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new ErroMeta(j.error?.message || `O Meta respondeu ${r.status}.`, j.error?.code);
  return j;
}
// Percorre as páginas de uma lista (o "next" do Meta já traz a chave).
async function todas(caminho: string, params: Record<string, string | number>, max: number, token?: string): Promise<any[]> {
  let j = await graph(caminho, params, token);
  const out: any[] = [...(j.data || [])];
  while (j.paging?.next && out.length < max) { j = await graph(j.paging.next, {}, token); out.push(...(j.data || [])); }
  return out.slice(0, max);
}

// Métricas mudam de nome e de disponibilidade por tipo de publicação. Pede todas de uma vez; se o
// Meta recusar por parâmetro inválido (código 100), tenta uma por uma e lembra quais não existem
// para aquele tipo. Outras falhas (chave, limite de uso) sobem e a coleta registra o erro.
const invalida = (e: unknown) => e instanceof ErroMeta && e.codigo === 100;
const naoTem = new Set<string>();
async function insights(id: string, tipo: string, metricas: string[], token?: string): Promise<Record<string, number>> {
  const pedir = metricas.filter((m) => !naoTem.has(tipo + ':' + m));
  const ler = (j: any) => Object.fromEntries((j.data || []).map((m: any) => [m.name, m.total_value?.value ?? m.values?.at(-1)?.value ?? null]));
  if (!pedir.length) return {};
  try { return ler(await graph(id + '/insights', { metric: pedir.join(',') }, token)); } catch (e) { if (!invalida(e)) throw e; }
  const o: Record<string, number> = {};
  for (const m of pedir) {
    try { Object.assign(o, ler(await graph(id + '/insights', { metric: m }, token))); } catch (e) { if (!invalida(e)) throw e; naoTem.add(tipo + ':' + m); }
  }
  return o;
}

// Grava sem apagar o que já havia: campos novos se juntam aos antigos (as métricas de um post
// antigo continuam lá mesmo nas coletas em que ele não é consultado de novo).
async function gravar(q: Consulta, fonte: string, tipo: string, id: string, dados: any) {
  await q.query(
    `insert into metricas (fonte, tipo, id, dados) values ($1,$2,$3,$4)
     on conflict (fonte, tipo, id) do update set dados = metricas.dados || excluded.dados, atualizado_em = now()`,
    [fonte, tipo, id, JSON.stringify(dados)]);
}
async function situacao(q: Consulta, fonte: string, erro: string | null, detalhe?: any) {
  await q.query(
    `insert into integracoes (fonte, ultimo_ok, ultima_tentativa, erro, detalhe) values ($1, case when $2::text is null then now() end, now(), $2, $3)
     on conflict (fonte) do update set ultima_tentativa = now(), erro = $2,
       ultimo_ok = case when $2::text is null then now() else integracoes.ultimo_ok end,
       detalhe = coalesce($3, integracoes.detalhe)`,
    [fonte, erro, detalhe ? JSON.stringify(detalhe) : null]);
}

function escolher(lista: any[], id: string | undefined, nome: string, variavel: string) {
  if (id) {
    const x = lista.find((l) => l.id === id || l.id === 'act_' + id);
    if (!x) throw new ErroMeta(`A chave não enxerga a ${nome} ${id}. Confira ${variavel} e os ativos do usuário do sistema.`);
    return x;
  }
  const sp = lista.filter((l) => /spraytec/i.test(l.name || ''));
  if (sp.length === 1) return sp[0];
  if (lista.length === 1) return lista[0];
  if (!lista.length) throw new ErroMeta(`A chave não enxerga nenhuma ${nome}. Atribua o ativo ao usuário do sistema no Meta.`);
  throw new ErroMeta(`A chave enxerga mais de uma ${nome} (${lista.map((l) => l.name).join(', ')}). Diga qual em ${variavel}.`);
}

// Sem META_PAGINA_ID, vale a Página "Spraytec" ligada ao Instagram (a Spraytec Brasil; existe também a
// Spraytec dos EUA, que não é nossa). Se nenhuma tiver Instagram, a com mais seguidores.
async function descobrirPagina() {
  const paginas = await todas('me/accounts', { fields: 'id,name,followers_count,fan_count,access_token,instagram_business_account{id,username}', limit: 100 }, 200);
  const seg = (p: any) => p.followers_count ?? p.fan_count ?? 0;
  let p: any;
  if (process.env.META_PAGINA_ID || paginas.length <= 1) p = escolher(paginas, process.env.META_PAGINA_ID, 'página do Facebook', 'META_PAGINA_ID');
  else p = [...(paginas.filter((x) => /spraytec/i.test(x.name || '')).length ? paginas.filter((x) => /spraytec/i.test(x.name || '')) : paginas)].sort((a, b) => Number(!!b.instagram_business_account) - Number(!!a.instagram_business_account) || seg(b) - seg(a))[0];
  const comIG = paginas.filter((x) => x.instagram_business_account);
  const ig = p.instagram_business_account || (comIG.length === 1 ? comIG[0].instagram_business_account : undefined);
  return { id: p.id as string, nome: p.name as string, token: p.access_token as string | undefined, ig: ig as { id: string; username: string } | undefined };
}

// ---------- Instagram ----------
const IG_POST = ['reach', 'views', 'likes', 'comments', 'saved', 'shares', 'total_interactions'];
const IG_STORY = ['reach', 'views', 'replies', 'shares', 'total_interactions', 'follows', 'profile_visits'];

async function coletarIG(q: Consulta, ig: { id: string }, completa: boolean) {
  const perfil = await graph(ig.id, { fields: 'username,name,followers_count,follows_count,media_count,biography' });
  await gravar(q, 'ig', 'perfil', 'atual', perfil);
  await gravar(q, 'ig', 'dia', hojeBR(), { seguidores: perfil.followers_count, publicacoes: perfil.media_count });
  // Stories somem em 24 h: são lidos a cada coleta, enquanto estão no ar, e ficam guardados aqui.
  const stories = await todas(ig.id + '/stories', { fields: 'id,media_type,permalink,timestamp', limit: 50 }, 100);
  for (const s of stories) await gravar(q, 'ig', 'story', s.id, { ...s, metricas: await insights(s.id, 'story', IG_STORY), metricas_em: new Date().toISOString() });
  if (!completa) return { stories: stories.length };
  const media = await todas(ig.id + '/media', { fields: 'id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count', limit: 50 }, 400);
  const { rows } = await q.query<{ id: string }>(`select id from metricas where fonte='ig' and tipo='post' and dados ? 'metricas'`);
  const jaTem = new Set(rows.map((r) => r.id));
  const recente = Date.now() - 60 * 864e5;
  let lidos = 0;
  for (const m of media) {
    // Posts dos últimos 60 dias são relidos a cada coleta completa; os mais antigos, uma vez só.
    const ler = Date.parse(m.timestamp) > recente || !jaTem.has(m.id);
    const extra = ler ? { metricas: await insights(m.id, (m.media_product_type || '') + ':' + m.media_type, IG_POST), metricas_em: new Date().toISOString() } : {};
    if (ler) lidos++;
    await gravar(q, 'ig', 'post', m.id, { ...m, ...extra });
  }
  return { stories: stories.length, posts: media.length, metricasLidas: lidos };
}

// ---------- Página do Facebook ----------
const FB_POST = ['post_impressions_unique', 'post_clicks'];
async function coletarFB(q: Consulta, pg: { id: string; nome?: string; token?: string }, completa: boolean) {
  const t = pg.token || process.env.META_TOKEN || '';
  const perfil = await graph(pg.id, { fields: 'name,followers_count,fan_count,link' }, t);
  await gravar(q, 'fb', 'perfil', 'atual', perfil);
  await gravar(q, 'fb', 'dia', hojeBR(), { seguidores: perfil.followers_count ?? perfil.fan_count });
  if (!completa) return { pagina: pg.nome };
  const posts = await todas(pg.id + '/posts', {
    fields: 'id,message,created_time,permalink_url,status_type,shares,reactions.summary(total_count).limit(0),comments.summary(total_count).limit(0)', limit: 50,
  }, 300, t);
  const recente = Date.now() - 60 * 864e5;
  for (const p of posts) {
    const base = { id: p.id, message: p.message, created_time: p.created_time, permalink_url: p.permalink_url, status_type: p.status_type,
      reacoes: p.reactions?.summary?.total_count ?? 0, comentarios: p.comments?.summary?.total_count ?? 0, compartilhamentos: p.shares?.count ?? 0 };
    const extra = Date.parse(p.created_time) > recente ? { metricas: await insights(p.id, 'fbpost', FB_POST, t), metricas_em: new Date().toISOString() } : {};
    await gravar(q, 'fb', 'post', p.id, { ...base, ...extra });
  }
  return { pagina: pg.nome, posts: posts.length };
}

// ---------- Anúncios ----------
async function coletarAds(q: Consulta) {
  const contas = await todas('me/adaccounts', { fields: 'id,name,account_status,currency', limit: 100 }, 200);
  const conta = escolher(contas, process.env.META_CONTA_ANUNCIOS, 'conta de anúncios', 'META_CONTA_ANUNCIOS');
  const ads = await todas(conta.id + '/ads', {
    fields: 'id,name,effective_status,created_time,adset{id,name,targeting,optimization_goal,daily_budget,lifetime_budget},campaign{id,name,objective,daily_budget,lifetime_budget},creative{id,title,body,object_type,effective_object_story_id,instagram_permalink_url}',
    limit: 100,
  }, 1000);
  for (const a of ads) await gravar(q, 'ads', 'anuncio', a.id, a);
  // Os números dos últimos 30 dias ainda mudam (atribuição); na primeira coleta, busca 6 meses.
  const { rows } = await q.query(`select 1 from metricas where fonte='ads' and tipo='anuncio_dia' limit 1`);
  const ate = hojeBR(), de = new Date(Date.parse(ate + 'T12:00:00Z') - (rows.length ? 30 : 180) * 864e5).toISOString().slice(0, 10);
  const linhas = await todas(conta.id + '/insights', {
    level: 'ad', time_increment: 1, time_range: JSON.stringify({ since: de, until: ate }), limit: 500,
    fields: 'ad_id,adset_id,campaign_id,date_start,spend,impressions,reach,clicks,inline_link_clicks,actions',
  }, 50000);
  for (const l of linhas) {
    await gravar(q, 'ads', 'anuncio_dia', l.ad_id + ':' + l.date_start, {
      ad: l.ad_id, conjunto: l.adset_id, campanha: l.campaign_id, d: l.date_start,
      investido: Number(l.spend || 0), impressoes: Number(l.impressions || 0), alcance: Number(l.reach || 0),
      cliques: Number(l.inline_link_clicks || l.clicks || 0),
      acoes: Object.fromEntries((l.actions || []).map((a: any) => [a.action_type, Number(a.value)])),
    });
  }
  return { conta: conta.name, moeda: conta.currency, anuncios: ads.length, linhasDia: linhas.length };
}

// ---------- coleta ----------
// A cada hora: perfil e stories (que somem em 24 h). A cada 6 horas: posts, Página e anúncios.
let rodando = false, ultimaCompleta = 0;
export async function coletarMeta(q: Consulta, log: Log, forcarCompleta = false) {
  if (!metaConfigurado() || rodando) return;
  rodando = true;
  const completa = forcarCompleta || Date.now() - ultimaCompleta > 6 * 3600e3 - 60e3;
  try {
    let pg: Awaited<ReturnType<typeof descobrirPagina>> | null = null;
    try { pg = await descobrirPagina(); } catch (e) {
      for (const f of ['ig', 'fb']) await situacao(q, f, (e as Error).message);
    }
    const passos: [string, () => Promise<any>][] = [];
    if (pg) {
      const p = pg;
      passos.push(['ig', async () => { if (!p.ig) throw new ErroMeta('A página não tem uma conta do Instagram profissional ligada.'); return coletarIG(q, p.ig, completa); }]);
      passos.push(['fb', () => coletarFB(q, p, completa)]);
    }
    if (completa) passos.push(['ads', () => coletarAds(q)]);
    for (const [fonte, fn] of passos) {
      try { const det = await fn(); await situacao(q, fonte, null, det); log.info({ fonte, ...det }, 'coleta do Meta'); }
      catch (e) { await situacao(q, fonte, (e as Error).message); log.warn({ fonte, erro: (e as Error).message }, 'falha na coleta do Meta'); }
    }
    if (completa) ultimaCompleta = Date.now();
  } finally { rodando = false; }
}
export const coletaRodando = () => rodando;
