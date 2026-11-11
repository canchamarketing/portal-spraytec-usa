// Versão para postar dos vídeos da produtora: MP4 H.264 que o Instagram e o Facebook aceitam, sem perda
// visível de qualidade. Os vídeos chegam pesados (70 a 300 MB, .m4v/.mov, às vezes 4K ou HEVC) e falham no
// envio pelo Business Suite. Regras:
// - não aumenta nem corta a imagem; só reduz para 1080 de largura (vertical) ou 1920 (horizontal), que é o
//   máximo que as redes exibem;
// - mantém a velocidade de quadros (até 60) e o áudio em 192 kbps, 48 kHz;
// - compressão quase sem perda (CRF 18, preset slow) e teto de 20 Mbps;
// - confere a qualidade comparando com o original (SSIM); abaixo de 0,985 refaz com CRF 16; se ainda não
//   passar, ou se sair maior que o original, fica valendo o original.
import { spawn } from 'node:child_process';

export const SSIM_MIN = 0.985;
const ffmpeg = () => process.env.FFMPEG || 'ffmpeg';
const ffprobe = () => process.env.FFPROBE || 'ffprobe';

function rodar(cmd: string, args: string[], limiteMs = 60 * 60e3): Promise<{ saida: string; erro: string }> {
  return new Promise((ok, falha) => {
    // No servidor (compartilhado com outros projetos), a conversão roda com prioridade baixa.
    const baixa = process.platform !== 'win32' && cmd === ffmpeg();
    const p = spawn(baixa ? 'nice' : cmd, baixa ? ['-n', '15', cmd, ...args] : args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let saida = '', erro = '';
    p.stdout.on('data', (d) => { saida += d; if (saida.length > 2e6) saida = saida.slice(-1e6); });
    p.stderr.on('data', (d) => { erro += d; if (erro.length > 2e6) erro = erro.slice(-1e6); });
    const t = setTimeout(() => p.kill('SIGKILL'), limiteMs);
    p.on('error', (e) => { clearTimeout(t); falha(e); });
    p.on('close', (c) => { clearTimeout(t); c === 0 ? ok({ saida, erro }) : falha(new Error(`${cmd} terminou com código ${c}: ${erro.slice(-400)}`)); });
  });
}

export async function ffmpegDisponivel() {
  try { await rodar(ffmpeg(), ['-hide_banner', '-version'], 15e3); return true; } catch { return false; }
}

export type Info = { w: number; h: number; fps: number; vfr: boolean; codec: string; pix: string; bitrate: number; dur: number; audio: string | null; tam: number };
const fracao = (s: string) => { const [a, b] = String(s || '0/1').split('/').map(Number); return b ? a / b : a || 0; };

export async function sondar(arquivo: string): Promise<Info> {
  const { saida } = await rodar(ffprobe(), ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', arquivo], 120e3);
  const j = JSON.parse(saida);
  const v = (j.streams || []).find((s: any) => s.codec_type === 'video');
  if (!v) throw new Error('O arquivo não tem vídeo.');
  const a = (j.streams || []).find((s: any) => s.codec_type === 'audio');
  // vídeo girado (celular): a largura e a altura que valem são as da imagem já de pé
  const rot = Math.abs(Number(v.tags?.rotate || (v.side_data_list || []).find((x: any) => x.rotation != null)?.rotation || 0)) % 180 === 90;
  const avg = fracao(v.avg_frame_rate), r = fracao(v.r_frame_rate);
  return {
    w: rot ? v.height : v.width, h: rot ? v.width : v.height,
    fps: avg || r, vfr: !!(avg && r && Math.abs(avg - r) > 0.5),
    codec: v.codec_name, pix: v.pix_fmt, bitrate: Number(j.format?.bit_rate || v.bit_rate || 0),
    dur: Number(j.format?.duration || v.duration || 0), audio: a ? a.codec_name : null, tam: Number(j.format?.size || 0),
  };
}

// Tamanho de saída: nunca aumenta; reduz só o que passar de 1080 (lado menor) / 1920 (lado maior).
export function tamanhoAlvo(i: Info) {
  const menor = Math.min(i.w, i.h), maior = Math.max(i.w, i.h);
  const k = Math.min(1, 1080 / menor, 1920 / maior);
  const par = (x: number) => Math.max(2, Math.round(x * k / 2) * 2);
  return { w: par(i.w), h: par(i.h), reduz: k < 1 };
}
const fpsAlvo = (i: Info) => { const f = i.fps > 0 ? i.fps : 30; return f > 60 ? 60 : f; };

// Já está no formato das redes e leve o bastante: não converte (usa o original).
export function jaServe(i: Info) {
  return i.codec === 'h264' && i.pix === 'yuv420p' && !tamanhoAlvo(i).reduz && i.fps <= 60 && !i.vfr
    && i.bitrate > 0 && i.bitrate <= 20e6 && (i.audio === null || i.audio === 'aac');
}

export async function converter(entrada: string, saida: string, i: Info, crf = 18, threads = 2) {
  const t = tamanhoAlvo(i), fps = fpsAlvo(i);
  const vf = [t.reduz ? `scale=${t.w}:${t.h}:flags=lanczos` : '', 'format=yuv420p'].filter(Boolean).join(',');
  const args = ['-hide_banner', '-nostdin', '-y', '-i', entrada, '-map', '0:v:0', '-map', '0:a:0?',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-profile:v', 'high', '-level:v', '4.2',
    '-maxrate', '20M', '-bufsize', '40M', '-vf', vf, '-r', String(Math.round(fps * 1000) / 1000), '-fps_mode', 'cfr',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2',
    '-movflags', '+faststart', '-map_metadata', '-1', '-threads', String(threads), saida];
  await rodar(ffmpeg(), args, Math.max(20 * 60e3, i.dur * 60e3));
}

// Semelhança com o original (SSIM de 0 a 1), no começo, no meio e no fim do vídeo (8 s de cada).
export async function semelhanca(convertido: string, original: string, i: Info) {
  const t = tamanhoAlvo(i), trechos = i.dur > 30 ? [0, i.dur / 2 - 4, i.dur - 9] : [0];
  const notas: number[] = [];
  for (const ini of trechos) {
    const s = String(Math.max(0, ini).toFixed(2));
    const { erro } = await rodar(ffmpeg(), ['-hide_banner', '-nostdin', '-ss', s, '-t', '8', '-i', convertido, '-ss', s, '-t', '8', '-i', original,
      '-lavfi', `[1:v]scale=${t.w}:${t.h}:flags=lanczos,format=yuv420p,fps=${fpsAlvo(i)}[ref];[0:v]format=yuv420p,fps=${fpsAlvo(i)}[dist];[dist][ref]ssim`, '-f', 'null', '-'], 10 * 60e3);
    const m = erro.match(/All:([0-9.]+)/g);
    if (m) notas.push(Number(m[m.length - 1].slice(4)));
  }
  if (!notas.length) throw new Error('Não foi possível medir a qualidade.');
  return Math.min(...notas);
}

// Faz a versão para postar com a conferência de qualidade. Devolve o que aconteceu.
export async function versaoParaPostar(entrada: string, saida: string, threads = 2): Promise<
  { feito: 'convertido'; info: Info; saida: Info; ssim: number; crf: number } | { feito: 'original'; info: Info; motivo: string }> {
  const info = await sondar(entrada);
  if (jaServe(info)) return { feito: 'original', info, motivo: 'o original já está no formato das redes' };
  for (const crf of [18, 16]) {
    await converter(entrada, saida, info, crf, threads);
    const out = await sondar(saida);
    if (info.tam && out.tam >= info.tam) return { feito: 'original', info, motivo: 'a versão convertida não ficou menor que o original' };
    const ssim = await semelhanca(saida, entrada, info);
    if (ssim >= SSIM_MIN) return { feito: 'convertido', info, saida: out, ssim, crf };
  }
  return { feito: 'original', info, motivo: 'a conversão não manteve a qualidade do original' };
}
