// Site e landing pages: landing pages (aprovação + checklist de publicação) e pedidos de ajuste no site.
import { t, data, dataHora } from '../i18n.js';
import { esc, eyebrow, janela, conteudo, comentarios, historico } from '../ui.js';
import { S, acao, souCancha, souAprovador, desenhar, ir } from '../app.js';
import { formItem, statusItem, cliquesItem, formulariosItem, mudancasItem, CHECKLIST } from './item.js';

const ST = ['aberto', 'fazendo', 'feito'];
export function render([id]) {
  if (id) return pedido(id);
  const P = S.dados.paginas, D = [...S.dados.pedidos].sort((a, b) => ST.indexOf(a.status) - ST.indexOf(b.status) || b.em.localeCompare(a.em));
  const lp = (x) => {
    const ck = CHECKLIST.paginas.filter((k) => x.checklist?.[k]).length;
    return `<tr class="clica" data-act="abrir-lp" data-id="${esc(x.id)}"><td><div class="item-linha"><span class="miniatura" style="--k:#B85A24">LP</span>
      <span><span class="item-t">${esc(x.titulo)}</span><br><span class="item-sub">${esc(x.url || '')}</span></span></div></td>
      <td class="data">${esc(data(x.publicacao))}</td><td class="some-celular"><span class="miudo">${ck}/${CHECKLIST.paginas.length}</span></td><td>${statusItem(x)}</td></tr>`;
  };
  const ped = (x) => `<tr class="clica" data-act="abrir-pedido" data-id="${esc(x.id)}"><td><span class="item-t">${esc(x.titulo)}</span><br><span class="item-sub">${esc(x.por)} · ${esc(dataHora(x.em))}</span></td>
    <td class="data">${x.prazo ? `<span class="${x.prazo < S.hoje && x.status !== 'feito' ? 'prazo-vencido' : ''}">${esc(data(x.prazo))}</span>` : '—'}</td>
    <td><span class="pill xs-${esc(x.status)}"><i></i>${esc(t('pedido.st.' + x.status))}</span></td></tr>`;
  return `<div class="pagina">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.site'))}</span></h1><p class="explica">${esc(t('site.explica'))}</p></div></header>
    <section><div class="cab"><h2>${esc(t('site.lps'))}</h2>${souCancha() ? `<button class="btn" data-act="nova-lp">${esc(t('item.novo.paginas'))}</button>` : ''}</div>
      <div class="tabela-rolar"><table class="tabela"><thead><tr><th>${esc(t('site.col.pagina'))}</th><th>${esc(t('campo.publicacao'))}</th><th class="some-celular">${esc(t('em.col.checklist'))}</th><th>${esc(t('em.col.status'))}</th></tr></thead>
      <tbody>${P.map(lp).join('') || `<tr><td colspan="4" class="vazio">${esc(t('site.nenhuma_lp'))}</td></tr>`}</tbody></table></div></section>
    <section><div class="cab"><div><h2>${esc(t('site.pedidos'))}</h2><p class="dica">${esc(t('site.pedidos_dica'))}</p></div>
      ${souCancha() || souAprovador() ? `<button class="btn" data-act="novo-pedido">${esc(t('site.novo_pedido'))}</button>` : ''}</div>
      <div class="tabela-rolar"><table class="tabela"><thead><tr><th>${esc(t('site.col.pedido'))}</th><th>${esc(t('campo.prazo'))}</th><th>${esc(t('em.col.status'))}</th></tr></thead>
      <tbody>${D.map(ped).join('') || `<tr><td colspan="3" class="vazio">${esc(t('site.nenhum_pedido'))}</td></tr>`}</tbody></table></div></section>
  </div>`;
}

function pedido(id) {
  const x = S.dados.pedidos.find((p) => p.id === id);
  if (!x) return `<div class="pagina"><p class="erro-tela">${esc(t('erro.nao_encontrado'))}</p></div>`;
  return `<div class="pagina"><nav class="trilha"><a href="#/site">← ${esc(t('nav.site'))}</a></nav>
    <p class="eyebrow">${esc(t('site.pedido'))}</p><header class="cab"><div><h1><span class="marca-texto">${esc(x.titulo)}</span>
    <span class="pill xs-${esc(x.status)}"><i></i>${esc(t('pedido.st.' + x.status))}</span></h1></div></header>
    <section class="bloco"><dl class="ex"><div class="ex-linha"><dt>${esc(t('campo.descricao'))}</dt><dd>${conteudo(x, 'descricao')}</dd></div>
      ${x.url ? `<div class="ex-linha"><dt>${esc(t('campo.pagina'))}</dt><dd><a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">${esc(x.url)}</a></dd></div>` : ''}
      <div class="ex-linha"><dt>${esc(t('site.pedido_por'))}</dt><dd>${esc(x.por)} · ${esc(dataHora(x.em))}</dd></div>
      ${x.prazo ? `<div class="ex-linha"><dt>${esc(t('campo.prazo'))}</dt><dd class="data">${esc(data(x.prazo))}</dd></div>` : ''}</dl>
    ${souCancha() ? `<div class="filtros-linha">${ST.map((s) => `<button class="chip ${x.status === s ? 'ativo' : ''}" data-act="pedido-status" data-id="${esc(x.id)}" data-s="${s}">${esc(t('pedido.st.' + s))}</button>`).join('')}</div>` : ''}
    ${souCancha() || x.porId === S.eu.id ? `<button class="btn leve" data-act="editar-pedido" data-id="${esc(x.id)}">${esc(t('geral.editar'))}</button>` : ''}</section>
    ${comentarios(x.comentarios, { ref: 'd:' + x.id, podeComentar: souCancha() || souAprovador(), souCancha: souCancha(), mencionaveis: S.mencionaveis })}
    <section class="bloco"><details><summary><h3 class="inline">${esc(t('hist.titulo'))}</h3></summary>${historico(x.hist)}</details></section></div>`;
}

const formPedido = (x) => janela(x ? t('geral.editar') : t('site.novo_pedido'), `<form class="form" data-form="pedido" data-id="${esc(x?.id || '')}">
  <label class="rotulo" for="pd-t">${esc(t('campo.titulo_pedido'))} *</label><input id="pd-t" name="titulo" value="${esc(x?.titulo || '')}" maxlength="150" required>
  <label class="rotulo" for="pd-d">${esc(t('campo.descricao'))} *</label><textarea id="pd-d" name="descricao" rows="5" maxlength="3000" required>${esc(x?.descricao || '')}</textarea>
  <label class="rotulo" for="pd-u">${esc(t('campo.pagina'))}</label><input id="pd-u" name="url" type="url" value="${esc(x?.url || '')}" placeholder="https://spraytecusa.com/…">
  <label class="rotulo" for="pd-p">${esc(t('campo.prazo'))}</label><input id="pd-p" name="prazo" type="date" value="${esc(x?.prazo || '')}">
  <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('geral.salvar'))}</button></div></form>`, { sobre: t('site.pedido') });

export const cliques = {
  ...cliquesItem,
  'nova-lp': () => formItem('paginas', null),
  'abrir-lp': (el) => { location.hash = '#/lp/' + el.dataset.id; },
  'abrir-pedido': (el) => { location.hash = '#/site/' + el.dataset.id; },
  'novo-pedido': () => formPedido(null),
  'editar-pedido': (el) => formPedido(S.dados.pedidos.find((p) => p.id === el.dataset.id)),
  'pedido-status': (el) => acao('pedido-status', { id: el.dataset.id, status: el.dataset.s }, { ok: t('geral.salvo') }),
};
export const formularios = {
  ...formulariosItem,
  pedido: async (f) => {
    const fd = new FormData(f);
    const r = await acao('pedido-salvar', { id: f.dataset.id || undefined, titulo: fd.get('titulo'), descricao: fd.get('descricao'), url: fd.get('url'), prazo: fd.get('prazo') }, { ok: t('geral.salvo') });
    if (r?.criado) ir('site/' + r.criado);
  },
};
export const mudancas = mudancasItem;
export { desenhar };
