// Minha conta: idioma e sair.
import { t, idioma, IDIOMAS } from '../i18n.js';
import { esc, eyebrow } from '../ui.js';
import { api } from '../api.js';
import { S, trocarIdioma } from '../app.js';

export function render() {
  return `<div class="pagina estreita"><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.conta'))}</span></h1>
    <section class="bloco"><p><b>${esc(S.eu.nome)}</b><br><span class="miudo">${esc(S.eu.email || '')} · ${esc(t('papel.' + S.eu.papel))}</span></p></section>
    <section class="bloco"><h2>${esc(t('conta.idioma'))}</h2><p class="dica">${esc(t('conta.idioma_explica'))}</p>
      <div class="opcoes">${IDIOMAS.map((l) => `<label class="opcao"><input type="radio" name="idioma" value="${l}" ${l === idioma() ? 'checked' : ''} data-mudou="idioma">
        <span><b>${l === 'pt-BR' ? 'Português (Brasil)' : 'English (US)'}</b><small>${l === 'pt-BR' ? '31/12/2026 · US$ 1.234,56' : '12/31/2026 · $1,234.56'}</small></span></label>`).join('')}</div></section>
    <section class="bloco"><button class="btn" data-act="sair">${esc(t('conta.sair'))}</button></section></div>`;
}
export const mudancas = { idioma: (el) => trocarIdioma(el.value) };
export const cliques = { sair: async () => { await api('/api/sair', {}); location.href = '/'; } };
