// Integração com o Google Ads da Spraytec. Só leitura: nenhuma campanha é criada ou alterada.
// A conta da Spraytec fica sob o MCC da Cancha (GOOGLE_ADS_MCC). O token de desenvolvedor é o do MCC
// (GOOGLE_ADS_TOKEN_DEV, só no .env). A Cancha conecta uma vez, pelo mesmo cliente OAuth do Drive, com uma
// conta que é usuária do MCC; a autorização fica cifrada no banco com DRIVE_CHAVE.
// Coleta a cada 6 horas: campanhas e anúncios, com investimento, impressões, cliques e conversões por dia.
import type { Consulta } from '../db.ts';
import { hojeBR } from '../dominio.ts';
import { cifrar, decifrar, driveConfigurado, pedirToken, urlAutorizacao, ErroDrive } from './drive.ts';
import { gravar, situacao } from './meta.ts';

const G = () => process.env.GOOGLE_API_URL; // só nos testes (Google Ads simulado)
const BASE = () => (G() || 'https://googleads.googleapis.com');
const REVOKE_URL = () => (G() || 'https://oauth2.googleapis.com') + '/revoke';
const ESCOPO = 'https://www.googleapis.com/auth/adwords';
const MCC = () => (process.env.GOOGLE_ADS_MCC || '2230250690').replace(/\D/g, '');
// A API muda de versão algumas vezes por ano e desliga as antigas; o portal usa a mais nova que responder.
const VERSOES = ['v26', 'v25', 'v24', 'v23', 'v22', 'v21'];

export class ErroGAds extends Error {
  status: number;
  constructor(msg: string, status = 0) { super(msg); this.status = status; }
}
type Log = { info: (o: any, m?: string) => void; warn: (o: any, m?: string) => void };
type Conexao = { refresh: string; conta: string; cliente: { id: string; nome: string } | null; opcoes: { id: string; nome: string }[] };

let conexao: Conexao | null = null;
let acesso: { token: string; ate: number } | null = null;
let versao: string | null = process.env.GOOGLE_ADS_VERSAO || null;
export const gadsConfigurado = () => driveConfigurado() && !!process.env.GOOGLE_ADS_TOKEN_DEV;
export const gadsConectado = () => (conexao ? { conta: conexao.conta, cliente: conexao.cliente, opcoes: conexao.opcoes } : null);

export async function carregarGAds(q: Consulta) {
  conexao = null; acesso = null;
  if (!driveConfigurado()) return;
  const r = (await q.query<{ valor: string }>(`select valor from segredos where nome='gads'`)).rows[0];
  if (r) try { conexao = JSON.parse(decifrar(r.valor)); } catch { conexao = null; }
}
async function guardar(q: Consulta, c: Conexao) {
  await q.query(`insert into segredos (nome, valor) values ('gads', $1) on conflict (nome) do update set valor=excluded.valor, atualizado_em=now()`, [cifrar(JSON.stringify(c))]);
  conexao = c;
}

// ---------- chamadas ----------
async function chamar(caminho: string, tk: string, corpo?: any, mcc = true) {
  const v = versao || await descobrirVersao(tk);
  const r = await fetch(`${BASE()}/${v}/${caminho}`, {
    method: corpo ? 'POST' : 'GET', signal: AbortSignal.timeout(120e3),
    headers: {
      authorization: 'Bearer ' + tk, 'developer-token': process.env.GOOGLE_ADS_TOKEN_DEV || '',
      ...(mcc ? { 'login-customer-id': MCC() } : {}), ...(corpo ? { 'content-type': 'application/json' } : {}),
    },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = Array.isArray(j) ? j[0]?.error : j.error;
    const det = e?.details?.[0]?.errors?.[0]?.message;
    throw new ErroGAds(det || e?.message || `O Google Ads respondeu ${r.status}.`, r.status);
  }
  return j;
}
async function descobrirVersao(tk: string) {
  for (const v of VERSOES) {
    const r = await fetch(`${BASE()}/${v}/customers:listAccessibleCustomers`, {
      headers: { authorization: 'Bearer ' + tk, 'developer-token': process.env.GOOGLE_ADS_TOKEN_DEV || '' }, signal: AbortSignal.timeout(30e3),
    });
    if (r.status !== 404) { versao = v; return v; }
  }
  throw new ErroGAds('Nenhuma versão conhecida da API do Google Ads respondeu. Atualize a lista de versões em googleads.ts.');
}
// GAQL pelo searchStream: devolve todas as linhas de uma vez (a API manda em lotes).
async function consulta(cliente: string, gaql: string, tk?: string) {
  const lotes = await chamar(`customers/${cliente}/googleAds:searchStream`, tk || await token(), { query: gaql });
  return (Array.isArray(lotes) ? lotes : [lotes]).flatMap((l: any) => l.results || []);
}

// ---------- conexão (OAuth) ----------
export const urlAutorizacaoGAds = (retorno: string, estado: string) => urlAutorizacao(retorno, estado, `openid email ${ESCOPO}`);

export async function concluirGAds(q: Consulta, codigo: string, retorno: string) {
  if (!process.env.GOOGLE_ADS_TOKEN_DEV) throw new ErroGAds('Falta o token de desenvolvedor do Google Ads no servidor.');
  const t = await pedirToken({ code: codigo, redirect_uri: retorno, grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new ErroGAds('O Google não devolveu a autorização permanente. Tente conectar de novo.');
  if (!String(t.scope || '').split(' ').includes(ESCOPO)) throw new ErroGAds('A permissão do Google Ads não foi marcada. Tente de novo e marque a caixa do Google Ads.');
  acesso = { token: t.access_token, ate: Date.now() + (t.expires_in - 60) * 1000 };
  let conta = '';
  try { conta = JSON.parse(Buffer.from(String(t.id_token).split('.')[1], 'base64url').toString()).email || ''; } catch { /* sem e-mail: segue */ }
  // Contas de anúncio (não gerenciadoras) sob o MCC da Cancha.
  let linhas: any[];
  try {
    linhas = await consulta(MCC(), `SELECT customer_client.id, customer_client.descriptive_name, customer_client.manager, customer_client.status FROM customer_client WHERE customer_client.level <= 1`, t.access_token);
  } catch (e) {
    if (e instanceof ErroGAds && e.status === 403) throw new ErroGAds(`A conta ${conta || 'escolhida'} não tem acesso ao MCC da Cancha (${MCC()}). Entre com uma conta que seja usuária do MCC.`, 403);
    throw e;
  }
  const opcoes = linhas.map((l) => l.customerClient).filter((c) => c && !c.manager && c.status === 'ENABLED').map((c) => ({ id: String(c.id), nome: c.descriptiveName || String(c.id) }));
  if (!opcoes.length) throw new ErroGAds('O MCC da Cancha não tem nenhuma conta de anúncios ativa vinculada. Confira se a Spraytec aceitou o vínculo.');
  const fixa = (process.env.GOOGLE_ADS_CONTA || '').replace(/\D/g, '');
  const sp = opcoes.filter((o) => /spraytec/i.test(o.nome));
  const cliente = fixa ? opcoes.find((o) => o.id === fixa) || null : sp.length === 1 ? sp[0] : opcoes.length === 1 ? opcoes[0] : null;
  if (conexao?.cliente?.id !== cliente?.id) await q.query(`delete from metricas where fonte='gads'`);
  await guardar(q, { refresh: t.refresh_token, conta, cliente, opcoes });
  return { conta, cliente, opcoes };
}

export async function escolherClienteGAds(q: Consulta, id: string) {
  if (!conexao) throw new ErroGAds('O Google Ads não está conectado.', 503);
  const c = conexao.opcoes.find((o) => o.id === id);
  if (!c) throw new ErroGAds('Essa conta não está no MCC da Cancha.', 400);
  if (conexao.cliente?.id !== c.id) await q.query(`delete from metricas where fonte='gads'`);
  await guardar(q, { ...conexao, cliente: c });
  return c;
}

export async function desconectarGAds(q: Consulta) {
  const r = conexao?.refresh;
  await q.query(`delete from segredos where nome='gads'`);
  conexao = null; acesso = null;
  if (r) await fetch(REVOKE_URL() + '?token=' + encodeURIComponent(r), { method: 'POST', signal: AbortSignal.timeout(15e3) }).catch(() => {});
}

async function token(): Promise<string> {
  if (!conexao) throw new ErroGAds('O Google Ads não está conectado.', 503);
  if (acesso && acesso.ate > Date.now()) return acesso.token;
  try {
    const t = await pedirToken({ refresh_token: conexao.refresh, grant_type: 'refresh_token' });
    acesso = { token: t.access_token, ate: Date.now() + (t.expires_in - 60) * 1000 };
    return acesso.token;
  } catch (e) {
    if (e instanceof ErroDrive && e.status === 400) throw new ErroGAds('A autorização do Google Ads foi retirada ou venceu. Conecte de novo.', 503);
    throw e;
  }
}

// ---------- coleta ----------
const reais = (micros: any) => Number(micros || 0) / 1e6;
const metr = (m: any = {}) => ({ investido: reais(m.costMicros), impressoes: Number(m.impressions || 0), cliques: Number(m.clicks || 0), conversoes: Number(m.conversions || 0) });
const textos = (l: any[] = []) => l.map((x) => x.text).filter(Boolean);

// A cada 6 horas. As conversões chegam com atraso (atribuição); por isso os últimos 30 dias são buscados
// de novo em toda coleta. Na primeira, 13 meses.
let rodando = false, ultima = 0;
export async function coletarGAds(q: Consulta, log: Log, forcar = false) {
  if (!conexao?.cliente || !process.env.GOOGLE_ADS_TOKEN_DEV || rodando || (!forcar && Date.now() - ultima < 6 * 3600e3 - 60e3)) return;
  rodando = true;
  const cid = conexao.cliente.id;
  try {
    const { rows } = await q.query(`select 1 from metricas where fonte='gads' and tipo='campanha_dia' limit 1`);
    const ate = hojeBR(), de = new Date(Date.parse(ate + 'T12:00:00Z') - (rows.length ? 30 : 400) * 864e5).toISOString().slice(0, 10);
    const camps = await consulta(cid, `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type, campaign.start_date, campaign_budget.amount_micros FROM campaign WHERE campaign.status != 'REMOVED'`);
    for (const r of camps) await gravar(q, 'gads', 'campanha', String(r.campaign.id), {
      id: String(r.campaign.id), nome: r.campaign.name, status: r.campaign.status, tipo: r.campaign.advertisingChannelType, inicio: r.campaign.startDate, orcamentoDia: reais(r.campaignBudget?.amountMicros),
    });
    const cdias = await consulta(cid, `SELECT campaign.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM campaign WHERE segments.date BETWEEN '${de}' AND '${ate}'`);
    for (const r of cdias) await gravar(q, 'gads', 'campanha_dia', `${r.campaign.id}:${r.segments.date}`, { campanha: String(r.campaign.id), d: r.segments.date, ...metr(r.metrics) });
    // Anúncios de pesquisa, display e vídeo (Performance Max não tem anúncio individual: entra só pela campanha).
    const ads = await consulta(cid, `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.ad.type, ad_group_ad.ad.final_urls, ad_group_ad.ad.responsive_search_ad.headlines, ad_group_ad.ad.responsive_search_ad.descriptions, ad_group_ad.status, ad_group.id, ad_group.name, campaign.id FROM ad_group_ad WHERE ad_group_ad.status != 'REMOVED'`);
    for (const r of ads) {
      const a = r.adGroupAd?.ad || {};
      await gravar(q, 'gads', 'anuncio', String(a.id), {
        id: String(a.id), nome: a.name || '', tipo: a.type, status: r.adGroupAd.status, urls: a.finalUrls || [], grupo: r.adGroup?.name || '', campanha: String(r.campaign?.id || ''),
        titulos: textos(a.responsiveSearchAd?.headlines), descricoes: textos(a.responsiveSearchAd?.descriptions),
      });
    }
    const adias = await consulta(cid, `SELECT ad_group_ad.ad.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions FROM ad_group_ad WHERE segments.date BETWEEN '${de}' AND '${ate}'`);
    for (const r of adias) await gravar(q, 'gads', 'anuncio_g_dia', `${r.adGroupAd.ad.id}:${r.segments.date}`, { ad: String(r.adGroupAd.ad.id), d: r.segments.date, ...metr(r.metrics) });
    const det = { conta: conexao.cliente.nome, versao, campanhas: camps.length, linhasDia: cdias.length, anuncios: ads.length };
    await situacao(q, 'gads', null, det);
    log.info({ fonte: 'gads', ...det }, 'coleta do Google Ads');
    ultima = Date.now();
  } catch (e) {
    await situacao(q, 'gads', (e as Error).message);
    log.warn({ fonte: 'gads', erro: (e as Error).message }, 'falha na coleta do Google Ads');
  } finally { rodando = false; }
}
export const coletaGAdsRodando = () => rodando;
