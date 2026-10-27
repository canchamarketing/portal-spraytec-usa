// Teste dos fluxos principais contra um portal rodando em modo demonstração.
// Uso: BASE_URL=http://localhost:3000 DEMO_CODIGO=... node testes/fluxos.mjs
// ATENÇÃO: recarrega os dados de demonstração no começo e no fim. Não rode contra dados reais.
const BASE = process.env.BASE_URL || 'http://localhost:3000';
const CODIGO = process.env.DEMO_CODIGO;
if (!CODIGO) { console.error('Defina DEMO_CODIGO.'); process.exit(1); }

let falhas = 0, ok = 0;
const checa = (cond, msg) => { if (cond) { ok++; console.log('  ok  ', msg); } else { falhas++; console.log('  FALHA', msg); } };

async function sessao(usuarioId) {
  let cookies = {};
  const req = async (path, corpo) => {
    const r = await fetch(BASE + path, {
      method: corpo === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', origin: BASE, cookie: Object.entries(cookies).map(([k, v]) => k + '=' + v).join('; ') },
      body: corpo === undefined ? undefined : JSON.stringify(corpo), redirect: 'manual',
    });
    for (const c of r.headers.getSetCookie()) { const [kv] = c.split(';'); const i = kv.indexOf('='); cookies[kv.slice(0, i)] = kv.slice(i + 1); }
    let j = {}; try { j = await r.json(); } catch {}
    return { status: r.status, j };
  };
  checa((await req('/api/entrar/demo-codigo', { codigo: CODIGO })).status === 200, 'código certo libera a demonstração');
  checa((await req('/api/entrar/demo', { usuarioId })).status === 200, `entra como ${usuarioId}`);
  return { req, acao: (acao, d) => req('/api/acao', { acao, ...d }), estado: async () => (await req('/api/estado')).j };
}

console.log('Sem login');
{
  const r = await fetch(BASE + '/api/estado');
  checa(r.status === 401, 'sem login não recebe dados');
  const r2 = await fetch(BASE + '/api/acao', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"acao":"aprovar"}' });
  checa(r2.status === 401, 'sem login não altera nada');
  const r3 = await fetch(BASE + '/api/acao', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://site-estranho.com' }, body: '{"acao":"aprovar"}' });
  checa(r3.status === 403, 'pedido vindo de outro site é bloqueado');
  const r4 = await fetch(BASE + '/api/entrar/demo-codigo', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"codigo":"errado"}' });
  checa(r4.status === 400, 'código errado é recusado');
  const r5 = await fetch(BASE + '/api/senha/definir', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"t":"link-falso","senha":"uma senha qualquer longa"}' });
  checa(r5.status === 400, 'link de convite falso é recusado');
}

console.log('Cancha: recarrega a demonstração');
const cancha = await sessao('u-atendimento');
checa((await cancha.req('/api/demo/restaurar', {})).status === 200, 'dados de demonstração recarregados');
let e = await cancha.estado();
const pend = e.dados.posts.filter((p) => p.status === 'aprovacao' && p.formato !== 'plano');
const pautas = e.dados.posts.filter((p) => p.status === 'pauta_aprovacao');
checa(pend.length >= 5, `há peças em aprovação (${pend.length})`);
checa(pautas.length >= 2, `há pautas em aprovação (${pautas.length})`);
checa(!e.dados.posts.some((p) => p.status === 'validacao'), 'validação interna não é mais uma etapa');
checa(e.dados.posts.some((p) => p.validacao === true && p.status === 'aprovacao'), 'validação interna aparece como marca no item em aprovação');
checa(Array.isArray(e.aprovadores) && e.aprovadores.some((a) => a.id === 'u-operacao'), 'a Cancha recebe a lista de quem pode aprovar');
const interno = e.dados.posts.find((p) => p.comments.some((c) => c.interno));
checa(!!interno, 'a Cancha vê comentário interno');

console.log('Cancha não aprova no lugar da Spraytec');
{
  const r = await cancha.acao('aprovar', { id: pend[0].id });
  checa(r.status === 403, 'ação "aprovar" é recusada para a Cancha');
  const r2 = await cancha.acao('status', { id: pend[0].id, status: 'aprovado' });
  checa(r2.status === 400 && r2.j.codigo === 'precisa-registro', 'mudar status para aprovado pede o registro da aprovação');
  const r3 = await cancha.acao('post-editar', { id: pend[0].id, titulo: 'mexi', legenda: 'x' });
  checa(r3.status === 400, 'item em aprovação não pode ter o conteúdo editado');
  const r4 = await cancha.acao('status', { id: pautas[0].id, status: 'producao' });
  checa(r4.status === 400 && r4.j.codigo === 'precisa-registro', 'pauta em aprovação não vai para produção sem aprovação');
}

console.log('Pauta: criar, enviar, aprovar');
let novaPauta;
{
  const r = await cancha.acao('calendario-novo', { tipo: 'ig|carrossel', titulo: 'Teste de pauta', data: e.hoje, hora: '11:30', pilar: 'Manejo', texto: 'Ideia da pauta.' });
  checa(r.status === 200 && r.j.criado, 'Cancha cria uma pauta pelo "+ Adicionar"');
  novaPauta = r.j.criado.slice(2);
  const r2 = await cancha.acao('status', { id: novaPauta, status: 'producao' });
  checa(r2.status === 400, 'pauta não pula direto para produção');
  const r3 = await cancha.acao('enviar-pauta', { id: novaPauta });
  checa(r3.status === 200 && r3.j.dados.posts.find((p) => p.id === novaPauta).status === 'pauta_aprovacao', 'Cancha envia a pauta para aprovação');
}

console.log('Operação Spraytec');
const op = await sessao('u-operacao');
e = await op.estado();
checa(!e.dados.posts.some((p) => p.comments.some((c) => c.interno)), 'Operação não recebe comentários internos');
const rasc = e.dados.posts.find((p) => p.status === 'producao' && !['video', 'design'].includes(p.rede));
checa(rasc && rasc.legenda === '', 'Operação não recebe o texto de itens em produção');
checa(e.dados.posts.find((p) => p.id === novaPauta)?.pauta === 'Ideia da pauta.', 'Operação vê o texto da pauta enviada para aprovação');
checa(rasc && rasc.pauta !== '', 'Operação vê a pauta aprovada de itens em produção');
checa(e.dados.posts.filter((p) => p.status === 'pauta' && !['video', 'design'].includes(p.rede)).every((p) => p.pauta === '' && p.legenda === ''), 'Operação não recebe pautas que a Cancha ainda está escrevendo');
checa(!e.dados.relatorios.some((r) => r.status === 'rascunho'), 'Operação não vê relatórios em rascunho');
checa(e.dados.threads.length > 0, 'Operação vê as conversas com a Cancha');
{
  const rp = await op.acao('aprovar', { id: novaPauta });
  const pp = rp.j.dados && rp.j.dados.posts.find((x) => x.id === novaPauta);
  checa(rp.status === 200 && pp.status === 'producao', 'Operação aprova a pauta e ela vai para produção');
  checa(pp.hist.some((h) => /Pauta aprovada por Operação Spraytec · portal/.test(h.t)), 'histórico registra quem aprovou a pauta');
  const ra = await op.acao('ajuste', { id: pautas[0].id, txt: 'Mudar o tema.' });
  const pa = ra.j.dados.posts.find((x) => x.id === pautas[0].id);
  checa(ra.status === 200 && pa.status === 'ajuste' && pa.etapaAjuste === 'pauta', 'ajuste na pauta vai para a etapa Ajuste, marcado como pauta');
  const r = await op.acao('aprovar', { id: pend[0].id });
  checa(r.status === 200, 'Operação aprova uma peça');
  const p = r.j.dados.posts.find((x) => x.id === pend[0].id);
  checa(['aprovado', 'agendado'].includes(p.status), `peça ficou ${p.status}`);
  checa(p.hist.some((h) => /Aprovado por Operação Spraytec · portal/.test(h.t)), 'histórico registra o nome de quem aprovou');
  checa((await op.acao('aprovar', { id: pend[0].id })).status === 400, 'aprovar de novo o mesmo item é recusado');
  checa((await op.acao('ajuste', { id: pend[1].id, txt: '' })).status === 400, 'pedir ajuste sem comentário é recusado');
  const rv = await op.acao('validacao', { id: pend[2].id });
  const pv = rv.j.dados.posts.find((x) => x.id === pend[2].id);
  checa(rv.status === 200 && pv.status === 'aprovacao' && pv.validacao === true, 'validação interna só marca o item, que continua em aprovação');
  const r4 = await op.acao('ajuste', { id: pend[1].id, txt: 'Trocar a foto de capa.' });
  checa(r4.status === 200 && r4.j.dados.posts.find((x) => x.id === pend[1].id).status === 'ajuste', 'Operação pede ajuste na peça');
  const r5 = await op.acao('aprovar-lote', { ids: [pend[2].id, pend[3].id] });
  checa(r5.status === 200, 'Operação aprova dois itens de uma vez');
  const r6 = await op.acao('comentar', { id: pend[4].id, txt: 'Comentário do cliente', interno: true });
  const c6 = r6.j.dados.posts.find((x) => x.id === pend[4].id).comments.slice(-1)[0];
  checa(c6 && c6.interno === false, 'comentário da Spraytec nunca vira interno');
  checa((await op.acao('para-producao', { id: pend[4].id })).status === 403, 'Operação não mexe no fluxo de produção');
  checa((await op.acao('calendario-importar', { linhas: [] })).status === 403, 'Operação não importa planilha');
  const pl = e.dados.posts.find((x) => x.formato === 'plano');
  const r8 = await op.acao('aprovar', { id: pl.id });
  checa(r8.status === 200 && r8.j.dados.plano.versao === 3 && !r8.j.dados.plano.pendente, 'Operação aprova a versão 3 do plano');
  const th = e.dados.threads[0];
  const r9 = await op.acao('mensagem', { id: th.id, txt: 'Mensagem de teste' });
  checa(r9.status === 200 && r9.j.dados.threads.find((t) => t.id === th.id).msgs.slice(-1)[0].de === 'spraytec', 'mensagem da Operação sai do lado da Spraytec');
}

console.log('Cancha responde ao ajuste e registra aprovação externa');
{
  const rr = await cancha.acao('nova-versao', { id: pautas[0].id });
  checa(rr.status === 200 && rr.j.dados.posts.find((x) => x.id === pautas[0].id).status === 'pauta_aprovacao', 'pauta ajustada volta para aprovação');
  const r = await cancha.acao('status', { id: pend[1].id, status: 'producao' });
  checa(r.status === 200, 'Cancha volta a peça para produção');
  const r1 = await cancha.acao('post-editar', { id: pend[1].id, titulo: pend[1].titulo, legenda: 'Legenda nova', drive: 'https://drive.google.com/abc' });
  checa(r1.status === 200, 'Cancha edita o conteúdo em produção');
  const r2 = await cancha.acao('enviar', { id: pend[1].id });
  checa(r2.status === 200 && r2.j.dados.posts.find((x) => x.id === pend[1].id).status === 'aprovacao', 'Cancha reenvia para aprovação');
  checa((await cancha.acao('aprovacao-externa', { id: pend[1].id, canal: 'WhatsApp' })).status === 400, 'aprovação externa exige dizer quem aprovou');
  checa((await cancha.acao('aprovacao-externa', { id: pend[1].id, quem: 'u-operacao', canal: 'WhatsApp', evidencia: 'nao-e-link' })).status === 400, 'comprovante precisa ser um link');
  const r4 = await cancha.acao('aprovacao-externa', { id: pend[1].id, quem: 'u-operacao', canal: 'WhatsApp', evidencia: 'https://drive.google.com/print' });
  const t4 = r4.j.dados ? r4.j.dados.posts.find((x) => x.id === pend[1].id).hist.slice(-1)[0].t : '';
  checa(r4.status === 200 && /Aprovado por Operação Spraytec · WhatsApp, registrado por Atendimento Cancha/.test(t4), 'aprovação por WhatsApp registra quem aprovou e quem registrou');
}

console.log('Importação de planilha');
{
  const ruim = await cancha.acao('calendario-importar', { arquivo: 'teste.csv', linhas: [{ tipo: 'ig|post', titulo: 'ok', data: e.hoje }, { tipo: 'inventado', titulo: 'x', data: e.hoje }] });
  checa(ruim.status === 400 && /Linha 3/.test(ruim.j.erro), 'linha inválida barra a importação inteira e diz qual linha');
  const antes = (await cancha.estado()).dados.posts.length;
  const boa = await cancha.acao('calendario-importar', { arquivo: 'teste.csv', linhas: [
    { tipo: 'ig|reel', titulo: 'Importado 1', data: e.hoje, hora: '18:00', pilar: 'Campo', texto: 'Pauta 1' },
    { tipo: 'email|newsletter', titulo: 'Importado 2', data: e.hoje },
    { tipo: 'demanda|spraytec', titulo: 'Enviar fotos', data: e.hoje }] });
  checa(boa.status === 200 && boa.j.dados.posts.length === antes + 2 && boa.j.dados.demandas.some((d) => d.t === 'Enviar fotos'), 'planilha válida cria posts como pauta e a demanda');
  checa(boa.j.dados.posts.filter((p) => /^Importado/.test(p.titulo)).every((p) => p.status === 'pauta'), 'itens importados entram como pauta');
  const imp1 = boa.j.dados.posts.find((p) => p.titulo === 'Importado 1');
  checa(imp1.pauta === 'Pauta 1' && imp1.legenda === '', 'texto da planilha vai para a pauta, não para a legenda');
  // Atualizar pelo id (planilha exportada e importada de volta)
  const n0 = boa.j.dados.posts.length;
  const up = await cancha.acao('calendario-importar', { arquivo: 'mes.csv', linhas: [{ n: 2, id: imp1.id, pauta: 'Pauta 1 revisada', produto: 'Linha foliar', etapa: 'pauta_aprovacao' }] });
  const imp1b = up.j.dados?.posts.find((p) => p.id === imp1.id);
  checa(up.status === 200 && up.j.dados.posts.length === n0 && imp1b.pauta === 'Pauta 1 revisada' && imp1b.produto === 'Linha foliar', 'linha com id atualiza o item sem duplicar');
  checa(imp1b.status === 'pauta_aprovacao' && imp1b.hist.some((h) => /Atualizado pela planilha "mes.csv"/.test(h.t)), 'etapa "Pauta em aprovação" envia a pauta e fica no histórico');
  const igual = await cancha.acao('calendario-importar', { arquivo: 'mes.csv', linhas: [{ n: 2, id: imp1.id, titulo: 'Importado 1', pauta: 'Pauta 1 revisada', etapa: 'pauta_aprovacao' }] });
  checa(igual.status === 200, 'linha igual ao portal passa mesmo com o item em aprovação');
  const trava = await cancha.acao('calendario-importar', { arquivo: 'mes.csv', linhas: [{ n: 5, id: imp1.id, pauta: 'mudei durante a aprovação' }] });
  checa(trava.status === 400 && /Linha 5/.test(trava.j.erro), 'item em aprovação não muda pela planilha');
  const pula = await cancha.acao('calendario-importar', { arquivo: 'mes.csv', linhas: [{ n: 2, id: imp1.id, etapa: 'publicado' }] });
  checa(pula.status === 400, 'planilha não pula etapas do fluxo');
  const sumiu = await cancha.acao('calendario-importar', { arquivo: 'mes.csv', linhas: [{ n: 2, id: 'p-nao-existe', titulo: 'x' }] });
  checa(sumiu.status === 400 && /não existe/.test(sumiu.j.erro), 'id que não existe barra a importação');
}

console.log('Classificação por produto');
{
  const p = (await cancha.estado()).dados.posts.find((x) => x.status === 'publicado' && x.rede === 'ig');
  const r = await cancha.acao('post-classificar', { id: p.id, produto: 'Bioestimulante' });
  const p2 = r.j.dados?.posts.find((x) => x.id === p.id);
  checa(r.status === 200 && p2.produto === 'Bioestimulante' && p2.hist.some((h) => /Classificação alterada/.test(h.t)), 'Cancha classifica um post publicado por produto');
  const prd = await sessao('u-produtora');
  checa((await prd.acao('post-classificar', { id: p.id, produto: 'x' })).status === 403, 'produtora não classifica posts');
}

console.log('Menções');
{
  const est = await cancha.estado();
  checa(Array.isArray(est.mencionaveis) && est.mencionaveis.some((p) => p.id === 'u-operacao'), 'Cancha recebe a lista de quem pode ser mencionado');
  const th = est.dados.threads[0];
  const r = await cancha.acao('mensagem', { id: th.id, txt: 'Oi @Operação Spraytec, pode olhar?' });
  const m = r.j.dados?.threads.find((x) => x.id === th.id).msgs.at(-1);
  checa(r.status === 200 && m.mencoes?.includes('u-operacao'), 'mensagem guarda quem foi mencionado');
  const p = est.dados.posts.find((x) => x.status === 'aprovacao');
  const r2 = await cancha.acao('comentar', { id: p.id, txt: 'Atenção, @Operação Spraytec', interno: true });
  const c2 = r2.j.dados?.posts.find((x) => x.id === p.id).comments.at(-1);
  checa(r2.status === 200 && !c2.mencoes, 'comentário interno não menciona quem não pode lê-lo');
}

console.log('Produtora');
const prod = await sessao('u-produtora');
e = await prod.estado();
checa(e.dados.posts.length === 0 && e.dados.threads.length === 0 && e.dados.demandas.length === 0, 'produtora não recebe posts, conversas nem demandas');
{
  const v = e.dados.videos.find((x) => x.stage === 'viabilidade');
  const r = await prod.acao('viabilidade', { id: v.id, viavel: true, parecer: 'Dá para gravar na fábrica.' });
  checa(r.status === 200 && r.j.dados.videos.find((x) => x.id === v.id).stage === 'roteiro', 'produtora marca viabilidade e o vídeo vai para roteiro');
  checa((await prod.acao('aprovar', { id: pend[5] ? pend[5].id : 'x' })).status === 403, 'produtora não aprova posts');
  checa((await prod.acao('roteiro-aprovar', { id: v.id })).status === 403, 'produtora não aprova roteiro');
}

console.log('Diretoria');
const dir = await sessao('u-diretoria');
e = await dir.estado();
checa(e.dados.threads.length === 0, 'diretoria não recebe as conversas');
checa((await dir.acao('aprovar', { id: pend[5] ? pend[5].id : 'x' })).status === 403, 'diretoria não aprova');

console.log('Pessoas e acessos');
{
  checa((await op.req('/api/pessoas')).status === 403, 'só a Cancha abre a lista de pessoas');
  const email = `teste.${Date.now()}@exemplo.invalid`;
  const r = await cancha.req('/api/pessoas/salvar', { nome: 'Pessoa Teste', email, papel: 'operacao' });
  checa(r.status === 200 && r.j.id, 'Cancha cadastra uma pessoa');
  checa((await cancha.req('/api/pessoas/salvar', { nome: 'Outra', email, papel: 'operacao' })).status === 400, 'e-mail repetido é recusado');
  checa((await cancha.req('/api/pessoas/salvar', { nome: 'X', email: 'sem-arroba', papel: 'operacao' })).status === 400, 'e-mail inválido é recusado');
  checa(!JSON.stringify((await cancha.req('/api/pessoas')).j).includes('senha_hash'), 'a lista de pessoas nunca traz a senha');

  // Convite → criar senha → entrar com e-mail e senha
  checa((await op.req('/api/pessoas/convite', { id: r.j.id })).status === 403, 'só a Cancha gera convite');
  const cv = await cancha.req('/api/pessoas/convite', { id: r.j.id });
  checa(cv.status === 200 && cv.j.tipo === 'convite' && /\/criar-senha\?t=/.test(cv.j.link || ''), 'Cancha gera o link de convite');
  const t = new URL(cv.j.link).searchParams.get('t');
  const nova = await fetch(BASE + '/api/senha/link?t=' + t).then((x) => x.json());
  checa(nova.email === email && nova.tipo === 'convite', 'o link de convite mostra de quem é, sem ser gasto');
  const post = (path, corpo) => fetch(BASE + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(corpo) });
  checa((await post('/api/senha/definir', { t, senha: '1234567' })).status === 400, 'senha com menos de 8 caracteres é recusada');
  const SENHA = 'Uma frase de teste bem longa 7';
  const def = await post('/api/senha/definir', { t, senha: SENHA });
  checa(def.status === 200 && (def.headers.getSetCookie() || []).some((c) => c.startsWith('spraytec_sessao=')), 'pessoa cria a senha e já entra');
  checa((await post('/api/senha/definir', { t, senha: SENHA })).status === 400, 'o link de convite funciona uma vez só');
  const ent = await post('/api/entrar/senha', { email, senha: SENHA });
  checa(ent.status === 200, 'entra com e-mail e senha');
  const naoExiste = await post('/api/entrar/senha', { email: 'ninguem@exemplo.invalid', senha: SENHA });
  const errada = await post('/api/entrar/senha', { email, senha: 'senha errada aqui' });
  const m1 = (await naoExiste.json()).erro, m2 = (await errada.json()).erro;
  checa(naoExiste.status === 400 && errada.status === 400 && m1 === m2, 'mesma mensagem para e-mail inexistente e senha errada');
  for (let i = 0; i < 4; i++) await post('/api/entrar/senha', { email, senha: 'senha errada aqui' });
  const bloq = await post('/api/entrar/senha', { email, senha: SENHA });
  checa(bloq.status === 429, 'depois de 5 senhas erradas a conta fica bloqueada (até com a senha certa)');
  const cv2 = await cancha.req('/api/pessoas/convite', { id: r.j.id });
  checa(cv2.status === 200 && cv2.j.tipo === 'redefinir' && /\/nova-senha\?t=/.test(cv2.j.link || ''), 'para quem já tem senha, o link é de nova senha');
  const t2 = new URL(cv2.j.link).searchParams.get('t');
  checa((await post('/api/senha/definir', { t2: t2, t: t2, senha: 'Outra frase de teste longa 8' })).status === 200, 'nova senha pelo link desbloqueia a conta');
  checa((await post('/api/entrar/senha', { email, senha: SENHA })).status === 400, 'a senha antiga deixa de valer');

  const r2 = await cancha.req('/api/pessoas/salvar', { id: r.j.id, nome: 'Pessoa Teste', email, papel: 'operacao', ativo: false });
  checa(r2.status === 200, 'Cancha desativa o acesso');
  const lista = (await cancha.req('/api/pessoas')).j.pessoas;
  checa(lista.some((p) => p.id === r.j.id && !p.ativo), 'a pessoa aparece como desativada');
  checa((await post('/api/entrar/senha', { email, senha: 'Outra frase de teste longa 8' })).status === 400, 'pessoa desativada não entra mais');
}

console.log('Registro de auditoria');
{
  const r = await cancha.req('/api/atividade');
  checa(r.status === 200 && r.j.itens.length >= 10, `registro tem ${r.j.itens?.length} linhas`);
  checa(r.j.itens.some((a) => a.usuario_nome === 'Operação Spraytec' && /^Aprovou/.test(a.resumo)), 'registro mostra a aprovação da Operação');
  checa(r.j.itens.some((a) => /Cadastrou Pessoa Teste/.test(a.resumo)), 'registro mostra o cadastro de pessoa');
  checa((await op.req('/api/atividade')).status === 403, 'só a Cancha abre o registro completo');
}

console.log('Recarrega a demonstração no fim');
checa((await cancha.req('/api/demo/restaurar', {})).status === 200, 'dados de demonstração recarregados');

console.log(`\n${ok} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
