// Rotação de anúncios: lista das rotações e a tela de cada uma (continuam, saem, entram).
import { t, tn, data } from '../i18n.js';
import { esc, janela, confirmar, comentarios, historico, conteudo, exemplo, ajuda, toast } from '../ui.js';
import { S, acao, ir, souCancha, souAprovador } from '../app.js';
import {
  rotacao, anunciosDe, nomeRotacao, rotacoesOrdenadas, cartaoAnuncio, passos, statusRotacao, motivoSaida, SEMAFOROS, BOLA, semaforo,
} from './comum.js';
import { formAnuncio, salvarAnuncio, mudouCanal } from './anuncio.js';

const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const novosPendentes = (rid) => anunciosDe(rid).filter((a) => a.origem === 'novo' && a.status === 'aprovacao');

export function render(params) {
  return params[0] ? tela(params[0]) : lista();
}

// ---------- lista ----------
function lista() {
  const R = rotacoesOrdenadas();
  const ativas = R.filter((r) => r.status !== 'encerrada'), antigas = R.filter((r) => r.status === 'encerrada');
  const cartao = (r) => {
    const L = anunciosDe(r.id);
    const pend = novosPendentes(r.id).length;
    return `<a class="cartao-rotacao" href="#/rotacao/${esc(r.id)}">
      <span class="topo"><b>${esc(nomeRotacao(r))}</b>${statusRotacao(r)}</span>
      ${r.foco ? `<span class="foco">${conteudo(r, 'foco')}</span>` : ''}
      <span class="miudo">${esc(tn('rot.n_anuncios', L.length))}${pend ? ' · ' + esc(tn('rot.n_esperando', pend)) : ''}</span></a>`;
  };
  return `<div class="pagina">
    <header class="cab"><div><h1>${esc(t('nav.rotacoes'))}</h1><p class="explica">${esc(t('rot.explica'))}</p></div>
    ${souCancha() ? `<button class="btn forte" data-act="nova">${esc(t('rot.nova'))}</button>` : ''}</header>
    ${S.demo ? `<p class="aviso-exemplo">${exemplo()} ${esc(t('rot.demo_aviso'))}</p>` : ''}
    <section><h2>${esc(t('rot.atuais'))}</h2>${ativas.length ? `<div class="grade-rot">${ativas.map(cartao).join('')}</div>` : `<p class="vazio">${esc(t('rot.nenhuma'))}</p>`}</section>
    ${antigas.length ? `<section><h2>${esc(t('rot.anteriores'))}</h2><div class="grade-rot">${antigas.map(cartao).join('')}</div></section>` : ''}
  </div>`;
}

// ---------- uma rotação ----------
function tela(id) {
  const r = rotacao(id);
  if (!r) return `<div class="pagina"><p class="erro-tela">${esc(t('erro.nao_encontrado'))}</p><a href="#/rotacoes">${esc(t('geral.voltar'))}</a></div>`;
  const L = anunciosDe(r.id);
  const continuam = L.filter((a) => a.origem === 'continua'), entram = L.filter((a) => a.origem === 'novo');
  const pend = novosPendentes(r.id).length;
  const papel = souCancha() ? 'cancha' : 'cliente';
  // Em aprovação sem nada esperando a Spraytec: o que falta são ajustes que a Cancha está fazendo.
  const ajustes = entram.filter((a) => a.status === 'ajuste' || a.status === 'ajustando').length;
  const fase = r.status === 'aprovacao' && !pend && ajustes ? 'ajustes' : r.status;
  const frase = t(`rot.frase.${fase}.${papel}`, { prazo: data(r.prazo), n: fase === 'ajustes' ? ajustes : pend, ini: data(r.ini) });

  const botoes = [];
  if (souCancha() && !['no_ar', 'encerrada'].includes(r.status)) {
    botoes.push(`<button class="btn" data-act="novo-anuncio" data-id="${esc(r.id)}">+ ${esc(t('rot.novo_anuncio'))}</button>`);
    const prontos = entram.filter((a) => ['rascunho', 'ajuste'].includes(a.status)).length;
    if (prontos) botoes.push(`<button class="btn forte" data-act="enviar" data-id="${esc(r.id)}">${esc(tn('rot.enviar_n', prontos))}</button>`);
    const podeNoAr = L.length && !L.some((a) => ['rascunho', 'aprovacao', 'ajuste'].includes(a.status));
    if (podeNoAr) botoes.push(`<button class="btn forte" data-act="no-ar" data-id="${esc(r.id)}">${esc(t('rot.marcar_no_ar'))}</button>`);
  }
  if (souCancha() && r.status === 'no_ar') botoes.push(`<button class="btn forte" data-act="encerrar" data-id="${esc(r.id)}">${esc(t('rot.encerrar'))}</button>`);
  if (souCancha() && r.status !== 'encerrada') botoes.push(`<button class="btn leve" data-act="editar" data-id="${esc(r.id)}">${esc(t('rot.editar'))}</button>`);
  if (souAprovador() && pend) {
    const primeiro = novosPendentes(r.id)[0];
    botoes.push(`<a class="btn forte" href="#/anuncio/${esc(primeiro.id)}">${esc(t('rot.revisar_um_a_um'))}</a>`);
    botoes.push(`<button class="btn" data-act="aprovar-todos" data-id="${esc(r.id)}">${esc(tn('rot.aprovar_todos', pend))}</button>`);
  }

  const col = (titulo, dica, conteudoCol, classe) => `<section class="coluna ${classe}"><h2>${titulo}</h2><p class="dica">${esc(dica)}</p>${conteudoCol}</section>`;
  const vazio = (k) => `<p class="vazio">${esc(t(k))}</p>`;
  const saem = (r.saem || []).map((s) => `<div class="cartao-sai"><b>${esc(s.titulo)}</b><p>${motivoSaida(s)}</p>
    ${S.dados.anuncios.some((a) => a.id === s.anuncioId) ? `<a href="#/anuncio/${esc(s.anuncioId)}" class="miudo">${esc(t('rot.ver_anuncio'))}</a>` : ''}</div>`).join('');

  return `<div class="pagina">
    <nav class="trilha"><a href="#/rotacoes">← ${esc(t('nav.rotacoes'))}</a></nav>
    <header class="cab"><div><h1>${esc(t('rot.titulo', { periodo: nomeRotacao(r) }))} ${statusRotacao(r)}</h1>
      <p class="explica">${esc(t('rot.explica_curta'))}</p></div></header>
    ${passos(r)}
    <div class="frase-etapa" role="status">${esc(frase)}</div>
    ${botoes.length ? `<div class="barra-acoes">${botoes.join('')}</div>` : ''}
    <div class="info-rot">
      <div><span class="rotulo">${esc(t('rot.periodo'))}</span>${esc(data(r.ini))} → ${esc(data(r.fim))}</div>
      <div><span class="rotulo">${esc(t('rot.prazo'))} ${ajuda('rot.prazo.ajuda')}</span>${esc(data(r.prazo))}</div>
      ${r.noArEm ? `<div><span class="rotulo">${esc(t('rot.no_ar_desde'))}</span>${esc(data(r.noArEm))}</div>` : ''}
      ${r.foco ? `<div class="foco-rot"><span class="rotulo">${esc(t('rot.foco'))}</span>${conteudo(r, 'foco')}</div>` : ''}
    </div>
    ${r.status === 'encerrada' ? resumoFinal(r, L) : ''}
    <div class="colunas">
      ${col(`✅ ${esc(t('rot.continuam'))} <span class="n">${continuam.length}</span>`, t('rot.continuam.dica'), continuam.length ? continuam.map(cartaoAnuncio).join('') : vazio('rot.continuam.vazio'), 'c-continuam')}
      ${col(`⏹ ${esc(t('rot.saem'))} <span class="n">${(r.saem || []).length}</span>`, t('rot.saem.dica'), saem || vazio('rot.saem.vazio'), 'c-saem')}
      ${col(`✨ ${esc(t('rot.entram'))} <span class="n">${entram.length}</span>`, t('rot.entram.dica'), entram.length ? entram.map(cartaoAnuncio).join('') : vazio('rot.entram.vazio'), 'c-entram')}
    </div>
    ${comentarios(r.comentarios, { ref: 'r:' + r.id, podeComentar: souCancha() || souAprovador(), souCancha: souCancha(), mencionaveis: S.mencionaveis })}
    <section class="bloco"><details><summary><h3 class="inline">${esc(t('hist.titulo'))}</h3></summary>${historico(r.hist)}</details></section>
    ${souCancha() && r.status === 'montando' && !L.some((a) => a.enviado) ? `<p class="rodape-acoes"><button class="link perigo" data-act="remover" data-id="${esc(r.id)}">${esc(t('rot.remover'))}</button></p>` : ''}
  </div>`;
}

function resumoFinal(r, L) {
  const cont = { bem: 0, atencao: 0, cansado: 0 };
  L.forEach((a) => { if (a.semaforo) cont[a.semaforo]++; });
  return `<section class="bloco resumo-final"><h3>${esc(t('rot.resultado'))}</h3>
    <p class="semaforos">${SEMAFOROS.map((s) => `<span class="semaforo s-${s}">${BOLA[s]} ${esc(t('semaforo.' + s))}: <b>${cont[s]}</b></span>`).join(' ')}</p>
    ${r.resumo ? `<p>${conteudo(r, 'resumo')}</p>` : ''}</section>`;
}

// ---------- formulários ----------
function formRotacao(r) {
  const R = rotacoesOrdenadas();
  const anterior = r ? null : R[0];
  const ini = r ? r.ini : anterior ? addDias(anterior.fim, 1) : S.hoje;
  const fim = r ? r.fim : addDias(ini, 13);
  const decisoes = anterior ? anunciosDe(anterior.id).filter((a) => ['no_ar', 'aprovado', 'continua', 'encerrado'].includes(a.status)) : [];
  const linhaDecisao = (a) => {
    const sai = a.semaforo === 'cansado';
    return `<li class="decisao"><div class="dec-topo"><b>${esc(a.titulo)}</b> ${semaforo(a)}</div>
      <div class="opcoes-dec" role="radiogroup" aria-label="${esc(a.titulo)}">
        <label><input type="radio" name="d-${esc(a.id)}" value="fica" ${sai ? '' : 'checked'} data-mudou="decisao"> ${esc(t('rot.dec.fica'))}</label>
        <label><input type="radio" name="d-${esc(a.id)}" value="sai" ${sai ? 'checked' : ''} data-mudou="decisao"> ${esc(t('rot.dec.sai'))}</label></div>
      <input name="m-${esc(a.id)}" class="motivo" placeholder="${esc(t('rot.dec.motivo'))}" value="${esc(sai ? a.semaforoMotivo || '' : '')}" ${sai ? '' : 'hidden'} maxlength="500"></li>`;
  };
  return `<form data-form="${r ? 'editar' : 'nova'}" class="form" ${r ? `data-id="${esc(r.id)}"` : ''}>
    <div class="duas"><div><label class="rotulo" for="f-ini">${esc(t('rot.inicio'))}</label><input id="f-ini" type="date" name="ini" value="${esc(ini)}" required></div>
    <div><label class="rotulo" for="f-fim">${esc(t('rot.fim'))}</label><input id="f-fim" type="date" name="fim" value="${esc(fim)}" required></div></div>
    <label class="rotulo" for="f-prazo">${esc(t('rot.prazo'))}</label><input id="f-prazo" type="date" name="prazo" value="${esc(r?.prazo || '')}">
    <p class="dica">${esc(t('rot.prazo.vazio'))}</p>
    <label class="rotulo" for="f-foco">${esc(t('rot.foco'))}</label><textarea id="f-foco" name="foco" rows="3" maxlength="1000" placeholder="${esc(t('rot.foco.exemplo'))}">${esc(r?.foco || '')}</textarea>
    ${anterior ? `<input type="hidden" name="anteriorId" value="${esc(anterior.id)}"><h3>${esc(t('rot.dec.titulo', { periodo: nomeRotacao(anterior) }))}</h3>
      <p class="dica">${esc(t('rot.dec.dica'))}</p>${decisoes.length ? `<ul class="decisoes">${decisoes.map(linhaDecisao).join('')}</ul>` : `<p class="vazio">${esc(t('rot.dec.nenhum'))}</p>`}` : ''}
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(r ? t('geral.salvar') : t('rot.criar'))}</button></div></form>`;
}

function formEncerrar(r) {
  const L = anunciosDe(r.id);
  return `<form data-form="encerrar" data-id="${esc(r.id)}" class="form"><p class="dica">${esc(t('rot.enc.dica'))}</p>
    <ul class="decisoes">${L.map((a) => `<li class="decisao"><b>${esc(a.titulo)}</b>
      <div class="opcoes-dec">${SEMAFOROS.map((s) => `<label><input type="radio" name="s-${esc(a.id)}" value="${s}" required> ${BOLA[s]} ${esc(t('semaforo.' + s))}</label>`).join('')}</div>
      <input name="m-${esc(a.id)}" class="motivo" placeholder="${esc(t('rot.enc.motivo'))}" maxlength="500"></li>`).join('')}</ul>
    <label class="rotulo" for="f-resumo">${esc(t('rot.enc.resumo'))}</label><textarea id="f-resumo" name="resumo" rows="3" maxlength="3000"></textarea>
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('rot.encerrar'))}</button></div></form>`;
}

export const cliques = {
  nova: () => janela(t('rot.nova'), formRotacao(null), { larga: true }),
  editar: (el) => janela(t('rot.editar'), formRotacao(rotacao(el.dataset.id)), { larga: true }),
  'novo-anuncio': (el) => formAnuncio(null, el.dataset.id),
  enviar: (el) => {
    const r = rotacao(el.dataset.id);
    const n = anunciosDe(r.id).filter((a) => a.origem === 'novo' && ['rascunho', 'ajuste'].includes(a.status)).length;
    confirmar(t('rot.enviar_confirma', { n, prazo: data(r.prazo) }), t('rot.enviar_botao'), () => acao('anuncio-enviar', { rotacaoId: r.id }, { ok: t('rot.enviado_ok') }));
  },
  'no-ar': (el) => {
    const r = rotacao(el.dataset.id);
    const j = janela(t('rot.marcar_no_ar'), `<form class="form" data-form="no-ar" data-id="${esc(r.id)}"><p>${esc(t('rot.no_ar_explica'))}</p>
      <label class="rotulo" for="f-data">${esc(t('rot.no_ar_data'))}</label><input id="f-data" type="date" name="data" value="${esc(r.ini <= S.hoje ? S.hoje : r.ini)}" required>
      <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('rot.marcar_no_ar'))}</button></div></form>`);
    return j;
  },
  encerrar: (el) => janela(t('rot.encerrar'), formEncerrar(rotacao(el.dataset.id)), { larga: true }),
  'aprovar-todos': (el) => {
    const r = rotacao(el.dataset.id), n = novosPendentes(r.id).length;
    confirmar(t('rot.aprovar_todos_confirma', { n }), tn('rot.aprovar_todos', n), () => acao('rotacao-aprovar-todos', { id: r.id }, { ok: t('rot.aprovados_ok') }));
  },
  remover: (el) => confirmar(t('rot.remover_confirma'), t('rot.remover'), async () => { if (await acao('rotacao-remover', { id: el.dataset.id })) ir('rotacoes'); }, true),
};

export const mudancas = {
  canal: mudouCanal,
  // "Sai" mostra o campo do motivo.
  decisao: (el) => {
    const li = el.closest('.decisao'), m = li.querySelector('.motivo');
    m.hidden = el.value !== 'sai' || !el.checked;
  },
};

export const formularios = {
  anuncio: salvarAnuncio,
  nova: async (f) => {
    const fd = new FormData(f);
    const decisoes = {};
    f.querySelectorAll('.decisao').forEach((li) => {
      const r = li.querySelector('input[type=radio]:checked');
      if (!r) return;
      const id = r.name.slice(2);
      decisoes[id] = { fica: r.value === 'fica', motivo: li.querySelector('.motivo').value };
    });
    const res = await acao('rotacao-criar', { ini: fd.get('ini'), fim: fd.get('fim'), prazo: fd.get('prazo') || undefined, foco: fd.get('foco'), anteriorId: fd.get('anteriorId') || undefined, decisoes }, { ok: t('rot.criada_ok') });
    if (res?.criado) ir('rotacao/' + res.criado);
  },
  editar: (f) => {
    const fd = new FormData(f);
    acao('rotacao-editar', { id: f.dataset.id, ini: fd.get('ini'), fim: fd.get('fim'), prazo: fd.get('prazo') || undefined, foco: fd.get('foco') }, { ok: t('geral.salvo') });
  },
  'no-ar': (f) => acao('rotacao-no-ar', { id: f.dataset.id, data: new FormData(f).get('data') }, { ok: t('rot.no_ar_ok') }),
  encerrar: (f) => {
    const fd = new FormData(f), avaliacoes = {};
    for (const a of anunciosDe(f.dataset.id)) avaliacoes[a.id] = { semaforo: fd.get('s-' + a.id), motivo: fd.get('m-' + a.id) };
    const falta = Object.values(avaliacoes).find((x) => x.semaforo && x.semaforo !== 'bem' && !String(x.motivo || '').trim());
    if (falta) { toast(t('rot.enc.falta_motivo'), 'ruim'); return; }
    acao('rotacao-encerrar', { id: f.dataset.id, avaliacoes, resumo: fd.get('resumo') }, { ok: t('rot.encerrada_ok') });
  },
};

