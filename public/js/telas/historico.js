// Histórico completo (auditoria): quem fez o quê e quando. Só a Cancha vê. O registro é em português.
import { t, dataHora } from '../i18n.js';
import { esc, toast, eyebrow } from '../ui.js';
import { api } from '../api.js';
import { desenhar } from '../app.js';

let itens = null;
export function render() {
  if (!itens) {
    api('/api/atividade').then((r) => { itens = r.itens; desenhar(); }).catch((err) => toast(err.message, 'ruim'));
    return `<div class="pagina"><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.historico'))}</span></h1><p>${esc(t('geral.carregando'))}</p></div>`;
  }
  const L = itens; itens = null; // na próxima visita busca de novo
  return `<div class="pagina"><header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.historico'))}</span></h1><p class="explica">${esc(t('historico.explica'))}</p></div></header>
    <div class="tabela-rolar"><table class="tabela"><thead><tr><th>${esc(t('historico.quando'))}</th><th>${esc(t('historico.quem'))}</th><th>${esc(t('historico.oque'))}</th></tr></thead>
    <tbody>${L.map((x) => `<tr><td class="nowrap">${esc(dataHora(x.em))}</td><td>${esc(x.usuario_nome)}${x.papel ? `<br><small>${esc(t('papel.' + x.papel))}</small>` : ''}</td><td>${esc(x.resumo || x.acao)}</td></tr>`).join('')}</tbody></table></div></div>`;
}
