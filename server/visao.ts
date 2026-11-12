// O que cada papel recebe do servidor. Quem não pode ver um dado não recebe o dado:
// esconder só na tela não basta.
import { clone, type Usuario } from './dominio.ts';
import type { Estado } from './estado.ts';

const vivos = (l: any) => (Array.isArray(l) ? l.filter((a: any) => !a.removido) : []);
const semInternos = (l: any) => (Array.isArray(l) ? l.filter((c: any) => !c.interno) : []);

export function visaoPara(e0: Estado, u: Usuario) {
  const e: any = clone(e0);
  if (u.papel === 'cancha') return e;

  // Produtora: por enquanto não recebe nada daqui (os roteiros de vídeo chegam na próxima etapa).
  if (u.papel === 'produtora') return { rotacoes: [], anuncios: [], eventos: [] };

  // Spraytec USA (aprovador e leitor): sem comentários internos da Cancha e sem rascunhos.
  // O anúncio aparece como foi enviado para aprovação (o que a Cancha está ajustando só aparece quando for reenviado).
  e.anuncios = e.anuncios
    .filter((a: any) => a.enviado || a.origem === 'continua')
    .map((a: any) => {
      const x: any = { ...a, comentarios: semInternos(a.comentarios), nota: undefined };
      if (a.enviado && ['rascunho', 'ajuste'].includes(a.status)) {
        const f = a.enviado;
        Object.assign(x, { titulo: f.titulo, canal: f.canal, formato: f.formato, locais: f.locais, objetivo: f.objetivo, produtos: f.produtos,
          publico: f.publico, textos: f.textos, linkDrive: f.linkDrive, versao: f.versao });
        x.arquivos = (a.arquivos || []).filter((y: any) => f.arquivos.includes(y.id));
        if (a.status === 'rascunho') x.status = 'ajustando';
      } else x.arquivos = vivos(a.arquivos);
      delete x.pastaDrive;
      return x;
    });
  e.rotacoes = e.rotacoes.map((r: any) => ({ ...r, comentarios: semInternos(r.comentarios) }));
  return e;
}
