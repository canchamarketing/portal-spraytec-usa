// Início: como no portal do Brasil, três números no topo e a lista do que espera por quem entrou,
// juntando todas as seções. Depois, os anúncios no ar e os próximos eventos do ano safra.
import { t, tn, data, periodo, mesAno } from '../i18n.js';
import { esc, conteudo, eyebrow } from '../ui.js';
import { S, souCancha, souAprovador } from '../app.js';
import { rotacoesOrdenadas, anunciosDe, nomeRotacao, statusRotacao, cartaoAnuncio } from './comum.js';

const dias = (de, ate) => Math.round((Date.parse(ate) - Date.parse(de)) / 864e5);
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ROTA = { planos: 'planejamento/', roteiros: 'roteiro/', emails: 'email/', paginas: 'lp/' };
const nomeItem = (col, x) => (col === 'planos' ? mesAno(+x.mes.slice(0, 4), +x.mes.slice(5, 7)) : x.titulo);

// Tarefas de cada papel: [texto, link, botão, forte?, prazo?]
function tarefas() {
  const D = S.dados, L = [];
  const add = (txt, href, botao, forte = false, prazo = '') => L.push({ txt, href, botao, forte, prazo });
  const R = rotacoesOrdenadas();
  if (souAprovador()) {
    for (const r of R.filter((x) => x.status === 'aprovacao')) {
      const n = anunciosDe(r.id).filter((a) => a.origem === 'novo' && a.status === 'aprovacao').length;
      if (n) add(tn('inicio.aprovar', n, { prazo: data(r.prazo) }), '#/rotacao/' + r.id, t('inicio.revisar'), true, r.prazo);
    }
    for (const col of ['planos', 'roteiros', 'emails', 'paginas']) for (const x of D[col].filter((y) => y.status === 'aprovacao'))
      add(t('inicio.item_aprovar', { tipo: t('tipo.' + col), nome: nomeItem(col, x) }), '#/' + ROTA[col] + x.id, t('inicio.revisar'), true);
    for (const x of D.roteiros.filter((y) => y.status === 'corte')) add(t('inicio.video_aprovar', { nome: x.titulo }), '#/roteiro/' + x.id, t('inicio.revisar'), true);
    for (const f of D.feedbacks.filter((y) => y.status === 'respondido' && y.porId === S.eu.id)) add(t('inicio.fb_respondido'), '#/feedbacks/' + f.id, t('inicio.abrir'));
  }
  if (souCancha()) {
    for (const a of D.anuncios.filter((x) => x.status === 'ajuste')) add(t('inicio.ajustar', { titulo: a.titulo }), '#/anuncio/' + a.id, t('inicio.abrir'), true);
    for (const col of ['planos', 'roteiros', 'emails', 'paginas']) for (const x of D[col].filter((y) => y.status === 'ajuste'))
      add(t('inicio.ajustar', { titulo: nomeItem(col, x) }), '#/' + ROTA[col] + x.id, t('inicio.abrir'), true);
    for (const r of R.filter((x) => x.status === 'aprovada')) add(t('inicio.subir', { periodo: nomeRotacao(r) }), '#/rotacao/' + r.id, t('inicio.abrir'), true);
    for (const f of D.feedbacks.filter((x) => x.status === 'aberto')) add(t('inicio.fb_aberto', { nome: f.por }), '#/feedbacks/' + f.id, t('inicio.responder'), true);
    for (const x of D.roteiros.filter((y) => y.status === 'aprovado')) add(t('inicio.para_produtora', { nome: x.titulo }), '#/roteiro/' + x.id, t('inicio.abrir'), true);
    for (const x of D.emails.filter((y) => y.status === 'aprovado')) add(t('inicio.email_enviar', { nome: x.titulo }), '#/email/' + x.id, t('inicio.abrir'), false, x.envio);
    for (const x of D.paginas.filter((y) => y.status === 'aprovado')) add(t('inicio.lp_publicar', { nome: x.titulo }), '#/lp/' + x.id, t('inicio.abrir'), false, x.publicacao);
    for (const p of D.pedidos.filter((y) => y.status === 'aberto')) add(t('inicio.pedido', { nome: p.titulo }), '#/site/' + p.id, t('inicio.abrir'), false, p.prazo);
    for (const r of R.filter((x) => x.status === 'no_ar' && dias(S.hoje, x.fim) <= 2)) add(t('inicio.encerrar', { periodo: nomeRotacao(r) }), '#/rotacao/' + r.id, t('inicio.abrir'));
    const ultima = R[0];
    if (!ultima || (ultima.status === 'no_ar' && dias(S.hoje, ultima.fim) <= 7)) add(t('inicio.montar_proxima'), '#/rotacoes', t('inicio.abrir'));
    const prox = addDias(S.hoje.slice(0, 8) + '01', 40).slice(0, 7);
    if (!D.planos.some((p) => p.mes === prox) && Number(S.hoje.slice(8)) >= 15) add(t('inicio.plano_mes'), '#/planejamento', t('inicio.abrir'));
  }
  if (S.eu.papel === 'produtora') {
    for (const x of D.roteiros.filter((y) => y.status === 'producao')) add(t('inicio.gravar', { nome: x.titulo }), '#/roteiro/' + x.id, t('inicio.abrir'), true, x.prazo);
    for (const x of D.roteiros.filter((y) => y.status === 'ajuste_corte')) add(t('inicio.ajustar', { titulo: x.titulo }), '#/roteiro/' + x.id, t('inicio.abrir'), true, x.prazo);
  }
  return L;
}
// O que está com a outra parte (a Cancha acompanha o que espera a Spraytec).
function esperando() {
  if (!souCancha()) return [];
  const D = S.dados, L = [];
  for (const col of ['planos', 'roteiros', 'emails', 'paginas']) for (const x of D[col].filter((y) => y.status === 'aprovacao')) L.push({ txt: t('inicio.esperando_item', { tipo: t('tipo.' + col), nome: nomeItem(col, x) }), href: '#/' + ROTA[col] + x.id });
  for (const r of rotacoesOrdenadas().filter((x) => x.status === 'aprovacao')) {
    const n = anunciosDe(r.id).filter((a) => a.origem === 'novo' && a.status === 'aprovacao').length;
    if (n) L.push({ txt: tn('inicio.esperando_cliente', n, { prazo: data(r.prazo) }), href: '#/rotacao/' + r.id });
  }
  for (const x of D.roteiros.filter((y) => y.status === 'producao')) L.push({ txt: t('inicio.com_produtora', { nome: x.titulo }), href: '#/roteiro/' + x.id });
  return L;
}

export function render() {
  const nome = S.eu.nome.split(' ')[0];
  const T = tarefas(), E = esperando();
  const prazos = T.map((x) => x.prazo).filter(Boolean).sort();
  const atrasados = prazos.filter((p) => p < S.hoje).length;
  const kpis = `<div class="kpis"><div class="kpi"><span class="v">${T.length}</span><span class="l">${esc(t(S.eu.papel === 'leitor' ? 'inicio.kpi_em_andamento' : 'inicio.kpi_tarefas'))}</span></div>
    <div class="kpi"><span class="v">${prazos[0] ? esc(data(prazos[0]).slice(0, 5)) : '—'}</span><span class="l">${esc(t('inicio.kpi_prazo'))}</span></div>
    <div class="kpi"><span class="v">${atrasados}</span><span class="l">${esc(t('inicio.kpi_atrasados'))}</span></div></div>`;
  const lista = (L, vazio) => (L.length ? `<ul class="tarefas">${L.map((x) => `<li class="${x.forte ? 'forte' : ''}"><span>${esc(x.txt)}${x.prazo ? ` <span class="data${x.prazo < S.hoje ? ' prazo-vencido' : ''}">· ${esc(data(x.prazo))}</span>` : ''}</span>
    <a class="btn ${x.forte ? 'forte' : ''}" href="${x.href}">${esc(x.botao || t('inicio.abrir'))}</a></li>`).join('')}</ul>` : `<p class="tudo-certo">✓ ${esc(t(vazio))}</p>`);

  if (S.eu.papel === 'produtora') {
    return `<div class="pagina"><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('inicio.ola', { nome }))}</span></h1>${kpis}
      <section class="bloco"><h2>${esc(t('inicio.para_voce'))}</h2>${lista(T, 'inicio.nada_produtora')}<p class="dica">${esc(t('inicio.produtora'))}</p>
      <p><a class="btn" href="#/roteiros">${esc(t('nav.roteiros'))}</a> <a class="btn" href="#/produtos">${esc(t('nav.produtos'))}</a></p></section></div>`;
  }
  const R = rotacoesOrdenadas();
  const noAr = R.find((r) => r.status === 'no_ar');
  const proximos = S.dados.eventos.filter((e) => e.fim >= S.hoje && e.ini <= addDias(S.hoje, 120) && e.tipo !== 'fase').sort((a, b) => a.ini.localeCompare(b.ini)).slice(0, 6);
  const fase = S.dados.eventos.find((e) => e.tipo === 'fase' && e.ini <= S.hoje && e.fim >= S.hoje);
  return `<div class="pagina">
    <p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('inicio.ola', { nome }))}</span></h1>
    <p class="explica">${esc(t('inicio.hoje', { data: data(S.hoje) }))}${fase ? ' · ' + esc(t('inicio.fase')) + ' ' : ''}${fase ? `<b>${conteudo(fase, 'nome')}</b>` : ''}</p>
    ${kpis}
    <section class="bloco"><h2>${esc(souAprovador() ? t('inicio.para_voce') : souCancha() ? t('inicio.para_cancha') : t('inicio.resumo'))}</h2>${lista(T, 'inicio.nada')}</section>
    ${E.length ? `<section class="bloco"><h2>${esc(t('inicio.com_outros'))}</h2><ul class="tarefas">${E.map((x) => `<li class="espera"><span>${esc(x.txt)}</span><a class="btn" href="${x.href}">${esc(t('inicio.abrir'))}</a></li>`).join('')}</ul></section>` : ''}
    ${noAr ? `<section class="bloco"><h2>${esc(t('inicio.no_ar'))} <a class="miudo" href="#/rotacao/${esc(noAr.id)}">${esc(nomeRotacao(noAr))}</a> ${statusRotacao(noAr)}</h2>
      <div class="faixa-anuncios">${anunciosDe(noAr.id).map(cartaoAnuncio).join('')}</div></section>` : ''}
    <section class="bloco"><h2>${esc(t('inicio.proximos'))} <a class="miudo" href="#/safra">${esc(t('inicio.ver_calendario'))}</a></h2>
      ${proximos.length ? `<ul class="agenda">${proximos.map((e) => `<li><span class="quando">${esc(periodo(e.ini, e.fim))}</span><span class="tipo t-${esc(e.tipo)}">${esc(t('evento.' + e.tipo))}</span>
        <span>${conteudo(e, 'nome')}${e.local ? ` <small>· ${esc(e.local)}</small>` : ''}</span>${e.exemplo ? `<span class="selo exemplo">${esc(t('exemplo.selo'))}</span>` : ''}</li>`).join('')}</ul>`
        : `<p class="vazio">${esc(t('inicio.sem_eventos'))}</p>`}</section>
  </div>`;
}
