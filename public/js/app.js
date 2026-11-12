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
import * as feedbacks from './telas/feedbacks.js';
import * as planejamento from './telas/planejamento.js';
import * as roteiros from './telas/roteiros.js';
import * as emails from './telas/emails.js';
import * as site from './telas/site.js';
import * as seo from './telas/seo.js';
import { telaDe } from './telas/item.js';

// Estado que veio do servidor (já filtrado pelo papel de quem está logado).
export const S = { eu: null, hoje: '', dados: {}, demo: false, mencionaveis: [], drive: {}, catalogo: null, versao: 0 };
export const souCancha = () => S.eu?.papel === 'cancha';
export const souAprovador = () => S.eu?.papel === 'aprovador';

// ---------- telas ----------
// Seções do menu, na ordem do dia a dia. "papeis" diz quem vê. "breve" = ainda vai ser construída (só a Cancha vê).
const TODOS = ['cancha', 'aprovador', 'leitor', 'produtora'], SPRAYTEC = ['cancha', 'aprovador', 'leitor'];
const SECOES = [
  { id: 'inicio', tela: inicio, papeis: TODOS },
  { id: 'rotacoes', tela: rotacoes, papeis: SPRAYTEC, pend: () => pendentesAnuncios() },
  { id: 'feedbacks', tela: feedbacks, papeis: SPRAYTEC, pend: () => S.dados.feedbacks.filter((f) => (souCancha() && f.status === 'aberto') || (souAprovador() && f.status === 'respondido')).length },
  { id: 'planejamento', tela: planejamento, papeis: SPRAYTEC, pend: () => pendentesItens('planos') },
  { id: 'roteiros', tela: roteiros, papeis: TODOS, pend: () => pendentesItens('roteiros') },
  { id: 'emails', tela: emails, papeis: SPRAYTEC, pend: () => pendentesItens('emails') },
  { id: 'site', tela: site, papeis: SPRAYTEC, pend: () => pendentesItens('paginas') + (souCancha() ? S.dados.pedidos.filter((p) => p.status === 'aberto').length : 0) },
  { id: 'seo', tela: seo, papeis: SPRAYTEC },
  { id: 'safra', tela: safra, papeis: SPRAYTEC, sep: true },
  { id: 'produtos', tela: produtos, papeis: TODOS },
  { id: 'resultados', tela: embreve, papeis: ['cancha'], breve: 4 },
  { id: 'pessoas', tela: pessoas, papeis: ['cancha'], grupo: 'adm' },
  { id: 'historico', tela: historico, papeis: ['cancha'], grupo: 'adm' },
];
// Telas que não estão no menu (abertas por link) e a seção do menu que fica marcada.
const OUTRAS = { rotacao: [rotacoes, 'rotacoes'], anuncio: [anuncio, 'rotacoes'], conta: [conta, ''], roteiro: [telaDe('roteiros'), 'roteiros'], email: [telaDe('emails'), 'emails'], lp: [telaDe('paginas'), 'site'] };
// O que espera por quem está olhando (o número ao lado do item do menu).
function pendentesAnuncios() {
  const A = S.dados.anuncios;
  return souAprovador() ? A.filter((a) => a.status === 'aprovacao').length : souCancha() ? A.filter((a) => a.status === 'ajuste').length : 0;
}
function pendentesItens(col) {
  const L = S.dados[col] || [];
  if (souAprovador()) return L.filter((x) => x.status === 'aprovacao' || x.status === 'corte').length;
  if (souCancha()) return L.filter((x) => x.status === 'ajuste' || (col === 'roteiros' && x.status === 'aprovado')).length;
  if (S.eu.papel === 'produtora') return L.filter((x) => ['producao', 'ajuste_corte'].includes(x.status)).length;
  return 0;
}

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
  const tela = sec?.tela || OUTRAS[nome]?.[0] || inicio;
  telaAtual = tela;
  const main = $('#main');
  try {
    main.innerHTML = tela.render(params, sec);
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="pagina"><p class="erro-tela">${esc(t('erro.tela'))}</p></div>`;
  }
  tela.depois?.(main, params);
  desenharMenu(sec?.id ?? OUTRAS[nome]?.[1] ?? nome);
}

function desenharMenu(ativo) {
  const L = SECOES.filter((s) => s.papeis.includes(S.eu.papel));
  const item = (s) => {
    const n = s.pend ? s.pend() : 0;
    return `<a href="#/${s.id}" class="${s.id === ativo ? 'ativo' : ''}${s.breve ? ' breve' : ''}" ${s.id === ativo ? 'aria-current="page"' : ''}>
    <span>${esc(t('nav.' + s.id))}</span>${n ? `<span class="conta" aria-label="${esc(t('nav.pendentes', { n }))}">${n}</span>` : ''}</a>`;
  };
  const prontas = L.filter((s) => !s.breve && !s.grupo), breves = L.filter((s) => s.breve), adm = L.filter((s) => s.grupo === 'adm');
  $('#nav').innerHTML = prontas.map((s) => (s.sep ? '<span class="nav-sep"></span>' : '') + item(s)).join('')
    + (breves.length ? `<p class="nav-grupo">${esc(t('nav.proximas'))}</p>${breves.map(item).join('')}` : '')
    + (adm.length ? `<p class="nav-grupo">${esc(t('nav.administracao'))}</p>${adm.map(item).join('')}` : '');
  // Cabeçalho como no Brasil: nome e papel, "Trocar pessoa" (demonstração) e "Sair".
  $('#quem').innerHTML = `<a href="#/conta" class="eu" title="${esc(t('nav.conta'))}"><b>${esc(S.eu.nome)}</b><small>${esc(t('papel.' + S.eu.papel))} · ${esc(S.eu.idioma === 'pt-BR' ? 'PT' : 'EN')}</small></a>
    ${S.demo ? `<button type="button" class="btn" data-acao-global="trocar-pessoa">${esc(t('demo.trocar_curto'))}</button>` : ''}
    <button type="button" class="btn" data-acao-global="sair">${esc(t('conta.sair'))}</button>`;
  $('#demo').hidden = !S.demo;
  if (S.demo) $('#demo').innerHTML = esc(t('demo.faixa'));
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
  if (nome === 'sair') { await api('/api/sair', {}); location.href = '/'; }
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
  $('#por-txt').textContent = t('app.por');
  // Link de aviso por e-mail: ?abrir=r:<id> ou a:<id>
  const abrir = new URLSearchParams(location.search).get('abrir');
  if (abrir) {
    history.replaceState(null, '', '/');
    const [k, id] = [abrir.slice(0, 1), abrir.slice(2)];
    const destino = { r: 'rotacao', a: 'anuncio', f: 'feedbacks', p: 'planejamento', v: 'roteiro', e: 'email', l: 'lp', d: 'site' }[k];
    location.hash = destino ? `#/${destino}/${id}` : '#/inicio';
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
