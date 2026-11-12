// Itens com aprovação: plano do mês, roteiro de vídeo, e-mail e landing page.
// Mesmo fluxo dos anúncios: rascunho → aprovação → aprovado | ajuste (versão nova), com checklist e números.
import { t, tem, data, dataHora, num, pct, moeda, mesAno } from '../i18n.js';
import { esc, texto, janela, confirmar, comentarios, historico, conteudo, selo, eyebrow, ajuda, toast } from '../ui.js';
import { S, acao, ir, souCancha, souAprovador } from '../app.js';
import { nomeProduto } from './comum.js';

// Campos de cada tipo (os mesmos do servidor, em server/modulos.ts).
export const CAMPOS = {
  planos: [['foco', 'longo', true], ['verbaMeta', 'numero'], ['verbaGoogle', 'numero'], ['produtos', 'produtos'], ['eventos', 'longo'], ['notas', 'longo']],
  roteiros: [['titulo', 'texto', true], ['objetivo', 'longo'], ['duracao', 'numero'], ['formato', 'escolha', false, ['vertical', 'horizontal', 'quadrado']], ['produtos', 'produtos'],
    ['roteiro', 'roteiro', true], ['referencias', 'longo'], ['prazo', 'data']],
  emails: [['titulo', 'texto', true], ['assunto', 'texto', true], ['preheader', 'texto'], ['lista', 'texto'], ['envio', 'data'], ['linkPrevia', 'link'], ['produtos', 'produtos'], ['notas', 'longo']],
  paginas: [['titulo', 'texto', true], ['url', 'link'], ['objetivo', 'longo'], ['produtos', 'produtos'], ['publicacao', 'data'], ['notas', 'longo']],
};
export const CHECKLIST = {
  emails: ['lista', 'assunto', 'links', 'utm', 'teste', 'descadastro', 'celular'],
  paginas: ['pixel_meta', 'tag_google', 'conversao', 'formulario', 'salesforce', 'celular', 'velocidade'],
};
export const ROTA = { planos: 'planejamento', roteiros: 'roteiro', emails: 'email', paginas: 'lp' };
export const LISTA = { planos: 'planejamento', roteiros: 'roteiros', emails: 'emails', paginas: 'site' };
export const PREF = { planos: 'p', roteiros: 'v', emails: 'e', paginas: 'l' };
export const acharItem = (col, id) => S.dados[col].find((x) => x.id === id);
export const statusItem = (x) => `<span class="pill xs-${esc(x.status)}"><i></i>${esc(t('st_item.' + x.status))}</span>`;
export const nomeMes = (ym) => mesAno(+ym.slice(0, 4), +ym.slice(5, 7));
const nome = (col, x) => (col === 'planos' ? nomeMes(x.mes) : x.titulo);

// ---------- página de um item ----------
export function paginaItem(col, id) {
  const x = acharItem(col, id);
  if (!x) return `<div class="pagina"><p class="erro-tela">${esc(t('erro.nao_encontrado'))}</p><a href="#/${LISTA[col]}">${esc(t('geral.voltar'))}</a></div>`;
  return `<div class="pagina">
    <nav class="trilha"><a href="#/${LISTA[col]}">← ${esc(t('nav.' + LISTA[col]))}</a></nav>
    <p class="eyebrow">${esc(t('tipo.' + col))}${x.versao > 1 ? ' · ' + esc(t('anuncio.versao', { n: x.versao })) : ''}</p>
    <header class="cab"><div><h1><span class="marca-texto">${esc(nome(col, x))}</span> ${statusItem(x)}</h1></div></header>
    ${caixaStatus(col, x)}
    ${col === 'roteiros' ? blocoVideo(x) : ''}
    <section class="bloco">${corpoItem(col, x)}</section>
    ${CHECKLIST[col] ? blocoChecklist(col, x) : ''}
    ${['emails', 'paginas'].includes(col) ? blocoResultado(col, x) : ''}
    ${comentarios(x.comentarios, { ref: PREF[col] + ':' + x.id, podeComentar: souCancha() || souAprovador() || (S.eu.papel === 'produtora' && col === 'roteiros'), souCancha: souCancha(), mencionaveis: S.mencionaveis })}
    <section class="bloco"><details><summary><h3 class="inline">${esc(t('hist.titulo'))}</h3></summary>${historico(x.hist)}</details></section>
    ${acoesCancha(col, x)}
  </div>`;
}

// Caixa de aprovação (Spraytec) ou de situação (todos).
export function caixaStatus(col, x) {
  if (souAprovador() && x.status === 'aprovacao') {
    return `<section class="caixa-aprovar"><h2>${esc(t('ap.titulo'))}</h2><p>${esc(t('item.ap_explica.' + col))}</p>
      <div class="ap-botoes"><button class="btn aprovar" data-act="item-aprovar" data-col="${col}" data-id="${esc(x.id)}" data-v="${x.versao}">✓ ${esc(t('ap.aprovar'))}</button>
      <button class="btn ajustar" data-act="item-ajuste" data-col="${col}" data-id="${esc(x.id)}">✎ ${esc(t('ap.ajuste'))}</button></div></section>`;
  }
  if (x.status === 'aprovacao') return `<section class="caixa-status"><p>⏳ ${esc(t('item.esperando'))}</p></section>`;
  if (x.status === 'ajuste' && x.ajustePedido) return `<section class="caixa-status ajuste"><p><b>${esc(t('ap.ajuste_pedido', { nome: x.ajustePedido.por, quando: dataHora(x.ajustePedido.em) }))}</b></p>
    <blockquote>${conteudo(x.comentarios?.slice().reverse().find((c) => c.ajuste) || { texto: x.ajustePedido.texto })}</blockquote>
    <p class="miudo">${esc(souCancha() ? t('ap.ajuste_cancha') : t('ap.ajuste_cliente'))}</p></section>`;
  if (x.status === 'ajustando') return `<section class="caixa-status"><p>${esc(t('ap.ajustando'))}</p></section>`;
  if (x.status === 'rascunho') return `<section class="caixa-status"><p>${esc(t('ap.rascunho'))}</p></section>`;
  if (x.aprovadoPor) return `<section class="caixa-status ok"><p>✓ ${esc(t('ap.aprovado_em', { nome: x.aprovadoPor, quando: dataHora(x.aprovadoEm), v: x.aprovadoVersao || x.versao }))}</p></section>`;
  return '';
}

// Conteúdo do item, em palavras simples.
export function corpoItem(col, x) {
  const L = CAMPOS[col].map(([k, tipo]) => {
    let v = x[k];
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
    if (tipo === 'produtos') v = v.map((p) => `<a class="chip" href="#/produtos/${esc(p)}">${esc(nomeProduto(p))}</a>`).join(' ');
    else if (tipo === 'data') v = `<span class="data">${esc(data(v))}</span>`;
    else if (tipo === 'link') v = `<a href="${esc(v)}" target="_blank" rel="noopener noreferrer">${esc(v)}</a>`;
    else if (tipo === 'numero') v = k.startsWith('verba') ? esc(moeda(v)) : k === 'duracao' ? esc(t('item.segundos', { n: v })) : esc(num(v));
    else if (tipo === 'escolha') v = esc(t('item.' + k + '.' + v));
    else if (tipo === 'roteiro') return `<div class="ex-linha roteiro"><dt>${esc(t('campo.' + k))}</dt><dd><div class="texto-longo">${conteudo(x, k)}</div></dd></div>`;
    else v = conteudo(x, k);
    return `<div class="ex-linha"><dt>${esc(t('campo.' + k))}</dt><dd>${v}</dd></div>`;
  }).join('');
  const verba = col === 'planos' && (x.verbaMeta != null || x.verbaGoogle != null)
    ? `<div class="ex-linha"><dt>${esc(t('plano.verba_total'))}</dt><dd><b>${esc(moeda((x.verbaMeta || 0) + (x.verbaGoogle || 0)))}</b></dd></div>` : '';
  return `<dl class="ex">${L}${verba}</dl>${souCancha() && x.nota ? `<p class="interno-txt">${texto(x.nota)}</p>` : ''}`;
}

// ---------- checklist de publicação ----------
function blocoChecklist(col, x) {
  const L = CHECKLIST[col], feitos = L.filter((k) => x.checklist?.[k]).length;
  const pode = souCancha() && !['enviado', 'publicado'].includes(x.status);
  const linha = (k) => {
    const v = x.checklist?.[k];
    const quem = v ? `<small>✓ ${esc(v.por)} · ${esc(dataHora(v.em))}</small>` : `<small>${esc(t('check.' + col + '.' + k + '.dica'))}</small>`;
    return pode ? `<li><label><input type="checkbox" ${v ? 'checked' : ''} data-mudou="check" data-col="${col}" data-id="${esc(x.id)}" data-k="${k}"><span><b>${esc(t('check.' + col + '.' + k))}</b>${quem}</span></label></li>`
      : `<li class="so-ler">${v ? '✅' : '⬜'} <b>${esc(t('check.' + col + '.' + k))}</b>${quem}</li>`;
  };
  return `<section class="bloco"><h2>${esc(t('check.titulo.' + col))} <span class="miudo">${feitos}/${L.length}</span></h2>
    <div class="progresso"><span style="width:${(feitos / L.length) * 100}%"></span></div><p class="dica">${esc(t('check.explica.' + col))}</p>
    <ul class="checklist">${L.map(linha).join('')}</ul></section>`;
}

// ---------- números (e-mail e landing page) ----------
function blocoResultado(col, x) {
  if (!['enviado', 'publicado'].includes(x.status)) return '';
  const R = x.resultado;
  const origem = !R ? '' : R.origem === 'exemplo' ? selo('exemplo', t('exemplo.selo'), t('exemplo.dica')) : selo('manual', t('res.manual'), t('res.manual.dica'));
  const caixa = (k, v) => `<div class="num"><span class="rotulo">${esc(t('res.' + k))} ${ajuda('res.' + k + '.ajuda')}</span><b>${v}</b></div>`;
  let nums = '';
  if (R && col === 'emails') nums = caixa('enviados', num(R.enviados)) + caixa('abertura', pct(R.enviados ? R.aberturas / R.enviados : null)) + caixa('cliques', num(R.cliques))
    + caixa('taxa_clique', pct(R.enviados ? R.cliques / R.enviados : null)) + caixa('descadastros', num(R.descadastros));
  if (R && col === 'paginas') nums = caixa('visitas', num(R.visitas)) + caixa('conversoes', num(R.conversoes)) + caixa('taxa_conversao', pct(R.visitas ? R.conversoes / R.visitas : null));
  return `<section class="bloco"><h2>${esc(t('res.titulo'))} ${origem}</h2>${R ? `<div class="nums">${nums}</div>` : `<p class="vazio">${esc(t('res.sem'))}</p>`}
    <p class="dica">${esc(t(col === 'emails' ? 'res.brevo_dica' : 'res.ga4_dica'))}</p>
    ${souCancha() ? `<button class="btn leve" data-act="item-numeros" data-col="${col}" data-id="${esc(x.id)}">${esc(t('res.digitar'))}</button>` : ''}</section>`;
}

// ---------- vídeo (roteiro com a produtora) ----------
function blocoVideo(x) {
  if (!['producao', 'corte', 'ajuste_corte', 'entregue'].includes(x.status)) return '';
  const prod = S.eu.papel === 'produtora' || souCancha();
  const cortes = (x.cortes || []).slice().reverse().map((c) => `<li><b>${esc(t('video.versao', { n: c.versao }))}</b> · <span class="data">${esc(dataHora(c.em))}</span> · ${esc(c.por)}<br>
    <a href="${esc(c.link)}" target="_blank" rel="noopener noreferrer">${esc(t('video.abrir'))}</a>${c.nota ? ` — ${conteudo(c, 'nota')}` : ''}</li>`).join('');
  let acoes = '';
  if (souAprovador() && x.status === 'corte') acoes = `<div class="ap-botoes"><button class="btn aprovar" data-act="video-aprovar" data-id="${esc(x.id)}">✓ ${esc(t('video.aprovar'))}</button>
    <button class="btn ajustar" data-act="video-ajuste" data-id="${esc(x.id)}">✎ ${esc(t('ap.ajuste'))}</button></div>`;
  if (prod && ['producao', 'ajuste_corte'].includes(x.status)) acoes = `<button class="btn forte" data-act="video-enviar" data-id="${esc(x.id)}">${esc(t('video.enviar'))}</button>`;
  const frase = t('video.frase.' + x.status + '.' + (S.eu.papel === 'produtora' ? 'produtora' : souAprovador() ? 'aprovador' : 'cancha'), { prazo: x.prazo ? data(x.prazo) : '—' });
  return `<section class="${souAprovador() && x.status === 'corte' ? 'caixa-aprovar' : 'bloco'}"><h2>${esc(t('video.titulo'))}</h2><p>${esc(frase)}</p>
    ${cortes ? `<ul class="cortes">${cortes}</ul>` : ''}${acoes}
    ${x.videoAprovadoPor ? `<p class="caixa-status ok">✓ ${esc(t('video.aprovado_em', { nome: x.videoAprovadoPor, quando: dataHora(x.videoAprovadoEm), v: x.videoAprovadoVersao }))}</p>` : ''}</section>`;
}

// ---------- ações da Cancha ----------
function acoesCancha(col, x) {
  if (!souCancha()) return '';
  const B = [];
  const travado = { roteiros: ['producao', 'corte', 'ajuste_corte', 'entregue'], emails: ['enviado'], paginas: ['publicado'], planos: [] }[col];
  if (['rascunho', 'ajuste', 'aprovado'].includes(x.status) && !travado.includes(x.status)) B.push(`<button class="btn" data-act="item-editar" data-col="${col}" data-id="${esc(x.id)}">${esc(t('geral.editar'))}</button>`);
  if (['rascunho', 'ajuste'].includes(x.status)) B.push(`<button class="btn forte" data-act="item-enviar" data-col="${col}" data-id="${esc(x.id)}">${esc(t('anuncio.enviar'))}</button>`);
  if (col === 'roteiros' && x.status === 'aprovado') B.push(`<button class="btn forte" data-act="roteiro-produtora" data-id="${esc(x.id)}">${esc(t('video.para_produtora'))}</button>`);
  if (CHECKLIST[col] && x.status === 'aprovado') B.push(`<button class="btn forte" data-act="item-concluir" data-col="${col}" data-id="${esc(x.id)}">${esc(t('item.concluir.' + col))}</button>`);
  if (!x.enviado) B.push(`<button class="btn leve perigo" data-act="item-remover" data-col="${col}" data-id="${esc(x.id)}">${esc(t('item.apagar'))}</button>`);
  return B.length ? `<div class="barra-acoes rodape">${B.join('')}</div>` : '';
}

// ---------- formulário ----------
export function formItem(col, x, extra = {}) {
  const v = x || { produtos: [], ...extra };
  const campo = ([k, tipo, obrig, opcoes]) => {
    const id = 'fi-' + k, rot = `<label class="rotulo" for="${id}">${esc(t('campo.' + k))}${obrig ? ' *' : ''}</label>`;
    const dica = tem('dica.' + col + '.' + k) ? `<p class="dica">${esc(t('dica.' + col + '.' + k))}</p>` : '';
    if (tipo === 'longo' || tipo === 'roteiro') return rot + `<textarea id="${id}" name="${k}" rows="${tipo === 'roteiro' ? 14 : 3}" ${obrig ? 'required' : ''}>${esc(v[k] || '')}</textarea>` + dica;
    if (tipo === 'numero') return rot + `<input id="${id}" name="${k}" type="number" min="0" step="any" value="${v[k] ?? ''}">` + dica;
    if (tipo === 'data') return rot + `<input id="${id}" name="${k}" type="date" value="${esc(v[k] || '')}">` + dica;
    if (tipo === 'link') return rot + `<input id="${id}" name="${k}" type="url" value="${esc(v[k] || '')}" placeholder="https://…">` + dica;
    if (tipo === 'escolha') return rot + `<select id="${id}" name="${k}"><option value=""></option>${opcoes.map((o) => `<option value="${o}" ${v[k] === o ? 'selected' : ''}>${esc(t('item.' + k + '.' + o))}</option>`).join('')}</select>`;
    if (tipo === 'produtos') return `<details class="caixa-prod" ${v.produtos?.length ? 'open' : ''}><summary class="rotulo">${esc(t('campo.produtos'))}</summary><div class="opcoes-linha">${S.catalogo.produtos.map((p) =>
      `<label class="check"><input type="checkbox" name="produtos" value="${p.id}" ${v.produtos?.includes(p.id) ? 'checked' : ''}> ${esc(p.nome)}</label>`).join('')}</div></details>`;
    return rot + `<input id="${id}" name="${k}" value="${esc(v[k] || '')}" maxlength="200" ${obrig ? 'required' : ''}>` + dica;
  };
  janela(x ? t('geral.editar') : t('item.novo.' + col), `<form class="form" data-form="item" data-col="${col}" data-id="${esc(x?.id || '')}" data-mes="${esc(v.mes || '')}">
    ${x?.status === 'aprovado' ? `<p class="aviso">${esc(t('item.editar_aprovado'))}</p>` : ''}
    ${tem('form.' + col + '.dica') ? `<p class="dica">${esc(t('form.' + col + '.dica'))}</p>` : ''}
    ${CAMPOS[col].map(campo).join('')}
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('geral.salvar'))}</button></div></form>`,
  { larga: true, sobre: t('tipo.' + col) });
}
export async function salvarItem(f) {
  const col = f.dataset.col, fd = new FormData(f), d = { col, id: f.dataset.id || undefined };
  if (col === 'planos' && !d.id) d.mes = f.dataset.mes;
  for (const [k, tipo] of CAMPOS[col]) d[k] = tipo === 'produtos' ? fd.getAll('produtos') : fd.get(k);
  const r = await acao('item-salvar', d, { ok: t('geral.salvo') });
  if (r?.criado && col !== 'planos') ir(ROTA[col] + '/' + r.criado);
}

// ---------- cliques e formulários (usados por várias telas) ----------
const ajusteForm = (act, dataset) => janela(t('ap.ajuste'), `<form class="form" data-form="${act}" data-col="${esc(dataset.col || '')}" data-id="${esc(dataset.id)}"><p class="dica">${esc(t('ap.ajuste_dica'))}</p>
  <label class="rotulo" for="f-aj">${esc(t('ap.o_que_mudar'))}</label><textarea id="f-aj" name="texto" rows="5" maxlength="3000" required></textarea>
  <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('ap.ajuste_enviar'))}</button></div></form>`);

export const cliquesItem = {
  'item-aprovar': (el) => acao('item-aprovar', { col: el.dataset.col, id: el.dataset.id, versao: Number(el.dataset.v) }, { ok: t('ap.aprovado_ok') }),
  'item-ajuste': (el) => ajusteForm('item-ajuste', el.dataset),
  'item-editar': (el) => formItem(el.dataset.col, acharItem(el.dataset.col, el.dataset.id)),
  'item-enviar': (el) => confirmar(t('item.enviar_confirma'), t('anuncio.enviar'), () => acao('item-enviar', { col: el.dataset.col, id: el.dataset.id }, { ok: t('rot.enviado_ok') })),
  'item-remover': (el) => confirmar(t('item.apagar_confirma'), t('item.apagar'), async () => { if (await acao('item-remover', { col: el.dataset.col, id: el.dataset.id })) ir(LISTA[el.dataset.col]); }, true),
  'item-concluir': (el) => {
    const col = el.dataset.col;
    janela(t('item.concluir.' + col), `<form class="form" data-form="item-concluir" data-col="${col}" data-id="${esc(el.dataset.id)}"><p>${esc(t('item.concluir_explica.' + col))}</p>
      <label class="rotulo" for="f-dt">${esc(t('item.concluir_data'))}</label><input id="f-dt" type="date" name="data" value="${esc(S.hoje)}" required>
      <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('item.concluir.' + col))}</button></div></form>`);
  },
  'item-numeros': (el) => {
    const col = el.dataset.col, x = acharItem(col, el.dataset.id), R = x.resultado?.origem === 'manual' ? x.resultado : {};
    const ks = col === 'emails' ? ['enviados', 'aberturas', 'cliques', 'descadastros'] : ['visitas', 'conversoes'];
    janela(t('res.digitar'), `<form class="form" data-form="item-numeros" data-col="${col}" data-id="${esc(x.id)}"><p class="dica">${esc(t(col === 'emails' ? 'res.digitar_brevo' : 'res.digitar_ga4'))}</p>
      <div class="duas">${ks.map((k) => `<div><label class="rotulo" for="n-${k}">${esc(t('res.' + k))}</label><input id="n-${k}" name="${k}" type="number" min="0" value="${R[k] ?? ''}"></div>`).join('')}</div>
      <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('geral.salvar'))}</button></div></form>`);
  },
  'roteiro-produtora': (el) => {
    const x = acharItem('roteiros', el.dataset.id);
    janela(t('video.para_produtora'), `<form class="form" data-form="roteiro-produtora" data-id="${esc(x.id)}"><p>${esc(t('video.para_produtora_explica'))}</p>
      <label class="rotulo" for="f-pz">${esc(t('video.prazo'))}</label><input id="f-pz" type="date" name="prazo" value="${esc(x.prazo || '')}">
      <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('video.para_produtora'))}</button></div></form>`);
  },
  'video-enviar': (el) => janela(t('video.enviar'), `<form class="form" data-form="video-enviar" data-id="${esc(el.dataset.id)}"><p class="dica">${esc(t('video.enviar_dica'))}</p>
    <label class="rotulo" for="f-lk">${esc(t('campo.link_video'))}</label><input id="f-lk" name="link" type="url" required placeholder="https://drive.google.com/…">
    <label class="rotulo" for="f-nt">${esc(t('campo.nota'))}</label><textarea id="f-nt" name="nota" rows="2" maxlength="1000"></textarea>
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('video.enviar'))}</button></div></form>`),
  'video-aprovar': (el) => confirmar(t('video.aprovar_confirma'), t('video.aprovar'), () => acao('roteiro-aprovar-corte', { id: el.dataset.id }, { ok: t('ap.aprovado_ok') })),
  'video-ajuste': (el) => ajusteForm('video-ajuste', el.dataset),
};
export const formulariosItem = {
  item: salvarItem,
  'item-ajuste': (f) => acao('item-ajuste', { col: f.dataset.col, id: f.dataset.id, texto: new FormData(f).get('texto') }, { ok: t('ap.ajuste_ok') }),
  'item-concluir': (f) => acao('item-concluir', { col: f.dataset.col, id: f.dataset.id, data: new FormData(f).get('data') }, { ok: t('geral.salvo') }),
  'item-numeros': (f) => { const fd = new FormData(f); acao('item-resultado', { col: f.dataset.col, id: f.dataset.id, resultado: Object.fromEntries([...fd.entries()]) }, { ok: t('geral.salvo') }); },
  'roteiro-produtora': (f) => acao('roteiro-produtora', { id: f.dataset.id, prazo: new FormData(f).get('prazo') }, { ok: t('video.enviado_produtora') }),
  'video-enviar': (f) => { const fd = new FormData(f); acao('roteiro-corte', { id: f.dataset.id, link: fd.get('link'), nota: fd.get('nota') }, { ok: t('video.enviado_ok') }); },
  'video-ajuste': (f) => acao('roteiro-ajuste-corte', { id: f.dataset.id, texto: new FormData(f).get('texto') }, { ok: t('ap.ajuste_ok') }),
};
export const mudancasItem = {
  check: (el) => acao('item-checklist', { col: el.dataset.col, id: el.dataset.id, chave: el.dataset.k, feito: el.checked }),
};
// Tela "item" genérica (rotas #/roteiro/<id>, #/email/<id>, #/lp/<id>).
export const telaDe = (col) => ({ render: ([id]) => paginaItem(col, id), cliques: cliquesItem, formularios: formulariosItem, mudancas: mudancasItem });
export { eyebrow };
