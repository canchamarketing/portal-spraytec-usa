// Produtos Fulltec (catálogo do site e do Product Guide 2025-26), no idioma de quem lê.
import { t, idioma } from '../i18n.js';
import { esc } from '../ui.js';
import { S } from '../app.js';

let filtro = '', busca = '';
const janelaTxt = (j) => (['all', 'aerial', 'plantio', 'veg', 'rep', 'preplant'].includes(j) ? t('janela.' + j) : j);

export function render([id]) {
  const C = S.catalogo;
  const desc = (p) => (idioma() === 'pt-BR' ? p.pt : p.en);
  const L = C.produtos.filter((p) => (!filtro || p.cat === filtro) && (!busca || (p.nome + ' ' + desc(p)).toLowerCase().includes(busca.toLowerCase())));
  const card = (p) => `<article class="produto${p.id === id ? ' destaque' : ''}" id="p-${esc(p.id)}">
    <header><h3>${esc(p.nome)}</h3>${p.novo ? `<span class="selo novo">${esc(t('produtos.novo'))}</span>` : ''}</header>
    <p class="cat">${esc(t('cat.' + p.cat))}</p><p>${esc(desc(p))}</p>
    <dl><div><dt>${esc(t('produtos.dose'))}</dt><dd>${esc(p.dose)}</dd></div><div><dt>${esc(t('produtos.quando'))}</dt><dd>${esc(janelaTxt(p.janela))}</dd></div></dl></article>`;
  return `<div class="pagina">
    <header class="cab"><div><h1>${esc(t('nav.produtos'))}</h1><p class="explica">${esc(t('produtos.explica', { n: C.produtos.length }))}</p></div></header>
    <div class="filtros"><div class="chips-filtro" role="group" aria-label="${esc(t('produtos.categoria'))}">
      <button type="button" class="chip ${!filtro ? 'ativo' : ''}" data-act="cat" data-c="">${esc(t('produtos.todos'))} (${C.produtos.length})</button>
      ${C.categorias.map((c) => `<button type="button" class="chip ${filtro === c ? 'ativo' : ''}" data-act="cat" data-c="${c}">${esc(t('cat.' + c))} (${C.produtos.filter((p) => p.cat === c).length})</button>`).join('')}</div>
      <input type="search" class="busca" placeholder="${esc(t('produtos.buscar'))}" value="${esc(busca)}" data-mudou="busca" aria-label="${esc(t('produtos.buscar'))}"></div>
    <div class="grade-produtos">${L.map(card).join('') || `<p class="vazio">${esc(t('produtos.nada'))}</p>`}</div>
    <p class="dica">${esc(t('produtos.fonte'))}</p>
  </div>`;
}
export function depois(_el, [id]) {
  if (id) document.getElementById('p-' + id)?.scrollIntoView({ block: 'center' });
  const b = document.querySelector('.busca');
  b?.addEventListener('input', () => { busca = b.value; const pos = b.selectionStart; import('../app.js').then((m) => { m.desenhar(); const n = document.querySelector('.busca'); n.focus(); n.setSelectionRange(pos, pos); }); });
}
export const cliques = {
  cat: (el) => { filtro = el.dataset.c; import('../app.js').then((m) => m.desenhar()); },
};
