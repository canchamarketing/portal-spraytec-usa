// Portal Spraytec USA: estrutura da tela, navegação e dados.
import { carregarIdioma, idiomaInicial, idioma, t, IDIOMAS } from './i18n.js';
import { api, ErroApi } from './api.js';
import { $, esc, toast, fecharJanela } from './ui.js';
import * as login from './telas/login.js';
import * as inicio from './telas/inicio.js';
import * as rotacoes from './telas/rotacoes.js';
import * as anuncio from './telas/anuncio.js';
import * as safra from './telas/safra.js';
import * as produtos from './telas/produtos.js';
import * as pessoas from './telas/pessoas.js';
import * as historico from './telas/historico.js';
import * as conta from './telas/conta.js';
import * as embreve from './telas/embreve.js';

// Estado que veio do servidor (já filtrado pelo papel de quem está logado).
export const S = { eu: null, hoje: '', dados: { rotacoes: [], anuncios: [], eventos: [] }, demo: false, mencionaveis: [], drive: {}, catalogo: null, versao: 0 };
export const souCancha = () => S.eu?.papel === 'cancha';
export const souAprovador = () => S.eu?.papel === 'aprovador';

// ---------- telas ----------
// Seções do menu. "papeis" diz quem vê. As que ainda não existem aparecem como "em breve" (só para a Cancha).
const SECOES = [
  { id: 'inicio', icone: '⌂', tela: inicio, papeis: ['cancha', 'aprovador', 'leitor', 'produtora'] },
  { id: 'rotacoes', icone: '↻', tela: rotacoes, papeis: ['cancha', 'aprovador', 'leitor'] },
  { id: 'safra', icone: '◷', tela: safra, papeis: ['cancha', 'aprovador', 'leitor'] },
  { id: 'produtos', icone: '▦', tela: produtos, papeis: ['cancha', 'aprovador', 'leitor', 'produtora'] },
  { id: 'resultados', icone: '▲', tela: embreve, papeis: ['cancha'], breve: 4 },
  { id: 'feedbacks', icone: '✎', tela: embreve, papeis: ['cancha'], breve: 2 },
  { id: 'planejamento', icone: '☰', tela: embreve, papeis: ['cancha'], breve: 2 },
  { id: 'roteiros', icone: '▶', tela: embreve, papeis: ['cancha'], breve: 2 },
  { id: 'emails', icone: '✉', tela: embreve, papeis: ['cancha'], breve: 3 },
  { id: 'site', icone: '◰', tela: embreve, papeis: ['cancha'], breve: 3 },
  { id: 'seo', icone: '⌕', tela: embreve, papeis: ['cancha'], breve: 3 },
  { id: 'pessoas', icone: '☺', tela: pessoas, papeis: ['cancha'], grupo: 'adm' },
  { id: 'historico', icone: '⟲', tela: historico, papeis: ['cancha'], grupo: 'adm' },
];
// Telas que não estão no menu (abertas por link).
const OUTRAS = { rotacao: rotacoes, anuncio, conta };

let telaAtual = null;
function rota() {
  const [, nome = 'inicio', ...resto] = location.hash.replace(/^#\/?/, '#').split(/[#/]/);
  return { nome, params: resto.map(decodeURIComponent) };
}
export const ir = (caminho) => { if (location.hash !== '#/' + caminho) location.hash = '#/' + caminho; else desenhar(); };

export function desenhar() {
  if (!S.eu) return;
  const { nome, params } = rota();
  const sec = SECOES.find((s) => s.id === nome && s.papeis.includes(S.eu.papel));
  const tela = sec?.tela || OUTRAS[nome] || inicio;
  telaAtual = tela;
  const main = $('#main');
  try {
    main.innerHTML = tela.render(params, sec);
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="pagina"><p class="erro-tela">${esc(t('erro.tela'))}</p></div>`;
  }
  tela.depois?.(main, params);
  desenharMenu(sec?.id || (nome === 'rotacao' || nome === 'anuncio' ? 'rotacoes' : nome));
}

function desenharMenu(ativo) {
  const L = SECOES.filter((s) => s.papeis.includes(S.eu.papel));
  const item = (s) => `<a href="#/${s.id}" class="${s.id === ativo ? 'ativo' : ''}${s.breve ? ' breve' : ''}" ${s.id === ativo ? 'aria-current="page"' : ''}>
    <span class="ic" aria-hidden="true">${s.icone}</span><span>${esc(t('nav.' + s.id))}</span>${s.breve ? `<small>${esc(t('nav.em_breve'))}</small>` : ''}${s.id === 'rotacoes' ? contador() : ''}</a>`;
  const prontas = L.filter((s) => !s.breve && !s.grupo), breves = L.filter((s) => s.breve), adm = L.filter((s) => s.grupo === 'adm');
  $('#nav').innerHTML = prontas.map(item).join('')
    + (breves.length ? `<p class="nav-grupo">${esc(t('nav.proximas'))}</p>${breves.map(item).join('')}` : '')
    + (adm.length ? `<p class="nav-grupo">${esc(t('nav.administracao'))}</p>${adm.map(item).join('')}` : '');
  $('#quem').innerHTML = `<a href="#/conta" class="eu" title="${esc(t('nav.conta'))}"><b>${esc(S.eu.nome)}</b><small>${esc(t('papel.' + S.eu.papel))} · ${esc(S.eu.idioma === 'pt-BR' ? 'PT' : 'EN')}</small></a>`;
  $('#demo').hidden = !S.demo;
  if (S.demo) $('#demo').innerHTML = `${esc(t('demo.faixa'))} <button type="button" class="link" data-acao-global="trocar-pessoa">${esc(t('demo.trocar'))}</button>`;
}
// Quantos anúncios esperam quem está olhando.
function contador() {
  const A = S.dados.anuncios;
  const n = souAprovador() ? A.filter((a) => a.status === 'aprovacao').length : souCancha() ? A.filter((a) => a.status === 'ajuste').length : 0;
  return n ? `<span class="conta" aria-label="${esc(t('nav.pendentes', { n }))}">${n}</span>` : '';
}

// ---------- dados ----------
export async function recarregar() {
  const r = await api('/api/estado');
  aplicar(r);
}
function aplicar(r) {
  S.eu = r.eu; S.hoje = r.hoje; S.dados = r.dados; S.demo = r.demo; S.versao = r.versao;
  S.mencionaveis = r.mencionaveis || []; S.drive = r.drive || {};
}
// Pede uma ação ao servidor; com sucesso, a tela é redesenhada com o estado novo.
export async function acao(nome, dados = {}, { ok } = {}) {
  try {
    const r = await api('/api/acao', { acao: nome, ...dados });
    aplicar(r);
    fecharJanela();
    if (ok) toast(ok, 'bom');
    desenhar();
    return r;
  } catch (err) {
    toast(err.message, 'ruim');
    if (err instanceof ErroApi && err.status === 401) location.reload();
    return null;
  }
}

// Atualiza sozinho quando outra pessoa mudou algo (confere a cada 30 s, só com a aba visível).
setInterval(async () => {
  if (!S.eu || document.hidden || document.querySelector('.janela-fundo') || document.activeElement?.matches('textarea,input')) return;
  try {
    const { versao } = await api('/api/versao');
    if (versao !== S.versao) { await recarregar(); desenhar(); }
  } catch {}
}, 30000);

export async function catalogo() {
  if (!S.catalogo) S.catalogo = await (await fetch('/dados/produtos.json')).json();
  return S.catalogo;
}

// ---------- eventos (um ouvinte só, que passa para a tela aberta) ----------
document.addEventListener('click', (ev) => {
  const g = ev.target.closest('[data-acao-global]');
  if (g) { ev.preventDefault(); return global(g.dataset.acaoGlobal, g); }
  const m = ev.target.closest('[data-mencionar]');
  if (m) {
    const ta = m.closest('form')?.querySelector('textarea');
    if (ta) { ta.value += (ta.value && !/\s$/.test(ta.value) ? ' ' : '') + '@' + m.dataset.mencionar + ' '; ta.focus(); }
    return;
  }
  const el = ev.target.closest('[data-act]');
  if (el && telaAtual?.cliques?.[el.dataset.act]) { ev.preventDefault(); telaAtual.cliques[el.dataset.act](el, ev); }
});
document.addEventListener('submit', (ev) => {
  const f = ev.target;
  if (f.matches('[data-comentar]')) {
    ev.preventDefault();
    const fd = new FormData(f);
    acao('comentar', { ref: f.dataset.comentar, texto: fd.get('texto'), interno: fd.get('interno') === 'on' }, { ok: t('coment.enviado') });
    return;
  }
  const nome = f.dataset.form;
  if (nome && telaAtual?.formularios?.[nome]) { ev.preventDefault(); telaAtual.formularios[nome](f, ev); }
});
document.addEventListener('change', (ev) => {
  const el = ev.target.closest('[data-mudou]');
  if (el && telaAtual?.mudancas?.[el.dataset.mudou]) telaAtual.mudancas[el.dataset.mudou](el, ev);
});
async function global(nome) {
  if (nome === 'trocar-pessoa') { await api('/api/sair', {}); location.href = '/'; }
  if (nome === 'recarregar') location.reload();
}

// ---------- início ----------
async function iniciar() {
  await carregarIdioma(idiomaInicial());
  document.title = t('app.titulo');
  // Páginas de criar senha (link do convite) e de nova senha.
  if (/^\/(criar-senha|nova-senha)$/.test(location.pathname)) return login.paginaSenha();
  try {
    const r = await api('/api/estado');
    aplicar(r);
  } catch (err) {
    if (err instanceof ErroApi && err.status === 401) return login.paginaEntrar();
    document.querySelector('#main').innerHTML = `<div class="pagina"><p class="erro-tela">${esc(err.message)}</p><p><button class="btn" data-acao-global="recarregar">${esc(t('geral.tentar_de_novo'))}</button></p></div>`;
    return;
  }
  if (S.eu.idioma !== idioma()) await carregarIdioma(S.eu.idioma);
  document.title = t('app.titulo');
  document.body.classList.add('logado');
  $('#marca-sub').textContent = t('app.subtitulo');
  // Link de aviso por e-mail: ?abrir=r:<id> ou a:<id>
  const abrir = new URLSearchParams(location.search).get('abrir');
  if (abrir) {
    history.replaceState(null, '', '/');
    const [k, id] = [abrir.slice(0, 1), abrir.slice(2)];
    location.hash = k === 'r' ? '#/rotacao/' + id : k === 'a' ? '#/anuncio/' + id : '#/inicio';
  }
  await catalogo();
  window.addEventListener('hashchange', () => { fecharJanela(); desenhar(); window.scrollTo(0, 0); });
  desenhar();
}
export const trocarIdioma = async (l) => {
  if (!IDIOMAS.includes(l)) return;
  if (S.eu) await api('/api/eu/idioma', { idioma: l });
  location.reload();
};
iniciar();
