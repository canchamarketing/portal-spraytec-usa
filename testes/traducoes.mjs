// Confere se as traduções estão completas: toda chave usada no código existe nos dois idiomas,
// e os dois arquivos têm as mesmas chaves. Uso: node testes/traducoes.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
const pt = JSON.parse(readFileSync('public/i18n/pt-BR.json', 'utf8'));
const en = JSON.parse(readFileSync('public/i18n/en-US.json', 'utf8'));
const arqs = [];
const anda = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) anda(p); else if (/\.(js|ts)$/.test(f)) arqs.push(p); } };
anda('public/js'); anda('server');
const usadas = new Set();
for (const a of arqs) {
  const s = readFileSync(a, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'([a-z_]+\.[\w.]+)'/g)) usadas.add(m[1]);
  for (const m of s.matchAll(/\btn\(\s*'([a-z_]+\.[\w.]+)'/g)) { usadas.add(m[1] + '.um'); usadas.add(m[1] + '.varios'); }
  for (const m of s.matchAll(/'((?:erro|hist|aviso|campo|login|email)\.[\w.]+)'/g)) usadas.add(m[1]);
}
// Famílias montadas no código (chave + variável).
const fam = {
  nav: ['inicio', 'conversas', 'performance', 'redes', 'integracoes', 'mensagens', 'rotacoes', 'safra', 'produtos', 'resultados', 'feedbacks', 'planejamento', 'roteiros', 'emails', 'site', 'seo', 'pessoas', 'historico', 'conta'],
  papel: ['cancha', 'aprovador', 'leitor', 'produtora', 'cancha.explica', 'aprovador.explica', 'leitor.explica', 'produtora.explica'],
  st_anuncio: ['rascunho', 'aprovacao', 'ajuste', 'ajustando', 'aprovado', 'continua', 'no_ar', 'encerrado'],
  st_rotacao: ['montando', 'aprovacao', 'aprovada', 'no_ar', 'encerrada'],
  semaforo: ['bem', 'atencao', 'cansado'], canal: ['meta', 'google'],
  local: ['feed', 'stories', 'reels', 'pesquisa', 'youtube', 'display', 'pmax'],
  formato: ['imagem', 'video', 'carrossel', 'texto'],
  objetivo: ['contatos', 'lembrar', 'marca', 'protecao', 'concorrentes'].flatMap((o) => [o, o + '.explica']),
  passo: ['montar', 'aprovar', 'no_ar', 'resultado'].flatMap((p) => [p, p + '.dica']),
  'rot.frase': ['montando', 'aprovacao', 'ajustes', 'aprovada', 'no_ar', 'encerrada'].flatMap((s) => [s + '.cancha', s + '.cliente']),
  evento: ['fase', 'feira', 'foco', 'campanha', 'recesso'].flatMap((e) => [e, e + '.plural']),
  cat: ['adjuvante', 'semente', 'fitoestimulante', 'forrageira', 'solo'],
  janela: ['all', 'aerial', 'plantio', 'veg', 'rep', 'preplant'],
  'perf.aba': ['funil', 'midia', 'site', 'social', 'email'], 'chat.canal': ['spraytec', 'produtora'],
  funil: ['vistos', 'cliques', 'visitas', 'contatos', 'vendas'].flatMap((k) => [k, k + '.ajuda', k + '.de']),
  'painel.p': ['7', '30', '90', 'mes', 'mes_passado'],
  soc: ['novos', 'alcance', 'interacoes', 'engajamento'].flatMap((k) => [k, k + '.ajuda']),
  'soc.tipo': ['imagem', 'reel', 'carrossel', 'video', 'post'], 'soc.ordem': ['recentes', 'melhores'],
  ga: ['sessoes', 'usuarios', 'contatos', 'conversao', 'engajamento', 'cliques_google', 'impressoes_google', 'ctr_google'].flatMap((k) => [k, k + '.ajuda']).concat(['de_onde.ajuda']),
  'ga.canal': ['organico', 'busca_paga', 'social_pago', 'social', 'direto', 'email', 'referencia', 'display', 'pmax', 'outro'],
  'int.para': ['ads', 'ig', 'fb', 'gads', 'ga4', 'gsc', 'drive', 'brevo', 'traducao'], 'int.precisa': ['ads', 'ig', 'fb', 'gads', 'ga4', 'gsc', 'drive', 'brevo', 'traducao'],
  ritmo: ['ok', 'acima', 'abaixo', 'ajuda'],
  st_item: ['rascunho', 'aprovacao', 'ajuste', 'ajustando', 'aprovado', 'producao', 'corte', 'ajuste_corte', 'entregue', 'enviado', 'publicado'],
  tipo: ['planos', 'roteiros', 'emails', 'paginas'],
  'item.novo': ['planos', 'roteiros', 'emails', 'paginas'],
  'item.ap_explica': ['planos', 'roteiros', 'emails', 'paginas'],
  'item.concluir': ['emails', 'paginas'], 'item.concluir_explica': ['emails', 'paginas'],
  'item.formato': ['vertical', 'horizontal', 'quadrado'],
  campo: ['foco', 'verbaMeta', 'verbaGoogle', 'produtos', 'eventos', 'notas', 'titulo', 'objetivo', 'duracao', 'formato', 'roteiro', 'referencias', 'prazo',
    'assunto', 'preheader', 'lista', 'envio', 'linkPrevia', 'url', 'publicacao', 'descricao', 'pagina', 'titulo_pedido', 'periodo', 'termo', 'pergunta', 'link_video'],
  'check.emails': ['lista', 'assunto', 'links', 'utm', 'teste', 'descadastro', 'celular'].flatMap((k) => [k, k + '.dica']),
  'check.paginas': ['pixel_meta', 'tag_google', 'conversao', 'formulario', 'salesforce', 'celular', 'velocidade'].flatMap((k) => [k, k + '.dica']),
  'check.titulo': ['emails', 'paginas'], 'check.explica': ['emails', 'paginas'],
  'video.frase.producao': ['produtora', 'aprovador', 'cancha'], 'video.frase.corte': ['produtora', 'aprovador', 'cancha'],
  'video.frase.ajuste_corte': ['produtora', 'aprovador', 'cancha'], 'video.frase.entregue': ['produtora', 'aprovador', 'cancha'],
  'rv.col': ['rascunho', 'aprovacao', 'aprovado', 'producao', 'corte', 'entregue'].flatMap((k) => [k, k + '.dica']),
  'em.filtro': ['todos', 'aprovar', 'prontos', 'enviados'],
  'fb.tipo': ['elogio', 'problema', 'ideia', 'leads'].flatMap((k) => [k, k + '.explica']),
  'fb.st': ['aberto', 'respondido', 'resolvido'],
  'fb.qualidade': ['bons', 'mistos', 'ruins', 'nao_agricultor', 'ja_cliente', 'virou_venda'],
  'obs.assunto': ['verba', 'produto', 'evento', 'publico', 'criativo', 'outro'],
  'obs.destino': ['atendida', 'adiada', 'nao_aplica', 'nenhum'],
  'pedido.st': ['aberto', 'fazendo', 'feito'],
  'seo.aba': ['seo', 'geo'], 'geo.ia': ['chatgpt', 'gemini', 'google_ia', 'perplexity'],
  'geo.res': ['sim', 'citada', 'nao'].flatMap((k) => [k, k + '.explica']),
  res: ['investimento', 'impressoes', 'cliques', 'ctr', 'contatos', 'cpl', 'enviados', 'abertura', 'taxa_clique', 'descadastros', 'visitas', 'conversoes', 'taxa_conversao'].flatMap((k) => [k, k + '.ajuda']).concat(['aberturas']),
};
for (const [p, L] of Object.entries(fam)) for (const k of L) usadas.add(p + '.' + k);
for (const k of ['rot.prazo.ajuda', 'anuncio.publico.ajuda', 'anuncio.link.ajuda', 'rv.explica', 'rv.explica_produtora', 'plano.vazio_cancha', 'plano.vazio_cliente',
  'res.brevo_dica', 'res.ga4_dica', 'res.digitar_brevo', 'res.digitar_ga4', 'inicio.kpi_em_andamento', 'inicio.kpi_tarefas', 'inicio.nada_produtora', 'app.por', 'res.cansando.ajuda', 'gsc.ajuda', 'seo.aba.site', 'res.f_contatos_mais', 'res.f_contatos_menos', 'res.f_cpl_caiu', 'res.f_cpl_subiu', 'redes.compartilhamentos', 'redes.visualizacoes']) usadas.add(k);
// Chaves montadas com prefixo + variável terminam em ponto no código: não são chaves de verdade.
for (const k of [...usadas]) if (k.endsWith('.')) usadas.delete(k);
let falhas = 0;
for (const k of usadas) for (const [nome, d] of [['pt-BR', pt], ['en-US', en]]) if (d[k] == null) { falhas++; console.log(`FALTA em ${nome}: ${k}`); }
for (const k of Object.keys(pt)) if (en[k] == null) { falhas++; console.log('só em pt-BR:', k); }
for (const k of Object.keys(en)) if (pt[k] == null) { falhas++; console.log('só em en-US:', k); }
// Os mesmos {parâmetros} nos dois idiomas.
for (const k of Object.keys(pt)) {
  const a = (pt[k].match(/\{\w+\}/g) || []).sort().join(), b = (en[k]?.match(/\{\w+\}/g) || []).sort().join();
  if (en[k] != null && a !== b) { falhas++; console.log(`parâmetros diferentes em ${k}: pt ${a} / en ${b}`); }
}
console.log(falhas ? `${falhas} problema(s)` : `ok: ${usadas.size} chaves usadas, ${Object.keys(pt).length} em cada idioma`);
process.exit(falhas ? 1 : 0);
