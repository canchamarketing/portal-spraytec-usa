// Traduções do lado do servidor (mensagens de erro, e-mails). Usa os mesmos arquivos da tela
// (public/i18n/*.json): nenhum texto fica fixo no código.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { IDIOMAS, type Idioma, idiomaValido } from './dominio.ts';

const DIR = join(import.meta.dirname, '..', 'public', 'i18n');
const DIC: Record<string, Record<string, string>> = {};
for (const l of IDIOMAS) DIC[l] = JSON.parse(readFileSync(join(DIR, l + '.json'), 'utf8'));

// Parâmetros que são chaves (ex.: { campo: 'campo.titulo' }) também são traduzidos.
export function tr(idioma: Idioma | string, chave: string, params?: Record<string, unknown>): string {
  const d = DIC[idiomaValido(idioma) || 'en-US'];
  const base = d[chave] ?? DIC['en-US'][chave] ?? chave;
  if (!params) return base;
  return base.replace(/\{(\w+)\}/g, (_, k) => {
    const v = params[k];
    if (v == null) return '';
    const s = String(v);
    return /^[a-z_]+\.[\w.]+$/.test(s) && (d[s] ?? DIC['en-US'][s]) ? tr(idioma, s) : s;
  });
}

// Idioma de quem ainda não entrou (tela de login, criar senha): o que a tela manda no cabeçalho.
export function idiomaDoPedido(h: Record<string, unknown>): Idioma {
  const x = idiomaValido(h['x-idioma']);
  if (x) return x;
  return String(h['accept-language'] || '').toLowerCase().startsWith('pt') ? 'pt-BR' : 'en-US';
}
