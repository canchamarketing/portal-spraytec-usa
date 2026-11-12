// Resultados da mídia paga (Meta Ads + Google Ads): o que foi investido, quantos contatos vieram, quanto
// custou cada um, o ritmo da verba do mês, campanhas, melhores anúncios e anúncios cansando.
import { t, moeda, num, pct, mesAno, dataHora } from '../i18n.js';
import { esc, eyebrow, exemplo, ajuda } from '../ui.js';
import { S, desenhar } from '../app.js';
import { metricas, metricasProntas, periodo, anterior, somar, filtrar, serie, diasEntre, addDias } from '../metricas.js';
import { linhas, barras, mini, ranking, COR } from '../graficos.js';
import { filtroPeriodo, variacao, origemFonte } from './painel.js';

let canal = 'tudo';
const CANAIS = ['tudo', 'meta', 'google'];

export function render() {
  const M = metricasProntas();
  if (!M) { metricas().then(desenhar); return `<div class="pagina"><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.resultados'))}</span></h1><p class="carregando">${esc(t('geral.carregando'))}</p></div>`; }
  const P = periodo(S.filtro.preset), A = anterior(P);
  const doCanal = (x) => canal === 'tudo' || x.canal === canal;
  const D = M.midia.dias;
  const agora = somar(filtrar(D, P, doCanal)), antes = somar(filtrar(D, A, doCanal));
  const s = (campo) => serie(D, P, campo, doCanal);
  const cpl = (() => { const a = s('investido'), c = s('contatos'); return a.map((p, i) => ({ d: p.d, v: c[i].v ? p.v / c[i].v : 0 })); })();

  // Números principais, cada um com a variação contra o período anterior e a tendência.
  const kpi = (k, v, vAnt, fmt, pontos, menorMelhor = false) => `<div class="kpi kpi-g"><span class="l">${esc(t('res.' + k))} ${ajuda('res.' + k + '.ajuda')}</span>
    <span class="v">${esc(fmt(v))}</span>${variacao(v, vAnt, menorMelhor)}${mini(pontos, COR[canal === 'tudo' ? 'um' : canal])}</div>`;
  const kpis = `<div class="kpis kpis-5">
    ${kpi('investimento', agora.investido, antes.investido, (v) => moeda(v), s('investido'), null)}
    ${kpi('contatos', agora.contatos, antes.contatos, num, s('contatos'))}
    ${kpi('cpl', agora.cpl, antes.cpl, (v) => moeda(v, 2), cpl, true)}
    ${kpi('cliques', agora.cliques, antes.cliques, num, s('cliques'))}
    ${kpi('ctr', agora.ctr, antes.ctr, pct, s('cliques').map((p, i) => ({ d: p.d, v: s('impressoes')[i].v ? p.v / s('impressoes')[i].v : 0 })))}</div>`;

  // Gráfico de investimento por canal (mesma escala, um eixo só) e de contatos por dia.
  const serCanal = (c, campo) => ({ nome: t('canal.' + c), cor: COR[c], pontos: serie(D, P, campo, (x) => x.canal === c) });
  const gInvest = canal === 'tudo' ? linhas({ series: [serCanal('meta', 'investido'), serCanal('google', 'investido')], fmt: (v, eixo) => moeda(v, 0), titulo: t('res.g_invest'), meia: true })
    : linhas({ series: [serCanal(canal, 'investido')], fmt: (v) => moeda(v, 0), titulo: t('res.g_invest'), meia: true });
  const gCont = barras({ pontos: s('contatos'), fmt: num, cor: COR[canal === 'tudo' ? 'um' : canal], titulo: t('res.g_contatos'), meia: true });

  // Divisão por canal.
  const porCanal = ['meta', 'google'].map((c) => ({ c, ...somar(filtrar(D, P, (x) => x.canal === c)) }));
  const divisao = `<div class="divisao">${porCanal.map((x) => `<div class="div-canal"><span class="canal c-${x.c}">${esc(t('canal.' + x.c))}</span>
    <dl><div><dt>${esc(t('res.investimento'))}</dt><dd>${esc(moeda(x.investido))}</dd></div><div><dt>${esc(t('res.contatos'))}</dt><dd>${esc(num(x.contatos))}</dd></div>
    <div><dt>${esc(t('res.cpl'))}</dt><dd>${esc(moeda(x.cpl, 2))}</dd></div></dl>
    <div class="parte"><span style="width:${agora.investido && canal === 'tudo' ? (x.investido / somar(filtrar(D, P)).investido) * 100 : 0}%;background:${COR[x.c]}"></span></div>
    <small>${esc(t('res.parte_verba', { p: pct(somar(filtrar(D, P)).investido ? x.investido / somar(filtrar(D, P)).investido : null) }))}</small></div>`).join('')}</div>`;

  return `<div class="pagina painel">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.resultados'))}</span></h1><p class="explica">${esc(t('res.explica'))}</p></div>
      <div class="fontes">${origemFonte(M, 'ads', 'Meta Ads')}${origemFonte(M, 'gads', 'Google Ads')}</div></header>
    <div class="filtros-linha">${filtroPeriodo()}<span class="sep-v"></span>${CANAIS.map((c) => `<button type="button" class="chip ${canal === c ? 'ativo' : ''}" data-act="canal" data-c="${c}">${c === 'tudo' ? esc(t('res.todos_canais')) : esc(t('canal.' + c))}</button>`).join('')}</div>
    ${resumo(agora, antes, porCanal)}
    ${kpis}
    ${ritmo(M)}
    <div class="dois-paineis">
      <section class="bloco"><h2>${esc(t('res.g_invest'))}</h2>${gInvest}</section>
      <section class="bloco"><h2>${esc(t('res.g_contatos'))}</h2>${gCont}</section>
    </div>
    ${canal === 'tudo' ? `<section class="bloco"><h2>${esc(t('res.divisao'))}</h2>${divisao}</section>` : ''}
    ${campanhas(M, P, A, doCanal)}
    ${anuncios(M, P, doCanal)}
  </div>`;
}

// Resumo em palavras simples (gerado a partir dos números, sem IA).
function resumo(a, b, porCanal) {
  const frases = [];
  const v = (x, y) => (y ? (x - y) / y : null);
  const dc = v(a.contatos, b.contatos), dcpl = v(a.cpl, b.cpl);
  if (dc != null) frases.push(t(dc >= 0 ? 'res.f_contatos_mais' : 'res.f_contatos_menos', { n: num(a.contatos), p: pct(Math.abs(dc)) }));
  if (dcpl != null) frases.push(t(dcpl <= 0 ? 'res.f_cpl_caiu' : 'res.f_cpl_subiu', { v: moeda(a.cpl, 2), p: pct(Math.abs(dcpl)) }));
  const [m, g] = porCanal;
  if (canal === 'tudo' && m.cpl && g.cpl) {
    const melhor = m.cpl <= g.cpl ? m : g, pior = melhor === m ? g : m;
    frases.push(t('res.f_canal', { canal: t('canal.' + melhor.c), v: moeda(melhor.cpl, 2), outro: t('canal.' + pior.c), w: moeda(pior.cpl, 2) }));
  }
  if (!frases.length) return '';
  return `<section class="resumo-simples"><h2>${esc(t('res.resumo'))}</h2><ul>${frases.map((f) => `<li>${esc(f)}</li>`).join('')}</ul></section>`;
}

// Ritmo da verba do mês: quanto já foi gasto contra o plano do mês aprovado, e a projeção até o fim do mês.
function ritmo(M) {
  const mes = S.hoje.slice(0, 7), plano = S.dados.planos.find((p) => p.mes === mes);
  const total = (c) => (c === 'meta' ? plano?.verbaMeta : plano?.verbaGoogle);
  if (!plano || (!plano.verbaMeta && !plano.verbaGoogle)) return '';
  const ini = mes + '-01', ontem = addDias(S.hoje, -1);
  if (ontem < ini) return '';
  const diasMes = new Date(Date.UTC(+mes.slice(0, 4), +mes.slice(5, 7), 0)).getUTCDate(), passados = diasEntre(ini, ontem).length;
  const linha = (c) => {
    const plan = total(c); if (!plan) return '';
    const gasto = somar(filtrar(M.midia.dias, { de: ini, ate: ontem }, (x) => x.canal === c)).investido;
    const proj = (gasto / passados) * diasMes, esperado = (plan * passados) / diasMes, desvio = (gasto - esperado) / esperado;
    const st = Math.abs(desvio) <= 0.1 ? 'ok' : desvio > 0 ? 'acima' : 'abaixo';
    return `<div class="ritmo-linha"><div class="ritmo-cab"><span class="canal c-${c}">${esc(t('canal.' + c))}</span>
      <span class="ritmo-st st-${st}">${st === 'ok' ? '●' : st === 'acima' ? '▲' : '▼'} ${esc(t('ritmo.' + st))}</span></div>
      <div class="ritmo-barra" role="img" aria-label="${esc(t('ritmo.aria', { gasto: moeda(gasto), plano: moeda(plan) }))}">
        <span class="gasto" style="width:${Math.min(100, (gasto / plan) * 100)}%;background:${COR[c]}"></span>
        <span class="projecao" style="width:${Math.min(100, (proj / plan) * 100)}%"></span><span class="hoje-m" style="left:${(passados / diasMes) * 100}%" title="${esc(t('ritmo.hoje'))}"></span></div>
      <p class="miudo">${esc(t('ritmo.texto', { gasto: moeda(gasto), plano: moeda(plan), proj: moeda(proj) }))}</p></div>`;
  };
  return `<section class="bloco"><h2>${esc(t('ritmo.titulo', { mes: mesAno(+mes.slice(0, 4), +mes.slice(5, 7)) }))} ${ajuda('ritmo.ajuda')}</h2>
    ${plano.status !== 'aprovado' ? `<p class="dica">${esc(t('ritmo.plano_nao_aprovado'))}</p>` : ''}${linha('meta')}${linha('google')}</section>`;
}

function campanhas(M, P, A, doCanal) {
  const C = Object.values(M.midia.campanhas).filter(doCanal).map((c) => {
    const a = somar(filtrar(M.midia.dias, P, (x) => x.campanha === c.id)), b = somar(filtrar(M.midia.dias, A, (x) => x.campanha === c.id));
    return { ...c, a, b };
  }).filter((c) => c.a.investido > 0 || c.a.impressoes > 0).sort((x, y) => y.a.investido - x.a.investido);
  if (!C.length) return '';
  return `<section class="bloco"><h2>${esc(t('res.campanhas'))}</h2><div class="tabela-rolar"><table class="tabela numeros"><thead><tr>
    <th>${esc(t('res.campanha'))}</th><th>${esc(t('res.investimento'))}</th><th>${esc(t('res.contatos'))}</th><th>${esc(t('res.cpl'))}</th><th class="some-celular">${esc(t('res.cliques'))}</th><th class="some-celular">${esc(t('res.ctr'))}</th></tr></thead>
    <tbody>${C.map((c) => `<tr><td><span class="canal c-${c.canal}">${esc(t('canal.' + c.canal))}</span> <span class="item-t">${esc(c.nome)}</span></td>
      <td>${esc(moeda(c.a.investido))}</td><td>${esc(num(c.a.contatos))} ${variacao(c.a.contatos, c.b.contatos, false, true)}</td>
      <td>${esc(moeda(c.a.cpl, 2))} ${variacao(c.a.cpl, c.b.cpl, true, true)}</td><td class="some-celular">${esc(num(c.a.cliques))}</td><td class="some-celular">${esc(pct(c.a.ctr))}</td></tr>`).join('')}</tbody></table></div></section>`;
}

// Melhores anúncios do período e anúncios cansando (taxa de clique caindo na última semana).
function anuncios(M, P, doCanal) {
  const L = M.midia.anuncios.filter(doCanal).map((a) => ({ ...a, s: somar(filtrar(M.midia.adDias, P, (x) => x.ad === a.id)) })).filter((a) => a.s.impressoes > 0);
  if (!L.length) return '';
  const melhores = [...L].sort((x, y) => y.s.contatos - x.s.contatos || (x.s.cpl ?? 1e9) - (y.s.cpl ?? 1e9)).slice(0, 4);
  const ult = { de: addDias(P.ate, -6), ate: P.ate }, ant = { de: addDias(P.ate, -13), ate: addDias(P.ate, -7) };
  const cansando = L.map((a) => {
    const x = somar(filtrar(M.midia.adDias, ult, (y) => y.ad === a.id)), y = somar(filtrar(M.midia.adDias, ant, (z) => z.ad === a.id));
    return { ...a, queda: x.ctr != null && y.ctr ? (x.ctr - y.ctr) / y.ctr : null, x, y };
  }).filter((a) => a.queda != null && a.queda <= -0.2 && a.y.impressoes > 500).sort((a, b) => a.queda - b.queda);
  const cartao = (a, extra = '') => `<div class="cartao-ad">${a.img ? `<img src="${esc(a.img)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="cartao-ad-txt">${esc(a.titulo || a.nome)}</span>`}
    <div><span class="canal c-${a.canal}">${esc(t('canal.' + a.canal))}</span><b>${esc(a.nome)}</b>
    <span class="miudo">${esc(t('res.ad_linha', { c: num(a.s.contatos), cpl: moeda(a.s.cpl, 2), ctr: pct(a.s.ctr) }))}</span>${extra}</div></div>`;
  return `<div class="dois-paineis">
    <section class="bloco"><h2>${esc(t('res.melhores'))}</h2><div class="lista-ads">${melhores.map((a) => cartao(a)).join('')}</div></section>
    <section class="bloco"><h2>${esc(t('res.cansando'))} ${ajuda('res.cansando.ajuda')}</h2>${cansando.length ? `<div class="lista-ads">${cansando.map((a) => cartao(a, `<span class="alerta-txt">▼ ${esc(t('res.ctr_caiu', { p: pct(Math.abs(a.queda)) }))}</span>`)).join('')}</div>
      <p class="dica">${esc(t('res.cansando_dica'))} <a href="#/rotacoes">${esc(t('nav.rotacoes'))}</a></p>` : `<p class="tudo-certo">✓ ${esc(t('res.nenhum_cansando'))}</p>`}</section></div>`;
}

export const cliques = {
  canal: (el) => { canal = el.dataset.c; desenhar(); },
  periodo: (el) => { S.filtro.preset = el.dataset.p; desenhar(); },
};
export { dataHora };
