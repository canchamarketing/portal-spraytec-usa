// Redes sociais, como no Portal Brasil: o Instagram e o Facebook da Spraytec USA dentro do portal, do jeito
// que aparecem na própria rede (perfil, stories, grade de posts, feed da página). Os números de cada post
// abrem num toque; a análise por período fica em Performance → Social.
import { t, num, pct, dataCurta, dataHora } from '../i18n.js';
import { esc, eyebrow, janela, texto } from '../ui.js';
import { S, desenhar } from '../app.js';
import { metricas, metricasProntas } from '../metricas.js';
import { origemFonte } from './painel.js';

let rede = 'ig';
const ICONE_TIPO = { reel: '▶', video: '▶', carrossel: '❏' };

export function render([r]) {
  if (r === 'ig' || r === 'fb') rede = r;
  const M = metricasProntas();
  if (!M) metricas().then(desenhar);
  const corpo = !M ? `<p class="carregando">${esc(t('geral.carregando'))}</p>` : rede === 'ig' ? instagram(M) : facebook(M);
  return `<div class="pagina painel">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.redes'))}</span></h1><p class="explica">${esc(t('redes.explica'))}</p></div>
      ${M ? `<div class="fontes">${origemFonte(M, rede, rede === 'ig' ? 'Instagram' : 'Facebook')}</div>` : ''}</header>
    <div class="filtros-linha"><div class="seg">${['ig', 'fb'].map((x) => `<button type="button" class="${rede === x ? 'ativo' : ''}" data-act="rede" data-r="${x}">${x === 'ig' ? 'Instagram' : 'Facebook'}</button>`).join('')}</div>
      <a class="miudo" href="#/performance/social">${esc(t('redes.ver_numeros'))} →</a></div>
    ${corpo}</div>`;
}

function instagram(M) {
  const R = M.ig, P = R.perfil;
  const posts = [...R.posts].sort((a, b) => (b.ts || b.d).localeCompare(a.ts || a.d));
  const stories = (R.stories || []).map((s) => `<button type="button" class="story" data-act="story" data-id="${esc(s.id)}"><span class="story-anel"><img src="${esc(s.img)}" alt="" referrerpolicy="no-referrer"></span>
    <small>${esc(s.nome || dataHora(s.ts).split(',')[1] || '')}</small></button>`).join('');
  const celula = (x) => `<button type="button" class="ig-cel" data-act="post" data-id="${esc(x.id)}" aria-label="${esc(x.texto.slice(0, 80))}">
    ${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}${ICONE_TIPO[x.tipo] ? `<span class="ig-tipo">${ICONE_TIPO[x.tipo]}</span>` : ''}
    <span class="ig-sobre"><span>♥ ${esc(num(x.curtidas))}</span><span>💬 ${esc(num(x.comentarios))}</span></span></button>`;
  return `<section class="ig-perfil">
      <span class="ig-avatar">${P.foto ? `<img src="${esc(P.foto)}" alt="" referrerpolicy="no-referrer">` : '<span>S</span>'}</span>
      <div class="ig-dados"><div class="ig-nome"><b>${esc(P.nome)}</b>${R === M.ig && !M.fontes.ig?.real ? '' : ''}<a class="btn sm" href="https://instagram.com/${esc(P.nome)}" target="_blank" rel="noopener noreferrer">${esc(t('redes.abrir_ig'))}</a></div>
        <ul class="ig-contas"><li><b>${esc(num(P.publicacoes))}</b> ${esc(t('redes.posts'))}</li><li><b>${esc(num(P.seguidores))}</b> ${esc(t('soc.seguidores'))}</li>${P.seguindo != null ? `<li><b>${esc(num(P.seguindo))}</b> ${esc(t('redes.seguindo'))}</li>` : ''}</ul>
        ${P.titulo ? `<b class="ig-titulo">${esc(P.titulo)}</b>` : ''}${P.bio ? `<p class="ig-bio">${texto(P.bio)}</p>` : ''}</div></section>
    ${stories ? `<section class="stories" aria-label="Stories">${stories}</section>` : ''}
    <div class="ig-grade">${posts.map(celula).join('') || `<p class="vazio">${esc(t('soc.sem_posts'))}</p>`}</div>`;
}

function facebook(M) {
  const R = M.fb, P = R.perfil;
  const posts = [...R.posts].sort((a, b) => (b.ts || b.d).localeCompare(a.ts || a.d)).slice(0, 20);
  const post = (x) => `<article class="fb-post"><header><span class="fb-av">${P.foto ? `<img src="${esc(P.foto)}" alt="" referrerpolicy="no-referrer">` : 'S'}</span>
      <span><b>${esc(P.nome)}</b><small>${esc(dataCurta(x.d))}</small></span></header>
    ${x.texto ? `<p>${texto(x.texto)}</p>` : ''}${x.img ? `<button type="button" class="fb-img" data-act="post" data-id="${esc(x.id)}"><img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer"></button>` : ''}
    <footer><span>👍 ${esc(num(x.curtidas))}</span><span>${esc(t('redes.n_comentarios', { n: num(x.comentarios) }))} · ${esc(t('redes.n_compart', { n: num(x.compart) }))}</span></footer>
    <div class="fb-num"><span>${esc(t('soc.alcance'))}: <b>${esc(num(x.alcance))}</b></span>${x.cliques != null ? `<span>${esc(t('res.cliques'))}: <b>${esc(num(x.cliques))}</b></span>` : ''}
      <button type="button" class="link" data-act="post" data-id="${esc(x.id)}">${esc(t('redes.detalhes'))}</button></div></article>`;
  return `<section class="fb-topo">${P.capa ? `<img class="fb-capa" src="${esc(P.capa)}" alt="" referrerpolicy="no-referrer">` : '<span class="fb-capa"></span>'}
      <div class="fb-id"><span class="fb-av grande">${P.foto ? `<img src="${esc(P.foto)}" alt="" referrerpolicy="no-referrer">` : 'S'}</span>
      <div><b>${esc(P.nome)}</b><small>${esc(t('redes.seguidores_fb', { n: num(P.seguidores) }))}</small>${P.bio ? `<p>${esc(P.bio)}</p>` : ''}</div>
      ${P.link ? `<a class="btn sm" href="${esc(P.link)}" target="_blank" rel="noopener noreferrer">${esc(t('redes.abrir_fb'))}</a>` : ''}</div></section>
    <div class="fb-feed">${posts.map(post).join('') || `<p class="vazio">${esc(t('soc.sem_posts'))}</p>`}</div>`;
}

// Detalhe de um post: imagem grande, legenda e os números (na gaveta à direita).
function detalhe(id) {
  const M = metricasProntas(), R = M[rede], x = R.posts.find((p) => p.id === id);
  if (!x) return;
  const n = (k, v) => (v == null ? '' : `<div class="num"><span class="rotulo">${esc(t(k))}</span><b>${esc(num(v))}</b></div>`);
  janela(rede === 'ig' ? 'Instagram' : 'Facebook', `<div class="post-det">${x.img ? `<img src="${esc(x.img)}" alt="" referrerpolicy="no-referrer">` : ''}
    <p class="data">${esc(dataHora(x.ts || x.d + 'T12:00:00Z'))} · ${esc(t('soc.tipo.' + x.tipo))}</p><p>${texto(x.texto)}</p>
    <div class="nums">${n('soc.alcance', x.alcance)}${n('redes.visualizacoes', x.views)}${n('soc.curtidas', x.curtidas)}${n('soc.comentarios', x.comentarios)}${n('redes.compartilhamentos', x.compart)}${n('soc.salvos', x.salvos)}${n('res.cliques', x.cliques)}</div>
    <p class="miudo">${esc(t('soc.engajamento'))}: <b>${esc(pct(x.alcance ? x.interacoes / x.alcance : null))}</b></p>
    ${x.link ? `<p><a class="btn" href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">${esc(t(rede === 'ig' ? 'redes.abrir_ig' : 'redes.abrir_fb'))}</a></p>` : ''}</div>`, { sobre: t('redes.post') });
}

export const cliques = {
  rede: (el) => { rede = el.dataset.r; history.replaceState(null, '', '#/redes/' + rede); desenhar(); },
  post: (el) => detalhe(el.dataset.id),
  story: (el) => {
    const s = metricasProntas().ig.stories.find((x) => x.id === el.dataset.id);
    janela('Story', `<div class="post-det story-det"><img src="${esc(s.img)}" alt="" referrerpolicy="no-referrer"><div class="nums">${s.alcance != null ? `<div class="num"><span class="rotulo">${esc(t('soc.alcance'))}</span><b>${esc(num(s.alcance))}</b></div>` : ''}
      ${s.views != null ? `<div class="num"><span class="rotulo">${esc(t('redes.visualizacoes'))}</span><b>${esc(num(s.views))}</b></div>` : ''}</div><p class="dica">${esc(t('redes.story_dica'))}</p></div>`, { sobre: 'Instagram' });
  },
};
