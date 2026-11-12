// Idioma da tela. Nenhum texto fica no código: tudo vem de /i18n/<idioma>.json.
// Datas, números e moeda seguem o idioma de quem lê. A moeda é sempre dólar (a conta da Spraytec USA é em USD).
export const IDIOMAS = ['pt-BR', 'en-US'];
export const FUSO = 'America/Chicago';
let lang = 'en-US';
let dic = {};

export const idioma = () => lang;

export async function carregarIdioma(l) {
  lang = IDIOMAS.includes(l) ? l : 'en-US';
  const r = await fetch(`/i18n/${lang}.json`, { cache: 'no-cache' });
  dic = await r.json();
  document.documentElement.lang = lang;
  try { localStorage.setItem('idioma', lang); } catch {}
}

// Idioma de quem ainda não entrou: o que escolheu antes neste navegador, senão o do navegador.
export function idiomaInicial() {
  try { const s = localStorage.getItem('idioma'); if (IDIOMAS.includes(s)) return s; } catch {}
  return (navigator.language || '').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US';
}

// t('chave', { x: 1 }). Parâmetro que é uma chave (ex.: 'campo.titulo') também é traduzido.
export function t(chave, params) {
  let s = dic[chave];
  if (s == null) { console.warn('tradução faltando:', chave); s = chave; }
  if (!params) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    if (v == null) return '';
    const x = String(v);
    return /^[a-z_]+\.[\w.]+$/.test(x) && dic[x] != null ? dic[x] : x;
  });
}
// A chave existe? (para textos opcionais, sem aviso de tradução faltando)
export const tem = (chave) => dic[chave] != null;
// Plural simples: chave.um / chave.varios
export const tn = (chave, n, params = {}) => t(chave + (n === 1 ? '.um' : '.varios'), { n: num(n), ...params });

// ---------- formatos ----------
const dt = (iso) => new Date(iso + 'T12:00:00Z');
// 11/18/2026 (en-US) ou 18/11/2026 (pt-BR)
export const data = (iso) => (iso ? new Intl.DateTimeFormat(lang, { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(dt(iso)) : '—');
// Nov 18 / 18 de nov.
export const dataCurta = (iso) => (iso ? new Intl.DateTimeFormat(lang, { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(dt(iso)) : '—');
// 11/18 (en-US) ou 18/11 (pt-BR)
export const diaMes = (iso) => (iso ? new Intl.DateTimeFormat(lang, { timeZone: 'UTC', day: '2-digit', month: '2-digit' }).format(dt(iso)) : '—');
export const diaSemana = (iso) => new Intl.DateTimeFormat(lang, { timeZone: 'UTC', weekday: 'short' }).format(dt(iso));
export const mesAno = (y, m) => new Intl.DateTimeFormat(lang, { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(y, m - 1, 15)));
export const mesCurto = (y, m) => new Intl.DateTimeFormat(lang, { timeZone: 'UTC', month: 'short' }).format(new Date(Date.UTC(y, m - 1, 15)));
export function periodo(ini, fim) {
  if (!ini) return '—';
  return ini === fim ? dataCurta(ini) : `${dataCurta(ini)} – ${dataCurta(fim)}`;
}
// Data e hora de um registro (ISO). Horário de Iowa (CT); quem usa português vê também o de Brasília.
export function dataHora(isoTs) {
  if (!isoTs) return '—';
  const d = new Date(isoTs);
  if (isNaN(d)) return String(isoTs);
  const f = (tz, o) => new Intl.DateTimeFormat(lang, { timeZone: tz, ...o }).format(d);
  const dia = f(FUSO, { day: 'numeric', month: 'short' });
  const h = f(FUSO, { hour: 'numeric', minute: '2-digit' });
  if (lang === 'pt-BR') return `${dia}, ${h} CT (${f('America/Sao_Paulo', { hour: '2-digit', minute: '2-digit' })} ${t('geral.brasilia')})`;
  return `${dia}, ${h} CT`;
}
export const num = (v) => (v == null ? '—' : new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(v));
export const moeda = (v, casas = 0) => (v == null ? '—' : new Intl.NumberFormat(lang, { style: 'currency', currency: 'USD', minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v));
export const pct = (v) => (v == null ? '—' : new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 1 }).format(v));

// Conteúdo escrito por pessoas: aparece no idioma de quem lê quando há tradução, com opção de ver o original.
// item.idioma = idioma em que foi escrito; item.traducoes[lang] = { campo: texto } (ou texto, nos comentários).
export function traduzido(item, campo) {
  const orig = campo ? item[campo] : item.texto;
  if (!item.idioma || item.idioma === lang || !item.traducoes) return { texto: orig, traduzido: false };
  const tr = item.traducoes[lang];
  const v = tr == null ? null : typeof tr === 'string' ? (campo ? null : tr) : tr[campo || 'texto'];
  return v ? { texto: v, traduzido: true, original: orig } : { texto: orig, traduzido: false };
}
