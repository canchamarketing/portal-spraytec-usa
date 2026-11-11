// Testa a versão para postar (ffmpeg): não mexe no que já serve, converte o pesado sem perder qualidade.
// Uso: node testes/video.ts [pasta-com-videos]   (gera os vídeos de teste se a pasta não for dada)
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const V = await import('../server/integracoes/video.ts');
let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };

if (!(await V.ffmpegDisponivel())) { console.log('ffmpeg não instalado: teste pulado.\n\n0 ok, 0 falha(s)'); process.exit(0); }
const dir = process.argv[2] || mkdtempSync(join(tmpdir(), 'spraytec-video-'));
const gerar = (nome: string, args: string[]) => { const f = join(dir, nome); if (!existsSync(f)) spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args, f]); return f; };
const ruido = gerar('ruido.mov', ['-f', 'lavfi', '-i', 'testsrc2=size=1440x2560:rate=30,noise=alls=10:allf=t', '-t', '4', '-c:v', 'libx265', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p10le', '-b:v', '60M', '-tag:v', 'hvc1']);
const pesado = gerar('real.mov', ['-f', 'lavfi', '-i', 'mandelbrot=size=1440x2560:rate=30,noise=alls=2:allf=t', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100', '-t', '12', '-c:v', 'libx265', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p10le', '-b:v', '60M', '-tag:v', 'hvc1', '-c:a', 'aac', '-b:a', '320k']);
const certo = gerar('certo.mp4', ['-f', 'lavfi', '-i', 'testsrc2=size=1080x1920:rate=30', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000', '-t', '6', '-c:v', 'libx264', '-preset', 'veryfast', '-b:v', '8M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k']);

console.log('Vídeo que já está nos padrões');
const r1 = await V.versaoParaPostar(certo, join(dir, 'certo-leve.mp4'));
checa(r1.feito === 'original' && !existsSync(join(dir, 'certo-leve.mp4')), 'H.264 1080 a 8 Mbps: não converte, vale o original (' + (r1 as any).motivo + ')');

console.log('Pior caso (ruído aleatório em todo quadro): a conferência segura');
const r0 = await V.versaoParaPostar(ruido, join(dir, 'ruido-leve.mp4'));
checa(r0.feito === 'original', 'quando a versão leve perderia qualidade, vale o original (' + (r0 as any).motivo + ')');

console.log('Vídeo pesado (HEVC 10 bits, 1440x2560, 60 Mbps)');
const t0 = Date.now();
const r2 = await V.versaoParaPostar(pesado, join(dir, 'pesado-leve.mp4'));
checa(r2.feito === 'convertido', 'converte');
if (r2.feito === 'convertido') {
  console.log(`        ${(r2.info.tam / 1e6).toFixed(1)} MB → ${(r2.saida.tam / 1e6).toFixed(1)} MB · SSIM ${r2.ssim.toFixed(4)} · CRF ${r2.crf} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  checa(r2.saida.codec === 'h264' && r2.saida.pix === 'yuv420p' && r2.saida.audio === 'aac', 'sai em H.264 8 bits com áudio AAC (o que o Instagram aceita)');
  checa(r2.saida.w === 1080 && r2.saida.h === 1920, 'reduz para 1080x1920, sem cortar (mesma proporção)');
  checa(Math.round(r2.saida.fps) === 30 && Math.abs(r2.saida.dur - r2.info.dur) < 0.2, 'mesma velocidade de quadros e mesma duração');
  checa(r2.ssim >= V.SSIM_MIN, `qualidade conferida com o original (SSIM ${r2.ssim.toFixed(4)} ≥ ${V.SSIM_MIN})`);
  checa(r2.saida.tam < r2.info.tam, 'arquivo menor que o original');
}
checa(V.tamanhoAlvo({ w: 720, h: 1280 } as any).w === 720 && !V.tamanhoAlvo({ w: 720, h: 1280 } as any).reduz, 'vídeo menor que 1080 nunca é aumentado');
checa(V.tamanhoAlvo({ w: 3840, h: 2160 } as any).w === 1920, 'horizontal 4K vai para 1920x1080');

if (!process.argv[2]) rmSync(dir, { recursive: true, force: true });
console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
