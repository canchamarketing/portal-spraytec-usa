// Testa a integração com o Google Analytics 4 contra um GA4 simulado (servidor local), num banco temporário.
// Uso: node testes/ga4-simulado.ts
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };
const espera = async (fn: () => unknown, msg: string) => { try { await fn(); checa(false, msg); } catch (e) { checa(true, msg + ` (${(e as Error).message})`); } };

// ---------- GA4 simulado ----------
const ESC = 'openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/analytics.readonly';
const idToken = (email: string) => 'x.' + Buffer.from(JSON.stringify({ email })).toString('base64url') + '.y';
let propriedades = [
  { account: 'accounts/1', displayName: 'Cancha Marketing', propertySummaries: [{ property: 'properties/111', displayName: 'Site da Cancha' }] },
  { account: 'accounts/2', displayName: 'Spraytec USA', propertySummaries: [{ property: 'properties/222', displayName: 'spraytecusa.com - GA4' }, { property: 'properties/333', displayName: 'spraytec.com.br - GA4 (Spraytec Brasil)' }] },
];
const pedidos: any[] = [];
const servidor = createServer(async (req, res) => {
  const u = new URL(req.url!, 'http://x');
  const corpo: Buffer = await new Promise((r) => { const b: Buffer[] = []; req.on('data', (c) => b.push(c)); req.on('end', () => r(Buffer.concat(b))); });
  const json = (code: number, o: any) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/token') {
    const p = new URLSearchParams(corpo.toString());
    if (p.get('grant_type') === 'authorization_code') {
      if (p.get('code') === 'sem-escopo') return json(200, { access_token: 'acesso-1', expires_in: 3600, refresh_token: 'r', scope: 'openid' });
      return json(200, { access_token: 'acesso-1', expires_in: 3600, refresh_token: 'renovar-ga', scope: ESC, id_token: idToken('analytics@canchamarketing.com.br') });
    }
    return json(200, { access_token: 'acesso-2', expires_in: 3600 });
  }
  if (u.pathname === '/revoke') return json(200, {});
  if (!/^Bearer acesso-\d$/.test(String(req.headers.authorization || ''))) return json(401, { error: { message: 'sem token' } });
  if (u.pathname === '/v1beta/accountSummaries') return json(200, { accountSummaries: propriedades });
  const m = u.pathname.match(/^\/v1beta\/properties\/(\d+):runReport$/);
  if (m) {
    const q = JSON.parse(corpo.toString()); pedidos.push({ prop: m[1], ...q });
    const dims = q.dimensions.map((d: any) => d.name).join(',');
    const linha = (d: string[], v: number[]) => ({ dimensionValues: d.map((value) => ({ value })), metricValues: v.map((x) => ({ value: String(x) })) });
    const rows = {
      date: [linha(['20261027'], [40, 30, 25, 28, 90, 3]), linha(['20261028'], [10, 9, 8, 6, 22, 1])],
      'date,sessionDefaultChannelGroup': [linha(['20261027', 'Organic Search'], [30, 2]), linha(['20261027', 'Direct'], [10, 1]), linha(['20261028', 'Organic Search'], [10, 1])],
      'date,pagePath': [linha(['20261027', '/'], [60]), linha(['20261027', '/produtos/nodofix'], [30]), linha(['20261028', '/'], [22])],
      'date,eventName': [linha(['20261027', 'generate_lead'], [3]), linha(['20261027', 'page_view'], [0]), linha(['20261028', 'generate_lead'], [1])],
    }[dims as 'date'] || [];
    return json(200, { rows, rowCount: rows.length });
  }
  json(404, { error: { message: 'rota ' + u.pathname } });
});
await new Promise<void>((r) => servidor.listen(0, r));
const porta = (servidor.address() as any).port;

// ---------- banco temporário ----------
const dir = mkdtempSync(join(tmpdir(), 'spraytec-ga4-'));
process.env.PGLITE_DIR = dir;
process.env.GOOGLE_API_URL = `http://localhost:${porta}`;
process.env.GOOGLE_CLIENT_ID = 'cliente.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'segredo-de-teste';
process.env.DRIVE_CHAVE = 'cd'.repeat(32);
const { abrirBanco, migrar } = await import('../server/db.ts');
const G = await import('../server/integracoes/ga4.ts');
const b = await abrirBanco();
await migrar(b);
const log = { info: () => {}, warn: (o: any) => console.log('    aviso:', o.erro) };

console.log('Conexão');
await G.carregarGA4(b);
checa(G.ga4Configurado() && !G.ga4Conectado(), 'configurado e ainda sem conexão');
await espera(() => G.concluirGA4(b, 'sem-escopo', 'http://x/retorno'), 'sem a permissão do Analytics, a conexão é recusada');
const c = await G.concluirGA4(b, 'codigo-bom', 'http://x/retorno');
checa(c.conta === 'analytics@canchamarketing.com.br', 'identifica a conta que conectou');
checa(c.propriedade?.id === '222' && c.opcoes.length === 3, 'entre várias propriedades, escolhe sozinho a da Spraytec USA (nunca a do Brasil)');
const seg = (await b.query(`select valor from segredos where nome='ga4'`)).rows[0].valor;
checa(!seg.includes('renovar-ga') && !seg.includes('canchamarketing'), 'autorização guardada cifrada no banco');
await G.carregarGA4(b);
checa(G.ga4Conectado()?.propriedade?.nome === 'spraytecusa.com - GA4', 'conexão volta depois de reiniciar o servidor');

console.log('Coleta');
await G.coletarGA4(b, log, true);
const linhas = async (tipo: string) => (await b.query(`select id, dados from metricas where fonte='ga4' and tipo=$1 order by id`, [tipo])).rows;
const dias = await linhas('dia');
checa(dias.length === 2 && dias[0].id === '2026-10-27' && dias[0].dados.sessoes === 40 && dias[0].dados.eventosChave === 3 && dias[0].dados.novos === 25, 'totais por dia, com a data no formato do portal');
checa((await linhas('canal_dia')).length === 3 && (await linhas('pagina_dia')).find((r: any) => r.dados.pagina === '/produtos/nodofix')?.dados.visualizacoes === 30, 'canais e páginas por dia');
const ev = await linhas('evento_dia');
checa(ev.length === 2 && ev.every((r: any) => r.dados.evento === 'generate_lead'), 'só eventos-chave com contagem entram');
checa(pedidos.every((p) => p.prop === '222') && pedidos.length === 4, 'consulta só a propriedade escolhida');
const span = (p: any) => (Date.parse(p.dateRanges[0].endDate) - Date.parse(p.dateRanges[0].startDate)) / 864e5;
checa(span(pedidos[0]) === 400, 'primeira coleta busca 13 meses');
const sit = (await b.query(`select ultimo_ok, erro, detalhe from integracoes where fonte='ga4'`)).rows[0];
checa(sit.ultimo_ok && !sit.erro && sit.detalhe.sessoes === 50, 'situação da integração registrada');
pedidos.length = 0;
await G.coletarGA4(b, log);
checa(pedidos.length === 0, 'sem forçar, não coleta de novo antes de 6 horas');
await G.coletarGA4(b, log, true);
checa(span(pedidos[0]) === 10 && (await linhas('dia')).length === 2, 'coletas seguintes buscam só os últimos 10 dias, sem duplicar');

console.log('Mais de uma propriedade');
propriedades = [propriedades[0], { account: 'accounts/3', displayName: 'Agência', propertySummaries: [{ property: 'properties/333', displayName: 'Outro site' }] }];
const c2 = await G.concluirGA4(b, 'codigo-bom', 'http://x/retorno');
checa(c2.propriedade === null && c2.opcoes.length === 2, 'sem como saber qual é, pede para a Cancha escolher');
checa((await linhas('dia')).length === 0, 'números da propriedade anterior saem');
pedidos.length = 0;
await G.coletarGA4(b, log, true);
checa(pedidos.length === 0, 'sem propriedade escolhida, não coleta');
await espera(() => G.escolherPropriedade(b, '999'), 'propriedade que a conta não enxerga é recusada');
await G.escolherPropriedade(b, '333');
await G.coletarGA4(b, log, true);
checa(pedidos.length && pedidos.every((p) => p.prop === '333'), 'depois de escolher, coleta a propriedade certa');

console.log('Desconexão');
await G.desconectarGA4(b);
checa(!G.ga4Conectado() && !(await b.query(`select 1 from segredos where nome='ga4'`)).rows.length, 'desconectar apaga a autorização');
checa((await linhas('dia')).length === 2, 'números já coletados continuam');

await b.fechar();
servidor.close();
rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
