// Utilidades das ações (usadas por acoes.ts e modulos.ts).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ErroAcao, type Usuario } from './dominio.ts';
import type { Estado } from './estado.ts';

export type Pessoa = { id: string; nome: string; papel: string };
export type Ctx = { e: Estado; u: Usuario; d: any; hoje: string; agora: string; pessoas: Pessoa[] };
// Aviso por e-mail. Assunto e parágrafos são chaves de tradução: cada pessoa recebe no próprio idioma.
export type Aviso = { para: string[]; assunto: [string, Record<string, unknown>?]; paragrafos: [string, Record<string, unknown>?][]; abrir: string };
export type Resultado = { resumo: string; criado?: string; avisos?: Aviso[] };

const CATALOGO = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'dados', 'produtos.json'), 'utf8'));
export const PRODUTOS: string[] = CATALOGO.produtos.map((p: any) => p.id);

// Histórico do item: chave de tradução + parâmetros, quem e quando.
export function hist(c: Ctx, alvo: any, k: string, p?: Record<string, unknown>) {
  alvo.hist = alvo.hist || [];
  alvo.hist.push({ k, p: p || {}, por: c.u.nome, papel: c.u.papel, em: c.agora });
}
export const pessoasDe = (c: Ctx, papeis: string[]) => c.pessoas.filter((p) => papeis.includes(p.papel) && p.id !== c.u.id).map((p) => p.id);
export const trecho = (s: string) => (s.length > 300 ? s.slice(0, 297) + '...' : s);
export function lista<T extends string>(v: unknown, opcoes: readonly T[], campo: string, max = 20): T[] {
  const l = Array.isArray(v) ? v : [];
  const r = [...new Set(l.map(String))].slice(0, max);
  for (const x of r) if (!(opcoes as readonly string[]).includes(x)) throw new ErroAcao('erro.escolha', { campo });
  return r as T[];
}
// Menções com @: quem é citado recebe aviso por e-mail.
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function mencoes(pessoas: Pessoa[], eu: string, txt: string, papeis: string[]): string[] {
  return pessoas.filter((p) => p.id !== eu && papeis.includes(p.papel) && new RegExp('@' + escRe(p.nome) + '(?![\\p{L}\\d])', 'iu').test(txt)).map((p) => p.id);
}
export const nomeRotacao = (r: any) => `${r.ini} → ${r.fim}`;
