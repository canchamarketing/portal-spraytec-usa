// Performance, como no Portal Brasil: mídia paga, site, redes sociais e e-mail num lugar só, com o mesmo
// período e a comparação com o período anterior. Abas: Funil · Mídia paga · Site · Social · E-mail.
import { t, num, pct, moeda, data } from '../i18n.js';
import { esc, eyebrow, ajuda, exemplo } from '../ui.js';
import { S, desenhar } from '../app.js';
import { metricas, metricasProntas, periodo, anterior, somar, filtrar } from '../metricas.js';
import { filtroPeriodo, variacao } from './painel.js';
import { midia, cliquesMidia } from './resultados.js';
import { site } from './trafego.js';
import { social, cliquesSocial } from './social.js';
import { COR } from '../graficos.js';

const ABAS = ['funil', 'midia', 'site', 'social', 'email'];
let aba = 'funil';

export function render([sub]) {
  if (ABAS.includes(sub)) aba = sub;
  const M = metricasProntas();
  if (!M) metricas().then(desenhar);
  const corpo = !M ? `<p class="carregando">${esc(t('geral.carregando'))}</p>`
    : aba === 'funil' ? funil(M) : aba === 'midia' ? midia(M) : aba === 'site' ? site(M) : aba === 'social' ? social(M) : email();
  return `<div class="pagina painel">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.performance'))}</span></h1><p class="explica">${esc(t('perf.explica'))}</p></div></header>
    <div class="filtros-linha">${filtroPeriodo()}</div>
    <nav class="abas-perf" aria-label="${esc(t('nav.performance'))}">${ABAS.map((a) => `<button type="button" class="${aba === a ? 'ativo' : ''}" data-act="aba" data-a="${a}" aria-current="${aba === a ? 'page' : 'false'}">${esc(t('perf.aba.' + a))}</button>`).join('')}</nav>
    ${corpo}</div>`;
}

// Funil: do anúncio visto até o contato (e, com o Salesforce, até a venda).
function funil(M) {
  const P = periodo(S.filtro.preset), A = anterior(P);
  const dentro = (p) => (x) => x.d >= p.de && x.d <= p.ate;
  const soma = (L, k, p) => L.filter(dentro(p)).reduce((a, x) => a + (x[k] || 0), 0);
  const ads = somar(filtrar(M.midia.dias, P)), adsB = somar(filtrar(M.midia.dias, A));
  const visitas = soma(M.ga4.dias, 'sessoes', P), visitasB = soma(M.ga4.dias, 'sessoes', A);
  const contSite = soma(M.ga4.dias, 'eventosChave', P), contSiteB = soma(M.ga4.dias, 'eventosChave', A);
  const etapas = [
    { k: 'vistos', v: ads.impressoes, b: adsB.impressoes },
    { k: 'cliques', v: ads.cliques, b: adsB.cliques },
    { k: 'visitas', v: visitas, b: visitasB },
    { k: 'contatos', v: Math.max(ads.contatos, contSite), b: Math.max(adsB.contatos, contSiteB) },
    { k: 'vendas', v: null, b: null },
  ];
  const max = etapas[0].v || 1;
  const linhas = etapas.map((e, i) => {
    const ant = etapas[i - 1];
    const taxa = ant && ant.v && e.v != null ? e.v / ant.v : null;
    // Escala logarítmica: as etapas vão de centenas de milhares a dezenas; todas ficam legíveis.
    const larg = e.v == null ? 100 : e.v <= 0 ? 24 : 24 + 76 * (Math.log10(e.v + 1) / Math.log10(max + 1));
    return `<li class="etapa${e.v == null ? ' futura' : ''}"><div class="et-nome"><b>${esc(t('funil.' + e.k))}</b> ${ajuda('funil.' + e.k + '.ajuda')}<small>${esc(t('funil.' + e.k + '.de'))}</small></div>
      <div class="et-barra"><span style="width:${larg}%"></span><b>${e.v == null ? esc(t('funil.em_breve')) : esc(num(e.v))}</b></div>
      <div class="et-taxa">${taxa != null ? `<span>${esc(pct(taxa))}</span><small>${esc(t('funil.da_etapa'))}</small>` : ''}${e.v != null ? variacao(e.v, e.b, false, true) : ''}</div></li>`;
  }).join('');
  const custo = ads.contatos ? ads.investido / ads.contatos : null;
  const exemplos = ['ads', 'gads', 'ga4'].filter((k) => !M.fontes[k]?.real).length;
  return `${exemplos ? `<p class="aviso-exemplo">${exemplo()} ${esc(t('perf.exemplo'))}</p>` : ''}
    <div class="kpis kpis-4">
      <div class="kpi kpi-g"><span class="l">${esc(t('res.investimento'))}</span><span class="v">${esc(moeda(ads.investido))}</span>${variacao(ads.investido, adsB.investido, null)}</div>
      <div class="kpi kpi-g"><span class="l">${esc(t('funil.contatos'))} ${ajuda('funil.contatos.ajuda')}</span><span class="v">${esc(num(etapas[3].v))}</span>${variacao(etapas[3].v, etapas[3].b)}</div>
      <div class="kpi kpi-g"><span class="l">${esc(t('res.cpl'))} ${ajuda('res.cpl.ajuda')}</span><span class="v">${esc(moeda(custo, 2))}</span>${variacao(custo, adsB.contatos ? adsB.investido / adsB.contatos : null, true)}</div>
      <div class="kpi kpi-g"><span class="l">${esc(t('ga.conversao'))} ${ajuda('ga.conversao.ajuda')}</span><span class="v">${esc(pct(visitas ? contSite / visitas : null))}</span>${variacao(visitas ? contSite / visitas : null, visitasB ? contSiteB / visitasB : null)}</div></div>
    <section class="bloco"><h2>${esc(t('funil.titulo'))}</h2><p class="dica">${esc(t('funil.explica'))}</p><ol class="funil">${linhas}</ol>
      <p class="dica">${esc(t('funil.vendas_dica'))}</p></section>`;
}

// E-mail: resultados dos envios (Brevo), a partir dos e-mails do portal.
function email() {
  const P = periodo(S.filtro.preset);
  const L = S.dados.emails.filter((x) => x.status === 'enviado' && x.resultado).sort((a, b) => (b.concluidoEm || '').localeCompare(a.concluidoEm || ''));
  const noPer = L.filter((x) => x.concluidoEm >= P.de && x.concluidoEm <= P.ate);
  const soma = (k) => noPer.reduce((a, x) => a + (x.resultado[k] || 0), 0);
  const env = soma('enviados');
  const temEx = L.some((x) => x.resultado.origem === 'exemplo');
  return `${temEx ? `<p class="aviso-exemplo">${exemplo()} ${esc(t('em.kpi.exemplo'))}</p>` : ''}
    <div class="kpis kpis-4">
      <div class="kpi kpi-g"><span class="l">${esc(t('em.kpi.enviados'))}</span><span class="v">${esc(num(noPer.length))}</span></div>
      <div class="kpi kpi-g"><span class="l">${esc(t('res.abertura'))} ${ajuda('res.abertura.ajuda')}</span><span class="v">${esc(pct(env ? soma('aberturas') / env : null))}</span></div>
      <div class="kpi kpi-g"><span class="l">${esc(t('res.taxa_clique'))} ${ajuda('res.taxa_clique.ajuda')}</span><span class="v">${esc(pct(env ? soma('cliques') / env : null))}</span></div>
      <div class="kpi kpi-g"><span class="l">${esc(t('res.descadastros'))}</span><span class="v">${esc(num(soma('descadastros')))}</span></div></div>
    <section class="bloco"><h2>${esc(t('perf.emails'))}</h2>${L.length ? `<div class="tabela-rolar"><table class="tabela numeros"><thead><tr><th>${esc(t('em.col.email'))}</th><th>${esc(t('campo.envio'))}</th><th>${esc(t('res.enviados'))}</th><th>${esc(t('res.abertura'))}</th><th>${esc(t('res.taxa_clique'))}</th></tr></thead>
      <tbody>${L.map((x) => `<tr class="clica" data-act="abrir-email" data-id="${esc(x.id)}"><td><span class="item-t">${esc(x.titulo)}</span><br><span class="item-sub">${esc(x.assunto)}</span></td><td class="data">${esc(data(x.concluidoEm))}</td>
        <td>${esc(num(x.resultado.enviados))}</td><td>${esc(pct(x.resultado.enviados ? x.resultado.aberturas / x.resultado.enviados : null))}</td><td>${esc(pct(x.resultado.enviados ? x.resultado.cliques / x.resultado.enviados : null))}</td></tr>`).join('')}</tbody></table></div>`
      : `<p class="vazio">${esc(t('perf.sem_emails'))}</p>`}<p class="dica">${esc(t('res.brevo_dica'))}</p></section>`;
}

export const cliques = {
  ...cliquesMidia, ...cliquesSocial,
  aba: (el) => { aba = el.dataset.a; history.replaceState(null, '', '#/performance/' + aba); desenhar(); },
  periodo: (el) => { S.filtro.preset = el.dataset.p; desenhar(); },
  'abrir-email': (el) => { location.hash = '#/email/' + el.dataset.id; },
};
export { COR };
