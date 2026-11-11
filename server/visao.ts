// O que cada papel recebe do servidor. Quem não pode ver um dado não recebe o dado:
// esconder só na tela não basta.
import { clone, type Usuario } from './dominio.ts';
import type { Estado } from './estado.ts';

// Arquivo tirado do portal continua no Drive e no histórico da Cancha; os outros papéis não recebem.
const vivos = (l: any) => (Array.isArray(l) ? l.filter((a: any) => !a.removido) : l);
const temPauta = (p: any) => !['video', 'design'].includes(p.rede) && p.formato !== 'plano';

export function visaoPara(e0: Estado, u: Usuario) {
  const e: any = clone(e0);
  if (u.papel === 'cancha') return e;

  if (u.papel === 'produtora') {
    // A produtora vê só as pautas de vídeo e o que está ligado a elas entre vídeos.
    return {
      videos: e.videos.map((v: any) => ({ ...v, postId: undefined, arquivos: vivos(v.arquivos) })),
      links: e.links.filter((l: string[]) => l[0].startsWith('v:') && l[1].startsWith('v:')),
      posts: [], demandas: [], threads: [], marcos: [], ano: [], conc: [], aprendizados: [], relatorios: [], materiais: [], ciclos: [], classif: [],
      plano: null, guia: e.guia, lanes: [], concAcoes: [],
    };
  }

  // Cliente (Matheus, diretoria, leitores): sem comentários internos e sem o texto de rascunhos.
  e.posts = e.posts.map((p: any) => {
    const x = { ...p, comments: (p.comments || []).filter((c: any) => !c.interno), arquivos: vivos(p.arquivos) };
    // Pauta ainda sendo escrita: nada aparece. Em produção: a pauta aprovada aparece; legenda e arte, só na aprovação.
    if (temPauta(p) && p.status === 'pauta') { x.pauta = ''; x.legenda = ''; delete x.drive; delete x.arquivos; }
    if (temPauta(p) && p.status === 'producao') { if (!p.textoOk) x.legenda = ''; delete x.drive; delete x.arquivos; }
    // A arte pode ser anexada enquanto a pauta ou os textos estão em aprovação, mas a Spraytec só a vê quando ela for enviada.
    if (['pauta_aprovacao', 'texto_aprovacao'].includes(p.status)) { if (!p.vEnviada) delete x.drive; x.arquivos = (x.arquivos || []).filter((a: any) => (a.v || 1) <= (p.vEnviada || 0)); }
    // Ajuste pedido: a versão nova da peça só aparece para a Spraytec quando for reenviada.
    if (p.status === 'ajuste' && x.arquivos) x.arquivos = x.arquivos.filter((a: any) => (a.v || 1) <= (p.vEnviada || (p.etapaAjuste === 'peca' ? 1 : 0)));
    return x;
  });
  e.videos = e.videos.map((v: any) => ({ ...v, arquivos: vivos(v.arquivos) }));
  e.demandas = e.demandas.map((d: any) => ({ ...d, arquivos: vivos(d.arquivos) }));
  e.materiais = vivos(e.materiais);
  e.relatorios = e.relatorios.filter((r: any) => r.status !== 'rascunho');
  // As conversas são entre a Operação Spraytec e a Cancha; diretoria e leitores não recebem.
  if (u.papel !== 'operacao') e.threads = [];
  return e;
}
