// Planejamento do mês: observações para o mês seguinte (Spraytec e Cancha) e o plano aprovado que sai delas.
import { t, dataHora, mesAno, data } from '../i18n.js';
import { esc, eyebrow, conteudo, comentarios, historico, confirmar } from '../ui.js';
import { S, acao, souCancha, souAprovador, desenhar } from '../app.js';
import { formItem, caixaStatus, corpoItem, statusItem, cliquesItem, formulariosItem, mudancasItem } from './item.js';

const ASSUNTOS = ['verba', 'produto', 'evento', 'publico', 'criativo', 'outro'];
const DESTINOS = ['atendida', 'adiada', 'nao_aplica'];
let mesSel = null;
const mesMais = (ym, n) => { const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };

export function render([pid]) {
  const atual = S.hoje.slice(0, 7);
  if (pid && /^p-\d{4}-\d{2}$/.test(pid)) mesSel = pid.slice(2);
  if (!mesSel) mesSel = mesMais(atual, 1);
  const meses = [-1, 0, 1, 2].map((n) => mesMais(atual, n));
  if (!meses.includes(mesSel)) meses.push(mesSel);
  const nomeMes = (ym) => mesAno(+ym.slice(0, 4), +ym.slice(5, 7));
  const O = S.dados.observacoes.filter((o) => o.mes === mesSel).sort((a, b) => a.em.localeCompare(b.em));
  const P = S.dados.planos.find((p) => p.mes === mesSel);
  // Prazo combinado para as observações: dia 20 do mês anterior.
  const prazoObs = mesMais(mesSel, -1) + '-20';

  const obs = (o) => `<div class="obs"><div class="meta"><span class="tag">${esc(t('obs.assunto.' + o.assunto))}</span><b>${esc(o.por)}</b><span class="data">${esc(dataHora(o.em))}</span>
      ${o.destino ? `<span class="pill xs-${o.destino === 'atendida' ? 'feito' : o.destino === 'adiada' ? 'aprovacao' : 'rascunho'}"><i></i>${esc(t('obs.destino.' + o.destino))}${o.destinoNota ? ' · ' + esc(o.destinoNota) : ''}</span>` : ''}</div>
    <div>${conteudo(o)}</div>
    ${souCancha() ? `<div class="filtros-linha">${DESTINOS.map((d) => `<button class="chip ${o.destino === d ? 'ativo' : ''}" data-act="destino" data-id="${esc(o.id)}" data-d="${o.destino === d ? '' : d}">${esc(t('obs.destino.' + d))}</button>`).join('')}</div>` : ''}
    ${o.porId === S.eu.id && !o.destino ? `<button class="link perigo miudo" data-act="apagar-obs" data-id="${esc(o.id)}">${esc(t('item.apagar'))}</button>` : ''}</div>`;

  const formObs = souCancha() || souAprovador() ? `<form class="form" data-form="obs"><label class="rotulo" for="ob-a">${esc(t('obs.assunto'))}</label>
    <select id="ob-a" name="assunto">${ASSUNTOS.map((a) => `<option value="${a}">${esc(t('obs.assunto.' + a))}</option>`).join('')}</select>
    <label class="rotulo" for="ob-t">${esc(t('obs.nova'))}</label><textarea id="ob-t" name="texto" rows="3" maxlength="2000" required placeholder="${esc(t('obs.placeholder'))}"></textarea>
    <div class="acoes"><button class="btn forte" type="submit">${esc(t('obs.anotar'))}</button></div></form>` : '';

  const plano = P ? `${caixaStatus('planos', P)}${corpoItem('planos', P)}
      ${souCancha() ? `<div class="barra-acoes">${['rascunho', 'ajuste', 'aprovado'].includes(P.status) ? `<button class="btn" data-act="item-editar" data-col="planos" data-id="${esc(P.id)}">${esc(t('geral.editar'))}</button>` : ''}
        ${['rascunho', 'ajuste'].includes(P.status) ? `<button class="btn forte" data-act="item-enviar" data-col="planos" data-id="${esc(P.id)}">${esc(t('anuncio.enviar'))}</button>` : ''}</div>` : ''}`
    : `<p class="vazio">${esc(t(souCancha() ? 'plano.vazio_cancha' : 'plano.vazio_cliente'))}</p>${souCancha() ? `<button class="btn forte" data-act="novo-plano">${esc(t('plano.criar'))}</button>` : ''}`;

  return `<div class="pagina">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.planejamento'))}</span></h1><p class="explica">${esc(t('plano.explica'))}</p></div></header>
    <div class="filtros-linha"><span class="miudo">${esc(t('plano.mes'))}</span>${meses.sort().map((m) => `<button class="chip ${m === mesSel ? 'ativo' : ''}" data-act="mes" data-m="${m}">${esc(nomeMes(m))}</button>`).join('')}</div>
    <div class="dois-paineis">
      <section class="bloco"><h2>${esc(t('obs.titulo', { mes: nomeMes(mesSel) }))} <span class="miudo">${O.length}</span></h2>
        <p class="dica">${esc(t('obs.dica', { prazo: data(prazoObs) }))}</p>${O.map(obs).join('') || `<p class="vazio">${esc(t('obs.nenhuma'))}</p>`}${formObs}</section>
      <section class="bloco"><h2>${esc(t('plano.titulo', { mes: nomeMes(mesSel) }))} ${P ? statusItem(P) : ''}</h2>${plano}</section>
    </div>
    ${P ? comentarios(P.comentarios, { ref: 'p:' + P.id, podeComentar: souCancha() || souAprovador(), souCancha: souCancha(), mencionaveis: S.mencionaveis }) : ''}
    ${P ? `<section class="bloco"><details><summary><h3 class="inline">${esc(t('hist.titulo'))}</h3></summary>${historico(P.hist)}</details></section>` : ''}
  </div>`;
}

export const cliques = {
  ...cliquesItem,
  mes: (el) => { mesSel = el.dataset.m; if (location.hash !== '#/planejamento') location.hash = '#/planejamento'; else desenhar(); },
  'novo-plano': () => formItem('planos', null, { mes: mesSel }),
  destino: (el) => acao('obs-destino', { id: el.dataset.id, destino: el.dataset.d || null }, { ok: t('geral.salvo') }),
  'apagar-obs': (el) => confirmar(t('obs.apagar_confirma'), t('item.apagar'), () => acao('obs-remover', { id: el.dataset.id })),
};
export const formularios = {
  ...formulariosItem,
  obs: (f) => { const fd = new FormData(f); acao('obs-criar', { mes: mesSel, assunto: fd.get('assunto'), texto: fd.get('texto') }, { ok: t('obs.anotada') }); },
};
export const mudancas = mudancasItem;
