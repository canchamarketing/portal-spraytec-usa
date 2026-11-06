// Estado do portal: carregado do banco, alterado pelas ações e gravado de volta só no que mudou.
import type { Consulta } from './db.ts';

export const LISTAS = ['posts', 'videos', 'demandas', 'threads', 'marcos', 'ano', 'conc', 'aprendizados', 'relatorios', 'materiais', 'ciclos', 'classif'] as const;
export const CONFIGS = ['plano', 'guia', 'lanes', 'concAcoes', 'links'] as const;

export type Estado = {
  posts: any[]; videos: any[]; demandas: any[]; threads: any[]; marcos: any[]; ano: any[]; conc: any[];
  aprendizados: any[]; relatorios: any[]; materiais: any[]; ciclos: any[]; classif: any[];
  plano: any; guia: any; lanes: any[]; concAcoes: any[]; links: [string, string][];
};

export function estadoVazio(): Estado {
  const e: any = {};
  for (const l of LISTAS) e[l] = [];
  e.plano = null; e.guia = { tom: [], evitar: [], termos: [], produtos: [], hashtags: [] }; e.lanes = []; e.concAcoes = []; e.links = [];
  return e;
}

export async function carregar(q: Consulta): Promise<Estado> {
  const e: any = estadoVazio();
  const { rows } = await q.query<{ colecao: string; id: string; dados: any }>('select colecao, id, dados from docs order by ordem');
  for (const r of rows) {
    if (r.colecao === 'config') { if ((CONFIGS as readonly string[]).includes(r.id)) e[r.id] = r.dados; }
    else if ((LISTAS as readonly string[]).includes(r.colecao)) e[r.colecao].push(r.dados);
  }
  e.posts.forEach(separarPauta);
  return e;
}

// Até 27/10/2026 a pauta ficava no campo da legenda. Itens ainda na etapa de pauta passam o texto
// para o campo próprio; nos demais a pauta fica vazia e a legenda continua onde estava.
function separarPauta(p: any) {
  if (p.pauta !== undefined) return;
  const etapaPauta = !['video', 'design'].includes(p.rede) && p.formato !== 'plano'
    && (['pauta', 'pauta_aprovacao'].includes(p.status) || (p.status === 'ajuste' && p.etapaAjuste === 'pauta'));
  p.pauta = etapaPauta ? p.legenda || '' : '';
  if (etapaPauta) p.legenda = '';
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
  for (const c of CONFIGS) {
    const a = (antes as any)[c], d = (depois as any)[c];
    if (JSON.stringify(a) !== JSON.stringify(d)) mud.push({ colecao: 'config', id: c, antes: a ?? null, depois: d ?? null });
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
  for (const c of CONFIGS) if ((e as any)[c] != null)
    await q.query('insert into docs (colecao, id, dados, atualizado_por) values ($1,$2,$3,$4)', ['config', c, JSON.stringify((e as any)[c]), por]);
}
