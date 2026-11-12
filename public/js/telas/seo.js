// SEO e GEO: palavras buscadas no Google (posição mês a mês) e presença da Spraytec nas respostas de IA.
// Por enquanto a Cancha registra à mão; o Search Console e o GA4 entram na etapa das integrações.
import { t, mesCurto, num } from '../i18n.js';
import { esc, eyebrow, janela, confirmar, exemplo } from '../ui.js';
import { S, acao, souCancha, desenhar } from '../app.js';
import { nomeProduto } from './comum.js';
import { buscas } from './trafego.js';
import { metricas, metricasProntas } from '../metricas.js';

const FERRAMENTAS = ['chatgpt', 'gemini', 'google_ia', 'perplexity'];
const RES = ['sim', 'citada', 'nao'];
const SIMBOLO = { sim: '✓', citada: '~', nao: '✗' };
let aba = 'site'; // site = buscas no Google (Search Console)
const mesMais = (ym, n) => { const d = new Date(Date.UTC(+ym.slice(0, 4), +ym.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
const nomeM = (ym) => `${mesCurto(+ym.slice(0, 4), +ym.slice(5, 7))} ${ym.slice(2, 4)}`;

export function render() {
  const atual = S.hoje.slice(0, 7);
  const meses = [-3, -2, -1].map((n) => mesMais(atual, n));
  const temEx = S.dados.palavras.some((p) => p.meses.some((m) => m.origem === 'exemplo')) || S.dados.geo.some((g) => g.verificacoes.some((v) => v.origem === 'exemplo'));
  const M = metricasProntas();
  if (aba === 'site' && !M) metricas().then(desenhar);
  const abas = `<div class="filtros-linha"><div class="seg">${['site', 'seo', 'geo'].map((a) => `<button type="button" class="${aba === a ? 'ativo' : ''}" data-act="aba" data-a="${a}">${esc(t('seo.aba.' + a))}</button>`).join('')}</div></div>`;
  return `<div class="pagina">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.seo'))}</span></h1><p class="explica">${esc(t('seo.explica'))}</p></div></header>
    ${abas}${aba !== 'site' && temEx ? `<p class="aviso-exemplo">${exemplo()} ${esc(t('seo.exemplo'))}</p>` : ''}
    ${aba === 'site' ? (M ? buscas(M) : `<p class="carregando">${esc(t('geral.carregando'))}</p>`) : aba === 'seo' ? palavras(meses) : geo(mesMais(atual, -1))}</div>`;
}

function palavras(meses) {
  const P = S.dados.palavras;
  const pos = (p, m) => p.meses.find((x) => x.mes === m);
  const seta = (p) => {
    const a = pos(p, meses[1])?.posicao, b = pos(p, meses[2])?.posicao;
    if (a == null || b == null || a === b) return '';
    return b < a ? `<span class="seta-sobe" title="${esc(t('seo.subiu'))}">▲ ${a - b}</span>` : `<span class="seta-desce" title="${esc(t('seo.caiu'))}">▼ ${b - a}</span>`;
  };
  const linha = (p) => `<tr><td><span class="item-t">${esc(p.termo)}</span>${p.produtos?.length ? `<br><span class="item-sub">${p.produtos.map((x) => esc(nomeProduto(x))).join(' · ')}</span>` : ''}</td>
    ${meses.map((m) => { const r = pos(p, m); return `<td class="data">${r?.posicao != null ? '#' + esc(num(r.posicao)) : '—'}</td>`; }).join('')}
    <td>${seta(p)}</td><td class="data some-celular">${esc(num(pos(p, meses[2])?.cliques ?? null))}</td>
    ${souCancha() ? `<td class="acoes-linha"><button class="link" data-act="registrar" data-id="${esc(p.id)}">${esc(t('seo.registrar'))}</button><button class="link perigo" data-act="tirar-palavra" data-id="${esc(p.id)}">${esc(t('geral.tirar'))}</button></td>` : ''}</tr>`;
  return `<section><div class="cab"><div><h2>${esc(t('seo.palavras'))}</h2><p class="dica">${esc(t('seo.palavras_dica'))}</p></div>
    ${souCancha() ? `<button class="btn" data-act="nova-palavra">${esc(t('seo.nova_palavra'))}</button>` : ''}</div>
    <div class="tabela-rolar"><table class="tabela"><thead><tr><th>${esc(t('seo.col.palavra'))}</th>${meses.map((m) => `<th>${esc(nomeM(m))}</th>`).join('')}<th></th>
    <th class="some-celular">${esc(t('seo.col.cliques'))}</th>${souCancha() ? '<th></th>' : ''}</tr></thead>
    <tbody>${P.map(linha).join('') || `<tr><td colspan="7" class="vazio">${esc(t('seo.nenhuma'))}</td></tr>`}</tbody></table></div>
    <p class="dica">${esc(t('seo.posicao_ajuda'))}</p></section>`;
}

function geo(mes) {
  const G = S.dados.geo;
  const cel = (g, f) => {
    const v = g.verificacoes.filter((x) => x.ferramenta === f).sort((a, b) => b.mes.localeCompare(a.mes))[0];
    if (!v) return `<td class="miudo">—</td>`;
    return `<td><span class="geo-${v.resultado}" title="${esc(t('geo.res.' + v.resultado))}">${SIMBOLO[v.resultado]} ${esc(t('geo.res.' + v.resultado))}</span>${v.concorrentes ? `<br><span class="item-sub">${esc(t('geo.aparecem'))}: ${esc(v.concorrentes)}</span>` : ''}${v.link ? ` <a href="${esc(v.link)}" target="_blank" rel="noopener noreferrer" class="miudo">${esc(t('geo.print'))}</a>` : ''}</td>`;
  };
  const linha = (g) => `<tr><td><span class="item-t">${esc(g.pergunta)}</span>${g.produtos?.length ? `<br><span class="item-sub">${g.produtos.map((x) => esc(nomeProduto(x))).join(' · ')}</span>` : ''}</td>
    ${FERRAMENTAS.map((f) => cel(g, f)).join('')}
    ${souCancha() ? `<td class="acoes-linha"><button class="link" data-act="verificar" data-id="${esc(g.id)}">${esc(t('seo.registrar'))}</button><button class="link perigo" data-act="tirar-geo" data-id="${esc(g.id)}">${esc(t('geral.tirar'))}</button></td>` : ''}</tr>`;
  const total = G.length * FERRAMENTAS.length;
  const aparece = G.reduce((a, g) => a + FERRAMENTAS.filter((f) => g.verificacoes.some((v) => v.ferramenta === f && v.resultado !== 'nao')).length, 0);
  return `<section><div class="kpis"><div class="kpi"><span class="v">${total ? Math.round((aparece / total) * 100) + '%' : '—'}</span><span class="l">${esc(t('geo.kpi'))}</span></div></div>
    <div class="cab"><div><h2>${esc(t('geo.titulo'))}</h2><p class="dica">${esc(t('geo.dica'))}</p></div>${souCancha() ? `<button class="btn" data-act="nova-geo">${esc(t('geo.nova'))}</button>` : ''}</div>
    <div class="tabela-rolar"><table class="tabela"><thead><tr><th>${esc(t('geo.col.pergunta'))}</th>${FERRAMENTAS.map((f) => `<th>${esc(t('geo.ia.' + f))}</th>`).join('')}${souCancha() ? '<th></th>' : ''}</tr></thead>
    <tbody>${G.map(linha).join('') || `<tr><td colspan="6" class="vazio">${esc(t('geo.nenhuma'))}</td></tr>`}</tbody></table></div>
    <p class="dica">${esc(t('geo.legenda'))}</p></section>`;
}

const prods = (sel = []) => `<details class="caixa-prod"><summary class="rotulo">${esc(t('campo.produtos'))}</summary><div class="opcoes-linha">${S.catalogo.produtos.map((p) =>
  `<label class="check"><input type="checkbox" name="produtos" value="${p.id}" ${sel.includes(p.id) ? 'checked' : ''}> ${esc(p.nome)}</label>`).join('')}</div></details>`;
const rodape = () => `<div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('geral.salvar'))}</button></div>`;

export const cliques = {
  aba: (el) => { aba = el.dataset.a; desenhar(); },
  periodo: (el) => { S.filtro.preset = el.dataset.p; desenhar(); },
  'nova-palavra': () => janela(t('seo.nova_palavra'), `<form class="form" data-form="palavra"><label class="rotulo" for="kw">${esc(t('campo.termo'))} *</label>
    <input id="kw" name="termo" maxlength="120" required placeholder="foliar fertilizer for soybeans"><p class="dica">${esc(t('seo.termo_dica'))}</p>${prods()}${rodape()}</form>`, { sobre: t('seo.aba.seo') }),
  registrar: (el) => {
    const p = S.dados.palavras.find((x) => x.id === el.dataset.id), m = mesMais(S.hoje.slice(0, 7), -1), r = p.meses.find((x) => x.mes === m) || {};
    janela(p.termo, `<form class="form" data-form="palavra-mes" data-id="${esc(p.id)}"><p class="dica">${esc(t('seo.registrar_dica'))}</p>
      <label class="rotulo" for="km">${esc(t('seo.mes'))}</label><input id="km" type="month" name="mes" value="${m}" required>
      <div class="duas"><div><label class="rotulo" for="kp">${esc(t('seo.col.posicao'))}</label><input id="kp" name="posicao" type="number" min="1" step="0.1" value="${r.posicao ?? ''}"></div>
      <div><label class="rotulo" for="kc">${esc(t('seo.col.cliques'))}</label><input id="kc" name="cliques" type="number" min="0" value="${r.cliques ?? ''}"></div></div>
      <label class="rotulo" for="ki">${esc(t('seo.col.impressoes'))}</label><input id="ki" name="impressoes" type="number" min="0" value="${r.impressoes ?? ''}">${rodape()}</form>`, { sobre: t('seo.aba.seo') });
  },
  'tirar-palavra': (el) => confirmar(t('seo.tirar_confirma'), t('geral.tirar'), () => acao('palavra-remover', { id: el.dataset.id })),
  'nova-geo': () => janela(t('geo.nova'), `<form class="form" data-form="geo"><label class="rotulo" for="gq">${esc(t('campo.pergunta'))} *</label>
    <input id="gq" name="pergunta" maxlength="300" required placeholder="What is the best adjuvant for glyphosate?"><p class="dica">${esc(t('geo.pergunta_dica'))}</p>${prods()}${rodape()}</form>`, { sobre: t('seo.aba.geo') }),
  verificar: (el) => {
    const g = S.dados.geo.find((x) => x.id === el.dataset.id);
    janela(g.pergunta, `<form class="form" data-form="geo-verificar" data-id="${esc(g.id)}"><p class="dica">${esc(t('geo.verificar_dica'))}</p>
      <div class="duas"><div><label class="rotulo" for="gm">${esc(t('seo.mes'))}</label><input id="gm" type="month" name="mes" value="${S.hoje.slice(0, 7)}" required></div>
      <div><label class="rotulo" for="gf">${esc(t('geo.ferramenta'))}</label><select id="gf" name="ferramenta">${FERRAMENTAS.map((f) => `<option value="${f}">${esc(t('geo.ia.' + f))}</option>`).join('')}</select></div></div>
      <fieldset><legend class="rotulo">${esc(t('geo.resultado'))}</legend><div class="opcoes">${RES.map((r, i) => `<label class="opcao"><input type="radio" name="resultado" value="${r}" ${i === 2 ? 'checked' : ''}>
        <span><b>${SIMBOLO[r]} ${esc(t('geo.res.' + r))}</b><small>${esc(t('geo.res.' + r + '.explica'))}</small></span></label>`).join('')}</div></fieldset>
      <label class="rotulo" for="gc">${esc(t('geo.concorrentes'))}</label><input id="gc" name="concorrentes" maxlength="300">
      <label class="rotulo" for="gl">${esc(t('geo.link_print'))}</label><input id="gl" name="link" type="url" placeholder="https://drive.google.com/…">${rodape()}</form>`, { sobre: t('seo.aba.geo') });
  },
  'tirar-geo': (el) => confirmar(t('geo.tirar_confirma'), t('geral.tirar'), () => acao('geo-remover', { id: el.dataset.id })),
};
export const formularios = {
  palavra: (f) => { const fd = new FormData(f); acao('palavra-salvar', { termo: fd.get('termo'), produtos: fd.getAll('produtos') }, { ok: t('geral.salvo') }); },
  'palavra-mes': (f) => { const fd = new FormData(f); acao('palavra-mes', { id: f.dataset.id, ...Object.fromEntries(fd.entries()) }, { ok: t('geral.salvo') }); },
  geo: (f) => { const fd = new FormData(f); acao('geo-salvar', { pergunta: fd.get('pergunta'), produtos: fd.getAll('produtos') }, { ok: t('geral.salvo') }); },
  'geo-verificar': (f) => { const fd = new FormData(f); acao('geo-verificar', { id: f.dataset.id, ...Object.fromEntries(fd.entries()) }, { ok: t('geral.salvo') }); },
};
