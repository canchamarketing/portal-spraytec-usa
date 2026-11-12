// Entrar (e-mail e senha, ou demonstração), criar senha pelo convite e nova senha.
import { t, idioma, carregarIdioma, IDIOMAS } from '../i18n.js';
import { api } from '../api.js';
import { $, esc, toast } from '../ui.js';

const trocaIdioma = () => `<div class="troca-idioma" role="group" aria-label="${esc(t('conta.idioma'))}">${IDIOMAS.map((l) =>
  `<button type="button" class="${l === idioma() ? 'ativo' : ''}" data-l="${l}">${l === 'pt-BR' ? 'Português' : 'English'}</button>`).join('')}</div>`;

function caixa(html) {
  document.body.classList.remove('logado');
  $('#main').innerHTML = `<div class="entrar"><div class="entrar-caixa">${trocaIdioma()}<img src="/logo.png" alt="Spraytec" class="entrar-logo">
    <p class="entrar-sub">${esc(t('app.subtitulo'))}</p>${html}</div><p class="entrar-rodape">${esc(t('email.rodape'))}</p></div>`;
  $('#main').querySelectorAll('.troca-idioma button').forEach((b) => b.addEventListener('click', async () => {
    await carregarIdioma(b.dataset.l);
    document.title = t('app.titulo');
    location.reload();
  }));
}

export async function paginaEntrar() {
  let op = { demo: false, demoLiberado: false, pessoas: [], email: false };
  try { op = await api('/api/entrar/opcoes'); } catch {}
  const demo = !op.demo ? '' : !op.demoLiberado
    ? `<details class="demo-entrar"><summary>${esc(t('login.demo_titulo'))}</summary>
        <form id="f-codigo"><label class="rotulo" for="codigo">${esc(t('login.demo_codigo'))}</label>
        <input id="codigo" name="codigo" autocomplete="off" required><button class="btn" type="submit">${esc(t('login.continuar'))}</button></form></details>`
    : `<section class="demo-entrar aberta"><h2>${esc(t('login.demo_quem'))}</h2><p class="dica">${esc(t('login.demo_explica'))}</p>
        <div class="pessoas-demo">${op.pessoas.map((p) => `<button type="button" class="btn pessoa" data-id="${esc(p.id)}"><b>${esc(p.nome)}</b><small>${esc(t('papel.' + p.papel))}</small></button>`).join('')}</div></section>`;
  caixa(`<form id="f-entrar" class="form">
      <label class="rotulo" for="email">${esc(t('login.email'))}</label><input id="email" name="email" type="email" autocomplete="username" required>
      <label class="rotulo" for="senha">${esc(t('login.senha'))}</label><input id="senha" name="senha" type="password" autocomplete="current-password" required>
      <button class="btn forte largo" type="submit">${esc(t('login.entrar'))}</button>
      <button class="link" type="button" id="esqueci">${esc(t('login.esqueci'))}</button></form>${demo}`);
  $('#f-entrar').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    try { await api('/api/entrar/senha', { email: fd.get('email'), senha: fd.get('senha') }); location.reload(); }
    catch (err) { toast(err.message, 'ruim'); }
  });
  $('#esqueci').addEventListener('click', async () => {
    const email = $('#email').value.trim();
    if (!email) { toast(t('login.esqueci_digite'), 'ruim'); $('#email').focus(); return; }
    try { const r = await api('/api/senha/esqueci', { email }); toast(r.msg, 'bom'); }
    catch (err) { toast(err.message, 'ruim'); }
  });
  $('#f-codigo')?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    try { await api('/api/entrar/demo-codigo', { codigo: new FormData(ev.target).get('codigo') }); paginaEntrar(); }
    catch (err) { toast(err.message, 'ruim'); }
  });
  $('#main').querySelectorAll('.pessoa').forEach((b) => b.addEventListener('click', async () => {
    try { await api('/api/entrar/demo', { usuarioId: b.dataset.id }); location.href = '/'; }
    catch (err) { toast(err.message, 'ruim'); }
  }));
}

export async function paginaSenha() {
  const tok = new URLSearchParams(location.search).get('t') || '';
  let info;
  try { info = await api('/api/senha/link?t=' + encodeURIComponent(tok)); }
  catch (err) { caixa(`<p class="erro-tela">${esc(err.message)}</p><p><a class="btn" href="/">${esc(t('login.ir_entrar'))}</a></p>`); return; }
  caixa(`<form id="f-senha" class="form"><h2>${esc(info.tipo === 'convite' ? t('login.criar_titulo', { nome: info.nome.split(' ')[0] }) : t('login.nova_titulo'))}</h2>
    <p class="dica">${esc(t('login.senha_regra'))}</p>
    <input type="email" value="${esc(info.email)}" autocomplete="username" readonly class="so-ler" aria-label="${esc(t('login.email'))}">
    <label class="rotulo" for="s1">${esc(t('login.senha_nova'))}</label><input id="s1" type="password" minlength="8" autocomplete="new-password" required>
    <label class="rotulo" for="s2">${esc(t('login.senha_repetir'))}</label><input id="s2" type="password" minlength="8" autocomplete="new-password" required>
    <button class="btn forte largo" type="submit">${esc(t('login.salvar_senha'))}</button></form>`);
  $('#f-senha').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if ($('#s1').value !== $('#s2').value) { toast(t('login.senhas_diferentes'), 'ruim'); return; }
    try { await api('/api/senha/definir', { t: tok, senha: $('#s1').value }); location.href = '/'; }
    catch (err) { toast(err.message, 'ruim'); }
  });
}
