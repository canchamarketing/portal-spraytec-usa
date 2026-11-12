// Conversas (chat por tema), como no Portal Brasil: cada conversa tem um tema, tudo fica registrado e cada
// pessoa lê no próprio idioma (com "ver original"). Canal "Spraytec" (Spraytec USA + Cancha) e canal
// "Produtora" (produtora + Cancha). Aparece no Início e em tela própria.
import { t, dataHora, traduzido } from '../i18n.js';
import { esc, eyebrow, conteudo } from '../ui.js';
import { api } from '../api.js';
import { S, acao, souCancha, desenhar, atualizarMenu } from '../app.js';

let sel = null, novo = false;
const LINK = { r: 'rotacao', a: 'anuncio', p: 'planejamento', v: 'roteiro', e: 'email', l: 'lp', d: 'site', f: 'feedbacks' };
const conversas = () => [...(S.dados.conversas || [])].sort((a, b) => (b.msgs.at(-1)?.em || b.em).localeCompare(a.msgs.at(-1)?.em || a.em));
export const naoLidas = (x) => Math.max(0, x.msgs.length - (x.lidoAte?.[S.eu.id] || 0));
export const totalNaoLidas = () => (S.dados.conversas || []).reduce((a, x) => a + naoLidas(x), 0);
const escreve = (x) => (x.canal === 'produtora' ? ['cancha', 'produtora'] : ['cancha', 'aprovador']).includes(S.eu.papel);

// @Nome de quem está no portal fica destacado.
function marcarMencoes(html) {
  const nomes = [...new Set([S.eu.nome, ...S.mencionaveis.map((p) => p.nome)])].sort((a, b) => b.length - a.length);
  for (const n of nomes) html = html.split('@' + esc(n)).join(`<span class="mencao">@${esc(n)}</span>`);
  return html;
}
export function painelChat({ inicio = false } = {}) {
  const L = conversas();
  if (sel && !L.some((x) => x.id === sel)) sel = null;
  const th = L.find((x) => x.id === sel) || L[0];
  if (th) sel = th.id;
  const titulo = souCancha() ? t('chat.titulo_cancha') : S.eu.papel === 'produtora' ? t('chat.titulo_produtora') : t('chat.titulo_cliente');
  const podeCriar = S.eu.papel !== 'leitor';
  const formNovo = novo ? `<form class="novo-tema" data-form="novo-tema"><input name="tema" maxlength="120" required placeholder="${esc(t('chat.tema_placeholder'))}" aria-label="${esc(t('chat.tema'))}">
    ${souCancha() ? `<select name="canal" aria-label="${esc(t('chat.canal'))}"><option value="spraytec">${esc(t('chat.canal.spraytec'))}</option><option value="produtora">${esc(t('chat.canal.produtora'))}</option></select>` : ''}
    <div class="linha"><button type="button" class="link" data-act="chat-cancelar">${esc(t('geral.cancelar'))}</button><button class="btn sm forte" type="submit">${esc(t('chat.criar'))}</button></div></form>`
    : podeCriar ? `<button type="button" class="btn sm" data-act="chat-novo">+ ${esc(t('chat.novo_tema'))}</button>` : '';
  const item = (x) => {
    const ult = x.msgs.at(-1), n = naoLidas(x);
    return `<button type="button" class="thr${x.id === sel ? ' sel' : ''}" data-act="chat-abrir" data-id="${esc(x.id)}" aria-pressed="${x.id === sel}">
      <span class="tt"><span># ${esc(x.tema)}</span>${n ? `<span class="badge">${n}</span>` : ''}</span>
      ${souCancha() ? `<span class="canal-chat c-${x.canal}">${esc(t('chat.canal.' + x.canal))}</span>` : ''}
      <span class="ls">${ult ? esc(ult.por.split(' ')[0] + ': ' + traduzido(ult).texto) : esc(t('chat.sem_msgs'))}</span></button>`;
  };
  const msg = (m, i, arr) => {
    const meu = m.porId === S.eu.id, junto = i > 0 && arr[i - 1].porId === m.porId && Date.parse(m.em) - Date.parse(arr[i - 1].em) < 10 * 60e3;
    return `<div class="msg${meu ? ' minha' : ''}${junto ? ' junto' : ''}">${junto ? '<span class="av2 vazio"></span>' : `<span class="av2 p-${esc(m.papel)}" aria-hidden="true">${esc(m.por[0])}</span>`}
      <div class="bolha">${junto ? '' : `<div class="mh"><b>${esc(m.por)}</b><span class="data">${esc(dataHora(m.em))}</span></div>`}<div class="mt">${marcarMencoes(conteudo(m))}</div></div></div>`;
  };
  const ref = th?.ref ? `<a class="chat-ref" href="#/${LINK[th.ref[0]]}/${esc(th.ref.slice(2))}">${esc(t('chat.ligado'))}</a>` : '';
  const conv = th ? `<div class="conv"><div class="convh"><b># ${esc(th.tema)}</b>${ref}<span class="miudo">${esc(t('chat.criada_por', { nome: th.criadaPor, quando: dataHora(th.em) }))}</span></div>
      <div class="msgs" id="msgs">${th.msgs.map(msg).join('') || `<p class="vazio">${esc(t('chat.comece'))}</p>`}</div>
      ${escreve(th) ? `<form class="composer" data-form="chat-enviar" data-id="${esc(th.id)}"><textarea name="texto" rows="2" maxlength="4000" required data-chat placeholder="${esc(t('chat.escrever', { tema: th.tema }))}" aria-label="${esc(t('chat.mensagem'))}"></textarea>
        <button class="btn forte" type="submit">${esc(t('chat.enviar'))}</button></form>
        <p class="dica chat-dica">${esc(t('chat.dica'))}${S.mencionaveis.length ? ' · ' + S.mencionaveis.map((p) => `<button type="button" class="link" data-mencionar="${esc(p.nome)}">@${esc(p.nome)}</button>`).join(' ') : ''}</p>`
        : `<p class="dica">${esc(t('chat.so_leitura'))}</p>`}</div>`
    : `<div class="conv vazia"><p class="vazio">${esc(t('chat.nenhuma'))}</p></div>`;
  return `<section class="bloco chat-bloco${inicio ? ' no-inicio' : ''}"><div class="cab"><div><h2>${esc(titulo)}</h2><p class="dica">${esc(t('chat.explica'))}</p></div>
      ${inicio ? `<a class="miudo" href="#/conversas">${esc(t('chat.abrir_tela'))}</a>` : ''}</div>
    <div class="chat"><aside class="threads">${formNovo}${L.map(item).join('')}</aside>${conv}</div></section>`;
}

// Depois de desenhar: rola para a última mensagem e marca a conversa aberta como lida.
export function depoisChat() {
  const box = document.getElementById('msgs');
  if (box) box.scrollTop = box.scrollHeight;
  const th = (S.dados.conversas || []).find((x) => x.id === sel);
  if (th && naoLidas(th)) {
    th.lidoAte = { ...(th.lidoAte || {}), [S.eu.id]: th.msgs.length };
    api('/api/acao', { acao: 'conversa-lida', id: th.id }).then((r) => { S.versao = r.versao; }).catch(() => {});
    atualizarMenu();
    document.querySelectorAll(`.thr[data-id="${th.id}"] .badge`).forEach((b) => b.remove());
  }
}

export function render([id]) {
  if (id) sel = id;
  return `<div class="pagina"><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.conversas'))}</span></h1>${painelChat()}</div>`;
}
export const depois = depoisChat;
export const cliquesChat = {
  'chat-abrir': (el) => { sel = el.dataset.id; novo = false; desenhar(); },
  'chat-novo': () => { novo = true; desenhar(); document.querySelector('.novo-tema input')?.focus(); },
  'chat-cancelar': () => { novo = false; desenhar(); },
};
export const formulariosChat = {
  'novo-tema': async (f) => {
    const fd = new FormData(f);
    const r = await acao('conversa-criar', { tema: fd.get('tema'), canal: fd.get('canal') || undefined });
    if (r?.criado) { sel = r.criado; novo = false; desenhar(); document.querySelector('textarea[data-chat]')?.focus(); }
  },
  'chat-enviar': async (f) => {
    const ta = f.querySelector('textarea'), texto = ta.value;
    if (!texto.trim()) return;
    ta.disabled = true;
    const r = await acao('conversa-enviar', { id: f.dataset.id, texto });
    if (!r) { const n = document.querySelector('textarea[data-chat]'); if (n) { n.value = texto; n.disabled = false; } return; }
    document.querySelector('textarea[data-chat]')?.focus();
  },
};
export const cliques = cliquesChat;
export const formularios = formulariosChat;

// Enter envia; Shift+Enter quebra a linha.
document.addEventListener('keydown', (ev) => {
  if (ev.key !== 'Enter' || ev.shiftKey || ev.isComposing || !ev.target.matches?.('textarea[data-chat]')) return;
  ev.preventDefault();
  ev.target.form.requestSubmit();
});
