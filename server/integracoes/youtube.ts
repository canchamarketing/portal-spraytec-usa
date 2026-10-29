// Integração com o canal do YouTube da Spraytec. Só leitura (youtube.readonly e yt-analytics.readonly).
// Usa o mesmo cliente OAuth do Drive: a Cancha conecta uma vez com a conta dona do canal (se o canal for
// de uma conta de marca, o Google pergunta qual canal na hora). Autorização cifrada no banco com DRIVE_CHAVE.
// Coleta a cada 6 horas: canal, vídeos (com números de cada um) e números do canal por dia.
import type { Consulta } from '../db.ts';
import { hojeBR } from '../dominio.ts';
import { cifrar, decifrar, driveConfigurado, pedirToken, urlAutorizacao, ErroDrive } from './drive.ts';
import { gravar, situacao } from './meta.ts';

const G = () => process.env.GOOGLE_API_URL; // só nos testes (YouTube simulado)
const DADOS = () => (G() || 'https://www.googleapis.com') + '/youtube/v3';
const ANALYTICS = () => (G() || 'https://youtubeanalytics.googleapis.com') + '/v2/reports';
const SHORTS = () => process.env.YT_SHORTS_URL || 'https://www.youtube.com/shorts/';
const REVOKE_URL = () => (G() || 'https://oauth2.googleapis.com') + '/revoke';
const ESC_DADOS = 'https://www.googleapis.com/auth/youtube.readonly';
const ESC_ANALYTICS = 'https://www.googleapis.com/auth/yt-analytics.readonly';

export class ErroYT extends Error {
  status: number;
  constructor(msg: string, status = 0) { super(msg); this.status = status; }
}
type Log = { info: (o: any, m?: string) => void; warn: (o: any, m?: string) => void };
type Conexao = { refresh: string; conta: string; canal: { id: string; titulo: string } };

let conexao: Conexao | null = null;
let acesso: { token: string; ate: number } | null = null;
export const ytConfigurado = driveConfigurado; // mesmas chaves do Google
export const ytConectado = () => (conexao ? { conta: conexao.conta, canal: conexao.canal } : null);

export async function carregarYT(q: Consulta) {
  conexao = null; acesso = null;
  if (!ytConfigurado()) return;
  const r = (await q.query<{ valor: string }>(`select valor from segredos where nome='youtube'`)).rows[0];
  if (r) try { conexao = JSON.parse(decifrar(r.valor)); } catch { conexao = null; }
}

// ---------- conexão (OAuth) ----------
export const urlAutorizacaoYT = (retorno: string, estado: string) => urlAutorizacao(retorno, estado, `openid email ${ESC_DADOS} ${ESC_ANALYTICS}`);

export async function concluirYT(q: Consulta, codigo: string, retorno: string) {
  const t = await pedirToken({ code: codigo, redirect_uri: retorno, grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new ErroYT('O Google não devolveu a autorização permanente. Tente conectar de novo.');
  const dadas = String(t.scope || '').split(' ');
  if (!dadas.includes(ESC_DADOS) || !dadas.includes(ESC_ANALYTICS)) throw new ErroYT('As permissões do YouTube não foram todas marcadas. Tente de novo e marque as caixas do YouTube.');
  acesso = { token: t.access_token, ate: Date.now() + (t.expires_in - 60) * 1000 };
  let conta = '';
  try { conta = JSON.parse(Buffer.from(String(t.id_token).split('.')[1], 'base64url').toString()).email || ''; } catch { /* sem e-mail: segue */ }
  const j = await api(`${DADOS()}/channels?part=snippet&mine=true`, t.access_token);
  const c = j.items?.[0];
  if (!c) throw new ErroYT(`A conta ${conta || 'escolhida'} não tem canal do YouTube. Se o canal da Spraytec for de uma conta de marca, escolha o canal na tela do Google.`);
  // Outro canal: os números guardados eram de outro canal.
  if (conexao?.canal.id !== c.id) await q.query(`delete from metricas where fonte='yt'`);
  const nova: Conexao = { refresh: t.refresh_token, conta, canal: { id: c.id, titulo: c.snippet?.title || '' } };
  await q.query(`insert into segredos (nome, valor) values ('youtube', $1) on conflict (nome) do update set valor=excluded.valor, atualizado_em=now()`, [cifrar(JSON.stringify(nova))]);
  conexao = nova;
  return { conta, canal: nova.canal };
}

export async function desconectarYT(q: Consulta) {
  const r = conexao?.refresh;
  await q.query(`delete from segredos where nome='youtube'`);
  conexao = null; acesso = null;
  if (r) await fetch(REVOKE_URL() + '?token=' + encodeURIComponent(r), { method: 'POST', signal: AbortSignal.timeout(15e3) }).catch(() => {});
}

async function token(): Promise<string> {
  if (!conexao) throw new ErroYT('O YouTube não está conectado.', 503);
  if (acesso && acesso.ate > Date.now()) return acesso.token;
  try {
    const t = await pedirToken({ refresh_token: conexao.refresh, grant_type: 'refresh_token' });
    acesso = { token: t.access_token, ate: Date.now() + (t.expires_in - 60) * 1000 };
    return acesso.token;
  } catch (e) {
    if (e instanceof ErroDrive && e.status === 400) throw new ErroYT('A autorização do YouTube foi retirada ou venceu. Conecte de novo.', 503);
    throw e;
  }
}
async function api(url: string, tk?: string) {
  const r = await fetch(url, { headers: { authorization: 'Bearer ' + (tk || (await token())) }, signal: AbortSignal.timeout(60e3) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroYT(j.error?.message || `O YouTube respondeu ${r.status}.`, r.status);
  return j;
}
const relatorio = async (p: Record<string, string>) => {
  const j = await api(ANALYTICS() + '?' + new URLSearchParams({ ids: 'channel==MINE', ...p }));
  const cols: string[] = (j.columnHeaders || []).map((c: any) => c.name);
  return (j.rows || []).map((r: any[]) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
};

// "PT1H2M3S" -> segundos
const segundos = (d: string) => { const m = String(d || '').match(/P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/); return m ? ((+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0)) : 0; };
// Short: o endereço /shorts/ do vídeo abre (200) em vez de redirecionar para o player comum.
async function ehShort(id: string, dur: number) {
  if (dur > 180) return false;
  try { return (await fetch(SHORTS() + id, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(15e3) })).status === 200; }
  catch { return dur <= 60; }
}
const thumb = (t: any) => (t?.maxres || t?.standard || t?.high || t?.medium || t?.default)?.url || '';

// ---------- coleta ----------
let rodando = false, ultima = 0;
export async function coletarYT(q: Consulta, log: Log, forcar = false) {
  if (!conexao || rodando || (!forcar && Date.now() - ultima < 6 * 3600e3 - 60e3)) return;
  rodando = true;
  try {
    const c = (await api(`${DADOS()}/channels?part=snippet,statistics,brandingSettings,contentDetails&mine=true`)).items?.[0];
    if (!c) throw new ErroYT('A conta conectada não tem mais canal do YouTube.');
    const st = c.statistics || {};
    await gravar(q, 'yt', 'perfil', c.id, {
      id: c.id, titulo: c.snippet?.title, url: c.snippet?.customUrl, descricao: c.snippet?.description, logo: thumb(c.snippet?.thumbnails),
      banner: c.brandingSettings?.image?.bannerExternalUrl || '', inscritos: st.hiddenSubscriberCount ? null : Number(st.subscriberCount || 0),
      views: Number(st.viewCount || 0), videos: Number(st.videoCount || 0),
    });
    // vídeos do canal (playlist de envios), com os números de cada um
    const ids: string[] = [];
    let pg = '';
    const uploads = c.contentDetails?.relatedPlaylists?.uploads;
    if (uploads) do {
      const j = await api(`${DADOS()}/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}${pg ? '&pageToken=' + pg : ''}`);
      ids.push(...(j.items || []).map((x: any) => x.contentDetails.videoId));
      pg = j.nextPageToken || '';
    } while (pg && ids.length < 1000);
    const conhecidos = new Map((await q.query<{ id: string; formato: string }>(`select id, dados->>'formato' as formato from metricas where fonte='yt' and tipo='video'`)).rows.map((r) => [r.id, r.formato]));
    for (let i = 0; i < ids.length; i += 50) {
      const j = await api(`${DADOS()}/videos?part=snippet,statistics,contentDetails,status&id=${ids.slice(i, i + 50).join(',')}`);
      for (const v of j.items || []) {
        const dur = segundos(v.contentDetails?.duration);
        const live = v.snippet?.liveBroadcastContent && v.snippet.liveBroadcastContent !== 'none';
        const formato = conhecidos.get(v.id) || (live ? 'live' : (await ehShort(v.id, dur)) ? 'short' : 'video');
        await gravar(q, 'yt', 'video', v.id, {
          id: v.id, titulo: v.snippet?.title, publicado: v.snippet?.publishedAt, thumb: thumb(v.snippet?.thumbnails), duracao: dur, formato,
          privacidade: v.status?.privacyStatus, views: Number(v.statistics?.viewCount || 0), curtidas: Number(v.statistics?.likeCount || 0), comentarios: Number(v.statistics?.commentCount || 0),
        });
      }
    }
    // retenção por vídeo (desde sempre) e números do canal por dia; o YouTube Analytics atrasa uns 2 dias
    const ate = hojeBR();
    try {
      for (const r of await relatorio({ startDate: '2010-01-01', endDate: ate, dimensions: 'video', metrics: 'estimatedMinutesWatched,averageViewDuration,averageViewPercentage', sort: '-estimatedMinutesWatched', maxResults: '200' }))
        if (ids.includes(r.video)) await gravar(q, 'yt', 'video', r.video, { minutos: r.estimatedMinutesWatched, mediaVisto: r.averageViewDuration, pctVisto: r.averageViewPercentage });
    } catch (e) { log.warn({ fonte: 'yt', erro: (e as Error).message }, 'retenção por vídeo indisponível'); }
    const { rows } = await q.query(`select 1 from metricas where fonte='yt' and tipo='dia' limit 1`);
    const de = new Date(Date.parse(ate + 'T12:00:00Z') - (rows.length ? 10 : 400) * 864e5).toISOString().slice(0, 10);
    const dias = await relatorio({ startDate: de, endDate: ate, dimensions: 'day', metrics: 'views,estimatedMinutesWatched,subscribersGained,subscribersLost,likes,comments,shares', sort: 'day' });
    for (const r of dias) await gravar(q, 'yt', 'dia', r.day, {
      views: r.views, minutos: r.estimatedMinutesWatched, ganhos: r.subscribersGained, perdidos: r.subscribersLost, curtidas: r.likes, comentarios: r.comments, compartilhamentos: r.shares,
    });
    const det = { canal: c.snippet?.title, videos: ids.length, dias: dias.length };
    await situacao(q, 'yt', null, det);
    log.info({ fonte: 'yt', ...det }, 'coleta do YouTube');
    ultima = Date.now();
  } catch (e) {
    await situacao(q, 'yt', (e as Error).message);
    log.warn({ fonte: 'yt', erro: (e as Error).message }, 'falha na coleta do YouTube');
  } finally { rodando = false; }
}
export const coletaYTRodando = () => rodando;
