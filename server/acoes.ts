// Ações do portal. Toda alteração passa por aqui: o servidor confere o papel de quem pede,
// aplica a regra e grava. A tela nunca altera dados direto.
import {
  ErroAcao, STATUS, ETAPAS_VIDEO, addDays, addBiz, clone, fmt, isoValida, novoId, texto,
  type Papel, type Usuario,
} from './dominio.ts';
import type { Estado } from './estado.ts';

export type Pessoa = { id: string; nome: string; papel: string };
export type Ctx = { e: Estado; u: Usuario; d: any; hoje: string; agora: string; pessoas: Pessoa[] };
export type Resultado = { resumo: string; criado?: string };
type Def = { papeis: Papel[]; semAuditoria?: boolean; fn: (c: Ctx) => Resultado };

// ---------- utilidades ----------
const PRODUCAO = ['video', 'design'];
const ehProducao = (p: any) => PRODUCAO.includes(p.rede);
// Posts e e-mails passam pela aprovação da pauta; produção de design/vídeo e o plano têm fluxo próprio.
const temPauta = (p: any) => !ehProducao(p) && p.formato !== 'plano';
const EM_APROVACAO = ['pauta_aprovacao', 'aprovacao'];
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
const inWindow = (c: Ctx, p: any) => p.date && p.date >= c.hoje && p.date <= addDays(c.hoje, 7);
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
  p.status = inWindow(c, p) ? 'agendado' : 'aprovado'; delete p.validacao;
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
  if (ns === 'publicado') {
    p.pubVia = 'manual';
    if (link) p.pubLink = link;
    hist(c, p, (prod ? 'Concluído' : 'Publicado') + ' · marcado à mão pela Cancha' + (link ? ' · ' + link : ''));
  } else hist(c, p, `Status: ${STATUS[was] || was} → ${STATUS[ns]}`);
  if (ns === 'espera') { p.date = null; p.time = null; }
  return true;
}

function linkUrl(v: unknown, campo: string): string {
  const s = texto(v, campo, 600, false);
  if (s && !/^https?:\/\//i.test(s)) throw new ErroAcao(`${campo}: cole um link que comece com https://`);
  return s;
}
const lista = (v: unknown, max = 60) => (Array.isArray(v) ? v : []).map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean).slice(0, max).map((x) => x.slice(0, 500));

// Cria um item do calendário (usado pelo "+ Adicionar" e pela importação de planilha).
const TIPOS_NOVO = ['ig|post', 'ig|carrossel', 'ig|reel', 'ig|story', 'fb|post', 'yt|video', 'yt|short', 'email|newsletter', 'design|producao', 'video|gravacao', 'video|entrega'];
function novoItem(c: Ctx, d: any): string {
  const tipo = String(d.tipo || ''), t = texto(d.titulo, 'título', 200), date = isoValida(d.data) ? d.data : c.hoje;
  const txt = texto(d.texto, 'texto', 4000, false);
  if (tipo.startsWith('demanda|')) {
    const quem = tipo.split('|')[1] === 'cancha' ? 'cancha' : 'spraytec';
    const dm = { id: novoId('d'), quem, t, data: date, det: txt };
    c.e.demandas.push(dm);
    return 'd:' + dm.id;
  }
  if (!TIPOS_NOVO.includes(tipo)) throw new ErroAcao(`Tipo inválido: ${tipo || '(vazio)'}.`);
  const [rede, formato] = tipo.split('|');
  const hora = typeof d.hora === 'string' && /^\d{2}:\d{2}$/.test(d.hora) ? d.hora : null;
  const p: any = {
    id: novoId('p'), date, time: PRODUCAO.includes(rede) ? null : hora, rede, formato, titulo: t,
    pilar: texto(d.pilar, 'pilar', 40, false) || 'Manejo', produto: texto(d.produto, 'produto', 80, false) || '—',
    status: 'pauta', rodada: 1, legenda: txt, comments: [], hist: [],
  };
  const dv = linkUrl(d.drive, 'Material no Google Drive');
  if (dv) p.drive = dv;
  hist(c, p, (d.origem || 'Adicionado ao calendário') + ' por ' + c.u.nome + (c.u.papel === 'operacao' ? ' (sugestão)' : ''));
  if (c.u.papel === 'operacao') p.comments.push({ who: c.u.nome, text: 'Pauta sugerida por mim pelo calendário.', interno: false, quando: c.agora });
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
      const naPauta = p.status === 'pauta_aprovacao';
      p.status = 'ajuste'; p.etapaAjuste = naPauta ? 'pauta' : 'peca'; delete p.validacao;
      p.comments.push({ who: c.u.nome, text: txt, interno: false, quando: c.agora });
      hist(c, p, `Ajuste ${naPauta ? 'na pauta ' : ''}pedido por ${c.u.nome}`);
      return { resumo: `Pediu ajuste ${naPauta ? 'na pauta ' : ''}em "${p.titulo}"` };
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
      const pauta = p.status === 'pauta_aprovacao';
      aprovar(c, p, quem.nome, `${canal}, registrado por ${c.u.nome}${ev ? ' · comprovante: ' + ev : ''}`);
      return { resumo: `Registrou aprovação ${pauta ? 'da pauta ' : ''}de "${p.titulo}" por ${quem.nome} (${canal})` };
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

  // Produção (Cancha)
  'enviar-pauta': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (!temPauta(p)) throw new ErroAcao('Este item não passa por aprovação de pauta.');
      if (p.status !== 'pauta') throw new ErroAcao('Só pautas podem ser enviadas para aprovação.');
      p.status = 'pauta_aprovacao'; p.prazo = addBiz(c.hoje, 2); hist(c, p, 'Pauta enviada para aprovação');
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
      p.status = 'aprovacao'; p.prazo = addBiz(c.hoje, 2); hist(c, p, 'Enviado para aprovação');
      return { resumo: `Enviou "${p.titulo}" para aprovação` };
    },
  },
  'nova-versao': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (p.status !== 'ajuste') throw new ErroAcao('Só itens com ajuste pedido recebem nova versão.');
      if (p.formato === 'plano') throw new ErroAcao('Para o plano, edite o quadro e envie de novo.');
      const pauta = p.etapaAjuste === 'pauta';
      p.status = pauta ? 'pauta_aprovacao' : 'aprovacao'; p.prazo = addBiz(c.hoje, 2); delete p.etapaAjuste;
      if (!pauta) p.rodada = Math.min(3, (p.rodada || 1) + 1);
      hist(c, p, pauta ? 'Pauta ajustada e reenviada para aprovação' : `Nova versão (rodada ${p.rodada}) enviada para aprovação`);
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
      if (was === 'agendado') { p.status = inWindow(c, p) ? 'agendado' : 'aprovado'; hist(c, p, `Data alterada para ${fmt(p.date)}; reagendado sem duplicar`); }
      else hist(c, p, `Data alterada para ${fmt(p.date)}`);
      return { resumo: `Mudou "${p.titulo}" para ${fmt(p.date)}` };
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
      linhas.forEach((l: any, i: number) => {
        try { novoItem(c, { ...l, origem: `Importado da planilha "${arquivo}"` }); }
        catch (err) { throw new ErroAcao(`Linha ${i + 2} da planilha: ${(err as Error).message} Nada foi importado.`); }
      });
      return { resumo: `Importou ${linhas.length} itens da planilha "${arquivo}"` };
    },
  },
  // O que foi enviado para aprovação não muda por baixo: para editar, o item precisa voltar para produção.
  'post-editar': {
    papeis: C,
    fn: (c) => {
      const p = post(c, c.d.id);
      if (!['pauta', 'producao', 'ajuste', 'espera'].includes(p.status))
        throw new ErroAcao('Depois de enviado para aprovação, o conteúdo não muda. Volte o item para produção antes de editar.');
      const antes = JSON.stringify([p.titulo, p.legenda, p.drive || '', p.time || '']);
      p.titulo = texto(c.d.titulo, 'título', 200);
      p.legenda = texto(c.d.legenda, 'texto', 6000, false);
      const dv = linkUrl(c.d.drive, 'Link do material no Google Drive');
      if (dv) p.drive = dv; else delete p.drive;
      if (!ehProducao(p) && typeof c.d.hora === 'string' && /^\d{2}:\d{2}$/.test(c.d.hora)) p.time = c.d.hora;
      if (antes === JSON.stringify([p.titulo, p.legenda, p.drive || '', p.time || ''])) return { resumo: 'Sem mudança' };
      hist(c, p, 'Conteúdo editado (título, texto ou material)');
      return { resumo: `Editou o conteúdo de "${p.titulo}"` };
    },
  },
  comentar: {
    papeis: ['operacao', 'cancha', 'leitor'],
    fn: (c) => {
      const p = post(c, c.d.id), txt = texto(c.d.txt, 'comentário', 3000);
      const interno = c.u.papel === 'cancha' && !!c.d.interno;
      p.comments.push({ who: c.u.nome, text: txt, interno, quando: c.agora });
      return { resumo: `Comentou${interno ? ' (interno)' : ''} em "${p.titulo}"` };
    },
  },

  // Marcos de safra e eventos
  'marcos-salvar': {
    papeis: C,
    fn: (c) => {
      const tipos = ['safra', 'comercial', 'evento', 'recesso'];
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
      th.msgs.push({ de: ld, nome: c.u.nome, q: c.agora, txt });
      th.unread[ld === 'spraytec' ? 'cancha' : 'spraytec']++;
      return { resumo: `Escreveu em "${th.tema}"` };
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
