// Integrações (só a Cancha): o que está conectado, quando foi a última coleta, alerta de "sem dados há mais
// de 24 h", botão para conectar as contas Google e o que falta para cada uma.
import { t, dataHora } from '../i18n.js';
import { esc, eyebrow, toast } from '../ui.js';
import { api } from '../api.js';
import { S, desenhar } from '../app.js';
import { metricas, metricasProntas, limparCache } from '../metricas.js';

// Cada integração: de onde vem o status, como conecta e o que precisa.
const FONTES = [
  { k: 'ads', nome: 'Meta Ads', como: 'servidor' },
  { k: 'ig', nome: 'Instagram', como: 'servidor' },
  { k: 'fb', nome: 'Facebook', como: 'servidor' },
  { k: 'gads', nome: 'Google Ads', como: 'google', conectar: '/api/gads/conectar', estado: () => S.gads },
  { k: 'ga4', nome: 'Google Analytics 4', como: 'google', conectar: '/api/ga4/conectar', estado: () => S.ga4 },
  { k: 'gsc', nome: 'Google Search Console', como: 'futuro' },
  // Drive desligado por enquanto (decisão do Diogo, 12/11): sem botão de conectar.
  { k: 'drive', nome: 'Google Drive', como: 'futuro' },
  { k: 'brevo', nome: 'Brevo', como: 'futuro' },
  { k: 'traducao', como: 'futuro' },
];
const DIA = 864e5;

export function render() {
  const M = metricasProntas();
  if (!M) { metricas().then(desenhar); return `<div class="pagina"><h1>${esc(t('nav.integracoes'))}</h1><p class="carregando">${esc(t('geral.carregando'))}</p></div>`; }
  const linha = (f) => {
    const st = M.fontes[f.k], g = f.estado?.();
    let situ, cls;
    if (st?.real) {
      const velho = st.ultimoOk && Date.now() - Date.parse(st.ultimoOk) > DIA;
      situ = velho ? t('int.st.parado', { quando: dataHora(st.ultimoOk) }) : t('int.st.ok', { quando: dataHora(st.ultimoOk) }); cls = velho ? 'ruim' : 'ok';
    } else if (st?.erro) { situ = t('int.st.erro'); cls = 'ruim'; }
    else if (f.como === 'futuro') { situ = t('int.st.futuro'); cls = 'pendente'; }
    else { situ = t('int.st.exemplo'); cls = 'pendente'; }
    const escolher = g?.opcoes?.length ? `<form class="form linha-form" data-form="escolher" data-k="${f.k}"><select name="id">${g.opcoes.map((o) => `<option value="${esc(o.id)}">${esc(o.nome)}</option>`).join('')}</select>
      <button class="btn sm forte" type="submit">${esc(t('int.escolher'))}</button></form>` : '';
    const botao = f.como === 'google' && g?.configurado && !g?.conectado ? `<a class="btn sm forte" href="${f.conectar}">${esc(t('int.conectar'))}</a>`
      : f.como === 'google' && g?.conectado ? `<span class="miudo">${esc(g.conta || g.email || g.propriedade || '')}</span>` : '';
    return `<tr><td><span class="item-t">${esc(f.nome || t('int.traducao'))}</span><br><span class="item-sub">${esc(t('int.para.' + f.k))}</span></td>
      <td><span class="fonte ${cls === 'ok' ? 'ok' : cls === 'ruim' ? 'erro' : 'ex'}"><i></i>${esc(situ)}</span>${st?.erro ? `<br><span class="item-sub erro-txt">${esc(st.erro)}</span>` : ''}</td>
      <td>${botao}${escolher}</td></tr>
      <tr class="sub"><td colspan="3"><details><summary>${esc(t('int.precisa'))}</summary><p class="texto-precisa">${esc(t('int.precisa.' + f.k))}</p></details></td></tr>`;
  };
  return `<div class="pagina">
    <header class="cab"><div><p class="eyebrow">${eyebrow()}</p><h1><span class="marca-texto">${esc(t('nav.integracoes'))}</span></h1><p class="explica">${esc(t('int.explica'))}</p></div>
      <button class="btn" data-act="atualizar">${esc(t('int.atualizar'))}</button></header>
    <div class="tabela-rolar"><table class="tabela integ"><thead><tr><th>${esc(t('int.col.fonte'))}</th><th>${esc(t('int.col.situacao'))}</th><th></th></tr></thead>
      <tbody>${FONTES.map(linha).join('')}</tbody></table></div>
    <p class="dica">${esc(t('int.seguranca'))}</p></div>`;
}

export const cliques = {
  atualizar: async () => {
    try { const r = await api('/api/integracoes/atualizar', {}); toast(t(r.jaRodando ? 'int.ja_rodando' : 'int.atualizando'), 'bom'); setTimeout(() => { limparCache(); desenhar(); }, 20000); }
    catch (err) { toast(err.message, 'ruim'); }
  },
};
export const formularios = {
  escolher: async (f) => {
    const id = new FormData(f).get('id');
    try { await api(f.dataset.k === 'gads' ? '/api/gads/conta' : '/api/ga4/propriedade', { id }); toast(t('geral.salvo'), 'bom'); location.reload(); }
    catch (err) { toast(err.message, 'ruim'); }
  },
};
