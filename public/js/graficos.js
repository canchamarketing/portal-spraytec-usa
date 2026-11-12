// Gráficos em SVG, sem biblioteca. Regras (guia de visualização): marcas finas (linha de 2 px), grade discreta,
// um eixo só (nunca dois), cores por canal sempre na mesma ordem, rótulo direto no fim de cada linha,
// linha vertical que acompanha o mouse com um quadro mostrando todos os valores do dia, e tabela para quem
// prefere ler os números.
import { esc } from './ui.js';
import { dataCurta, t } from './i18n.js';

// Cores validadas (azul e laranja passam no teste de daltonismo; ver o guia de visualização).
export const COR = { meta: '#2a78d6', google: '#eb6834', ig: '#2a78d6', fb: '#eb6834', um: '#2a78d6', neutra: '#8a8d7a' };
const graficos = new Map();
// Largura do desenho = largura real na tela (o texto dos eixos fica sempre do mesmo tamanho).
function largura(meia) {
  const m = document.querySelector('main')?.clientWidth || 900;
  const util = m - (innerWidth <= 720 ? 32 : 56) - 40;
  return Math.round(Math.max(280, Math.min(1100, meia && innerWidth > 900 ? util / 2 - 8 : util)));
}
let seq = 0;

// Escala "bonita" para o eixo y (0, 25, 50…).
function escala(max) {
  if (!(max > 0)) return { max: 1, passos: [0, 1] };
  const bruto = max / 4, mag = 10 ** Math.floor(Math.log10(bruto)), n = bruto / mag;
  const passo = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
  const topo = Math.ceil(max / passo) * passo;
  const passos = []; for (let v = 0; v <= topo + passo / 2; v += passo) passos.push(v);
  return { max: topo, passos };
}

// Linhas no tempo. series: [{ nome, cor, pontos: [{ d, v }] }], fmt: formata o valor.
// zero = false: o eixo começa perto do menor valor (para totais acumulados, como seguidores).
export function linhas({ series, fmt, altura = 220, area = series.length === 1, titulo = '', meia = false, zero = true }) {
  const id = 'g' + ++seq, W = largura(meia), H = altura, ml = 52, mr = series.length > 1 ? 96 : 16, mt = 12, mb = 26;
  const n = series[0]?.pontos.length || 0;
  const vals = series.flatMap((s) => s.pontos.map((p) => p.v));
  const max = Math.max(0, ...vals), min = zero ? 0 : Math.min(...vals);
  const base = zero ? 0 : (() => { const e = escala(Math.max(1, max - min)); const passo = e.passos[1] || 1; return Math.max(0, Math.floor((min - passo / 2) / passo) * passo); })();
  const { max: amp, passos: ps } = escala(max - base);
  const topo = base + amp, passos = ps.map((v) => base + v);
  const x = (i) => ml + (n <= 1 ? 0 : (i / (n - 1)) * (W - ml - mr)), y = (v) => mt + (1 - (v - base) / (topo - base)) * (H - mt - mb);
  const grade = passos.map((v) => `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${ml - 8}" y="${y(v) + 4}" class="g-eixo" text-anchor="end">${esc(fmt(v, true))}</text>`).join('');
  const marcas = [0, Math.floor((n - 1) / 3), Math.floor((2 * (n - 1)) / 3), n - 1].filter((v, i, a) => a.indexOf(v) === i && v >= 0);
  const xl = marcas.map((i) => `<text x="${x(i)}" y="${H - 6}" class="g-eixo" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(dataCurta(series[0].pontos[i].d))}</text>`).join('');
  // Rótulos no fim das linhas: se ficarem perto demais, um vai para cima e o outro para baixo.
  const posRot = series.map((s, i) => ({ i, y: s.pontos.length ? y(s.pontos.at(-1).v) + 4 : 0 })).sort((a, b) => a.y - b.y);
  for (let k = 1; k < posRot.length; k++) if (posRot[k].y - posRot[k - 1].y < 15) posRot[k].y = posRot[k - 1].y + 15;
  const yRot = Object.fromEntries(posRot.map((r) => [r.i, r.y]));
  const caminhos = series.map((s, si) => {
    const pts = s.pontos.map((p, i) => `${x(i).toFixed(1)},${y(p.v).toFixed(1)}`);
    const areaPath = area ? `<path d="M${x(0)},${y(base)} L${pts.join(' L')} L${x(n - 1)},${y(base)} Z" fill="${s.cor}" opacity=".08"/>` : '';
    const ult = s.pontos.at(-1);
    const rot = series.length > 1 && ult ? `<text x="${x(n - 1) + 8}" y="${yRot[si]}" class="g-rotulo">${esc(s.nome)}</text>` : '';
    return `${areaPath}<polyline points="${pts.join(' ')}" fill="none" stroke="${s.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${ult ? `<circle cx="${x(n - 1)}" cy="${y(ult.v)}" r="4" fill="${s.cor}" stroke="var(--papel)" stroke-width="2"/>` : ''}${rot}`;
  }).join('');
  graficos.set(id, { series, fmt, x, y, n, ml, mr, W, H, mt, mb });
  const legenda = series.length > 1 ? `<div class="g-legenda">${series.map((s) => `<span><i style="background:${s.cor}"></i>${esc(s.nome)}</span>`).join('')}</div>` : '';
  return `<figure class="grafico" data-g="${id}">${legenda}
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}">${grade}${xl}${caminhos}
      <line class="g-mira" x1="0" x2="0" y1="${mt}" y2="${H - mb}" visibility="hidden"/>
      <g class="g-pontos"></g><rect class="g-alvo" x="${ml}" y="0" width="${W - ml - mr}" height="${H}" fill="transparent"/></svg>
    <div class="g-dica" hidden></div>${tabela(series, fmt)}</figure>`;
}

// Barras verticais (um valor por dia, uma cor). Cada barra mostra o valor ao passar o mouse.
export function barras({ pontos, fmt, cor = COR.um, altura = 160, titulo = '', meia = false }) {
  const id = 'g' + ++seq, W = largura(meia), H = altura, ml = 40, mr = 8, mt = 10, mb = 24, n = pontos.length;
  const { max: topo, passos } = escala(Math.max(0, ...pontos.map((p) => p.v)));
  const larg = (W - ml - mr) / Math.max(n, 1), y = (v) => mt + (1 - v / topo) * (H - mt - mb);
  const grade = passos.map((v) => `<line x1="${ml}" x2="${W - mr}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${ml - 6}" y="${y(v) + 4}" class="g-eixo" text-anchor="end">${esc(fmt(v, true))}</text>`).join('');
  const bs = pontos.map((p, i) => {
    const h = Math.max(0, y(0) - y(p.v)), bx = ml + i * larg + Math.min(2, larg * 0.15), bw = Math.max(1, larg - 2 * Math.min(2, larg * 0.15));
    const r = Math.min(4, bw / 2, h);
    return `<path d="M${bx},${y(0)} V${y(0) - h + r} Q${bx},${y(0) - h} ${bx + r},${y(0) - h} H${bx + bw - r} Q${bx + bw},${y(0) - h} ${bx + bw},${y(0) - h + r} V${y(0)} Z" fill="${cor}" class="g-barra" data-i="${i}"/>`;
  }).join('');
  const marcas = [0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  const xl = marcas.map((i) => `<text x="${ml + i * larg + larg / 2}" y="${H - 6}" class="g-eixo" text-anchor="${i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}">${esc(dataCurta(pontos[i].d))}</text>`).join('');
  graficos.set(id, { barras: pontos, fmt, larg, ml, W, H });
  return `<figure class="grafico" data-g="${id}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(titulo)}">${grade}${bs}${xl}
    <rect class="g-alvo" x="${ml}" y="0" width="${W - ml - mr}" height="${H}" fill="transparent"/></svg><div class="g-dica" hidden></div>${tabela([{ nome: titulo, pontos }], fmt)}</figure>`;
}

// Mini gráfico de tendência (dentro dos cartões de número).
export function mini(pontos, cor = COR.um) {
  if (!pontos?.length) return '';
  const W = 120, H = 32, max = Math.max(...pontos.map((p) => p.v)), min = Math.min(...pontos.map((p) => p.v)), amp = max - min || 1;
  const pts = pontos.map((p, i) => `${((i / Math.max(1, pontos.length - 1)) * W).toFixed(1)},${(H - 3 - ((p.v - min) / amp) * (H - 6)).toFixed(1)}`).join(' ');
  return `<svg class="mini" viewBox="0 0 ${W} ${H}" aria-hidden="true" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;
}

// Barras horizontais em HTML (canais, páginas, campanhas): rótulo, barra e valor.
export function ranking(itens, fmt, cor = COR.um) {
  const max = Math.max(1, ...itens.map((x) => x.v));
  return `<ul class="ranking">${itens.map((x) => `<li><span class="r-nome" title="${esc(x.nome)}">${x.marca ? `<i style="background:${x.marca}"></i>` : ''}${esc(x.nome)}</span>
    <span class="r-barra"><span style="width:${(x.v / max) * 100}%;background:${x.cor || cor}"></span></span><span class="r-valor">${esc(fmt(x.v))}</span></li>`).join('')}</ul>`;
}

// Tabela com os mesmos números do gráfico (acessibilidade e quem prefere ler).
function tabela(series, fmt) {
  const n = series[0]?.pontos.length || 0;
  if (!n) return '';
  const linhasT = series[0].pontos.map((p, i) => `<tr><td class="data">${esc(dataCurta(p.d))}</td>${series.map((s) => `<td>${esc(fmt(s.pontos[i].v))}</td>`).join('')}</tr>`).reverse().join('');
  return `<details class="g-tabela"><summary>${esc(t('graf.ver_tabela'))}</summary><div class="tabela-rolar"><table class="tabela"><thead><tr><th></th>${series.map((s) => `<th>${esc(s.nome)}</th>`).join('')}</tr></thead><tbody>${linhasT}</tbody></table></div></details>`;
}

// Mira e quadro de valores: um ouvinte só, para todos os gráficos.
function mover(ev) {
  const alvo = ev.target.closest?.('.g-alvo');
  document.querySelectorAll('.grafico.ativo').forEach((f) => { if (!alvo || f !== alvo.closest('.grafico')) esconder(f); });
  if (!alvo) return;
  const fig = alvo.closest('.grafico'), g = graficos.get(fig.dataset.g);
  if (!g) return;
  const svg = fig.querySelector('svg'), r = svg.getBoundingClientRect();
  const px = ((ev.clientX - r.left) / r.width) * g.W;
  const dica = fig.querySelector('.g-dica');
  fig.classList.add('ativo');
  if (g.barras) {
    const i = Math.max(0, Math.min(g.barras.length - 1, Math.floor((px - g.ml) / g.larg)));
    fig.querySelectorAll('.g-barra').forEach((b) => b.classList.toggle('sel', Number(b.dataset.i) === i));
    const p = g.barras[i];
    dica.innerHTML = `<b>${esc(g.fmt(p.v))}</b><span>${esc(dataCurta(p.d))}</span>`;
  } else {
    const i = Math.max(0, Math.min(g.n - 1, Math.round(((px - g.ml) / (g.W - g.ml - g.mr)) * (g.n - 1))));
    const mira = fig.querySelector('.g-mira'), xx = g.x(i);
    mira.setAttribute('x1', xx); mira.setAttribute('x2', xx); mira.setAttribute('visibility', 'visible');
    fig.querySelector('.g-pontos').innerHTML = g.series.map((s) => `<circle cx="${xx}" cy="${g.y(s.pontos[i].v)}" r="4" fill="${s.cor}" stroke="var(--papel)" stroke-width="2"/>`).join('');
    dica.innerHTML = `<span class="g-dia">${esc(dataCurta(g.series[0].pontos[i].d))}</span>` + g.series.map((s) => `<span class="g-linha"><i style="background:${s.cor}"></i><b>${esc(g.fmt(s.pontos[i].v))}</b> ${g.series.length > 1 ? esc(s.nome) : ''}</span>`).join('');
  }
  dica.hidden = false;
  const fr = fig.getBoundingClientRect(), dx = ev.clientX - fr.left;
  dica.style.left = Math.min(fr.width - dica.offsetWidth - 4, Math.max(4, dx + 14)) + 'px';
  dica.style.top = Math.max(0, ev.clientY - fr.top - dica.offsetHeight - 10) + 'px';
}
function esconder(f) {
  f.classList.remove('ativo');
  const d = f.querySelector('.g-dica'); if (d) d.hidden = true;
  f.querySelector('.g-mira')?.setAttribute('visibility', 'hidden');
  const p = f.querySelector('.g-pontos'); if (p) p.innerHTML = '';
  f.querySelectorAll('.g-barra.sel').forEach((b) => b.classList.remove('sel'));
}
document.addEventListener('pointermove', mover);
document.addEventListener('pointerleave', () => document.querySelectorAll('.grafico.ativo').forEach(esconder));
