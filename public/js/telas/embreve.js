// Seções aprovadas no desenho que ainda vão ser construídas (só a Cancha vê, para acompanhar).
import { t } from '../i18n.js';
import { esc } from '../ui.js';

export function render(_p, sec) {
  const id = sec?.id || '';
  return `<div class="pagina estreita"><h1>${esc(t('nav.' + id))}</h1>
    <section class="bloco"><p><span class="selo breve">${esc(t('nav.em_breve'))}</span> ${esc(t('embreve.etapa', { n: sec?.breve || '' }))}</p>
    <p>${esc(t('embreve.' + id))}</p></section></div>`;
}
