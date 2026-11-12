// Aba "Social" da Performance: números do Instagram e do Facebook (seguidores, alcance, interações, posts).
// A Cancha não faz social media para a Spraytec USA: a tela só mostra o que acontece nas redes.
import { t, num, pct, dataCurta } from '../i18n.js';
import { esc, eyebrow, ajuda } from '../ui.js';
import { S, desenhar } from '../app.js';
import { metricas, metricasProntas, periodo, anterior } from '../metricas.js';
import { linhas, mini, COR } from '../graficos.js';
import { filtroPeriodo, variacao, origemFonte } from './painel.js';

let rede = 'ig', ordem = 'recentes';

export function social(M) {
  const R = M[rede], P = periodo(S.filtro.preset), A = anterior(P);
  const segEm = (d) => { const L = R.seguidores.filter((x) => x.d <= d); return L.length ? L.at(-1).v : null; };
  const novos = (p) => { const a = segEm(p.ate), b = segEm(p.de); return a != null && b != null ? a - b : null; };
  const posts = (p) => R.posts.filter((x) => x.d >= p.de && x.d <= p.ate);
  const soma = (L, k) => L.reduce((a, x) => a + (x[k] || 0), 0);
  const pa = posts(P), pb = posts(A);
  const alc = soma(pa, 'alcance'), alcB = soma(pb, 'alcance'), int = soma(pa, 'interacoes'), intB = soma(pb, 'interacoes');
  const eng = alc ? int / alc : null, engB = alcB ? intB / alcB : null;
  const serieSeg = R.seguidores.filter((x) => x.d >= P.de && x.d <= P.ate);
  const nome = rede === 'ig' ? '@' + R.perfil.nome : R.perfil.nome;

  const kpi = (k, v, vb, fmt, extra = '') => `<div class="kpi kpi-g"><span class="l">${esc(t('soc.' + k))} ${ajuda('soc.' + k + '.ajuda')}</span><span class="v">${esc(fmt(v))}</span>${variacao(v, vb)}${extra}</div>`;
  const ordenados = [...pa].sort(ordem === 'recentes' ? (a, b) => b.d.localeCompare(a.d) : (a, b) => b.interacoes - a.interacoes);
  const melhor = [...pa].sort((a, b) => b.interacoes - a.interacoes)[0];
  const post = (x) => {
    const inner = `<span class="post-img">${x.img ? `<img src="${esc(x.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}<span class="post-tipo">${esc(t('soc.tipo.' + x.tipo))}</span></span>
      <span class="post-info"><span class="data">${esc(dataCurta(x.d))}</span><span class="post-txt">${esc(x.texto)}</span>
      <span class="post-nums"><span title="${esc(t('soc.alcance'))}">👁 ${esc(num(x.alcance))}</span><span title="${esc(t('soc.curtidas'))}">♥ ${esc(num(x.curtidas))}</span>
      <span title="${esc(t('soc.comentarios'))}">💬 ${esc(num(x.comentarios))}</span>${x.salvos != null ? `<span title="${esc(t('soc.salvos'))}">🔖 ${esc(num(x.salvos))}</span>` : ''}</span></span>`;
    return x.link ? `<a class="post" href="${esc(x.link)}" target="_blank" rel="noopener noreferrer">${inner}</a>` : `<div class="post">${inner}</div>`;
  };

  return `<div class="filtros-linha"><div class="seg">${['ig', 'fb'].map((r) => `<button type="button" class="${rede === r ? 'ativo' : ''}" data-act="rede" data-r="${r}">${r === 'ig' ? 'Instagram' : 'Facebook'}</button>`).join('')}</div>
      <span class="sep-v"></span><div class="fontes">${origemFonte(M, rede, rede === 'ig' ? 'Instagram' : 'Facebook')}</div></div>
    <section class="perfil-rede"><span class="avatar">${R.perfil.foto ? `<img src="${esc(R.perfil.foto)}" alt="" referrerpolicy="no-referrer">` : 'S'}</span>
      <div><b>${esc(nome)}</b><span class="miudo">${esc(rede === 'ig' ? 'Instagram' : 'Facebook')}</span></div>
      <div class="perfil-num"><span class="v">${esc(num(R.perfil.seguidores))}</span><span class="l">${esc(t('soc.seguidores'))}</span></div>
      ${R.perfil.publicacoes ? `<div class="perfil-num"><span class="v">${esc(num(R.perfil.publicacoes))}</span><span class="l">${esc(t('soc.publicacoes'))}</span></div>` : ''}</section>
    <div class="kpis kpis-4">
      ${kpi('novos', novos(P), novos(A), (v) => (v == null ? '—' : (v > 0 ? '+' : '') + num(v)), mini(serieSeg, COR[rede]))}
      ${kpi('alcance', alc, alcB, num)}${kpi('interacoes', int, intB, num)}${kpi('engajamento', eng, engB, pct)}</div>
    <div class="dois-paineis">
      <section class="bloco"><h2>${esc(t('soc.g_seguidores'))}</h2>${linhas({ series: [{ nome: t('soc.seguidores'), cor: COR[rede], pontos: serieSeg }], fmt: (v) => num(v), titulo: t('soc.g_seguidores'), area: false, meia: true, zero: false })}</section>
      <section class="bloco"><h2>${esc(t('soc.melhor'))}</h2>${melhor ? `<div class="post-destaque">${post(melhor)}<p class="dica">${esc(t('soc.melhor_dica', { n: num(melhor.interacoes), p: pct(melhor.alcance ? melhor.interacoes / melhor.alcance : null) }))}</p></div>` : `<p class="vazio">${esc(t('soc.sem_posts'))}</p>`}</section>
    </div>
    <section class="bloco"><div class="cab"><h2>${esc(t('soc.posts', { n: pa.length }))}</h2>
      <div class="seg">${['recentes', 'melhores'].map((o) => `<button type="button" class="${ordem === o ? 'ativo' : ''}" data-act="ordem" data-o="${o}">${esc(t('soc.ordem.' + o))}</button>`).join('')}</div></div>
      ${ordenados.length ? `<div class="grade-posts">${ordenados.map(post).join('')}</div>` : `<p class="vazio">${esc(t('soc.sem_posts'))}</p>`}
      <p class="dica">${esc(t('soc.rodape'))}</p></section>`;
}
export const cliquesSocial = {
  rede: (el) => { rede = el.dataset.r; desenhar(); },
  ordem: (el) => { ordem = el.dataset.o; desenhar(); },
};
