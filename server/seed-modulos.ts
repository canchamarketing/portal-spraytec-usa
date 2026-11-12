// Dados de demonstração das etapas 2 e 3 (feedbacks, planejamento, roteiros, e-mails, site, SEO e GEO).
// Tudo fictício e marcado como EXEMPLO na tela. Textos para o cliente em inglês, com tradução de exemplo.
import { addDays } from './dominio.ts';
import type { Estado } from './estado.ts';
import { fotografiaItem } from './modulos.ts';

const CANCHA = { por: 'Cancha (demo)', porId: 'u-cancha', papel: 'cancha' };
const RENATO = { por: 'Renato (demo)', porId: 'u-renato', papel: 'aprovador' };
const PROD = { por: 'Video producer (demo)', porId: 'u-produtora', papel: 'produtora' };
const ts = (dia: string, h = 14) => `${dia}T${String(h).padStart(2, '0')}:00:00.000Z`;
const mesDe = (iso: string, n = 0) => { const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1 + n, 1)); return d.toISOString().slice(0, 7); };

export function modulosExemplo(e: Estado, ancora: string, anuncios: any[]) {
  const d = (n: number) => addDays(ancora, n);
  const H = (k: string, q: any, em: string, p: any = {}) => ({ k, p, por: q.por, papel: q.papel, em });
  const C = (q: any, em: string, texto: string, idioma: string, extra: any = {}) => ({ id: 'c-' + Math.random().toString(36).slice(2, 8), ...q, em, texto, idioma, ...extra });
  const mes = mesDe(ancora), prox = mesDe(ancora, 1);
  const ad = (titulo: string) => anuncios.find((a) => a.titulo.startsWith(titulo));

  // ---------- feedbacks ----------
  const live = ad('Use it once… Trust it always (feed)');
  e.feedbacks.push(
    { id: 'f-demo1', tipo: 'leads', ...RENATO, em: ts(d(-4), 15), idioma: 'en-US', status: 'respondido',
      texto: 'Of the 9 contacts from the "Use it once" ad, 3 were dealers, not farmers. Can we exclude dealers from the audience?',
      traducoes: { 'pt-BR': 'Dos 9 contatos do anúncio "Use it once", 3 eram revendedores, não agricultores. Dá para tirar revendedores do público?' },
      leads: { qualidade: 'mistos', quantidade: 9, periodo: 'Nov 5–18' }, sobre: live ? { ref: 'a:' + live.id, titulo: live.titulo } : undefined,
      comentarios: [C(CANCHA, ts(d(-3), 13), 'Sim! Vamos excluir interesses de "agricultural retail" e checar de novo em uma semana.', 'pt-BR',
        { traducoes: { 'en-US': 'Yes! We will exclude "agricultural retail" interests and check again in a week.' } })],
      hist: [H('hist.fb_criado', RENATO, ts(d(-4), 15)), H('hist.fb_respondido', CANCHA, ts(d(-3), 13))] },
    { id: 'f-demo2', tipo: 'elogio', ...RENATO, em: ts(d(-12), 16), idioma: 'en-US', status: 'resolvido',
      texto: 'Two dealers in Nebraska mentioned the Google ad when they called. Good job.', traducoes: { 'pt-BR': 'Dois revendedores em Nebraska citaram o anúncio do Google quando ligaram. Bom trabalho.' },
      comentarios: [], hist: [H('hist.fb_criado', RENATO, ts(d(-12), 16)), H('hist.fb_status', RENATO, ts(d(-11), 9), { status: 'fb.st.resolvido' })] },
    { id: 'f-demo3', tipo: 'ideia', ...RENATO, em: ts(d(-1), 18), idioma: 'en-US', status: 'aberto',
      texto: 'For December, could we show the Tractus Carbon trial results from the Research Book?', traducoes: { 'pt-BR': 'Para dezembro, dá para mostrar os resultados de ensaio do Tractus Carbon que estão no Research Book?' },
      comentarios: [], hist: [H('hist.fb_criado', RENATO, ts(d(-1), 18))] },
  );

  // ---------- observações e plano do mês seguinte ----------
  e.observacoes.push(
    { id: 'o-demo1', mes: prox, assunto: 'produto', texto: 'Focus on Tractus Carbon until harvest is fully done; then seed treatment early order.', idioma: 'en-US', traducoes: { 'pt-BR': 'Foco em Tractus Carbon até a colheita terminar de vez; depois, compra antecipada de tratamento de sementes.' }, ...RENATO, em: ts(d(-6)), destino: 'atendida', destinoNota: '', hist: [] },
    { id: 'o-demo2', mes: prox, assunto: 'verba', texto: 'Subir a verba do Google (busca pela marca) em 20% em dezembro: custo por contato está baixo.', idioma: 'pt-BR', traducoes: { 'en-US': 'Raise the Google budget (brand search) by 20% in December: cost per contact is low.' }, ...CANCHA, em: ts(d(-5)), destino: 'atendida', destinoNota: '', hist: [] },
    { id: 'o-demo3', mes: prox, assunto: 'evento', texto: 'We will have a booth at Iowa Ag Expo (Feb 2–4). Start inviting customers in January.', idioma: 'en-US', traducoes: { 'pt-BR': 'Vamos ter estande na Iowa Ag Expo (2–4/fev). Começar a convidar clientes em janeiro.' }, ...RENATO, em: ts(d(-2)), destino: 'adiada', destinoNota: 'Janeiro', hist: [] },
    { id: 'o-demo4', mes: prox, assunto: 'publico', texto: 'Excluir revendedores do público de contatos (ver feedback do Renato).', idioma: 'pt-BR', traducoes: { 'en-US': 'Exclude dealers from the contacts audience (see Renato\'s feedback).' }, ...CANCHA, em: ts(d(-3)), destino: null, hist: [] },
  );
  const plano: any = { id: 'p-' + prox, mes: prox, versao: 1, status: 'aprovacao', idioma: 'en-US', criadoEm: ts(d(-2)),
    foco: 'Year-end prepay: Tractus Carbon (fall application) until mid-December, then early order for seed treatment (Fulltec Plus ST + Nodofix). Exclude dealers from the contacts audience.',
    verbaMeta: 3000, verbaGoogle: 2400, produtos: ['tractus-carbon', 'fulltec-plus-st', 'nodofix'],
    eventos: 'Iowa Ag Expo invitations start in January (moved from December).', notas: 'Google brand search budget +20% (low cost per contact).',
    comentarios: [], hist: [H('hist.item_criado', CANCHA, ts(d(-2), 11)), H('hist.enviado', CANCHA, ts(d(-1), 12), { versao: 1 })] };
  plano.enviado = fotografiaItem('planos', plano); plano.enviadoEm = ts(d(-1), 12);
  plano.traducoes = { 'pt-BR': { foco: 'Compra antecipada de fim de ano: Tractus Carbon (aplicação de outono) até meados de dezembro, depois compra antecipada de tratamento de sementes (Fulltec Plus ST + Nodofix). Tirar revendedores do público de contatos.',
    eventos: 'Convites para a Iowa Ag Expo começam em janeiro (saiu de dezembro).', notas: 'Verba de busca pela marca no Google +20% (custo por contato baixo).' } };
  const planoAtual: any = { id: 'p-' + mes, mes, versao: 1, status: 'aprovado', idioma: 'en-US', criadoEm: ts(d(-35)),
    foco: 'Post-harvest: brand awareness and contacts for the 2027 season.', verbaMeta: 3000, verbaGoogle: 3600, produtos: ['tractus-carbon'], eventos: '', notas: '',
    aprovadoPor: RENATO.por, aprovadoPorId: 'u-renato', aprovadoEm: ts(d(-28), 15), aprovadoVersao: 1,
    traducoes: { 'pt-BR': { foco: 'Pós-colheita: marca conhecida e contatos para a safra 2027.' } },
    comentarios: [], hist: [H('hist.item_criado', CANCHA, ts(d(-32))), H('hist.enviado', CANCHA, ts(d(-30)), { versao: 1 }), H('hist.aprovado', RENATO, ts(d(-28), 15), { versao: 1 })] };
  planoAtual.enviado = fotografiaItem('planos', planoAtual);
  e.planos.push(planoAtual, plano);

  // ---------- roteiros de vídeo ----------
  const rot = (x: any) => { const r: any = { versao: 1, comentarios: [], hist: [], idioma: 'en-US', formato: 'vertical', referencias: '', objetivo: '', ...x }; if (r.status !== 'rascunho') { r.enviado = fotografiaItem('roteiros', r); r.enviadoEm = r.hist.find((h: any) => h.k === 'hist.enviado')?.em; } return r; };
  e.roteiros.push(
    rot({ id: 'v-demo1', titulo: 'Tractus Carbon: why fall application', duracao: 45, produtos: ['tractus-carbon'], status: 'aprovacao', prazo: d(10),
      objetivo: 'Explain in under a minute why Tractus Carbon goes on after harvest.',
      roteiro: 'SCENE 1 (0–5s): Combine finishing the last pass at sunset.\nVO: "Harvest is done. Your soil\'s work is not."\n\nSCENE 2 (5–20s): Close-up of soil in hand, then Tractus Carbon bag.\nVO: "Tractus Carbon feeds the soil biology through the winter, at 22 lb per acre."\n\nSCENE 3 (20–40s): Agronomist talking to camera in the field.\nAGRONOMIST: "Fields that start the spring alive start the season ahead."\n\nSCENE 4 (40–45s): Logo + "Talk to a Spraytec specialist" + phone (515) 252-7777.',
      hist: [H('hist.item_criado', CANCHA, ts(d(-3))), H('hist.enviado', CANCHA, ts(d(-1), 10), { versao: 1 })] }),
    rot({ id: 'v-demo2', titulo: 'Farmer testimonial: Nodofix on soybeans', duracao: 60, produtos: ['nodofix'], status: 'producao', prazo: d(14), enviadoProdutoraEm: ts(d(-5)),
      objetivo: 'Real grower from Iowa telling the nodulation result. For the early-order campaign.',
      roteiro: 'SCENE 1: Grower introduces himself next to his soybean field (name, county, acres).\nSCENE 2: Dig up a plant, show nodules. GROWER: "Look at these nodules. That\'s nitrogen I didn\'t have to buy."\nSCENE 3: Bag of Nodofix on the seed tender.\nSCENE 4: Logo + "Book your seed treatment now".',
      aprovadoPor: RENATO.por, aprovadoEm: ts(d(-7)), aprovadoVersao: 1,
      hist: [H('hist.item_criado', CANCHA, ts(d(-10))), H('hist.enviado', CANCHA, ts(d(-9)), { versao: 1 }), H('hist.aprovado', RENATO, ts(d(-7)), { versao: 1 }), H('hist.para_produtora', CANCHA, ts(d(-5)))] }),
    rot({ id: 'v-demo3', titulo: 'Fulltec Adjuvant in 30 seconds', duracao: 30, produtos: ['fulltec-adjuvant'], status: 'corte', prazo: d(2), corteVersao: 1, formato: 'horizontal',
      objetivo: 'Short video for YouTube and Display ads.',
      roteiro: 'SCENE 1: Sprayer in the field. VO: "Your herbicide is only as good as what gets into the plant."\nSCENE 2: Droplet animation on a leaf, with and without adjuvant.\nSCENE 3: Logo + "The most complete adjuvant on the market".',
      cortes: [{ versao: 1, link: 'https://drive.google.com/file/d/exemplo-corte-1/view', nota: 'First cut. Music is temporary.', ...PROD, em: ts(d(-1), 20), idioma: 'en-US' }],
      aprovadoPor: RENATO.por, aprovadoEm: ts(d(-20)), aprovadoVersao: 1,
      comentarios: [C(PROD, ts(d(-1), 20), 'First cut uploaded. We used drone shots from the October shoot.', 'en-US', { traducoes: { 'pt-BR': 'Primeiro corte enviado. Usamos imagens de drone da gravação de outubro.' } })],
      hist: [H('hist.enviado', CANCHA, ts(d(-22)), { versao: 1 }), H('hist.aprovado', RENATO, ts(d(-20)), { versao: 1 }), H('hist.para_produtora', CANCHA, ts(d(-18))), H('hist.corte_enviado', PROD, ts(d(-1), 20), { versao: 1 })] }),
    rot({ id: 'v-demo4', titulo: 'Iowa Ag Expo invitation', duracao: 20, produtos: [], status: 'rascunho', nota: 'Esperar o número do estande.',
      roteiro: 'SCENE 1: Booth teaser...', hist: [H('hist.item_criado', CANCHA, ts(d(0)))] }),
  );

  // ---------- e-mails (Brevo) ----------
  const cheio = (col: string, L: string[], q = CANCHA, dia = d(-1)) => Object.fromEntries(L.map((k) => [k, { por: q.por, em: ts(dia) }]));
  const email = (x: any) => { const r: any = { versao: 1, comentarios: [], hist: [], idioma: 'en-US', checklist: {}, preheader: '', notas: '', linkPrevia: '', ...x }; if (r.status !== 'rascunho') { r.enviado = fotografiaItem('emails', r); } return r; };
  e.emails.push(
    email({ id: 'e-demo1', titulo: 'November newsletter: fall soil health', assunto: 'Harvest is done. Is your soil ready for 2027?', preheader: 'Tractus Carbon at 22 lb/acre after harvest',
      lista: 'Customers + Farm Shows 2025', envio: d(-15), produtos: ['tractus-carbon'], status: 'enviado', concluidoEm: d(-15),
      checklist: cheio('emails', ['lista', 'assunto', 'links', 'utm', 'teste', 'descadastro', 'celular'], CANCHA, d(-16)),
      resultado: { origem: 'exemplo', enviados: 2840, aberturas: 1022, cliques: 131, descadastros: 6 },
      aprovadoPor: RENATO.por, aprovadoEm: ts(d(-17)), aprovadoVersao: 1,
      hist: [H('hist.enviado', CANCHA, ts(d(-18)), { versao: 1 }), H('hist.aprovado', RENATO, ts(d(-17)), { versao: 1 }), H('hist.email_enviado', CANCHA, ts(d(-15)), { data: d(-15) })] }),
    email({ id: 'e-demo2', titulo: 'Year-end prepay offer', assunto: 'Lock in your 2027 seed treatment before Dec 31', preheader: 'Early-order pricing on Fulltec Plus ST and Nodofix',
      lista: 'Customers (Salesforce export)', envio: d(6), produtos: ['fulltec-plus-st', 'nodofix'], status: 'aprovacao', linkPrevia: 'https://drive.google.com/file/d/exemplo-previa-email/view',
      checklist: cheio('emails', ['lista', 'assunto', 'links'], CANCHA, d(-1)),
      hist: [H('hist.item_criado', CANCHA, ts(d(-3))), H('hist.enviado', CANCHA, ts(d(-1), 15), { versao: 1 })] }),
    email({ id: 'e-demo3', titulo: 'Iowa Ag Expo: see you at the booth', assunto: 'Visit Spraytec at Iowa Ag Expo, Feb 2–4', lista: 'Farm Shows signup list', envio: d(70), produtos: [], status: 'rascunho',
      hist: [H('hist.item_criado', CANCHA, ts(d(0)))] }),
  );
  e.emails[0].enviadoEm = ts(d(-18)); e.emails[1].enviadoEm = ts(d(-1), 15);

  // ---------- site: landing pages e pedidos ----------
  const lp: any = { id: 'l-demo1', titulo: 'Landing page: 2027 early order', url: 'https://spraytecusa.com/early-order-2027-preview', objetivo: 'Collect contacts for the seed treatment early order (form goes to Salesforce).',
    produtos: ['fulltec-plus-st', 'nodofix', 'fulltec-carbon-seed'], publicacao: d(4), notas: '', versao: 2, status: 'aprovado', idioma: 'en-US',
    checklist: cheio('paginas', ['pixel_meta', 'tag_google', 'conversao', 'formulario'], CANCHA, d(0)),
    aprovadoPor: RENATO.por, aprovadoEm: ts(d(-1), 16), aprovadoVersao: 2,
    comentarios: [C(RENATO, ts(d(-4), 14), 'Please use the 2026-27 Product Guide photos, not the old ones.', 'en-US', { ajuste: true, traducoes: { 'pt-BR': 'Por favor, usem as fotos do Product Guide 2026-27, não as antigas.' } })],
    hist: [H('hist.enviado', CANCHA, ts(d(-5)), { versao: 1 }), H('hist.ajuste_pedido', RENATO, ts(d(-4), 14), { versao: 1 }), H('hist.enviado', CANCHA, ts(d(-2)), { versao: 2 }), H('hist.aprovado', RENATO, ts(d(-1), 16), { versao: 2 })] };
  lp.enviado = fotografiaItem('paginas', lp);
  e.paginas.push(lp);
  e.pedidos.push(
    { id: 'd-demo1', titulo: 'Update phone number on the Contact page', descricao: 'The toll-free number changed to 1-800-889-5127. Please update the Contact page and the footer.', url: 'https://spraytecusa.com/contact',
      prazo: d(3), status: 'fazendo', ...RENATO, em: ts(d(-2)), idioma: 'en-US', traducoes: { 'pt-BR': { descricao: 'O 0800 mudou para 1-800-889-5127. Atualizem a página de Contato e o rodapé.' } }, comentarios: [], hist: [H('hist.pedido_criado', RENATO, ts(d(-2)))] },
    { id: 'd-demo2', titulo: 'Add Fulltec Finish Max product page', descricao: 'New product: add it to Products with the label PDF.', url: 'https://spraytecusa.com/products',
      prazo: '', status: 'feito', feitoEm: d(-6), ...RENATO, em: ts(d(-14)), idioma: 'en-US', comentarios: [], hist: [H('hist.pedido_criado', RENATO, ts(d(-14))), H('hist.pedido_status', CANCHA, ts(d(-6)), { status: 'pedido.st.feito' })] },
  );

  // ---------- conversas (chat por tema) ----------
  const M = (q: any, dia: string, h: number, texto: string, idioma: string, tr?: string) => ({ id: 'm-' + Math.random().toString(36).slice(2, 8), por: q.por, porId: q.porId, papel: q.papel, em: ts(dia, h), texto, idioma,
    ...(tr ? { traducoes: { [idioma === 'en-US' ? 'pt-BR' : 'en-US']: tr } } : {}) });
  e.conversas.push(
    { id: 't-demo1', canal: 'spraytec', tema: 'Early order 2027 campaign', criadaPor: RENATO.por, em: ts(d(-3), 14), ref: 'p:p-' + prox, hist: [],
      msgs: [
        M(RENATO, d(-3), 14, 'Our early-order price list for seed treatment will be ready next week. Can the ads start right after?', 'en-US', 'A tabela de preços de compra antecipada do tratamento de sementes fica pronta semana que vem. Os anúncios podem começar logo depois?'),
        M(CANCHA, d(-3), 16, 'Sim! Já deixamos o anúncio pronto como rascunho. Assim que a tabela chegar, mandamos para você aprovar.', 'pt-BR', 'Yes! We already have the ad ready as a draft. As soon as the price list arrives, we will send it for your approval.'),
        M(RENATO, d(-1), 15, 'Great. Please also prepare an email for our customer list, same offer.', 'en-US', 'Ótimo. Preparem também um e-mail para a nossa lista de clientes, com a mesma oferta.'),
        M(CANCHA, d(-1), 17, 'Feito: o e-mail "Year-end prepay offer" já está em E-mails esperando sua aprovação.', 'pt-BR', 'Done: the "Year-end prepay offer" email is in Emails waiting for your approval.'),
      ], lidoAte: { 'u-cancha': 4, 'u-renato': 3 } },
    { id: 't-demo2', canal: 'spraytec', tema: 'Iowa Ag Expo booth', criadaPor: CANCHA.por, em: ts(d(-6), 13), hist: [],
      msgs: [
        M(CANCHA, d(-6), 13, 'Renato, vocês já confirmaram o estande na Iowa Ag Expo (2 a 4 de fevereiro)? Se sim, planejamos convites por e-mail e anúncios na região de Des Moines.', 'pt-BR', 'Renato, have you confirmed the booth at Iowa Ag Expo (Feb 2–4)? If so, we will plan email invites and ads around Des Moines.'),
        M(RENATO, d(-5), 10, 'Confirmed, booth 1417. Let us start the invites in January.', 'en-US', 'Confirmado, estande 1417. Vamos começar os convites em janeiro.'),
      ], lidoAte: { 'u-cancha': 2, 'u-renato': 2 } },
    { id: 't-demo3', canal: 'produtora', tema: 'Nodofix testimonial shoot', criadaPor: CANCHA.por, em: ts(d(-5), 12), ref: 'v:v-demo2', hist: [],
      msgs: [
        M(CANCHA, d(-5), 12, 'Hi! The Nodofix script is approved. The grower is available on Thursday morning. Can you make it?', 'en-US'),
        M(PROD, d(-4), 9, 'Yes, Thursday 8am works. We will bring the drone too.', 'en-US', 'Sim, quinta às 8h dá certo. Vamos levar o drone também.'),
      ], lidoAte: { 'u-cancha': 1, 'u-produtora': 2 } },
  );

  // ---------- SEO: palavras e posições (3 meses) ----------
  const m = (n: number) => mesDe(ancora, n);
  const pal = (id: string, termo: string, produtos: string[], pos: (number | null)[], cli: number[]) => ({ id, termo, produtos, nota: '',
    meses: pos.map((p, i) => ({ mes: m(i - 3), posicao: p, cliques: cli[i], impressoes: cli[i] * 22, origem: 'exemplo' })) });
  e.palavras.push(
    pal('k-demo1', 'spraytec', [], [1, 1, 1], [210, 236, 251]),
    pal('k-demo2', 'foliar fertilizer for soybeans', ['fulltec-boron-max'], [24, 17, 12], [3, 8, 15]),
    pal('k-demo3', 'boron for soybeans', ['fulltec-boron-max'], [9, 8, 11], [14, 16, 11]),
    pal('k-demo4', 'soybean seed treatment nitrogen', ['nodofix'], [null, 41, 33], [0, 1, 2]),
    pal('k-demo5', 'best adjuvant for glyphosate', ['fulltec-adjuvant'], [15, 14, 14], [6, 7, 7]),
  );
  // ---------- GEO: perguntas às IAs ----------
  const geo = (id: string, pergunta: string, produtos: string[], res: Record<string, [string, string]>) => ({ id, pergunta, produtos,
    verificacoes: Object.entries(res).map(([ferramenta, [resultado, concorrentes]]) => ({ mes: m(-1), ferramenta, resultado, concorrentes, link: '', origem: 'exemplo' })) });
  e.geo.push(
    geo('g-demo1', 'What is the best foliar boron product for soybeans?', ['fulltec-boron-max'], { chatgpt: ['nao', 'Brand A, Brand B'], gemini: ['citada', 'Brand A'], google_ia: ['nao', 'Brand C'], perplexity: ['sim', ''] }),
    geo('g-demo2', 'Which adjuvant should I use with glyphosate?', ['fulltec-adjuvant'], { chatgpt: ['nao', 'Brand D'], gemini: ['nao', 'Brand D'], google_ia: ['nao', 'Brand D'], perplexity: ['citada', ''] }),
    geo('g-demo3', 'Who makes Fulltec products?', [], { chatgpt: ['sim', ''], gemini: ['sim', ''], google_ia: ['sim', ''], perplexity: ['sim', ''] }),
  );
}
