// Início: o que precisa da atenção de quem entrou, a rotação no ar e os próximos eventos.
import { t, tn, data, periodo } from '../i18n.js';
import { esc, conteudo } from '../ui.js';
import { S, souCancha, souAprovador } from '../app.js';
import { rotacoesOrdenadas, anunciosDe, nomeRotacao, statusRotacao, cartaoAnuncio } from './comum.js';

const dias = (de, ate) => Math.round((Date.parse(ate) - Date.parse(de)) / 864e5);

export function render() {
  const nome = S.eu.nome.split(' ')[0];
  if (S.eu.papel === 'produtora') {
    return `<div class="pagina"><h1>${esc(t('inicio.ola', { nome }))}</h1><section class="bloco"><p>${esc(t('inicio.produtora'))}</p>
      <p><a class="btn" href="#/produtos">${esc(t('nav.produtos'))}</a></p></section></div>`;
  }
  const R = rotacoesOrdenadas(), A = S.dados.anuncios;
  const noAr = R.find((r) => r.status === 'no_ar');
  const tarefas = [];
  if (souAprovador()) {
    for (const r of R.filter((x) => x.status === 'aprovacao')) {
      const n = anunciosDe(r.id).filter((a) => a.origem === 'novo' && a.status === 'aprovacao').length;
      if (n) tarefas.push({ forte: true, txt: tn('inicio.aprovar', n, { prazo: data(r.prazo) }), href: '#/rotacao/' + r.id, botao: t('inicio.revisar') });
    }
  }
  if (souCancha()) {
    for (const a of A.filter((x) => x.status === 'ajuste')) tarefas.push({ forte: true, txt: t('inicio.ajustar', { titulo: a.titulo }), href: '#/anuncio/' + a.id, botao: t('inicio.abrir') });
    for (const r of R.filter((x) => x.status === 'aprovada')) tarefas.push({ forte: true, txt: t('inicio.subir', { periodo: nomeRotacao(r) }), href: '#/rotacao/' + r.id, botao: t('inicio.abrir') });
    for (const r of R.filter((x) => x.status === 'no_ar' && dias(S.hoje, x.fim) <= 2)) tarefas.push({ txt: t('inicio.encerrar', { periodo: nomeRotacao(r) }), href: '#/rotacao/' + r.id, botao: t('inicio.abrir') });
    const ultima = R[0];
    if (!ultima || (ultima.status === 'no_ar' && dias(S.hoje, ultima.fim) <= 7)) tarefas.push({ txt: t('inicio.montar_proxima'), href: '#/rotacoes', botao: t('inicio.abrir') });
    for (const r of R.filter((x) => x.status === 'aprovacao')) {
      const n = anunciosDe(r.id).filter((a) => a.origem === 'novo' && a.status === 'aprovacao').length;
      if (n) tarefas.push({ txt: tn('inicio.esperando_cliente', n, { prazo: data(r.prazo) }), href: '#/rotacao/' + r.id, botao: t('inicio.abrir'), espera: true });
    }
    const rasc = A.filter((x) => x.status === 'rascunho').length;
    if (rasc) tarefas.push({ txt: tn('inicio.rascunhos', rasc), href: '#/rotacoes', botao: t('inicio.abrir') });
  }
  const proximos = S.dados.eventos.filter((e) => e.fim >= S.hoje && e.ini <= addDias(S.hoje, 120) && e.tipo !== 'fase').sort((a, b) => a.ini.localeCompare(b.ini)).slice(0, 6);
  const fase = S.dados.eventos.find((e) => e.tipo === 'fase' && e.ini <= S.hoje && e.fim >= S.hoje);

  return `<div class="pagina">
    <h1>${esc(t('inicio.ola', { nome }))}</h1>
    <p class="explica">${esc(t('inicio.hoje', { data: data(S.hoje) }))}${fase ? ' · ' + esc(t('inicio.fase')) + ' ' : ''}${fase ? `<b>${conteudo(fase, 'nome')}</b>` : ''}</p>
    <section class="bloco"><h2>${esc(souAprovador() ? t('inicio.para_voce') : souCancha() ? t('inicio.para_cancha') : t('inicio.resumo'))}</h2>
      ${tarefas.length ? `<ul class="tarefas">${tarefas.map((x) => `<li class="${x.forte ? 'forte' : ''}${x.espera ? ' espera' : ''}"><span>${esc(x.txt)}</span><a class="btn ${x.forte ? 'forte' : ''}" href="${x.href}">${esc(x.botao)}</a></li>`).join('')}</ul>`
        : `<p class="tudo-certo">✓ ${esc(t('inicio.nada'))}</p>`}</section>
    ${noAr ? `<section class="bloco"><h2>${esc(t('inicio.no_ar'))} <a class="miudo" href="#/rotacao/${esc(noAr.id)}">${esc(nomeRotacao(noAr))}</a> ${statusRotacao(noAr)}</h2>
      <div class="faixa-anuncios">${anunciosDe(noAr.id).map(cartaoAnuncio).join('')}</div></section>` : ''}
    <section class="bloco"><h2>${esc(t('inicio.proximos'))} <a class="miudo" href="#/safra">${esc(t('inicio.ver_calendario'))}</a></h2>
      ${proximos.length ? `<ul class="agenda">${proximos.map((e) => `<li><span class="quando">${esc(periodo(e.ini, e.fim))}</span><span class="tipo t-${esc(e.tipo)}">${esc(t('evento.' + e.tipo))}</span>
        <span>${conteudo(e, 'nome')}${e.local ? ` <small>· ${esc(e.local)}</small>` : ''}</span>${e.exemplo ? `<span class="selo exemplo">${esc(t('exemplo.selo'))}</span>` : ''}</li>`).join('')}</ul>`
        : `<p class="vazio">${esc(t('inicio.sem_eventos'))}</p>`}</section>
  </div>`;
}
function addDias(iso, n) { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
