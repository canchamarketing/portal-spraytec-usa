// Testa as etapas 2 e 3: feedbacks, observações e plano do mês, roteiros (produtora), e-mails e landing
// pages (checklist), pedidos do site, SEO e GEO, e o que cada papel vê.
// Uso: node testes/modulos.ts
const { ACOES } = await import('../server/acoes.ts');
const { visaoPara } = await import('../server/visao.ts');
const { estadoVazio } = await import('../server/estado.ts');
const { dadosDemo } = await import('../server/seed.ts');

let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };
const espera = (fn: () => unknown, chave: string, msg: string) => {
  try { fn(); checa(false, msg + ' (não deu erro)'); } catch (e) { checa((e as Error).message === chave, `${msg} (${(e as Error).message})`); }
};
const U = (id: string, papel: string, idioma = 'en-US') => ({ id, nome: id.toUpperCase(), papel, email: null, demo: false, idioma }) as any;
const cancha = U('ana', 'cancha', 'pt-BR'), renato = U('renato', 'aprovador'), leitor = U('leitor', 'leitor'), prod = U('prod', 'produtora');
const pessoas = [cancha, renato, leitor, prod].map(({ id, nome, papel }) => ({ id, nome, papel }));
const e: any = estadoVazio();
const rodar = (acao: string, u: any, d: any) => {
  if (!ACOES[acao]) throw new Error('acao inexistente ' + acao);
  if (!ACOES[acao].papeis.includes(u.papel)) throw new Error('erro.sem_permissao');
  return ACOES[acao].fn({ e, u, d, hoje: '2026-11-11', agora: new Date().toISOString(), pessoas } as any);
};

console.log('Roteiro de vídeo até o vídeo final');
const v = rodar('item-salvar', cancha, { col: 'roteiros', titulo: 'Tractus 45s', roteiro: 'SCENE 1...', duracao: '45', formato: 'vertical', produtos: ['tractus-carbon'] }).criado!;
const R = () => e.roteiros.find((x: any) => x.id === v);
checa(R().status === 'rascunho' && R().duracao === 45, 'roteiro criado como rascunho');
checa(!visaoPara(e, renato).roteiros.length && !visaoPara(e, prod).roteiros.length, 'rascunho: nem Spraytec nem produtora veem');
espera(() => rodar('item-salvar', cancha, { col: 'roteiros', titulo: 'x', roteiro: 'y', formato: 'diagonal' }), 'erro.escolha', 'formato fora da lista é recusado');
rodar('item-enviar', cancha, { col: 'roteiros', id: v });
checa(visaoPara(e, renato).roteiros.length === 1 && !visaoPara(e, prod).roteiros.length, 'em aprovação: Spraytec vê, produtora ainda não');
espera(() => rodar('roteiro-produtora', cancha, { id: v }), 'erro.falta_aprovar', 'não vai para a produtora sem aprovação');
rodar('item-ajuste', renato, { col: 'roteiros', id: v, texto: 'Shorter intro' });
rodar('item-salvar', cancha, { col: 'roteiros', id: v, titulo: 'Tractus 45s', roteiro: 'SCENE 1 (short)...', formato: 'vertical' });
checa(visaoPara(e, renato).roteiros[0].roteiro === 'SCENE 1...', 'durante o ajuste, a Spraytec vê a versão enviada');
rodar('item-enviar', cancha, { col: 'roteiros', id: v });
espera(() => rodar('item-aprovar', renato, { col: 'roteiros', id: v, versao: 1 }), 'erro.versao_mudou', 'aprovar versão velha é recusado');
rodar('item-aprovar', renato, { col: 'roteiros', id: v, versao: 2 });
const env = rodar('roteiro-produtora', cancha, { id: v, prazo: '2026-11-25' });
checa(R().status === 'producao' && env.avisos![0].para.includes('prod'), 'aprovado → produtora (com aviso)');
const vp = visaoPara(e, prod);
checa(vp.roteiros.length === 1 && vp.roteiros[0].roteiro === 'SCENE 1 (short)...' && !vp.anuncios.length && !vp.feedbacks.length && !vp.emails.length, 'a produtora vê só o roteiro aprovado, nada mais');
espera(() => rodar('item-salvar', cancha, { col: 'roteiros', id: v, titulo: 'x', roteiro: 'y' }), 'erro.item_travado', 'com a produtora, o roteiro não muda mais');
espera(() => rodar('roteiro-corte', prod, { id: v, link: 'drive.google.com/x' }), 'erro.link', 'link do vídeo precisa ser completo');
rodar('roteiro-corte', prod, { id: v, link: 'https://drive.google.com/file/d/abc/view', nota: 'First cut' });
checa(R().status === 'corte' && R().corteVersao === 1, 'produtora envia o vídeo (versão 1)');
espera(() => rodar('roteiro-aprovar-corte', prod, { id: v }), 'erro.sem_permissao', 'a produtora não aprova o próprio vídeo');
rodar('roteiro-ajuste-corte', renato, { id: v, texto: 'Music too loud' });
rodar('roteiro-corte', prod, { id: v, link: 'https://drive.google.com/file/d/def/view' });
rodar('roteiro-aprovar-corte', renato, { id: v });
checa(R().status === 'entregue' && R().videoAprovadoVersao === 2 && R().cortes.length === 2, 'vídeo versão 2 aprovado e entregue (as duas versões ficam)');
rodar('comentar', prod, { ref: 'v:' + v, texto: 'Thanks!' });
espera(() => rodar('comentar', prod, { ref: 'f:qualquer', texto: 'x' }), 'erro.nao_encontrado', 'a produtora não comenta fora dos roteiros');

console.log('E-mail: aprovação, checklist e envio');
const em = rodar('item-salvar', cancha, { col: 'emails', titulo: 'Prepay', assunto: 'Lock in your price', lista: 'Customers', envio: '2026-11-20' }).criado!;
const E = () => e.emails.find((x: any) => x.id === em);
espera(() => rodar('item-concluir', cancha, { col: 'emails', id: em }), 'erro.falta_aprovar', 'sem aprovação não marca como enviado');
rodar('item-enviar', cancha, { col: 'emails', id: em });
rodar('item-aprovar', renato, { col: 'emails', id: em });
for (const k of ['lista', 'assunto', 'links']) rodar('item-checklist', cancha, { col: 'emails', id: em, chave: k, feito: true });
espera(() => rodar('item-concluir', cancha, { col: 'emails', id: em }), 'erro.checklist_incompleto', 'checklist incompleto impede o envio');
espera(() => rodar('item-checklist', cancha, { col: 'emails', id: em, chave: 'pixel_meta', feito: true }), 'erro.escolha', 'item de checklist de outro tipo é recusado');
for (const k of ['utm', 'teste', 'descadastro', 'celular']) rodar('item-checklist', cancha, { col: 'emails', id: em, chave: k, feito: true });
checa(E().checklist.utm.por === 'ANA', 'fica registrado quem conferiu cada item');
const fim = rodar('item-concluir', cancha, { col: 'emails', id: em, data: '2026-11-20' });
checa(E().status === 'enviado' && fim.avisos![0].para.includes('renato'), 'enviado, e a Spraytec é avisada');
espera(() => rodar('item-checklist', cancha, { col: 'emails', id: em, chave: 'utm', feito: false }), 'erro.item_travado', 'depois de enviado, o checklist não muda');
rodar('item-resultado', cancha, { col: 'emails', id: em, resultado: { enviados: '1000', aberturas: '350', cliques: '40', descadastros: '' } });
checa(E().resultado.origem === 'manual' && E().resultado.aberturas === 350 && E().resultado.descadastros === null, 'números do Brevo digitados pela Cancha');
espera(() => rodar('item-remover', cancha, { col: 'emails', id: em }), 'erro.item_ja_enviado', 'o que a Spraytec já viu não é apagado');

console.log('Landing page e pedidos do site');
const lp = rodar('item-salvar', cancha, { col: 'paginas', titulo: 'Early order LP', url: 'https://spraytecusa.com/teste' }).criado!;
rodar('item-remover', cancha, { col: 'paginas', id: lp });
checa(!e.paginas.length, 'rascunho nunca enviado pode ser apagado');
const ped = rodar('pedido-salvar', renato, { titulo: 'Fix phone', descricao: 'New number', url: 'https://spraytecusa.com/contact' });
checa(e.pedidos[0].status === 'aberto' && ped.avisos![0].para.includes('ana'), 'Renato abre pedido no site e a Cancha é avisada');
espera(() => rodar('pedido-status', renato, { id: e.pedidos[0].id, status: 'feito' }), 'erro.sem_permissao', 'só a Cancha muda a situação do pedido');
rodar('pedido-status', cancha, { id: e.pedidos[0].id, status: 'feito' });
checa(e.pedidos[0].status === 'feito' && e.pedidos[0].feitoEm === '2026-11-11', 'pedido feito, com data');

console.log('Feedbacks');
espera(() => rodar('feedback-criar', leitor, { tipo: 'ideia', texto: 'x' }), 'erro.sem_permissao', 'o leitor não deixa feedback');
const fb = rodar('feedback-criar', renato, { tipo: 'leads', texto: '3 were dealers', qualidade: 'mistos', quantidade: '9', sobre: 'e:' + em }).criado!;
const F = () => e.feedbacks.find((x: any) => x.id === fb);
checa(F().leads.quantidade === 9 && F().sobre.titulo === 'Prepay', 'feedback de contatos ligado ao e-mail');
rodar('comentar', cancha, { ref: 'f:' + fb, texto: 'Vamos excluir revendedores', interno: true });
checa(F().status === 'aberto', 'comentário interno não conta como resposta');
const resp = rodar('comentar', cancha, { ref: 'f:' + fb, texto: 'Vamos excluir revendedores' });
checa(F().status === 'respondido' && resp.avisos![0].para.includes('renato'), 'a Cancha responde: vira "respondido" e o Renato é avisado (sem precisar de @)');
checa(visaoPara(e, renato).feedbacks[0].comentarios.length === 1, 'o Renato não vê o comentário interno');
rodar('feedback-status', renato, { id: fb, status: 'resolvido' });
checa(F().status === 'resolvido', 'Renato marca como resolvido');

console.log('Observações e plano do mês');
rodar('obs-criar', renato, { mes: '2026-12', assunto: 'produto', texto: 'Focus on Tractus' });
const o = e.observacoes[0];
espera(() => rodar('obs-destino', renato, { id: o.id, destino: 'atendida' }), 'erro.sem_permissao', 'só a Cancha dá destino às observações');
rodar('item-salvar', cancha, { col: 'planos', mes: '2026-12', foco: 'Tractus + early order', verbaMeta: '3000', verbaGoogle: '2400', produtos: ['tractus-carbon'] });
espera(() => rodar('item-salvar', cancha, { col: 'planos', mes: '2026-12', foco: 'outro' }), 'erro.plano_existe', 'um plano por mês');
rodar('item-enviar', cancha, { col: 'planos', id: 'p-2026-12' });
rodar('item-aprovar', renato, { col: 'planos', id: 'p-2026-12' });
rodar('obs-destino', cancha, { id: o.id, destino: 'atendida' });
checa(e.planos[0].status === 'aprovado' && e.planos[0].verbaMeta === 3000 && o.destino === 'atendida', 'plano aprovado e observação marcada como atendida');
espera(() => rodar('obs-remover', renato, { id: o.id }), 'erro.sem_permissao', 'observação com destino não é apagada');

console.log('SEO e GEO');
const k = rodar('palavra-salvar', cancha, { termo: 'boron for soybeans', produtos: ['fulltec-boron-max'] }).criado!;
rodar('palavra-mes', cancha, { id: k, mes: '2026-10', posicao: '9.4', cliques: '14' });
rodar('palavra-mes', cancha, { id: k, mes: '2026-10', posicao: '8.1', cliques: '16' });
checa(e.palavras[0].meses.length === 1 && e.palavras[0].meses[0].posicao === 8.1, 'registrar o mesmo mês substitui (não duplica)');
espera(() => rodar('palavra-salvar', renato, { termo: 'x' }), 'erro.sem_permissao', 'só a Cancha mexe no SEO');
const g = rodar('geo-salvar', cancha, { pergunta: 'Best boron for soybeans?' }).criado!;
rodar('geo-verificar', cancha, { id: g, mes: '2026-11', ferramenta: 'chatgpt', resultado: 'nao', concorrentes: 'Brand A' });
espera(() => rodar('geo-verificar', cancha, { id: g, mes: '2026-11', ferramenta: 'bing', resultado: 'sim' }), 'erro.escolha', 'ferramenta fora da lista é recusada');
checa(e.geo[0].verificacoes[0].concorrentes === 'Brand A', 'verificação de IA registrada');

console.log('Conversas (chat)');
const tc = rodar('conversa-criar', renato, { tema: 'Booth at Iowa Ag Expo' }).criado!;
const T = () => e.conversas.find((x: any) => x.id === tc);
checa(T().canal === 'spraytec', 'conversa aberta pela Spraytec vai para o canal Spraytec');
const m1 = rodar('conversa-enviar', renato, { id: tc, texto: 'Booth 1417 confirmed' });
checa(m1.avisos![0].para.includes('ana') && T().msgs[0].idioma === 'en-US', 'primeira mensagem avisa a Cancha e guarda o idioma de quem escreveu');
const m2 = rodar('conversa-enviar', cancha, { id: tc, texto: 'Ótimo, obrigado!' });
checa(!m2.avisos?.length, 'mensagens seguintes só avisam quem for mencionado com @');
espera(() => rodar('conversa-enviar', leitor, { id: tc, texto: 'oi' }), 'erro.sem_permissao', 'o leitor lê, mas não escreve');
espera(() => rodar('conversa-enviar', prod, { id: tc, texto: 'oi' }), 'erro.nao_encontrado', 'a produtora não escreve no canal da Spraytec');
const tp = rodar('conversa-criar', cancha, { tema: 'Shoot schedule', canal: 'produtora' }).criado!;
checa(visaoPara(e, prod).conversas.length === 1 && visaoPara(e, prod).conversas[0].id === tp, 'a produtora só vê o canal dela');
checa(!visaoPara(e, renato).conversas.some((x: any) => x.id === tp) && visaoPara(e, leitor).conversas.some((x: any) => x.id === tc), 'a Spraytec não vê o canal da produtora; o leitor vê o da Spraytec');
rodar('conversa-lida', leitor, { id: tc });
checa(T().lidoAte.leitor === 2 && ACOES['conversa-lida'].semAuditoria, 'marcar como lida guarda até onde a pessoa leu (sem entrar no registro)');

console.log('Dados de exemplo das novas seções');
const d = dadosDemo('2026-11-11');
const vr = visaoPara(d as any, renato), vpr = visaoPara(d as any, prod);
checa(vr.roteiros.length === 3 && !vr.roteiros.some((x: any) => x.status === 'rascunho'), 'Renato vê 3 roteiros (o rascunho não)');
checa(vpr.roteiros.length === 2 && vpr.roteiros.every((x: any) => ['producao', 'corte'].includes(x.status)), 'a produtora vê só os 2 roteiros com ela');
checa(vr.emails.length === 2 && vr.planos.length === 2 && vr.feedbacks.length === 3, 'Renato vê e-mails enviados, os planos e os feedbacks');
checa(d.planos.find((p: any) => p.mes === '2026-12')?.status === 'aprovacao', 'plano de dezembro em aprovação');

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
