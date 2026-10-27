// Login. Cada pessoa tem a própria conta. Dois jeitos de entrar:
// 1) e-mail e senha (a pessoa cria a senha pelo link de convite e pode redefinir pelo e-mail);
// 2) modo demonstração: código de acesso + escolha de uma das pessoas de demonstração.
import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Banco } from './db.ts';
import type { Usuario } from './dominio.ts';

export const COOKIE_SESSAO = 'spraytec_sessao';
export const COOKIE_DEMO = 'spraytec_demo';
const DIAS_SESSAO = 30;

const hash = (t: string) => createHash('sha256').update(t).digest('hex');
const seguro = () => process.env.NODE_ENV === 'production';

export const modoDemo = () => !!process.env.DEMO_CODIGO;

export function codigoDemoConfere(c: unknown): boolean {
  const certo = process.env.DEMO_CODIGO || '';
  if (!certo || typeof c !== 'string') return false;
  const a = Buffer.from(c.trim()), b = Buffer.from(certo);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function criarSessao(b: Banco, usuarioId: string, req: FastifyRequest, rep: FastifyReply) {
  const token = randomBytes(32).toString('base64url');
  await b.query(
    `insert into sessoes (token_hash, usuario_id, expira_em, ip, agente) values ($1, $2, now() + interval '${DIAS_SESSAO} days', $3, $4)`,
    [hash(token), usuarioId, req.ip, String(req.headers['user-agent'] || '').slice(0, 300)]);
  rep.setCookie(COOKIE_SESSAO, token, { path: '/', httpOnly: true, sameSite: 'lax', secure: seguro(), maxAge: DIAS_SESSAO * 86400 });
}

export async function encerrarSessao(b: Banco, req: FastifyRequest, rep: FastifyReply) {
  const t = req.cookies[COOKIE_SESSAO];
  if (t) await b.query('delete from sessoes where token_hash=$1', [hash(t)]);
  rep.clearCookie(COOKIE_SESSAO, { path: '/' });
}

export async function usuarioDaRequisicao(b: Banco, req: FastifyRequest): Promise<Usuario | null> {
  const t = req.cookies[COOKIE_SESSAO];
  if (!t) return null;
  const { rows } = await b.query(
    `select u.id, u.nome, u.papel, u.email, u.demo from sessoes s join usuarios u on u.id = s.usuario_id
     where s.token_hash = $1 and s.expira_em > now() and u.ativo`, [hash(t)]);
  return rows[0] || null;
}

// Cookie assinado que lembra que este navegador já digitou o código da demonstração.
export function demoLiberado(req: FastifyRequest): boolean {
  if (!modoDemo()) return false;
  const c = req.cookies[COOKIE_DEMO];
  if (!c) return false;
  const r = req.unsignCookie(c);
  return r.valid && r.value === 'ok';
}
export function liberarDemo(rep: FastifyReply) {
  rep.setCookie(COOKIE_DEMO, 'ok', { path: '/', httpOnly: true, sameSite: 'lax', secure: seguro(), maxAge: 14 * 86400, signed: true });
}

// Limite simples por IP: bloqueia depois de muitas tentativas erradas (código) ou muitos pedidos (link).
const tentativas = new Map<string, number[]>();
const JANELA = 10 * 60 * 1000;
const recentes = (chave: string) => (tentativas.get(chave) || []).filter((t) => Date.now() - t < JANELA);
export const bloqueado = (chave: string, max = 8) => recentes(chave).length >= max;
export function registrar(chave: string) { const l = recentes(chave); l.push(Date.now()); tentativas.set(chave, l); }
export function permitido(chave: string, max = 8): boolean {
  if (bloqueado(chave, max)) return false;
  registrar(chave);
  return true;
}

// ---------- senhas ----------
// Guardadas com scrypt (resistente a força bruta) e sal próprio; nunca em texto.
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };
function scryptAsync(senha: string, sal: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((ok, erro) => scrypt(senha.normalize('NFKC'), sal, 64, { N: n, r, p, maxmem: SCRYPT.maxmem }, (e, k) => (e ? erro(e) : ok(k))));
}
export async function hashSenha(senha: string): Promise<string> {
  const sal = randomBytes(16);
  const k = await scryptAsync(senha, sal, SCRYPT.N, SCRYPT.r, SCRYPT.p);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${sal.toString('base64')}$${k.toString('base64')}`;
}
const HASH_FALSO = 'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');
// Compara em tempo constante. Sem hash (e-mail que não existe), calcula mesmo assim para não revelar nada pelo tempo.
export async function verificarSenha(senha: string, armazenado: string | null): Promise<boolean> {
  const [alg, n, r, p, sal, k] = String(armazenado || HASH_FALSO).split('$');
  if (alg !== 'scrypt') return false;
  const calc = await scryptAsync(senha, Buffer.from(sal, 'base64'), Number(n), Number(r), Number(p));
  const certo = Buffer.from(k, 'base64');
  return !!armazenado && calc.length === certo.length && timingSafeEqual(calc, certo);
}
// Regra (decisão da Cancha): no mínimo 8 caracteres.
export function problemaNaSenha(senha: unknown, _email: string): string | null {
  if (typeof senha !== 'string' || senha.length < 8) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (senha.length > 200) return 'A senha está longa demais.';
  return null;
}

// ---------- links de convite e de redefinição (uso único) ----------
export type TipoToken = 'convite' | 'redefinir';
export async function criarToken(b: Banco, usuarioId: string, tipo: TipoToken, horas: number): Promise<string> {
  // Um link novo invalida os anteriores do mesmo tipo.
  await b.query(`update tokens_login set usado_em = now() where usuario_id=$1 and tipo=$2 and usado_em is null`, [usuarioId, tipo]);
  const token = randomBytes(32).toString('base64url');
  await b.query(`insert into tokens_login (token_hash, usuario_id, tipo, expira_em) values ($1, $2, $3, now() + ($4 || ' hours')::interval)`, [hash(token), usuarioId, tipo, String(horas)]);
  return token;
}
export async function consultarToken(b: Banco, token: string): Promise<{ id: string; nome: string; email: string; tipo: TipoToken } | null> {
  const { rows } = await b.query(
    `select u.id, u.nome, u.email, t.tipo from tokens_login t join usuarios u on u.id = t.usuario_id
     where t.token_hash=$1 and t.usado_em is null and t.expira_em > now() and t.tipo in ('convite','redefinir') and u.ativo`, [hash(token)]);
  return rows[0] || null;
}
export async function usarToken(b: Banco, token: string): Promise<{ id: string; nome: string; email: string; tipo: TipoToken } | null> {
  const { rows } = await b.query(
    `update tokens_login t set usado_em = now() from usuarios u
     where t.token_hash=$1 and t.usado_em is null and t.expira_em > now() and t.tipo in ('convite','redefinir') and u.id = t.usuario_id and u.ativo
     returning u.id, u.nome, u.email, t.tipo`, [hash(token)]);
  return rows[0] || null;
}
export const linkDoToken = (baseUrl: string, token: string, tipo: TipoToken) => `${baseUrl}/${tipo === 'convite' ? 'criar-senha' : 'nova-senha'}?t=${token}`;

// ---------- e-mail ----------
export const emailConfigurado = () => !!(process.env.SMTP_HOST && process.env.EMAIL_REMETENTE && (!process.env.SMTP_USUARIO || process.env.SMTP_SENHA));

const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

export async function enviarEmail(para: string, assunto: string, texto: string, html: string) {
  const nodemailer = (await import('nodemailer')).default;
  // Dois modos: com usuário e senha (ex.: senha de app) ou sem autenticação, pelo redirecionamento SMTP
  // do Google Workspace, que aceita o IP do servidor. SMTP_NOME é o nome com que o servidor se apresenta.
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465,
    requireTLS: Number(process.env.SMTP_PORT || 587) === 587,
    name: process.env.SMTP_NOME || undefined,
    auth: process.env.SMTP_USUARIO ? { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_SENHA } : undefined,
  });
  await t.sendMail({ from: process.env.EMAIL_REMETENTE, to: para, subject: assunto, text: texto, html });
}

function modeloEmail(baseUrl: string, nome: string, paragrafos: string[], botao: string, link: string, aviso: string) {
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1E2B22">
<img src="${baseUrl}/logo.png" alt="Spraytec" height="28" style="display:block;margin-bottom:24px">
<p style="font-size:16px">Olá, ${escHtml(nome)}.</p>
${paragrafos.map((p) => `<p style="font-size:15px;line-height:1.5">${escHtml(p)}</p>`).join('\n')}
<p style="margin:28px 0"><a href="${link}" style="background:#235F3F;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;display:inline-block">${escHtml(botao)}</a></p>
<p style="font-size:13px;color:#666666;line-height:1.5">${escHtml(aviso)}</p>
<p style="font-size:12px;color:#999999;margin-top:32px">Portal de marketing Spraytec · Cancha Marketing</p></div>`;
  const texto = `Olá, ${nome}.\n\n${paragrafos.join('\n\n')}\n\n${botao}: ${link}\n\n${aviso}\n\nPortal de marketing Spraytec · Cancha Marketing`;
  return { html, texto };
}
export async function enviarAviso(baseUrl: string, para: { nome: string; email: string }, assunto: string, paragrafos: string[], link: string) {
  const { html, texto } = modeloEmail(baseUrl, para.nome.split(' ')[0], paragrafos, 'Abrir no portal', link,
    'Você recebeu este e-mail porque foi mencionado no Portal de marketing Spraytec.');
  await enviarEmail(para.email, assunto, texto, html);
}
export async function enviarConvite(baseUrl: string, para: { nome: string; email: string }, link: string) {
  const nome = para.nome.split(' ')[0];
  const { html, texto } = modeloEmail(baseUrl, nome,
    ['Você foi convidado para o Portal de marketing Spraytec, onde ficam o calendário de conteúdo, as aprovações, a estratégia e os resultados.',
      'Para começar, crie a sua senha.'],
    'Criar minha senha', link, 'O link vale por 7 dias e funciona uma vez só. Depois, é só entrar com o seu e-mail e a senha que criou.');
  await enviarEmail(para.email, 'Seu acesso ao Portal de marketing Spraytec', texto, html);
}
export async function enviarRedefinicao(baseUrl: string, para: { nome: string; email: string }, link: string) {
  const nome = para.nome.split(' ')[0];
  const { html, texto } = modeloEmail(baseUrl, nome,
    ['Recebemos um pedido para criar uma nova senha para o Portal de marketing Spraytec.'],
    'Criar nova senha', link, 'O link vale por 1 hora e funciona uma vez só. Se não foi você que pediu, ignore este e-mail: sua senha atual continua valendo.');
  await enviarEmail(para.email, 'Nova senha do Portal Spraytec', texto, html);
}
