// Monta o Google Tag Manager do site da Spraytec (spraytec.com) pela API, a partir deste computador.
// A credencial (.segredos/gtm-cliente.json) e a autorização (.segredos/gtm-token.json) ficam só aqui,
// fora do git. A permissão pedida é de EDITAR: o script nunca publica. Tudo vai para um espaço de
// trabalho separado; quem confere no "Visualizar" e publica é uma pessoa, pela tela do GTM.
//
// Uso (na pasta do projeto):
//   node ferramentas/gtm.mjs entrar     abre o navegador para autorizar (conta analytics@canchamarketing.com.br)
//   node ferramentas/gtm.mjs listar     contas e contêineres do GTM, e os IDs de medição do GA4
//   node ferramentas/gtm.mjs montar <accountId> <containerId> <G-XXXX>
//   node ferramentas/gtm.mjs pixel <accountId> <containerId> <pixelId>   pixel da Meta (PageView e Lead)
//   node ferramentas/gtm.mjs ver <accountId> <containerId>      o que está no espaço de trabalho
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { randomBytes, createHash } from 'node:crypto';
import { join } from 'node:path';

const PASTA = join(import.meta.dirname, '..', '.segredos');
const CLIENTE = join(PASTA, 'gtm-cliente.json'), TOKEN = join(PASTA, 'gtm-token.json');
const ESCOPOS = ['https://www.googleapis.com/auth/tagmanager.edit.containers', 'https://www.googleapis.com/auth/analytics.readonly'];
const GTM = 'https://tagmanager.googleapis.com/tagmanager/v2';
const ADMIN = 'https://analyticsadmin.googleapis.com/v1beta';
const ESPACO = 'Cancha - GA4 e conversões';

const cliente = () => {
  if (!existsSync(CLIENTE)) throw new Error('Falta o arquivo .segredos/gtm-cliente.json (credencial "App para computador" do Google Cloud).');
  return JSON.parse(readFileSync(CLIENTE, 'utf8')).installed;
};
async function pedirToken(params) {
  const c = cliente();
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, ...params }) });
  const j = await r.json();
  if (!r.ok) throw new Error('O Google recusou a autorização: ' + (j.error_description || j.error));
  return j;
}

// ---------- entrar (OAuth com retorno em 127.0.0.1, como o Google recomenda para apps de computador) ----------
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
  writeFileSync(TOKEN, JSON.stringify({ refresh: t.refresh_token, em: new Date().toISOString() }), { mode: 0o600 });
  console.log('Autorizado. A autorização ficou guardada em .segredos/gtm-token.json (fora do git).');
}

let acesso = null;
async function token() {
  if (acesso) return acesso;
  if (!existsSync(TOKEN)) throw new Error('Rode antes: node ferramentas/gtm.mjs entrar');
  acesso = (await pedirToken({ refresh_token: JSON.parse(readFileSync(TOKEN, 'utf8')).refresh, grant_type: 'refresh_token' })).access_token;
  return acesso;
}
async function api(metodo, url, corpo) {
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(url, { method: metodo, headers: { authorization: 'Bearer ' + (await token()), ...(corpo ? { 'content-type': 'application/json' } : {}) }, body: corpo ? JSON.stringify(corpo) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 && tentativa < 5) { await new Promise((ok) => setTimeout(ok, 4000 * (tentativa + 1))); continue; } // limite de uso da API do GTM
    if (!r.ok) throw new Error(`${metodo} ${url.replace(GTM, '')}: ${j.error?.message || r.status}`);
    return j;
  }
}

// ---------- listar ----------
async function listar() {
  for (const a of (await api('GET', `${GTM}/accounts`)).account || []) {
    console.log(`Conta GTM: ${a.name} (accountId ${a.accountId})`);
    for (const c of (await api('GET', `${GTM}/accounts/${a.accountId}/containers`)).container || [])
      console.log(`  Contêiner: ${c.name} · ${c.publicId} · containerId ${c.containerId} · ${(c.usageContext || []).join(',')} · ${(c.domainName || []).join(', ')}`);
  }
  const contas = (await api('GET', `${ADMIN}/accountSummaries?pageSize=200`)).accountSummaries || [];
  for (const a of contas) for (const p of a.propertySummaries || []) {
    const fluxos = (await api('GET', `${ADMIN}/${p.property}/dataStreams`)).dataStreams || [];
    for (const f of fluxos.filter((x) => x.type === 'WEB_DATA_STREAM'))
      console.log(`GA4: ${a.displayName} › ${p.displayName} › ${f.displayName} · ${f.webStreamData?.measurementId} · ${f.webStreamData?.defaultUri || ''}`);
  }
}

// ---------- montar ----------
const tpl = (key, value) => ({ type: 'template', key, value });
const filtro = (tipo, a, b) => ({ type: tipo, parameter: [tpl('arg0', a), tpl('arg1', b)] });
// Formulários do Elementor Pro: o envio que deu certo dispara "submit_success" no próprio formulário.
// O ouvinte passa isso ao GTM com o nome do formulário ("Form Footer", "Form Whatsapp").
const OUVINTE = `<script>
(function () {
  function ligar() {
    if (!window.jQuery) return false;
    window.jQuery(document).on('submit_success', function (e) {
      var f = e.target && e.target.closest ? e.target.closest('form') : e.target;
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'elementor_form_enviado', form_nome: (f && f.getAttribute('name')) || '' });
    });
    return true;
  }
  if (!ligar()) document.addEventListener('DOMContentLoaded', ligar);
})();
</script>`;

// Espaço de trabalho separado para cada leva de mudanças (o "Default Workspace" fica intocado).
async function abrirEspaco(conta, conteiner, nome) {
  const base = `${GTM}/accounts/${conta}/containers/${conteiner}`;
  const espacos = (await api('GET', `${base}/workspaces`)).workspace || [];
  const ws = espacos.find((w) => w.name === nome) || await api('POST', `${base}/workspaces`, { name: nome, description: 'Criado pela Cancha Marketing por script (ferramentas/gtm.mjs). Conferir no Visualizar antes de publicar.' });
  const W = `${base}/workspaces/${ws.workspaceId}`;
  console.log(`Espaço de trabalho: ${ws.name} (${ws.workspaceId})`);
  // Rodar de novo não duplica: o que já existe com o mesmo nome é atualizado.
  const existentes = async (tipo, chave) => new Map(((await api('GET', `${W}/${tipo}`))[chave] || []).map((x) => [x.name, x]));
  const salvar = async (tipo, mapa, idCampo, obj) => {
    const atual = mapa.get(obj.name);
    const r = atual ? await api('PUT', `${W}/${tipo}/${atual[idCampo]}`, { ...obj, fingerprint: atual.fingerprint }) : await api('POST', `${W}/${tipo}`, obj);
    console.log(`  ${atual ? 'atualizado' : 'criado'}: ${obj.name}`);
    return r;
  };
  return { W, existentes, salvar };
}

async function montar(conta, conteiner, ga4) {
  if (!/^G-[A-Z0-9]+$/.test(ga4 || '')) throw new Error('Informe o ID de medição do GA4 (G-XXXX).');
  const { W, existentes, salvar } = await abrirEspaco(conta, conteiner, ESPACO);

  // variáveis nativas de clique
  const nativas = new Set(((await api('GET', `${W}/built_in_variables`)).builtInVariable || []).map((v) => v.type));
  const querNativas = ['clickUrl', 'clickText'].filter((t) => !nativas.has(t));
  if (querNativas.length) await api('POST', `${W}/built_in_variables?` + querNativas.map((t) => 'type=' + t).join('&'));

  const V = await existentes('variables', 'variable');
  await salvar('variables', V, 'variableId', { name: 'DL - form_nome', type: 'v', parameter: [{ type: 'integer', key: 'dataLayerVersion', value: '2' }, tpl('setDefaultValues', 'false'), tpl('name', 'form_nome')] });
  await salvar('variables', V, 'variableId', { name: 'GA4 - ID de medição', type: 'c', parameter: [tpl('value', ga4)] });

  const T = await existentes('triggers', 'trigger');
  const gat = {};
  gat.dom = await salvar('triggers', T, 'triggerId', { name: 'DOM pronto - todas as páginas', type: 'domReady' });
  for (const [chave, form] of [['footer', 'Form Footer'], ['whats', 'Form Whatsapp']])
    gat[chave] = await salvar('triggers', T, 'triggerId', { name: `Envio - ${form}`, type: 'customEvent',
      customEventFilter: [filtro('equals', '{{_event}}', 'elementor_form_enviado')], filter: [filtro('equals', '{{DL - form_nome}}', form)] });
  const clique = (nome, tipo, valor) => salvar('triggers', T, 'triggerId', { name: nome, type: 'linkClick', waitForTags: { type: 'boolean', value: 'false' }, checkValidation: { type: 'boolean', value: 'false' },
    filter: [filtro(tipo, '{{Click URL}}', valor)] });
  gat.tel = await clique('Clique - telefone', 'startsWith', 'tel:');
  gat.email = await clique('Clique - e-mail', 'startsWith', 'mailto:');
  gat.wa = await clique('Clique - link direto do WhatsApp', 'matchRegex', 'wa\\.me|api\\.whatsapp\\.com|web\\.whatsapp\\.com');

  const G = await existentes('tags', 'tag');
  const INICIO = '2147479573'; // gatilho nativo "Inicialização - Todas as páginas"
  await salvar('tags', G, 'tagId', { name: 'Google Tag - GA4', type: 'googtag', parameter: [tpl('tagId', '{{GA4 - ID de medição}}')], firingTriggerId: [INICIO] });
  await salvar('tags', G, 'tagId', { name: 'Elementor - ouvinte de envio de formulário', type: 'html', parameter: [tpl('html', OUVINTE), { type: 'boolean', key: 'supportDocumentWrite', value: 'false' }], firingTriggerId: [gat.dom.triggerId] });
  const evento = (nome, ev, g, extras = []) => salvar('tags', G, 'tagId', { name: nome, type: 'gaawe', firingTriggerId: [g.triggerId], parameter: [
    tpl('eventName', ev), tpl('measurementIdOverride', '{{GA4 - ID de medição}}'), { type: 'boolean', key: 'sendEcommerceData', value: 'false' },
    { type: 'list', key: 'eventSettingsTable', list: extras.map(([k, v]) => ({ type: 'map', map: [tpl('parameter', k), tpl('parameterValue', v)] })) }] });
  await evento('GA4 - lead_formulario (Form Footer)', 'lead_formulario', gat.footer, [['form_nome', '{{DL - form_nome}}']]);
  await evento('GA4 - lead_whatsapp (Form Whatsapp)', 'lead_whatsapp', gat.whats, [['form_nome', '{{DL - form_nome}}']]);
  await evento('GA4 - clique_telefone', 'clique_telefone', gat.tel, [['link', '{{Click URL}}']]);
  await evento('GA4 - clique_email', 'clique_email', gat.email, [['link', '{{Click URL}}']]);
  await evento('GA4 - clique_whatsapp (link direto)', 'clique_whatsapp', gat.wa, [['link', '{{Click URL}}'], ['texto', '{{Click Text}}']]);
  console.log('\nPronto. Nada foi publicado. Confira no GTM: espaço de trabalho "' + ESPACO + '" → Visualizar.');
}

// Pixel da Meta: visualização de página em todas as páginas e "Lead" nos envios dos dois formulários
// (usa os gatilhos de envio criados pelo "montar", que já estão publicados).
const PIXEL_BASE = `<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '{{Meta - ID do pixel}}');
fbq('track', 'PageView');
</script>`;
async function pixel(conta, conteiner, id) {
  if (!/^\d{10,20}$/.test(id || '')) throw new Error('Informe o ID do pixel da Meta (só números).');
  const { existentes, salvar } = await abrirEspaco(conta, conteiner, 'Cancha - Pixel da Meta');
  await salvar('variables', await existentes('variables', 'variable'), 'variableId', { name: 'Meta - ID do pixel', type: 'c', parameter: [tpl('value', id)] });
  const T = await existentes('triggers', 'trigger');
  const envio = (form) => { const t = T.get(`Envio - ${form}`); if (!t) throw new Error(`Falta o gatilho "Envio - ${form}". Rode antes o "montar".`); return t.triggerId; };
  const G = await existentes('tags', 'tag');
  const TODAS = '2147479553'; // gatilho nativo "All Pages"
  await salvar('tags', G, 'tagId', { name: 'Meta Pixel - base (PageView)', type: 'html', tagFiringOption: 'oncePerLoad', firingTriggerId: [TODAS],
    parameter: [tpl('html', PIXEL_BASE), { type: 'boolean', key: 'supportDocumentWrite', value: 'false' }] });
  for (const form of ['Form Footer', 'Form Whatsapp'])
    await salvar('tags', G, 'tagId', { name: `Meta Pixel - Lead (${form})`, type: 'html', firingTriggerId: [envio(form)],
      setupTag: [{ tagName: 'Meta Pixel - base (PageView)', stopOnSetupFailure: true }],
      parameter: [tpl('html', `<script>fbq('track', 'Lead', { content_name: '${form}' });</script>`), { type: 'boolean', key: 'supportDocumentWrite', value: 'false' }] });
  console.log('\nPronto. Nada foi publicado. Confira no GTM: espaço de trabalho "Cancha - Pixel da Meta" → Visualizar.');
}

async function ver(conta, conteiner) {
  const base = `${GTM}/accounts/${conta}/containers/${conteiner}`;
  const ws = ((await api('GET', `${base}/workspaces`)).workspace || []).find((w) => w.name === ESPACO);
  if (!ws) return console.log('Espaço de trabalho ainda não criado.');
  const W = `${base}/workspaces/${ws.workspaceId}`;
  for (const [tipo, chave] of [['tags', 'tag'], ['triggers', 'trigger'], ['variables', 'variable']])
    console.log(tipo + ':', ((await api('GET', `${W}/${tipo}`))[chave] || []).map((x) => x.name).join(' | ') || '—');
  const st = await api('GET', `${W}/status`);
  console.log('mudanças no espaço:', (st.workspaceChange || []).length, '| conflitos:', (st.mergeConflict || []).length);
}

const [cmd, ...args] = process.argv.slice(2);
const cmds = { entrar, listar, montar, pixel, ver };
if (!cmds[cmd]) { console.log('Comandos: entrar | listar | montar <accountId> <containerId> <G-XXXX> | pixel <accountId> <containerId> <pixelId> | ver <accountId> <containerId>'); process.exit(1); }
cmds[cmd](...args).catch((e) => { console.error('Erro:', e.message); process.exit(1); });
