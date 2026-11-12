// Feedbacks: o que a Spraytec acha dos anúncios, campanhas e contatos, com a resposta da Cancha.
import { t, dataHora, num } from '../i18n.js';
import { esc, eyebrow, janela, conteudo, comentarios, historico } from '../ui.js';
import { S, acao, souCancha, souAprovador, desenhar, ir } from '../app.js';

const TIPOS = ['elogio', 'problema', 'ideia', 'leads'];
const QUALIDADE = ['bons', 'mistos', 'ruins', 'nao_agricultor', 'ja_cliente', 'virou_venda'];
const ST = ['aberto', 'respondido', 'resolvido'];
const ICONE = { elogio: '👍', problema: '⚠️', ideia: '💡', leads: '👥' };
let filtro = 'todos';
// Para que o link "sobre o quê" abra no lugar certo.
const LINK = { r: 'rotacao', a: 'anuncio', p: 'planejamento', v: 'roteiro', e: 'email', l: 'lp', d: 'site' };

export function render([id]) {
  if (id) return detalhe(id);
  const F = [...S.dados.feedbacks].sort((a, b) => b.em.localeCompare(a.em));
  const L = F.filter((f) => filtro === 'todos' || f.status === filtro);
  const cartao = (f) => `<button type="button" class="cartao fb" data-act="abrir" data-id="${esc(f.id)}">
    <span class="meta"><span>${ICONE[f.tipo]} <b>${esc(t('fb.tipo.' + f.tipo))}</b></span><span class="pill xs-${esc(f.status)}"><i></i>${esc(t('fb.st.' + f.status))}</span>
    <span>${esc(f.por)} · <span class="data">${esc(dataHora(f.em))}</span></span></span>
    <span class="t">${conteudo(f)}</span>
    ${f.leads ? `<span class="meta">${esc(t('fb.qualidade.' + f.leads.qualidade))}${f.leads.quantidade != null ? ' · ' + esc(t('fb.n_contatos', { n: num(f.leads.quantidade) })) : ''}${f.leads.periodo ? ' · ' + esc(f.leads.periodo) : ''}</span>` : ''}
    ${f.sobre ? `<span class="meta">${esc(t('fb.sobre'))}: ${esc(f.sobre.titulo)}</span>` : ''}
    <span class="meta">💬 ${(f.comentarios || []).length}</span></button>`;
  const chip = (k) => `<button type="button" class="chip ${filtro === k ? 'ativo' : ''}" data-act="filtro" data-f="${k}">${esc(k === 'todos' ? t('em.filtro.todos') : t('fb.st.' + k))} · ${F.filter((f) => k === 'todos' || f.status === k).length}</button>`;
  return `<div class="pagina">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.feedbacks'))}</span></h1><p class="explica">${esc(t('fb.explica'))}</p></div>
    ${souCancha() || souAprovador() ? `<button class="btn forte" data-act="novo">${esc(t('fb.novo'))}</button>` : ''}</header>
    <div class="filtros-linha">${['todos', ...ST].map(chip).join('')}</div>
    <div class="lista-fb">${L.map(cartao).join('') || `<p class="vazio">${esc(t('fb.nenhum'))}</p>`}</div></div>`;
}

function detalhe(id) {
  const f = S.dados.feedbacks.find((x) => x.id === id);
  if (!f) return `<div class="pagina"><p class="erro-tela">${esc(t('erro.nao_encontrado'))}</p></div>`;
  const sobre = f.sobre ? `<a href="#/${LINK[f.sobre.ref[0]]}/${esc(f.sobre.ref.slice(2))}">${esc(f.sobre.titulo)}</a>` : '';
  return `<div class="pagina"><nav class="trilha"><a href="#/feedbacks">← ${esc(t('nav.feedbacks'))}</a></nav>
    <p class="eyebrow">${ICONE[f.tipo]} ${esc(t('fb.tipo.' + f.tipo))}</p>
    <header class="cab"><div><h1><span class="marca-texto">${esc(t('fb.de', { nome: f.por }))}</span> <span class="pill xs-${esc(f.status)}"><i></i>${esc(t('fb.st.' + f.status))}</span></h1>
    <p class="explica data">${esc(dataHora(f.em))}</p></div></header>
    <section class="bloco"><p class="fb-texto">${conteudo(f)}</p>
      ${f.leads ? `<dl class="ex"><div class="ex-linha"><dt>${esc(t('fb.qualidade'))}</dt><dd>${esc(t('fb.qualidade.' + f.leads.qualidade))}</dd></div>
        ${f.leads.quantidade != null ? `<div class="ex-linha"><dt>${esc(t('fb.quantidade'))}</dt><dd>${esc(num(f.leads.quantidade))}</dd></div>` : ''}
        ${f.leads.periodo ? `<div class="ex-linha"><dt>${esc(t('campo.periodo'))}</dt><dd>${esc(f.leads.periodo)}</dd></div>` : ''}</dl>` : ''}
      ${sobre ? `<p class="miudo">${esc(t('fb.sobre'))}: ${sobre}</p>` : ''}
      ${souCancha() || souAprovador() ? `<div class="filtros-linha"><span class="miudo">${esc(t('fb.mudar_status'))}</span>${ST.map((s) => `<button class="chip ${f.status === s ? 'ativo' : ''}" data-act="status" data-id="${esc(f.id)}" data-s="${s}">${esc(t('fb.st.' + s))}</button>`).join('')}</div>` : ''}</section>
    ${comentarios(f.comentarios, { ref: 'f:' + f.id, podeComentar: souCancha() || souAprovador(), souCancha: souCancha(), mencionaveis: S.mencionaveis })}
    <section class="bloco"><details><summary><h3 class="inline">${esc(t('hist.titulo'))}</h3></summary>${historico(f.hist)}</details></section></div>`;
}

function form() {
  // "Sobre o quê": anúncios no ar ou recentes, rotações, e-mails, landing pages e roteiros que a pessoa vê.
  const ops = [
    ...S.dados.rotacoes.map((r) => ['r:' + r.id, t('fb.op.rotacao', { nome: r.ini + ' → ' + r.fim })]),
    ...S.dados.anuncios.filter((a) => ['no_ar', 'encerrado', 'aprovacao', 'continua'].includes(a.status)).map((a) => ['a:' + a.id, t('fb.op.anuncio', { nome: a.titulo })]),
    ...S.dados.emails.map((x) => ['e:' + x.id, t('fb.op.email', { nome: x.titulo })]),
    ...S.dados.paginas.map((x) => ['l:' + x.id, t('fb.op.lp', { nome: x.titulo })]),
  ].filter((x, i, a) => a.findIndex((y) => y[1] === x[1]) === i);
  return `<form class="form" data-form="feedback">
    <fieldset><legend class="rotulo">${esc(t('fb.tipo'))}</legend><div class="opcoes">${TIPOS.map((k, i) => `<label class="opcao"><input type="radio" name="tipo" value="${k}" ${i === 0 ? 'checked' : ''} data-mudou="tipo">
      <span><b>${ICONE[k]} ${esc(t('fb.tipo.' + k))}</b><small>${esc(t('fb.tipo.' + k + '.explica'))}</small></span></label>`).join('')}</div></fieldset>
    <div class="so-leads" hidden><label class="rotulo" for="fb-q">${esc(t('fb.qualidade'))}</label><select id="fb-q" name="qualidade">${QUALIDADE.map((q) => `<option value="${q}">${esc(t('fb.qualidade.' + q))}</option>`).join('')}</select>
      <div class="duas"><div><label class="rotulo" for="fb-n">${esc(t('fb.quantidade'))}</label><input id="fb-n" name="quantidade" type="number" min="0"></div>
      <div><label class="rotulo" for="fb-p">${esc(t('campo.periodo'))}</label><input id="fb-p" name="periodo" maxlength="100" placeholder="${esc(t('fb.periodo.exemplo'))}"></div></div>
      <p class="dica">${esc(t('fb.leads_privacidade'))}</p></div>
    <label class="rotulo" for="fb-s">${esc(t('fb.sobre'))}</label><select id="fb-s" name="sobre"><option value="">${esc(t('fb.sobre_geral'))}</option>${ops.map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join('')}</select>
    <label class="rotulo" for="fb-t">${esc(t('fb.texto'))} *</label><textarea id="fb-t" name="texto" rows="5" maxlength="3000" required placeholder="${esc(t('coment.placeholder'))}"></textarea>
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('fb.enviar'))}</button></div></form>`;
}

export const cliques = {
  novo: () => janela(t('fb.novo'), form(), { sobre: t('nav.feedbacks') }),
  filtro: (el) => { filtro = el.dataset.f; desenhar(); },
  abrir: (el) => { location.hash = '#/feedbacks/' + el.dataset.id; },
  status: (el) => acao('feedback-status', { id: el.dataset.id, status: el.dataset.s }, { ok: t('geral.salvo') }),
};
export const mudancas = {
  tipo: (el) => { el.closest('form').querySelector('.so-leads').hidden = el.value !== 'leads'; },
};
export const formularios = {
  feedback: async (f) => {
    const fd = new FormData(f);
    const r = await acao('feedback-criar', Object.fromEntries(fd.entries()), { ok: t('fb.enviado') });
    if (r?.criado) ir('feedbacks/' + r.criado);
  },
};
