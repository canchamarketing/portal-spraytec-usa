// Integração com o Google Analytics 4 do site da Spraytec. Só leitura (analytics.readonly).
// Usa o mesmo cliente OAuth do Drive (projeto "Portal Spraytec"): a Cancha conecta uma vez com uma conta
// Google que enxerga a propriedade, e a autorização fica cifrada no banco com DRIVE_CHAVE.
// Coleta por dia: totais, canais, páginas e eventos-chave. Nada é apagado, só somado ao que já havia.
import type { Consulta } from '../db.ts';
import { hojeBR } from '../dominio.ts';
import { cifrar, decifrar, driveConfigurado, pedirToken, urlAutorizacao, ErroDrive } from './drive.ts';
import { gravar, situacao } from './meta.ts';

const G = () => process.env.GOOGLE_API_URL; // só nos testes (GA4 simulado)
const DADOS = () => (G() || 'https://analyticsdata.googleapis.com') + '/v1beta';
const ADMIN = () => (G() || 'https://analyticsadmin.googleapis.com') + '/v1beta';
const REVOKE_URL = () => (G() || 'https://oauth2.googleapis.com') + '/revoke';
export const ESCOPO_GA4 = 'https://www.googleapis.com/auth/analytics.readonly';

export class ErroGA4 extends Error {
  status: number;
  constructor(msg: string, status = 0) { super(msg); this.status = status; }
}
type Log = { info: (o: any, m?: string) => void; warn: (o: any, m?: string) => void };
type Propriedade = { id: string; nome: string; conta: string };
type Conexao = { refresh: string; conta: string; propriedade: Propriedade | null; opcoes: Propriedade[] };

let conexao: Conexao | null = null;
let acesso: { token: string; ate: number } | null = null;
export const ga4Configurado = driveConfigurado; // mesmas chaves do Google
export const ga4Conectado = () => (conexao ? { conta: conexao.conta, propriedade: conexao.propriedade, opcoes: conexao.opcoes } : null);

export async function carregarGA4(q: Consulta) {
  conexao = null; acesso = null;
  if (!ga4Configurado()) return;
  const r = (await q.query<{ valor: string }>(`select valor from segredos where nome='ga4'`)).rows[0];
  if (r) try { conexao = JSON.parse(decifrar(r.valor)); } catch { conexao = null; }
}
async function guardar(q: Consulta, c: Conexao) {
  await q.query(`insert into segredos (nome, valor) values ('ga4', $1) on conflict (nome) do update set valor=excluded.valor, atualizado_em=now()`, [cifrar(JSON.stringify(c))]);
  conexao = c;
}

// ---------- conexão (OAuth) ----------
export const urlAutorizacaoGA4 = (retorno: string, estado: string) => urlAutorizacao(retorno, estado, `openid email ${ESCOPO_GA4}`);

export async function concluirGA4(q: Consulta, codigo: string, retorno: string) {
  const t = await pedirToken({ code: codigo, redirect_uri: retorno, grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new ErroGA4('O Google não devolveu a autorização permanente. Tente conectar de novo.');
  if (!String(t.scope || '').split(' ').includes(ESCOPO_GA4)) throw new ErroGA4('A permissão de leitura do Google Analytics não foi marcada. Tente de novo e marque a caixa do Analytics.');
  acesso = { token: t.access_token, ate: Date.now() + (t.expires_in - 60) * 1000 };
  let conta = '';
  try { conta = JSON.parse(Buffer.from(String(t.id_token).split('.')[1], 'base64url').toString()).email || ''; } catch { /* sem e-mail: segue */ }
  const opcoes = await propriedades(t.access_token);
  if (!opcoes.length) throw new ErroGA4(`A conta ${conta || 'escolhida'} não tem acesso a nenhuma propriedade do Google Analytics.`);
  const fixa = process.env.GA4_PROPRIEDADE;
  const sp = opcoes.filter((p) => /spraytec/i.test(p.nome + ' ' + p.conta));
  const escolhida = fixa ? opcoes.find((p) => p.id === fixa) || null : opcoes.length === 1 ? opcoes[0] : sp.length === 1 ? sp[0] : null;
  // Outra propriedade: os números guardados eram de outro site.
  if (conexao?.propriedade?.id !== escolhida?.id) await q.query(`delete from metricas where fonte='ga4'`);
  await guardar(q, { refresh: t.refresh_token, conta, propriedade: escolhida, opcoes });
  return { conta, propriedade: escolhida, opcoes };
}

export async function escolherPropriedade(q: Consulta, id: string) {
  if (!conexao) throw new ErroGA4('O Google Analytics não está conectado.', 503);
  const p = conexao.opcoes.find((o) => o.id === id);
  if (!p) throw new ErroGA4('Essa propriedade não está entre as que a conta conectada enxerga.', 400);
  if (conexao.propriedade?.id !== p.id) await q.query(`delete from metricas where fonte='ga4'`);
  await guardar(q, { ...conexao, propriedade: p });
  return p;
}

export async function desconectarGA4(q: Consulta) {
  const r = conexao?.refresh;
  await q.query(`delete from segredos where nome='ga4'`);
  conexao = null; acesso = null;
  if (r) await fetch(REVOKE_URL() + '?token=' + encodeURIComponent(r), { method: 'POST', signal: AbortSignal.timeout(15e3) }).catch(() => {});
}

async function token(): Promise<string> {
  if (!conexao) throw new ErroGA4('O Google Analytics não está conectado.', 503);
  if (acesso && acesso.ate > Date.now()) return acesso.token;
  try {
    const t = await pedirToken({ refresh_token: conexao.refresh, grant_type: 'refresh_token' });
    acesso = { token: t.access_token, ate: Date.now() + (t.expires_in - 60) * 1000 };
    return acesso.token;
  } catch (e) {
    if (e instanceof ErroDrive && e.status === 400) throw new ErroGA4('A autorização do Google Analytics foi retirada ou venceu. Conecte de novo.', 503);
    throw e;
  }
}
async function api(metodo: string, url: string, corpo?: any, tk?: string) {
  const r = await fetch(url, {
    method: metodo, signal: AbortSignal.timeout(60e3),
    headers: { authorization: 'Bearer ' + (tk || (await token())), ...(corpo ? { 'content-type': 'application/json' } : {}) },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroGA4(j.error?.message || `O Google Analytics respondeu ${r.status}.`, r.status);
  return j;
}

// Propriedades que a conta enxerga (API Admin do Analytics).
async function propriedades(tk: string): Promise<Propriedade[]> {
  const out: Propriedade[] = [];
  let pg = '';
  do {
    const j = await api('GET', `${ADMIN()}/accountSummaries?pageSize=200${pg ? '&pageToken=' + encodeURIComponent(pg) : ''}`, undefined, tk);
    for (const a of j.accountSummaries || []) for (const p of a.propertySummaries || [])
      out.push({ id: String(p.property).replace('properties/', ''), nome: p.displayName || '', conta: a.displayName || '' });
    pg = j.nextPageToken || '';
  } while (pg && out.length < 1000);
  return out;
}

// ---------- coleta ----------
const NUM = (v: any) => Number(v || 0);
const DIA = (s: string) => `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
async function relatorio(prop: string, de: string, ate: string, dimensoes: string[], metricas: string[]) {
  const j = await api('POST', `${DADOS()}/properties/${prop}:runReport`, {
    dateRanges: [{ startDate: de, endDate: ate }], dimensions: dimensoes.map((name) => ({ name })), metrics: metricas.map((name) => ({ name })), limit: 100000,
  });
  return (j.rows || []).map((r: any) => ({ d: r.dimensionValues.map((x: any) => x.value), m: r.metricValues.map((x: any) => NUM(x.value)) }));
}

// A cada 6 horas. Os últimos dias ainda mudam no GA4 (processamento); na primeira coleta, busca 13 meses
// (para a comparação com o ano anterior).
let rodando = false, ultima = 0;
export async function coletarGA4(q: Consulta, log: Log, forcar = false) {
  if (!conexao?.propriedade || rodando || (!forcar && Date.now() - ultima < 6 * 3600e3 - 60e3)) return;
  rodando = true;
  const prop = conexao.propriedade;
  try {
    const { rows } = await q.query(`select 1 from metricas where fonte='ga4' and tipo='dia' limit 1`);
    const ate = hojeBR(), de = new Date(Date.parse(ate + 'T12:00:00Z') - (rows.length ? 10 : 400) * 864e5).toISOString().slice(0, 10);
    const dias = await relatorio(prop.id, de, ate, ['date'], ['sessions', 'totalUsers', 'newUsers', 'engagedSessions', 'screenPageViews', 'keyEvents']);
    for (const r of dias) await gravar(q, 'ga4', 'dia', DIA(r.d[0]), { sessoes: r.m[0], usuarios: r.m[1], novos: r.m[2], engajadas: r.m[3], visualizacoes: r.m[4], eventosChave: r.m[5] });
    const canais = await relatorio(prop.id, de, ate, ['date', 'sessionDefaultChannelGroup'], ['sessions', 'keyEvents']);
    for (const r of canais) await gravar(q, 'ga4', 'canal_dia', DIA(r.d[0]) + '|' + r.d[1], { d: DIA(r.d[0]), canal: r.d[1], sessoes: r.m[0], eventosChave: r.m[1] });
    const paginas = await relatorio(prop.id, de, ate, ['date', 'pagePath'], ['screenPageViews']);
    for (const r of paginas) await gravar(q, 'ga4', 'pagina_dia', DIA(r.d[0]) + '|' + r.d[1], { d: DIA(r.d[0]), pagina: r.d[1], visualizacoes: r.m[0] });
    const eventos = (await relatorio(prop.id, de, ate, ['date', 'eventName'], ['keyEvents'])).filter((r: any) => r.m[0] > 0);
    for (const r of eventos) await gravar(q, 'ga4', 'evento_dia', DIA(r.d[0]) + '|' + r.d[1], { d: DIA(r.d[0]), evento: r.d[1], eventosChave: r.m[0] });
    const det = { propriedade: prop.nome, de, dias: dias.length, sessoes: dias.reduce((a: number, r: any) => a + r.m[0], 0) };
    await situacao(q, 'ga4', null, det);
    log.info({ fonte: 'ga4', ...det }, 'coleta do Google Analytics');
    ultima = Date.now();
  } catch (e) {
    await situacao(q, 'ga4', (e as Error).message);
    log.warn({ fonte: 'ga4', erro: (e as Error).message }, 'falha na coleta do Google Analytics');
  } finally { rodando = false; }
}
export const coletaGA4Rodando = () => rodando;
