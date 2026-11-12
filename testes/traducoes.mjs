// Confere se as traduções estão completas: toda chave usada no código existe nos dois idiomas,
// e os dois arquivos têm as mesmas chaves. Uso: node testes/traducoes.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const pt = JSON.parse(readFileSync('public/i18n/pt-BR.json', 'utf8'));
const en = JSON.parse(readFileSync('public/i18n/en-US.json', 'utf8'));
const arqs = [];
const anda = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) anda(p); else if (/\.(js|ts)$/.test(f)) arqs.push(p); } };
anda('public/js'); anda('server');
const usadas = new Set();
for (const a of arqs) {
  const s = readFileSync(a, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'([a-z_]+\.[\w.]+)'/g)) usadas.add(m[1]);
  for (const m of s.matchAll(/\btn\(\s*'([a-z_]+\.[\w.]+)'/g)) { usadas.add(m[1] + '.um'); usadas.add(m[1] + '.varios'); }
  for (const m of s.matchAll(/'((?:erro|hist|aviso|campo|login|email)\.[\w.]+)'/g)) usadas.add(m[1]);
}
// Famílias montadas no código (chave + variável).
const fam = {
  nav: ['inicio', 'rotacoes', 'safra', 'produtos', 'resultados', 'feedbacks', 'planejamento', 'roteiros', 'emails', 'site', 'seo', 'pessoas', 'historico', 'conta'],
  papel: ['cancha', 'aprovador', 'leitor', 'produtora', 'cancha.explica', 'aprovador.explica', 'leitor.explica', 'produtora.explica'],
  st_anuncio: ['rascunho', 'aprovacao', 'ajuste', 'ajustando', 'aprovado', 'continua', 'no_ar', 'encerrado'],
  st_rotacao: ['montando', 'aprovacao', 'aprovada', 'no_ar', 'encerrada'],
  semaforo: ['bem', 'atencao', 'cansado'], canal: ['meta', 'google'],
  local: ['feed', 'stories', 'reels', 'pesquisa', 'youtube', 'display', 'pmax'],
  formato: ['imagem', 'video', 'carrossel', 'texto'],
  objetivo: ['contatos', 'lembrar', 'marca', 'protecao', 'concorrentes'].flatMap((o) => [o, o + '.explica']),
  passo: ['montar', 'aprovar', 'no_ar', 'resultado'].flatMap((p) => [p, p + '.dica']),
  'rot.frase': ['montando', 'aprovacao', 'ajustes', 'aprovada', 'no_ar', 'encerrada'].flatMap((s) => [s + '.cancha', s + '.cliente']),
  evento: ['fase', 'feira', 'foco', 'campanha', 'recesso'].flatMap((e) => [e, e + '.plural']),
  cat: ['adjuvante', 'semente', 'fitoestimulante', 'forrageira', 'solo'],
  janela: ['all', 'aerial', 'plantio', 'veg', 'rep', 'preplant'],
  res: ['investimento', 'impressoes', 'cliques', 'ctr', 'contatos', 'cpl'].flatMap((k) => [k, k + '.ajuda']),
  embreve: ['resultados', 'feedbacks', 'planejamento', 'roteiros', 'emails', 'site', 'seo'],
};
for (const [p, L] of Object.entries(fam)) for (const k of L) usadas.add(p + '.' + k);
for (const k of ['rot.prazo.ajuda', 'anuncio.publico.ajuda', 'anuncio.link.ajuda']) usadas.add(k);
let falhas = 0;
for (const k of usadas) for (const [nome, d] of [['pt-BR', pt], ['en-US', en]]) if (d[k] == null) { falhas++; console.log(`FALTA em ${nome}: ${k}`); }
for (const k of Object.keys(pt)) if (en[k] == null) { falhas++; console.log('só em pt-BR:', k); }
for (const k of Object.keys(en)) if (pt[k] == null) { falhas++; console.log('só em en-US:', k); }
// Os mesmos {parâmetros} nos dois idiomas.
for (const k of Object.keys(pt)) {
  const a = (pt[k].match(/\{\w+\}/g) || []).sort().join(), b = (en[k]?.match(/\{\w+\}/g) || []).sort().join();
  if (en[k] != null && a !== b) { falhas++; console.log(`parâmetros diferentes em ${k}: pt ${a} / en ${b}`); }
}
console.log(falhas ? `${falhas} problema(s)` : `ok: ${usadas.size} chaves usadas, ${Object.keys(pt).length} em cada idioma`);
process.exit(falhas ? 1 : 0);
