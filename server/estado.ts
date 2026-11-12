// Estado do portal: carregado do banco, alterado pelas ações e gravado de volta só no que mudou.
// Cada item é um registro na tabela "docs" (coleção + id), o que deixa a auditoria por item (antes/depois).
import type { Consulta } from './db.ts';

// rotacoes: ciclos de anúncios (normalmente 15 dias)
// anuncios: cada anúncio de uma rotação (o que continua da rotação anterior vira uma cópia ligada à original)
// eventos:  calendário do ano safra (fases da lavoura, feiras, produtos em foco, campanhas, recessos)
// feedbacks: opiniões da Spraytec (ou da Cancha) sobre anúncios, campanhas e contatos
// observacoes / planos: o que anotar para o mês seguinte e o plano aprovado que sai disso
// roteiros: roteiros de vídeo (aprovação do texto, produtora, vídeo final)
// emails / paginas: e-mails do Brevo e landing pages, com aprovação e checklist
// pedidos: pedidos de ajuste no site · palavras: SEO (posição no Google) · geo: presença nas respostas de IA
// conversas: chat por tema entre a Spraytec e a Cancha (e um canal só entre a Cancha e a produtora)
export const LISTAS = ['rotacoes', 'anuncios', 'eventos', 'feedbacks', 'observacoes', 'planos', 'roteiros', 'emails', 'paginas', 'pedidos', 'palavras', 'geo', 'conversas'] as const;
export const CONFIGS = [] as const;

export type Estado = Record<(typeof LISTAS)[number], any[]>;

export function estadoVazio(): Estado {
  return Object.fromEntries(LISTAS.map((l) => [l, []])) as unknown as Estado;
}

export async function carregar(q: Consulta): Promise<Estado> {
  const e: any = estadoVazio();
  const { rows } = await q.query<{ colecao: string; id: string; dados: any }>('select colecao, id, dados from docs order by ordem');
  for (const r of rows) if ((LISTAS as readonly string[]).includes(r.colecao)) e[r.colecao].push(r.dados);
  return e;
}

export type Mudanca = { colecao: string; id: string; antes: any; depois: any };

// Compara antes e depois, grava o que mudou e devolve a lista de mudanças (vai para a auditoria).
export async function salvar(q: Consulta, antes: Estado, depois: Estado, por: string): Promise<Mudanca[]> {
  const mud: Mudanca[] = [];
  for (const l of LISTAS) {
    const a = new Map((antes as any)[l].map((x: any) => [x.id, x]));
    const d = new Map((depois as any)[l].map((x: any) => [x.id, x]));
    for (const [id, x] of d) {
      const old = a.get(id);
      if (!old || JSON.stringify(old) !== JSON.stringify(x)) mud.push({ colecao: l, id: id as string, antes: old ?? null, depois: x });
    }
    for (const [id, x] of a) if (!d.has(id)) mud.push({ colecao: l, id: id as string, antes: x, depois: null });
  }
  for (const m of mud) {
    if (m.depois === null) await q.query('delete from docs where colecao=$1 and id=$2', [m.colecao, m.id]);
    else await q.query(
      `insert into docs (colecao, id, dados, atualizado_por) values ($1,$2,$3,$4)
       on conflict (colecao, id) do update set dados=excluded.dados, atualizado_em=now(), atualizado_por=excluded.atualizado_por`,
      [m.colecao, m.id, JSON.stringify(m.depois), por]);
  }
  return mud;
}

export async function gravarTudo(q: Consulta, e: Estado, por: string) {
  await q.query('delete from docs');
  for (const l of LISTAS) for (const x of (e as any)[l])
    await q.query('insert into docs (colecao, id, dados, atualizado_por) values ($1,$2,$3,$4)', [l, x.id, JSON.stringify(x), por]);
}
