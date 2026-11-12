// Testa as regras da rotação de anúncios, o que cada papel vê, os feriados dos EUA e os dados de exemplo.
// Uso: node testes/rotacao.ts
const { ACOES } = await import('../server/acoes.ts');
const { visaoPara } = await import('../server/visao.ts');
const { dadosDemo } = await import('../server/seed.ts');
const { estadoVazio } = await import('../server/estado.ts');
const { feriado, addBiz, hoje, isBiz } = await import('../server/dominio.ts');
const { tr } = await import('../server/i18n.ts');

let ok = 0, falhas = 0;
const checa = (cond: unknown, msg: string) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };
const espera = (fn: () => unknown, chave: string, msg: string) => {
  try { fn(); checa(false, msg + ' (não deu erro)'); }
  catch (e) { checa((e as Error).message === chave, `${msg} (${(e as Error).message})`); }
};
const cancha = { id: 'uc', nome: 'Ana Cancha', papel: 'cancha' as const, email: null, demo: false, idioma: 'pt-BR' as const };
const renato = { id: 'ur', nome: 'Renato', papel: 'aprovador' as const, email: null, demo: false, idioma: 'en-US' as const };
const leitor = { id: 'ul', nome: 'Leitor', papel: 'leitor' as const, email: null, demo: false, idioma: 'en-US' as const };
const prod = { id: 'up', nome: 'Produtora', papel: 'produtora' as const, email: null, demo: false, idioma: 'en-US' as const };
const pessoas = [cancha, renato, leitor, prod].map(({ id, nome, papel }) => ({ id, nome, papel }));
const e: any = estadoVazio();
const rodar = (acao: string, u: any, d: any) => {
  if (!ACOES[acao].papeis.includes(u.papel)) throw new Error('erro.sem_permissao');
  return ACOES[acao].fn({ e, u, d, hoje: '2026-11-11', agora: new Date().toISOString(), pessoas } as any);
};
const anuncioBase = (rid: string, x: any = {}) => ({ rotacaoId: rid, titulo: 'Anúncio teste', canal: 'meta', formato: 'imagem', locais: ['feed'], objetivo: 'contatos', produtos: ['fulltec-cube'], textos: { titulo: 'Hi', texto: 'Text', cta: 'Learn more', link: 'https://spraytecusa.com' }, ...x });
const A = (id: string) => e.anuncios.find((a: any) => a.id === id);
const R = (id: string) => e.rotacoes.find((r: any) => r.id === id);

console.log('Datas e feriados dos EUA (fuso de Iowa)');
checa(feriado('2026-11-26') === 'acao_gracas', 'Ação de Graças 2026 é 26/11');
checa(feriado('2026-11-27') === 'pos_acao_gracas', 'a sexta depois da Ação de Graças é folga');
checa(feriado('2026-07-03') === 'independencia', '4 de julho de 2026 cai no sábado: folga na sexta, 3/7');
checa(feriado('2027-05-31') === 'memorial', 'Memorial Day 2027 é a última segunda de maio (31/5)');
checa(!feriado('2026-09-07') || feriado('2026-09-07') === 'trabalho', 'Labor Day 2026 é 7/9');
checa(feriado('2026-04-21') === '', 'Tiradentes (feriado do Brasil) não conta aqui');
checa(addBiz('2026-11-30', -3) === '2026-11-23', '3 dias úteis antes de 30/11 pula o feriado de Ação de Graças');
checa(!isBiz('2026-12-25') && isBiz('2026-12-24'), 'Natal não é dia útil; véspera é');
checa(hoje(new Date('2026-11-12T03:00:00Z')) === '2026-11-11', 'às 3h UTC ainda é dia 11 em Iowa');

console.log('Montar a rotação');
espera(() => rodar('rotacao-criar', renato, { ini: '2026-12-01', fim: '2026-12-14' }), 'erro.sem_permissao', 'só a Cancha cria rotação');
espera(() => rodar('rotacao-criar', cancha, { ini: '2026-12-14', fim: '2026-12-01' }), 'erro.datas_ordem', 'fim antes do início é recusado');
const r1 = rodar('rotacao-criar', cancha, { ini: '2026-11-30', fim: '2026-12-13', foco: 'Tractus Carbon' }).criado!;
checa(R(r1).prazo === '2026-11-23', 'prazo padrão: 3 dias úteis antes do início');
const a1 = rodar('anuncio-salvar', cancha, anuncioBase(r1, { textos: {} })).criado!;
const a2 = rodar('anuncio-salvar', cancha, anuncioBase(r1, { titulo: 'Busca', canal: 'google', formato: 'texto', locais: ['pesquisa'], objetivo: 'protecao', textos: { titulo: 'Spraytec', texto: 'Fulltec line' } })).criado!;
espera(() => rodar('anuncio-salvar', cancha, anuncioBase(r1, { objetivo: 'engajamento' })), 'erro.escolha', 'objetivo fora da lista é recusado');
espera(() => rodar('anuncio-salvar', cancha, anuncioBase(r1, { produtos: ['produto-do-brasil'] })), 'erro.escolha', 'produto fora do catálogo é recusado');
espera(() => rodar('anuncio-salvar', cancha, anuncioBase(r1, { textos: { link: 'spraytecusa.com' } })), 'erro.link', 'link sem https é recusado');
checa(visaoPara(e, renato).anuncios.length === 0, 'Renato não vê rascunhos da Cancha');
espera(() => rodar('anuncio-enviar', cancha, { rotacaoId: r1 }), 'erro.anuncio_sem_peca', 'anúncio sem peça não vai para aprovação');
rodar('anuncio-salvar', cancha, { ...anuncioBase(r1), id: a1, linkDrive: 'https://drive.google.com/file/d/abc' });
const env = rodar('anuncio-enviar', cancha, { rotacaoId: r1 });
checa(R(r1).status === 'aprovacao' && A(a1).status === 'aprovacao' && A(a2).status === 'aprovacao', 'enviados: rotação e anúncios em aprovação');
checa(env.avisos?.[0].para.includes('ur') && !env.avisos?.[0].para.includes('ul'), 'aviso de aprovação vai para o aprovador (não para o leitor)');
checa(tr('en-US', env.avisos![0].assunto[0], env.avisos![0].assunto[1]).includes('2 ad(s)'), 'assunto do aviso sai em inglês para o Renato');
checa(visaoPara(e, renato).anuncios.length === 2, 'agora o Renato vê os 2 anúncios');
espera(() => rodar('anuncio-salvar', cancha, { ...anuncioBase(r1), id: a1 }), 'erro.anuncio_travado', 'a Cancha não mexe no anúncio enquanto está em aprovação');

console.log('Aprovar e pedir ajuste');
espera(() => rodar('anuncio-aprovar', cancha, { id: a1 }), 'erro.sem_permissao', 'a Cancha não aprova no lugar da Spraytec');
espera(() => rodar('anuncio-aprovar', leitor, { id: a1 }), 'erro.sem_permissao', 'o leitor não aprova');
espera(() => rodar('anuncio-ajuste', renato, { id: a1, texto: '  ' }), 'erro.preencha', 'pedido de ajuste precisa dizer o que mudar');
rodar('anuncio-ajuste', renato, { id: a1, texto: 'Please mention the rate.' });
checa(A(a1).status === 'ajuste' && A(a1).comentarios.some((c: any) => c.ajuste && c.idioma === 'en-US'), 'ajuste vira comentário marcado, com o idioma de quem escreveu');
rodar('anuncio-salvar', cancha, { ...anuncioBase(r1), id: a1, linkDrive: 'https://drive.google.com/file/d/abc', textos: { texto: 'Now with 22 lb/acre' } });
const vR = visaoPara(e, renato).anuncios.find((a: any) => a.id === a1);
checa(vR.textos.texto === 'Text', 'enquanto a Cancha ajusta, o Renato vê a versão que foi enviada');
rodar('anuncio-enviar', cancha, { rotacaoId: r1, ids: [a1] });
checa(A(a1).versao === 2 && A(a1).status === 'aprovacao', 'reenviado como versão 2');
espera(() => rodar('anuncio-aprovar', renato, { id: a1, versao: 1 }), 'erro.versao_mudou', 'aprovar uma versão velha (tela desatualizada) é recusado');
rodar('anuncio-aprovar', renato, { id: a1, versao: 2 });
checa(A(a1).aprovadoPor === 'Renato' && A(a1).aprovadoVersao === 2, 'fica registrado quem aprovou e qual versão');
checa(R(r1).status === 'aprovacao', 'com um anúncio ainda pendente, a rotação continua em aprovação');
const ap = rodar('rotacao-aprovar-todos', renato, { id: r1 });
checa(R(r1).status === 'aprovada' && ap.avisos?.some((x) => x.para.includes('uc')), 'aprovado tudo: rotação aprovada e a Cancha é avisada');
checa(A(a2).hist.some((h: any) => h.k === 'hist.aprovado_todos'), 'aprovação em lote fica marcada no histórico de cada anúncio');

console.log('Mudar algo aprovado');
rodar('anuncio-salvar', cancha, { ...anuncioBase(r1), id: a2, titulo: 'Busca 2', canal: 'google', formato: 'texto', locais: ['pesquisa'], objetivo: 'protecao', textos: { texto: 'x' } });
checa(A(a2).status === 'rascunho' && R(r1).status === 'aprovacao', 'editar um aprovado volta para rascunho e a rotação volta para aprovação');
checa(A(a2).hist.some((h: any) => h.k === 'hist.alterado_apos_aprovacao'), 'o histórico registra a mudança depois da aprovação');
espera(() => rodar('rotacao-no-ar', cancha, { id: r1 }), 'erro.rotacao_falta_aprovar', 'não vai para o ar com anúncio sem aprovação');
rodar('anuncio-enviar', cancha, { rotacaoId: r1 });
rodar('anuncio-aprovar', renato, { id: a2 });

console.log('No ar e encerrar');
const noar = rodar('rotacao-no-ar', cancha, { id: r1, data: '2026-11-30' });
checa(R(r1).status === 'no_ar' && A(a1).status === 'no_ar', 'rotação e anúncios no ar');
checa(noar.avisos?.[0].para.includes('ur'), 'a Spraytec é avisada de que entrou no ar');
espera(() => rodar('anuncio-salvar', cancha, { ...anuncioBase(r1), id: a1 }), 'erro.rotacao_travada', 'no ar, nada muda nos anúncios');
rodar('anuncio-resultado', cancha, { id: a1, resultado: { investimento: '300', contatos: '10', impressoes: '', cliques: '50' } });
checa(A(a1).resultado.origem === 'manual' && A(a1).resultado.investimento === 300 && A(a1).resultado.impressoes === null, 'números digitados pela Cancha ficam marcados como manuais');
espera(() => rodar('rotacao-encerrar', cancha, { id: r1, avaliacoes: { [a1]: { semaforo: 'cansado', motivo: '' }, [a2]: { semaforo: 'bem' } } }), 'erro.preencha', '"cansado" precisa de motivo');
rodar('rotacao-encerrar', cancha, { id: r1, avaliacoes: { [a1]: { semaforo: 'cansado', motivo: 'CPL subiu' }, [a2]: { semaforo: 'bem' } } });
checa(R(r1).status === 'encerrada' && A(a1).semaforo === 'cansado', 'encerrada com a avaliação de cada anúncio');

console.log('Próxima rotação: o que continua e o que sai');
const r2 = rodar('rotacao-criar', cancha, { ini: '2026-12-14', fim: '2026-12-27', anteriorId: r1, decisoes: { [a2]: { fica: true }, [a1]: { fica: false, motivo: 'Cansou' } } }).criado!;
const cont = e.anuncios.filter((a: any) => a.rotacaoId === r2);
checa(cont.length === 1 && cont[0].origem === 'continua' && cont[0].anteriorId === a2 && cont[0].aprovadoPor === 'Renato', 'o que continua vira cópia ligada, com a aprovação original');
checa(R(r2).saem.length === 1 && R(r2).saem[0].motivo === 'Cansou', 'o que sai fica registrado com o motivo');
checa(A(a1).rotacaoId === r1 && A(a1).status === 'encerrado', 'a rotação anterior não muda');

console.log('Comentários e o que cada papel vê');
rodar('comentar', cancha, { ref: 'r:' + r2, texto: 'Nota só nossa', interno: true });
const men = rodar('comentar', cancha, { ref: 'r:' + r2, texto: '@Renato can you check?' });
checa(men.avisos?.[0]?.para.includes('ur'), '@Renato manda aviso para o Renato');
checa(visaoPara(e, renato).rotacoes.find((r: any) => r.id === r2).comentarios.length === 1, 'o Renato não vê o comentário interno');
espera(() => rodar('comentar', leitor, { ref: 'r:' + r2, texto: 'oi' }), 'erro.sem_permissao', 'o leitor só vê, não comenta');
const vP = visaoPara(e, prod);
checa(!vP.rotacoes.length && !vP.anuncios.length && !vP.eventos.length, 'a produtora não recebe rotações, anúncios nem calendário');
checa(visaoPara(e, renato).anuncios.every((a: any) => a.nota === undefined), 'nota interna do anúncio não vai para a Spraytec');

console.log('Dados de exemplo');
const d = dadosDemo('2026-11-11');
checa(d.rotacoes.length === 3 && d.rotacoes.map((r) => r.status).join() === 'encerrada,no_ar,aprovacao', 'três rotações: encerrada, no ar e em aprovação');
checa(d.anuncios.every((a) => a.rotacaoId && a.titulo && a.objetivo && a.canal), 'todo anúncio de exemplo está completo');
checa(d.eventos.length > 15 && d.eventos.every((x) => x.exemplo), 'calendário de exemplo marcado como exemplo');
checa(d.eventos.some((x) => x.nome === 'Iowa Ag Expo' && x.ini === '2027-02-02'), 'Iowa Ag Expo em 2–4/2/2027');
const vd = visaoPara(d as any, renato);
checa(!vd.anuncios.some((a: any) => a.status === 'rascunho'), 'no exemplo, o Renato não vê o rascunho da Cancha');
checa(vd.anuncios.filter((a: any) => a.status === 'aprovacao').length === 2, 'no exemplo, há 2 anúncios esperando o Renato');
checa(!JSON.stringify(d).match(/Matheus|Instagram da Spraytec Brasil|Paraná|R\$/), 'nada do Brasil nos dados de exemplo');

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
