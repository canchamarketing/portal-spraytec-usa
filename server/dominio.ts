// Regras e utilidades do domínio, usadas pelas ações do servidor.

// Papéis. Os nomes que aparecem na tela vêm dos arquivos de tradução (chave "papel.<id>").
export const PAPEIS = ['cancha', 'aprovador', 'leitor', 'produtora'] as const;
export type Papel = (typeof PAPEIS)[number];
export const IDIOMAS = ['pt-BR', 'en-US'] as const;
export type Idioma = (typeof IDIOMAS)[number];
export type Usuario = { id: string; nome: string; papel: Papel; email: string | null; demo: boolean; idioma: Idioma };
// Idioma de quem ainda não escolheu: a Cancha trabalha em português; Spraytec USA e produtora, em inglês.
export const idiomaPadrao = (papel: string): Idioma => (papel === 'cancha' ? 'pt-BR' : 'en-US');
export const idiomaValido = (v: unknown): Idioma | null => ((IDIOMAS as readonly string[]).includes(String(v)) ? (v as Idioma) : null);

// ---------- datas ----------
// A Spraytec USA fica em Urbandale, Iowa: "hoje", prazos e lembretes seguem o fuso Central dos EUA
// (com horário de verão). O servidor roda em UTC.
export const FUSO = 'America/Chicago';
export function hoje(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const dow = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay();
const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
// n-ésimo dia da semana do mês (n = -1: o último). wd: 0 = domingo.
function nthDow(y: number, m: number, wd: number, n: number): string {
  if (n > 0) {
    const first = dow(iso(y, m, 1));
    return iso(y, m, 1 + ((wd - first + 7) % 7) + (n - 1) * 7);
  }
  const ultimo = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const last = dow(iso(y, m, ultimo));
  return iso(y, m, ultimo - ((last - wd + 7) % 7));
}
// Feriado em fim de semana é folga na sexta anterior (sábado) ou na segunda seguinte (domingo).
const observado = (d: string) => (dow(d) === 6 ? addDays(d, -1) : dow(d) === 0 ? addDays(d, 1) : d);

// Feriados federais dos EUA em que o comércio costuma parar. A chave é traduzida na tela ("feriado.<id>").
const cacheFer: Record<number, Record<string, string>> = {};
export function feriadosAno(y: number): Record<string, string> {
  if (cacheFer[y]) return cacheFer[y];
  const o: Record<string, string> = {};
  const fixo = (m: number, d: number, k: string) => { o[observado(iso(y, m, d))] = k; };
  fixo(1, 1, 'ano_novo');
  o[nthDow(y, 1, 1, 3)] = 'mlk';
  o[nthDow(y, 2, 1, 3)] = 'presidentes';
  o[nthDow(y, 5, 1, -1)] = 'memorial';
  fixo(6, 19, 'juneteenth');
  fixo(7, 4, 'independencia');
  o[nthDow(y, 9, 1, 1)] = 'trabalho';
  const thanks = nthDow(y, 11, 4, 4);
  o[thanks] = 'acao_gracas';
  o[addDays(thanks, 1)] = 'pos_acao_gracas';
  fixo(12, 25, 'natal');
  return (cacheFer[y] = o);
}
// Folgas e recessos cadastrados no calendário (eventos do tipo "recesso") também não contam como dia útil.
let extras: { ini: string; fim: string; nome: string }[] = [];
export function definirFeriadosExtras(eventos: any[] | undefined) {
  extras = (eventos || []).filter((m) => m && m.tipo === 'recesso' && m.ini && m.fim).map((m) => ({ ini: m.ini, fim: m.fim, nome: m.nome || '' }));
}
export function feriado(d: string): string {
  return feriadosAno(+d.slice(0, 4))[d] || extras.find((x) => x.ini <= d && x.fim >= d)?.nome || '';
}
export const isBiz = (d: string) => dow(d) !== 0 && dow(d) !== 6 && !feriado(d);
export function addBiz(d: string, n: number): string {
  const passo = n < 0 ? -1 : 1;
  let r = d, falta = Math.abs(n);
  while (falta > 0) { r = addDays(r, passo); if (isBiz(r)) falta--; }
  return r;
}
// Data AAAA-MM-DD que existe de verdade (31/02 não passa: o JavaScript transformaria em 03/03).
export const isoValida = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;

export const novoId = (prefixo: string) => prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

// Erro de regra. A mensagem é uma chave dos arquivos de tradução ("erro.…"); quem responde traduz
// para o idioma de quem pediu.
export class ErroAcao extends Error {
  codigo?: string;
  params?: Record<string, string | number>;
  constructor(chave: string, params?: Record<string, string | number>, codigo?: string) { super(chave); this.params = params; this.codigo = codigo; }
}
// Texto digitado: tira espaços das pontas, confere se veio e o tamanho. "campo" é a chave do nome do campo.
export function texto(v: unknown, campo: string, max = 4000, obrigatorio = true): string {
  const s = typeof v === 'string' ? v.replace(/\r\n?/g, '\n').trim() : '';
  if (obrigatorio && !s) throw new ErroAcao('erro.preencha', { campo });
  if (s.length > max) throw new ErroAcao('erro.longo', { campo });
  return s;
}
export function linkUrl(v: unknown, campo: string, obrigatorio = false): string {
  const s = texto(v, campo, 1000, obrigatorio);
  if (!s) return '';
  if (!/^https?:\/\/[^\s]+$/i.test(s)) throw new ErroAcao('erro.link', { campo });
  return s;
}
export function umDe<T extends string>(v: unknown, opcoes: readonly T[], campo: string): T {
  if (!(opcoes as readonly string[]).includes(String(v))) throw new ErroAcao('erro.escolha', { campo });
  return v as T;
}
