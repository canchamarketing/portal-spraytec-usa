// E-mails (enviados pelo Brevo): lista com filtros, como a tela de Aprovação do Brasil.
import { t, data, pct, num } from '../i18n.js';
import { esc, eyebrow, exemplo } from '../ui.js';
import { S, souCancha, desenhar } from '../app.js';
import { formItem, statusItem, cliquesItem, formulariosItem, mudancasItem, CHECKLIST } from './item.js';

let filtro = 'todos';
const FILTROS = { todos: () => true, aprovar: (x) => ['aprovacao', 'ajuste', 'ajustando', 'rascunho'].includes(x.status), prontos: (x) => x.status === 'aprovado', enviados: (x) => x.status === 'enviado' };

export function render() {
  const E = [...S.dados.emails].sort((a, b) => (b.envio || '').localeCompare(a.envio || ''));
  const enviados = E.filter((x) => x.status === 'enviado' && x.resultado);
  const soma = (k) => enviados.reduce((a, x) => a + (x.resultado[k] || 0), 0);
  const env = soma('enviados');
  const L = E.filter(FILTROS[filtro]);
  const linha = (x) => {
    const ck = CHECKLIST.emails.filter((k) => x.checklist?.[k]).length;
    return `<tr class="clica" data-act="abrir" data-id="${esc(x.id)}"><td><div class="item-linha"><span class="miniatura" style="--k:#2F6FA8">${esc(t('tipo.emails'))}</span>
      <span><span class="item-t">${esc(x.titulo)}</span><br><span class="item-sub">${esc(x.assunto || '')}</span></span></div></td>
      <td class="some-celular">${esc(x.lista || '—')}</td><td class="data">${esc(data(x.envio))}</td>
      <td class="some-celular"><span class="miudo">${ck}/${CHECKLIST.emails.length}</span></td><td>${statusItem(x)}</td></tr>`;
  };
  const chip = (k) => `<button type="button" class="chip ${filtro === k ? 'ativo' : ''}" data-act="filtro" data-f="${k}">${esc(t('em.filtro.' + k))} · ${E.filter(FILTROS[k]).length}</button>`;
  return `<div class="pagina">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.emails'))}</span></h1><p class="explica">${esc(t('em.explica'))}</p></div>
    ${souCancha() ? `<button class="btn forte" data-act="novo">${esc(t('item.novo.emails'))}</button>` : ''}</header>
    <div class="kpis"><div class="kpi"><span class="v">${esc(num(enviados.length))}</span><span class="l">${esc(t('em.kpi.enviados'))}</span></div>
      <div class="kpi"><span class="v">${esc(pct(env ? soma('aberturas') / env : null))}</span><span class="l">${esc(t('em.kpi.abertura'))}</span></div>
      <div class="kpi"><span class="v">${esc(pct(env ? soma('cliques') / env : null))}</span><span class="l">${esc(t('em.kpi.clique'))}</span></div></div>
    ${enviados.some((x) => x.resultado?.origem === 'exemplo') ? `<p class="dica">${exemplo()} ${esc(t('em.kpi.exemplo'))}</p>` : ''}
    <div class="filtros-linha">${Object.keys(FILTROS).map(chip).join('')}</div>
    <div class="tabela-rolar"><table class="tabela"><thead><tr><th>${esc(t('em.col.email'))}</th><th class="some-celular">${esc(t('campo.lista'))}</th><th>${esc(t('campo.envio'))}</th>
      <th class="some-celular">${esc(t('em.col.checklist'))}</th><th>${esc(t('em.col.status'))}</th></tr></thead>
      <tbody>${L.map(linha).join('') || `<tr><td colspan="5" class="vazio">${esc(t('em.nenhum'))}</td></tr>`}</tbody></table></div>
  </div>`;
}
export const cliques = {
  ...cliquesItem,
  novo: () => formItem('emails', null),
  filtro: (el) => { filtro = el.dataset.f; desenhar(); },
  abrir: (el) => { location.hash = '#/email/' + el.dataset.id; },
};
export const formularios = formulariosItem;
export const mudancas = mudancasItem;
