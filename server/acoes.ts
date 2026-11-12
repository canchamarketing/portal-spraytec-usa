// Todas as alterações do portal passam por aqui. Cada ação diz quem pode pedi-la (papéis) e o que muda.
// O servidor (main.ts) confere o papel, aplica a ação numa transação, grava só o que mudou e registra
// na auditoria. Textos que aparecem na tela são chaves de tradução (o histórico de cada item também).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Estado } from './estado.ts';
import {
  ErroAcao, addBiz, isoValida, linkUrl, novoId, texto, umDe, type Papel, type Usuario,
} from './dominio.ts';
import { envioDe } from './integracoes/drive.ts';

export type Pessoa = { id: string; nome: string; papel: string };
export type Ctx = { e: Estado; u: Usuario; d: any; hoje: string; agora: string; pessoas: Pessoa[] };
// Aviso por e-mail. Assunto e parágrafos são chaves de tradução: cada pessoa recebe no próprio idioma.
export type Aviso = { para: string[]; assunto: [string, Record<string, unknown>?]; paragrafos: [string, Record<string, unknown>?][]; abrir: string };
export type Resultado = { resumo: string; criado?: string; avisos?: Aviso[] };
type Def = { papeis: Papel[]; fn: (c: Ctx) => Resultado; semAuditoria?: boolean };

// ---------- catálogos fixos ----------
const CATALOGO = JSON.parse(readFileSync(join(import.meta.dirname, '..', 'public', 'dados', 'produtos.json'), 'utf8'));
export const PRODUTOS: string[] = CATALOGO.produtos.map((p: any) => p.id);
export const CANAIS = ['meta', 'google'] as const;
export const FORMATOS = ['imagem', 'video', 'carrossel', 'texto'] as const;
export const LOCAIS = ['feed', 'stories', 'reels', 'pesquisa', 'youtube', 'display', 'pmax'] as const;
// Objetivos em palavras simples (o jargão de mídia fica na explicação de cada um, na tela).
export const OBJETIVOS = ['contatos', 'lembrar', 'marca', 'protecao', 'concorrentes'] as const;
export const SEMAFOROS = ['bem', 'atencao', 'cansado'] as const;
export const TIPOS_EVENTO = ['fase', 'feira', 'foco', 'campanha', 'recesso'] as const;

// Etapas da rotação: montando → aprovacao → aprovada → no_ar → encerrada
// Etapas do anúncio novo: rascunho → aprovacao → aprovado | ajuste (→ aprovacao de novo) → no_ar → encerrado
// Anúncio que continua da rotação anterior: continua → no_ar → encerrado (já foi aprovado antes)

const C: Papel[] = ['cancha'];
const A: Papel[] = ['aprovador'];
const LEITURA: Papel[] = ['cancha', 'aprovador'];

// ---------- utilidades ----------
function hist(c: Ctx, alvo: any, k: string, p?: Record<string, unknown>) {
  alvo.hist = alvo.hist || [];
  alvo.hist.push({ k, p: p || {}, por: c.u.nome, papel: c.u.papel, em: c.agora });
}
function rotacao(c: Ctx, id: unknown) {
  const r = c.e.rotacoes.find((x) => x.id === id);
  if (!r) throw new ErroAcao('erro.nao_encontrado');
  return r;
}
function anuncio(c: Ctx, id: unknown) {
  const a = c.e.anuncios.find((x) => x.id === id);
  if (!a) throw new ErroAcao('erro.nao_encontrado');
  return a;
}
const doCiclo = (e: Estado, rid: string) => e.anuncios.filter((a) => a.rotacaoId === rid);
const novos = (e: Estado, rid: string) => doCiclo(e, rid).filter((a) => a.origem === 'novo');
const pessoasDe = (c: Ctx, papeis: string[]) => c.pessoas.filter((p) => papeis.includes(p.papel) && p.id !== c.u.id).map((p) => p.id);
const trecho = (s: string) => (s.length > 300 ? s.slice(0, 297) + '...' : s);
function lista<T extends string>(v: unknown, opcoes: readonly T[], campo: string, max = 20): T[] {
  const l = Array.isArray(v) ? v : [];
  const r = [...new Set(l.map(String))].slice(0, max);
  for (const x of r) if (!(opcoes as readonly string[]).includes(x)) throw new ErroAcao('erro.escolha', { campo });
  return r as T[];
}
function periodo(d: any) {
  if (!isoValida(d.ini) || !isoValida(d.fim)) throw new ErroAcao('erro.datas');
  if (d.fim < d.ini) throw new ErroAcao('erro.datas_ordem');
  const prazo = d.prazo ? d.prazo : addBiz(d.ini, -3);
  if (!isoValida(prazo)) throw new ErroAcao('erro.datas');
  return { ini: d.ini as string, fim: d.fim as string, prazo };
}
// Menções com @: quem é citado recebe aviso por e-mail.
const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
export function mencoes(pessoas: Pessoa[], eu: string, txt: string, papeis: string[]): string[] {
  return pessoas.filter((p) => p.id !== eu && papeis.includes(p.papel) && new RegExp('@' + escRe(p.nome) + '(?![\\p{L}\\d])', 'iu').test(txt)).map((p) => p.id);
}
// O que vai para aprovação fica guardado como foi enviado: a aprovação vale para esta versão.
function fotografia(a: any) {
  return {
    versao: a.versao, titulo: a.titulo, canal: a.canal, formato: a.formato, locais: a.locais, objetivo: a.objetivo, produtos: a.produtos,
    publico: a.publico, textos: a.textos, linkDrive: a.linkDrive, arquivos: (a.arquivos || []).filter((x: any) => !x.removido).map((x: any) => x.id),
  };
}
function conferirRotacaoAprovada(c: Ctx, r: any, avisos: Aviso[]) {
  if (r.status !== 'aprovacao') return;
  const n = novos(c.e, r.id);
  if (n.length && n.every((a) => a.status === 'aprovado')) {
    r.status = 'aprovada';
    hist(c, r, 'hist.rotacao_aprovada');
    avisos.push({ para: pessoasDe(c, ['cancha']), assunto: ['aviso.rotacao_aprovada.assunto', { nome: nomeRotacao(r) }],
      paragrafos: [['aviso.rotacao_aprovada.texto', { quem: c.u.nome }]], abrir: 'r:' + r.id });
  }
}
const nomeRotacao = (r: any) => `${r.ini} → ${r.fim}`;

// ---------- arquivos (Google Drive) ----------
// Onde cada arquivo fica no Drive e quem pode anexar. É conferido antes de o envio começar e de novo ao registrar.
export function destinoArquivo(e: Estado, u: Usuario, ref: string): string[] {
  const i = ref.indexOf(':'), k = ref.slice(0, i), id = ref.slice(i + 1);
  if (k === 'a') {
    if (u.papel !== 'cancha') throw new ErroAcao('erro.sem_permissao');
    const a = e.anuncios.find((x) => x.id === id);
    if (!a) throw new ErroAcao('erro.nao_encontrado');
    if (!['rascunho', 'ajuste'].includes(a.status)) throw new ErroAcao('erro.anuncio_travado');
    const r = e.rotacoes.find((x) => x.id === a.rotacaoId);
    return a.pastaDrive || ['Anúncios', r ? `${r.ini} a ${r.fim}` : 'Sem rotação', `${a.titulo} (${a.id})`];
  }
  throw new ErroAcao('erro.destino_arquivo');
}

// ---------- ações ----------
export const ACOES: Record<string, Def> = {
  // ===== rotações =====
  'rotacao-criar': {
    papeis: C,
    fn: (c) => {
      const p = periodo(c.d);
      const foco = texto(c.d.foco, 'campo.foco', 1000, false);
      const r: any = { id: novoId('r-'), ...p, foco, status: 'montando', saem: [], comentarios: [], hist: [], criadaEm: c.agora };
      // Anúncios da rotação anterior: cada um continua (vira cópia ligada nesta rotação) ou sai (com o motivo).
      const ant = c.d.anteriorId ? rotacao(c, c.d.anteriorId) : null;
      if (ant) {
        r.anteriorId = ant.id;
        const decisoes: Record<string, any> = c.d.decisoes || {};
        for (const a of doCiclo(c.e, ant.id).filter((x) => ['no_ar', 'aprovado', 'continua', 'encerrado'].includes(x.status) && !x.saiu)) {
          const dec = decisoes[a.id] || {};
          if (dec.fica) {
            const copia: any = {
              ...JSON.parse(JSON.stringify(a)), id: novoId('a-'), rotacaoId: r.id, origem: 'continua', anteriorId: a.id, status: 'continua',
              comentarios: [], hist: [], semaforo: null, semaforoMotivo: '', resultado: null,
            };
            hist(c, copia, 'hist.continua', { de: nomeRotacao(ant) });
            c.e.anuncios.push(copia);
          } else {
            r.saem.push({ anuncioId: a.id, titulo: a.titulo, motivo: texto(dec.motivo, 'campo.motivo', 500, false) });
          }
        }
      }
      hist(c, r, 'hist.rotacao_criada');
      c.e.rotacoes.push(r);
      return { resumo: `Criou a rotação ${nomeRotacao(r)}`, criado: r.id };
    },
  },
  'rotacao-editar': {
    papeis: C,
    fn: (c) => {
      const r = rotacao(c, c.d.id);
      if (r.status === 'encerrada') throw new ErroAcao('erro.rotacao_encerrada');
      const p = periodo({ ini: c.d.ini ?? r.ini, fim: c.d.fim ?? r.fim, prazo: c.d.prazo ?? r.prazo });
      const foco = c.d.foco === undefined ? r.foco : texto(c.d.foco, 'campo.foco', 1000, false);
      const antes = { ini: r.ini, fim: r.fim, prazo: r.prazo, foco: r.foco };
      Object.assign(r, p, { foco });
      if (JSON.stringify(antes) !== JSON.stringify({ ini: r.ini, fim: r.fim, prazo: r.prazo, foco: r.foco })) hist(c, r, 'hist.rotacao_editada');
      return { resumo: `Editou a rotação ${nomeRotacao(r)}` };
    },
  },
  'rotacao-remover': {
    papeis: C,
    fn: (c) => {
      const r = rotacao(c, c.d.id);
      // Só some o que ninguém do cliente viu: rotação ainda montando e sem nada enviado.
      if (r.status !== 'montando' || doCiclo(c.e, r.id).some((a) => a.enviado)) throw new ErroAcao('erro.rotacao_nao_remove');
      c.e.anuncios = c.e.anuncios.filter((a) => a.rotacaoId !== r.id);
      c.e.rotacoes = c.e.rotacoes.filter((x) => x.id !== r.id);
      return { resumo: `Removeu a rotação ${nomeRotacao(r)} (ainda em montagem)` };
    },
  },
  'rotacao-no-ar': {
    papeis: C,
    fn: (c) => {
      const r = rotacao(c, c.d.id);
      const L = doCiclo(c.e, r.id);
      if (!['aprovada', 'montando'].includes(r.status) || L.some((a) => ['rascunho', 'aprovacao', 'ajuste'].includes(a.status)) || !L.length)
        throw new ErroAcao('erro.rotacao_falta_aprovar');
      const data = isoValida(c.d.data) ? c.d.data : c.hoje;
      r.status = 'no_ar'; r.noArEm = data;
      for (const a of L) { a.status = 'no_ar'; hist(c, a, 'hist.no_ar', { data }); }
      hist(c, r, 'hist.rotacao_no_ar', { data });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['aprovador']), assunto: ['aviso.no_ar.assunto', { nome: nomeRotacao(r) }],
        paragrafos: [['aviso.no_ar.texto', { n: L.length, data }]], abrir: 'r:' + r.id }];
      return { resumo: `Marcou a rotação ${nomeRotacao(r)} como no ar (${data})`, avisos };
    },
  },
  'rotacao-encerrar': {
    papeis: C,
    fn: (c) => {
      const r = rotacao(c, c.d.id);
      if (r.status !== 'no_ar') throw new ErroAcao('erro.rotacao_nao_no_ar');
      const avaliacoes: Record<string, any> = c.d.avaliacoes || {};
      const L = doCiclo(c.e, r.id);
      for (const a of L) {
        const av = avaliacoes[a.id] || {};
        a.semaforo = umDe(av.semaforo, SEMAFOROS, 'campo.semaforo');
        a.semaforoMotivo = texto(av.motivo, 'campo.motivo', 500, a.semaforo !== 'bem');
        a.status = 'encerrado';
        hist(c, a, 'hist.avaliado', { semaforo: 'semaforo.' + a.semaforo });
      }
      r.resumo = texto(c.d.resumo, 'campo.resumo', 3000, false);
      r.status = 'encerrada'; r.encerradaEm = c.hoje;
      hist(c, r, 'hist.rotacao_encerrada');
      return { resumo: `Encerrou a rotação ${nomeRotacao(r)} e avaliou ${L.length} anúncio(s)` };
    },
  },

  // ===== anúncios =====
  'anuncio-salvar': {
    papeis: C,
    fn: (c) => {
      const d = c.d;
      const novo = !d.id;
      const a: any = novo ? { id: novoId('a-'), rotacaoId: '', origem: 'novo', versao: 1, status: 'rascunho', arquivos: [], comentarios: [], hist: [], criadoEm: c.agora } : anuncio(c, d.id);
      const r = rotacao(c, novo ? d.rotacaoId : a.rotacaoId);
      if (['no_ar', 'encerrada'].includes(r.status)) throw new ErroAcao('erro.rotacao_travada');
      if (!novo && !['rascunho', 'ajuste', 'aprovado'].includes(a.status)) throw new ErroAcao('erro.anuncio_travado');
      a.rotacaoId = r.id;
      a.titulo = texto(d.titulo, 'campo.titulo', 150);
      a.canal = umDe(d.canal, CANAIS, 'campo.canal');
      a.formato = umDe(d.formato, FORMATOS, 'campo.formato');
      a.locais = lista(d.locais, LOCAIS, 'campo.locais');
      a.objetivo = umDe(d.objetivo, OBJETIVOS, 'campo.objetivo');
      a.produtos = lista(d.produtos, PRODUTOS, 'campo.produtos', 10);
      a.publico = texto(d.publico, 'campo.publico', 500, false);
      const t = d.textos || {};
      a.textos = {
        titulo: texto(t.titulo, 'campo.texto_titulo', 300, false), texto: texto(t.texto, 'campo.texto_principal', 3000, false),
        cta: texto(t.cta, 'campo.cta', 60, false), link: linkUrl(t.link, 'campo.link_destino'),
      };
      a.linkDrive = linkUrl(d.linkDrive, 'campo.link_drive');
      a.nota = texto(d.nota, 'campo.nota', 1000, false);
      if (novo) { hist(c, a, 'hist.anuncio_criado'); c.e.anuncios.push(a); }
      else if (a.status === 'aprovado') {
        // Mexeu no que já estava aprovado: precisa de nova aprovação (a anterior fica no histórico).
        a.status = 'rascunho'; a.aprovadoPor = null; a.aprovadoEm = null;
        if (r.status === 'aprovada') r.status = 'aprovacao';
        hist(c, a, 'hist.alterado_apos_aprovacao');
      } else hist(c, a, 'hist.anuncio_editado');
      return { resumo: `${novo ? 'Criou' : 'Editou'} o anúncio "${a.titulo}"`, criado: novo ? a.id : undefined };
    },
  },
  'anuncio-remover': {
    papeis: C,
    fn: (c) => {
      const a = anuncio(c, c.d.id), r = rotacao(c, a.rotacaoId);
      if (['no_ar', 'encerrada'].includes(r.status)) throw new ErroAcao('erro.rotacao_travada');
      if (a.status === 'aprovacao') throw new ErroAcao('erro.anuncio_em_aprovacao');
      c.e.anuncios = c.e.anuncios.filter((x) => x.id !== a.id);
      // O que continuava e foi tirado passa para "saem", com o motivo. O que foi enviado e tirado fica registrado na rotação.
      if (a.origem === 'continua') r.saem.push({ anuncioId: a.anteriorId, titulo: a.titulo, motivo: texto(c.d.motivo, 'campo.motivo', 500, false) });
      if (a.enviado || a.origem === 'continua') hist(c, r, 'hist.anuncio_tirado', { titulo: a.titulo });
      conferirRotacaoAprovada(c, r, []);
      return { resumo: `Tirou o anúncio "${a.titulo}" da rotação ${nomeRotacao(r)}` };
    },
  },
  // Envia para aprovação os anúncios novos em rascunho ou em ajuste (todos ou os escolhidos).
  'anuncio-enviar': {
    papeis: C,
    fn: (c) => {
      const r = rotacao(c, c.d.rotacaoId);
      if (['no_ar', 'encerrada'].includes(r.status)) throw new ErroAcao('erro.rotacao_travada');
      const ids: string[] | null = Array.isArray(c.d.ids) ? c.d.ids : null;
      const L = novos(c.e, r.id).filter((a) => ['rascunho', 'ajuste'].includes(a.status) && (!ids || ids.includes(a.id)));
      if (!L.length) throw new ErroAcao('erro.nada_para_enviar');
      for (const a of L) {
        const temPeca = (a.arquivos || []).some((x: any) => !x.removido) || a.linkDrive || (a.formato === 'texto' && a.textos?.texto);
        if (!temPeca) throw new ErroAcao('erro.anuncio_sem_peca', { titulo: a.titulo });
      }
      for (const a of L) {
        if (a.enviado) a.versao = (a.versao || 1) + 1;
        a.status = 'aprovacao';
        a.enviado = fotografia(a);
        a.enviadoEm = c.agora;
        hist(c, a, 'hist.enviado', { versao: a.versao });
      }
      r.status = 'aprovacao';
      hist(c, r, 'hist.rotacao_enviada', { n: L.length });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['aprovador']), assunto: ['aviso.aprovar.assunto', { n: L.length }],
        paragrafos: [['aviso.aprovar.texto', { n: L.length, prazo: r.prazo }]], abrir: 'r:' + r.id }];
      return { resumo: `Enviou ${L.length} anúncio(s) da rotação ${nomeRotacao(r)} para aprovação`, avisos };
    },
  },
  'anuncio-aprovar': {
    papeis: A,
    fn: (c) => {
      const a = anuncio(c, c.d.id), r = rotacao(c, a.rotacaoId);
      if (a.status !== 'aprovacao') throw new ErroAcao('erro.nao_em_aprovacao');
      if (c.d.versao != null && Number(c.d.versao) !== a.versao) throw new ErroAcao('erro.versao_mudou');
      a.status = 'aprovado'; a.aprovadoPor = c.u.nome; a.aprovadoPorId = c.u.id; a.aprovadoEm = c.agora; a.aprovadoVersao = a.versao;
      hist(c, a, 'hist.aprovado', { versao: a.versao });
      const avisos: Aviso[] = [];
      conferirRotacaoAprovada(c, r, avisos);
      return { resumo: `Aprovou o anúncio "${a.titulo}" (versão ${a.versao})`, avisos };
    },
  },
  'anuncio-ajuste': {
    papeis: A,
    fn: (c) => {
      const a = anuncio(c, c.d.id), r = rotacao(c, a.rotacaoId);
      if (a.status !== 'aprovacao') throw new ErroAcao('erro.nao_em_aprovacao');
      const t = texto(c.d.texto, 'campo.o_que_mudar', 3000);
      a.status = 'ajuste';
      a.ajustePedido = { texto: t, por: c.u.nome, em: c.agora, versao: a.versao };
      a.comentarios.push({ id: novoId('c-'), por: c.u.nome, porId: c.u.id, papel: c.u.papel, em: c.agora, texto: t, idioma: c.u.idioma, ajuste: true });
      hist(c, a, 'hist.ajuste_pedido', { versao: a.versao });
      const avisos: Aviso[] = [{ para: pessoasDe(c, ['cancha']), assunto: ['aviso.ajuste.assunto', { titulo: a.titulo }],
        paragrafos: [['aviso.ajuste.texto', { quem: c.u.nome }], ['aviso.citacao', { texto: trecho(t) }]], abrir: 'a:' + a.id }];
      if (r.status === 'aprovada') r.status = 'aprovacao';
      return { resumo: `Pediu ajuste no anúncio "${a.titulo}" (versão ${a.versao})`, avisos };
    },
  },
  'rotacao-aprovar-todos': {
    papeis: A,
    fn: (c) => {
      const r = rotacao(c, c.d.id);
      const L = novos(c.e, r.id).filter((a) => a.status === 'aprovacao');
      if (!L.length) throw new ErroAcao('erro.nada_para_aprovar');
      for (const a of L) {
        a.status = 'aprovado'; a.aprovadoPor = c.u.nome; a.aprovadoPorId = c.u.id; a.aprovadoEm = c.agora; a.aprovadoVersao = a.versao;
        hist(c, a, 'hist.aprovado_todos', { versao: a.versao });
      }
      const avisos: Aviso[] = [];
      conferirRotacaoAprovada(c, r, avisos);
      return { resumo: `Aprovou de uma vez ${L.length} anúncio(s) da rotação ${nomeRotacao(r)}`, avisos };
    },
  },
  // Números digitados pela Cancha enquanto Meta e Google Ads não estão conectados.
  'anuncio-resultado': {
    papeis: C,
    fn: (c) => {
      const a = anuncio(c, c.d.id);
      if (!['no_ar', 'encerrado'].includes(a.status)) throw new ErroAcao('erro.resultado_cedo');
      const num = (v: unknown) => { if (v === '' || v == null) return null; const n = Number(v); if (!Number.isFinite(n) || n < 0) throw new ErroAcao('erro.numero'); return n; };
      const R = c.d.resultado || {};
      a.resultado = { origem: 'manual', investimento: num(R.investimento), impressoes: num(R.impressoes), cliques: num(R.cliques), contatos: num(R.contatos), em: c.agora, por: c.u.nome };
      hist(c, a, 'hist.resultado');
      return { resumo: `Registrou números do anúncio "${a.titulo}"` };
    },
  },

  // ===== comentários (rotação ou anúncio) =====
  comentar: {
    papeis: LEITURA,
    fn: (c) => {
      const ref = String(c.d.ref || ''), [k, id] = [ref.slice(0, 1), ref.slice(2)];
      const alvo = k === 'r' ? rotacao(c, id) : k === 'a' ? anuncio(c, id) : null;
      if (!alvo) throw new ErroAcao('erro.nao_encontrado');
      if (k === 'a' && !alvo.enviado && alvo.origem !== 'continua' && c.u.papel !== 'cancha') throw new ErroAcao('erro.nao_encontrado');
      const t = texto(c.d.texto, 'campo.comentario', 3000);
      const interno = c.u.papel === 'cancha' && !!c.d.interno;
      alvo.comentarios = alvo.comentarios || [];
      alvo.comentarios.push({ id: novoId('c-'), por: c.u.nome, porId: c.u.id, papel: c.u.papel, em: c.agora, texto: t, idioma: c.u.idioma, interno });
      const papeis = interno ? ['cancha'] : ['cancha', 'aprovador', 'leitor'];
      const para = mencoes(c.pessoas, c.u.id, t, papeis);
      const nome = k === 'r' ? nomeRotacao(alvo) : alvo.titulo;
      const avisos: Aviso[] = para.length ? [{ para, assunto: ['aviso.mencao.assunto', { quem: c.u.nome }],
        paragrafos: [['aviso.mencao.texto', { quem: c.u.nome, onde: nome }], ['aviso.citacao', { texto: trecho(t) }]], abrir: ref }] : [];
      return { resumo: `Comentou${interno ? ' (interno)' : ''} em ${k === 'r' ? 'rotação' : 'anúncio'} "${nome}"`, avisos };
    },
  },

  // ===== calendário do ano safra =====
  'evento-salvar': {
    papeis: C,
    fn: (c) => {
      const d = c.d, novo = !d.id;
      const ev: any = novo ? { id: novoId('e-'), hist: [] } : c.e.eventos.find((x) => x.id === d.id);
      if (!ev) throw new ErroAcao('erro.nao_encontrado');
      ev.tipo = umDe(d.tipo, TIPOS_EVENTO, 'campo.tipo');
      ev.nome = texto(d.nome, 'campo.nome', 150);
      if (!isoValida(d.ini) || !isoValida(d.fim || d.ini)) throw new ErroAcao('erro.datas');
      ev.ini = d.ini; ev.fim = d.fim || d.ini;
      if (ev.fim < ev.ini) throw new ErroAcao('erro.datas_ordem');
      ev.local = texto(d.local, 'campo.local', 150, false);
      ev.produtos = lista(d.produtos, PRODUTOS, 'campo.produtos', 15);
      ev.nota = texto(d.nota, 'campo.nota', 1000, false);
      ev.link = linkUrl(d.link, 'campo.link');
      // Exemplo até o Renato confirmar. Só a Cancha marca como confirmado.
      ev.exemplo = d.exemplo !== false;
      // O texto passa a ser o que a pessoa escreveu, no idioma dela (a tradução antiga deixa de valer).
      ev.idioma = c.u.idioma; delete ev.traducoes;
      hist(c, ev, novo ? 'hist.evento_criado' : 'hist.evento_editado');
      if (novo) c.e.eventos.push(ev);
      return { resumo: `${novo ? 'Criou' : 'Editou'} o evento "${ev.nome}" no calendário`, criado: novo ? ev.id : undefined };
    },
  },
  'evento-remover': {
    papeis: C,
    fn: (c) => {
      const ev = c.e.eventos.find((x) => x.id === c.d.id);
      if (!ev) throw new ErroAcao('erro.nao_encontrado');
      c.e.eventos = c.e.eventos.filter((x) => x.id !== ev.id);
      return { resumo: `Tirou o evento "${ev.nome}" do calendário` };
    },
  },

  // ===== arquivos =====
  'arquivo-anexar': {
    papeis: C,
    fn: (c) => {
      const ev = envioDe(String(c.d.envio || ''), c.u.id);
      if (!ev || !ev.arquivo || ev.usado) throw new ErroAcao('erro.envio_sumiu');
      const caminho = destinoArquivo(c.e, c.u, ev.ref);
      const a = anuncio(c, ev.ref.slice(2));
      ev.usado = true;
      a.pastaDrive = a.pastaDrive || caminho;
      const arq = { ...ev.arquivo, por: c.u.nome, porId: c.u.id, em: c.agora };
      a.arquivos = [...(a.arquivos || []), arq];
      hist(c, a, 'hist.arquivo', { nome: arq.nome });
      return { resumo: `Enviou "${arq.nome}" para o anúncio "${a.titulo}"` };
    },
  },
  'arquivo-remover': {
    papeis: C,
    fn: (c) => {
      const a = anuncio(c, c.d.anuncioId);
      if (!['rascunho', 'ajuste'].includes(a.status)) throw new ErroAcao('erro.anuncio_travado');
      const arq = (a.arquivos || []).find((x: any) => x.id === c.d.id && !x.removido);
      if (!arq) throw new ErroAcao('erro.nao_encontrado');
      // Não apaga: tira do portal. O arquivo continua no Drive e no histórico.
      arq.removido = true; arq.removidoPor = c.u.nome; arq.removidoEm = c.agora;
      hist(c, a, 'hist.arquivo_removido', { nome: arq.nome });
      return { resumo: `Tirou "${arq.nome}" do anúncio "${a.titulo}"` };
    },
  },
};
