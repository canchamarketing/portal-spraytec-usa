// Conversa com o servidor. Toda resposta de erro já vem no idioma de quem pediu.
import { idioma, t } from './i18n.js';

export class ErroApi extends Error {
  constructor(msg, status) { super(msg); this.status = status; }
}
export async function api(caminho, corpo) {
  let r;
  try {
    r = await fetch(caminho, {
      method: corpo === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', 'x-idioma': idioma() },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      credentials: 'same-origin',
    });
  } catch {
    throw new ErroApi(t('erro.sem_conexao'), 0);
  }
  let j = {};
  try { j = await r.json(); } catch {}
  if (!r.ok) throw new ErroApi(j.erro || t('erro.generico'), r.status);
  return j;
}
