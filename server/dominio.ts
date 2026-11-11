// Regras e utilidades do domínio, usadas pelas ações do servidor.

export const PAPEIS = ['operacao', 'diretoria', 'cancha', 'produtora', 'leitor'] as const;
export type Papel = (typeof PAPEIS)[number];
export type Usuario = { id: string; nome: string; papel: Papel; email: string | null; demo: boolean };
export const NOME_PAPEL: Record<string, string> = {
  operacao: 'Operação Spraytec', diretoria: 'Diretoria Spraytec', cancha: 'Cancha', produtora: 'Produtora de vídeo', leitor: 'Leitor',
};

// Fluxo de um post ou e-mail: a Spraytec aprova a pauta antes da produção e a peça depois.
// "Validação interna" não é uma etapa: é uma marca no item em aprovação (continua com a Spraytec).
export const STATUS: Record<string, string> = {
  pauta: 'Pauta em produção', pauta_aprovacao: 'Pauta em aprovação', producao: 'Em produção', texto_aprovacao: 'Textos em aprovação', aprovacao: 'Em aprovação',
  ajuste: 'Ajuste', aprovado: 'Aprovado', agendado: 'Agendado', publicado: 'Publicado', espera: 'Em espera',
};
export const ETAPAS_VIDEO = ['pauta', 'viabilidade', 'roteiro', 'gravacao', 'entregue'];

// Feriados nacionais de qualquer ano (os móveis saem da Páscoa) e os feriados ou recessos que a equipe cadastra
// no calendário (marcos do tipo "feriado" ou "recesso"). Prazo nunca cai em fim de semana nem nesses dias.
function pascoa(y: number): string {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return y + '-' + String(mes).padStart(2, '0') + '-' + String(dia).padStart(2, '0');
}
const cacheFer: Record<number, Record<string, string>> = {};
export function feriadosAno(y: number): Record<string, string> {
  if (cacheFer[y]) return cacheFer[y];
  const o: Record<string, string> = {}, p = pascoa(y);
  for (const [d, n] of [['01-01', 'Ano-novo'], ['04-21', 'Tiradentes'], ['05-01', 'Dia do Trabalho'], ['09-07', 'Independência'], ['10-12', 'N. Sra. Aparecida'],
    ['11-02', 'Finados'], ['11-15', 'Proclamação'], ['11-20', 'Consc. Negra'], ['12-25', 'Natal']]) o[y + '-' + d] = n;
  for (const [k, n] of [[-48, 'Carnaval'], [-47, 'Carnaval'], [-2, 'Sexta-feira Santa'], [60, 'Corpus Christi']] as [number, string][]) o[addDays(p, k)] = n;
  return (cacheFer[y] = o);
}
let extras: { ini: string; fim: string; nome: string }[] = [];
export function definirFeriadosExtras(marcos: any[] | undefined) {
  extras = (marcos || []).filter((m) => m && (m.tipo === 'feriado' || m.tipo === 'recesso') && m.ini && m.fim).map((m) => ({ ini: m.ini, fim: m.fim, nome: m.nome || '' }));
}
export function feriado(iso: string): string {
  return feriadosAno(+iso.slice(0, 4))[iso] || extras.find((x) => x.ini <= iso && x.fim >= iso)?.nome || '';
}
const anoAtual = new Date().getUTCFullYear();
export const FERIADOS: Record<string, string> = { ...feriadosAno(anoAtual - 1), ...feriadosAno(anoAtual), ...feriadosAno(anoAtual + 1) };

const FUSO = 'America/Sao_Paulo';
export function hojeBR(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export function agoraBR(d = new Date()): string {
  const p = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d);
  const g = (t: string) => p.find((x) => x.type === t)?.value || '';
  return `${g('day')}/${g('month')} ${g('hour')}:${g('minute')}`;
}
export const fmt = (iso?: string | null) => (iso ? iso.slice(8) + '/' + iso.slice(5, 7) : '—');
export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const dow = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay();
export const isBiz = (iso: string) => dow(iso) !== 0 && dow(iso) !== 6 && !feriado(iso);
export function addBiz(iso: string, n: number): string {
  let d = iso;
  while (n > 0) { d = addDays(d, 1); if (isBiz(d)) n--; }
  return d;
}
// Data AAAA-MM-DD que existe de verdade (31/02 não passa: o JavaScript transformaria em 03/03).
export const isoValida = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s + 'T12:00:00Z').toISOString().slice(0, 10) === s;

export const novoId = (prefixo: string) => prefixo + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const clone = <T>(o: T): T => JSON.parse(JSON.stringify(o));

export class ErroAcao extends Error {
  codigo?: string;
  constructor(msg: string, codigo?: string) { super(msg); this.codigo = codigo; }
}
export function texto(v: unknown, campo: string, max = 4000, obrigatorio = true): string {
  const s = typeof v === 'string' ? v.trim() : '';
  if (obrigatorio && !s) throw new ErroAcao(`Preencha: ${campo}.`);
  if (s.length > max) throw new ErroAcao(`${campo} está longo demais.`);
  return s;
}
