// Etapas 2 e 3 do portal: feedbacks, observações e plano do mês, roteiros de vídeo, e-mails (Brevo),
// landing pages e pedidos do site, SEO e GEO. E os comentários de todos os itens do portal.
//
// Plano do mês, roteiro, e-mail e landing page seguem o mesmo fluxo de aprovação dos anúncios:
//   rascunho → aprovacao → aprovado | ajuste (→ aprovacao de novo, versão +1)
// O que vai para aprovação fica guardado como foi enviado ("enviado"): a Spraytec aprova aquela versão.
// Depois de aprovado:
//   e-mail: aprovado → enviado (com o checklist completo)
//   landing page: aprovado → publicado (com o checklist completo)
//   roteiro: aprovado → producao (produtora) → corte → entregue | ajuste_corte (→ corte de novo)
import { ErroAcao, isoValida, linkUrl, novoId, texto, umDe, type Papel } from './dominio.ts';
import { hist, pessoasDe, trecho, mencoes, lista, PRODUTOS, nomeRotacao, type Ctx, type Aviso, type Resultado } from './util.ts';

type Def = { papeis: Papel[]; fn: (c: Ctx) => Resultado };
const C: Papel[] = ['cancha'];
const A: Papel[] = ['aprovador'];
const CA: Papel[] = ['cancha', 'aprovador'];

// ---------- catálogos ----------
export const TIPOS_FEEDBACK = ['elogio', 'problema', 'ideia', 'leads'] as const;
export const QUALIDADE_LEAD = ['bons', 'mistos', 'ruins', 'nao_agricultor', 'ja_cliente', 'virou_venda'] as const;
export const STATUS_FEEDBACK = ['aberto', 'respondido', 'resolvido'] as const;
export const ASSUNTOS_OBS = ['verba', 'produto', 'evento', 'publico', 'criativo', 'outro'] as const;
export const DESTINOS_OBS = ['atendida', 'adiada', 'nao_aplica'] as const;
export const FORMATOS_VIDEO = ['vertical', 'horizontal', 'quadrado'] as const;
export const STATUS_PEDIDO = ['aberto', 'fazendo', 'feito'] as const;
export const FERRAMENTAS_IA = ['chatgpt', 'gemini', 'google_ia', 'perplexity'] as const;
export const RESULTADO_GEO = ['sim', 'citada', 'nao'] as const;
// Checklist antes de enviar o e-mail e antes de publicar a landing page (tudo precisa estar marcado).
export const CHECKLIST: Record<string, string[]> = {
  emails: ['lista', 'assunto', 'links', 'utm', 'teste', 'descadastro', 'celular'],
  paginas: ['pixel_meta', 'tag_google', 'conversao', 'formulario', 'salesforce', 'celular', 'velocidade'],
};

// ---------- itens com aprovação ----------
// Campos de cada tipo: o que a Cancha preenche e o que entra na "fotografia" enviada para aprovação.
type Campo = { k: string; tipo: 'texto' | 'longo' | 'link' | 'data' | 'numero' | 'produtos' | 'escolha'; max?: number; obrig?: boolean; opcoes?: readonly string[] };
export const CAMPOS: Record<string, Campo[]> = {
  planos: [
    { k: 'foco', tipo: 'longo', max: 2000, obrig: true }, { k: 'verbaMeta', tipo: 'numero' }, { k: 'verbaGoogle', tipo: 'numero' },
    { k: 'produtos', tipo: 'produtos' }, { k: 'eventos', tipo: 'longo', max: 2000 }, { k: 'notas', tipo: 'longo', max: 3000 },
  ],
  roteiros: [
    { k: 'titulo', tipo: 'texto', max: 150, obrig: true }, { k: 'objetivo', tipo: 'longo', max: 1000 }, { k: 'duracao', tipo: 'numero' },
    { k: 'formato', tipo: 'escolha', opcoes: FORMATOS_VIDEO }, { k: 'produtos', tipo: 'produtos' }, { k: 'roteiro', tipo: 'longo', max: 12000, obrig: true },
    { k: 'referencias', tipo: 'longo', max: 2000 }, { k: 'prazo', tipo: 'data' },
  ],
  emails: [
    { k: 'titulo', tipo: 'texto', max: 150, obrig: true }, { k: 'assunto', tipo: 'texto', max: 200, obrig: true }, { k: 'preheader', tipo: 'texto', max: 200 },
    { k: 'lista', tipo: 'texto', max: 200 }, { k: 'envio', tipo: 'data' }, { k: 'linkPrevia', tipo: 'link' }, { k: 'produtos', tipo: 'produtos' },
    { k: 'notas', tipo: 'longo', max: 3000 },
  ],
  paginas: [
    { k: 'titulo', tipo: 'texto', max: 150, obrig: true }, { k: 'url', tipo: 'link' }, { k: 'objetivo', tipo: 'longo', max: 1000 },
    { k: 'produtos', tipo: 'produtos' }, { k: 'publicacao', tipo: 'data' }, { k: 'notas', tipo: 'longo', max: 3000 },
  ],
};
export const COLECOES_APROVACAO = Object.keys(CAMPOS);
// Prefixo usado nos links e nos comentários (ex.: "e:<id>" é um e-mail).
export const PREFIXO: Record<string, string> = { rotacoes: 'r', anuncios: 'a', feedbacks: 'f', planos: 'p', roteiros: 'v', emails: 'e', paginas: 'l', pedidos: 'd' };
const COLECAO_DO_PREFIXO = Object.fromEntries(Object.entries(PREFIXO).map(([k, v]) => [v, k]));
// Depois de aprovado, o item ainda pode mudar (volta para rascunho) até estas etapas:
const TRAVADO: Record<string, string[]> = { planos: [], roteiros: ['producao', 'corte', 'ajuste_corte', 'entregue'], emails: ['enviado'], paginas: ['publicado'] };

function lerCampo(f: Campo, v: unknown): unknown {
  const campo = 'campo.' + f.k;
  if (f.tipo === 'texto' || f.tipo === 'longo') return texto(v, campo, f.max || 500, !!f.obrig);
  if (f.tipo === 'link') return linkUrl(v, campo, !!f.obrig);
  if (f.tipo === 'data') { if (v == null || v === '') return ''; if (!isoValida(v)) throw new ErroAcao('erro.datas'); return v; }
  if (f.tipo === 'numero') { if (v == null || v === '') return null; const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new ErroAcao('erro.numero'); return n; }
  if (f.tipo === 'produtos') return lista(v, PRODUTOS, campo, 15);
  if (f.tipo === 'escolha') return v == null || v === '' ? '' : umDe(v, f.opcoes!, campo);
  return v;
}
export const fotografiaItem = (col: string, x: any) => {
  const f: any = { versao: x.versao };
  for (const c of CAMPOS[col]) f[c.k] = x[c.k];
  return f;
};
function colecao(c: Ctx, col: unknown): any[] {
  if (!COLECOES_APROVACAO.includes(String(col))) throw new ErroAcao('erro.nao_encontrado');
  return (c.e as any)[String(col)];
}
function item(c: Ctx, col: unknown, id: unknown) {
  const x = colecao(c, col).find((y) => y.id === id);
  if (!x) throw new ErroAcao('erro.nao_encontrado');
  return x;
}
const nomeItem = (col: string, x: any) => (col === 'planos' ? x.mes : x.titulo);
const ref = (col: string, x: any) => PREFIXO[col] + ':' + x.id;

// Acha o item de um link "k:id" (comentários, avisos).
export function alvoDoRef(c: Ctx, r: string): { col: string; x: any } {
  const col = COLECAO_DO_PREFIXO[r.slice(0, 1)], id = r.slice(2);
  const x = col && (c.e as any)[col]?.find((y: any) => y.id === id);
  if (!x || r[1] !== ':') throw new ErroAcao('erro.nao_encontrado');
  return { col, x };
}
// O que a Spraytec vê de um item (o que foi enviado). A produtora vê só os roteiros já com ela.
const STATUS_PRODUTORA = ['producao', 'corte', 'ajuste_corte', 'entregue'];
export function podeVer(u: { papel: string }, col: string, x: any): boolean {
  if (u.papel === 'cancha') return true;
  if (u.papel === 'produtora') return col === 'roteiros' && STATUS_PRODUTORA.includes(x.status);
  if (COLECOES_APROVACAO.includes(col)) return !!x.enviado;
  if (col === 'anuncios') return !!x.enviado || x.origem === 'continua';
  return true;
}

export const ACOES_MODULOS: Record<string, Def> = {
  // ===== comentários de qualquer item =====
  comentar: {
    papeis: ['cancha', 'aprovador', 'produtora'],
    fn: (c) => {
      const r = String(c.d.ref || '');
      const { col, x } = alvoDoRef(c, r);
      if (!podeVer(c.u, col, x)) throw new ErroAcao('erro.nao_encontrado');
      if (c.u.papel === 'produtora' && col !== 'roteiros') throw new ErroAcao('erro.sem_permissao');
      const t = texto(c.d.texto, 'campo.comentario', 3000);
      const interno = c.u.papel === 'cancha' && !!c.d.interno;
      x.comentarios = x.comentarios || [];
      x.comentarios.push({ id: novoId('c-'), por: c.u.nome, porId: c.u.id, papel: c.u.papel, em: c.agora, texto: t, idioma: c.u.idioma, interno });
      // Feedback da Spraytec respondido pela Cancha passa para "respondido".
      if (col === 'feedbacks' && c.u.papel === 'cancha' && !interno && x.status === 'aberto') { x.status = 'respondido'; hist(c, x, 'hist.fb_respondido'); }
      if (col === 'feedbacks' && c.u.papel === 'aprovador' && x.status === 'respondido') { x.status = 'aberto'; hist(c, x, 'hist.fb_reaberto'); }
      const papeis = interno ? ['cancha'] : col === 'roteiros' && STATUS_PRODUTORA.includes(x.status) ? ['cancha', 'aprovador', 'leitor', 'produtora'] : ['cancha', 'aprovador', 'leitor'];
      const para = mencoes(c.pessoas, c.u.id, t, papeis);
      // Feedback: a outra parte é sempre avisada, mesmo sem @.
      if (col === 'feedbacks' && !interno) for (const id of pessoasDe(c, c.u.papel === 'cancha' ? ['aprovador'] : ['cancha'])) if (!para.includes(id)) para.push(id);
      const nome = col === 'rotacoes' ? nomeRotacao(x) : col === 'planos' ? x.mes : col === 'feedbacks' ? trecho(x.texto).slice(0, 60) : x.titulo;
      const avisos: Aviso[] = para.length ? [{ para, assunto: ['aviso.mencao.assunto', { quem: c.u.nome }],
        paragrafos: [['aviso.mencao.texto', { quem: c.u.nome, onde: nome }], ['aviso.citacao', { texto: trecho(t) }]], abrir: r }] : [];
      return { resumo: `Comentou${interno ? ' (interno)' : ''} em ${col} "${nome}"`, avisos };
    },
  },

  // ===== itens com aprovação (plano do mês, roteiro, e-mail, landing page) =====
  'item-salvar': {
    papeis: C,
    fn: (c) => {
      const col = String(c.d.col), L = colecao(c, col), novo = !c.d.id;
      let x: any;
      if (novo) {
        x = { id: novoId(PREFIXO[col] + '-'), versao: 1, status: 'rascunho', comentarios: [], hist: [], criadoEm: c.agora, idioma: c.u.idioma };
        if (col === 'planos') {
          if (!/^\d{4}-\d{2}$/.test(String(c.d.mes))) throw new ErroAcao('erro.datas');
          if (L.some((p) => p.mes === c.d.mes)) throw new ErroAcao('erro.plano_existe');
          x.mes = c.d.mes; x.id = 'p-' + c.d.mes;
        }
        if (CHECKLIST[col]) x.checklist = {};
      } else x = item(c, col, c.d.id);
      if (!novo && !['rascunho', 'ajuste', 'aprovado'].includes(x.status)) throw new ErroAcao('erro.item_travado');
      if (!novo && TRAVADO[col].includes(x.status)) throw new ErroAcao('erro.item_travado');
      for (const f of CAMPOS[col]) x[f.k] = lerCampo(f, c.d[f.k]);
      if (novo) { hist(c, x, 'hist.item_criado'); L.push(x); }
      else if (x.status === 'aprovado') {
        x.status = 'rascunho'; x.aprovadoPor = null; x.aprovadoEm = null;
        hist(c, x, 'hist.alterado_apos_aprovacao');
      } else hist(c, x, 'hist.item_editado');
      return { resumo: `${novo ? 'Criou' : 'Editou'} ${col} "${nomeItem(col, x)}"`, criado: novo ? x.id : undefined };
    },
  },
  'item-remover': {
    papeis: C,
    fn: (c) => {
      const col = String(c.d.col), x = item(c, col, c.d.id);
      // Só some o que a Spraytec nunca viu.
      if (x.enviado) throw new ErroAcao('erro.item_ja_enviado');
      (c.e as any)[col] = colecao(c, col).filter((y) => y.id !== x.id);
      return { resumo: `Apagou o rascunho ${col} "${nomeItem(col, x)}"` };
    },
  },
  'item-enviar': {
    papeis: C,
    fn: (c) => {
      const col = String(c.d.col), x = item(c, col, c.d.id);
      if (!['rascunho', 'ajuste'].includes(x.status)) throw new ErroAcao('erro.nada_para_enviar');
      for (const f of CAMPOS[col]) if (f.obrig && !x[f.k]) throw new ErroAcao('erro.preencha', { campo: 'campo.' + f.k });
      if (x.enviado) x.versao = (x.versao || 1) + 1;
      x.status = 'aprovacao'; x.enviado = fotografiaItem(col, x); x.enviadoEm = c.agora;
      hist(c, x, 'hist.enviado', { versao: x.versao });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['aprovador']), assunto: ['aviso.item_aprovar.assunto', { tipo: 'tipo.' + col, nome: nomeItem(col, x) }],
        paragrafos: [['aviso.item_aprovar.texto', { tipo: 'tipo.' + col }]], abrir: ref(col, x) }];
      return { resumo: `Enviou ${col} "${nomeItem(col, x)}" (versão ${x.versao}) para aprovação`, avisos };
    },
  },
  'item-aprovar': {
    papeis: A,
    fn: (c) => {
      const col = String(c.d.col), x = item(c, col, c.d.id);
      if (x.status !== 'aprovacao') throw new ErroAcao('erro.nao_em_aprovacao');
      if (c.d.versao != null && Number(c.d.versao) !== x.versao) throw new ErroAcao('erro.versao_mudou');
      x.status = 'aprovado'; x.aprovadoPor = c.u.nome; x.aprovadoPorId = c.u.id; x.aprovadoEm = c.agora; x.aprovadoVersao = x.versao;
      hist(c, x, 'hist.aprovado', { versao: x.versao });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['cancha']), assunto: ['aviso.item_aprovado.assunto', { tipo: 'tipo.' + col, nome: nomeItem(col, x) }],
        paragrafos: [['aviso.item_aprovado.texto', { quem: c.u.nome }]], abrir: ref(col, x) }];
      return { resumo: `Aprovou ${col} "${nomeItem(col, x)}" (versão ${x.versao})`, avisos };
    },
  },
  'item-ajuste': {
    papeis: A,
    fn: (c) => {
      const col = String(c.d.col), x = item(c, col, c.d.id);
      if (x.status !== 'aprovacao') throw new ErroAcao('erro.nao_em_aprovacao');
      const t = texto(c.d.texto, 'campo.o_que_mudar', 3000);
      x.status = 'ajuste'; x.ajustePedido = { texto: t, por: c.u.nome, em: c.agora, versao: x.versao };
      x.comentarios.push({ id: novoId('c-'), por: c.u.nome, porId: c.u.id, papel: c.u.papel, em: c.agora, texto: t, idioma: c.u.idioma, ajuste: true });
      hist(c, x, 'hist.ajuste_pedido', { versao: x.versao });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['cancha']), assunto: ['aviso.ajuste.assunto', { titulo: nomeItem(col, x) }],
        paragrafos: [['aviso.ajuste.texto', { quem: c.u.nome }], ['aviso.citacao', { texto: trecho(t) }]], abrir: ref(col, x) }];
      return { resumo: `Pediu ajuste em ${col} "${nomeItem(col, x)}" (versão ${x.versao})`, avisos };
    },
  },
  // Checklist de publicação (e-mail e landing page). Fica registrado quem marcou.
  'item-checklist': {
    papeis: C,
    fn: (c) => {
      const col = String(c.d.col), x = item(c, col, c.d.id);
      const k = umDe(c.d.chave, CHECKLIST[col] || [], 'campo.checklist');
      if (TRAVADO[col].includes(x.status)) throw new ErroAcao('erro.item_travado');
      x.checklist = x.checklist || {};
      x.checklist[k] = c.d.feito ? { por: c.u.nome, em: c.agora } : null;
      hist(c, x, c.d.feito ? 'hist.check_marcado' : 'hist.check_desmarcado', { item: `check.${col}.${k}` });
      return { resumo: `${c.d.feito ? 'Marcou' : 'Desmarcou'} "${k}" no checklist de "${nomeItem(col, x)}"` };
    },
  },
  // E-mail enviado pelo Brevo / landing page publicada: só com aprovação e checklist completo.
  'item-concluir': {
    papeis: C,
    fn: (c) => {
      const col = String(c.d.col), x = item(c, col, c.d.id);
      if (!CHECKLIST[col]) throw new ErroAcao('erro.sem_permissao');
      if (x.status !== 'aprovado') throw new ErroAcao('erro.falta_aprovar');
      const falta = CHECKLIST[col].filter((k) => !x.checklist?.[k]);
      if (falta.length) throw new ErroAcao('erro.checklist_incompleto', { n: falta.length });
      const data = isoValida(c.d.data) ? c.d.data : c.hoje;
      x.status = col === 'emails' ? 'enviado' : 'publicado'; x.concluidoEm = data;
      hist(c, x, col === 'emails' ? 'hist.email_enviado' : 'hist.lp_publicada', { data });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['aprovador']), assunto: [col === 'emails' ? 'aviso.email_enviado.assunto' : 'aviso.lp_publicada.assunto', { nome: x.titulo }],
        paragrafos: [[col === 'emails' ? 'aviso.email_enviado.texto' : 'aviso.lp_publicada.texto', { data }]], abrir: ref(col, x) }];
      return { resumo: `Marcou "${x.titulo}" como ${x.status} (${data})`, avisos };
    },
  },
  'item-resultado': {
    papeis: C,
    fn: (c) => {
      const col = String(c.d.col), x = item(c, col, c.d.id);
      if (!['enviado', 'publicado'].includes(x.status)) throw new ErroAcao('erro.resultado_cedo');
      const num = (v: unknown) => { if (v === '' || v == null) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new ErroAcao('erro.numero'); return n; };
      const chaves = col === 'emails' ? ['enviados', 'aberturas', 'cliques', 'descadastros'] : ['visitas', 'conversoes'];
      x.resultado = { origem: 'manual', em: c.agora, por: c.u.nome, ...Object.fromEntries(chaves.map((k) => [k, num(c.d.resultado?.[k])])) };
      hist(c, x, 'hist.resultado');
      return { resumo: `Registrou números de "${x.titulo}"` };
    },
  },

  // ===== roteiros: produtora e vídeo final =====
  'roteiro-produtora': {
    papeis: C,
    fn: (c) => {
      const x = item(c, 'roteiros', c.d.id);
      if (x.status !== 'aprovado') throw new ErroAcao('erro.falta_aprovar');
      x.status = 'producao'; x.enviadoProdutoraEm = c.agora;
      if (isoValida(c.d.prazo)) x.prazo = c.d.prazo;
      hist(c, x, 'hist.para_produtora');
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['produtora']), assunto: ['aviso.roteiro_produtora.assunto', { nome: x.titulo }],
        paragrafos: [['aviso.roteiro_produtora.texto', { prazo: x.prazo || '—' }]], abrir: ref('roteiros', x) }];
      return { resumo: `Enviou o roteiro "${x.titulo}" para a produtora`, avisos };
    },
  },
  'roteiro-corte': {
    papeis: ['produtora', 'cancha'],
    fn: (c) => {
      const x = item(c, 'roteiros', c.d.id);
      if (!['producao', 'ajuste_corte'].includes(x.status)) throw new ErroAcao('erro.item_travado');
      const link = linkUrl(c.d.link, 'campo.link_video', true);
      x.corteVersao = (x.corteVersao || 0) + 1;
      x.cortes = [...(x.cortes || []), { versao: x.corteVersao, link, nota: texto(c.d.nota, 'campo.nota', 1000, false), por: c.u.nome, papel: c.u.papel, em: c.agora, idioma: c.u.idioma }];
      x.status = 'corte';
      hist(c, x, 'hist.corte_enviado', { versao: x.corteVersao });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['aprovador', 'cancha']), assunto: ['aviso.corte.assunto', { nome: x.titulo }],
        paragrafos: [['aviso.corte.texto', { quem: c.u.nome }]], abrir: ref('roteiros', x) }];
      return { resumo: `Enviou o vídeo (versão ${x.corteVersao}) do roteiro "${x.titulo}"`, avisos };
    },
  },
  'roteiro-aprovar-corte': {
    papeis: A,
    fn: (c) => {
      const x = item(c, 'roteiros', c.d.id);
      if (x.status !== 'corte') throw new ErroAcao('erro.nao_em_aprovacao');
      x.status = 'entregue'; x.videoAprovadoPor = c.u.nome; x.videoAprovadoEm = c.agora; x.videoAprovadoVersao = x.corteVersao;
      hist(c, x, 'hist.video_aprovado', { versao: x.corteVersao });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['cancha', 'produtora']), assunto: ['aviso.video_aprovado.assunto', { nome: x.titulo }],
        paragrafos: [['aviso.video_aprovado.texto', { quem: c.u.nome }]], abrir: ref('roteiros', x) }];
      return { resumo: `Aprovou o vídeo final de "${x.titulo}"`, avisos };
    },
  },
  'roteiro-ajuste-corte': {
    papeis: A,
    fn: (c) => {
      const x = item(c, 'roteiros', c.d.id);
      if (x.status !== 'corte') throw new ErroAcao('erro.nao_em_aprovacao');
      const t = texto(c.d.texto, 'campo.o_que_mudar', 3000);
      x.status = 'ajuste_corte';
      x.comentarios.push({ id: novoId('c-'), por: c.u.nome, porId: c.u.id, papel: c.u.papel, em: c.agora, texto: t, idioma: c.u.idioma, ajuste: true });
      hist(c, x, 'hist.ajuste_corte', { versao: x.corteVersao });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['cancha', 'produtora']), assunto: ['aviso.ajuste.assunto', { titulo: x.titulo }],
        paragrafos: [['aviso.ajuste.texto', { quem: c.u.nome }], ['aviso.citacao', { texto: trecho(t) }]], abrir: ref('roteiros', x) }];
      return { resumo: `Pediu ajuste no vídeo de "${x.titulo}"`, avisos };
    },
  },

  // ===== feedbacks =====
  'feedback-criar': {
    papeis: CA,
    fn: (c) => {
      const tipo = umDe(c.d.tipo, TIPOS_FEEDBACK, 'campo.tipo');
      const f: any = { id: novoId('f-'), tipo, texto: texto(c.d.texto, 'campo.feedback', 3000), idioma: c.u.idioma, por: c.u.nome, porId: c.u.id, papel: c.u.papel, em: c.agora,
        status: 'aberto', comentarios: [], hist: [] };
      if (c.d.sobre) {
        const { col, x } = alvoDoRef(c, String(c.d.sobre));
        if (!podeVer(c.u, col, x)) throw new ErroAcao('erro.nao_encontrado');
        f.sobre = { ref: String(c.d.sobre), titulo: col === 'rotacoes' ? nomeRotacao(x) : col === 'planos' ? x.mes : x.titulo };
      }
      if (tipo === 'leads') {
        f.leads = { qualidade: umDe(c.d.qualidade, QUALIDADE_LEAD, 'campo.qualidade'), quantidade: c.d.quantidade === '' || c.d.quantidade == null ? null : Math.max(0, Math.round(Number(c.d.quantidade)) || 0),
          periodo: texto(c.d.periodo, 'campo.periodo', 100, false) };
      }
      hist(c, f, 'hist.fb_criado');
      c.e.feedbacks.push(f);
      const avisos: Aviso[] = [{ para: pessoasDe(c, c.u.papel === 'cancha' ? ['aprovador'] : ['cancha']), assunto: ['aviso.feedback.assunto', { quem: c.u.nome, tipo: 'fb.tipo.' + tipo }],
        paragrafos: [['aviso.citacao', { texto: trecho(f.texto) }]], abrir: 'f:' + f.id }];
      return { resumo: `Deixou um feedback (${tipo})`, criado: f.id, avisos };
    },
  },
  'feedback-status': {
    papeis: CA,
    fn: (c) => {
      const f = c.e.feedbacks.find((x) => x.id === c.d.id);
      if (!f) throw new ErroAcao('erro.nao_encontrado');
      const st = umDe(c.d.status, STATUS_FEEDBACK, 'campo.status');
      if (st === f.status) return { resumo: 'Sem mudança' };
      f.status = st;
      hist(c, f, 'hist.fb_status', { status: 'fb.st.' + st });
      return { resumo: `Mudou o feedback para "${st}"` };
    },
  },

  // ===== observações para o mês seguinte =====
  'obs-criar': {
    papeis: CA,
    fn: (c) => {
      if (!/^\d{4}-\d{2}$/.test(String(c.d.mes))) throw new ErroAcao('erro.datas');
      const o = { id: novoId('o-'), mes: c.d.mes, assunto: umDe(c.d.assunto, ASSUNTOS_OBS, 'campo.assunto'), texto: texto(c.d.texto, 'campo.observacao', 2000),
        idioma: c.u.idioma, por: c.u.nome, porId: c.u.id, papel: c.u.papel, em: c.agora, destino: null, hist: [] as any[] };
      hist(c, o, 'hist.obs_criada');
      c.e.observacoes.push(o);
      const avisos: Aviso[] = c.u.papel === 'aprovador' ? [{ para: pessoasDe(c, ['cancha']), assunto: ['aviso.obs.assunto', { quem: c.u.nome, mes: c.d.mes }],
        paragrafos: [['aviso.citacao', { texto: trecho(o.texto) }]], abrir: 'p:p-' + c.d.mes }] : [];
      return { resumo: `Anotou uma observação para ${c.d.mes}`, criado: o.id, avisos };
    },
  },
  'obs-destino': {
    papeis: C,
    fn: (c) => {
      const o = c.e.observacoes.find((x) => x.id === c.d.id);
      if (!o) throw new ErroAcao('erro.nao_encontrado');
      o.destino = c.d.destino ? umDe(c.d.destino, DESTINOS_OBS, 'campo.destino') : null;
      o.destinoNota = texto(c.d.nota, 'campo.nota', 500, false);
      hist(c, o, 'hist.obs_destino', { destino: o.destino ? 'obs.destino.' + o.destino : 'obs.destino.nenhum' });
      return { resumo: `Deu destino a uma observação de ${o.mes}: ${o.destino || '—'}` };
    },
  },
  'obs-remover': {
    papeis: CA,
    fn: (c) => {
      const o = c.e.observacoes.find((x) => x.id === c.d.id);
      if (!o) throw new ErroAcao('erro.nao_encontrado');
      if (o.porId !== c.u.id || o.destino) throw new ErroAcao('erro.sem_permissao');
      c.e.observacoes = c.e.observacoes.filter((x) => x.id !== o.id);
      return { resumo: `Apagou uma observação de ${o.mes}` };
    },
  },

  // ===== pedidos de ajuste no site =====
  'pedido-salvar': {
    papeis: CA,
    fn: (c) => {
      const novo = !c.d.id;
      const p: any = novo ? { id: novoId('d-'), status: 'aberto', por: c.u.nome, porId: c.u.id, papel: c.u.papel, em: c.agora, idioma: c.u.idioma, comentarios: [], hist: [] }
        : c.e.pedidos.find((x) => x.id === c.d.id);
      if (!p) throw new ErroAcao('erro.nao_encontrado');
      if (!novo && c.u.papel !== 'cancha' && p.porId !== c.u.id) throw new ErroAcao('erro.sem_permissao');
      p.titulo = texto(c.d.titulo, 'campo.titulo_pedido', 150);
      p.descricao = texto(c.d.descricao, 'campo.descricao', 3000);
      p.url = linkUrl(c.d.url, 'campo.pagina');
      p.prazo = isoValida(c.d.prazo) ? c.d.prazo : '';
      hist(c, p, novo ? 'hist.pedido_criado' : 'hist.item_editado');
      if (novo) c.e.pedidos.push(p);
      const avisos: Aviso[] = novo ? [{ para: pessoasDe(c, c.u.papel === 'cancha' ? ['aprovador'] : ['cancha']), assunto: ['aviso.pedido.assunto', { nome: p.titulo }],
        paragrafos: [['aviso.citacao', { texto: trecho(p.descricao) }]], abrir: 'd:' + p.id }] : [];
      return { resumo: `${novo ? 'Abriu' : 'Editou'} o pedido "${p.titulo}"`, criado: novo ? p.id : undefined, avisos };
    },
  },
  'pedido-status': {
    papeis: C,
    fn: (c) => {
      const p = c.e.pedidos.find((x) => x.id === c.d.id);
      if (!p) throw new ErroAcao('erro.nao_encontrado');
      p.status = umDe(c.d.status, STATUS_PEDIDO, 'campo.status');
      if (p.status === 'feito') p.feitoEm = c.hoje;
      hist(c, p, 'hist.pedido_status', { status: 'pedido.st.' + p.status });
      const avisos: Aviso[] = p.status === 'feito' ? [{ para: pessoasDe(c, ['aprovador']), assunto: ['aviso.pedido_feito.assunto', { nome: p.titulo }], paragrafos: [], abrir: 'd:' + p.id }] : [];
      return { resumo: `Pedido "${p.titulo}": ${p.status}`, avisos };
    },
  },

  // ===== SEO: palavras monitoradas e posição mês a mês =====
  'palavra-salvar': {
    papeis: C,
    fn: (c) => {
      const novo = !c.d.id;
      const p: any = novo ? { id: novoId('k-'), meses: [] } : c.e.palavras.find((x) => x.id === c.d.id);
      if (!p) throw new ErroAcao('erro.nao_encontrado');
      p.termo = texto(c.d.termo, 'campo.termo', 120);
      p.produtos = lista(c.d.produtos, PRODUTOS, 'campo.produtos', 5);
      p.nota = texto(c.d.nota, 'campo.nota', 500, false);
      if (novo) c.e.palavras.push(p);
      return { resumo: `${novo ? 'Passou a acompanhar' : 'Editou'} a palavra "${p.termo}"`, criado: novo ? p.id : undefined };
    },
  },
  'palavra-mes': {
    papeis: C,
    fn: (c) => {
      const p = c.e.palavras.find((x) => x.id === c.d.id);
      if (!p) throw new ErroAcao('erro.nao_encontrado');
      if (!/^\d{4}-\d{2}$/.test(String(c.d.mes))) throw new ErroAcao('erro.datas');
      const num = (v: unknown) => { if (v === '' || v == null) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new ErroAcao('erro.numero'); return n; };
      const reg = { mes: c.d.mes, posicao: num(c.d.posicao), cliques: num(c.d.cliques), impressoes: num(c.d.impressoes), origem: 'manual', por: c.u.nome, em: c.agora };
      p.meses = [...p.meses.filter((m: any) => m.mes !== c.d.mes), reg].sort((a: any, b: any) => a.mes.localeCompare(b.mes));
      return { resumo: `Registrou a posição de "${p.termo}" em ${c.d.mes}` };
    },
  },
  'palavra-remover': {
    papeis: C,
    fn: (c) => {
      const p = c.e.palavras.find((x) => x.id === c.d.id);
      if (!p) throw new ErroAcao('erro.nao_encontrado');
      c.e.palavras = c.e.palavras.filter((x) => x.id !== p.id);
      return { resumo: `Parou de acompanhar a palavra "${p.termo}"` };
    },
  },

  // ===== GEO: perguntas feitas às IAs e se a Spraytec aparece =====
  'geo-salvar': {
    papeis: C,
    fn: (c) => {
      const novo = !c.d.id;
      const g: any = novo ? { id: novoId('g-'), verificacoes: [] } : c.e.geo.find((x) => x.id === c.d.id);
      if (!g) throw new ErroAcao('erro.nao_encontrado');
      g.pergunta = texto(c.d.pergunta, 'campo.pergunta', 300);
      g.produtos = lista(c.d.produtos, PRODUTOS, 'campo.produtos', 5);
      if (novo) c.e.geo.push(g);
      return { resumo: `${novo ? 'Passou a acompanhar' : 'Editou'} a pergunta "${g.pergunta}"`, criado: novo ? g.id : undefined };
    },
  },
  'geo-verificar': {
    papeis: C,
    fn: (c) => {
      const g = c.e.geo.find((x) => x.id === c.d.id);
      if (!g) throw new ErroAcao('erro.nao_encontrado');
      if (!/^\d{4}-\d{2}$/.test(String(c.d.mes))) throw new ErroAcao('erro.datas');
      const ferramenta = umDe(c.d.ferramenta, FERRAMENTAS_IA, 'campo.ferramenta');
      const reg = { mes: c.d.mes, ferramenta, resultado: umDe(c.d.resultado, RESULTADO_GEO, 'campo.resultado'), concorrentes: texto(c.d.concorrentes, 'campo.concorrentes', 300, false),
        link: linkUrl(c.d.link, 'campo.print'), por: c.u.nome, em: c.agora, origem: 'manual' };
      g.verificacoes = [...g.verificacoes.filter((v: any) => !(v.mes === reg.mes && v.ferramenta === ferramenta)), reg];
      return { resumo: `Registrou ${ferramenta} em ${reg.mes} para "${g.pergunta}": ${reg.resultado}` };
    },
  },
  'geo-remover': {
    papeis: C,
    fn: (c) => {
      const g = c.e.geo.find((x) => x.id === c.d.id);
      if (!g) throw new ErroAcao('erro.nao_encontrado');
      c.e.geo = c.e.geo.filter((x) => x.id !== g.id);
      return { resumo: `Parou de acompanhar a pergunta "${g.pergunta}"` };
    },
  },
};
