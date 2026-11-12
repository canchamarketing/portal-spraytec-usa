// Um anúncio: prévia, explicação em palavras simples, aprovação, números, comentários e histórico.
import { t, data, dataHora, moeda, num, pct, idioma } from '../i18n.js';
import { esc, texto, janela, confirmar, comentarios, historico, conteudo, ajuda, selo, toast } from '../ui.js';
import { api } from '../api.js';
import { S, acao, ir, souCancha, souAprovador, recarregar, desenhar } from '../app.js';
import {
  rotacao, anunciosDe, nomeRotacao, statusAnuncio, semaforo, canalSelo, imagemDe, nomeProduto, produto,
  OBJETIVOS, CANAIS, FORMATOS, LOCAIS,
} from './comum.js';

const anuncio = (id) => S.dados.anuncios.find((a) => a.id === id);
let localPrevia = null; // qual "lugar" está na prévia (feed, stories...)

export function render([id]) {
  const a = anuncio(id);
  if (!a) return `<div class="pagina"><p class="erro-tela">${esc(t('erro.nao_encontrado'))}</p><a href="#/rotacoes">${esc(t('geral.voltar'))}</a></div>`;
  const r = rotacao(a.rotacaoId);
  if (!a.locais?.includes(localPrevia)) localPrevia = a.locais?.[0] || (a.canal === 'google' ? 'pesquisa' : 'feed');
  return `<div class="pagina">
    <nav class="trilha"><a href="#/rotacao/${esc(r.id)}">← ${esc(t('rot.titulo', { periodo: nomeRotacao(r) }))}</a></nav>
    <header class="cab"><div><h1>${esc(a.titulo)}</h1>
      <p class="linha-st">${statusAnuncio(a)} ${a.versao > 1 ? `<small>${esc(t('anuncio.versao', { n: a.versao }))}</small>` : ''} ${semaforo(a)}
      ${a.origem === 'continua' ? `<span class="chip">${esc(t('anuncio.continua_de'))}</span>` : ''}</p></div></header>
    ${caixaAprovacao(a, r)}
    <div class="anuncio-grade">
      <section class="previa-lado"><h2 class="sr">${esc(t('anuncio.previa'))}</h2>
        ${a.locais?.length > 1 ? `<div class="abas" role="tablist">${a.locais.map((l) => `<button type="button" role="tab" aria-selected="${l === localPrevia}" class="${l === localPrevia ? 'ativo' : ''}" data-act="previa" data-l="${esc(l)}">${esc(t('local.' + l))}</button>`).join('')}</div>` : ''}
        ${previa(a, localPrevia)}
        <p class="dica centro">${esc(t('anuncio.previa_dica'))}</p>
        ${arquivos(a)}
      </section>
      <section class="explica-lado">${explicacao(a)}${resultado(a)}</section>
    </div>
    ${comentarios(a.comentarios, { ref: 'a:' + a.id, podeComentar: souCancha() || souAprovador(), souCancha: souCancha(), mencionaveis: S.mencionaveis })}
    <section class="bloco"><details><summary><h3 class="inline">${esc(t('hist.titulo'))}</h3></summary>${historico(a.hist)}</details></section>
    ${acoesCancha(a, r)}
  </div>`;
}

// ---------- aprovação ----------
function caixaAprovacao(a, r) {
  if (souAprovador() && a.status === 'aprovacao') {
    const pend = anunciosDe(r.id).filter((x) => x.origem === 'novo' && x.status === 'aprovacao');
    const pos = pend.findIndex((x) => x.id === a.id) + 1;
    return `<section class="caixa-aprovar" aria-labelledby="ap-t"><h2 id="ap-t">${esc(t('ap.titulo'))}</h2>
      <p>${esc(t('ap.explica', { prazo: data(r.prazo) }))}</p>${pend.length > 1 ? `<p class="miudo">${esc(t('ap.posicao', { i: pos, n: pend.length }))}</p>` : ''}
      <div class="ap-botoes"><button class="btn aprovar" data-act="aprovar" data-id="${esc(a.id)}" data-v="${a.versao}">✓ ${esc(t('ap.aprovar'))}</button>
      <button class="btn ajustar" data-act="ajuste" data-id="${esc(a.id)}">✎ ${esc(t('ap.ajuste'))}</button></div></section>`;
  }
  if (a.status === 'aprovacao') return `<section class="caixa-status"><p>⏳ ${esc(t('ap.esperando', { prazo: data(r.prazo) }))}</p></section>`;
  if (a.status === 'ajuste' && a.ajustePedido) return `<section class="caixa-status ajuste"><p><b>${esc(t('ap.ajuste_pedido', { nome: a.ajustePedido.por, quando: dataHora(a.ajustePedido.em) }))}</b></p>
    <blockquote>${conteudo(a.comentarios?.slice().reverse().find((c) => c.ajuste) || { texto: a.ajustePedido.texto })}</blockquote>
    <p class="miudo">${esc(souCancha() ? t('ap.ajuste_cancha') : t('ap.ajuste_cliente'))}</p></section>`;
  if (a.status === 'ajustando') return `<section class="caixa-status"><p>${esc(t('ap.ajustando'))}</p></section>`;
  if (a.aprovadoPor) return `<section class="caixa-status ok"><p>✓ ${esc(t('ap.aprovado_em', { nome: a.aprovadoPor, quando: dataHora(a.aprovadoEm), v: a.aprovadoVersao || a.versao }))}</p></section>`;
  if (a.status === 'rascunho') return `<section class="caixa-status"><p>${esc(t('ap.rascunho'))}</p></section>`;
  return '';
}

// ---------- prévia (como o anúncio aparece) ----------
function previa(a, local) {
  const img = imagemDe(a, 1000);
  const T = a.textos || {};
  const cta = esc(T.cta || t('anuncio.cta_padrao'));
  const midia = img ? `<img src="${esc(img)}" alt="${esc(t('anuncio.peca'))}">` : `<div class="sem-img">${esc(a.linkDrive ? t('anuncio.peca_no_drive') : t('anuncio.sem_peca'))}</div>`;
  const dominio = (T.link || 'https://spraytecusa.com').replace(/^https?:\/\//, '').split('/')[0];
  const ex = a.exemploImg && img === a.exemploImg ? `<span class="selo exemplo flutua">${esc(t('exemplo.selo'))}</span>` : '';
  if (local === 'pesquisa' || a.formato === 'texto') {
    return `<div class="mock google-busca"><p class="g-patro">${esc(t('mock.patrocinado'))} · ${esc(dominio)}</p>
      <p class="g-titulo">${esc(T.titulo || a.titulo)}</p><p class="g-texto">${esc(T.texto || '')}</p></div>`;
  }
  if (local === 'stories' || local === 'reels') {
    return `<div class="mock stories">${midia}${ex}<div class="st-topo"><span class="av">S</span> <b>spraytec</b> <small>${esc(t('mock.patrocinado'))}</small></div>
      <div class="st-cta">${cta} ›</div></div>`;
  }
  if (local === 'display' || local === 'youtube' || local === 'pmax') {
    return `<div class="mock display">${midia}${ex}<div class="d-rodape"><b>${esc(T.titulo || a.titulo)}</b><span class="d-cta">${cta}</span></div></div>`;
  }
  return `<div class="mock feed"><div class="f-topo"><span class="av">S</span><span><b>Spraytec</b><small>${esc(t('mock.patrocinado'))}</small></span></div>
    <p class="f-texto">${texto(T.texto || '')}</p><div class="f-midia">${midia}${ex}</div>
    <div class="f-rodape"><span><small>${esc(dominio.toUpperCase())}</small><b>${esc(T.titulo || '')}</b></span><span class="f-cta">${cta}</span></div></div>`;
}

// ---------- em palavras simples ----------
function explicacao(a) {
  const T = a.textos || {};
  const linha = (rot, valor, dica = '') => `<div class="ex-linha"><dt>${esc(t(rot))} ${dica}</dt><dd>${valor}</dd></div>`;
  const prods = (a.produtos || []).map((p) => `<a href="#/produtos/${esc(p)}" class="chip">${esc(nomeProduto(p))}</a>`).join(' ');
  return `<section class="bloco"><h2>${esc(t('anuncio.simples'))}</h2><dl class="ex">
    ${linha('anuncio.objetivo', `<b>${esc(t('objetivo.' + a.objetivo))}</b><br><span class="miudo">${esc(t('objetivo.' + a.objetivo + '.explica'))}</span>`)}
    ${linha('anuncio.onde', `${canalSelo(a.canal)} ${(a.locais || []).map((l) => `<span class="chip">${esc(t('local.' + l))}</span>`).join(' ')}`)}
    ${linha('anuncio.publico', a.publico ? esc(a.publico) : `<span class="vazio">—</span>`, ajuda('anuncio.publico.ajuda'))}
    ${linha('anuncio.produtos', prods || `<span class="vazio">${esc(t('anuncio.sem_produto'))}</span>`)}
    ${linha('anuncio.formato', esc(t('formato.' + a.formato)))}
    ${T.link ? linha('anuncio.link', `<a href="${esc(T.link)}" target="_blank" rel="noopener noreferrer">${esc(T.link)}</a>`, ajuda('anuncio.link.ajuda')) : ''}
    ${a.linkDrive ? linha('anuncio.drive', `<a href="${esc(a.linkDrive)}" target="_blank" rel="noopener noreferrer">${esc(t('anuncio.abrir_drive'))}</a>`) : ''}
    ${souCancha() && a.nota ? linha('anuncio.nota', `<span class="interno-txt">${texto(a.nota)}</span>`) : ''}
  </dl></section>`;
}

// ---------- números ----------
function resultado(a) {
  const R = a.resultado;
  if (!R && !['no_ar', 'encerrado'].includes(a.status)) return '';
  const origem = !R ? '' : R.origem === 'exemplo' ? selo('exemplo', t('exemplo.selo'), t('exemplo.dica')) : R.origem === 'manual' ? selo('manual', t('res.manual'), t('res.manual.dica')) : '';
  const cpl = R && R.investimento != null && R.contatos ? R.investimento / R.contatos : null;
  const ctr = R && R.impressoes && R.cliques != null ? R.cliques / R.impressoes : null;
  const caixa = (k, v) => `<div class="num"><span class="rotulo">${esc(t('res.' + k))} ${ajuda('res.' + k + '.ajuda')}</span><b>${v}</b></div>`;
  const motivo = a.semaforo ? `<p>${semaforo(a)} ${a.semaforoMotivo ? conteudo(a, 'semaforoMotivo') : ''}</p>` : '';
  return `<section class="bloco"><h2>${esc(t('res.titulo'))} ${origem}</h2>${motivo}
    ${R ? `<div class="nums">${caixa('investimento', moeda(R.investimento))}${caixa('impressoes', num(R.impressoes))}${caixa('cliques', num(R.cliques))}
      ${caixa('ctr', pct(ctr))}${caixa('contatos', num(R.contatos))}${caixa('cpl', moeda(cpl, 2))}</div>` : `<p class="vazio">${esc(t('res.sem'))}</p>`}
    <p class="dica">${esc(t('res.integracao_dica'))}</p>
    ${souCancha() ? `<button class="btn leve" data-act="numeros" data-id="${esc(a.id)}">${esc(t('res.digitar'))}</button>` : ''}</section>`;
}

// ---------- arquivos (Google Drive) ----------
function arquivos(a) {
  const L = (a.arquivos || []).filter((x) => !x.removido);
  const pode = souCancha() && ['rascunho', 'ajuste'].includes(a.status);
  if (!L.length && !pode) return '';
  const item = (x) => `<li><a href="/api/arquivos/${esc(x.id)}/conteudo" target="_blank" rel="noopener">${esc(x.nome)}</a>
    ${pode ? `<button class="link perigo" data-act="tirar-arquivo" data-id="${esc(x.id)}" data-a="${esc(a.id)}">${esc(t('geral.tirar'))}</button>` : ''}</li>`;
  const envio = pode ? (S.drive?.conectado
    ? `<label class="btn leve"><input type="file" hidden multiple data-mudou="arquivo" data-id="${esc(a.id)}"> ${esc(t('arq.enviar'))}</label><div id="envios"></div>`
    : `<p class="dica">${esc(t('arq.sem_drive'))}</p>`) : '';
  return `<section class="bloco arquivos"><h3>${esc(t('arq.titulo'))}</h3>${L.length ? `<ul>${L.map(item).join('')}</ul>` : ''}${envio}</section>`;
}
async function enviarArquivo(file, aid) {
  const box = document.getElementById('envios');
  const linha = document.createElement('p');
  linha.className = 'miudo';
  linha.textContent = `${file.name}: ${t('arq.enviando')}`;
  box?.appendChild(linha);
  try {
    const ini = await api('/api/arquivos/iniciar', { ref: 'a:' + aid, nome: file.name, tipo: file.type, tam: file.size });
    let pos = 0;
    while (pos < file.size) {
      const fim = Math.min(file.size, pos + ini.parte);
      const r = await fetch('/api/arquivos/enviar/' + ini.envio, { method: 'PUT', headers: { 'content-type': 'application/octet-stream', 'x-inicio': String(pos), 'x-idioma': idioma() }, body: file.slice(pos, fim) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.erro || t('erro.generico'));
      pos = fim;
      linha.textContent = `${file.name}: ${Math.round((pos / file.size) * 100)}%`;
    }
    linha.textContent = `${file.name}: ✓`;
  } catch (err) {
    linha.textContent = `${file.name}: ${err.message}`;
    linha.classList.add('erro');
  }
}

// ---------- ações da Cancha ----------
function acoesCancha(a, r) {
  if (!souCancha()) return '';
  const B = [];
  const travada = ['no_ar', 'encerrada'].includes(r.status);
  if (!travada && ['rascunho', 'ajuste', 'aprovado'].includes(a.status)) B.push(`<button class="btn" data-act="editar" data-id="${esc(a.id)}">${esc(t('anuncio.editar'))}</button>`);
  if (!travada && ['rascunho', 'ajuste'].includes(a.status) && a.origem === 'novo') B.push(`<button class="btn forte" data-act="enviar-um" data-id="${esc(a.id)}">${esc(t('anuncio.enviar'))}</button>`);
  if (!travada && a.status !== 'aprovacao') B.push(`<button class="btn leve perigo" data-act="tirar" data-id="${esc(a.id)}">${esc(t('anuncio.tirar'))}</button>`);
  return B.length ? `<div class="barra-acoes rodape">${B.join('')}</div>` : '';
}

// Formulário de criar/editar anúncio (aberto também da tela da rotação).
export function formAnuncio(a, rotacaoId) {
  const x = a || { canal: 'meta', formato: 'imagem', locais: ['feed'], objetivo: 'contatos', produtos: [], textos: {} };
  const T = x.textos || {};
  const radios = (nome, L, atual, rot, extra = () => '') => L.map((v) => `<label class="opcao"><input type="radio" name="${nome}" value="${v}" ${v === atual ? 'checked' : ''} data-mudou="${nome}"> <span><b>${esc(t(rot + v))}</b>${extra(v)}</span></label>`).join('');
  const locais = Object.entries(LOCAIS).map(([c, L]) => L.map((l) => `<label class="check" data-canal="${c}" ${c !== x.canal ? 'hidden' : ''}><input type="checkbox" name="locais" value="${l}" ${x.locais?.includes(l) ? 'checked' : ''}> ${esc(t('local.' + l))}</label>`).join('')).join('');
  const cats = S.catalogo.categorias;
  const prods = cats.map((c) => `<fieldset class="grupo-prod"><legend>${esc(t('cat.' + c))}</legend>${S.catalogo.produtos.filter((p) => p.cat === c).map((p) =>
    `<label class="check"><input type="checkbox" name="produtos" value="${p.id}" ${x.produtos?.includes(p.id) ? 'checked' : ''}> ${esc(p.nome)}</label>`).join('')}</fieldset>`).join('');
  janela(a ? t('anuncio.editar') : t('rot.novo_anuncio'), `<form class="form" data-form="anuncio" data-id="${esc(a?.id || '')}" data-r="${esc(rotacaoId || a?.rotacaoId || '')}">
    ${a?.status === 'aprovado' ? `<p class="aviso">${esc(t('anuncio.editar_aprovado'))}</p>` : ''}
    <label class="rotulo" for="fa-titulo">${esc(t('anuncio.nome'))}</label><input id="fa-titulo" name="titulo" value="${esc(x.titulo || '')}" maxlength="150" required placeholder="${esc(t('anuncio.nome.exemplo'))}">
    <fieldset><legend class="rotulo">${esc(t('anuncio.canal'))}</legend><div class="opcoes-linha">${radios('canal', CANAIS, x.canal, 'canal.')}</div></fieldset>
    <fieldset><legend class="rotulo">${esc(t('anuncio.onde'))}</legend><div class="opcoes-linha">${locais}</div></fieldset>
    <label class="rotulo" for="fa-formato">${esc(t('anuncio.formato'))}</label><select id="fa-formato" name="formato">${FORMATOS.map((f) => `<option value="${f}" ${f === x.formato ? 'selected' : ''}>${esc(t('formato.' + f))}</option>`).join('')}</select>
    <fieldset><legend class="rotulo">${esc(t('anuncio.objetivo'))}</legend><div class="opcoes">${radios('objetivo', OBJETIVOS, x.objetivo, 'objetivo.', (v) => `<small>${esc(t('objetivo.' + v + '.explica'))}</small>`)}</div></fieldset>
    <label class="rotulo" for="fa-publico">${esc(t('anuncio.publico'))}</label><textarea id="fa-publico" name="publico" rows="2" maxlength="500" placeholder="${esc(t('anuncio.publico.exemplo'))}">${esc(x.publico || '')}</textarea>
    <details class="caixa-prod" ${x.produtos?.length ? 'open' : ''}><summary class="rotulo">${esc(t('anuncio.produtos'))}</summary>${prods}</details>
    <h3>${esc(t('anuncio.textos'))}</h3><p class="dica">${esc(t('anuncio.textos.dica'))}</p>
    <label class="rotulo" for="fa-tt">${esc(t('anuncio.texto_titulo'))}</label><input id="fa-tt" name="t_titulo" value="${esc(T.titulo || '')}" maxlength="300">
    <label class="rotulo" for="fa-tx">${esc(t('anuncio.texto_principal'))}</label><textarea id="fa-tx" name="t_texto" rows="3" maxlength="3000">${esc(T.texto || '')}</textarea>
    <div class="duas"><div><label class="rotulo" for="fa-cta">${esc(t('anuncio.cta'))}</label><input id="fa-cta" name="t_cta" value="${esc(T.cta || '')}" maxlength="60" placeholder="Learn more"></div>
    <div><label class="rotulo" for="fa-link">${esc(t('anuncio.link'))}</label><input id="fa-link" name="t_link" type="url" value="${esc(T.link || '')}" placeholder="https://spraytecusa.com/…"></div></div>
    <label class="rotulo" for="fa-drive">${esc(t('anuncio.drive'))}</label><input id="fa-drive" name="linkDrive" type="url" value="${esc(x.linkDrive || '')}" placeholder="https://drive.google.com/…">
    <p class="dica">${esc(t('anuncio.drive.dica'))}</p>
    <label class="rotulo" for="fa-nota">${esc(t('anuncio.nota'))}</label><textarea id="fa-nota" name="nota" rows="2" maxlength="1000">${esc(x.nota || '')}</textarea>
    <p class="dica">${esc(t('anuncio.nota.dica'))}</p>
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('geral.salvar'))}</button></div></form>`, { larga: true });
}
export async function salvarAnuncio(f) {
  const fd = new FormData(f);
  const d = {
    id: f.dataset.id || undefined, rotacaoId: f.dataset.r, titulo: fd.get('titulo'), canal: fd.get('canal'), formato: fd.get('formato'),
    locais: fd.getAll('locais').filter((l) => LOCAIS[fd.get('canal')].includes(l)), objetivo: fd.get('objetivo'), produtos: fd.getAll('produtos'),
    publico: fd.get('publico'), linkDrive: fd.get('linkDrive'), nota: fd.get('nota'),
    textos: { titulo: fd.get('t_titulo'), texto: fd.get('t_texto'), cta: fd.get('t_cta'), link: fd.get('t_link') },
  };
  const r = await acao('anuncio-salvar', d, { ok: t('geral.salvo') });
  if (r?.criado) ir('anuncio/' + r.criado);
}
// Trocar o canal mostra os lugares daquele canal.
export function mudouCanal(el) {
  const f = el.closest('form');
  f.querySelectorAll('[data-canal]').forEach((l) => { l.hidden = l.dataset.canal !== el.value; });
}

// Depois de aprovar ou pedir ajuste, o Renato segue para o próximo anúncio da mesma rotação.
function proximo(rid) {
  const p = anunciosDe(rid).find((x) => x.origem === 'novo' && x.status === 'aprovacao');
  ir(p ? 'anuncio/' + p.id : 'rotacao/' + rid);
}

export const cliques = {
  previa: (el) => { localPrevia = el.dataset.l; desenhar(); },
  aprovar: async (el) => {
    const a = anuncio(el.dataset.id);
    if (await acao('anuncio-aprovar', { id: a.id, versao: Number(el.dataset.v) }, { ok: t('ap.aprovado_ok') })) proximo(a.rotacaoId);
  },
  ajuste: (el) => janela(t('ap.ajuste'), `<form class="form" data-form="ajuste" data-id="${esc(el.dataset.id)}"><p class="dica">${esc(t('ap.ajuste_dica'))}</p>
    <label class="rotulo" for="f-aj">${esc(t('ap.o_que_mudar'))}</label><textarea id="f-aj" name="texto" rows="5" maxlength="3000" required></textarea>
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('ap.ajuste_enviar'))}</button></div></form>`),
  editar: (el) => formAnuncio(anuncio(el.dataset.id)),
  'enviar-um': (el) => {
    const a = anuncio(el.dataset.id), r = rotacao(a.rotacaoId);
    confirmar(t('anuncio.enviar_confirma', { prazo: data(r.prazo) }), t('anuncio.enviar'), () => acao('anuncio-enviar', { rotacaoId: r.id, ids: [a.id] }, { ok: t('rot.enviado_ok') }));
  },
  tirar: (el) => {
    const a = anuncio(el.dataset.id);
    if (a.origem === 'continua') {
      janela(t('anuncio.tirar'), `<form class="form" data-form="tirar" data-id="${esc(a.id)}"><p>${esc(t('anuncio.tirar_continua'))}</p>
        <label class="rotulo" for="f-mot">${esc(t('rot.dec.motivo'))}</label><input id="f-mot" name="motivo" maxlength="500">
        <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn perigo" type="submit">${esc(t('anuncio.tirar'))}</button></div></form>`);
    } else confirmar(t('anuncio.tirar_confirma'), t('anuncio.tirar'), async () => { if (await acao('anuncio-remover', { id: a.id })) ir('rotacao/' + a.rotacaoId); }, true);
  },
  numeros: (el) => {
    const a = anuncio(el.dataset.id), R = a.resultado?.origem === 'manual' ? a.resultado : {};
    const campo = (k) => `<div><label class="rotulo" for="n-${k}">${esc(t('res.' + k))}</label><input id="n-${k}" name="${k}" type="number" min="0" step="any" value="${R[k] ?? ''}"></div>`;
    janela(t('res.digitar'), `<form class="form" data-form="numeros" data-id="${esc(a.id)}"><p class="dica">${esc(t('res.digitar_dica'))}</p>
      <div class="duas">${campo('investimento')}${campo('impressoes')}</div><div class="duas">${campo('cliques')}${campo('contatos')}</div>
      <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('geral.salvar'))}</button></div></form>`);
  },
  'tirar-arquivo': (el) => confirmar(t('arq.tirar_confirma'), t('geral.tirar'), () => acao('arquivo-remover', { anuncioId: el.dataset.a, id: el.dataset.id })),
};
export const formularios = {
  anuncio: salvarAnuncio,
  ajuste: async (f) => {
    const a = anuncio(f.dataset.id);
    if (await acao('anuncio-ajuste', { id: a.id, texto: new FormData(f).get('texto') }, { ok: t('ap.ajuste_ok') })) proximo(a.rotacaoId);
  },
  tirar: async (f) => {
    const a = anuncio(f.dataset.id);
    if (await acao('anuncio-remover', { id: a.id, motivo: new FormData(f).get('motivo') })) ir('rotacao/' + a.rotacaoId);
  },
  numeros: (f) => {
    const fd = new FormData(f);
    acao('anuncio-resultado', { id: f.dataset.id, resultado: Object.fromEntries(['investimento', 'impressoes', 'cliques', 'contatos'].map((k) => [k, fd.get(k)])) }, { ok: t('geral.salvo') });
  },
};
export const mudancas = {
  canal: mudouCanal,
  arquivo: async (el) => {
    const files = [...el.files];
    for (const f of files) await enviarArquivo(f, el.dataset.id);
    await recarregar(); desenhar();
    if (files.length) toast(t('arq.enviado_ok'), 'bom');
  },
};
export { produto };
