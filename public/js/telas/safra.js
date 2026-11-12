// Ano safra e eventos: linha do tempo com as fases da lavoura, feiras, produtos em foco e campanhas.
import { t, periodo, mesCurto, mesAno, data } from '../i18n.js';
import { esc, janela, confirmar, conteudo, exemplo, texto } from '../ui.js';
import { S, acao, souCancha } from '../app.js';
import { nomeProduto } from './comum.js';

const TIPOS = ['fase', 'feira', 'foco', 'campanha', 'recesso'];
const ms = (iso) => Date.parse(iso + 'T00:00:00Z');

export function render() {
  const [y0, m0] = S.hoje.split('-').map(Number);
  const meses = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.UTC(y0, m0 - 1 + i, 1)); return [d.getUTCFullYear(), d.getUTCMonth() + 1]; });
  const ini = `${meses[0][0]}-${String(meses[0][1]).padStart(2, '0')}-01`;
  const [yf, mf] = meses[13];
  const fim = new Date(Date.UTC(yf, mf, 0)).toISOString().slice(0, 10);
  const total = ms(fim) + 864e5 - ms(ini);
  const pos = (d) => Math.max(0, Math.min(100, ((ms(d) - ms(ini)) / total) * 100));
  const E = S.dados.eventos.filter((e) => e.fim >= ini && e.ini <= fim);
  const hojeX = pos(S.hoje);

  const linhas = TIPOS.map((tipo) => {
    const L = E.filter((e) => e.tipo === tipo).sort((a, b) => a.ini.localeCompare(b.ini));
    if (!L.length) return '';
    // Eventos que se sobrepõem vão para faixas diferentes.
    const faixas = [];
    for (const e of L) { let f = faixas.find((x) => x < e.ini); const i = f === undefined ? faixas.length : faixas.indexOf(f); faixas[i] = e.fim; e._f = i; }
    const barras = L.map((e) => {
      const l = pos(e.ini < ini ? ini : e.ini), w = Math.max(0.9, pos(e.fim > fim ? fim : e.fim) + (100 / (total / 864e5)) - l);
      return `<button type="button" class="barra t-${tipo}${e.exemplo ? ' ex' : ''}" style="left:${l}%;width:${w}%;top:${e._f * 30 + 4}px" data-act="ver" data-id="${esc(e.id)}"
        title="${esc(periodo(e.ini, e.fim))}"><span>${esc(trNome(e))}</span></button>`;
    }).join('');
    return `<div class="tl-linha"><div class="tl-rotulo"><span class="tipo t-${tipo}">${esc(t('evento.' + tipo + '.plural'))}</span></div>
      <div class="tl-trilho" style="height:${faixas.length * 30 + 8}px">${barras}<span class="tl-hoje" style="left:${hojeX}%"></span></div></div>`;
  }).join('');

  const cab = meses.map(([y, m]) => `<span style="width:${100 / 14}%">${esc(mesCurto(y, m))}${m === 1 ? ` <small>${y}</small>` : ''}</span>`).join('');
  const temExemplo = S.dados.eventos.some((e) => e.exemplo);

  // Lista por mês (próximos primeiro).
  const futuros = S.dados.eventos.filter((e) => e.fim >= S.hoje).sort((a, b) => a.ini.localeCompare(b.ini));
  const porMes = {};
  for (const e of futuros) { const k = (e.ini < S.hoje ? S.hoje : e.ini).slice(0, 7); (porMes[k] ||= []).push(e); }
  const lista = Object.entries(porMes).map(([k, L]) => `<h3>${esc(mesAno(+k.slice(0, 4), +k.slice(5, 7)))}</h3><ul class="agenda">${L.map((e) => `<li>
    <span class="quando">${esc(periodo(e.ini, e.fim))}</span><span class="tipo t-${esc(e.tipo)}">${esc(t('evento.' + e.tipo))}</span>
    <button type="button" class="link" data-act="ver" data-id="${esc(e.id)}">${conteudo(e, 'nome')}</button>${e.local ? ` <small>· ${esc(e.local)}</small>` : ''}
    ${e.exemplo ? `<span class="selo exemplo">${esc(t('exemplo.selo'))}</span>` : ''}</li>`).join('')}</ul>`).join('');

  return `<div class="pagina">
    <header class="cab"><div><h1>${esc(t('nav.safra'))}</h1><p class="explica">${esc(t('safra.explica'))}</p></div>
    ${souCancha() ? `<button class="btn forte" data-act="novo">${esc(t('safra.novo'))}</button>` : ''}</header>
    ${temExemplo ? `<p class="aviso-exemplo">${exemplo(t('safra.exemplo_dica'))} ${esc(t('safra.exemplo_aviso'))}</p>` : ''}
    <section class="bloco linha-tempo" aria-label="${esc(t('safra.linha'))}">
      <div class="tl-cab"><div class="tl-rotulo"></div><div class="tl-meses">${cab}</div></div>${linhas}
      <p class="dica">${esc(t('safra.toque'))}</p></section>
    <section class="bloco"><h2>${esc(t('safra.proximos'))}</h2>${lista || `<p class="vazio">${esc(t('inicio.sem_eventos'))}</p>`}</section>
  </div>`;
}
const trNome = (e) => { const d = document.createElement('div'); d.innerHTML = conteudo(e, 'nome'); return (d.querySelector('.trad') || d).textContent; };

function detalhe(e) {
  const prods = (e.produtos || []).map((p) => `<a class="chip" href="#/produtos/${esc(p)}">${esc(nomeProduto(p))}</a>`).join(' ');
  return `<dl class="ex">
    <div class="ex-linha"><dt>${esc(t('safra.tipo'))}</dt><dd><span class="tipo t-${esc(e.tipo)}">${esc(t('evento.' + e.tipo))}</span> ${e.exemplo ? exemplo(t('safra.exemplo_dica')) : `<span class="selo ok">${esc(t('safra.confirmado'))}</span>`}</dd></div>
    <div class="ex-linha"><dt>${esc(t('safra.quando'))}</dt><dd>${esc(data(e.ini))}${e.fim !== e.ini ? ' → ' + esc(data(e.fim)) : ''}</dd></div>
    ${e.local ? `<div class="ex-linha"><dt>${esc(t('safra.local'))}</dt><dd>${esc(e.local)}</dd></div>` : ''}
    ${prods ? `<div class="ex-linha"><dt>${esc(t('anuncio.produtos'))}</dt><dd>${prods}</dd></div>` : ''}
    ${e.nota ? `<div class="ex-linha"><dt>${esc(t('safra.nota'))}</dt><dd>${conteudo(e, 'nota')}</dd></div>` : ''}
    ${e.link ? `<div class="ex-linha"><dt>${esc(t('safra.link'))}</dt><dd><a href="${esc(e.link)}" target="_blank" rel="noopener noreferrer">${texto(e.link)}</a></dd></div>` : ''}
  </dl>${souCancha() ? `<div class="acoes"><button class="btn leve perigo" data-act="remover" data-id="${esc(e.id)}">${esc(t('geral.tirar'))}</button>
    <button class="btn" data-act="editar" data-id="${esc(e.id)}">${esc(t('geral.editar'))}</button></div>` : ''}`;
}

function form(e) {
  const x = e || { tipo: 'feira', exemplo: false, produtos: [] };
  const prods = S.catalogo.produtos.map((p) => `<label class="check"><input type="checkbox" name="produtos" value="${p.id}" ${x.produtos?.includes(p.id) ? 'checked' : ''}> ${esc(p.nome)}</label>`).join('');
  return `<form class="form" data-form="evento" data-id="${esc(e?.id || '')}">
    <label class="rotulo" for="ev-tipo">${esc(t('safra.tipo'))}</label><select id="ev-tipo" name="tipo">${TIPOS.map((k) => `<option value="${k}" ${k === x.tipo ? 'selected' : ''}>${esc(t('evento.' + k))}</option>`).join('')}</select>
    <label class="rotulo" for="ev-nome">${esc(t('safra.nome'))}</label><input id="ev-nome" name="nome" value="${esc(x.nome || '')}" maxlength="150" required>
    <div class="duas"><div><label class="rotulo" for="ev-ini">${esc(t('rot.inicio'))}</label><input id="ev-ini" type="date" name="ini" value="${esc(x.ini || S.hoje)}" required></div>
    <div><label class="rotulo" for="ev-fim">${esc(t('rot.fim'))}</label><input id="ev-fim" type="date" name="fim" value="${esc(x.fim || '')}"></div></div>
    <label class="rotulo" for="ev-local">${esc(t('safra.local'))}</label><input id="ev-local" name="local" value="${esc(x.local || '')}" maxlength="150">
    <details class="caixa-prod" ${x.produtos?.length ? 'open' : ''}><summary class="rotulo">${esc(t('anuncio.produtos'))}</summary><div class="opcoes-linha">${prods}</div></details>
    <label class="rotulo" for="ev-nota">${esc(t('safra.nota'))}</label><textarea id="ev-nota" name="nota" rows="3" maxlength="1000">${esc(x.nota || '')}</textarea>
    <label class="rotulo" for="ev-link">${esc(t('safra.link'))}</label><input id="ev-link" name="link" type="url" value="${esc(x.link || '')}">
    <label class="check"><input type="checkbox" name="exemplo" ${x.exemplo ? 'checked' : ''}> ${esc(t('safra.marcar_exemplo'))}</label>
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('geral.salvar'))}</button></div></form>`;
}
const evento = (id) => S.dados.eventos.find((e) => e.id === id);

export const cliques = {
  ver: (el) => { const e = evento(el.dataset.id); janela(trNome(e), detalhe(e)); },
  novo: () => janela(t('safra.novo'), form(null), { larga: true }),
  editar: (el) => janela(t('geral.editar'), form(evento(el.dataset.id)), { larga: true }),
  remover: (el) => confirmar(t('safra.remover_confirma'), t('geral.tirar'), () => acao('evento-remover', { id: el.dataset.id }, { ok: t('geral.salvo') }), true),
};
export const formularios = {
  evento: (f) => {
    const fd = new FormData(f);
    acao('evento-salvar', { id: f.dataset.id || undefined, tipo: fd.get('tipo'), nome: fd.get('nome'), ini: fd.get('ini'), fim: fd.get('fim') || fd.get('ini'),
      local: fd.get('local'), produtos: fd.getAll('produtos'), nota: fd.get('nota'), link: fd.get('link'), exemplo: fd.get('exemplo') === 'on' }, { ok: t('geral.salvo') });
  },
};
