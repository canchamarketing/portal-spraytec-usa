// Tráfego do site (Google Analytics 4) e buscas no Google (Search Console, por enquanto de exemplo).
import { t, num, pct } from '../i18n.js';
import { esc, ajuda } from '../ui.js';
import { S } from '../app.js';
import { periodo, anterior, serie, diasEntre } from '../metricas.js';
import { linhas, ranking, mini, COR } from '../graficos.js';
import { filtroPeriodo, variacao, origemFonte } from './painel.js';

// Nomes dos canais do GA4 em palavras simples.
const CANAL = { 'Organic Search': 'organico', 'Paid Search': 'busca_paga', 'Paid Social': 'social_pago', 'Organic Social': 'social', Direct: 'direto', Email: 'email', Referral: 'referencia', Display: 'display', 'Cross-network': 'pmax', Unassigned: 'outro' };
const nomeCanal = (c) => (CANAL[c] ? t('ga.canal.' + CANAL[c]) : c);

// Aba "Site" da Performance (GA4).
export function site(M) {
  const G = M.ga4, P = periodo(S.filtro.preset), A = anterior(P);
  const dentro = (p) => (x) => x.d >= p.de && x.d <= p.ate;
  const soma = (L, k) => L.reduce((a, x) => a + (x[k] || 0), 0);
  const da = G.dias.filter(dentro(P)), db = G.dias.filter(dentro(A));
  const ses = soma(da, 'sessoes'), sesB = soma(db, 'sessoes'), usu = soma(da, 'usuarios'), usuB = soma(db, 'usuarios');
  const cont = soma(da, 'eventosChave'), contB = soma(db, 'eventosChave');
  const eng = ses ? soma(da, 'engajadas') / ses : null, engB = sesB ? soma(db, 'engajadas') / sesB : null;
  const conv = ses ? cont / ses : null, convB = sesB ? contB / sesB : null;
  const s = (k) => serie(G.dias, P, k);
  const kpi = (k, v, vb, fmt, pontos) => `<div class="kpi kpi-g"><span class="l">${esc(t('ga.' + k))} ${ajuda('ga.' + k + '.ajuda')}</span><span class="v">${esc(fmt(v))}</span>${variacao(v, vb)}${pontos ? mini(pontos) : ''}</div>`;
  // Canais e páginas no período.
  const agrupa = (L, chave, valor) => { const m = new Map(); for (const x of L.filter(dentro(P))) m.set(x[chave], (m.get(x[chave]) || 0) + (x[valor] || 0)); return [...m].map(([nome, v]) => ({ nome, v })).sort((a, b) => b.v - a.v); };
  const canais = agrupa(G.canais, 'canal', 'sessoes').map((x) => ({ ...x, nome: nomeCanal(x.nome) })).slice(0, 7);
  const contCanal = agrupa(G.canais, 'canal', 'eventosChave').map((x) => ({ ...x, nome: nomeCanal(x.nome) })).filter((x) => x.v > 0).slice(0, 7);
  const paginas = agrupa(G.paginas, 'pagina', 'visualizacoes').slice(0, 8);
  return `<div class="filtros-linha"><div class="fontes">${origemFonte(M, 'ga4', 'Google Analytics')}</div></div>
    <div class="kpis kpis-5">${kpi('sessoes', ses, sesB, num, s('sessoes'))}${kpi('usuarios', usu, usuB, num, s('usuarios'))}${kpi('contatos', cont, contB, num, s('eventosChave'))}
      ${kpi('conversao', conv, convB, pct)}${kpi('engajamento', eng, engB, pct)}</div>
    <section class="bloco"><h2>${esc(t('ga.g_sessoes'))}</h2>${linhas({ series: [{ nome: t('ga.sessoes'), cor: COR.um, pontos: s('sessoes') }], fmt: (v) => num(v), titulo: t('ga.g_sessoes') })}</section>
    <div class="dois-paineis">
      <section class="bloco"><h2>${esc(t('ga.de_onde'))} ${ajuda('ga.de_onde.ajuda')}</h2>${ranking(canais, num)}
        ${contCanal.length ? `<h3>${esc(t('ga.contatos_canal'))}</h3>${ranking(contCanal, num, '#1baf7a')}` : ''}</section>
      <section class="bloco"><h2>${esc(t('ga.paginas'))}</h2>${ranking(paginas, num)}</section>
    </div>`;
}

// Buscas no Google (Search Console, exemplo por enquanto): aba da tela de SEO e GEO.
export function buscas(M) {
  const P = periodo(S.filtro.preset), A = anterior(P);
  const dentro = (p) => (x) => x.d >= p.de && x.d <= p.ate;
  const soma = (L, k) => L.reduce((a, x) => a + (x[k] || 0), 0);
  const kpi = (k, v, vb, fmt) => `<div class="kpi kpi-g"><span class="l">${esc(t('ga.' + k))} ${ajuda('ga.' + k + '.ajuda')}</span><span class="v">${esc(fmt(v))}</span>${variacao(v, vb)}</div>`;
  const Q = M.gsc, gd = Q.dias.filter(dentro(P)), gdb = Q.dias.filter(dentro(A));
  const cli = soma(gd, 'cliques'), cliB = soma(gdb, 'cliques'), imp = soma(gd, 'impressoes'), impB = soma(gdb, 'impressoes');
  return `<div class="filtros-linha">${filtroPeriodo()}<span class="sep-v"></span><div class="fontes">${origemFonte(M, 'gsc', 'Search Console')}</div></div>
    <section class="bloco"><h2>${esc(t('gsc.titulo'))} ${ajuda('gsc.ajuda')}</h2>
      <div class="kpis kpis-4">${kpi('cliques_google', cli, cliB, num)}${kpi('impressoes_google', imp, impB, num)}
        ${kpi('ctr_google', imp ? cli / imp : null, impB ? cliB / impB : null, pct)}
        <div class="kpi kpi-g"><span class="l">${esc(t('ga.posicao_media'))}</span><span class="v">${esc(num(Q.consultas.reduce((a, q) => a + q.posicao * q.impressoes, 0) / Q.consultas.reduce((a, q) => a + q.impressoes, 0)))}</span></div></div>
      <div class="tabela-rolar"><table class="tabela numeros"><thead><tr><th>${esc(t('gsc.consulta'))}</th><th>${esc(t('ga.cliques_google'))}</th><th class="some-celular">${esc(t('ga.impressoes_google'))}</th><th>${esc(t('ga.ctr_google'))}</th><th>${esc(t('seo.col.posicao'))}</th></tr></thead>
      <tbody>${Q.consultas.map((q) => `<tr><td class="item-t">${esc(q.termo)}</td><td>${esc(num(q.cliques))}</td><td class="some-celular">${esc(num(q.impressoes))}</td><td>${esc(pct(q.ctr))}</td><td class="data">#${esc(num(q.posicao))}</td></tr>`).join('')}</tbody></table></div>
      <p class="dica">${esc(t('gsc.dica'))}</p></section>`;
}
export { diasEntre };
