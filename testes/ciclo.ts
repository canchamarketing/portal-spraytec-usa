// Testa o ciclo do mês: insumos, pautas e textos enviados em lote, aprovação dos textos antes da arte.
// Uso: node testes/ciclo.ts
const { ACOES } = await import('../server/acoes.ts');
const { visaoPara } = await import('../server/visao.ts');
let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };
const espera = (fn: () => unknown, msg: string) => { try { fn(); checa(false, msg); } catch (e) { checa(true, msg + ` (${(e as Error).message})`); } };
const cancha = { id: 'uc', nome: 'Isa', papel: 'cancha' as const, email: null, demo: false };
const oper = { id: 'uo', nome: 'Matheus', papel: 'operacao' as const, email: null, demo: false };
const prod = { id: 'up', nome: 'Produtora', papel: 'produtora' as const, email: null, demo: false };
const P = (id: string, status: string, extra: any = {}) => ({ id, titulo: 'Post ' + id, rede: 'ig', formato: 'post', date: '2026-12-10', status, pauta: 'Tema ' + id, legenda: '', comments: [], hist: [], ...extra });
const e: any = { posts: [P('p1', 'pauta'), P('p2', 'pauta'), P('p3', 'producao', { legenda: 'Legenda do p3' }), P('p4', 'producao')],
  videos: [], demandas: [], threads: [], marcos: [], ano: [], conc: [], aprendizados: [], relatorios: [], materiais: [], ciclos: [],
  plano: null, guia: {}, lanes: [], concAcoes: [], links: [] };
const rodar = (acao: string, u: any, d: any) => ACOES[acao].fn({ e, u, d, hoje: '2026-11-05', agora: '05/11 10:00', pessoas: [oper] } as any);
const p = (id: string) => e.posts.find((x: any) => x.id === id);

console.log('Insumos do mês');
espera(() => rodar('insumos-salvar', oper, { m: '2026-12', txt: {} }), 'insumos vazios são recusados');
rodar('insumos-salvar', oper, { m: '2026-12', txt: { foco: 'Bioestimulante no florescimento', eventos: 'Dia de campo 17/12' } });
checa(e.ciclos[0].id === '2026-12' && e.ciclos[0].ins.txt.foco && e.ciclos[0].ins.por === 'Matheus' && e.ciclos[0].ins.ok === '2026-11-05', 'Spraytec envia os insumos do mês, com data e quem enviou');
espera(() => ACOES['insumos-salvar'].papeis.includes('produtora' as any) ? 0 : (() => { throw new Error('produtora não envia'); })(), 'produtora não envia insumos');
checa(visaoPara(e, prod).ciclos.length === 0 && visaoPara(e, oper).ciclos.length === 1, 'produtora não vê os ciclos; a Spraytec vê');

console.log('Pautas em lote');
espera(() => rodar('enviar-pautas', cancha, { ids: ['p1', 'p3'] }), 'item que não é pauta trava o lote');
rodar('enviar-pautas', cancha, { ids: ['p1', 'p2'] });
checa(p('p1').status === 'pauta_aprovacao' && p('p2').status === 'pauta_aprovacao', 'Cancha envia as pautas do mês de uma vez');
rodar('aprovar-lote', oper, { ids: ['p1', 'p2'] });
checa(p('p1').status === 'producao' && !p('p1').textoOk, 'pautas aprovadas vão para produção, ainda sem textos aprovados');

console.log('Textos (calendário)');
espera(() => rodar('enviar-textos', cancha, { ids: ['p4'] }), 'sem legenda, o texto não vai para aprovação');
checa(visaoPara(e, oper).posts.find((x: any) => x.id === 'p3').legenda === '', 'legenda em produção não aparece para a Spraytec');
rodar('enviar-textos', cancha, { ids: ['p3'] });
checa(p('p3').status === 'texto_aprovacao' && p('p3').prazo, 'Cancha envia os textos para aprovação, com prazo');
checa(visaoPara(e, oper).posts.find((x: any) => x.id === 'p3').legenda === 'Legenda do p3', 'a Spraytec lê a legenda para aprovar');
espera(() => rodar('status', cancha, { id: 'p3', status: 'producao' }), 'Cancha não pula a aprovação dos textos');
rodar('ajuste', oper, { id: 'p3', txt: 'Trocar o fim da legenda' });
checa(p('p3').status === 'ajuste' && p('p3').etapaAjuste === 'texto', 'ajuste nos textos fica marcado como etapa de texto');
rodar('nova-versao', cancha, { id: 'p3' });
checa(p('p3').status === 'texto_aprovacao', 'texto ajustado volta para aprovação dos textos (não para a peça)');
rodar('aprovar', oper, { id: 'p3' });
checa(p('p3').status === 'producao' && p('p3').textoOk === true, 'textos aprovados: volta para a Cancha produzir a arte');
checa(visaoPara(e, oper).posts.find((x: any) => x.id === 'p3').legenda === 'Legenda do p3', 'texto aprovado continua visível para a Spraytec durante a arte');
espera(() => rodar('enviar-textos', cancha, { ids: ['p3'] }), 'texto já aprovado não é reenviado');
rodar('enviar', cancha, { id: 'p3' });
checa(p('p3').status === 'aprovacao', 'arte pronta vai para a aprovação da peça');

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
