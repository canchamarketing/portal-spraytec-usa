// O que cada papel recebe do servidor. Quem não pode ver um dado não recebe o dado:
// esconder só na tela não basta.
import { clone, type Usuario } from './dominio.ts';
import type { Estado } from './estado.ts';

const temPauta = (p: any) => !['video', 'design'].includes(p.rede) && p.formato !== 'plano';

export function visaoPara(e0: Estado, u: Usuario) {
  const e: any = clone(e0);
  if (u.papel === 'cancha') return e;

  if (u.papel === 'produtora') {
    // A produtora vê só as pautas de vídeo e o que está ligado a elas entre vídeos.
    return {
      videos: e.videos.map((v: any) => ({ ...v, postId: undefined })),
      links: e.links.filter((l: string[]) => l[0].startsWith('v:') && l[1].startsWith('v:')),
      posts: [], demandas: [], threads: [], marcos: [], ano: [], conc: [], aprendizados: [], relatorios: [],
      plano: null, guia: e.guia, lanes: [], concAcoes: [],
    };
  }

  // Cliente (Matheus, diretoria, leitores): sem comentários internos e sem o texto de rascunhos.
  e.posts = e.posts.map((p: any) => {
    const x = { ...p, comments: (p.comments || []).filter((c: any) => !c.interno) };
    // Pauta ainda sendo escrita: nada aparece. Em produção: a pauta aprovada aparece; legenda e arte, só na aprovação.
    if (temPauta(p) && p.status === 'pauta') { x.pauta = ''; x.legenda = ''; delete x.drive; }
    if (temPauta(p) && p.status === 'producao') { x.legenda = ''; delete x.drive; }
    return x;
  });
  e.relatorios = e.relatorios.filter((r: any) => r.status !== 'rascunho');
  // As conversas são entre a Operação Spraytec e a Cancha; diretoria e leitores não recebem.
  if (u.papel !== 'operacao') e.threads = [];
  return e;
}
