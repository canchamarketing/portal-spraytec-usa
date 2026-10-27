-- O papel "matheus" vira "operacao" (Operação Spraytec): cada pessoa da operação tem o próprio login.
alter table usuarios drop constraint if exists usuarios_papel_check;
update usuarios set papel = 'operacao' where papel = 'matheus';
alter table usuarios add constraint usuarios_papel_check
  check (papel in ('operacao', 'diretoria', 'cancha', 'produtora', 'leitor'));
alter table usuarios add column if not exists atualizado_em timestamptz;
