// Peças comuns das telas de números (mídia, redes sociais, site): filtro de período, variação contra o
// período anterior e de onde vem cada número (integração conectada ou exemplo).
import { t, pct, dataHora } from '../i18n.js';
import { esc } from '../ui.js';
import { S } from '../app.js';

export const PRESETS = ['7', '30', '90', 'mes', 'mes_passado'];
export const filtroPeriodo = () => `<div class="seg" role="group" aria-label="${esc(t('painel.periodo'))}">${PRESETS.map((p) =>
  `<button type="button" class="${S.filtro.preset === p ? 'ativo' : ''}" data-act="periodo" data-p="${p}" aria-pressed="${S.filtro.preset === p}">${esc(t('painel.p.' + p))}</button>`).join('')}</div>`;

// ▲ 12% (verde se melhorou, vermelho se piorou; "menorMelhor" para custos; null = neutro, como o investimento).
export function variacao(atual, ant, menorMelhor = false, compacto = false) {
  if (atual == null || !ant) return compacto ? '' : `<span class="var neutra">${esc(t('painel.sem_comparacao'))}</span>`;
  const d = (atual - ant) / ant;
  if (Math.abs(d) < 0.005) return `<span class="var neutra">= ${compacto ? '' : esc(t('painel.igual'))}</span>`;
  const sobe = d > 0, bom = menorMelhor === null ? null : menorMelhor ? !sobe : sobe;
  const cls = bom === null ? 'neutra' : bom ? 'boa' : 'ruim';
  return `<span class="var ${cls}" title="${esc(t('painel.vs_anterior'))}">${sobe ? '▲' : '▼'} ${esc(pct(Math.abs(d)))}${compacto ? '' : ` <small>${esc(t('painel.vs_anterior'))}</small>`}</span>`;
}

// "Meta Ads · atualizado 11 nov., 14:00" ou o selo de exemplo.
export function origemFonte(M, k, nome) {
  const f = M.fontes[k];
  if (f?.real) return `<span class="fonte ok" title="${esc(t('painel.atualizado', { quando: dataHora(f.ultimoOk) }))}"><i></i>${esc(nome)} · ${esc(dataHora(f.ultimoOk))}</span>`;
  return `<span class="fonte ex" title="${esc(t('painel.exemplo_dica'))}"><i></i>${esc(nome)} · ${esc(t('exemplo.selo'))}</span>`;
}
