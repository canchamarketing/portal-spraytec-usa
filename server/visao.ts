// O que cada papel recebe do servidor. Quem não pode ver um dado não recebe o dado:
// esconder só na tela não basta.
import { clone, type Usuario } from './dominio.ts';
import type { Estado } from './estado.ts';

const emPreparo = (p: any) => (p.status === 'pauta' || p.status === 'producao') && !['video', 'design'].includes(p.rede);

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
    if (emPreparo(p)) { x.legenda = ''; delete x.drive; }
    return x;
  });
  e.relatorios = e.relatorios.filter((r: any) => r.status !== 'rascunho');
  // As conversas são entre a Operação Spraytec e a Cancha; diretoria e leitores não recebem.
  if (u.papel !== 'operacao') e.threads = [];
  return e;
}
