// Ações do portal. Toda alteração passa por aqui: o servidor confere o papel de quem pede,
// aplica a regra e grava. A tela nunca altera dados direto.
import {
  ErroAcao, STATUS, ETAPAS_VIDEO, addDays, addBiz, clone, fmt, isoValida, novoId, texto,
  type Papel, type Usuario,
} from './dominio.ts';
import type { Estado } from './estado.ts';
import { envioDe } from './integracoes/drive.ts';

export type Pessoa = { id: string; nome: string; papel: string };
export type Ctx = { e: Estado; u: Usuario; d: any; hoje: string; agora: string; pessoas: Pessoa[] };
// Aviso por e-mail que sai depois de gravar (ex.: menção). "abrir" é o item que o link abre no portal.
export type Aviso = { para: string[]; assunto: string; paragrafos: string[]; abrir: string };
export type Resultado = { resumo: string; criado?: string; avisos?: Aviso[] };
type Def = { papeis: Papel[]; semAuditoria?: boolean; fn: (c: Ctx) => Resultado };

// ---------- utilidades ----------
// Menções: a tela completa "@Nome Sobrenome"; "@Nome" também vale quando só uma pessoa tem esse primeiro nome.
// Só conta quem pode ler o que foi escrito (papeis), e ninguém menciona a si mesmo.
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function mencoes(pessoas: Pessoa[], eu: string, txt: string, papeis: string[]): string[] {
  const t = txt.toLowerCase();
  const pode = pessoas.filter((p) => papeis.includes(p.papel) && p.id !== eu);
  const primeiro = (p: Pessoa) => p.nome.toLowerCase().split(/\s+/)[0];
  const fim = '(?![\\p{L}\\d])';
  return pode.filter((p) => new RegExp('@' + escRe(p.nome.toLowerCase()) + fim, 'u').test(t)
    || (pode.filter((x) => primeiro(x) === primeiro(p)).length === 1 && new RegExp('@' + escRe(primeiro(p)) + fim, 'u').test(t))).map((p) => p.id);
}
const trecho = (s: string) => (s.length > 300 ? s.slice(0, 297) + '...' : s);
const PRODUCAO = ['video', 'design'];
const ehProducao = (p: any) => PRODUCAO.includes(p.rede);
// Posts e e-mails passam pela aprovação da pauta; produção de design/vídeo e o plano têm fluxo próprio.
const temPauta = (p: any) => !ehProducao(p) && p.formato !== 'plano';
const EM_APROVACAO = ['pauta_aprovacao', 'texto_aprovacao', 'aprovacao'];
function hist(c: Ctx, alvo: any, t: string) {
  alvo.hist = alvo.hist || [];
  alvo.hist.push({ q: c.agora, t, por: c.u.nome, em: new Date().toISOString() });
}
function post(c: Ctx, id: unknown) {
  const p = c.e.posts.find((x) => x.id === id);
  if (!p) throw new ErroAcao('Item não encontrado. Atualize a página.');
  return p;
}
function video(c: Ctx, id: unknown) {
  const v = c.e.videos.find((x) => x.id === id);
  if (!v) throw new ErroAcao('Vídeo não encontrado. Atualize a página.');
  return v;
}
function demanda(c: Ctx, id: unknown) {
  const d = c.e.demandas.find((x) => x.id === id);
  if (!d) throw new ErroAcao('Demanda não encontrada. Atualize a página.');
  return d;
}
function related(e: Estado, ref: string): string[] {
  return e.links.filter((l) => l[0] === ref || l[1] === ref).map((l) => (l[0] === ref ? l[1] : l[0])).filter((x, i, a) => a.indexOf(x) === i);
}
function refValida(e: Estado, ref: unknown): string | null {
  if (typeof ref !== 'string' || !ref) return null;
  const [k, id] = ref.split(':');
  const ok = k === 'p' ? e.posts.some((x) => x.id === id) : k === 'd' ? e.demandas.some((x) => x.id === id) : k === 'v' ? e.videos.some((x) => x.id === id) : false;
  return ok ? ref : null;
}
function markLinkedDemands(e: Estado, ref: string, test: (d: any) => boolean) {
  related(e, ref).forEach((r) => {
    if (r.startsWith('d:')) { const dm = e.demandas.find((x) => x.id === r.slice(2)); if (dm && test(dm)) dm.feito = true; }
  });
}
const pendingApprovals = (e: Estado) => e.posts.filter((p) => EM_APROVACAO.includes(p.status) && !p.faltaTexto);
const planoItem = (e: Estado) => e.posts.find((p) => p.formato === 'plano');
const lado = (u: Usuario) => (u.papel === 'operacao' ? 'spraytec' : 'cancha');

function aprovarPlano(c: Ctx, quem: string, canal: string) {
  const pl = c.e.plano, pd = pl && pl.pendente;
  if (!pd) throw new ErroAcao('Não há nova versão do plano para aprovar.');
  if (pd.ajuste) throw new ErroAcao('Esta versão tem ajuste pedido. Espere a Cancha reenviar.');
  pl.hist.push({ v: pd.versao, q: c.agora, t: `Alterações aprovadas por ${quem} · ${canal}`, nota: pd.nota, antes: clone(pl.dados), depois: clone(pd.dados) });
  pl.versao = pd.versao; pl.aprovado = fmt(c.hoje); pl.dados = pd.dados; pl.pendente = null;
}

// quem: nome da pessoa da Spraytec que aprovou (quem clicou, ou quem a Cancha registrou).
function aprovar(c: Ctx, p: any, quem: string, canal: string) {
  if (p.formato === 'plano') {
    aprovarPlano(c, quem, canal);
    p.status = 'aprovado'; p.titulo = 'Plano de mídia · versão ' + c.e.plano.versao;
    hist(c, p, `Alterações aprovadas por ${quem} · ${canal}`);
    markLinkedDemands(c.e, 'p:' + p.id, (x) => x.quem === 'spraytec');
    return;
  }
  if (!EM_APROVACAO.includes(p.status) || p.faltaTexto) throw new ErroAcao('Este item não está esperando aprovação.');
  if (p.status === 'pauta_aprovacao') {
    p.status = 'producao'; delete p.validacao;
    hist(c, p, `Pauta aprovada por ${quem} · ${canal}`);
    return;
  }
  // Textos aprovados: o item volta para a Cancha produzir a arte (a legenda aprovada fica como está).
  if (p.status === 'texto_aprovacao') {
    p.status = 'producao'; p.textoOk = true; delete p.validacao;
    hist(c, p, `Textos aprovados por ${quem} · ${canal}`);
    // Reels, vídeos e Shorts usam vídeo pronto da produtora: sem arte a criar. Se o vídeo já está anexado,
    // vai direto para a aprovação do vídeo (a Spraytec vê o vídeo e a legenda juntos).
    if (['reel', 'video', 'short'].includes(p.formato) && vivos(p.arquivos).some((a: any) => /^video\//.test(a.tipo || ''))) {
      enviarPeca(c, p);
      hist(c, p, 'Vídeo da produtora já anexado: foi direto para a aprovação do vídeo');
    }
    return;
  }
  p.status = 'aprovado'; delete p.validacao;
  hist(c, p, `Aprovado por ${quem} · ${canal}`);
  if (!pendingApprovals(c.e).length) c.e.demandas.filter((d) => d.quem === 'spraytec' && !d.feito && /^Aprovar calendário/.test(d.t)).forEach((d) => (d.feito = true));
  markLinkedDemands(c.e, 'p:' + p.id, (x) => x.quem === 'spraytec' && /^(Aprovar|Validar)/.test(x.t));
}

function roteiroSync(c: Ctx, v: any) {
  related(c.e, 'v:' + v.id).forEach((r) => {
    if (!r.startsWith('d:')) return;
    const dm = c.e.demandas.find((y) => y.id === r.slice(2));
    const vs = related(c.e, r).filter((x) => x.startsWith('v:')).map((x) => c.e.videos.find((y) => y.id === x.slice(2)));
    if (dm && vs.every((y) => y && y.stage !== 'roteiro')) dm.feito = true;
  });
}

function entregarVideo(c: Ctx, v: any) {
  v.stage = 'entregue';
  let p = v.postId && c.e.posts.find((x) => x.id === v.postId);
  if (!p) {
    p = { id: novoId('p'), date: null, time: null, rede: 'yt', formato: 'video', titulo: v.titulo, pilar: 'Campo', produto: '—', status: 'aprovacao', rodada: 1, legenda: '', comments: [], hist: [] };
    c.e.posts.push(p); v.postId = p.id; c.e.links.push(['v:' + v.id, 'p:' + p.id]);
  }
  p.status = 'aprovacao'; p.faltaTexto = true; p.prazo = addBiz(c.hoje, 2);
  hist(c, p, 'Vídeo final entregue pela produtora (pasta do Drive)');
  related(c.e, 'v:' + v.id).forEach((r) => {
    const x = r.startsWith('p:') && c.e.posts.find((y) => y.id === r.slice(2));
    if (x && x.rede === 'video') { x.status = 'publicado'; hist(c, x, 'Concluído: vídeo entregue'); }
  });
}

function mudarStatus(c: Ctx, p: any, ns: string, link?: string) {
  if (!STATUS[ns]) throw new ErroAcao('Status inválido.');
  if (p.formato === 'plano') throw new ErroAcao('O status do plano muda pela aprovação do plano.');
  if (p.status === ns) return false;
  const prod = ehProducao(p);
  if (!prod && ['aprovado', 'agendado'].includes(ns) && !['aprovado', 'agendado', 'publicado'].includes(p.status)) {
    if (p.status === 'aprovacao')
      throw new ErroAcao('Só a Spraytec aprova. Se aprovaram por WhatsApp ou e-mail, registre aqui.', 'precisa-registro');
    throw new ErroAcao('Só a Spraytec aprova. Envie para aprovação primeiro.');
  }
  if (ns === 'producao' && p.status === 'texto_aprovacao')
    throw new ErroAcao('Os textos precisam ser aprovados pela Spraytec. Se aprovaram por WhatsApp ou e-mail, registre aqui.', 'precisa-registro');
  if (temPauta(p) && ns === 'producao' && ['pauta', 'pauta_aprovacao'].includes(p.status)) {
    if (p.status === 'pauta_aprovacao')
      throw new ErroAcao('A pauta precisa ser aprovada pela Spraytec. Se aprovaram por WhatsApp ou e-mail, registre aqui.', 'precisa-registro');
    throw new ErroAcao('Envie a pauta para aprovação da Spraytec antes de produzir.');
  }
  if (!prod && ns === 'publicado' && !['aprovado', 'agendado'].includes(p.status)) throw new ErroAcao('Para publicar, o item precisa estar aprovado.');
  const was = p.status;
  p.status = ns;
  if (EM_APROVACAO.includes(ns)) p.prazo = addBiz(c.hoje, 2);
  if (!EM_APROVACAO.includes(ns)) delete p.validacao;
  // A peça que foi para aprovação fica marcada como enviada, venha do botão, do seletor ou do kanban.
  if (ns === 'aprovacao' && !prod) marcarVersaoEnviada(p);
  if (ns === 'publicado') {
    p.pubVia = 'manual';
    if (link) p.pubLink = link;
    hist(c, p, (prod ? 'Concluído' : 'Publicado') + ' · marcado à mão pela Cancha' + (link ? ' · ' + link : ''));
  } else if (ns === 'agendado') hist(c, p, 'Agendado na rede pela Cancha (marcado à mão)');
  else hist(c, p, `Status: ${STATUS[was] || was} → ${STATUS[ns]}`);
  if (ns === 'espera') { p.date = null; p.time = null; }
  return true;
}

function linkUrl(v: unknown, campo: string): string {
  const s = texto(v, campo, 600, false);
  if (s && !/^https?:\/\//i.test(s)) throw new ErroAcao(`${campo}: cole um link que comece com https://`);
  return s;
}
const lista = (v: unknown, max = 60) => (Array.isArray(v) ? v : []).map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).slice(0, max).map((x) => x.slice(0, 500));

// Envios para aprovação (usados pelos botões e pela planilha).
function enviarPauta(c: Ctx, p: any) {
  if (!temPauta(p)) throw new ErroAcao('Este item não passa por aprovação de pauta.');
  if (p.status !== 'pauta') throw new ErroAcao('Só pautas podem ser enviadas para aprovação.');
  if (!String(p.pauta || '').trim()) throw new ErroAcao('Escreva a pauta antes de enviar para aprovação.');
  p.status = 'pauta_aprovacao'; p.prazo = addBiz(c.hoje, 2); hist(c, p, 'Pauta enviada para aprovação');
}
// Calendário do mês: a legenda de cada post vai para aprovação antes da arte.
function enviarTextos(c: Ctx, p: any) {
  if (!temPauta(p)) throw new ErroAcao(`"${p.titulo}" não tem etapa de textos.`);
  if (p.status !== 'producao') throw new ErroAcao(`"${p.titulo}" não está em produção.`);
  if (p.textoOk) throw new ErroAcao(`Os textos de "${p.titulo}" já foram aprovados.`);
  if (!String(p.legenda || '').trim()) throw new ErroAcao(`Escreva a legenda de "${p.titulo}" antes de enviar.`);
  p.status = 'texto_aprovacao'; p.prazo = addBiz(c.hoje, 3); hist(c, p, 'Textos enviados para aprovação');
}
function enviarPeca(c: Ctx, p: any) {
  if (p.status !== 'producao' || ehProducao(p)) throw new ErroAcao('Só posts e e-mails em produção vão para aprovação.');
  p.status = 'aprovacao'; p.prazo = addBiz(c.hoje, 2); hist(c, p, 'Enviado para aprovação');
  marcarVersaoEnviada(p);
}
function reenviar(c: Ctx, p: any) {
  if (p.status !== 'ajuste') throw new ErroAcao('Só itens com ajuste pedido recebem nova versão.');
  if (p.formato === 'plano') throw new ErroAcao('Para o plano, edite o quadro e envie de novo.');
  const pauta = p.etapaAjuste === 'pauta';
  if (p.etapaAjuste === 'texto') {
    p.status = 'texto_aprovacao'; p.prazo = addBiz(c.hoje, 3); delete p.etapaAjuste;
    hist(c, p, 'Textos ajustados e reenviados para aprovação');
    return false;
  }
  p.status = pauta ? 'pauta_aprovacao' : 'aprovacao'; p.prazo = addBiz(c.hoje, 2); delete p.etapaAjuste;
  if (!pauta) { p.rodada = Math.min(3, (p.rodada || 1) + 1); marcarVersaoEnviada(p); }
  hist(c, p, pauta ? 'Pauta ajustada e reenviada para aprovação' : `Nova versão (rodada ${p.rodada}) enviada para aprovação`);
  return pauta;
}
// Peças no Drive: a versão que foi para aprovação fica marcada; o próximo envio abre a versão seguinte.
const vivos = (l: any[] | undefined) => (l || []).filter((a) => !a.removido);
function marcarVersaoEnviada(p: any) { if (vivos(p.arquivos).length) p.vEnviada = p.vPeca || 1; }
// Depois da aprovação, a pasta do post no Drive fica só com a versão aprovada: as outras versões (e o que foi
// tirado do portal) vão para a subpasta "Versões antigas", que continua guardada como histórico.
export function versoesParaArquivar(e: Estado) {
  const out: { id: string; caminho: string[]; ids: string[] }[] = [];
  for (const p of e.posts) {
    if (!['aprovado', 'agendado', 'publicado'].includes(p.status) || !p.vEnviada || !p.pastaDrive) continue;
    const ids = (p.arquivos || []).filter((a: any) => !a.antiga && ((a.v || 1) !== p.vEnviada || a.removido)).map((a: any) => a.id);
    if (ids.length) out.push({ id: p.id, caminho: [...p.pastaDrive, 'Versões antigas'], ids });
  }
  return out;
}

// Onde cada arquivo fica no Drive e quem pode anexar. É conferido antes de o envio começar e de novo ao registrar.
export function destinoArquivo(e: Estado, u: Usuario, ref: string): string[] {
  const i = ref.indexOf(':'), k = ref.slice(0, i), id = ref.slice(i + 1);
  const papel = (ok: string[], msg: string) => { if (!ok.includes(u.papel)) throw new ErroAcao(msg); };
  if (k === 'p') {
    const p = e.posts.find((x) => x.id === id); if (!p) throw new ErroAcao('Item não encontrado. Atualize a página.');
    papel(['cancha'], 'Só a Cancha anexa peças aos posts.');
    if (p.formato === 'plano') throw new ErroAcao('O plano de mídia não recebe arquivos.');
    // Durante a aprovação da pauta ou dos textos a arte já pode ir sendo anexada; só trava com a própria arte em aprovação.
    if (p.status === 'aprovacao') throw new ErroAcao('A arte deste item está em aprovação. Espere a resposta da Spraytec ou registre o ajuste antes de enviar outra versão.');
    return p.pastaDrive || ['Posts', p.date ? p.date.slice(0, 7) : 'Sem data', `${p.date || 'sem data'} ${p.titulo} (${p.id})`];
  }
  if (k === 'v') {
    const v = e.videos.find((x) => x.id === id); if (!v) throw new ErroAcao('Vídeo não encontrado. Atualize a página.');
    papel(['cancha', 'produtora'], 'Só a Cancha e a produtora anexam arquivos aos vídeos.');
    return v.pastaDrive || ['Vídeos', `${v.titulo} (${v.id})`];
  }
  if (k === 'd') {
    const d = e.demandas.find((x) => x.id === id); if (!d) throw new ErroAcao('Demanda não encontrada. Atualize a página.');
    papel(['cancha', 'operacao'], 'Só a Cancha e a Operação Spraytec anexam arquivos às demandas.');
    return d.pastaDrive || ['Demandas', String(d.data || '').slice(0, 7) || 'Sem data', `${d.t} (${d.id})`];
  }
  if (k === 'm') {
    papel(['cancha', 'operacao'], 'Só a Cancha e a Operação Spraytec enviam materiais.');
    const pasta = id.trim().slice(0, 60); if (!pasta) throw new ErroAcao('Escolha a pasta do material.');
    return ['Materiais', pasta];
  }
  throw new ErroAcao('Destino do arquivo inválido.');
}
function alvoArquivo(c: Ctx, ref: string): { x: any; nome: string } {
  const i = ref.indexOf(':'), k = ref.slice(0, i), id = ref.slice(i + 1);
  if (k === 'p') { const p = post(c, id); return { x: p, nome: `"${p.titulo}"` }; }
  if (k === 'v') { const v = video(c, id); return { x: v, nome: `o vídeo "${v.titulo}"` }; }
  if (k === 'd') { const d = demanda(c, id); return { x: d, nome: `a demanda "${d.t}"` }; }
  return { x: null, nome: `Materiais › ${id}` };
}

const etapaDaPauta = (p: any) => temPauta(p) && (p.status === 'pauta' || p.status === 'espera' || (p.status === 'ajuste' && p.etapaAjuste === 'pauta'));
const EDITAVEL = ['pauta', 'producao', 'ajuste', 'espera'];
const igual = (a: unknown, b: unknown) => String(a ?? '').replace(/\r\n?/g, '\n').trim() === String(b ?? '').replace(/\r\n?/g, '\n').trim();

// Atualiza um item existente a partir de uma linha da planilha. Campo vazio na planilha = mantém o que está no portal.
// Conteúdo só muda enquanto o item está em preparo; o que já foi para aprovação só aceita classificação e data.
function atualizarItem(c: Ctx, p: any, l: any, arquivo: string): boolean {
  const vale = (v: unknown) => typeof v === 'string' && v.trim() !== '';
  // Design e vídeo não têm pauta: o texto da coluna pauta vale como descrição.
  if (!temPauta(p) && vale(l.pauta) && !vale(l.legenda)) l = { ...l, legenda: l.pauta, pauta: '' };
  const mud: string[] = [];
  if (vale(l.tipo) && l.tipo !== p.rede + '|' + p.formato) throw new ErroAcao('O canal e o formato não mudam pela planilha.');
  const conteudo = (campo: string, nome: string, atual: unknown, novo: unknown, aplica: (v: string) => void) => {
    if (!vale(novo) || igual(atual, novo)) return;
    if (!EDITAVEL.includes(p.status)) throw new ErroAcao(`"${p.titulo}" está em "${STATUS[p.status]}" e o ${nome} não muda mais. Para mudar, volte o item para produção no portal.`);
    if (campo === 'pauta' && !etapaDaPauta(p)) throw new ErroAcao(`a pauta de "${p.titulo}" já foi aprovada e não muda.`);
    aplica(String(novo).trim()); mud.push(nome);
  };
  conteudo('titulo', 'título', p.titulo, l.titulo, (v) => (p.titulo = texto(v, 'título', 200)));
  conteudo('pauta', 'pauta', p.pauta, l.pauta, (v) => (p.pauta = texto(v, 'pauta', 4000)));
  conteudo('legenda', 'legenda', p.legenda, l.legenda, (v) => (p.legenda = texto(v, 'legenda', 6000)));
  conteudo('drive', 'link do Drive', p.drive, l.drive, (v) => (p.drive = linkUrl(v, 'Link do Drive')));
  if (!ehProducao(p)) conteudo('hora', 'horário', p.time, l.hora, (v) => { if (!/^\d{2}:\d{2}$/.test(v)) throw new ErroAcao('Horário inválido.'); p.time = v; });
  if (vale(l.pilar) && l.pilar !== p.pilar) { p.pilar = texto(l.pilar, 'pilar', 40); mud.push('pilar'); }
  if (vale(l.produto) && l.produto !== p.produto) { p.produto = texto(l.produto, 'produto', 80); mud.push('produto'); }
  if (vale(l.data) && l.data !== p.date) {
    if (!isoValida(l.data)) throw new ErroAcao('Data inválida.');
    if (p.status === 'publicado') throw new ErroAcao(`"${p.titulo}" já foi publicado e não muda de data.`);
    p.date = l.data; mud.push('data');
    if (p.status === 'espera') p.status = 'pauta';
    if (p.status === 'agendado') { p.status = 'aprovado'; mud.push('precisa agendar de novo'); }
  }
  if (mud.length) hist(c, p, `Atualizado pela planilha "${arquivo}" (${mud.join(', ')})`);
  // Etapa: a planilha só faz o passo seguinte do fluxo (enviar para aprovação). O resto é pelo portal.
  const etapa = vale(l.etapa) ? l.etapa : '';
  if (etapa && etapa !== p.status) {
    if (etapa === 'pauta_aprovacao' && p.status === 'pauta') enviarPauta(c, p);
    else if (etapa === 'aprovacao' && p.status === 'producao' && !ehProducao(p)) enviarPeca(c, p);
    else if (etapa === 'texto_aprovacao' && p.status === 'producao') enviarTextos(c, p);
    else if (p.status === 'ajuste' && etapa === ({ pauta: 'pauta_aprovacao', texto: 'texto_aprovacao' } as any)[p.etapaAjuste] || (p.status === 'ajuste' && !['pauta', 'texto'].includes(p.etapaAjuste) && etapa === 'aprovacao')) reenviar(c, p);
    else throw new ErroAcao(`"${p.titulo}" está em "${STATUS[p.status]}" e não vai para "${STATUS[etapa] || etapa}" pela planilha. Faça essa mudança no portal.`);
    mud.push('etapa');
  }
  return mud.length > 0;
}

// Cria um item do calendário (usado pelo "+ Adicionar" e pela importação de planilha).
const TIPOS_NOVO = ['ig|post', 'ig|carrossel', 'ig|reel', 'ig|story', 'fb|post', 'yt|video', 'yt|short', 'email|newsletter', 'design|producao', 'video|gravacao', 'video|entrega'];
function novoItem(c: Ctx, d: any): string {
  const tipo = String(d.tipo || ''), t = texto(d.titulo, 'título', 200), date = isoValida(d.data) ? d.data : c.hoje;
  if (tipo.startsWith('demanda|')) {
    const txt = texto(d.pauta ?? d.texto, 'detalhes', 4000, false);
    const quem = tipo.split('|')[1] === 'cancha' ? 'cancha' : 'spraytec';
    const dm = { id: novoId('d'), quem, t, data: date, det: txt };
    c.e.demandas.push(dm);
    return 'd:' + dm.id;
  }
  if (!TIPOS_NOVO.includes(tipo)) throw new ErroAcao(`Tipo inválido: ${tipo || '(vazio)'}.`);
  const [rede, formato] = tipo.split('|');
  const hora = typeof d.hora === 'string' && /^\d{2}:\d{2}$/.test(d.hora) ? d.hora : null;
  // Posts e e-mails têm pauta (tema e ideia, aprovada pela Spraytec) e legenda (texto final). Design e vídeo têm só descrição.
  const comPauta = !PRODUCAO.includes(rede);
  const p: any = {
    id: novoId('p'), date, time: PRODUCAO.includes(rede) ? null : hora, rede, formato, titulo: t,
    pilar: texto(d.pilar, 'pilar', 40, false) || 'Manejo', produto: texto(d.produto, 'produto', 80, false) || '—',
    status: 'pauta', rodada: 1, pauta: comPauta ? texto(d.pauta ?? d.texto, 'pauta', 4000, false) : '',
    legenda: texto(comPauta ? d.legenda : d.legenda || d.pauta || d.texto, 'legenda', 6000, false), comments: [], hist: [],
  };
  const dv = linkUrl(d.drive, 'Material no Google Drive');
  if (dv) p.drive = dv;
  hist(c, p, (d.origem || 'Adicionado ao calendário') + ' por ' + c.u.nome + (c.u.papel === 'operacao' ? ' (sugestão)' : ''));
  if (c.u.papel === 'operacao') p.comments.push({ who: c.u.nome, text: 'Pauta sugerida por mim pelo calendário.', interno: false, quando: c.agora });
  if (d.etapa === 'pauta_aprovacao' && c.u.papel === 'cancha') enviarPauta(c, p);
  // Calendário montado fora do portal (antes de ele entrar em uso), com a pauta já combinada: entra direto
  // com os textos para a Spraytec aprovar aqui. Não registra aprovação de pauta que não passou pelo portal.
  else if (d.etapa === 'texto_aprovacao' && c.u.papel === 'cancha') {
    if (!comPauta) throw new ErroAcao('Design e vídeo não têm etapa de textos.');
    if (!String(p.pauta || '').trim() || !String(p.legenda || '').trim()) throw new ErroAcao('Para entrar em Textos em aprovação, preencha a pauta e a legenda.');
    p.status = 'producao';
    hist(c, p, 'Pauta combinada fora do portal, antes de ele entrar em uso: entrou direto com os textos');
    enviarTextos(c, p);
  }
  else if (d.etapa && d.etapa !== 'pauta') throw new ErroAcao('Item novo entra como Pauta, Pauta em aprovação ou Textos em aprovação.');
  c.e.posts.push(p);
  return 'p:' + p.id;
}

// ---------- ações ----------
const C: Papel[] = ['cancha'];
const M: Papel[] = ['operacao'];
const MC: Papel[] = ['operacao', 'cancha'];

export const ACOES: Record<string, Def> = {
  // Aprovação (Operação Spraytec)
  aprovar: {
    papeis: M,
    fn: (c) => { const p = post(c, c.d.id); const pauta = p.status === 'pauta_aprovacao'; aprovar(c, p, c.u.nome, 'portal'); return { resumo: `Aprovou ${pauta ? 'a pauta ' : ''}"${p.titulo}"` }; },
  },
  'aprovar-lote': {
    papeis: M,
    fn: (c) => {
      const ids: string[] = Array.isArray(c.d.ids) ? c.d.ids : [];
      if (!ids.length) throw new ErroAcao('Marque pelo menos um item.');
      let n = 0;
      for (const id of ids) {
        if (typeof id !== 'string') continue;
        if (id.startsWith('v:')) {
          const v = c.e.videos.find((y) => y.id === id.slice(2));
          if (v && v.stage === 'roteiro') { v.stage = 'gravacao'; hist(c, v, `Roteiro aprovado por ${c.u.nome} · portal`); roteiroSync(c, v); n++; }
        } else {
          const p = c.e.posts.find((y) => y.id === id);
          if (p && EM_APROVACAO.includes(p.status) && !p.faltaTexto && p.formato !== 'plano') { aprovar(c, p, c.u.nome, 'portal (em lote)'); n++; }
        }
      }
      if (!n) throw new ErroAcao('Nenhum dos itens marcados estava esperando aprovação.');
      return { resumo: `Aprovou ${n} itens de uma vez` };
    },
  },
  ajuste: {
    papeis: M,
    fn: (c) => {
      const p = post(c, c.d.id), txt = texto(c.d.txt, 'o que precisa mudar', 2000);
      if (p.formato === 'plano') {
        if (!c.e.plano.pendente) throw new ErroAcao('Não há versão do plano esperando aprovação.');
        c.e.plano.pendente.ajuste = { txt, q: c.agora };
      } else if (!EM_APROVACAO.includes(p.status)) throw new ErroAcao('Este item não está esperando aprovação.');
      const naPauta = p.status === 'pauta_aprovacao', noTexto = p.status === 'texto_aprovacao';
      if (!naPauta && !noTexto && !p.vEnviada) marcarVersaoEnviada(p);
      p.status = 'ajuste'; p.etapaAjuste = naPauta ? 'pauta' : noTexto ? 'texto' : 'peca'; delete p.validacao;
      p.ajustePedido = { quem: c.u.nome, txt, quando: c.agora, etapa: p.etapaAjuste, versao: p.etapaAjuste === 'peca' ? p.vEnviada || 1 : undefined };
      p.comments.push({ who: c.u.nome, text: txt, interno: false, quando: c.agora });
      const onde = naPauta ? 'na pauta ' : noTexto ? 'nos textos ' : '';
      hist(c, p, `Ajuste ${onde}pedido por ${c.u.nome}`);
      return { resumo: `Pediu ajuste ${onde}em "${p.titulo}"` };
    },
  },
  // Validação interna: o item continua em aprovação, só ganha a marca (o prazo segue correndo).
  validacao: {
    papeis: M,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (p.status !== 'aprovacao') throw new ErroAcao('Só peças em aprovação vão para validação interna.');
      p.validacao = true; hist(c, p, `${c.u.nome} levou para validação interna Spraytec`);
      return { resumo: `Levou "${p.titulo}" para validação interna` };
    },
  },
  'aprovacao-externa': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      const canal = ['WhatsApp', 'E-mail', 'Reunião'].includes(c.d.canal) ? c.d.canal : 'WhatsApp';
      const quem = c.pessoas.find((x) => x.id === c.d.quem && x.papel === 'operacao');
      if (!quem) throw new ErroAcao('Escolha quem da Spraytec aprovou.');
      const ev = linkUrl(c.d.evidencia, 'Link do print');
      const pauta = p.status === 'pauta_aprovacao', textos = p.status === 'texto_aprovacao';
      aprovar(c, p, quem.nome, `${canal}, registrado por ${c.u.nome}${ev ? ' · comprovante: ' + ev : ''}`);
      return { resumo: `Registrou aprovação ${pauta ? 'da pauta ' : textos ? 'dos textos ' : ''}de "${p.titulo}" por ${quem.nome} (${canal})` };
    },
  },
  'plano-ajuste': {
    papeis: M,
    fn: (c) => {
      const txt = texto(c.d.txt, 'o que precisa mudar', 2000);
      const pd = c.e.plano && c.e.plano.pendente;
      if (!pd) throw new ErroAcao('Não há versão do plano esperando aprovação.');
      pd.ajuste = { txt, q: c.agora };
      const pi = planoItem(c.e);
      if (pi) { pi.status = 'ajuste'; pi.etapaAjuste = 'peca'; pi.comments.push({ who: c.u.nome, text: txt, interno: false, quando: c.agora }); hist(c, pi, `Ajuste pedido por ${c.u.nome} no plano`); }
      return { resumo: 'Pediu ajuste no plano de mídia' };
    },
  },
  'plano-enviar': {
    papeis: C,
    fn: (c) => {
      const pl = c.e.plano, dados = c.d.dados, nota = texto(c.d.nota, 'o que mudou e por quê', 2000);
      if (!dados || typeof dados !== 'object' || !Array.isArray(dados.jornada) || !Array.isArray(dados.verba) || !dados.metas)
        throw new ErroAcao('Rascunho do plano inválido. Recarregue a página.');
      if (JSON.stringify(dados) === JSON.stringify(pl.dados)) throw new ErroAcao('Nada mudou em relação à versão aprovada.');
      const v = pl.pendente ? pl.pendente.versao : pl.versao + 1;
      pl.pendente = { versao: v, por: c.u.nome, em: c.agora, nota, ajuste: null, dados };
      const pi = planoItem(c.e);
      if (pi) {
        pi.status = 'aprovacao'; pi.titulo = 'Plano de mídia · versão ' + v; pi.date = c.hoje; pi.prazo = addBiz(c.hoje, 2);
        hist(c, pi, `${c.u.nome} enviou alterações (versão ${v}) para aprovação`);
        let dm = related(c.e, 'p:' + pi.id).map((r) => r.startsWith('d:') && c.e.demandas.find((x) => x.id === r.slice(2))).find((x) => x && !x.feito);
        if (!dm) { dm = { id: novoId('d'), quem: 'spraytec', t: '', data: addBiz(c.hoje, 2) }; c.e.demandas.push(dm); c.e.links.push(['p:' + pi.id, 'd:' + dm.id]); }
        dm.t = `Aprovar alterações do plano de mídia (versão ${v})`; dm.det = nota;
      }
      return { resumo: `Enviou a versão ${v} do plano para aprovação` };
    },
  },

  // Ciclo do mês: insumos da Spraytec, e pautas e textos enviados de uma vez pela Cancha
  'insumos-salvar': {
    papeis: MC,
    fn: (c) => {
      const m = String(c.d.m || '');
      if (!/^\d{4}-\d{2}$/.test(m)) throw new ErroAcao('Mês inválido.');
      const campos = ['foco', 'eventos', 'lanc', 'fotos', 'obs'];
      const txt: any = {};
      for (const k of campos) txt[k] = texto(c.d.txt?.[k], 'insumos', 3000, false);
      if (!campos.some((k) => txt[k])) throw new ErroAcao('Preencha pelo menos um campo.');
      let ci = c.e.ciclos.find((x) => x.id === m);
      if (!ci) { ci = { id: m }; c.e.ciclos.push(ci); }
      const primeira = !ci.ins;
      ci.ins = { txt, ok: ci.ins?.ok || c.hoje, por: ci.ins?.por || c.u.nome, editado: c.agora };
      return { resumo: `${primeira ? (c.u.papel === 'operacao' ? 'Enviou' : 'Registrou') : 'Atualizou'} os insumos de ${m}` };
    },
  },
  'enviar-pautas': {
    papeis: C,
    fn: (c) => {
      const ids: string[] = Array.isArray(c.d.ids) ? c.d.ids.filter((x: unknown) => typeof x === 'string') : [];
      if (!ids.length) throw new ErroAcao('Nenhuma pauta para enviar.');
      // Confere todas antes de mudar alguma: o lote vai inteiro ou nada vai.
      const ps = ids.map((id) => post(c, id));
      ps.forEach((p) => enviarPauta(c, structuredClone(p)));
      ps.forEach((p) => enviarPauta(c, p));
      return { resumo: `Enviou ${ids.length} pautas para aprovação` };
    },
  },
  'enviar-textos': {
    papeis: C,
    fn: (c) => {
      const ids: string[] = Array.isArray(c.d.ids) ? c.d.ids.filter((x: unknown) => typeof x === 'string') : c.d.id ? [c.d.id] : [];
      if (!ids.length) throw new ErroAcao('Nenhum texto para enviar.');
      const ps = ids.map((id) => post(c, id));
      ps.forEach((p) => enviarTextos(c, structuredClone(p)));
      ps.forEach((p) => enviarTextos(c, p));
      return { resumo: ids.length === 1 ? `Enviou os textos de "${post(c, ids[0]).titulo}" para aprovação` : `Enviou os textos de ${ids.length} posts para aprovação` };
    },
  },

  // Produção (Cancha)
  'enviar-pauta': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      enviarPauta(c, p);
      return { resumo: `Enviou a pauta "${p.titulo}" para aprovação` };
    },
  },
  'para-producao': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (p.status !== 'pauta') throw new ErroAcao('Só pautas vão para produção.');
      if (temPauta(p)) throw new ErroAcao('Envie a pauta para aprovação da Spraytec antes de produzir.');
      p.status = 'producao'; hist(c, p, 'Movido para produção');
      return { resumo: `Moveu "${p.titulo}" para produção` };
    },
  },
  enviar: {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (p.status !== 'producao') throw new ErroAcao('Só itens em produção podem ser enviados.');
      if (ehProducao(p)) {
        p.status = 'publicado'; hist(c, p, 'Concluído');
        let k = 0;
        related(c.e, 'p:' + p.id).forEach((r) => {
          const x = r.startsWith('p:') && c.e.posts.find((y) => y.id === r.slice(2));
          if (x && x.status === 'producao' && !ehProducao(x)) { x.status = 'aprovacao'; x.prazo = addBiz(c.hoje, 2); hist(c, x, 'Peça entregue pelo design; enviado para aprovação'); k++; }
        });
        markLinkedDemands(c.e, 'p:' + p.id, (x) => x.quem === 'cancha');
        return { resumo: `Concluiu "${p.titulo}"${k ? ` e enviou ${k} itens ligados para aprovação` : ''}` };
      }
      enviarPeca(c, p);
      return { resumo: `Enviou "${p.titulo}" para aprovação` };
    },
  },
  'nova-versao': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      const pauta = reenviar(c, p);
      return { resumo: `Reenviou ${pauta ? 'a pauta ' : ''}"${p.titulo}"${pauta ? '' : ` (rodada ${p.rodada})`}` };
    },
  },
  textos: {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (!p.faltaTexto) throw new ErroAcao('Este item já tem textos.');
      p.faltaTexto = false; p.status = 'aprovacao'; p.validacao = true; p.prazo = addBiz(c.hoje, 2);
      p.legenda = texto(c.d.legenda, 'legenda', 4000, false) || p.titulo + '.\n\nDescrição e legenda escritas pela Cancha a partir do roteiro aprovado.';
      hist(c, p, 'Textos adicionados; enviado para validação interna Spraytec');
      return { resumo: `Adicionou textos em "${p.titulo}"` };
    },
  },
  status: {
    papeis: C,
    fn: (c) => { const p = post(c, c.d.id); if (!mudarStatus(c, p, c.d.status)) return { resumo: 'Sem mudança' }; return { resumo: `Mudou o status de "${p.titulo}" para ${STATUS[p.status]}` }; },
  },
  publicar: {
    papeis: C,
    fn: (c) => { const p = post(c, c.d.id); mudarStatus(c, p, 'publicado', linkUrl(c.d.link, 'Link do post')); return { resumo: `Marcou "${p.titulo}" como publicado` }; },
  },
  'post-data': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (p.status === 'publicado') throw new ErroAcao('Itens publicados não mudam de data.');
      if (c.d.data === null) {
        p.status = 'espera'; p.date = null; p.time = null; delete p.validacao; hist(c, p, 'Movido para em espera');
        return { resumo: `Moveu "${p.titulo}" para em espera` };
      }
      if (!isoValida(c.d.data)) throw new ErroAcao('Data inválida.');
      const was = p.status;
      p.date = c.d.data;
      if (p.status === 'espera') p.status = 'pauta';
      if (was === 'agendado') { p.status = 'aprovado'; hist(c, p, `Data alterada para ${fmt(p.date)}; precisa ser agendado de novo na rede`); }
      else hist(c, p, `Data alterada para ${fmt(p.date)}`);
      return { resumo: `Mudou "${p.titulo}" para ${fmt(p.date)}` };
    },
  },
  // O portal moveu no Drive as versões que não foram aprovadas para "Versões antigas" (ver versoesParaArquivar).
  'versoes-arquivadas': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id), ids = new Set(Array.isArray(c.d.ids) ? c.d.ids.map(String) : []);
      const alvo = new Set(versoesParaArquivar(c.e).find((x) => x.id === p.id)?.ids || []);
      const L = (p.arquivos || []).filter((a: any) => ids.has(a.id) && alvo.has(a.id));
      if (!L.length) return { resumo: 'Sem mudança' };
      L.forEach((a: any) => { a.antiga = true; });
      hist(c, p, `Versões não aprovadas movidas para "Versões antigas" no Drive (${L.length} arquivo${L.length > 1 ? 's' : ''})`);
      return { resumo: `Moveu ${L.length} arquivo${L.length > 1 ? 's' : ''} de "${p.titulo}" para "Versões antigas" no Drive` };
    },
  },
  // Excluir um item do calendário (teste, duplicado, criado por engano). Só a Cancha.
  // O item sai para todos; a cópia completa fica no registro de atividades e os arquivos continuam no Drive.
  'post-excluir': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (p.formato === 'plano') throw new ErroAcao('O plano de mídia não é excluído por aqui.');
      const ref = 'p:' + p.id;
      c.e.posts = c.e.posts.filter((x) => x.id !== p.id);
      c.e.links = c.e.links.filter((l: string[]) => l[0] !== ref && l[1] !== ref);
      c.e.videos.forEach((v) => { if (v.postId === p.id) delete v.postId; });
      return { resumo: `Excluiu "${p.titulo}"${p.date ? ' (' + fmt(p.date) + ')' : ''} do calendário` };
    },
  },
  'calendario-novo': {
    papeis: MC,
    fn: (c) => {
      const ref = novoItem(c, c.d);
      const liga = refValida(c.e, c.d.liga);
      if (liga) c.e.links.push([liga, ref]);
      return { resumo: `Adicionou "${texto(c.d.titulo, 'título', 200)}" em ${fmt(isoValida(c.d.data) ? c.d.data : c.hoje)}`, criado: ref };
    },
  },
  // Importação da planilha padrão: tudo ou nada (se uma linha tiver erro, nada é criado).
  'calendario-importar': {
    papeis: C,
    fn: (c) => {
      const linhas = Array.isArray(c.d.linhas) ? c.d.linhas : [];
      if (!linhas.length) throw new ErroAcao('A planilha não tem linhas para importar.');
      if (linhas.length > 300) throw new ErroAcao('No máximo 300 linhas por vez.');
      const arquivo = texto(c.d.arquivo, 'arquivo', 200, false) || 'planilha';
      const vistos = new Set<string>();
      let novos = 0, atualizados = 0;
      linhas.forEach((l: any, i: number) => {
        const n = Number.isInteger(l.n) ? l.n : i + 2;
        try {
          if (l.id) {
            if (vistos.has(l.id)) throw new ErroAcao('o mesmo id aparece em duas linhas.');
            vistos.add(l.id);
            const p = c.e.posts.find((x) => x.id === l.id);
            if (!p || p.formato === 'plano') throw new ErroAcao(`o id ${l.id} não existe no portal.`);
            if (atualizarItem(c, p, l, arquivo)) atualizados++;
          } else { novoItem(c, { ...l, origem: `Importado da planilha "${arquivo}"` }); novos++; }
        } catch (err) { throw new ErroAcao(`Linha ${n} da planilha: ${(err as Error).message} Nada foi importado.`); }
      });
      return { resumo: `Planilha "${arquivo}": ${novos} novos, ${atualizados} atualizados` };
    },
  },
  // O que foi enviado para aprovação não muda por baixo: para editar, o item precisa voltar para produção.
  'post-editar': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (!['pauta', 'producao', 'ajuste', 'espera'].includes(p.status))
        throw new ErroAcao('Depois de enviado para aprovação, o conteúdo não muda. Volte o item para produção antes de editar.');
      const antes = JSON.stringify([p.titulo, p.pauta, p.legenda, p.drive || '', p.time || '']);
      p.titulo = texto(c.d.titulo, 'título', 200);
      if (c.d.pauta !== undefined && !igual(c.d.pauta, p.pauta)) {
        if (!etapaDaPauta(p)) throw new ErroAcao('A pauta já foi aprovada e não muda.');
        p.pauta = texto(c.d.pauta, 'pauta', 4000, false);
      }
      if (c.d.legenda !== undefined) p.legenda = texto(c.d.legenda, 'texto', 6000, false);
      const dv = linkUrl(c.d.drive, 'Link do material no Google Drive');
      if (dv) p.drive = dv; else delete p.drive;
      if (!ehProducao(p) && typeof c.d.hora === 'string' && /^\d{2}:\d{2}$/.test(c.d.hora)) p.time = c.d.hora;
      if (antes === JSON.stringify([p.titulo, p.pauta, p.legenda, p.drive || '', p.time || ''])) return { resumo: 'Sem mudança' };
      hist(c, p, 'Conteúdo editado (título, texto ou material)');
      return { resumo: `Editou o conteúdo de "${p.titulo}"` };
    },
  },
  // Produto de um post já publicado (Instagram, Facebook, YouTube) ou de um anúncio, no Acervo.
  // Sem registro, o portal sugere pelo texto; "—" marca que não fala de produto nenhum.
  'acervo-produto': {
    papeis: MC,
    fn: (c) => {
      const id = typeof c.d.id === 'string' && /^(ig|fb|yt|ad):[\w.-]{1,80}$/.test(c.d.id) ? c.d.id : '';
      if (!id) throw new ErroAcao('Item do acervo inválido.');
      const produto = texto(c.d.produto, 'produto', 80, false);
      const i = c.e.classif.findIndex((x) => x.id === id);
      if (!produto) {
        if (i < 0) return { resumo: 'Sem mudança' };
        c.e.classif.splice(i, 1);
        return { resumo: 'Voltou o produto de ' + id + ' para a sugestão automática' };
      }
      const novo = { id, produto, por: c.u.nome, em: c.hoje };
      if (i < 0) c.e.classif.push(novo); else if (c.e.classif[i].produto === produto) return { resumo: 'Sem mudança' }; else c.e.classif[i] = novo;
      return { resumo: 'Classificou ' + id + ' como ' + (produto === '—' ? 'sem produto' : produto) };
    },
  },
  'post-classificar': {
    papeis: MC,
    fn: (c) => {
      const p = post(c, c.d.id);
      const produto = texto(c.d.produto, 'produto', 80, false) || '—';
      const pilar = typeof c.d.pilar === 'string' && c.d.pilar.trim() ? texto(c.d.pilar, 'pilar', 40) : p.pilar;
      if (produto === p.produto && pilar === p.pilar) return { resumo: 'Sem mudança' };
      const mud = [produto !== p.produto ? 'produto: ' + produto : '', pilar !== p.pilar ? 'pilar: ' + pilar : ''].filter(Boolean).join(', ');
      p.produto = produto; p.pilar = pilar;
      hist(c, p, 'Classificação alterada (' + mud + ')');
      return { resumo: `Classificou "${p.titulo}" (${mud})` };
    },
  },
  comentar: {
    papeis: ['operacao', 'cancha', 'leitor'],
    fn: (c) => {
      const p = post(c, c.d.id), txt = texto(c.d.txt, 'comentário', 3000);
      const interno = c.u.papel === 'cancha' && !!c.d.interno;
      // Comentário interno só a Cancha lê; os demais também a Operação e os leitores.
      const men = mencoes(c.pessoas, c.u.id, txt, interno ? ['cancha'] : ['operacao', 'cancha', 'leitor']);
      p.comments.push({ who: c.u.nome, text: txt, interno, quando: c.agora, ...(men.length ? { mencoes: men } : {}) });
      const avisos = men.length ? [{ para: men, assunto: `${c.u.nome} mencionou você no Portal Spraytec`,
        paragrafos: [`${c.u.nome} mencionou você num comentário${interno ? ' interno' : ''} em "${p.titulo}":`, '"' + trecho(txt) + '"'], abrir: 'p:' + p.id }] : undefined;
      return { resumo: `Comentou${interno ? ' (interno)' : ''} em "${p.titulo}"`, avisos };
    },
  },

  // Marcos de safra e eventos
  'marcos-salvar': {
    papeis: C,
    fn: (c) => {
      const tipos = ['safra', 'comercial', 'evento', 'recesso', 'feriado'];
      const ms = (Array.isArray(c.d.marcos) ? c.d.marcos : []).slice(0, 100).map((m: any) => {
        const ini = isoValida(m.ini) ? m.ini : c.hoje; let fim = isoValida(m.fim) ? m.fim : ini; if (fim < ini) fim = ini;
        return { id: typeof m.id === 'string' && m.id ? m.id.slice(0, 40) : novoId('m'), tipo: tipos.includes(m.tipo) ? m.tipo : 'evento', nome: texto(m.nome, 'nome da fase', 120, false) || 'Fase', ini, fim };
      });
      c.e.marcos = ms;
      return { resumo: 'Atualizou safra, foco comercial e eventos' };
    },
  },

  // Demandas
  'demanda-nova': {
    papeis: MC,
    fn: (c) => {
      const t = texto(c.d.t, 'o que precisa ser feito', 200);
      const dm = { id: novoId('d'), quem: c.d.quem === 'cancha' ? 'cancha' : 'spraytec', t, data: isoValida(c.d.data) ? c.d.data : c.hoje, det: texto(c.d.det, 'detalhes', 2000, false) };
      c.e.demandas.push(dm);
      return { resumo: `Criou a demanda "${t}"`, criado: dm.id };
    },
  },
  'demanda-data': {
    papeis: MC,
    fn: (c) => { const dm = demanda(c, c.d.id); if (!isoValida(c.d.data)) throw new ErroAcao('Data inválida.'); const was = dm.data; dm.data = c.d.data; return { resumo: `Mudou a data de "${dm.t}" de ${fmt(was)} para ${fmt(dm.data)}` }; },
  },
// Arquivos (Google Drive). O arquivo já está no Drive quando esta ação roda: ela registra no item.
  'arquivo-anexar': {
    papeis: ['cancha', 'operacao', 'produtora'],
    fn: (c) => {
      const ev = envioDe(String(c.d.envio || ''), c.u.id);
      if (!ev || !ev.arquivo || ev.usado) throw new ErroAcao('Envio não encontrado. Mande o arquivo de novo.');
      const caminho = destinoArquivo(c.e, c.u, ev.ref);
      const a: any = { ...ev.arquivo, por: c.u.nome, porId: c.u.id, q: c.agora, em: new Date().toISOString() };
      const { x, nome } = alvoArquivo(c, ev.ref);
      ev.usado = true;
      if (!x) { c.e.materiais.push({ ...a, pasta: caminho[1] }); return { resumo: `Enviou "${a.nome}" para ${nome}` }; }
      x.pastaDrive = x.pastaDrive || caminho;
      if (ev.ref.startsWith('p:')) {
        const v = x.vPeca || 1, env = x.vEnviada || (['aprovacao', 'ajuste', 'aprovado', 'agendado', 'publicado'].includes(x.status) && x.etapaAjuste !== 'texto' && x.etapaAjuste !== 'pauta' ? v : 0);
        const nova = env >= v && vivos(x.arquivos).length > 0;
        if (nova && !x.vEnviada) x.vEnviada = v;
        x.vPeca = nova ? v + 1 : v; a.v = x.vPeca;
      }
      if (ev.ref.startsWith('v:')) a.etapa = x.stage;
      x.arquivos = [...(x.arquivos || []), a];
      hist(c, x, `Arquivo enviado: ${a.nome}${a.v ? ` (versão ${a.v})` : ''}`);
      return { resumo: `Enviou "${a.nome}" para ${nome}` };
    },
  },
  'arquivo-remover': {
    papeis: ['cancha', 'operacao', 'produtora'],
    fn: (c) => {
      const ref = String(c.d.ref || ''), id = String(c.d.id || '');
      const { x, nome } = ref.startsWith('m:') ? { x: null, nome: 'os materiais' } : alvoArquivo(c, ref);
      const lista = x ? x.arquivos || [] : c.e.materiais;
      const a = lista.find((y: any) => y.id === id && !y.removido);
      if (!a) throw new ErroAcao('Arquivo não encontrado. Atualize a página.');
      if (c.u.papel !== 'cancha' && a.porId !== c.u.id) throw new ErroAcao('Só quem enviou o arquivo ou a Cancha pode tirá-lo do portal.');
      if (ref.startsWith('p:') && (a.v || 1) <= (x.vEnviada || 0)) throw new ErroAcao('Esta versão já foi para aprovação e fica guardada no histórico.');
      a.removido = true; a.removidoPor = c.u.nome; a.removidoEm = c.agora;
      if (x) hist(c, x, `Arquivo tirado do portal: ${a.nome} (continua no Drive)`);
      return { resumo: `Tirou "${a.nome}" de ${nome} (o arquivo continua no Drive)` };
    },
  },
  'demanda-feito': {
    papeis: MC,
    fn: (c) => { const dm = demanda(c, c.d.id); dm.feito = !dm.feito; return { resumo: `${dm.feito ? 'Concluiu' : 'Reabriu'} a demanda "${dm.t}"` }; },
  },

  // Conversas
  'conversa-nova': {
    papeis: MC,
    fn: (c) => {
      const tema = texto(c.d.tema, 'tema da conversa', 120);
      const th = { id: novoId('t'), tema, ref: refValida(c.e, c.d.ref), unread: { spraytec: 0, cancha: 0 }, msgs: [] as any[] };
      c.e.threads.unshift(th);
      return { resumo: `Abriu a conversa "${tema}"`, criado: th.id };
    },
  },
  'conversa-ligar': {
    papeis: MC,
    fn: (c) => {
      const th = c.e.threads.find((t) => t.id === c.d.id); if (!th) throw new ErroAcao('Conversa não encontrada.');
      th.ref = c.d.ref === null ? null : refValida(c.e, c.d.ref);
      return { resumo: th.ref ? `Ligou a conversa "${th.tema}" a uma demanda` : `Removeu a ligação da conversa "${th.tema}"` };
    },
  },
  mensagem: {
    papeis: MC,
    fn: (c) => {
      const th = c.e.threads.find((t) => t.id === c.d.id); if (!th) throw new ErroAcao('Conversa não encontrada.');
      const txt = texto(c.d.txt, 'mensagem', 4000);
      const ld = lado(c.u);
      const men = mencoes(c.pessoas, c.u.id, txt, ['operacao', 'cancha']);
      th.msgs.push({ de: ld, nome: c.u.nome, q: c.agora, txt, ...(men.length ? { mencoes: men } : {}) });
      th.unread[ld === 'spraytec' ? 'cancha' : 'spraytec']++;
      const avisos = men.length ? [{ para: men, assunto: `${c.u.nome} mencionou você no Portal Spraytec`,
        paragrafos: [`${c.u.nome} mencionou você na conversa "${th.tema}":`, '"' + trecho(txt) + '"'], abrir: 't:' + th.id }] : undefined;
      return { resumo: `Escreveu em "${th.tema}"`, avisos };
    },
  },
  'conversa-lida': {
    papeis: MC, semAuditoria: true,
    fn: (c) => {
      const th = c.e.threads.find((t) => t.id === c.d.id);
      if (th) th.unread[lado(c.u)] = 0;
      return { resumo: 'Leu a conversa' };
    },
  },

  // Vídeos
  viabilidade: {
    papeis: ['produtora'],
    fn: (c) => {
      const v = video(c, c.d.id);
      if (v.stage !== 'viabilidade') throw new ErroAcao('Esta pauta não está esperando viabilidade.');
      v.viavel = !!c.d.viavel;
      v.parecer = texto(c.d.parecer, 'parecer', 2000, false) || (v.viavel ? 'Viável.' : 'Inviável.');
      v.stage = v.viavel ? 'roteiro' : 'pauta'; v.prazo = addBiz(c.hoje, 3);
      hist(c, v, `${c.u.nome} marcou como ${v.viavel ? 'viável' : 'inviável'}`);
      return { resumo: `Marcou "${v.titulo}" como ${v.viavel ? 'viável' : 'inviável'}` };
    },
  },
  'video-entregue': {
    papeis: ['produtora', 'cancha'],
    fn: (c) => { const v = video(c, c.d.id); if (v.stage !== 'gravacao') throw new ErroAcao('Só vídeos em gravação podem ser entregues.'); entregarVideo(c, v); hist(c, v, `Vídeo final entregue (registrado por ${c.u.nome})`); return { resumo: `Registrou a entrega do vídeo "${v.titulo}"` }; },
  },
  'roteiro-aprovar': {
    papeis: M,
    fn: (c) => { const v = video(c, c.d.id); if (v.stage !== 'roteiro') throw new ErroAcao('Este roteiro não está esperando aprovação.'); v.stage = 'gravacao'; hist(c, v, `Roteiro aprovado por ${c.u.nome} · portal`); roteiroSync(c, v); return { resumo: `Aprovou o roteiro de "${v.titulo}"` }; },
  },
  'video-novo': {
    papeis: C,
    fn: (c) => { const v = { id: novoId('v'), titulo: 'Nova pauta de vídeo', stage: 'pauta', viavel: null, gravacao: '—', parecer: '', roteiro: '', hist: [] as any[] }; hist(c, v, 'Pauta criada'); c.e.videos.push(v); return { resumo: 'Criou uma pauta de vídeo', criado: v.id }; },
  },
  'video-salvar': {
    papeis: C,
    fn: (c) => {
      const v = video(c, c.d.id);
      v.titulo = texto(c.d.titulo, 'nome do vídeo', 200);
      if (typeof c.d.roteiro === 'string') v.roteiro = texto(c.d.roteiro, 'roteiro', 6000, false);
      return { resumo: `Editou o vídeo "${v.titulo}"` };
    },
  },
  'video-etapa': {
    papeis: C,
    fn: (c) => {
      const v = video(c, c.d.id), et = String(c.d.etapa);
      if (!ETAPAS_VIDEO.includes(et)) throw new ErroAcao('Etapa inválida.');
      if (v.stage === et) return { resumo: 'Sem mudança' };
      if (et === 'entregue') entregarVideo(c, v); else v.stage = et;
      hist(c, v, `Movido para ${et}`);
      return { resumo: `Moveu o vídeo "${v.titulo}" para ${et}` };
    },
  },

  // Estratégia
  'mes-salvar': {
    papeis: C,
    fn: (c) => {
      const x = c.e.ano.find((a) => a.m === c.d.m); if (!x) throw new ErroAcao('Mês não encontrado.');
      const d = c.d.dados || {};
      x.fase = texto(d.fase, 'fase', 120, false) || x.fase; x.tema = texto(d.tema, 'campanha', 120, false) || x.tema;
      x.obj = texto(d.obj, 'objetivo', 500, false); x.prods = texto(d.prods, 'produtos', 200, false); x.kpi = texto(d.kpi, 'meta', 200, false);
      x.fr = lista(d.fr, 5).filter((f) => ['social', 'trafego', 'email', 'video'].includes(f)); x.p = Math.max(0, Number(d.p) || 0);
      return { resumo: `Atualizou o mês ${x.m} do ano safra` };
    },
  },
  'conc-salvar': {
    papeis: C,
    fn: (c) => {
      const d = c.d.dados || {}, nome = texto(d.nome, 'nome', 80);
      const tem: any = {};
      for (const k of ['prod', 'foliar', 'bio', 'prova', 'preco', 'tec']) tem[k] = Math.max(0, Math.min(3, Number(d.tem && d.tem[k]) || 0));
      const data = { nome, dest: texto(d.dest, 'anúncio em destaque', 200, false), amea: ['alta', 'media', 'baixa'].includes(d.amea) ? d.amea : 'media', tem, leitura: texto(d.leitura, 'leitura', 2000, false) };
      if (c.d.id) { const x = c.e.conc.find((k) => k.id === c.d.id); if (!x) throw new ErroAcao('Concorrente não encontrado.'); Object.assign(x, data); }
      else c.e.conc.push({ id: novoId('k'), ads: 0, novos: 0, dur: 0, fmt: [34, 33, 33], tr: Array(12).fill(1), pilar: 'Produto', cor: '#7A6F5A', ...data });
      return { resumo: `Salvou o concorrente "${nome}"` };
    },
  },
  'conc-excluir': { papeis: C, fn: (c) => { const x = c.e.conc.find((k) => k.id === c.d.id); c.e.conc = c.e.conc.filter((k) => k.id !== c.d.id); return { resumo: `Removeu o concorrente "${x ? x.nome : ''}"` }; } },
  'conc-acoes': {
    papeis: C,
    fn: (c) => { c.e.concAcoes = (Array.isArray(c.d.acoes) ? c.d.acoes : []).slice(0, 30).map((a: any) => ({ t: texto(a.t, 'ação', 500, false), ref: texto(a.ref, 'onde entra', 120, false) })).filter((a: any) => a.t); return { resumo: 'Atualizou "o que muda no nosso plano"' }; },
  },

  // Acervo
  'aprendizado-salvar': {
    papeis: C,
    fn: (c) => {
      const d = c.d.dados || {};
      const data = {
        t: texto(d.t, 'o que foi testado', 200), frente: ['social', 'trafego', 'email', 'design', 'video'].includes(d.frente) ? d.frente : 'social',
        status: d.status === 'concluido' ? 'concluido' : 'teste', data: isoValida(d.data) ? d.data : c.hoje,
        hip: texto(d.hip, 'hipótese', 500, false), res: texto(d.res, 'resultado', 500, false), dec: texto(d.dec, 'decisão', 500, false),
      };
      if (c.d.id) { const x = c.e.aprendizados.find((a) => a.id === c.d.id); if (!x) throw new ErroAcao('Aprendizado não encontrado.'); Object.assign(x, data); }
      else c.e.aprendizados.push({ id: novoId('l'), ...data });
      return { resumo: `Salvou o aprendizado "${data.t}"` };
    },
  },
  'aprendizado-excluir': { papeis: C, fn: (c) => { const x = c.e.aprendizados.find((a) => a.id === c.d.id); c.e.aprendizados = c.e.aprendizados.filter((a) => a.id !== c.d.id); return { resumo: `Removeu o aprendizado "${x ? x.t : ''}"` }; } },
  'guia-salvar': {
    papeis: C,
    fn: (c) => { const g = c.d.guia || {}; c.e.guia = { tom: lista(g.tom), evitar: lista(g.evitar), termos: lista(g.termos), produtos: lista(g.produtos), hashtags: lista(g.hashtags) }; return { resumo: 'Atualizou o guia de marca' }; },
  },
  'relatorio-salvar': {
    papeis: C,
    fn: (c) => {
      const d = c.d.dados || {}, t = texto(d.t, 'título', 200);
      const tipos = ['Executivo semanal', 'Gerencial semanal', 'Relatório mensal', 'Campanha', 'Diagnóstico', 'Outro'];
      const data = {
        t, tipo: tipos.includes(d.tipo) ? d.tipo : 'Outro', capa: texto(d.capa, 'capa', 80, false) || t, per: texto(d.per, 'período', 200, false),
        status: d.status === 'entregue' ? 'entregue' : 'previsto', entrega: isoValida(d.entrega) ? d.entrega : c.hoje,
        link: linkUrl(d.link, 'Link do PDF'), dest: lista(d.dest, 10), nota: texto(d.nota, 'nota', 300, false),
      };
      if (c.d.id) { const x = c.e.relatorios.find((r) => r.id === c.d.id); if (!x) throw new ErroAcao('Relatório não encontrado.'); Object.assign(x, data); }
      else c.e.relatorios.unshift({ id: novoId('r'), ...data });
      return { resumo: `Salvou o relatório "${t}"` };
    },
  },
  'relatorio-excluir': { papeis: C, fn: (c) => { const x = c.e.relatorios.find((r) => r.id === c.d.id); c.e.relatorios = c.e.relatorios.filter((r) => r.id !== c.d.id); return { resumo: `Removeu o relatório "${x ? x.t : ''}"` }; } },
  'relatorio-entregue': {
    papeis: C,
    fn: (c) => { const r = c.e.relatorios.find((x) => x.id === c.d.id); if (!r) throw new ErroAcao('Relatório não encontrado.'); r.status = 'entregue'; r.entrega = c.hoje; return { resumo: `Marcou "${r.t}" como entregue` }; },
  },
  'relview-salvar': {
    papeis: C,
    fn: (c) => {
      const r = c.e.relatorios.find((x) => x.id === c.d.id); if (!r) throw new ErroAcao('Relatório não encontrado.');
      const f = c.d.campos || {};
      if (r.tipo === 'Executivo semanal') { r.frase = texto(f.frase, 'frase', 500, false); r.dest = lista(f.dest, 10); r.aten = texto(f.aten, 'ponto de atenção', 500, false); r.prox = texto(f.prox, 'próximos passos', 1000, false); }
      else r.com = texto(f.com, 'comentário', 2000, false);
      if (c.d.publicar) { r.status = 'entregue'; r.entrega = c.hoje; }
      return { resumo: `${c.d.publicar ? 'Validou e publicou' : 'Salvou o rascunho de'} "${r.t}"` };
    },
  },
};
