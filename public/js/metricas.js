// Números das integrações (Meta Ads, Google Ads, Instagram, Facebook, GA4, Search Console), num formato só.
// Cada fonte usa os dados reais quando a integração está conectada e já coletou; senão, dados de EXEMPLO
// (gerados aqui, sempre iguais para a mesma data, e marcados com o selo "Exemplo" na tela).
import { api } from './api.js';
import { S } from './app.js';

let cache = null, carregando = null;
export const limparCache = () => { cache = null; };

export async function metricas() {
  if (cache) return cache;
  if (!carregando) carregando = api('/api/metricas').catch(() => null).then((r) => { cache = montar(r); carregando = null; return cache; });
  return carregando;
}
export const metricasProntas = () => cache;

// ---------- datas ----------
const addDias = (iso, n) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export { addDias };
export const diasEntre = (de, ate) => { const L = []; for (let d = de; d <= ate; d = addDias(d, 1)) L.push(d); return L; };
// Períodos prontos (como no Brasil): o anterior, para comparar, tem o mesmo tamanho logo antes.
export function periodo(preset, hoje = S.hoje) {
  const ontem = addDias(hoje, -1);
  if (preset === 'mes') return { de: hoje.slice(0, 8) + '01', ate: hoje };
  if (preset === 'mes_passado') { const ini = addDias(hoje.slice(0, 8) + '01', -1).slice(0, 8) + '01'; return { de: ini, ate: addDias(hoje.slice(0, 8) + '01', -1) }; }
  const n = Number(preset) || 30;
  return { de: addDias(ontem, -(n - 1)), ate: ontem };
}
export function anterior(p) {
  const n = diasEntre(p.de, p.ate).length;
  return { de: addDias(p.de, -n), ate: addDias(p.de, -1) };
}
const dentro = (p) => (x) => x.d >= p.de && x.d <= p.ate;

// ---------- dados reais → formato do portal ----------
function contatosMeta(acoes = {}) {
  if (acoes.lead != null) return acoes.lead;
  return (acoes['offsite_conversion.fb_pixel_lead'] || 0) + (acoes['onsite_conversion.lead_grouped'] || 0) + (acoes.complete_registration || 0);
}
function montar(r) {
  const sit = r?.situacao || {};
  const real = (fonte, tem) => !!(sit[fonte]?.ultimoOk && tem);
  const ex = exemplo(S.hoje);
  const M = { fontes: {}, midia: { dias: [], campanhas: {}, anuncios: [], adDias: [] }, ig: null, fb: null, ga4: null, gsc: ex.gsc };
  const fonte = (k, eReal) => { M.fontes[k] = { real: eReal, ultimoOk: sit[k]?.ultimoOk || null, erro: sit[k]?.erro || null, tentativa: sit[k]?.tentativa || null }; };

  // Meta Ads
  const metaReal = real('ads', r?.ads?.dias?.length);
  fonte('ads', metaReal);
  if (metaReal) {
    for (const a of r.ads.anuncios) {
      const c = a.campaign || {};
      M.midia.campanhas['m:' + c.id] = M.midia.campanhas['m:' + c.id] || { canal: 'meta', id: 'm:' + c.id, nome: c.name, objetivo: c.objective, status: a.effective_status };
      M.midia.anuncios.push({ canal: 'meta', id: 'm:' + a.id, nome: a.name, campanha: 'm:' + c.id, status: a.effective_status, img: a.creative?.image_url || a.creative?.thumbnail_url || '', titulo: a.creative?.title || '', texto: a.creative?.body || '' });
    }
    for (const x of r.ads.dias) {
      const linha = { d: x.d, canal: 'meta', campanha: 'm:' + x.campanha, investido: x.investido, impressoes: x.impressoes, cliques: x.cliques, contatos: contatosMeta(x.acoes) };
      M.midia.dias.push(linha); M.midia.adDias.push({ ...linha, ad: 'm:' + x.ad });
    }
  } else { mesclarMidia(M, ex, 'meta'); }
  // Google Ads
  const gReal = real('gads', r?.gads?.dias?.length);
  fonte('gads', gReal);
  if (gReal) {
    for (const c of r.gads.campanhas) M.midia.campanhas['g:' + c.id] = { canal: 'google', id: 'g:' + c.id, nome: c.nome, tipo: c.tipo, status: c.status, orcamentoDia: c.orcamentoDia };
    for (const x of r.gads.dias) M.midia.dias.push({ d: x.d, canal: 'google', campanha: 'g:' + x.campanha, investido: x.investido, impressoes: x.impressoes, cliques: x.cliques, contatos: x.contatos ?? x.conversoes });
    for (const a of r.gads.anuncios) M.midia.anuncios.push({ canal: 'google', id: 'g:' + a.id, nome: a.nome || a.titulos?.[0] || a.grupo, campanha: 'g:' + a.campanha, status: a.status, titulo: a.titulos?.[0] || '', texto: a.descricoes?.[0] || '' });
    for (const x of r.gads.adDias) M.midia.adDias.push({ d: x.d, canal: 'google', ad: 'g:' + x.ad, investido: x.investido, impressoes: x.impressoes, cliques: x.cliques, contatos: x.contatos ?? x.conversoes });
  } else { mesclarMidia(M, ex, 'google'); }
  // Instagram
  const igReal = real('ig', r?.ig?.perfil);
  fonte('ig', igReal);
  M.ig = igReal ? {
    perfil: { nome: r.ig.perfil.username, titulo: r.ig.perfil.name, bio: r.ig.perfil.biography || '', seguidores: r.ig.perfil.followers_count, seguindo: r.ig.perfil.follows_count, publicacoes: r.ig.perfil.media_count, foto: r.ig.perfil.profile_picture_url },
    // Stories: só os das últimas 24 h (os links das imagens vencem; guardar cópia depende do Drive).
    stories: (r.ig.stories || []).filter((x) => Date.now() - Date.parse(x.timestamp) < 864e5).map((x) => ({ id: x.id, ts: x.timestamp, img: x.thumbnail_url || x.media_url || '', link: x.permalink, alcance: x.metricas?.reach ?? null, views: x.metricas?.views ?? null })),
    seguidores: r.ig.dias.map((x) => ({ d: x.d, v: x.seguidores })).sort((a, b) => a.d.localeCompare(b.d)),
    posts: r.ig.posts.map((m) => ({ id: m.id, d: (m.timestamp || '').slice(0, 10), ts: m.timestamp, tipo: m.media_product_type === 'REELS' ? 'reel' : m.media_type === 'CAROUSEL_ALBUM' ? 'carrossel' : m.media_type === 'VIDEO' ? 'video' : 'imagem',
      texto: m.caption || '', img: m.thumbnail_url || m.media_url || '', link: m.permalink, alcance: m.metricas?.reach ?? null, views: m.metricas?.views ?? null,
      curtidas: m.like_count ?? m.metricas?.likes ?? 0, comentarios: m.comments_count ?? m.metricas?.comments ?? 0, salvos: m.metricas?.saved ?? null, compart: m.metricas?.shares ?? null,
      interacoes: m.metricas?.total_interactions ?? ((m.like_count || 0) + (m.comments_count || 0)) })),
  } : ex.ig;
  // Facebook
  const fbReal = real('fb', r?.fb?.perfil);
  fonte('fb', fbReal);
  M.fb = fbReal ? {
    perfil: { nome: r.fb.perfil.name, seguidores: r.fb.perfil.followers_count ?? r.fb.perfil.fan_count, foto: r.fb.perfil.picture?.data?.url, capa: r.fb.perfil.cover?.source || '', link: r.fb.perfil.link },
    seguidores: r.fb.dias.map((x) => ({ d: x.d, v: x.seguidores })).sort((a, b) => a.d.localeCompare(b.d)),
    posts: r.fb.posts.map((p) => ({ id: p.id, d: (p.created_time || '').slice(0, 10), ts: p.created_time, tipo: 'post', texto: p.message || '', img: p.full_picture || '', link: p.permalink_url,
      alcance: p.metricas?.post_impressions_unique ?? null, cliques: p.metricas?.post_clicks ?? null, curtidas: p.reacoes || 0, comentarios: p.comentarios || 0, compart: p.compartilhamentos || 0,
      interacoes: (p.reacoes || 0) + (p.comentarios || 0) + (p.compartilhamentos || 0) })),
  } : ex.fb;
  // Google Analytics
  const gaReal = real('ga4', r?.ga4?.dias?.length);
  fonte('ga4', gaReal);
  M.ga4 = gaReal ? { dias: r.ga4.dias, canais: r.ga4.canais, paginas: r.ga4.paginas, eventos: r.ga4.eventos } : ex.ga4;
  fonte('gsc', false);
  return M;
}
function mesclarMidia(M, ex, canal) {
  for (const [k, c] of Object.entries(ex.midia.campanhas)) if (c.canal === canal) M.midia.campanhas[k] = c;
  M.midia.dias.push(...ex.midia.dias.filter((x) => x.canal === canal));
  M.midia.anuncios.push(...ex.midia.anuncios.filter((x) => x.canal === canal));
  M.midia.adDias.push(...ex.midia.adDias.filter((x) => x.canal === canal));
}

// ---------- somas ----------
export function somar(L) {
  const t = { investido: 0, impressoes: 0, cliques: 0, contatos: 0 };
  for (const x of L) { t.investido += x.investido || 0; t.impressoes += x.impressoes || 0; t.cliques += x.cliques || 0; t.contatos += x.contatos || 0; }
  t.cpl = t.contatos ? t.investido / t.contatos : null;
  t.ctr = t.impressoes ? t.cliques / t.impressoes : null;
  t.cpc = t.cliques ? t.investido / t.cliques : null;
  return t;
}
export const filtrar = (L, p, f = () => true) => L.filter((x) => dentro(p)(x) && f(x));
// Série diária (um valor por dia, zeros onde não há dado).
export function serie(L, p, campo, f = () => true) {
  const m = new Map();
  for (const x of L) if (dentro(p)(x) && f(x)) m.set(x.d, (m.get(x.d) || 0) + (x[campo] || 0));
  return diasEntre(p.de, p.ate).map((d) => ({ d, v: m.get(d) || 0 }));
}

// ---------- dados de exemplo ----------
// Gerador com semente: os mesmos números sempre (não "pulam" a cada visita).
function rng(semente) {
  let a = semente >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const sementeDe = (s) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) | 0, 7);
let exCache = null;
function exemplo(hoje) {
  if (exCache?.hoje === hoje) return exCache.dados;
  const dias = diasEntre(addDias(hoje, -180), addDias(hoje, -1));
  const sem = (d) => new Date(d + 'T12:00:00Z').getUTCDay();
  const fimDeSemana = (d) => [0, 6].includes(sem(d));
  // Sazonalidade do Meio-Oeste: mais procura no inverno (compra de insumos) e na pós-colheita.
  const sazon = (d) => { const m = +d.slice(5, 7); return { 1: 1.2, 2: 1.3, 3: 1.25, 4: 1.1, 5: 0.95, 6: 0.9, 7: 0.85, 8: 0.9, 9: 0.8, 10: 0.95, 11: 1.15, 12: 1.2 }[m]; };
  const midia = { dias: [], campanhas: {}, anuncios: [], adDias: [] };
  const camp = (canal, id, nome, objetivo, base, cpm, ctr, conv) => ({ canal, id, nome, objetivo, base, cpm, ctr, conv, status: 'ACTIVE' });
  const C = [
    camp('meta', 'm:ex1', 'Leads | Early order 2027 (seed treatment)', 'OUTCOME_LEADS', 52, 14, 0.011, 0.075),
    camp('meta', 'm:ex2', 'Remarketing | Site visitors 30d', 'OUTCOME_LEADS', 18, 22, 0.016, 0.09),
    camp('meta', 'm:ex3', 'Awareness | Fulltec brand', 'OUTCOME_AWARENESS', 26, 6.5, 0.005, 0.01),
    camp('google', 'g:ex1', 'Search | Brand (Spraytec, Fulltec)', 'SEARCH', 22, 55, 0.12, 0.11),
    camp('google', 'g:ex2', 'Search | Foliar nutrition & adjuvants', 'SEARCH', 34, 38, 0.045, 0.05),
    camp('google', 'g:ex3', 'Performance Max | Products', 'PERFORMANCE_MAX', 30, 9, 0.009, 0.035),
    camp('google', 'g:ex4', 'Display | Remarketing', 'DISPLAY', 12, 3.5, 0.004, 0.02),
  ];
  const ads = [
    ['meta', 'm:exa1', 'm:ex1', 'Use it once… Trust it always (feed)', '/dados/exemplo/anuncio-2.jpg'], ['meta', 'm:exa2', 'm:ex1', 'Use it once… Trust it always (Stories)', '/dados/exemplo/anuncio-3.jpg'],
    ['meta', 'm:exa3', 'm:ex2', 'Low rates, high yields', '/dados/exemplo/anuncio-8.jpg'], ['meta', 'm:exa4', 'm:ex3', 'Anticipating the agriculture of the future', '/dados/exemplo/anuncio-5.jpg'],
    ['google', 'g:exa1', 'g:ex1', 'Spraytec Fertilizers | Fulltec Product Line', ''], ['google', 'g:exa2', 'g:ex2', 'Boron for Soybeans | Fulltec Boron Max', ''],
    ['google', 'g:exa3', 'g:ex4', 'Anticipating the future (Display)', '/dados/exemplo/anuncio-4.jpg'],
  ];
  for (const c of C) midia.campanhas[c.id] = { canal: c.canal, id: c.id, nome: c.nome, objetivo: c.objetivo, tipo: c.objetivo, status: c.status };
  for (const [canal, id, campanha, nome, img] of ads) midia.anuncios.push({ canal, id, campanha, nome, img, titulo: nome, status: 'ACTIVE' });
  for (const d of dias) {
    const r = rng(sementeDe(d));
    for (const c of C) {
      const invest = c.base * sazon(d) * (fimDeSemana(d) ? 0.82 : 1) * (0.85 + r() * 0.3);
      const imp = Math.round((invest / c.cpm) * 1000);
      const cli = Math.round(imp * c.ctr * (0.8 + r() * 0.4));
      const cont = Math.round(cli * c.conv * (0.6 + r() * 0.8) + (r() < (cli * c.conv) % 1 ? 1 : 0));
      const linha = { d, canal: c.canal, campanha: c.id, investido: Math.round(invest * 100) / 100, impressoes: imp, cliques: cli, contatos: cont };
      midia.dias.push(linha);
      const meus = ads.filter((a) => a[2] === c.id);
      meus.forEach(([canal, ad], i) => {
        const peso = meus.length === 1 ? 1 : i === 0 ? 0.62 : 0.38;
        // "Low rates, high yields" cansando: a taxa de clique cai na última semana (para a demonstração mostrar o alerta).
        const cansa = ad === 'm:exa3' && d >= addDias(hoje, -7) ? 0.55 : 1;
        const fator = meus.length === 1 ? 1 : i === 0 ? 1.1 : 0.85;
        midia.adDias.push({ d, canal, ad, investido: linha.investido * peso, impressoes: Math.round(imp * peso), cliques: Math.round(cli * peso * cansa), contatos: Math.round(cont * peso * fator * cansa) });
      });
    }
  }
  // Redes sociais: seguidores crescendo devagar; posts 2 a 3 por semana com as imagens dos anúncios.
  const imgs = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `/dados/exemplo/anuncio-${n}.jpg`);
  const legendas = [
    'Harvest is wrapping up across Iowa. Now is the time to think about your soil. #TractusCarbon #SoilHealth',
    'Use it once… trust it always. Nutrition, plant health and application technology in one solution.',
    'Low rates, high yields. A few ounces per acre, measurable results. #Fulltec',
    'See you at the Farm Science Review! Stop by and talk to our agronomists.',
    'Boron makes the difference at flowering. Fulltec Boron Max: two sources, long-lasting effect.',
    'Thank you, growers, for another great season. 🌽🌱',
    'Early order for 2027 is open. Book your seed treatment now. #Nodofix #FulltecPlusST',
    'Tank cleaning matters: Omega reduces the risk of cross-contamination.',
  ];
  const posts = (rede, base) => {
    const L = []; let i = 0;
    for (let k = dias.length - 1; k >= 0 && L.length < 30; k -= 2 + (k % 3)) {
      const d = dias[k], r = rng(sementeDe(rede + d));
      const alcance = Math.round(base * (0.5 + r() * 1.2));
      const curt = Math.round(alcance * (0.03 + r() * 0.04)), com = Math.round(curt * (0.04 + r() * 0.08)), comp = Math.round(curt * (0.02 + r() * 0.06)), salv = Math.round(curt * (0.05 + r() * 0.1));
      L.push({ id: rede + '-ex' + i, d, ts: d + 'T15:00:00Z', tipo: rede === 'ig' ? ['imagem', 'reel', 'carrossel'][i % 3] : 'post', texto: legendas[i % legendas.length], img: imgs[i % imgs.length], link: '',
        alcance, views: Math.round(alcance * 1.6), curtidas: curt, comentarios: com, compart: comp, salvos: rede === 'ig' ? salv : null, cliques: rede === 'fb' ? Math.round(alcance * 0.02) : null,
        interacoes: curt + com + comp + (rede === 'ig' ? salv : 0) });
      i++;
    }
    return L;
  };
  const seguidores = (ini, ganho) => dias.map((d, i) => ({ d, v: Math.round(ini + ganho * i + Math.sin(i / 9) * 6) }));
  const ig = { perfil: { nome: 'spraytecusa', titulo: 'Spraytec USA', bio: 'Fulltec line · Nutrition, plant health and application technology 🌱\nUrbandale, Iowa · (515) 252-7777\nspraytecusa.com', seguidores: 0, seguindo: 318, publicacoes: 412 }, seguidores: seguidores(4310, 2.9), posts: posts('ig', 2100),
    stories: [['Harvest', 7], ['Early order', 1], ['Field day', 3], ['Tractus', 6]].map(([nome, n], i) => ({ id: 'st-ex' + i, nome, ts: addDias(hoje, 0) + 'T1' + i + ':00:00Z', img: imgs[n - 1], alcance: 380 + i * 57, views: 520 + i * 61 })) };
  ig.perfil.seguidores = ig.seguidores.at(-1).v;
  const fb = { perfil: { nome: 'Spraytec', bio: 'Spraytec Fertilizers · Fulltec line. Urbandale, Iowa.', seguidores: 0, capa: imgs[0] }, seguidores: seguidores(12050, 1.6), posts: posts('fb', 1600) };
  fb.perfil.seguidores = fb.seguidores.at(-1).v;
  // Site (GA4) e Search Console.
  const ga4 = { dias: [], canais: [], paginas: [], eventos: [] };
  const CANAIS = [['Organic Search', 0.34, 0.012], ['Paid Search', 0.21, 0.035], ['Paid Social', 0.17, 0.022], ['Direct', 0.15, 0.01], ['Email', 0.07, 0.03], ['Referral', 0.06, 0.008]];
  const PAGS = [['/', 0.3], ['/products', 0.18], ['/products/tractus-carbon', 0.09], ['/programs', 0.1], ['/products/fulltec-boron-max', 0.07], ['/contact', 0.08], ['/early-order-2027', 0.1], ['/about', 0.05], ['/careers', 0.03]];
  for (const d of dias) {
    const r = rng(sementeDe('ga' + d));
    const s = Math.round(190 * sazon(d) * (fimDeSemana(d) ? 0.6 : 1) * (0.85 + r() * 0.3));
    let ev = 0;
    for (const [canal, p, conv] of CANAIS) { const ss = Math.round(s * p * (0.85 + r() * 0.3)); const e = Math.round(ss * conv * (0.5 + r())); ev += e; ga4.canais.push({ d, canal, sessoes: ss, eventosChave: e }); }
    ga4.dias.push({ d, sessoes: s, usuarios: Math.round(s * 0.82), novos: Math.round(s * 0.61), engajadas: Math.round(s * 0.58), visualizacoes: Math.round(s * 2.3), eventosChave: ev });
    for (const [pagina, p] of PAGS) ga4.paginas.push({ d, pagina, visualizacoes: Math.round(s * 2.3 * p * (0.8 + r() * 0.4)) });
    if (ev) ga4.eventos.push({ d, evento: 'generate_lead', eventosChave: ev });
  }
  const consultas = [['spraytec', 251, 980, 1.0], ['fulltec', 88, 610, 1.4], ['fulltec boron max', 41, 420, 2.1], ['foliar fertilizer for soybeans', 15, 1830, 12.3], ['boron for soybeans', 11, 1520, 10.8],
    ['tractus carbon', 27, 240, 1.2], ['nodofix', 19, 160, 1.6], ['best adjuvant for glyphosate', 7, 2210, 14.2], ['soybean seed treatment nitrogen', 2, 940, 33.0], ['tank cleaner for sprayer', 5, 1150, 18.6]]
    .map(([termo, cliques, impressoes, posicao]) => ({ termo, cliques, impressoes, ctr: cliques / impressoes, posicao }));
  const gsc = { consultas, dias: dias.map((d) => { const r = rng(sementeDe('gsc' + d)); const imp = Math.round(330 * sazon(d) * (0.8 + r() * 0.4)); return { d, impressoes: imp, cliques: Math.round(imp * 0.055 * (0.8 + r() * 0.4)) }; }) };
  const dados = { midia, ig, fb, ga4, gsc };
  exCache = { hoje, dados };
  return dados;
}
