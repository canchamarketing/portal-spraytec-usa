// Login. Cada pessoa tem a própria conta. Dois jeitos de entrar:
// 1) link de acesso por e-mail (precisa de SMTP configurado);
// 2) modo demonstração: código de acesso + escolha de uma das pessoas de demonstração.
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
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

// ---------- link de acesso por e-mail ----------
export const emailConfigurado = () => !!(process.env.SMTP_HOST && process.env.EMAIL_REMETENTE && (!process.env.SMTP_USUARIO || process.env.SMTP_SENHA));

const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

export async function enviarEmail(para: string, assunto: string, texto: string, html: string) {
  const nodemailer = (await import('nodemailer')).default;
  const t = nodemailer.createTransport({
    host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USUARIO ? { user: process.env.SMTP_USUARIO, pass: process.env.SMTP_SENHA } : undefined,
  });
  await t.sendMail({ from: process.env.EMAIL_REMETENTE, to: para, subject: assunto, text: texto, html });
}

// Envia o link de acesso (vale 30 minutos e uma vez só). Não diz se o e-mail existe ou não.
export async function enviarLinkDeAcesso(b: Banco, email: string, baseUrl: string) {
  const { rows } = await b.query('select id, nome from usuarios where lower(email) = lower($1) and ativo and not demo', [email]);
  if (!rows[0] || !emailConfigurado()) return;
  const token = randomBytes(32).toString('base64url');
  await b.query(`insert into tokens_login (token_hash, usuario_id, expira_em) values ($1, $2, now() + interval '30 minutes')`, [hash(token), rows[0].id]);
  const link = `${baseUrl}/entrar?t=${token}`;
  const nome = String(rows[0].nome).split(' ')[0];
  const texto = `Olá, ${nome}.\n\nPara entrar no Portal Spraytec, abra este link (vale por 30 minutos e uma vez só):\n${link}\n\nSe não foi você que pediu, ignore este e-mail.\n\nPortal de marketing Spraytec · Cancha Marketing`;
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1E2B22">
<img src="${baseUrl}/logo.png" alt="Spraytec" height="28" style="display:block;margin-bottom:24px">
<p style="font-size:16px">Olá, ${escHtml(nome)}.</p>
<p style="font-size:15px;line-height:1.5">Para entrar no Portal de marketing Spraytec, clique no botão abaixo.</p>
<p style="margin:28px 0"><a href="${link}" style="background:#235F3F;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:6px;font-weight:bold;display:inline-block">Entrar no portal</a></p>
<p style="font-size:13px;color:#666666;line-height:1.5">O link vale por 30 minutos e funciona uma vez só. Se não foi você que pediu, pode ignorar este e-mail.</p>
<p style="font-size:12px;color:#999999;margin-top:32px">Portal de marketing Spraytec · Cancha Marketing</p></div>`;
  await enviarEmail(email, 'Seu link de acesso ao Portal Spraytec', texto, html);
}

export async function usarLinkDeAcesso(b: Banco, token: string): Promise<string | null> {
  const { rows } = await b.query(
    `update tokens_login set usado_em = now() where token_hash = $1 and usado_em is null and expira_em > now() returning usuario_id`, [hash(token)]);
  return rows[0] ? rows[0].usuario_id : null;
}
