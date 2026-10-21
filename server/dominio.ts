// Regras e utilidades do domínio, usadas pelas ações do servidor.

export const PAPEIS = ['matheus', 'diretoria', 'cancha', 'produtora', 'leitor'] as const;
export type Papel = (typeof PAPEIS)[number];
export type Usuario = { id: string; nome: string; papel: Papel; email: string | null; demo: boolean };

export const STATUS: Record<string, string> = {
  pauta: 'Pauta', producao: 'Em produção', aprovacao: 'Em aprovação', validacao: 'Validação interna Spraytec',
  ajuste: 'Ajuste solicitado', aprovado: 'Aprovado', agendado: 'Agendado', publicado: 'Publicado', espera: 'Em espera',
};
export const ETAPAS_VIDEO = ['pauta', 'viabilidade', 'roteiro', 'gravacao', 'entregue'];

// Feriados nacionais (usados para contar dias úteis de prazo).
export const FERIADOS: Record<string, string> = {
  '2026-09-07': 'Independência', '2026-10-12': 'N. Sra. Aparecida', '2026-11-02': 'Finados', '2026-11-15': 'Proclamação',
  '2026-11-20': 'Consc. Negra', '2026-12-25': 'Natal', '2027-01-01': 'Ano-novo', '2027-02-08': 'Carnaval',
  '2027-02-09': 'Carnaval', '2027-03-26': 'Sexta-feira Santa', '2027-04-21': 'Tiradentes', '2027-05-01': 'Dia do Trabalho',
  '2027-05-27': 'Corpus Christi', '2027-09-07': 'Independência', '2027-10-12': 'N. Sra. Aparecida', '2027-11-02': 'Finados',
  '2027-11-15': 'Proclamação', '2027-11-20': 'Consc. Negra', '2027-12-25': 'Natal',
};

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
export const isBiz = (iso: string) => dow(iso) !== 0 && dow(iso) !== 6 && !FERIADOS[iso];
export function addBiz(iso: string, n: number): string {
  let d = iso;
  while (n > 0) { d = addDays(d, 1); if (isBiz(d)) n--; }
  return d;
}
export const isoValida = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

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
