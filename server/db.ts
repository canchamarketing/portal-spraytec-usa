// Acesso ao banco. Em produção: PostgreSQL (DATABASE_URL). Em desenvolvimento local, sem
// DATABASE_URL: PGlite, um PostgreSQL de verdade rodando dentro do Node, gravado em .dados-dev/.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Consulta {
  query<T = any>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}
export interface Banco extends Consulta {
  exec(sql: string): Promise<void>;
  tx<T>(fn: (q: Consulta) => Promise<T>): Promise<T>;
  fechar(): Promise<void>;
  tipo: 'postgres' | 'pglite';
}

export async function abrirBanco(): Promise<Banco> {
  const url = process.env.DATABASE_URL;
  if (url) {
    const pg = (await import('pg')).default;
    const pool = new pg.Pool({ connectionString: url, max: 5 });
    return {
      tipo: 'postgres',
      query: (sql, params) => pool.query(sql, params as any[]) as any,
      exec: async (sql) => { await pool.query(sql); },
      async tx(fn) {
        const c = await pool.connect();
        try {
          await c.query('begin');
          const r = await fn({ query: (s, p) => c.query(s, p as any[]) as any });
          await c.query('commit');
          return r;
        } catch (e) {
          await c.query('rollback').catch(() => {});
          throw e;
        } finally {
          c.release();
        }
      },
      fechar: () => pool.end(),
    };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite(process.env.PGLITE_DIR || './.dados-dev');
  await db.waitReady;
  return {
    tipo: 'pglite',
    query: (sql, params) => db.query(sql, params as any[]) as any,
    exec: async (sql) => { await db.exec(sql); },
    tx: (fn) => db.transaction((t) => fn({ query: (s, p) => t.query(s, p as any[]) as any })),
    fechar: () => db.close(),
  };
}

// Migrações: arquivos .sql em server/migracoes, aplicados em ordem e uma vez só.
export async function migrar(b: Banco): Promise<string[]> {
  await b.exec('create table if not exists migracoes (nome text primary key, em timestamptz not null default now())');
  const feitas = new Set((await b.query<{ nome: string }>('select nome from migracoes')).rows.map((r) => r.nome));
  const dir = join(import.meta.dirname, 'migracoes');
  const arquivos = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const aplicadas: string[] = [];
  for (const f of arquivos) {
    if (feitas.has(f)) continue;
    const sql = await readFile(join(dir, f), 'utf8');
    await b.exec('begin;\n' + sql + `\ninsert into migracoes (nome) values ('${f}');\ncommit;`);
    aplicadas.push(f);
  }
  return aplicadas;
}
