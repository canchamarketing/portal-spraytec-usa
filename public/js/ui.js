// Peças de tela usadas em vários lugares.
import { t, traduzido, dataHora, diaSemana, diaMes } from './i18n.js';
import { S } from './app.js';

// Linha pequena acima do título, como no portal do Brasil: SPRAYTEC USA · QUA, 11/11
export const eyebrow = () => esc(`Spraytec USA · ${S.hoje ? diaSemana(S.hoje).replace('.', '') + ', ' + diaMes(S.hoje) : ''}`);

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// Texto com quebras de linha e links clicáveis.
export const texto = (s) => esc(s).replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>').replace(/\n/g, '<br>');

export function toast(msg, tipo = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + tipo;
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add('sai'), 3200);
  setTimeout(() => el.remove(), 3800);
}

export const selo = (classe, txt, titulo = '') => `<span class="selo ${classe}"${titulo ? ` title="${esc(titulo)}"` : ''}>${esc(txt)}</span>`;
export const exemplo = (dica = t('exemplo.dica')) => selo('exemplo', t('exemplo.selo'), dica);

// Explicação curta que abre ao tocar no "?" (funciona no celular, onde não há "passar o mouse").
export const ajuda = (chave) => `<details class="ajuda"><summary aria-label="${esc(t('geral.o_que_e'))}">?</summary><span>${esc(t(chave))}</span></details>`;

// Texto escrito por alguém, no idioma de quem lê (com "ver original").
export function conteudo(item, campo) {
  const r = traduzido(item, campo);
  if (!r.traduzido) return texto(r.texto);
  return `<span class="trad">${texto(r.texto)}</span> <details class="original"><summary>${esc(t('traducao.ver_original'))}</summary><span lang="${esc(item.idioma)}">${texto(r.original)}</span></details>`;
}

// Janela por cima da tela (formulários). Devolve o elemento; fecha com Esc, no X ou clicando fora.
export function janela(titulo, corpo, { larga = false, sobre = '' } = {}) {
  fecharJanela();
  const el = document.createElement('div');
  el.className = 'janela-fundo';
  el.innerHTML = `<div class="janela${larga ? ' larga' : ''}" role="dialog" aria-modal="true" aria-labelledby="janela-titulo">
    <header><div>${sobre ? `<p class="eyebrow">${esc(sobre)}</p>` : ''}<h2 id="janela-titulo">${esc(titulo)}</h2></div><button type="button" class="x" data-fechar>${esc(t('geral.fechar'))}</button></header>
    <div class="janela-corpo">${corpo}</div></div>`;
  el.addEventListener('click', (ev) => { if (ev.target === el || ev.target.closest('[data-fechar]')) fecharJanela(); });
  document.body.appendChild(el);
  document.body.classList.add('com-janela');
  const f = el.querySelector('input:not([type=hidden]),textarea,select');
  if (f) setTimeout(() => f.focus(), 30);
  return el;
}
export function fecharJanela() {
  document.querySelectorAll('.janela-fundo').forEach((x) => x.remove());
  document.body.classList.remove('com-janela');
}
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fecharJanela(); });

// Confirmação simples antes de algo que não tem volta.
export function confirmar(msg, botao, fn, perigo = false) {
  const el = janela(t('geral.confirmar'), `<p>${esc(msg)}</p><div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button>
    <button type="button" class="btn ${perigo ? 'perigo' : 'forte'}" data-ok>${esc(botao)}</button></div>`);
  el.querySelector('[data-ok]').addEventListener('click', () => { fecharJanela(); fn(); });
}

// Linha do tempo do item (histórico). Cada registro é uma chave de tradução + parâmetros.
export function historico(lista) {
  if (!lista?.length) return '';
  return `<ol class="hist">${[...lista].reverse().map((h) => `<li><span class="quando">${esc(dataHora(h.em))}</span>
    <span>${esc(t(h.k, h.p))}</span> <span class="quem">${esc(t('hist.por', { nome: h.por }))}</span></li>`).join('')}</ol>`;
}

// Comentários (com marca de interno, de pedido de ajuste e tradução).
export function comentarios(lista, { ref, podeComentar, souCancha, mencionaveis = [] }) {
  const L = (lista || []).map((c) => `<li class="coment${c.interno ? ' interno' : ''}${c.ajuste ? ' ajuste' : ''}">
    <div class="coment-topo"><b>${esc(c.por)}</b> <span class="quem">${esc(t('papel.' + c.papel))}</span> <span class="quando">${esc(dataHora(c.em))}</span>
    ${c.interno ? selo('interno', t('coment.interno')) : ''}${c.ajuste ? selo('ajuste', t('coment.pedido_ajuste')) : ''}</div>
    <div class="coment-texto">${conteudo(c)}</div></li>`).join('');
  const form = podeComentar ? `<form class="coment-form" data-comentar="${esc(ref)}">
    <label class="rotulo" for="c-${esc(ref)}">${esc(t('coment.escrever'))}</label>
    <textarea id="c-${esc(ref)}" name="texto" rows="3" maxlength="3000" required placeholder="${esc(t('coment.placeholder'))}"></textarea>
    ${mencionaveis.length ? `<p class="dica">${esc(t('coment.mencionar'))} ${mencionaveis.map((p) => `<button type="button" class="link" data-mencionar="${esc(p.nome)}">@${esc(p.nome)}</button>`).join(' ')}</p>` : ''}
    <div class="linha">${souCancha ? `<label class="check"><input type="checkbox" name="interno"> ${esc(t('coment.so_cancha'))}</label>` : '<span></span>'}
    <button class="btn forte" type="submit">${esc(t('coment.enviar'))}</button></div></form>` : '';
  return `<section class="bloco"><h3>${esc(t('coment.titulo'))}</h3>${L ? `<ul class="coments">${L}</ul>` : `<p class="vazio">${esc(t('coment.nenhum'))}</p>`}${form}</section>`;
}
