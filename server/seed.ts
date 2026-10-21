// Dados FICTÍCIOS de demonstração. Vêm do protótipo, com as datas trazidas para perto de "hoje"
// (o protótipo simulava 16/11/2026 como hoje). Nada aqui é dado real da Spraytec.
import { addDays, dow, fmt, FERIADOS } from './dominio.ts';
import { estadoVazio, type Estado } from './estado.ts';

export const USUARIOS_DEMO = [
  { id: 'u-matheus', nome: 'Matheus', papel: 'matheus', ordem: 1 },
  { id: 'u-diretoria', nome: 'Diretoria Spraytec', papel: 'diretoria', ordem: 2 },
  { id: 'u-atendimento', nome: 'Atendimento Cancha', papel: 'cancha', ordem: 3 },
  { id: 'u-diogo', nome: 'Diogo', papel: 'cancha', ordem: 4 },
  { id: 'u-luis', nome: 'Luís', papel: 'cancha', ordem: 5 },
  { id: 'u-produtora', nome: 'Produtora de vídeo', papel: 'produtora', ordem: 6 },
];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const MESES_C = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const PROTO_HOJE = '2026-11-16';

export function dadosDemo(hoje: string): Estado {
  const desloc = Math.round((Date.parse(hoje) - Date.parse(PROTO_HOJE)) / 864e5);
  // D: data do protótipo -> data real. Datas pontuais que caem no fim de semana vão para o dia útil mais perto.
  const D = (iso: string | null, ajustar = true): string | null => {
    if (!iso) return null;
    let d = addDays(iso, desloc);
    if (ajustar && iso !== PROTO_HOJE) { if (dow(d) === 6) d = addDays(d, -1); else if (dow(d) === 0) d = addDays(d, 1); }
    return d;
  };
  const dm = (iso: string) => fmt(D(iso));
  const dmr = (iso: string) => fmt(D(iso, false));
  const [ah, mh] = hoje.split('-').map(Number);
  const mesRel = (k: number) => { const t = (ah * 12 + (mh - 1)) + k; return { a: Math.floor(t / 12), m: t % 12 }; };
  const mes = (k: number) => MESES[mesRel(k).m];
  const Mes = (k: number) => mes(k)[0].toUpperCase() + mes(k).slice(1);
  const ym = (k: number) => { const r = mesRel(k); return r.a + '-' + String(r.m + 1).padStart(2, '0'); };
  const mesLbl = (k: number) => MESES_C[mesRel(k).m] + '/' + String(mesRel(k).a).slice(2);
  const ultimoDia = (k: number) => { const r = mesRel(k); return new Date(Date.UTC(r.a, r.m + 1, 0)).getUTCDate(); };
  const mm = (k: number) => String(mesRel(k).m + 1).padStart(2, '0');
  const segunda = (iso: string) => addDays(iso, -((dow(iso) + 6) % 7));
  const semanaISO = (iso: string) => { const d = new Date(iso + 'T12:00:00Z'); const dia = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dia + 3); const j = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return 1 + Math.round(((d.getTime() - j.getTime()) / 864e5 - 3 + ((j.getUTCDay() + 6) % 7)) / 7); };

  const e = estadoVazio();
  let uid = 1;
  function P(date: string | null, time: string | null, rede: string, formato: string, titulo: string, pilar: string, produto: string, status: string, extra?: any) {
    const corpo = ({
      Manejo: 'Cada fase da lavoura pede um cuidado diferente. O time de agronomia da Spraytec mostra o que observar no campo e o momento certo de agir.\n\nFale com o RTV da sua região para montar o manejo da sua área.',
      Campo: 'Direto do campo: produtores e o time Spraytec mostrando, na prática, como a nutrição certa faz diferença na lavoura.\n\nQuer ver isso na sua área? Chame o RTV Spraytec.',
      Produto: 'Veja como a linha Spraytec trabalha na planta e em que momento ela entra no manejo.\n\nRecomendações sempre conforme a bula e com acompanhamento do seu agrônomo.',
      Educação: 'Salve para consultar na próxima aplicação. Informação técnica, direto ao ponto, validada pela agronomia da Spraytec.',
      Institucional: 'Por trás de cada produto Spraytec existe uma equipe dedicada a quem produz. Conheça um pouco do nosso dia a dia.',
      Relacionamento: 'Queremos ouvir você: conte nos comentários como está a sua lavoura nesta safra.',
      Eventos: 'Anote na agenda e venha conversar com o time Spraytec. Inscrições pelo link na bio.',
    } as any)[pilar] || 'Conteúdo do time Spraytec para quem produz.';
    const leg = ({
      email: 'Assunto: ' + titulo + '\nPré-cabeçalho: o manejo do mês, direto ao ponto.\n\nOlá, produtor!\n\nSeparamos o que mais importa para a sua lavoura nesta fase da safra, com recomendações do time de agronomia da Spraytec.\n\nLeia a matéria completa no site e fale com o RTV da sua região.',
      ads: 'Plano de mídia.', design: 'Peças criadas a partir do calendário aprovado, entregues em feed, stories e anúncio.',
      video: 'Produção de vídeo com a produtora contratada pela Spraytec.',
    } as any)[rede] || titulo + '.\n\n' + corpo + '\n\n#Spraytec #NutriçãoVegetal #Soja';
    return Object.assign({ id: 'p' + uid++, date: D(date), _proto: date, time, rede, formato, titulo, pilar, produto, status, rodada: 1, legenda: leg, comments: [] as any[], hist: [] as any[] }, extra || {});
  }
  const T = {
    pecas1: `Peças da 1ª quinzena de ${mes(1)}`, pecas2: `Peças da 2ª quinzena de ${mes(1)}`,
    agendaCampo: `Agenda: dia de campo em ${mes(1)}`, conviteCampo: `Convite: dia de campo de ${mes(1)}`,
    contagem: `Contagem regressiva: dia de campo de ${mes(1)}`, newsEnsaio: 'Newsletter: o que o ensaio de campo mostrou',
    lab: 'Bastidores do laboratório de qualidade', rtv: 'Um dia com o RTV no campo', numeros: 'Spraytec em números: a safra até aqui',
  };
  const com = (proto: string, hora: string) => `${dm(proto)} ${hora}`;
  e.posts = [
    P('2026-09-22', '11:30', 'ig', 'post', 'Planejamento da safra de verão', 'Manejo', '—', 'publicado', { metrics: { alcance: 3100, eng: 3.4 }, anterior: true }),
    P('2026-09-26', '12:00', 'fb', 'post', 'Spraytec na feira regional', 'Eventos', '—', 'publicado', { metrics: { alcance: 1450, eng: 1.6 }, anterior: true }),
    P('2026-10-01', '11:30', 'ig', 'carrossel', 'Análise de solo antes do plantio', 'Educação', '—', 'publicado', { metrics: { alcance: 4200, eng: 3.9 }, anterior: true }),
    P('2026-10-06', '18:00', 'ig', 'reel', 'Máquinas no campo: começa o plantio', 'Campo', '—', 'publicado', { metrics: { alcance: 6900, eng: 4.6 }, anterior: true }),
    P('2026-10-10', '17:00', 'yt', 'video', 'Webinar: nutrição da soja', 'Educação', '—', 'publicado', { metrics: { alcance: 1100, eng: 5.1 }, anterior: true }),
    P('2026-10-15', '11:30', 'ig', 'post', 'Quem ensina no campo: os RTVs da Spraytec', 'Institucional', '—', 'publicado', { metrics: { alcance: 2600, eng: 2.9 }, anterior: true }),
    P('2026-10-22', '11:30', 'ig', 'post', 'Emergência da soja: o que observar', 'Manejo', '—', 'publicado'),
    P('2026-10-24', '18:00', 'ig', 'reel', 'Equipe de campo no oeste do Paraná', 'Campo', '—', 'publicado'),
    P('2026-10-28', '12:00', 'fb', 'post', 'Homenagem ao time de campo', 'Institucional', '—', 'publicado'),
    P('2026-10-30', '11:30', 'ig', 'carrossel', 'Tratamento de sementes em 4 passos', 'Educação', 'Linha de sementes', 'publicado'),
    P('2026-10-31', '17:00', 'yt', 'short', 'Regulagem da plantadeira em 60 segundos', 'Manejo', '—', 'publicado'),
    P('2026-11-03', '11:30', 'ig', 'carrossel', 'Checklist do plantio: 5 pontos antes de entrar na área', 'Manejo', 'Linha de sementes', 'publicado', { metrics: { alcance: 6120, eng: 4.8 } }),
    P('2026-11-04', '18:00', 'ig', 'reel', 'Do campo: semeadura no oeste do Paraná', 'Campo', '—', 'publicado', { metrics: { alcance: 11840, eng: 6.1 } }),
    P('2026-11-05', '08:00', 'email', 'newsletter', `Newsletter de ${mes(0)}: reta final do plantio`, 'Manejo', '—', 'publicado'),
    P('2026-11-06', '12:00', 'fb', 'post', 'Tratamento de sementes: por que começar certo', 'Produto', 'Linha de sementes', 'publicado', { metrics: { alcance: 2310, eng: 2.2 } }),
    P('2026-11-09', '11:30', 'ig', 'post', 'Nutrição foliar no V4: o que observar', 'Manejo', 'Linha foliar', 'publicado', { metrics: { alcance: 5480, eng: 5.3 } }),
    P('2026-11-10', null, 'video', 'gravacao', 'Gravação: bastidores da fábrica', 'Institucional', '—', 'publicado'),
    P('2026-11-11', '17:00', 'yt', 'video', 'Visita técnica: soja em Cascavel', 'Campo', '—', 'publicado', { metrics: { alcance: 1980, eng: 7.4 } }),
    P('2026-11-12', null, 'design', 'producao', 'Templates de carrossel educativo', 'Educação', '—', 'publicado'),
    P('2026-11-13', '11:30', 'ig', 'carrossel', 'Mitos e verdades sobre micronutrientes', 'Educação', 'Linha foliar', 'publicado', { metrics: { alcance: 8930, eng: 6.8 } }),
    P('2026-11-17', '18:00', 'ig', 'reel', 'Bastidores da fábrica em Maringá', 'Institucional', '—', 'agendado'),
    P('2026-11-18', '12:00', 'fb', 'post', T.agendaCampo, 'Eventos', '—', 'agendado'),
    P('2026-11-18', null, 'design', 'producao', T.pecas1, 'Manejo', '—', 'producao'),
    P('2026-11-19', '08:00', 'email', 'newsletter', T.conviteCampo, 'Eventos', '—', 'agendado'),
    P('2026-11-19', '09:00', 'ig', 'story', 'Enquete: como está a sua lavoura?', 'Relacionamento', '—', 'agendado'),
    P('2026-11-20', null, 'video', 'gravacao', 'Gravação: entrevista com agrônomo', 'Campo', '—', 'producao'),
    P('2026-11-23', '11:30', 'ig', 'post', 'Depoimento: produtor de Toledo', 'Campo', 'Linha foliar', 'aprovado'),
    P('2026-11-25', '17:00', 'yt', 'short', 'Dica rápida: calibragem do pulverizador', 'Manejo', '—', 'aprovado'),
    P('2026-11-25', null, 'design', 'producao', T.pecas2, 'Institucional', '—', 'pauta'),
    P('2026-11-27', '11:30', 'ig', 'carrossel', 'Fechamento do plantio: números da safra', 'Institucional', '—', 'aprovado'),
    P('2026-11-27', null, 'video', 'entrega', 'Entrega: entrevista com agrônomo', 'Campo', '—', 'pauta'),
    P('2026-11-30', '12:00', 'fb', 'post', `${Mes(0)} na Spraytec`, 'Institucional', '—', 'aprovado'),
    P('2026-12-01', null, 'ads', 'plano', `Plano de mídia de ${mes(1)}`, 'Produto', 'Bioestimulante', 'aprovacao'),
    P('2026-12-02', '11:30', 'ig', 'carrossel', 'Pós-emergência: a janela certa de aplicação', 'Manejo', 'Linha foliar', 'aprovacao'),
    P('2026-12-03', '08:00', 'email', 'newsletter', `Newsletter de ${mes(1)}: florescimento sem estresse`, 'Manejo', 'Bioestimulante', 'aprovacao'),
    P('2026-12-04', '18:00', 'ig', 'reel', 'Resultado de campo: ensaio safra 25/26', 'Campo', 'Bioestimulante', 'validacao', { comments: [{ who: 'Matheus', text: 'Mandei para a agronomia conferir os números do ensaio antes de aprovar.', interno: false, quando: com('2026-11-14', '10:12') }] }),
    P('2026-12-05', null, 'design', 'pecas', 'Peças de anúncio: florescimento', 'Produto', 'Bioestimulante', 'aprovacao'),
    P('2026-12-07', '12:00', 'fb', 'post', 'Cuidados com o calor no florescimento', 'Manejo', 'Bioestimulante', 'ajuste', { comments: [{ who: 'Matheus', text: 'Trocar a foto: essa lavoura é de milho. Usar uma de soja em R1.', interno: false, quando: com('2026-11-14', '09:40') }] }),
    P('2026-12-08', '09:00', 'ig', 'story', 'Bastidores: chegada da linha foliar nas revendas', 'Produto', 'Linha foliar', 'aprovacao'),
    P('2026-12-09', '11:30', 'ig', 'post', 'Linha foliar: guia rápido de produtos', 'Produto', 'Linha foliar', 'aprovacao'),
    P('2026-12-09', null, 'video', 'gravacao', 'Gravação: calibragem do pulverizador (Short)', 'Manejo', '—', 'pauta'),
    P('2026-12-10', null, 'design', 'producao', `Peças de ${mes(2)} (lote 1)`, 'Manejo', '—', 'pauta'),
    P('2026-12-11', '17:00', 'yt', 'video', 'Entrevista com agrônomo Spraytec', 'Campo', '—', 'producao', { comments: [{ who: 'Atendimento Cancha', text: `Produtora confirmou gravação dia ${dm('2026-11-20')}. Roteiro v2 aprovado.`, interno: true, quando: com('2026-11-13', '16:05') }] }),
    P('2026-12-14', '11:30', 'ig', 'carrossel', '5 erros comuns na aplicação foliar', 'Educação', 'Linha foliar', 'aprovacao'),
    P('2026-12-16', '09:00', 'ig', 'story', T.contagem, 'Eventos', '—', 'pauta'),
    P('2026-12-17', '08:00', 'email', 'newsletter', T.newsEnsaio, 'Campo', 'Bioestimulante', 'producao'),
    P('2026-12-18', '12:00', 'fb', 'post', T.lab, 'Institucional', '—', 'producao'),
    P('2026-12-21', '18:00', 'ig', 'reel', T.rtv, 'Campo', '—', 'aprovacao'),
    P('2026-12-23', '11:30', 'ig', 'post', T.numeros, 'Institucional', '—', 'aprovado'),
    P(null, null, 'ig', 'post', 'Lançamento: novo produto (aguardando registro MAPA)', 'Produto', 'Novo produto', 'espera'),
  ];
  const prazoCal = D('2026-11-17');
  for (const p of e.posts) {
    const proto = p._proto; delete p._proto;
    p.hist.push({ q: '—', t: 'Criado pela Cancha' });
    if (['aprovado', 'agendado', 'publicado'].includes(p.status) && !['video', 'design'].includes(p.rede))
      p.hist.push({ q: dm(proto && proto < '2026-12-01' ? '2026-10-22' : '2026-11-13'), t: 'Aprovado por Matheus · portal' });
    if (p.status === 'publicado') p.hist.push({ q: fmt(p.date), t: p.anterior ? 'Publicado pela agência anterior' : 'Concluído' });
    if (['aprovacao', 'validacao'].includes(p.status)) { p.prazo = prazoCal; p.hist.push({ q: dm('2026-11-13'), t: 'Enviado para aprovação' }); }
  }
  const byT = (t: string) => e.posts.find((p) => p.titulo === t);

  e.videos = [
    { id: 'v1', titulo: 'Entrevista com agrônomo Spraytec', stage: 'gravacao', viavel: true, gravacao: dm('2026-11-20'), parecer: 'Viável. Gravamos na fazenda experimental.', roteiro: 'Abertura: problema do calor no florescimento.\nBloco 1: o que acontece na planta.\nBloco 2: manejo nutricional.\nFechamento: chamada para falar com o RTV.', postTitle: 'Entrevista com agrônomo Spraytec' },
    { id: 'v2', titulo: 'Ensaio de campo safra 25/26', stage: 'entregue', viavel: true, gravacao: dm('2026-11-06'), parecer: 'Viável.', roteiro: `Roteiro aprovado em ${dm('2026-10-30')}.`, postTitle: 'Resultado de campo: ensaio safra 25/26' },
    { id: 'v3', titulo: 'Short: calibragem do pulverizador', stage: 'roteiro', viavel: true, gravacao: dm('2026-12-09'), parecer: `Viável, cabe na diária do dia ${dm('2026-12-09')}.`, roteiro: 'Gancho em 2 s: "Seu pulverizador está jogando produto fora?"\nPasso 1, 2, 3 em tela.\nCTA: salve para a próxima aplicação.', prazo: D('2026-11-19') },
    { id: 'v4', titulo: 'Bastidores da fábrica, parte 2', stage: 'viabilidade', viavel: null, gravacao: '—', parecer: '', roteiro: '' },
    { id: 'v6', titulo: 'Depoimento de produtor no MT', stage: 'pauta', viavel: null, gravacao: '—', parecer: '', roteiro: '' },
    { id: 'v7', titulo: 'Melhores momentos da safra', stage: 'roteiro', viavel: true, gravacao: '—', parecer: 'Viável com material do acervo.', roteiro: 'Montagem com o acervo da safra. Texto em tela, sem locução.', prazo: D('2026-11-19') },
  ];
  for (const v of e.videos) { v.hist = []; if (v.postTitle) { const p = byT(v.postTitle); if (p) v.postId = p.id; } delete v.postTitle; }

  e.marcos = [
    { id: 'm1', tipo: 'safra', nome: 'Plantio da soja: reta final (PR/MT)', ini: D('2026-11-01', false), fim: D('2026-11-20', false) },
    { id: 'm2', tipo: 'safra', nome: 'Pós-emergência e nutrição V3–V6', ini: D('2026-11-10', false), fim: D('2026-11-30', false) },
    { id: 'm3', tipo: 'comercial', nome: 'Linha foliar', ini: D('2026-11-01', false), fim: D('2026-11-30', false) },
    { id: 'm4', tipo: 'evento', nome: 'Dia de campo em Cascavel', ini: D('2026-11-17'), fim: D('2026-11-17') },
    { id: 'm5', tipo: 'safra', nome: 'Florescimento da soja (PR)', ini: D('2026-12-01', false), fim: D('2026-12-31', false) },
    { id: 'm6', tipo: 'comercial', nome: 'Bioestimulante', ini: D('2026-12-01', false), fim: D('2026-12-22', false) },
    { id: 'm7', tipo: 'evento', nome: 'Feira regional: estande Spraytec', ini: D('2026-12-22'), fim: D('2026-12-24') },
  ];

  e.demandas = [
    { id: 'd1', quem: 'cancha', t: `Entregar calendário de ${mes(1)}`, data: D('2026-11-13'), feito: true },
    { id: 'd2', quem: 'cancha', t: `Relatório de ${mes(-1)}`, data: D('2026-11-10'), feito: true },
    { id: 'd3', quem: 'spraytec', t: `Aprovar calendário de ${mes(1)}`, data: D('2026-11-17'), det: `Enviado em ${dm('2026-11-13')}. Prazo de 2 dias úteis (cláusula 3.2).` },
    { id: 'd4', quem: 'spraytec', t: 'Aprovar alterações do plano de mídia (versão 3)', data: D('2026-11-17') },
    { id: 'd5', quem: 'spraytec', t: 'Liberar acesso de administrador no Google Ads', data: D('2026-10-24'), det: `Pedido em ${dm('2026-10-22')}. Sem esse acesso a etapa 1 do Google Ads fica parada, e o prazo da Cancha fica suspenso (cláusula 3.2).` },
    { id: 'd6', quem: 'cancha', t: `Roteiros de ${mes(1)}`, data: D('2026-11-18') },
    { id: 'd7', quem: 'spraytec', t: 'Enviar lista de produtos e registros MAPA', data: D('2026-11-18') },
    { id: 'd11', quem: 'spraytec', t: 'Fotos do dia de campo na pasta do Drive', data: D('2026-11-18') },
    { id: 'd8', quem: 'cancha', t: 'Reunião semanal', data: D('2026-11-19') },
    { id: 'd9', quem: 'spraytec', t: 'Validar números do ensaio com a agronomia', data: D('2026-11-19') },
    { id: 'd10', quem: 'cancha', t: T.pecas1, data: D('2026-11-18') },
    { id: 'd12', quem: 'cancha', t: 'Reunião semanal', data: D('2026-11-26') },
    { id: 'd13', quem: 'cancha', t: `Relatório de ${mes(0)}`, data: D('2026-12-10') },
    { id: 'd14', quem: 'cancha', t: `Calendário de ${mes(2)}`, data: D('2026-12-15') },
    { id: 'd15', quem: 'cancha', t: `Plano de mídia de ${mes(2)}`, data: D('2026-12-15') },
    { id: 'd16', quem: 'spraytec', t: `Aprovar calendário de ${mes(2)}`, data: D('2026-12-17') },
  ];
  const dT = (t: string) => e.demandas.find((d) => d.t === t);

  // Ligações entre itens
  const ref = (kind: 'p' | 'd', t: string) => { const x = kind === 'p' ? byT(t) : dT(t); return x ? kind + ':' + x.id : null; };
  const link = (...refs: (string | null)[]) => { const r = refs.filter(Boolean) as string[]; for (let i = 1; i < r.length; i++) e.links.push([r[0], r[i]]); };
  link(ref('p', T.pecas1), ref('p', 'Pós-emergência: a janela certa de aplicação'), ref('p', 'Cuidados com o calor no florescimento'), ref('p', 'Linha foliar: guia rápido de produtos'), ref('p', 'Bastidores: chegada da linha foliar nas revendas'), ref('p', `Newsletter de ${mes(1)}: florescimento sem estresse`), ref('p', 'Peças de anúncio: florescimento'), ref('d', T.pecas1));
  link(ref('p', T.pecas2), ref('p', '5 erros comuns na aplicação foliar'), ref('p', T.contagem), ref('p', T.lab), ref('p', T.numeros), ref('p', T.newsEnsaio));
  link('v:v1', ref('p', 'Gravação: entrevista com agrônomo'), ref('p', 'Entrega: entrevista com agrônomo'), ref('p', 'Entrevista com agrônomo Spraytec'));
  link(ref('p', 'Entrevista com agrônomo Spraytec'), ref('p', 'Gravação: entrevista com agrônomo'), ref('p', 'Entrega: entrevista com agrônomo'));
  link(ref('p', 'Gravação: bastidores da fábrica'), ref('p', 'Bastidores da fábrica em Maringá'));
  link('v:v3', ref('p', 'Gravação: calibragem do pulverizador (Short)'), ref('d', `Roteiros de ${mes(1)}`));
  link('v:v7', ref('d', `Roteiros de ${mes(1)}`), ref('p', T.rtv));
  link('v:v2', ref('p', 'Resultado de campo: ensaio safra 25/26'), ref('d', 'Validar números do ensaio com a agronomia'));
  link(ref('p', 'Resultado de campo: ensaio safra 25/26'), ref('d', 'Validar números do ensaio com a agronomia'));
  link(ref('p', `Plano de mídia de ${mes(1)}`), ref('d', 'Aprovar alterações do plano de mídia (versão 3)'), ref('p', 'Peças de anúncio: florescimento'));
  link(ref('p', 'Templates de carrossel educativo'), ref('p', 'Mitos e verdades sobre micronutrientes'), ref('p', '5 erros comuns na aplicação foliar'));
  link(ref('p', T.agendaCampo), ref('p', T.conviteCampo), ref('d', 'Fotos do dia de campo na pasta do Drive'));

  // Conversas
  const proxFeriado = Object.keys(FERIADOS).sort().find((d) => d > addDays(hoje, 3)) || addDays(hoje, 10);
  e.threads = [
    { id: 't1', tema: `Calendário de ${mes(1)}`, ref: ref('d', `Aprovar calendário de ${mes(1)}`), unread: { matheus: 0, cancha: 0 }, msgs: [
      { de: 'cancha', nome: 'Atendimento Cancha', q: com('2026-11-13', '17:02'), txt: `Matheus, o calendário de ${mes(1)} está no portal, em Aprovação. O prazo é ${dm('2026-11-17')}.` },
      { de: 'matheus', nome: 'Matheus', q: com('2026-11-14', '10:15'), txt: 'Vi sim. Mandei o reel do ensaio para a agronomia conferir os números. O resto aprovo até o prazo.' },
      { de: 'cancha', nome: 'Atendimento Cancha', q: com('2026-11-14', '10:21'), txt: 'Combinado. O post do calor no florescimento está com a foto sendo trocada e volta para você hoje.' }] },
    { id: 't2', tema: 'Acesso ao Google Ads', ref: ref('d', 'Liberar acesso de administrador no Google Ads'), unread: { matheus: 0, cancha: 0 }, msgs: [
      { de: 'cancha', nome: 'Luís', q: com('2026-10-22', '09:30'), txt: 'Para rodar a etapa 1 do Google Ads precisamos de acesso de administrador na conta. Pode liberar para o e-mail da Cancha?' },
      { de: 'cancha', nome: 'Atendimento Cancha', q: com('2026-11-05', '11:00'), txt: 'Passando para lembrar do acesso. Enquanto isso, a campanha de pesquisa segue parada.' },
      { de: 'matheus', nome: 'Matheus', q: com('2026-11-06', '14:40'), txt: 'O TI está vendo. Quem tem o acesso hoje é a agência anterior, estou cobrando.' }] },
    { id: 't3', tema: 'Fotos do dia de campo', ref: ref('d', 'Fotos do dia de campo na pasta do Drive'), unread: { matheus: 0, cancha: 1 }, msgs: [
      { de: 'matheus', nome: 'Matheus', q: com('2026-11-15', '18:05'), txt: 'As fotos do dia de campo chegam amanhã. Coloco na pasta do Drive.' }] },
    { id: 't4', tema: `Feriado de ${fmt(proxFeriado)}`, ref: null, unread: { matheus: 1, cancha: 1 }, msgs: [
      { de: 'matheus', nome: 'Matheus', q: fmt(hoje) + ' 09:20', txt: `A expedição não funciona no feriado de ${fmt(proxFeriado)}. Dá para incluir um story avisando um dia antes?` },
      { de: 'cancha', nome: 'Atendimento Cancha', q: fmt(hoje) + ' 09:34', txt: 'Dá sim. Montamos hoje e mandamos para sua aprovação até 14h.' }] },
  ];

  // Plano de mídia (versão 2 aprovada, versão 3 esperando aprovação)
  const dados = {
    objetivo: 'Gerar contatos qualificados para o bioestimulante no florescimento da soja',
    objItens: ['Manter a Spraytec presente no dia a dia do produtor, no ritmo da safra'],
    metas: { contatos: 220, cpl: 90 },
    jornada: [
      { n: 'Descobrir', d: 'Produtores que ainda não conhecem a Spraytec', v: 5000, ind: 'alcance', acoes: [{ c: 'social', t: 'Reels de campo e conteúdo de manejo' }, { c: 'video', t: 'Entrevista com agrônomo e vídeos de ensaio' }, { c: 'trafego', t: 'YouTube e Meta para produtores de soja do PR, MT e MS' }] },
      { n: 'Considerar', d: 'Quem já viu a marca e quer entender o produto', v: 9000, ind: 'cliques', acoes: [{ c: 'design', t: 'Carrosséis educativos sobre nutrição foliar' }, { c: 'trafego', t: 'Remarketing de quem visitou as páginas de produto' }, { c: 'email', t: 'Newsletter com o manejo do mês' }] },
      { n: 'Falar com a Spraytec', d: 'Contato com o RTV ou a revenda', v: 4000, ind: 'contatos', acoes: [{ c: 'trafego', t: 'Anúncios de contato e pesquisa no Google' }, { c: 'social', t: 'Chamada para o RTV nas publicações de produto' }] },
      { n: 'Continuar junto', d: 'Clientes, revendas e time de campo', v: 0, ind: 'interacoes', acoes: [{ c: 'social', t: 'Repost diário das marcações do time de campo' }, { c: 'email', t: 'Convites para dias de campo e eventos' }] }],
    temas: [
      { n: 'Florescimento sem estresse', prod: 'Bioestimulante', periodo: `${dmr('2026-12-01')} a ${dmr('2026-12-22')}`, msg: 'O florescimento define a produtividade. Proteja essa fase.', acoes: [{ c: 'social', t: 'Carrossel de pós-emergência e reel do ensaio de campo' }, { c: 'trafego', t: 'Remarketing com as peças do florescimento' }, { c: 'email', t: `Newsletter de ${mes(1)} com o tema` }, { c: 'design', t: 'Peças de anúncio em feed, stories e anúncio' }, { c: 'video', t: 'Entrevista com agrônomo sobre calor no florescimento' }] },
      { n: 'Prova de campo', prod: 'Linha completa', periodo: `${dmr('2026-12-16')} a ${dmr('2026-12-31')}`, msg: 'Resultado de campo vale mais que promessa.', acoes: [{ c: 'social', t: 'Números da safra e um dia com o RTV' }, { c: 'email', t: 'Newsletter com o resultado do ensaio' }, { c: 'video', t: 'Melhores momentos da safra' }] }],
    ritmo: [{ num: '3 a 4', unid: 'posts por semana', c: 'social' }, { num: '2', unid: 'roteiros de vídeo', c: 'video' }, { num: '10', unid: 'peças por mês', c: 'design' }, { num: '1', unid: 'newsletter por mês', c: 'email' }],
    verba: [{ k: 'Meta Ads', v: 9000 }, { k: 'Google Ads', v: 6000 }, { k: 'YouTube Ads', v: 3000 }],
    fases: [{ n: 'Presença e rastreamento', d: 'Calendário no ritmo da safra, repost diário e o site medindo tudo' }, { n: 'Remarketing e contatos', d: 'Quem já conhece a marca volta a ver o produto e chama o RTV' }, { n: 'Funil fechado', d: 'Cada venda ligada à origem: rede, anúncio ou e-mail' }], fase: 2,
    crono: [{ d: D('2026-12-01'), t: 'Campanhas de florescimento no ar' }, { d: D('2026-12-08'), t: 'Troca de criativos do teste A/B' }, { d: D('2026-12-15'), t: `Calendário e plano de ${mes(2)}` }, { d: D('2027-01-10'), t: 'Resultados no relatório' }],
    pedidos: ['Acesso de administrador ao Google Ads', 'Lista de produtos e registros MAPA'],
  };
  const v3 = JSON.parse(JSON.stringify(dados));
  v3.ritmo[0].num = '4'; v3.ritmo[3] = { num: '2', unid: `newsletters em ${mes(1)}`, c: 'email' }; v3.verba[0].v = 10000; v3.verba[2].v = 2000;
  v3.temas[0].acoes.push({ c: 'email', t: `Newsletter extra em ${dm('2026-12-10')} sobre o florescimento` });
  v3.jornada[0].v = 4000; v3.jornada[1].v = 10000; v3.jornada[1].acoes.push({ c: 'email', t: 'Newsletter extra sobre o florescimento' });
  e.plano = {
    versao: 2, aprovado: dm('2026-11-13'), dados,
    pendente: { versao: 3, por: 'Atendimento Cancha', em: com('2026-11-16', '10:05'), nota: 'Ajuste para o florescimento: mais verba no Meta, que hoje tem o menor custo por contato, e uma newsletter extra.', ajuste: null, dados: v3 },
    hist: [{ v: 1, q: dm('2026-10-22'), t: 'Plano inicial aprovado por Matheus' }, { v: 2, q: dm('2026-11-13'), t: 'Fase 2 (remarketing e contatos) aprovada por Matheus' }],
  };
  const pi = e.posts.find((p) => p.formato === 'plano');
  pi.titulo = 'Plano de mídia · versão 3'; pi.date = hoje; pi.time = null; pi.prazo = prazoCal;

  // Ano safra: 12 meses a partir do mês atual
  const ANO = [
    ['Plantio da soja', 'arranque', 'Linha foliar no arranque', 'Ser lembrado no momento da primeira aplicação foliar.', 'Linha foliar · Adjuvantes', '120 contatos qualificados', ['social', 'trafego', 'email', 'video'], 18000, 9700],
    ['Desenvolvimento da soja', 'arranque', 'Florescimento sem estresse', 'Mostrar manejo de estresse antes do florescimento.', 'Bioestimulantes · Linha foliar', '100 contatos qualificados', ['social', 'trafego', 'email'], 18000, null],
    ['Enchimento de grãos', 'enchimento', 'Bioestimulante no enchimento', 'Ligar a aplicação ao peso de grão.', 'Bioestimulantes', '90 contatos qualificados', ['social', 'trafego', 'video'], 16000, null],
    ['Colheita da soja · plantio do milho', 'colheita', 'Arranque do milho safrinha', 'Capturar a decisão rápida do plantio do milho.', 'Tratamento de sementes · Linha foliar', '140 contatos qualificados', ['social', 'trafego', 'email', 'video'], 20000, null],
    ['Milho safrinha', 'colheita', 'Nutrição do milho', 'Provar resultado com dados de campo.', 'Linha foliar', '110 contatos qualificados', ['social', 'trafego', 'email'], 18000, null],
    ['Milho safrinha', 'colheita', 'Resultados de campo', 'Transformar resultados da soja em prova social.', 'Linha completa', '80 contatos qualificados', ['social', 'video'], 14000, null],
    ['Trigo e culturas de inverno', 'inverno', 'Linha para trigo', 'Abrir a conversa com o produtor de inverno no Sul.', 'Linha foliar · Adjuvantes', '60 contatos qualificados', ['social', 'trafego'], 12000, null],
    ['Trigo e culturas de inverno', 'inverno', 'Dias de campo de inverno', 'Levar público aos dias de campo.', 'Linha para trigo', '300 inscritos nos dias de campo', ['social', 'email'], 12000, null],
    ['Planejamento da safra', 'compra', 'Planejamento 27/28', 'Entrar na lista de compra antecipada.', 'Linha completa', '50 oportunidades com revendas', ['email', 'trafego'], 10000, null],
    ['Pré-plantio', 'compra', 'Tratamento de sementes', 'Fechar pedidos antes do plantio.', 'Tratamento de sementes', '70 oportunidades', ['social', 'trafego', 'email'], 15000, null],
    ['Plantio da soja', 'plantio', 'Início do plantio', 'Estar presente na janela de plantio.', 'Tratamento de sementes · Linha foliar', '130 contatos qualificados', ['social', 'trafego', 'email', 'video'], 20000, null],
    ['Plantio da soja', 'plantio', 'Emergência e arranque', 'Repetir o arranque com a prova da safra anterior.', 'Linha foliar', '130 contatos qualificados', ['social', 'trafego', 'video'], 20000, null],
  ] as const;
  e.ano = ANO.map((x, i) => ({ id: 'a' + i, m: ym(i), fase: x[0], mo: x[1], tema: x[2], obj: x[3], prods: x[4], kpi: x[5], fr: [...x[6]], p: x[7], e: x[8] }));
  e.lanes = [
    { l: 'Soja', k: 'safra', it: [[0, 1, 'Plantio'], [1, 2, 'Desenvolvimento'], [3, 2, 'Colheita'], [10, 2, 'Plantio 27/28']] },
    { l: 'Milho safrinha', k: 'safra', it: [[3, 2, 'Plantio'], [5, 2, 'Desenvolvimento'], [7, 2, 'Colheita']] },
    { l: 'Trigo', k: 'safra', it: [[6, 2, 'Plantio'], [8, 2, 'Desenvolvimento'], [10, 2, 'Colheita']] },
    { l: 'Janela comercial', k: 'comercial', it: [[0, 2, 'Reposição foliar'], [2, 2, 'Pedidos do milho'], [6, 1, 'Inverno'], [7, 4, 'Compra antecipada 27/28']] },
    { l: 'Eventos', k: 'evento', it: [[3, 1, 'Show Rural'], [4, 1, 'Expodireto'], [5, 1, 'Agrishow'], [7, 1, 'Dias de campo']] }];

  e.conc = [
    { id: 'k1', nome: 'Concorrente A', cor: '#4F7BB5', ads: 14, novos: 4, dur: 52, fmt: [55, 30, 15], tr: [6, 7, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14], tem: { prod: 3, foliar: 1, bio: 1, prova: 3, preco: 0, tec: 1 }, amea: 'alta', pilar: 'Campo', dest: 'Produtor conta o ganho de 6 sacas', leitura: 'Aumentou os anúncios no florescimento e usa depoimento de produtor como prova.' },
    { id: 'k2', nome: 'Concorrente B', cor: '#C98A12', ads: 6, novos: 1, dur: 18, fmt: [0, 20, 80], tr: [8, 8, 7, 7, 6, 6, 6, 5, 6, 6, 6, 6], tem: { prod: 1, foliar: 0, bio: 0, prova: 0, preco: 3, tec: 0 }, amea: 'baixa', pilar: 'Produto', dest: `Condição especial até ${dm('2026-11-30')}`, leitura: 'Comunica oferta e prazo de pagamento. Pouco conteúdo técnico.' },
    { id: 'k3', nome: 'Concorrente C', cor: '#9A6BC2', ads: 21, novos: 6, dur: 74, fmt: [70, 20, 10], tr: [12, 13, 14, 14, 15, 16, 17, 18, 18, 19, 20, 21], tem: { prod: 2, foliar: 3, bio: 1, prova: 2, preco: 0, tec: 3 }, amea: 'alta', pilar: 'Manejo', dest: 'Agrônomo explica a foliar no V4', leitura: 'Volume alto de vídeos com agrônomo. É o mais parecido com a linha editorial da Spraytec.' }];
  e.concAcoes = [
    { t: `Prova de campo é o tema em que mais apanhamos: transformar os resultados da soja em depoimentos em ${mes(5)}.`, ref: 'Estratégia · ' + mesLbl(5) },
    { t: `Ninguém fala de manejo de estresse no florescimento com conteúdo técnico. Ocupar esse espaço em ${mes(1)}.`, ref: 'Estratégia · ' + mesLbl(1) },
    { t: 'Concorrente C cresce com vídeo de agrônomo: testar 2 vídeos curtos com o agrônomo da Spraytec.', ref: 'Aprendizados' }];

  e.aprendizados = [
    { id: 'l1', frente: 'trafego', t: 'Carrossel educativo × reel de campo no remarketing', hip: 'O carrossel explica melhor o produto e gera contatos mais baratos.', res: 'Carrossel venceu: custo por contato de R$ 69 contra R$ 93 do reel.', dec: 'Carrossel passa a ser o formato principal do remarketing do florescimento.', data: D('2026-11-13'), status: 'concluido' },
    { id: 'l2', frente: 'social', t: 'Horário dos posts: 11h30 × 18h', hip: 'O produtor olha o celular no almoço.', res: '11h30 teve 22% mais alcance médio em 3 semanas.', dec: 'Posts de feed às 11h30 e reels às 18h.', data: D('2026-11-10'), status: 'concluido' },
    { id: 'l3', frente: 'trafego', t: 'Termos de marca numa campanha separada', hip: 'Separar os termos de marca reduz o custo por clique.', res: 'O custo por clique de marca caiu de R$ 1,90 para R$ 0,70.', dec: 'Campanha de marca separada mantida.', data: D('2026-11-06'), status: 'concluido' },
    { id: 'l4', frente: 'email', t: 'Assunto com pergunta × assunto direto', hip: 'Pergunta no assunto aumenta a abertura.', res: `Teste em andamento até ${dm('2026-12-05')}.`, dec: '', data: D('2026-12-05'), status: 'teste' }];

  e.guia = {
    tom: ['Técnico, mas fácil de entender', 'Fala com o produtor de igual para igual', 'Mostra resultado de campo, sem exagero'],
    evitar: ['Promessa de produtividade garantida', 'Dose ou mistura fora da bula', 'Preço e condição comercial em post', 'Comparação direta com concorrente'],
    termos: ['bioestimulante | produto milagroso', 'nutrição foliar | adubo foliar barato', 'RTV Spraytec | vendedor'],
    produtos: ['Linha foliar | registro MAPA a preencher | Nutrição no momento certo da cultura', 'Bioestimulante | registro MAPA a preencher | Ajuda a planta a atravessar o estresse do florescimento'],
    hashtags: ['#Spraytec', '#NutriçãoVegetal', '#Soja', '#Agro'],
  };

  const seg = segunda(hoje), s1 = addDays(seg, -7), s2 = addDays(seg, -14), s3 = addDays(seg, -21);
  const sem = (s: string) => `${fmt(s)} a ${fmt(addDays(s, 6))}`;
  e.relatorios = [
    { id: 'r1', t: `Relatório de ${mes(0)} de ${mesRel(0).a}`, capa: `${Mes(0)} ${mesRel(0).a}`, tipo: 'Relatório mensal', per: `01/${mm(0)} a ${ultimoDia(0)}/${mm(0)} · social, tráfego pago e e-mail`, entrega: `${ym(1)}-10`, status: 'previsto', nota: 'Os números do mês são fechados no dia 1º.' },
    { id: 'r2', t: 'Resultado da campanha: dia de campo', capa: 'Dia de campo', tipo: 'Campanha', per: `Convite, posts e mídia do evento de ${dm('2026-12-17')}`, entrega: D('2026-12-22'), status: 'previsto', nota: 'Sai uma semana depois do evento.' },
    { id: 'r3', t: `Relatório de ${mes(-1)} de ${mesRel(-1).a}`, capa: `${Mes(-1)} ${mesRel(-1).a}`, tipo: 'Relatório mensal', per: `${dm('2026-10-22')} a ${ultimoDia(-1)}/${mm(-1)} · primeiros dias de operação`, entrega: `${ym(0)}-10`, status: 'entregue', dest: [`Calendário de ${mes(0)} aprovado no prazo`, 'Rastreamento completo no site (etapa 1)', 'Repost diário em todos os dias úteis'] },
    { id: 'rx1', t: `Executivo · semana de ${fmt(s1)}`, capa: `Semana ${semanaISO(s1)}`, tipo: 'Executivo semanal', per: sem(s1), entrega: seg, status: 'rascunho', frase: 'Semana com o melhor custo por contato desde o início: o carrossel educativo puxou o resultado do remarketing.', dest: ['52 contatos na semana, 18% a mais que a anterior', 'Custo por contato caiu de R$ 91 para R$ 82', `Calendário de ${mes(1)} enviado no prazo`], aten: 'O acesso de administrador ao Google Ads segue pendente e trava a campanha de marca.', prox: `Aprovar o calendário de ${mes(1)} até ${dm('2026-11-17')}.\nGravar a entrevista com agrônomo (${dm('2026-11-20')}).\nPublicar a campanha de florescimento em ${dm('2026-12-01')}.` },
    { id: 'rx2', t: `Executivo · semana de ${fmt(s2)}`, capa: `Semana ${semanaISO(s2)}`, tipo: 'Executivo semanal', per: sem(s2), entrega: s1, status: 'entregue', k: { cont: 44, contP: 39, cpl: 91, cplP: 96, alc: 19800, alcP: 15400 }, frase: 'Primeira semana com o rastreamento completo: agora cada contato tem origem conhecida.', dest: ['44 contatos na semana', 'Rastreamento do site concluído (etapa 1)', 'Repost diário em todos os dias úteis'], aten: 'Termos de marca disputando verba com a prospecção no Google.', prox: `Separar a campanha de marca.\nFechar o calendário de ${mes(1)} até ${dm('2026-11-13')}.` },
    { id: 'r5', t: `Gerencial · semana de ${fmt(seg)}`, capa: `Semana ${semanaISO(seg)}`, tipo: 'Gerencial semanal', per: sem(seg) + ' · todas as frentes', entrega: addDays(seg, 7), status: 'previsto', nota: 'Sai toda segunda.' },
    { id: 'r6', t: `Gerencial · semana de ${fmt(s1)}`, capa: `Semana ${semanaISO(s1)}`, tipo: 'Gerencial semanal', per: sem(s1) + ' · todas as frentes', entrega: seg, status: 'rascunho', dest: ['Teste A/B: carrossel venceu o reel', 'Custo por contato caiu para R$ 82'] },
    { id: 'r7', t: `Gerencial · semana de ${fmt(s2)}`, capa: `Semana ${semanaISO(s2)}`, tipo: 'Gerencial semanal', per: sem(s2) + ' · todas as frentes', entrega: s1, status: 'entregue', dest: ['Verba movida do Display para Pesquisa'] },
    { id: 'r8', t: `Gerencial · semana de ${fmt(s3)}`, capa: `Semana ${semanaISO(s3)}`, tipo: 'Gerencial semanal', per: sem(s3) + ' · todas as frentes', entrega: s2, status: 'entregue', dest: ['Primeira semana com rastreamento completo'] },
    { id: 'r9', t: 'Lançamento do calendário de safra no Instagram', capa: 'Calendário de safra', tipo: 'Campanha', per: `Série de posts de ${dm('2026-11-01')} a ${dm('2026-11-15')}`, entrega: D('2026-11-18'), status: 'previsto', nota: 'Fecha depois do último post da série.' },
    { id: 'r4', t: 'Diagnóstico inicial: redes, mídia e dados', capa: 'Diagnóstico', tipo: 'Diagnóstico', per: `Imersão de ${dm('2026-10-08')} a ${dm('2026-10-21')}`, entrega: D('2026-10-21'), status: 'entregue', dest: ['Situação de cada rede e do site', 'O que medir e como', 'Primeiros passos do plano de mídia'] },
  ];
  return e;
}
