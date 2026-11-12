// Peças da rotação de anúncios usadas em mais de uma tela.
import { t, periodo, dataHora } from '../i18n.js';
import { esc, selo, conteudo } from '../ui.js';
import { S } from '../app.js';

export const OBJETIVOS = ['contatos', 'lembrar', 'marca', 'protecao', 'concorrentes'];
export const CANAIS = ['meta', 'google'];
export const FORMATOS = ['imagem', 'video', 'carrossel', 'texto'];
export const LOCAIS = { meta: ['feed', 'stories', 'reels'], google: ['pesquisa', 'youtube', 'display', 'pmax'] };
export const SEMAFOROS = ['bem', 'atencao', 'cansado'];
export const BOLA = { bem: '🟢', atencao: '🟡', cansado: '🔴' };

export const rotacao = (id) => S.dados.rotacoes.find((r) => r.id === id);
export const anunciosDe = (rid) => S.dados.anuncios.filter((a) => a.rotacaoId === rid);
export const nomeRotacao = (r) => periodo(r.ini, r.fim);
// Rotações da mais nova para a mais antiga.
export const rotacoesOrdenadas = () => [...S.dados.rotacoes].sort((a, b) => b.ini.localeCompare(a.ini));
export const produto = (id) => S.catalogo?.produtos.find((p) => p.id === id);
export const nomeProduto = (id) => produto(id)?.nome || id;

export const statusAnuncio = (a) => `<span class="pill st-${esc(a.status)}"><i></i>${esc(t('st_anuncio.' + a.status))}</span>`;
export const statusRotacao = (r) => `<span class="pill rst-${esc(r.status)}"><i></i>${esc(t('st_rotacao.' + r.status))}</span>`;
export const semaforo = (a) => (a.semaforo ? `<span class="semaforo s-${esc(a.semaforo)}">${BOLA[a.semaforo]} ${esc(t('semaforo.' + a.semaforo))}</span>` : '');
export const canalSelo = (c) => `<span class="canal c-${esc(c)}">${esc(t('canal.' + c))}</span>`;

// Imagem que representa o anúncio: o primeiro arquivo de imagem (Drive) ou a imagem de exemplo.
export function imagemDe(a, tam = 600) {
  const arq = (a.arquivos || []).find((x) => !x.removido && /^image\//.test(x.tipo || ''));
  if (arq) return `/api/arquivos/${encodeURIComponent(arq.id)}/miniatura?t=${tam}`;
  const vid = (a.arquivos || []).find((x) => !x.removido && /^video\//.test(x.tipo || ''));
  if (vid) return `/api/arquivos/${encodeURIComponent(vid.id)}/miniatura?t=${tam}`;
  return a.exemploImg || '';
}

// Cartão do anúncio nas colunas da rotação.
export function cartaoAnuncio(a) {
  const img = imagemDe(a, 400);
  const capa = img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="capa-texto">${esc(a.textos?.titulo || a.titulo)}</span>`;
  const aprov = a.aprovadoPor && ['aprovado', 'no_ar', 'continua', 'encerrado'].includes(a.status)
    ? `<p class="miudo">✓ ${esc(t('anuncio.aprovado_por', { nome: a.aprovadoPor, quando: dataHora(a.aprovadoEm) }))}</p>` : '';
  return `<a class="cartao-anuncio" href="#/anuncio/${esc(a.id)}">
    <span class="capa">${capa}${a.exemploImg && !(a.arquivos || []).some((x) => !x.removido) ? `<span class="selo exemplo flutua">${esc(t('exemplo.selo'))}</span>` : ''}</span>
    <span class="cartao-corpo"><b>${esc(a.titulo)}</b>
    <span class="chips">${canalSelo(a.canal)}<span class="chip">${esc(t('objetivo.' + a.objetivo))}</span></span>
    <span class="linha-st">${statusAnuncio(a)}${a.versao > 1 ? `<small>${esc(t('anuncio.versao', { n: a.versao }))}</small>` : ''}${semaforo(a)}</span>${aprov}</span></a>`;
}

// Os 4 passos da rotação, com a etapa atual destacada.
const PASSOS = ['montar', 'aprovar', 'no_ar', 'resultado'];
const ATUAL = { montando: 0, aprovacao: 1, aprovada: 2, no_ar: 2, encerrada: 4 };
export function passos(r) {
  const i = ATUAL[r.status] ?? 0;
  const feito = (k) => k < i;
  return `<ol class="passos" aria-label="${esc(t('rot.passos'))}">${PASSOS.map((p, k) => `<li class="${feito(k) ? 'feito' : ''}${k === i ? ' atual' : ''}"${k === i ? ' aria-current="step"' : ''}>
    <span class="n">${feito(k) ? '✓' : k + 1}</span><span><b>${esc(t('passo.' + p))}</b><small>${esc(t('passo.' + p + '.dica'))}</small></span></li>`).join('')}</ol>`;
}

// Motivo de saída (traduzido quando houver).
export const motivoSaida = (s) => (s.motivo ? conteudo(s, 'motivo') : `<span class="vazio">${esc(t('rot.sem_motivo'))}</span>`);
export { selo };
