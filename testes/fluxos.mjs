// Teste dos fluxos principais contra um portal rodando em modo demonstração.
// Uso: BASE_URL=http://localhost:3000 DEMO_CODIGO=... node testes/fluxos.mjs
// ATENÇÃO: recarrega os dados de demonstração no começo. Não rode contra dados reais.
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CODIGO = process.env.DEMO_CODIGO;
if (!CODIGO) { console.error('Defina DEMO_CODIGO.'); process.exit(1); }

let falhas = 0, ok = 0;
const checa = (cond, msg) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };

async function sessao(usuarioId) {
  let cookies = {};
  const req = async (path, corpo) => {
    const r = await fetch(BASE + path, {
      method: corpo === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', origin: BASE, cookie: Object.entries(cookies).map(([k, v]) => k + '=' + v).join('; ') },
      body: corpo === undefined ? undefined : JSON.stringify(corpo), redirect: 'manual',
    });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); }
    let j = {}; try { j = await r.json(); } catch {}
    return { status: r.status, j };
  };
  checa((await req('/api/entrar/demo-codigo', { codigo: 'errado' })).status === 400, 'código errado é recusado');
  checa((await req('/api/entrar/demo-codigo', { codigo: CODIGO })).status === 200, 'código certo libera a demonstração');
  checa((await req('/api/entrar/demo', { usuarioId })).status === 200, `entra como ${usuarioId}`);
  return { req, acao: (acao, d) => req('/api/acao', { acao, ...d }), estado: async () => (await req('/api/estado')).j };
}

console.log('Sem login');
{
  const r = await fetch(BASE + '/api/estado');
  checa(r.status === 401, 'sem login não recebe dados');
  const r2 = await fetch(BASE + '/api/acao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"acao":"aprovar"}' });
  checa(r2.status === 401, 'sem login não altera nada');
  const r3 = await fetch(BASE + '/api/acao', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://site-estranho.com' }, body: '{"acao":"aprovar"}' });
  checa(r3.status === 403, 'pedido vindo de outro site é bloqueado');
}

console.log('Cancha: recarrega a demonstração');
const cancha = await sessao('u-diogo');
checa((await cancha.req('/api/demo/restaurar', {})).status === 200, 'dados de demonstração recarregados');
let e = await cancha.estado();
const pend = e.dados.posts.filter((p) => p.status === 'aprovacao' && p.formato !== 'plano');
checa(pend.length >= 5, `há itens em aprovação (${pend.length})`);
const interno = e.dados.posts.find((p) => p.comments.some((c) => c.interno));
checa(!!interno, 'a Cancha vê comentário interno');

console.log('Cancha não aprova no lugar do Matheus');
{
  const r = await cancha.acao('aprovar', { id: pend[0].id });
  checa(r.status === 403, 'ação "aprovar" é recusada para a Cancha');
  const r2 = await cancha.acao('status', { id: pend[0].id, status: 'aprovado' });
  checa(r2.status === 400 && r2.j.codigo === 'precisa-registro', 'mudar status para aprovado pede o registro da aprovação');
  const r3 = await cancha.acao('post-editar', { id: pend[0].id, titulo: 'mexi', legenda: 'x' });
  checa(r3.status === 400, 'item em aprovação não pode ter o conteúdo editado');
}

console.log('Matheus');
const mat = await sessao('u-matheus');
e = await mat.estado();
checa(!e.dados.posts.some((p) => p.comments.some((c) => c.interno)), 'Matheus não recebe comentários internos');
const rasc = e.dados.posts.find((p) => p.status === 'producao' && !['video', 'design'].includes(p.rede));
checa(rasc && rasc.legenda === '', 'Matheus não recebe o texto de itens em produção');
checa(!e.dados.relatorios.some((r) => r.status === 'rascunho'), 'Matheus não vê relatórios em rascunho');
{
  const r = await mat.acao('aprovar', { id: pend[0].id });
  checa(r.status === 200, 'Matheus aprova um item');
  const p = r.j.dados.posts.find((x) => x.id === pend[0].id);
  checa(['aprovado', 'agendado'].includes(p.status), `item ficou ${p.status}`);
  checa(p.hist.some((h) => /Aprovado por Matheus · portal/.test(h.t) && h.por === 'Matheus'), 'histórico registra quem aprovou');
  const r2 = await mat.acao('aprovar', { id: pend[0].id });
  checa(r2.status === 400, 'aprovar de novo o mesmo item é recusado');
  const r3 = await mat.acao('ajuste', { id: pend[1].id, txt: '' });
  checa(r3.status === 400, 'pedir ajuste sem comentário é recusado');
  const r4 = await mat.acao('ajuste', { id: pend[1].id, txt: 'Trocar a foto de capa.' });
  checa(r4.status === 200 && r4.j.dados.posts.find((x) => x.id === pend[1].id).status === 'ajuste', 'Matheus pede ajuste com comentário');
  const r5 = await mat.acao('aprovar-lote', { ids: [pend[2].id, pend[3].id] });
  checa(r5.status === 200, 'Matheus aprova dois itens de uma vez');
  const r6 = await mat.acao('comentar', { id: pend[4].id, txt: 'Comentário do cliente', interno: true });
  const c6 = r6.j.dados.posts.find((x) => x.id === pend[4].id).comments.slice(-1)[0];
  checa(c6 && c6.interno === false && c6.who === 'Matheus', 'comentário do Matheus nunca vira interno');
  const r7 = await mat.acao('para-producao', { id: pend[4].id });
  checa(r7.status === 403, 'Matheus não mexe no fluxo de produção');
  const pl = e.dados.posts.find((p) => p.formato === 'plano');
  const r8 = await mat.acao('aprovar', { id: pl.id });
  checa(r8.status === 200 && r8.j.dados.plano.versao === 3 && !r8.j.dados.plano.pendente, 'Matheus aprova a versão 3 do plano');
}

console.log('Cancha responde ao ajuste e registra aprovação externa');
{
  const r = await cancha.acao('status', { id: pend[1].id, status: 'producao' });
  checa(r.status === 200, 'Cancha volta o item para produção');
  const r1 = await cancha.acao('post-editar', { id: pend[1].id, titulo: pend[1].titulo, legenda: 'Legenda nova', drive: 'https://drive.google.com/abc' });
  checa(r1.status === 200, 'Cancha edita o conteúdo em produção');
  const r2 = await cancha.acao('enviar', { id: pend[1].id });
  checa(r2.status === 200 && r2.j.dados.posts.find((x) => x.id === pend[1].id).status === 'aprovacao', 'Cancha reenvia para aprovação');
  const r3 = await cancha.acao('aprovacao-externa', { id: pend[1].id, canal: 'WhatsApp', evidencia: 'nao-e-link' });
  checa(r3.status === 400, 'comprovante precisa ser um link');
  const r4 = await cancha.acao('aprovacao-externa', { id: pend[1].id, canal: 'WhatsApp', evidencia: 'https://drive.google.com/print' });
  const p4 = r4.j.dados.posts.find((x) => x.id === pend[1].id);
  checa(r4.status === 200 && /registrado por Diogo/.test(p4.hist.slice(-1)[0].t), 'aprovação por WhatsApp fica registrada com o nome de quem registrou');
}

console.log('Produtora');
const prod = await sessao('u-produtora');
e = await prod.estado();
checa(e.dados.posts.length === 0 && e.dados.threads.length === 0 && e.dados.demandas.length === 0, 'produtora não recebe posts, conversas nem demandas');
{
  const v = e.dados.videos.find((x) => x.stage === 'viabilidade');
  const r = await prod.acao('viabilidade', { id: v.id, viavel: true, parecer: 'Dá para gravar na fábrica.' });
  checa(r.status === 200 && r.j.dados.videos.find((x) => x.id === v.id).stage === 'roteiro', 'produtora marca viabilidade e o vídeo vai para roteiro');
  const r2 = await prod.acao('aprovar', { id: pend[5] ? pend[5].id : 'x' });
  checa(r2.status === 403, 'produtora não aprova posts');
  const r3 = await prod.acao('roteiro-aprovar', { id: v.id });
  checa(r3.status === 403, 'produtora não aprova roteiro');
}

console.log('Diretoria');
const dir = await sessao('u-diretoria');
e = await dir.estado();
checa(e.dados.threads.length === 0, 'diretoria não recebe as conversas');
checa((await dir.acao('aprovar', { id: pend[5] ? pend[5].id : 'x' })).status === 403, 'diretoria não aprova');

console.log('Registro de auditoria');
{
  const r = await cancha.req('/api/atividade');
  checa(r.status === 200 && r.j.itens.length >= 8, `registro tem ${r.j.itens?.length} linhas`);
  checa(r.j.itens.some((a) => a.usuario_nome === 'Matheus' && /^Aprovou/.test(a.resumo)), 'registro mostra a aprovação do Matheus');
  checa((await mat.req('/api/atividade')).status === 403, 'só a Cancha abre o registro completo');
}

console.log('Recarrega a demonstração no fim');
checa((await cancha.req('/api/demo/restaurar', {})).status === 200, 'dados de demonstração recarregados');

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
