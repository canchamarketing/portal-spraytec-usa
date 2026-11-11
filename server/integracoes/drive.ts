// Integração com o Google Drive da Spraytec. Fotos, vídeos e peças ficam no Drive; o portal guarda só a
// identificação de cada arquivo (nas ações, com quem enviou e quando) e mostra o arquivo para quem pode vê-lo.
// Permissão drive.file: o portal grava só no que ele mesmo criou, dentro da pasta "Portal Spraytec".
// Leitura (drive.readonly, pedida na conexão): permite usar um arquivo que já está no Drive pelo link,
// copiando-o para a pasta do post (a cópia é feita dentro do Google, sem baixar nada).
// A autorização (refresh token) fica cifrada no banco com DRIVE_CHAVE, que só existe no .env do servidor.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import type { Consulta } from '../db.ts';

const G = () => process.env.GOOGLE_API_URL; // só nos testes (Drive simulado)
const TOKEN_URL = () => (G() || 'https://oauth2.googleapis.com') + '/token';
const REVOKE_URL = () => (G() || 'https://oauth2.googleapis.com') + '/revoke';
const DRIVE = () => (G() || 'https://www.googleapis.com') + '/drive/v3';
const UPLOAD = () => (G() || 'https://www.googleapis.com') + '/upload/drive/v3';
const AUTH_URL = process.env.GOOGLE_AUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth'; // simulado nos testes
export const ESCOPO = 'https://www.googleapis.com/auth/drive.file';
export const ESCOPO_LER = 'https://www.googleapis.com/auth/drive.readonly';
const RAIZ = 'Portal Spraytec';
const PASTA = 'application/vnd.google-apps.folder';
export const PARTE = 8 * 1024 * 1024; // pedaço de cada envio (múltiplo de 256 KB, exigência do Google)

export class ErroDrive extends Error {
  status: number;
  constructor(msg: string, status = 0) { super(msg); this.status = status; }
}

export const driveConfigurado = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && /^[0-9a-f]{64}$/i.test(process.env.DRIVE_CHAVE || ''));

// ---------- autorização guardada cifrada ----------
const chave = () => Buffer.from(process.env.DRIVE_CHAVE!, 'hex');
export function cifrar(t: string) {
  const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', chave(), iv);
  const x = Buffer.concat([c.update(t, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), x].map((b) => b.toString('base64')).join('.');
}
export function decifrar(s: string) {
  const [iv, tag, x] = s.split('.').map((v) => Buffer.from(v, 'base64'));
  const d = createDecipheriv('aes-256-gcm', chave(), iv); d.setAuthTag(tag);
  return Buffer.concat([d.update(x), d.final()]).toString('utf8');
}

type Conexao = { refresh: string; conta: string; nome: string; leitura?: boolean };
let conexao: Conexao | null = null;
let acesso: { token: string; ate: number } | null = null;
export const driveConectado = () => (conexao ? { conta: conexao.conta, nome: conexao.nome, leitura: !!conexao.leitura } : null);

export async function carregarDrive(q: Consulta) {
  conexao = null; acesso = null;
  if (!driveConfigurado()) return;
  const r = (await q.query<{ valor: string }>(`select valor from segredos where nome='drive'`)).rows[0];
  if (r) try { conexao = JSON.parse(decifrar(r.valor)); } catch { conexao = null; }
}

// ---------- conexão (OAuth) ----------
export function urlAutorizacao(retorno: string, estado: string, escopo = ESCOPO + ' ' + ESCOPO_LER, cliente = process.env.GOOGLE_CLIENT_ID!) {
  const u = new URL(AUTH_URL);
  u.search = new URLSearchParams({
    client_id: cliente, redirect_uri: retorno, response_type: 'code', scope: escopo,
    access_type: 'offline', prompt: 'consent select_account', include_granted_scopes: 'false', state: estado,
  }).toString();
  return u.toString();
}

export async function pedirToken(params: Record<string, string>) {
  const r = await fetch(TOKEN_URL(), {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...params }),
    signal: AbortSignal.timeout(30e3),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroDrive(j.error_description || j.error || 'O Google recusou a autorização.', r.status);
  return j;
}

export async function concluirAutorizacao(q: Consulta, codigo: string, retorno: string) {
  const t = await pedirToken({ code: codigo, redirect_uri: retorno, grant_type: 'authorization_code' });
  if (!t.refresh_token) throw new ErroDrive('O Google não devolveu a autorização permanente. Tente conectar de novo.');
  if (!String(t.scope || '').split(' ').includes(ESCOPO)) throw new ErroDrive('A permissão de acesso ao Drive não foi marcada. Tente de novo e marque a caixa do Drive.');
  acesso = { token: t.access_token, ate: Date.now() + (t.expires_in - 60) * 1000 };
  const sobre = await api('GET', `${DRIVE()}/about?fields=user(emailAddress,displayName)`, {}, t.access_token);
  const nova: Conexao = { refresh: t.refresh_token, conta: sobre.user?.emailAddress || '', nome: sobre.user?.displayName || '', leitura: String(t.scope || '').split(' ').includes(ESCOPO_LER) };
  // Outra conta: as pastas criadas na conta anterior não valem nesta.
  if (conexao && conexao.conta !== nova.conta) await q.query('delete from drive_pastas');
  await q.query(`insert into segredos (nome, valor) values ('drive', $1) on conflict (nome) do update set valor=excluded.valor, atualizado_em=now()`, [cifrar(JSON.stringify(nova))]);
  conexao = nova;
  await pasta(q, []);
  return { conta: nova.conta, nome: nova.nome };
}

export async function desconectarDrive(q: Consulta) {
  const r = conexao?.refresh;
  await q.query(`delete from segredos where nome='drive'`);
  conexao = null; acesso = null;
  if (r) await fetch(REVOKE_URL() + '?token=' + encodeURIComponent(r), { method: 'POST', signal: AbortSignal.timeout(15e3) }).catch(() => {});
}

async function token(): Promise<string> {
  if (!conexao) throw new ErroDrive('O Google Drive não está conectado.', 503);
  if (acesso && acesso.ate > Date.now()) return acesso.token;
  try {
    const t = await pedirToken({ refresh_token: conexao.refresh, grant_type: 'refresh_token' });
    acesso = { token: t.access_token, ate: Date.now() + (t.expires_in - 60) * 1000 };
    return acesso.token;
  } catch (e) {
    if (e instanceof ErroDrive && e.status === 400) throw new ErroDrive('A autorização do Drive foi retirada ou venceu. Conecte o Drive de novo.', 503);
    throw e;
  }
}

async function chamar(metodo: string, url: string, o: { json?: any; headers?: Record<string, string>; body?: any } = {}, tk?: string) {
  const h: Record<string, string> = { authorization: 'Bearer ' + (tk || (await token())), ...(o.headers || {}) };
  let body = o.body;
  if (o.json !== undefined) { h['content-type'] = 'application/json; charset=UTF-8'; body = JSON.stringify(o.json); }
  return fetch(url, { method: metodo, headers: h, body, signal: AbortSignal.timeout(120e3), redirect: 'manual' });
}
async function api(metodo: string, url: string, o: { json?: any; headers?: Record<string, string> } = {}, tk?: string) {
  const r = await chamar(metodo, url, o, tk);
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroDrive(j.error?.message || `O Google Drive respondeu ${r.status}.`, r.status);
  return j;
}

// ---------- pastas ----------
const limpo = (s: string) => s.replace(/[\\/\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'sem nome';
// Garante a pasta "Portal Spraytec/<caminho...>" e devolve o id. Os ids ficam guardados no banco.
export async function pasta(q: Consulta, caminho: string[]): Promise<string> {
  const partes = caminho.map(limpo);
  const chaveDe = (n: number) => '/' + partes.slice(0, n).join('/');
  let pai = '';
  for (let n = 0; n <= partes.length; n++) {
    const k = chaveDe(n);
    const r = (await q.query<{ id: string }>('select id from drive_pastas where caminho=$1', [k])).rows[0];
    if (r) { pai = r.id; continue; }
    const f = await api('POST', `${DRIVE()}/files?fields=id`, { json: { name: n === 0 ? RAIZ : partes[n - 1], mimeType: PASTA, parents: [n === 0 ? 'root' : pai] } });
    await q.query('insert into drive_pastas (caminho, id) values ($1,$2) on conflict (caminho) do update set id=excluded.id', [k, f.id]);
    pai = f.id;
  }
  return pai;
}

// ---------- envio em partes (o navegador manda pedaços de 8 MB; o servidor repassa ao Google) ----------
export type Envio = {
  token: string; usuario: string; ref: string; nome: string; tipo: string; tam: number; url: string;
  recebido: number; criado: number; arquivo?: { id: string; nome: string; tipo: string; tam: number }; usado?: boolean;
};
const envios = new Map<string, Envio>();
setInterval(() => { const lim = Date.now() - 24 * 3600e3; for (const [k, v] of envios) if (v.criado < lim) envios.delete(k); }, 3600e3).unref();

export async function iniciarEnvio(q: Consulta, usuario: string, ref: string, caminho: string[], nome: string, tipo: string, tam: number) {
  const abrir = async () => {
    const pai = await pasta(q, caminho);
    const r = await chamar('POST', `${UPLOAD()}/files?uploadType=resumable&fields=id,name,mimeType,size`, {
      json: { name: limpo(nome), parents: [pai], mimeType: tipo }, headers: { 'x-upload-content-type': tipo, 'x-upload-content-length': String(tam) },
    });
    if (r.status === 404) return null;
    if (!r.ok) { const j: any = await r.json().catch(() => ({})); throw new ErroDrive(j.error?.message || `O Google Drive respondeu ${r.status}.`, r.status); }
    return r.headers.get('location');
  };
  let url = await abrir();
  // A pasta guardada sumiu do Drive (apagada à mão): esquece o caminho e cria de novo.
  if (url === null) { await q.query(`delete from drive_pastas where caminho like '/%'`); url = await abrir(); }
  if (!url) throw new ErroDrive('O Google Drive não abriu o envio. Tente de novo.');
  const e: Envio = { token: randomBytes(18).toString('base64url'), usuario, ref, nome: limpo(nome), tipo, tam, url, recebido: 0, criado: Date.now() };
  envios.set(e.token, e);
  return e;
}
export const envioDe = (token: string, usuario: string) => { const e = envios.get(token); return e && e.usuario === usuario ? e : null; };

export async function enviarParte(e: Envio, inicio: number, pedaco: Buffer) {
  if (inicio !== e.recebido) throw new ErroDrive('Parte fora de ordem.', 409);
  const fim = inicio + pedaco.length - 1;
  if (fim >= e.tam) throw new ErroDrive('O arquivo é maior do que o informado.', 400);
  const r = await fetch(e.url, {
    method: 'PUT', headers: { 'content-range': `bytes ${inicio}-${fim}/${e.tam}` }, body: new Uint8Array(pedaco), signal: AbortSignal.timeout(300e3), redirect: 'manual',
  });
  if (r.status === 308) { const rg = r.headers.get('range'); e.recebido = rg ? Number(rg.split('-')[1]) + 1 : 0; return e; }
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) throw new ErroDrive(j.error?.message || `O Google Drive respondeu ${r.status} no envio.`, r.status);
  e.recebido = e.tam;
  e.arquivo = { id: j.id, nome: j.name || e.nome, tipo: j.mimeType || e.tipo, tam: Number(j.size || e.tam) };
  return e;
}

// Arquivo pequeno de uma vez (stories que o portal guarda sozinho).
export async function salvarArquivo(q: Consulta, caminho: string[], nome: string, tipo: string, dados: Buffer) {
  const e = await iniciarEnvio(q, 'sistema', 'stories', caminho, nome, tipo, dados.length);
  for (let i = 0; i < dados.length; i += PARTE) await enviarParte(e, i, dados.subarray(i, i + PARTE));
  envios.delete(e.token);
  return e.arquivo!;
}

// ---------- arquivo que já está no Drive, pelo link ----------
// Aceita os formatos de link do Drive (…/file/d/ID/…, ?id=ID) ou o próprio id.
export function idDoLink(link: string): string | null {
  const s = String(link || '').trim();
  const m = s.match(/\/file\/d\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/) || s.match(/^([\w-]{20,})$/);
  return m ? m[1] : null;
}
export async function copiarDoDrive(q: Consulta, id: string, caminho: string[]) {
  if (!conexao) throw new ErroDrive('O Google Drive não está conectado.', 503);
  if (!conexao.leitura) throw new ErroDrive('Para usar arquivos pelo link, o Drive precisa ser conectado de novo (Integrações › Google Drive › Conectar), aceitando a leitura dos arquivos.', 403);
  let m: any;
  try { m = await api('GET', `${DRIVE()}/files/${encodeURIComponent(id)}?fields=id,name,mimeType,size&supportsAllDrives=true`); }
  catch (e) { if (e instanceof ErroDrive && [403, 404].includes(e.status)) throw new ErroDrive('O portal não consegue abrir esse arquivo. Confira se o link está certo e se o arquivo está no Drive da Spraytec ou compartilhado com ela.', 404); throw e; }
  if (m.mimeType === PASTA) throw new ErroDrive('Esse link é de uma pasta. Abra a pasta e copie o link do arquivo.', 400);
  if (/^application\/vnd\.google-apps\./.test(m.mimeType || '')) throw new ErroDrive('Esse link é de um documento do Google (Docs, Planilhas…). Use o link de uma imagem ou de um vídeo.', 400);
  const pai = await pasta(q, caminho);
  const c = await api('POST', `${DRIVE()}/files/${encodeURIComponent(id)}/copy?fields=id,name,mimeType,size&supportsAllDrives=true`, { json: { name: limpo(m.name || 'arquivo'), parents: [pai] } });
  return { id: c.id as string, nome: (c.name || m.name) as string, tipo: (c.mimeType || m.mimeType || 'application/octet-stream') as string, tam: Number(c.size || m.size || 0) };
}
// Move um arquivo do portal para outra pasta (ex.: "Versões antigas" do post). Se já está lá, não faz nada.
export async function moverPara(q: Consulta, id: string, caminho: string[]) {
  const destino = await pasta(q, caminho);
  const m = await api('GET', `${DRIVE()}/files/${encodeURIComponent(id)}?fields=parents`);
  const pais: string[] = m.parents || [];
  if (pais.includes(destino)) return false;
  await api('PATCH', `${DRIVE()}/files/${encodeURIComponent(id)}?addParents=${encodeURIComponent(destino)}${pais.length ? '&removeParents=' + encodeURIComponent(pais.join(',')) : ''}&fields=id`, { json: {} });
  return true;
}
// A cópia entra no item pelo mesmo caminho de um envio (ação arquivo-anexar).
export function registrarCopia(usuario: string, ref: string, arquivo: { id: string; nome: string; tipo: string; tam: number; origem?: string }) {
  const e: Envio = { token: randomBytes(18).toString('base64url'), usuario, ref, nome: arquivo.nome, tipo: arquivo.tipo, tam: arquivo.tam, url: '', recebido: arquivo.tam, criado: Date.now(), arquivo };
  envios.set(e.token, e);
  return e.token;
}

// ---------- leitura (o portal mostra o arquivo; ninguém precisa de acesso ao Drive) ----------
export async function abrirConteudo(id: string, range?: string) {
  const r = await chamar('GET', `${DRIVE()}/files/${encodeURIComponent(id)}?alt=media`, { headers: range ? { range } : {} });
  if (!r.ok && r.status !== 206) throw new ErroDrive(r.status === 404 ? 'Arquivo não encontrado no Drive.' : `O Google Drive respondeu ${r.status}.`, r.status);
  return r;
}
// Baixa um arquivo do Drive para o disco do servidor (para converter vídeo), sem passar tudo pela memória.
export async function baixarPara(id: string, destino: string) {
  const { createWriteStream } = await import('node:fs');
  const { pipeline } = await import('node:stream/promises');
  const { Readable } = await import('node:stream');
  const r = await chamar('GET', `${DRIVE()}/files/${encodeURIComponent(id)}?alt=media`);
  if (!r.ok || !r.body) throw new ErroDrive(r.status === 404 ? 'Arquivo não encontrado no Drive.' : `O Google Drive respondeu ${r.status}.`, r.status);
  await pipeline(Readable.fromWeb(r.body as any), createWriteStream(destino));
}
// Sobe um arquivo do disco para a pasta do item, em partes (o mesmo envio do portal).
export async function enviarDoDisco(q: Consulta, ref: string, caminho: string[], nome: string, tipo: string, arquivo: string) {
  const { open, stat } = await import('node:fs/promises');
  const tam = (await stat(arquivo)).size;
  const e = await iniciarEnvio(q, 'sistema', ref, caminho, nome, tipo, tam);
  const fh = await open(arquivo, 'r');
  try {
    for (let i = 0; i < tam; i += PARTE) {
      const buf = Buffer.alloc(Math.min(PARTE, tam - i));
      await fh.read(buf, 0, buf.length, i);
      await enviarParte(e, i, buf);
    }
  } finally { await fh.close(); envios.delete(e.token); }
  return e.arquivo!;
}
const miniaturas = new Map<string, { tipo: string; dados: Buffer; ate: number }>();
export async function miniatura(id: string, tam: number) {
  const k = id + ':' + tam, c = miniaturas.get(k);
  if (c && c.ate > Date.now()) return c;
  const m = await api('GET', `${DRIVE()}/files/${encodeURIComponent(id)}?fields=thumbnailLink,mimeType`);
  if (!m.thumbnailLink) return null;
  const r = await chamar('GET', String(m.thumbnailLink).replace(/=s\d+$/, '=s' + tam));
  if (!r.ok) return null;
  const v = { tipo: r.headers.get('content-type') || 'image/jpeg', dados: Buffer.from(await r.arrayBuffer()), ate: Date.now() + 3600e3 };
  if (miniaturas.size > 400) miniaturas.delete(miniaturas.keys().next().value!);
  miniaturas.set(k, v);
  return v;
}
export async function situacaoDrive() {
  const s = await api('GET', `${DRIVE()}/about?fields=user(emailAddress),storageQuota(limit,usage)`);
  return { conta: s.user?.emailAddress, usado: Number(s.storageQuota?.usage || 0), limite: s.storageQuota?.limit ? Number(s.storageQuota.limit) : null };
}
