// Dados de demonstração (fictícios, marcados como EXEMPLO na tela). Só entram em modo demonstração.
// As datas são relativas a "ancora" (hoje), para a demonstração sempre parecer atual.
// As imagens são anúncios reais da Spraytec USA feitos pela Cancha (public/dados/exemplo).
import { addBiz, addDays, type Papel } from './dominio.ts';
import { estadoVazio, type Estado } from './estado.ts';

export const USUARIOS_DEMO: { id: string; nome: string; papel: Papel; idioma: string; ordem: number }[] = [
  { id: 'u-cancha', nome: 'Cancha (demo)', papel: 'cancha', idioma: 'pt-BR', ordem: 1 },
  { id: 'u-renato', nome: 'Renato (demo)', papel: 'aprovador', idioma: 'en-US', ordem: 2 },
  { id: 'u-leitor', nome: 'Spraytec USA reader (demo)', papel: 'leitor', idioma: 'en-US', ordem: 3 },
  { id: 'u-produtora', nome: 'Video producer (demo)', papel: 'produtora', idioma: 'en-US', ordem: 4 },
];

const CANCHA = { por: 'Cancha (demo)', papel: 'cancha' };
const RENATO = { por: 'Renato (demo)', papel: 'aprovador' };
const ts = (dia: string, h = 14) => `${dia}T${String(h).padStart(2, '0')}:00:00.000Z`;

export function dadosDemo(ancora: string): Estado {
  const e = estadoVazio();
  const d = (n: number) => addDays(ancora, n);
  let seq = 0;
  const id = (p: string) => `${p}demo${++seq}`;
  const H = (k: string, quem: any, em: string, p: any = {}) => ({ k, p, por: quem.por, papel: quem.papel, em });

  // ---------- anúncios-base (o conteúdo de cada criativo) ----------
  const base: Record<string, any> = {
    usefeed: {
      titulo: 'Use it once… Trust it always (feed)', canal: 'meta', formato: 'imagem', locais: ['feed'], objetivo: 'contatos',
      produtos: [], publico: 'Corn and soybean growers in Iowa, Illinois, Nebraska, Minnesota and South Dakota, 25–65.',
      textos: { titulo: 'Use it once… Trust it always.', texto: 'Nutrition, plant health and application technology in one solution. Talk to a Spraytec specialist today.', cta: 'Learn more', link: 'https://spraytecusa.com/programs' },
      exemploImg: '/dados/exemplo/anuncio-2.jpg',
    },
    usestories: {
      titulo: 'Use it once… Trust it always (Stories)', canal: 'meta', formato: 'imagem', locais: ['stories', 'reels'], objetivo: 'contatos',
      produtos: [], publico: 'Same audience as the feed version.',
      textos: { titulo: 'Use it once… Trust it always.', texto: 'Boost your productivity with Fulltec.', cta: 'Learn more', link: 'https://spraytecusa.com/programs' },
      exemploImg: '/dados/exemplo/anuncio-3.jpg',
    },
    future: {
      titulo: 'Anticipating the agriculture of the future', canal: 'meta', formato: 'imagem', locais: ['feed'], objetivo: 'marca',
      produtos: [], publico: 'Broad: farmers and ag retailers in the Midwest, plus lookalikes of current customers.',
      textos: { titulo: 'Anticipating the agriculture of the future', texto: 'Spraytec technology: the right nutrient, in the right form, at the right time.', cta: 'Learn more', link: 'https://spraytecusa.com' },
      exemploImg: '/dados/exemplo/anuncio-5.jpg',
    },
    lowrates: {
      titulo: 'Low rates, high yields', canal: 'meta', formato: 'imagem', locais: ['feed'], objetivo: 'contatos',
      produtos: ['fulltec-cube', 'fulltec-boron-max'], publico: 'Corn and soybean growers, 500+ acres, Midwest.',
      textos: { titulo: 'Low rates, high yields.', texto: 'Fulltec products work at a few ounces per acre. Ask how much you could save next season.', cta: 'Get a quote', link: 'https://spraytecusa.com/products' },
      exemploImg: '/dados/exemplo/anuncio-8.jpg',
    },
    marca: {
      titulo: 'Google Search: "Spraytec" (brand)', canal: 'google', formato: 'texto', locais: ['pesquisa'], objetivo: 'protecao',
      produtos: [], publico: 'Anyone searching for "Spraytec", "Fulltec" or product names.',
      textos: { titulo: 'Spraytec Fertilizers | Fulltec Product Line', texto: 'Adjuvants, seed treatments and foliar nutrition from Urbandale, Iowa. Find a dealer near you.', cta: 'Contact us', link: 'https://spraytecusa.com/contact' },
    },
    display: {
      titulo: 'Anticipating the future (Google Display, remarketing)', canal: 'google', formato: 'imagem', locais: ['display'], objetivo: 'lembrar',
      produtos: [], publico: 'People who visited spraytecusa.com in the last 30 days.',
      textos: { titulo: 'Anticipating the agriculture of the future', texto: 'Come back and see the 2026-27 Product Guide.', cta: 'See the guide', link: 'https://spraytecusa.com/products' },
      exemploImg: '/dados/exemplo/anuncio-4.jpg',
    },
    tractus: {
      titulo: 'Tractus Carbon: fall soil health (Search)', canal: 'google', formato: 'texto', locais: ['pesquisa'], objetivo: 'contatos',
      produtos: ['tractus-carbon'], publico: 'Searches for "soil health product", "fall fertilizer", "regenerative agriculture inputs".',
      textos: { titulo: 'Tractus Carbon | Build Soil Health This Fall', texto: 'Apply 22 lb/acre after harvest and start next season ahead. Talk to a Spraytec specialist.', cta: 'Get a quote', link: 'https://spraytecusa.com/products/tractus-carbon' },
    },
    seed: {
      titulo: 'Early order: Fulltec Plus ST + Nodofix', canal: 'meta', formato: 'imagem', locais: ['feed', 'stories'], objetivo: 'contatos',
      produtos: ['fulltec-plus-st', 'nodofix'], publico: 'Soybean growers, Midwest, 25–65.',
      textos: { titulo: 'Start strong in 2027', texto: 'Book your seed treatment now. Stronger roots, better nodulation.', cta: 'Book now', link: 'https://spraytecusa.com/programs' },
      exemploImg: '/dados/exemplo/anuncio-6.jpg',
    },
  };
  const foto = (a: any) => ({ versao: a.versao, titulo: a.titulo, canal: a.canal, formato: a.formato, locais: a.locais, objetivo: a.objetivo, produtos: a.produtos, publico: a.publico, textos: a.textos, linkDrive: '', arquivos: [] });
  const res = (inv: number, imp: number, cli: number, cont: number) => ({ origem: 'exemplo', investimento: inv, impressoes: imp, cliques: cli, contatos: cont });
  function novo(k: string, rot: any, extra: any = {}) {
    const a: any = { id: id('a-'), rotacaoId: rot.id, origem: 'novo', versao: 1, linkDrive: '', arquivos: [], comentarios: [], hist: [], nota: '', ...JSON.parse(JSON.stringify(base[k])), criadoEm: ts(rot.criada), ...extra };
    e.anuncios.push(a);
    return a;
  }
  function continua(de: any, rot: any, extra: any = {}) {
    const a: any = { ...JSON.parse(JSON.stringify(de)), id: id('a-'), rotacaoId: rot.id, origem: 'continua', anteriorId: de.id, status: 'continua', comentarios: [], semaforo: null, semaforoMotivo: '', resultado: null, ...extra };
    a.hist = [H('hist.continua', CANCHA, ts(rot.criada), { de: `${de._rot.ini} → ${de._rot.fim}` })];
    e.anuncios.push(a);
    return a;
  }
  const aprovado = (a: any, dia: string, todos = false) => {
    a.enviado = foto(a); a.enviadoEm = ts(dia, 13); a.status = 'aprovado';
    a.aprovadoPor = RENATO.por; a.aprovadoPorId = 'u-renato'; a.aprovadoEm = ts(dia, 19); a.aprovadoVersao = a.versao;
    a.hist.push(H('hist.anuncio_criado', CANCHA, ts(dia, 11)), H('hist.enviado', CANCHA, ts(dia, 13), { versao: a.versao }), H(todos ? 'hist.aprovado_todos' : 'hist.aprovado', RENATO, ts(dia, 19), { versao: a.versao }));
  };

  // ---------- Rotação 1: encerrada ----------
  const r1: any = { id: id('r-'), ini: d(-20), fim: d(-7), prazo: addBiz(d(-20), -3), status: 'encerrada', criada: d(-26), saem: [], comentarios: [], hist: [],
    foco: 'Post-harvest: brand awareness and leads for the 2027 season.', idioma: 'en-US',
    traducoes: { 'pt-BR': { foco: 'Pós-colheita: marca conhecida e contatos para a safra 2027.' } },
    noArEm: d(-20), encerradaEm: d(-6), criadaEm: ts(d(-26)),
    resumo: 'Brand search kept a low cost per contact. "Low rates, high yields" got tired in the second week (frequency above 4).',
  };
  r1.traducoes['pt-BR'].resumo = 'A busca pela marca manteve o custo por contato baixo. "Low rates, high yields" cansou na segunda semana (frequência acima de 4).';
  r1.hist.push(H('hist.rotacao_criada', CANCHA, ts(d(-26))), H('hist.rotacao_enviada', CANCHA, ts(d(-25)), { n: 4 }), H('hist.rotacao_aprovada', RENATO, ts(d(-24))),
    H('hist.rotacao_no_ar', CANCHA, ts(d(-20)), { data: d(-20) }), H('hist.rotacao_encerrada', CANCHA, ts(d(-6))));
  e.rotacoes.push(r1);
  const a1 = novo('usefeed', r1), a2 = novo('future', r1), a3 = novo('lowrates', r1), a4 = novo('marca', r1);
  for (const a of [a1, a2, a3, a4]) { aprovado(a, d(-24), true); a.status = 'encerrado'; a.hist.push(H('hist.no_ar', CANCHA, ts(d(-20)), { data: d(-20) })); a._rot = r1; }
  Object.assign(a1, { semaforo: 'bem', semaforoMotivo: '', resultado: res(612, 48200, 1060, 21) });
  Object.assign(a2, { semaforo: 'atencao', semaforoMotivo: 'Good reach, but few contacts. Keep one more cycle and watch.', resultado: res(540, 61500, 720, 6) });
  Object.assign(a3, { semaforo: 'cansado', semaforoMotivo: 'Cost per contact went up 40% in the second week; people saw it 4+ times.', resultado: res(498, 39800, 410, 5) });
  Object.assign(a4, { semaforo: 'bem', semaforoMotivo: '', resultado: res(210, 3900, 520, 17) });
  a2.idioma = 'en-US'; a3.idioma = 'en-US';
  a2.traducoes = { 'pt-BR': { semaforoMotivo: 'Bom alcance, mas poucos contatos. Fica mais um ciclo, de olho.' } };
  a3.traducoes = { 'pt-BR': { semaforoMotivo: 'O custo por contato subiu 40% na segunda semana; as pessoas viram 4 vezes ou mais.' } };
  for (const a of [a1, a2, a3, a4]) a.hist.push(H('hist.avaliado', CANCHA, ts(d(-6)), { semaforo: 'semaforo.' + a.semaforo }));

  // ---------- Rotação 2: no ar ----------
  const r2: any = { id: id('r-'), ini: d(-6), fim: d(7), prazo: addBiz(d(-6), -3), status: 'no_ar', criada: d(-11), anteriorId: r1.id, comentarios: [], hist: [],
    saem: [{ anuncioId: a3.id, titulo: a3.titulo, motivo: 'Tired: cost per contact up 40%.', idioma: 'en-US', traducoes: { 'pt-BR': { motivo: 'Cansou: custo por contato subiu 40%.' } } }],
    foco: 'Year-end: Tractus Carbon (fall application) and brand.', idioma: 'en-US',
    traducoes: { 'pt-BR': { foco: 'Fim de ano: Tractus Carbon (aplicação de outono) e marca.' } }, noArEm: d(-6), criadaEm: ts(d(-11)) };
  r2.hist.push(H('hist.rotacao_criada', CANCHA, ts(d(-11))), H('hist.rotacao_enviada', CANCHA, ts(d(-10)), { n: 1 }), H('hist.rotacao_aprovada', RENATO, ts(d(-9))),
    H('hist.rotacao_no_ar', CANCHA, ts(d(-6)), { data: d(-6) }));
  e.rotacoes.push(r2);
  const b1 = continua(a1, r2), b2 = continua(a2, r2), b4 = continua(a4, r2);
  const b5 = novo('usestories', r2);
  aprovado(b5, d(-9));
  for (const a of [b1, b2, b4, b5]) { a.status = 'no_ar'; a.hist.push(H('hist.no_ar', CANCHA, ts(d(-6)), { data: d(-6) })); a._rot = r2; }
  b1.resultado = res(301, 22100, 470, 9); b2.resultado = res(288, 33400, 300, 2); b4.resultado = res(96, 1800, 240, 8); b5.resultado = res(180, 26500, 210, 4);
  b2.comentarios.push({ id: id('c-'), ...RENATO, porId: 'u-renato', em: ts(d(-3), 15), texto: 'This one brings reach but our dealers say they are not hearing about it. Maybe swap it next time?', idioma: 'en-US',
    traducoes: { 'pt-BR': 'Este traz alcance, mas nossos revendedores dizem que ninguém comenta sobre ele. Talvez trocar na próxima?' } });
  b2.comentarios.push({ id: id('c-'), ...CANCHA, porId: 'u-cancha', em: ts(d(-3), 17), texto: 'Concordo, os números confirmam (2 contatos). Vai sair na próxima rotação.', idioma: 'pt-BR', interno: true });

  // ---------- Rotação 3: em aprovação ----------
  const r3: any = { id: id('r-'), ini: d(8), fim: d(21), prazo: addBiz(d(8), -3), status: 'aprovacao', criada: d(-2), anteriorId: r2.id, comentarios: [], hist: [],
    saem: [{ anuncioId: b2.id, titulo: b2.titulo, motivo: 'Few contacts (2 in the cycle). Renato also asked to swap it.', idioma: 'en-US' }],
    foco: 'Early order for 2027: seed treatment and Tractus Carbon. Iowa Ag Expo coming in February.', idioma: 'en-US',
    traducoes: { 'pt-BR': { foco: 'Compra antecipada da safra 2027: tratamento de sementes e Tractus Carbon. Iowa Ag Expo em fevereiro.' } }, criadaEm: ts(d(-2)) };
  r3.saem[0].traducoes = { 'pt-BR': { motivo: 'Poucos contatos (2 no ciclo). O Renato também pediu para trocar.' } };
  r3.hist.push(H('hist.rotacao_criada', CANCHA, ts(d(-2))), H('hist.rotacao_enviada', CANCHA, ts(d(-1)), { n: 3 }));
  e.rotacoes.push(r3);
  continua(b1, r3); continua(b5, r3); continua(b4, r3);
  const c1 = novo('display', r3);
  aprovado(c1, d(-1));
  const c2 = novo('lowrates', r3, { titulo: 'Low rates, high yields (new copy)' });
  c2.textos.texto = 'A few ounces per acre, measurable results. See the 2026-27 Product Guide.';
  c2.enviado = foto(c2); c2.enviadoEm = ts(d(-1), 13); c2.status = 'aprovacao';
  c2.hist.push(H('hist.anuncio_criado', CANCHA, ts(d(-2), 11)), H('hist.enviado', CANCHA, ts(d(-1), 13), { versao: 1 }));
  const c3 = novo('tractus', r3);
  c3.textos = { ...c3.textos, texto: 'Build soil health this fall. Talk to a Spraytec specialist.' };
  c3.enviado = foto(c3); c3.hist.push(H('hist.anuncio_criado', CANCHA, ts(d(-2), 11)), H('hist.enviado', CANCHA, ts(d(-2), 13), { versao: 1 }));
  c3.ajustePedido = { texto: 'Please mention the rate (22 lb/acre) and that it goes on after harvest.', por: RENATO.por, em: ts(d(-2), 18), versao: 1 };
  c3.comentarios.push({ id: id('c-'), ...RENATO, porId: 'u-renato', em: ts(d(-2), 18), texto: c3.ajustePedido.texto, idioma: 'en-US', ajuste: true,
    traducoes: { 'pt-BR': 'Por favor, cite a dose (22 lb/acre) e que é aplicado depois da colheita.' } });
  c3.hist.push(H('hist.ajuste_pedido', RENATO, ts(d(-2), 18), { versao: 1 }));
  c3.textos = { ...base.tractus.textos };
  c3.versao = 2; c3.enviado = foto(c3); c3.enviadoEm = ts(d(-1), 10); c3.status = 'aprovacao';
  c3.hist.push(H('hist.enviado', CANCHA, ts(d(-1), 10), { versao: 2 }));
  // Rascunho da Cancha: a Spraytec não vê.
  const c4 = novo('seed', r3, { status: 'rascunho', nota: 'Esperar a tabela de preços do early order antes de enviar.' });
  c4.hist.push(H('hist.anuncio_criado', CANCHA, ts(d(0), 12)));
  r3.comentarios.push({ id: id('c-'), ...CANCHA, porId: 'u-cancha', em: ts(d(-1), 13), texto: '@Renato (demo) três anúncios novos para aprovar. O de Tractus Carbon já tem a dose que você pediu.', idioma: 'pt-BR',
    traducoes: { 'en-US': '@Renato (demo) three new ads to approve. The Tractus Carbon one now has the rate you asked for.' } });

  for (const a of e.anuncios) delete a._rot;
  for (const r of e.rotacoes) delete r.criada;
  e.eventos = eventosExemplo(ancora);
  return e;
}

// Calendário do ano safra: EXEMPLO montado pela Cancha (pesquisa de 11/11/2026), para confirmar com o Renato.
// Fases da lavoura de milho e soja em Iowa; feiras com as datas divulgadas para 2027.
function eventosExemplo(ancora: string) {
  const y = Number(ancora.slice(0, 4)) + (Number(ancora.slice(5, 7)) >= 10 ? 1 : 0); // ano da próxima safra
  const p = String(y - 1), a = String(y);
  let n = 0;
  const ev = (tipo: string, ini: string, fim: string, en: string, pt: string, extra: any = {}) => ({
    id: 'e-demo' + ++n, tipo, ini, fim, nome: en, idioma: 'en-US', traducoes: { 'pt-BR': { nome: pt, ...(extra.notaPt ? { nota: extra.notaPt } : {}) } },
    local: extra.local || '', produtos: extra.produtos || [], nota: extra.nota || '', link: extra.link || '', exemplo: true, hist: [],
  });
  return [
    // fases da lavoura
    ev('fase', `${p}-11-01`, `${p}-12-31`, 'Post-harvest and planning', 'Pós-colheita e planejamento', { nota: 'Year-end prepay: many farmers buy inputs before Dec 31 for tax reasons.', notaPt: 'Compra antecipada de fim de ano: muitos produtores compram insumos antes de 31/12 por causa do imposto.' }),
    ev('fase', `${a}-01-01`, `${a}-03-31`, 'Input purchasing', 'Compra de insumos'),
    ev('fase', `${a}-04-15`, `${a}-05-20`, 'Planting (best window)', 'Plantio (janela ideal)', { nota: 'Iowa State: best yields when planted from mid-April to about May 15–20. Final insurance planting date: May 31 (corn), June 15 (soybean).', notaPt: 'Iowa State: melhores produtividades com plantio de meados de abril até ~15–20 de maio. Data final do seguro: 31/5 (milho) e 15/6 (soja).' }),
    ev('fase', `${a}-05-20`, `${a}-07-10`, 'Post-emergence and early foliar', 'Pós-emergência e primeiras foliares'),
    ev('fase', `${a}-07-10`, `${a}-08-31`, 'Reproductive stages, fungicide passes', 'Fase reprodutiva e fungicidas'),
    ev('fase', `${a}-09-15`, `${a}-11-15`, 'Harvest', 'Colheita'),
    // feiras (datas de 2027 divulgadas pelos organizadores; participação da Spraytec a confirmar)
    ev('feira', `${a}-02-02`, `${a}-02-04`, 'Iowa Ag Expo', 'Iowa Ag Expo', { local: 'Des Moines, IA', link: 'https://iowaagexpo.com' }),
    ev('feira', `${a}-02-09`, `${a}-02-11`, 'World Ag Expo', 'World Ag Expo', { local: 'Tulare, CA', link: 'https://worldagexpo.com' }),
    ev('feira', `${a}-02-10`, `${a}-02-13`, 'National Farm Machinery Show', 'National Farm Machinery Show', { local: 'Louisville, KY', link: 'https://farmmachineryshow.org' }),
    ev('feira', `${a}-03-03`, `${a}-03-05`, 'Commodity Classic', 'Commodity Classic', { local: 'New Orleans, LA', link: 'https://commodityclassic.com' }),
    ev('feira', `${a}-07-29`, `${a}-07-29`, 'Ag PhD Field Day (date not announced)', 'Ag PhD Field Day (data não divulgada)', { local: 'Baltic, SD', nota: 'Usually the last Thursday of July. Spraytec has an "Ag PhD" contact list.', notaPt: 'Costuma ser na última quinta de julho. A Spraytec tem uma lista de contatos "Ag PhD".' }),
    ev('feira', `${a}-08-31`, `${a}-09-02`, 'Farm Progress Show', 'Farm Progress Show', { local: 'Decatur, IL', nota: 'Back in Boone, Iowa in 2028.', notaPt: 'Volta a Boone, Iowa, em 2028.', link: 'https://www.farmprogressshow.com' }),
    ev('feira', `${a}-09-14`, `${a}-09-16`, 'Husker Harvest Days', 'Husker Harvest Days', { local: 'Grand Island, NE' }),
    ev('feira', `${a}-09-21`, `${a}-09-23`, 'Farm Science Review', 'Farm Science Review', { local: 'London, OH' }),
    // produtos em foco em cada época
    ev('foco', `${p}-11-01`, `${p}-12-31`, 'Soil health after harvest', 'Saúde do solo depois da colheita', { produtos: ['tractus-carbon'] }),
    ev('foco', `${a}-01-05`, `${a}-04-30`, 'Seed treatment (early order)', 'Tratamento de sementes (compra antecipada)', { produtos: ['fulltec-plus-st', 'nodofix', 'fulltec-carbon-seed'] }),
    ev('foco', `${a}-04-01`, `${a}-07-15`, 'Adjuvants for the herbicide season', 'Adjuvantes na época dos herbicidas', { produtos: ['fulltec-adjuvant', 'fulltec-oil-max', 'fulltec-top-mix', 'omega'] }),
    ev('foco', `${a}-05-15`, `${a}-06-30`, 'Early foliar (V2–R1)', 'Primeiras foliares (V2–R1)', { produtos: ['fulltec-plus-foliar', 'fulltec-nitro', 'fulltec-ultra', 'fulltec-zinc'] }),
    ev('foco', `${a}-06-15`, `${a}-07-31`, 'With the fungicide (V5–R3)', 'Junto com o fungicida (V5–R3)', { produtos: ['fulltec-cube', 'fulltec-boron-max'] }),
    ev('foco', `${a}-07-15`, `${a}-08-31`, 'Grain fill (R stages)', 'Enchimento de grãos (fase R)', { produtos: ['fulltec-k', 'fulltec-cube-ir', 'fulltec-finish-max', 'fulltec-arrow', 'fulltec-drone'] }),
    // campanha de exemplo
    ev('campanha', `${p}-11-15`, `${p}-12-31`, 'Year-end prepay campaign', 'Campanha de compra antecipada de fim de ano'),
  ];
}
