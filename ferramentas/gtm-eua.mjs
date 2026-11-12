// Corrige o Google Tag Manager do spraytecusa.com (GTM-NSBLCM35) pela API, a partir deste computador.
// Só EDITA: tudo vai para um espaço de trabalho separado ("Cancha - conversões EUA"); nada é publicado
// por aqui. Quem confere no "Visualizar" e publica é uma pessoa, pela tela do GTM (e dá para voltar à
// versão anterior com um clique).
//
// A credencial (.segredos/gtm-cliente.json, tipo "App para computador") e a autorização
// (.segredos/gtm-token.json) ficam só neste computador, fora do git.
//
// Uso (na pasta do projeto):
//   node ferramentas/gtm-eua.mjs entrar      autoriza com a conta analytics@canchamarketing.com.br
//   node ferramentas/gtm-eua.mjs auditar     mostra tags, gatilhos e variáveis da versão publicada
//   node ferramentas/gtm-eua.mjs corrigir    monta as correções no espaço de trabalho (não publica)
//   node ferramentas/gtm-eua.mjs ver         o que mudou no espaço de trabalho e se compila sem erro
//
// O que "corrigir" faz (diagnóstico de 12/11/2026):
//   1. Apaga a tag do GA4 que manda o evento lixo "gtm.js" em toda página (nome do evento = {{Event}}).
//   2. Google Ads: a conversão "[Enviou Form LP]" disparava duas vezes por lead (no envio do formulário,
//      mesmo com erro, e na página de obrigado). Fica um disparo só por lead.
//   3. Um sinal único de lead para todos os formulários do Elementor: página de obrigado (formulários que
//      redirecionam) ou envio que deu certo (formulários que não redirecionam). Nunca os dois no mesmo envio.
//   4. Esse lead dispara: evento form_submit_lp no GA4 (com o nome do formulário), a conversão do Google Ads
//      e o "Lead" do pixel da Meta (hoje a Meta não recebe nenhum lead).
//   5. Apaga ouvintes sem uso (rolagem e cliques que não alimentavam nenhuma tag).
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { join } from 'node:path';

const PUBLICO = 'GTM-NSBLCM35';
const CONVERSAO = '454894844';
const ESPACO = 'Cancha - conversões EUA';
const PASTA = join(import.meta.dirname, '..', '.segredos');
const CLIENTE = join(PASTA, 'gtm-cliente.json'), TOKEN = join(PASTA, 'gtm-token.json');
const ESCOPOS = ['https://www.googleapis.com/auth/tagmanager.edit.containers'];
const GTM = 'https://tagmanager.googleapis.com/tagmanager/v2';

// ---------- autorização ----------
const cliente = () => {
  if (!existsSync(CLIENTE)) throw new Error('Falta o arquivo .segredos/gtm-cliente.json (credencial "App para computador" do Google Cloud).');
  const j = JSON.parse(readFileSync(CLIENTE, 'utf8'));
  return j.installed || j.web;
};
async function pedirToken(params) {
  const c = cliente();
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, ...params }) });
  const j = await r.json();
  if (!r.ok) throw new Error('O Google recusou a autorização: ' + (j.error_description || j.error));
  return j;
}
async function entrar() {
  const c = cliente(), estado = randomBytes(16).toString('hex'), verificador = randomBytes(32).toString('base64url');
  const desafio = createHash('sha256').update(verificador).digest('base64url');
  const srv = createServer();
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const retorno = `http://127.0.0.1:${srv.address().port}`;
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id: c.client_id, redirect_uri: retorno, response_type: 'code', scope: ESCOPOS.join(' '), access_type: 'offline',
    prompt: 'consent select_account', login_hint: 'analytics@canchamarketing.com.br', state: estado, code_challenge: desafio, code_challenge_method: 'S256',
  });
  console.log('Abrindo o navegador para autorizar. Se não abrir, copie este endereço:\n' + url + '\n');
  spawn('rundll32', ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' }).unref();
  const codigo = await new Promise((ok, erro) => {
    const limite = setTimeout(() => erro(new Error('Ninguém autorizou em 10 minutos.')), 600e3);
    srv.on('request', (req, res) => {
      const q = new URL(req.url, retorno).searchParams;
      if (!q.get('code') && !q.get('error')) { res.end(); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(q.get('code') && q.get('state') === estado ? '<h2>Pronto. Pode fechar esta aba e voltar para o Claude.</h2>' : '<h2>A autorização não foi concluída.</h2>');
      clearTimeout(limite);
      q.get('code') && q.get('state') === estado ? ok(q.get('code')) : erro(new Error('Autorização cancelada: ' + (q.get('error') || 'estado inválido')));
    });
  }).finally(() => srv.close());
  const t = await pedirToken({ code: codigo, redirect_uri: retorno, grant_type: 'authorization_code', code_verifier: verificador });
  const faltam = ESCOPOS.filter((e) => !String(t.scope).split(' ').includes(e));
  if (faltam.length) throw new Error('Faltou marcar permissões: ' + faltam.join(', '));
  mkdirSync(PASTA, { recursive: true });
  writeFileSync(TOKEN, JSON.stringify({ refresh: t.refresh_token, em: new Date().toISOString() }), { mode: 0o600 });
  console.log('Autorizado. A autorização ficou guardada em .segredos/gtm-token.json (fora do git).');
}
let acesso = null;
async function token() {
  if (acesso) return acesso;
  if (!existsSync(TOKEN)) throw new Error('Rode antes: node ferramentas/gtm-eua.mjs entrar');
  acesso = (await pedirToken({ refresh_token: JSON.parse(readFileSync(TOKEN, 'utf8')).refresh, grant_type: 'refresh_token' })).access_token;
  return acesso;
}
async function api(metodo, url, corpo) {
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(url, { method: metodo, headers: { authorization: 'Bearer ' + (await token()), ...(corpo ? { 'content-type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    if (r.status === 204) return {};
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 && tentativa < 5) { await new Promise((ok) => setTimeout(ok, 4000 * (tentativa + 1))); continue; } // limite de uso da API do GTM
    if (!r.ok) throw new Error(`${metodo} ${url.replace(GTM, '')}: ${j.error?.message || r.status}`);
    return j;
  }
}

// ---------- achar o contêiner GTM-NSBLCM35 ----------
async function conteiner() {
  for (const a of (await api('GET', `${GTM}/accounts`)).account || [])
    for (const c of (await api('GET', `${GTM}/accounts/${a.accountId}/containers`)).container || [])
      if (c.publicId === PUBLICO) return { base: `${GTM}/accounts/${a.accountId}/containers/${c.containerId}`, conta: a.name, nome: c.name };
  throw new Error(`A conta autorizada não enxerga o contêiner ${PUBLICO}.`);
}
const par = (x, k) => (x.parameter || []).find((p) => p.key === k)?.value;
const filtros = (t) => [...(t.customEventFilter || []), ...(t.filter || []), ...(t.autoEventFilter || [])]
  .map((f) => `${f.type}(${(f.parameter || []).map((p) => p.value).join(', ')})`).join(' e ');

// ---------- auditar ----------
async function auditar() {
  const C = await conteiner();
  const v = await api('GET', `${C.base}/versions:live`);
  console.log(`Contêiner ${PUBLICO} (${C.nome}, conta ${C.conta}) · versão publicada ${v.containerVersionId} "${v.name || ''}"`);
  const trig = new Map((v.trigger || []).map((t) => [t.triggerId, t]));
  const nomeTrig = (id) => (id === '2147479553' ? 'All Pages' : id === '2147479573' ? 'Initialization' : trig.get(id)?.name || id);
  console.log('\nTAGS');
  for (const t of v.tag || []) console.log(`  ${t.name} [${t.type}]${t.paused ? ' (pausada)' : ''}\n    dispara em: ${(t.firingTriggerId || []).map(nomeTrig).join(' | ')}${par(t, 'eventName') ? `\n    evento: ${par(t, 'eventName')}` : ''}${par(t, 'conversionId') ? `\n    conversão: ${par(t, 'conversionId')}/${par(t, 'conversionLabel')}` : ''}`);
  console.log('\nGATILHOS');
  for (const t of v.trigger || []) console.log(`  ${t.name} [${t.type}] ${filtros(t)}`);
  console.log('\nVARIÁVEIS');
  for (const x of v.variable || []) console.log(`  ${x.name} [${x.type}]`);
}

// ---------- corrigir ----------
const tpl = (key, value) => ({ type: 'template', key, value });
const bool = (key, value) => ({ type: 'boolean', key, value: String(value) });
const filtro = (tipo, a, b) => ({ type: tipo, parameter: [tpl('arg0', a), tpl('arg1', b)] });
// Formulários do Elementor Pro: o envio que deu certo dispara "submit_success" no formulário. Se o formulário
// redireciona (para a página de obrigado), quem conta o lead é a página de obrigado; senão, este ouvinte.
const OUVINTE = `<script>
(function () {
  if (window.__canchaOuvinteLead) return;
  window.__canchaOuvinteLead = true;
  function ligar() {
    if (!window.jQuery) return false;
    window.jQuery(document).on('submit_success', function (e, resp) {
      var r = resp || {};
      var redireciona = (r.data && r.data.redirect_url) || r.redirect_url;
      if (redireciona) return;
      var f = e.target && e.target.closest ? e.target.closest('form') : e.target;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'cancha_lead', form_nome: (f && f.getAttribute('name')) || '' });
    });
    return true;
  }
  if (!ligar()) document.addEventListener('DOMContentLoaded', ligar);
})();
</script>`;
const META_LEAD = `<script>
if (window.fbq) { window.fbq('track', 'Lead', { content_name: document.title }); }
</script>`;

async function corrigir() {
  const C = await conteiner();
  const espacos = (await api('GET', `${C.base}/workspaces`)).workspace || [];
  const ws = espacos.find((w) => w.name === ESPACO) || await api('POST', `${C.base}/workspaces`, { name: ESPACO, description: 'Correções de conversão feitas pela Cancha Marketing (ferramentas/gtm-eua.mjs). Conferir no Visualizar antes de publicar.' });
  const W = `${C.base}/workspaces/${ws.workspaceId}`;
  console.log(`Espaço de trabalho: ${ws.name} (${ws.workspaceId}) · contêiner ${PUBLICO}\n`);
  const lista = async (tipo, chave) => (await api('GET', `${W}/${tipo}`))[chave] || [];
  let tags = await lista('tags', 'tag'), trigs = await lista('triggers', 'trigger'), vars = await lista('variables', 'variable');
  const trig = (id) => trigs.find((t) => t.triggerId === id);
  const salvar = async (tipo, chave, idCampo, atuais, obj) => {
    const atual = atuais.find((x) => x.name === obj.name);
    const r = atual ? await api('PUT', `${W}/${tipo}/${atual[idCampo]}`, { ...atual, ...obj, fingerprint: atual.fingerprint }) : await api('POST', `${W}/${tipo}`, obj);
    console.log(`  ${atual ? 'atualizado' : 'criado'}: ${obj.name}`);
    return r;
  };
  const apagar = async (tipo, idCampo, x, motivo) => { await api('DELETE', `${W}/${tipo}/${x[idCampo]}`); console.log(`  apagado: ${x.name} (${motivo})`); };

  // Encontra as peças pelo que elas fazem (não pelo nome, que pode variar).
  const lixo = tags.filter((t) => t.type === 'gaawe' && par(t, 'eventName') === '{{Event}}');
  const ads = tags.filter((t) => t.type === 'awct' && par(t, 'conversionId') === CONVERSAO);
  const adsNoEnvio = ads.filter((t) => (t.firingTriggerId || []).some((id) => trig(id)?.type === 'formSubmission'));
  const adsObrigado = ads.find((t) => !adsNoEnvio.includes(t));
  const ga4Lead = tags.find((t) => t.type === 'gaawe' && par(t, 'eventName') === 'form_submit_lp');
  const obrigadoExistente = trigs.find((t) => t.type === 'pageview' && /thank-you/.test(filtros(t)));
  if (!adsObrigado && !ads.length) throw new Error('Não achei a conversão do Google Ads ' + CONVERSAO + '. Rode "auditar" e me mostre o resultado.');

  console.log('Novas peças:');
  vars = await lista('variables', 'variable');
  await salvar('variables', 'variable', 'variableId', vars, { name: 'DL - form_nome', type: 'v', parameter: [{ type: 'integer', key: 'dataLayerVersion', value: '2' }, bool('setDefaultValues', false), tpl('name', 'form_nome')] });
  trigs = await lista('triggers', 'trigger');
  const dom = await salvar('triggers', 'trigger', 'triggerId', trigs, { name: 'Cancha - DOM pronto (todas as páginas)', type: 'domReady' });
  const lead = await salvar('triggers', 'trigger', 'triggerId', trigs, { name: 'Cancha - Lead (formulário sem redirecionamento)', type: 'customEvent', customEventFilter: [filtro('equals', '{{_event}}', 'cancha_lead')] });
  const obrigado = obrigadoExistente || await salvar('triggers', 'trigger', 'triggerId', trigs, { name: 'Cancha - Página de obrigado', type: 'pageview', filter: [filtro('contains', '{{Page URL}}', '/thank-you')] });
  const LEAD = [obrigado.triggerId, lead.triggerId];
  tags = await lista('tags', 'tag');
  await salvar('tags', 'tag', 'tagId', tags, { name: 'Cancha - ouvinte de formulários Elementor', type: 'html', firingTriggerId: [dom.triggerId], parameter: [tpl('html', OUVINTE), bool('supportDocumentWrite', false)] });
  await salvar('tags', 'tag', 'tagId', tags, { name: 'Meta Pixel - Lead', type: 'html', firingTriggerId: LEAD, parameter: [tpl('html', META_LEAD), bool('supportDocumentWrite', false)] });

  console.log('\nAjustes:');
  if (adsObrigado) {
    await api('PUT', `${W}/tags/${adsObrigado.tagId}`, { ...adsObrigado, name: 'Google Ads - Conversão [Enviou Form LP] (lead)', firingTriggerId: LEAD });
    console.log(`  atualizado: ${adsObrigado.name} → dispara uma vez por lead (página de obrigado ou envio sem redirecionamento)`);
  }
  if (ga4Lead) {
    const outros = (ga4Lead.parameter || []).filter((p) => p.key !== 'eventSettingsTable');
    await api('PUT', `${W}/tags/${ga4Lead.tagId}`, { ...ga4Lead, firingTriggerId: LEAD, parameter: [...outros,
      { type: 'list', key: 'eventSettingsTable', list: [{ type: 'map', map: [tpl('parameter', 'form_nome'), tpl('parameterValue', '{{DL - form_nome}}')] }] }] });
    console.log(`  atualizado: ${ga4Lead.name} → mesmo sinal de lead, com o nome do formulário`);
  }

  console.log('\nRemoções:');
  for (const t of lixo) await apagar('tags', 'tagId', t, 'mandava o evento "gtm.js" ao GA4 em toda página');
  for (const t of adsNoEnvio) if (t !== adsObrigado) await apagar('tags', 'tagId', t, 'segunda contagem do mesmo lead; disparava até em envio com erro');
  if (!adsObrigado && adsNoEnvio.length) console.log('  (a conversão no envio foi mantida: não havia outra para ficar no lugar)');
  // Gatilhos que nenhuma tag usa mais (envio de formulário, rolagem, cliques).
  tags = await lista('tags', 'tag'); trigs = await lista('triggers', 'trigger');
  const usados = new Set(tags.flatMap((t) => [...(t.firingTriggerId || []), ...(t.blockingTriggerId || [])]));
  for (const t of trigs) if (!usados.has(t.triggerId) && ['formSubmission', 'scrollDepth', 'click', 'linkClick'].includes(t.type))
    await apagar('triggers', 'triggerId', t, 'nenhuma tag usava');

  await ver(W);
  console.log('\nNada foi publicado. No GTM: espaço de trabalho "' + ESPACO + '" → Visualizar.');
}

async function ver(Wdado) {
  let W = Wdado;
  if (!W) {
    const C = await conteiner();
    const ws = ((await api('GET', `${C.base}/workspaces`)).workspace || []).find((w) => w.name === ESPACO);
    if (!ws) return console.log('Espaço de trabalho ainda não criado.');
    W = `${C.base}/workspaces/${ws.workspaceId}`;
  }
  const st = await api('GET', `${W}/status`);
  console.log(`\nMudanças no espaço de trabalho: ${(st.workspaceChange || []).length} · conflitos: ${(st.mergeConflict || []).length}`);
  for (const m of st.workspaceChange || []) { const x = m.tag || m.trigger || m.variable || {}; console.log(`  ${m.changeStatus}: ${x.name || '?'}`); }
  const p = await api('POST', `${W}:quick_preview`);
  console.log(p.compilerError ? '  ⚠ O GTM encontrou erro ao compilar: confira no Visualizar.' : '  ✓ Compila sem erro (pronto para o Visualizar).');
}

const [cmd] = process.argv.slice(2);
const cmds = { entrar, auditar, corrigir, ver: () => ver() };
if (!cmds[cmd]) { console.log('Comandos: entrar | auditar | corrigir | ver'); process.exit(1); }
cmds[cmd]().catch((e) => { console.error('Erro:', e.message); process.exit(1); });
