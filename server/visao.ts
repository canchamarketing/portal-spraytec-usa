// O que cada papel recebe do servidor. Quem não pode ver um dado não recebe o dado:
// esconder só na tela não basta.
import { clone, type Usuario } from './dominio.ts';
import { estadoVazio, type Estado } from './estado.ts';
import { CAMPOS, COLECOES_APROVACAO } from './modulos.ts';

const vivos = (l: any) => (Array.isArray(l) ? l.filter((a: any) => !a.removido) : []);
const semInternos = (l: any) => (Array.isArray(l) ? l.filter((c: any) => !c.interno) : []);
// O item aparece como foi enviado para aprovação: o que a Cancha está mudando só aparece quando for reenviado.
function comoEnviado(x: any, campos: string[]) {
  const y: any = { ...x, comentarios: semInternos(x.comentarios) };
  if (x.enviado && ['rascunho', 'ajuste'].includes(x.status)) {
    for (const k of campos) y[k] = x.enviado[k];
    y.versao = x.enviado.versao;
    if (x.status === 'rascunho') y.status = 'ajustando';
  }
  delete y.nota; delete y.pastaDrive;
  return y;
}

export function visaoPara(e0: Estado, u: Usuario) {
  const e: any = { ...estadoVazio(), ...clone(e0) };
  if (u.papel === 'cancha') return e;

  // Produtora: só os roteiros que já foram enviados a ela (versão aprovada), sem comentários internos.
  if (u.papel === 'produtora') {
    const v: any = estadoVazio();
    v.roteiros = e.roteiros.filter((r: any) => ['producao', 'corte', 'ajuste_corte', 'entregue'].includes(r.status))
      .map((r: any) => comoEnviado(r, CAMPOS.roteiros.map((c) => c.k)));
    return v;
  }

  // Spraytec USA (aprovador e leitor): sem comentários internos e sem rascunhos da Cancha.
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
  for (const col of COLECOES_APROVACAO) e[col] = e[col].filter((x: any) => x.enviado).map((x: any) => comoEnviado(x, CAMPOS[col].map((c) => c.k)));
  for (const col of ['feedbacks', 'pedidos']) e[col] = e[col].map((x: any) => ({ ...x, comentarios: semInternos(x.comentarios) }));
  return e;
}
