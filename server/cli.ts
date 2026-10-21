// Comandos de manutenção, rodados no servidor:
//   node server/cli.ts restaurar-demo [AAAA-MM-DD]   recarrega os dados fictícios
//   node server/cli.ts limpar-tudo --confirmo         apaga todo o conteúdo, sessões e auditoria (antes de entrar em uso real)
import { abrirBanco, migrar } from './db.ts';
import { gravarTudo } from './estado.ts';
import { dadosDemo } from './seed.ts';
import { hojeBR } from './dominio.ts';

const [cmd, arg] = process.argv.slice(2);
const b = await abrirBanco();
await migrar(b);

if (cmd === 'restaurar-demo') {
  const ancora = arg || hojeBR();
  await b.tx(async (q) => {
    await gravarTudo(q, dadosDemo(ancora), 'sistema');
    await q.query(`insert into auditoria (usuario_nome, acao, resumo) values ('sistema', 'demo-restaurar', $1)`, [`Dados fictícios recarregados (referência: ${ancora})`]);
  });
  console.log('Dados de demonstração recarregados com referência em', ancora);
} else if (cmd === 'limpar-tudo') {
  if (arg !== '--confirmo') { console.log('Isto apaga TUDO. Rode de novo com --confirmo.'); process.exit(1); }
  await b.exec(`begin;
    alter table auditoria disable trigger auditoria_sem_alteracao;
    alter table auditoria disable trigger auditoria_sem_truncate;
    truncate docs, sessoes, tokens_login, auditoria;
    delete from usuarios where demo;
    alter table auditoria enable trigger auditoria_sem_alteracao;
    alter table auditoria enable trigger auditoria_sem_truncate;
    commit;`);
  await b.query(`insert into auditoria (usuario_nome, acao, resumo) values ('sistema', 'limpar-tudo', 'Conteúdo de demonstração apagado')`);
  console.log('Tudo apagado. Desligue o modo demonstração (DEMO_CODIGO) antes de reiniciar.');
} else {
  console.log('Comandos: restaurar-demo [AAAA-MM-DD] | limpar-tudo --confirmo');
}
await b.fechar();
