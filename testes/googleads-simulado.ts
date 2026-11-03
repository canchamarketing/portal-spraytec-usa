// Testa a integração com o Google Ads contra um Google Ads simulado (servidor local), num banco temporário.
// Uso: node testes/googleads-simulado.ts
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };
const espera = async (fn: () => unknown, msg: string) => { try { await fn(); checa(false, msg); } catch (e) { checa(true, msg + ` (${(e as Error).message})`); } };

// ---------- Google Ads simulado (só a v25 existe) ----------
const ESC = 'openid https://www.googleapis.com/auth/adwords';
const idToken = (email: string) => 'x.' + Buffer.from(JSON.stringify({ email })).toString('base64url') + '.y';
let semMcc = false, clientes = [
  { customerClient: { id: '3803892615', descriptiveName: 'Spraytec', manager: false, status: 'ENABLED' } },
  { customerClient: { id: '1112223334', descriptiveName: 'Outro cliente', manager: false, status: 'ENABLED' } },
  { customerClient: { id: '2230250690', descriptiveName: 'Cancha Marketing', manager: true, status: 'ENABLED' } },
];
const consultas: { cliente: string; q: string; dev: string; login: string }[] = [];
const servidor = createServer(async (req, res) => {
  const u = new URL(req.url!, 'http://x');
  const corpo: Buffer = await new Promise((r) => { const b: Buffer[] = []; req.on('data', (c) => b.push(c)); req.on('end', () => r(Buffer.concat(b))); });
  const json = (code: number, o: any) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
  if (u.pathname === '/token') {
    const p = new URLSearchParams(corpo.toString());
    if (p.get('grant_type') === 'authorization_code') return json(200, { access_token: 'acesso-1', expires_in: 3600, refresh_token: 'renovar-gads', scope: p.get('code') === 'sem-escopo' ? 'openid' : ESC, id_token: idToken('analytics@canchamarketing.com.br') });
    return json(200, { access_token: 'acesso-2', expires_in: 3600 });
  }
  if (u.pathname === '/revoke') return json(200, {});
  const v = u.pathname.split('/')[1];
  if (v !== 'v25') return json(404, { error: { message: 'versão não existe' } });
  if (!/^Bearer acesso-\d$/.test(String(req.headers.authorization || '')) || req.headers['developer-token'] !== 'token-dev-teste') return json(401, { error: { message: 'sem token' } });
  if (u.pathname === '/v25/customers:listAccessibleCustomers') return json(200, { resourceNames: ['customers/2230250690'] });
  const m = u.pathname.match(/^\/v25\/customers\/(\d+)\/googleAds:searchStream$/);
  if (m) {
    const q = JSON.parse(corpo.toString()).query as string;
    consultas.push({ cliente: m[1], q, dev: String(req.headers['developer-token']), login: String(req.headers['login-customer-id']) });
    if (/FROM customer_client/.test(q)) return semMcc ? json(403, [{ error: { message: 'PERMISSION_DENIED', details: [{ errors: [{ message: 'User doesn\'t have permission to access customer.' }] }] } }]) : json(200, [{ results: clientes }]);
    if (/FROM campaign WHERE campaign.status/.test(q)) return json(200, [{ results: [
      { campaign: { id: '11', name: 'Pesquisa | Nodofix Soja', status: 'ENABLED', advertisingChannelType: 'SEARCH', startDate: '2026-09-01' }, campaignBudget: { amountMicros: '50000000' } },
      { campaign: { id: '12', name: 'PMax | Institucional', status: 'PAUSED', advertisingChannelType: 'PERFORMANCE_MAX', startDate: '2026-08-01' }, campaignBudget: { amountMicros: '30000000' } }] }]);
    if (/FROM campaign WHERE segments.date/.test(q)) return json(200, [{ results: [
      { campaign: { id: '11' }, segments: { date: '2026-11-01' }, metrics: { costMicros: '42500000', impressions: '1200', clicks: '80', conversions: 3 } },
      { campaign: { id: '11' }, segments: { date: '2026-11-02' }, metrics: { costMicros: '38000000', impressions: '1000', clicks: '70', conversions: 2.5 } }] },
      { results: [{ campaign: { id: '12' }, segments: { date: '2026-11-01' }, metrics: { costMicros: '10000000', impressions: '5000', clicks: '20', conversions: 0 } }] }]);
    if (/FROM ad_group_ad WHERE ad_group_ad.status/.test(q)) return json(200, [{ results: [
      { adGroupAd: { status: 'ENABLED', ad: { id: '901', type: 'RESPONSIVE_SEARCH_AD', finalUrls: ['https://spraytec.com/nodofix'], responsiveSearchAd: { headlines: [{ text: 'Nodofix Soja' }, { text: 'Mais nódulos' }], descriptions: [{ text: 'Inoculante' }] } } }, adGroup: { id: '51', name: 'Inoculante' }, campaign: { id: '11' } }] }]);
    if (/FROM ad_group_ad WHERE segments.date/.test(q)) return json(200, [{ results: [{ adGroupAd: { ad: { id: '901' } }, segments: { date: '2026-11-01' }, metrics: { costMicros: '42500000', impressions: '1200', clicks: '80', conversions: 3 } }] }]);
  }
  json(404, { error: { message: 'rota ' + u.pathname } });
});
await new Promise<void>((r) => servidor.listen(0, r));
const porta = (servidor.address() as any).port;

// ---------- banco temporário ----------
const dir = mkdtempSync(join(tmpdir(), 'spraytec-gads-'));
process.env.PGLITE_DIR = dir;
process.env.GOOGLE_API_URL = `http://localhost:${porta}`;
process.env.GOOGLE_CLIENT_ID = 'cliente.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'segredo-de-teste';
process.env.DRIVE_CHAVE = '12'.repeat(32);
const { abrirBanco, migrar } = await import('../server/db.ts');
const A = await import('../server/integracoes/googleads.ts');
const b = await abrirBanco();
await migrar(b);
const log = { info: () => {}, warn: (o: any) => console.log('    aviso:', o.erro) };

console.log('Conexão');
await A.carregarGAds(b);
checa(!A.gadsConfigurado(), 'sem o token de desenvolvedor, não aparece como configurado');
await espera(() => A.concluirGAds(b, 'codigo-bom', 'http://x/retorno'), 'sem o token de desenvolvedor, a conexão é recusada');
process.env.GOOGLE_ADS_TOKEN_DEV = 'token-dev-teste';
checa(A.gadsConfigurado() && !A.gadsConectado(), 'com o token, configurado e ainda sem conexão');
await espera(() => A.concluirGAds(b, 'sem-escopo', 'http://x/retorno'), 'sem a permissão do Google Ads, a conexão é recusada');
semMcc = true;
await espera(() => A.concluirGAds(b, 'codigo-bom', 'http://x/retorno'), 'conta que não é usuária do MCC é recusada com explicação');
semMcc = false;
const c = await A.concluirGAds(b, 'codigo-bom', 'http://x/retorno');
checa(c.cliente?.id === '3803892615' && c.opcoes.length === 2, 'acha sozinho a conta da Spraytec entre as do MCC (sem contar o próprio MCC)');
checa(consultas[consultas.length - 1].cliente === '2230250690' && consultas[consultas.length - 1].login === '2230250690', 'consulta as contas pelo MCC da Cancha');
const seg = (await b.query(`select valor from segredos where nome='gads'`)).rows[0].valor;
checa(!seg.includes('renovar-gads') && !seg.includes('canchamarketing'), 'autorização guardada cifrada no banco');
await A.carregarGAds(b);
checa(A.gadsConectado()?.cliente?.nome === 'Spraytec', 'conexão volta depois de reiniciar o servidor');

console.log('Coleta');
consultas.length = 0;
await A.coletarGAds(b, log, true);
const linhas = async (tipo: string) => (await b.query(`select id, dados from metricas where fonte='gads' and tipo=$1 order by id`, [tipo])).rows;
const camps = await linhas('campanha');
checa(camps.length === 2 && camps[0].dados.tipo === 'SEARCH' && camps[0].dados.orcamentoDia === 50, 'campanhas com tipo e orçamento diário em reais');
const dias = await linhas('campanha_dia');
checa(dias.length === 3 && dias.find((r: any) => r.id === '11:2026-11-01')?.dados.investido === 42.5, 'investimento por dia em reais (micros convertidos), juntando os lotes da API');
checa(dias.find((r: any) => r.id === '11:2026-11-02')?.dados.conversoes === 2.5, 'conversões fracionadas preservadas');
const ad = (await linhas('anuncio'))[0]?.dados;
checa(ad?.titulos.join('|') === 'Nodofix Soja|Mais nódulos' && ad.campanha === '11', 'anúncio com títulos e campanha');
checa((await linhas('anuncio_g_dia')).length === 1, 'números do anúncio por dia');
checa(consultas.every((x) => x.cliente === '3803892615' && x.dev === 'token-dev-teste' && x.login === '2230250690'), 'consultas na conta da Spraytec, com token de desenvolvedor e MCC');
const span = (q: string) => { const m = q.match(/BETWEEN '([\d-]+)' AND '([\d-]+)'/)!; return (Date.parse(m[2]) - Date.parse(m[1])) / 864e5; };
checa(span(consultas.find((x) => /campaign WHERE segments/.test(x.q))!.q) === 400, 'primeira coleta busca 13 meses');
const sit = (await b.query(`select ultimo_ok, erro, detalhe from integracoes where fonte='gads'`)).rows[0];
checa(sit.ultimo_ok && !sit.erro && sit.detalhe.versao === 'v25', 'usa a versão mais nova da API que responde');
consultas.length = 0;
await A.coletarGAds(b, log);
checa(consultas.length === 0, 'sem forçar, não coleta de novo antes de 6 horas');
await A.coletarGAds(b, log, true);
checa(span(consultas.find((x) => /campaign WHERE segments/.test(x.q))!.q) === 30 && (await linhas('campanha_dia')).length === 3, 'coletas seguintes: últimos 30 dias (conversões atrasadas), sem duplicar');

console.log('Mais de uma conta parecida');
clientes = [clientes[1], { customerClient: { id: '5556667778', descriptiveName: 'Terceiro', manager: false, status: 'ENABLED' } }];
const c2 = await A.concluirGAds(b, 'codigo-bom', 'http://x/retorno');
checa(c2.cliente === null && (await linhas('campanha')).length === 0, 'sem a Spraytec identificável, pede para escolher e limpa os números da conta anterior');
await espera(() => A.escolherClienteGAds(b, '999'), 'conta fora do MCC é recusada');
await A.escolherClienteGAds(b, '5556667778');
checa(A.gadsConectado()?.cliente?.id === '5556667778', 'conta escolhida pela Cancha');

console.log('Conta cravada no servidor');
process.env.GOOGLE_ADS_CONTA = '1112223334';
await A.carregarGAds(b);
checa(A.gadsConectado()?.cliente?.id === '1112223334', 'conta cravada no .env vale para a conexão já feita, ao reiniciar');
await espera(() => A.escolherClienteGAds(b, '5556667778'), 'com a conta cravada, outra escolha é recusada');
delete process.env.GOOGLE_ADS_CONTA;

console.log('Desconexão');
await A.desconectarGAds(b);
checa(!A.gadsConectado() && !(await b.query(`select 1 from segredos where nome='gads'`)).rows.length, 'desconectar apaga a autorização');

await b.fechar();
servidor.close();
rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
