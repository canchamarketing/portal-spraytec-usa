// Pessoas que entram no portal (só a Cancha gerencia): cadastro, papel, idioma e convite.
import { t, dataHora } from '../i18n.js';
import { esc, janela, toast, eyebrow } from '../ui.js';
import { api } from '../api.js';
import { desenhar } from '../app.js';

let dados = null, carregando = false;
async function carregar() {
  if (carregando) return;
  carregando = true;
  try { dados = await api('/api/pessoas'); } catch (err) { toast(err.message, 'ruim'); dados = { pessoas: [], papeis: [] }; }
  carregando = false;
  desenhar();
}

export function render() {
  if (!dados) { carregar(); return `<div class="pagina"><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.pessoas'))}</span></h1><p class="muted">${esc(t('geral.carregando'))}</p></div>`; }
  const linha = (p) => `<tr class="${p.ativo ? '' : 'inativo'}"><td><b>${esc(p.nome)}</b><br><small>${esc(p.email || '')}</small></td>
    <td>${esc(t('papel.' + p.papel))}</td><td>${p.idioma === 'pt-BR' ? 'Português' : 'English'}</td>
    <td>${!p.ativo ? esc(t('pessoas.inativo')) : p.tem_senha ? esc(t('pessoas.ativo_desde', { quando: dataHora(p.visto_em) })) : p.convite_enviado_em ? esc(t('pessoas.convidado', { quando: dataHora(p.convite_enviado_em) })) : esc(t('pessoas.sem_convite'))}</td>
    <td class="acoes-linha"><button class="link" data-act="editar" data-id="${esc(p.id)}">${esc(t('geral.editar'))}</button>
    ${p.ativo ? `<button class="link" data-act="convite" data-id="${esc(p.id)}">${esc(p.tem_senha ? t('pessoas.link_senha') : t('pessoas.convidar'))}</button>` : ''}</td></tr>`;
  return `<div class="pagina">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.pessoas'))}</span></h1><p class="explica">${esc(t('pessoas.explica'))}</p></div>
    <button class="btn forte" data-act="nova">${esc(t('pessoas.nova'))}</button></header>
    ${!dados.email ? `<p class="aviso">${esc(t('pessoas.sem_email'))}</p>` : ''}
    <div class="tabela-rolar"><table class="tabela"><thead><tr><th>${esc(t('campo.nome'))}</th><th>${esc(t('campo.papel'))}</th><th>${esc(t('campo.idioma'))}</th><th>${esc(t('pessoas.situacao'))}</th><th></th></tr></thead>
    <tbody>${dados.pessoas.map(linha).join('') || `<tr><td colspan="5" class="vazio">${esc(t('pessoas.nenhuma'))}</td></tr>`}</tbody></table></div>
    <section class="bloco"><h2>${esc(t('pessoas.papeis_titulo'))}</h2><dl class="ex">${['cancha', 'aprovador', 'leitor', 'produtora'].map((p) => `<div class="ex-linha"><dt>${esc(t('papel.' + p))}</dt><dd>${esc(t('papel.' + p + '.explica'))}</dd></div>`).join('')}</dl></section>
  </div>`;
}

function form(p) {
  const x = p || { papel: 'aprovador', idioma: 'en-US', ativo: true };
  return `<form class="form" data-form="pessoa" data-id="${esc(p?.id || '')}">
    <label class="rotulo" for="p-nome">${esc(t('campo.nome'))}</label><input id="p-nome" name="nome" value="${esc(x.nome || '')}" required maxlength="120">
    <label class="rotulo" for="p-email">${esc(t('campo.email'))}</label><input id="p-email" name="email" type="email" value="${esc(x.email || '')}" required>
    <label class="rotulo" for="p-papel">${esc(t('campo.papel'))}</label><select id="p-papel" name="papel">${dados.papeis.map((k) => `<option value="${k}" ${k === x.papel ? 'selected' : ''}>${esc(t('papel.' + k))}</option>`).join('')}</select>
    <label class="rotulo" for="p-idioma">${esc(t('campo.idioma'))}</label><select id="p-idioma" name="idioma"><option value="en-US" ${x.idioma === 'en-US' ? 'selected' : ''}>English</option><option value="pt-BR" ${x.idioma === 'pt-BR' ? 'selected' : ''}>Português</option></select>
    <label class="check"><input type="checkbox" name="ativo" ${x.ativo ? 'checked' : ''}> ${esc(t('pessoas.pode_entrar'))}</label>
    <div class="acoes"><button type="button" class="btn" data-fechar>${esc(t('geral.cancelar'))}</button><button class="btn forte" type="submit">${esc(t('geral.salvar'))}</button></div></form>`;
}
const pessoa = (id) => dados.pessoas.find((p) => p.id === id);

export const cliques = {
  nova: () => janela(t('pessoas.nova'), form(null)),
  editar: (el) => janela(t('geral.editar'), form(pessoa(el.dataset.id))),
  convite: async (el) => {
    const p = pessoa(el.dataset.id);
    try {
      const r = await api('/api/pessoas/convite', { id: p.id, enviar: dados.email });
      if (r.enviado) toast(t('pessoas.convite_enviado', { nome: p.nome }), 'bom');
      else janela(t('pessoas.copiar_titulo'), `<p>${esc(t('pessoas.copiar_explica', { nome: p.nome }))}</p><input readonly value="${esc(r.link)}" class="largo">`);
      carregar();
    } catch (err) { toast(err.message, 'ruim'); }
  },
};
export const formularios = {
  pessoa: async (f) => {
    const fd = new FormData(f);
    try {
      await api('/api/pessoas/salvar', { id: f.dataset.id || undefined, nome: fd.get('nome'), email: fd.get('email'), papel: fd.get('papel'), idioma: fd.get('idioma'), ativo: fd.get('ativo') === 'on' });
      document.querySelector('.janela-fundo')?.remove();
      toast(t('geral.salvo'), 'bom');
      carregar();
    } catch (err) { toast(err.message, 'ruim'); }
  },
};
