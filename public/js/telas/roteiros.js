// Roteiros de vídeo: quadro por etapa (como o kanban de vídeos do Brasil), da ideia ao vídeo entregue.
import { t, data } from '../i18n.js';
import { esc, eyebrow } from '../ui.js';
import { S, souCancha } from '../app.js';
import { formItem, statusItem, cliquesItem, formulariosItem, mudancasItem } from './item.js';
import { nomeProduto } from './comum.js';

// Colunas do quadro. A produtora só vê as que são dela.
const COLUNAS = [
  ['rascunho', ['rascunho'], ['cancha']],
  ['aprovacao', ['aprovacao', 'ajuste', 'ajustando'], ['cancha', 'aprovador', 'leitor']],
  ['aprovado', ['aprovado'], ['cancha', 'aprovador', 'leitor']],
  ['producao', ['producao', 'ajuste_corte'], ['cancha', 'aprovador', 'leitor', 'produtora']],
  ['corte', ['corte'], ['cancha', 'aprovador', 'leitor', 'produtora']],
  ['entregue', ['entregue'], ['cancha', 'aprovador', 'leitor', 'produtora']],
];

export function render() {
  const R = S.dados.roteiros;
  const cartao = (x) => `<a class="cartao" href="#/roteiro/${esc(x.id)}"><span class="t">${esc(x.titulo)}</span>
    <span class="meta">${statusItem(x)}${x.duracao ? `<span>${esc(t('item.segundos', { n: x.duracao }))}</span>` : ''}${x.formato ? `<span>${esc(t('item.formato.' + x.formato))}</span>` : ''}</span>
    ${x.produtos?.length ? `<span class="meta">${x.produtos.map((p) => esc(nomeProduto(p))).join(' · ')}</span>` : ''}
    ${x.prazo ? `<span class="meta">${esc(t('video.prazo'))}: <span class="data${x.prazo < S.hoje && x.status !== 'entregue' ? ' prazo-vencido' : ''}">${esc(data(x.prazo))}</span></span>` : ''}</a>`;
  const cols = COLUNAS.filter(([, , p]) => p.includes(S.eu.papel)).map(([id, sts]) => {
    const L = R.filter((x) => sts.includes(x.status));
    return `<section class="quadro-col"><h3>${esc(t('rv.col.' + id))} <span class="n">${L.length}</span></h3><p class="dica">${esc(t('rv.col.' + id + '.dica'))}</p>
      ${L.map(cartao).join('') || `<p class="vazio miudo">—</p>`}</section>`;
  }).join('');
  return `<div class="pagina">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.roteiros'))}</span></h1>
    <p class="explica">${esc(t(S.eu.papel === 'produtora' ? 'rv.explica_produtora' : 'rv.explica'))}</p></div>
    ${souCancha() ? `<button class="btn forte" data-act="novo">${esc(t('item.novo.roteiros'))}</button>` : ''}</header>
    <div class="quadro">${cols}</div></div>`;
}
export const cliques = { ...cliquesItem, novo: () => formItem('roteiros', null) };
export const formularios = formulariosItem;
export const mudancas = mudancasItem;
