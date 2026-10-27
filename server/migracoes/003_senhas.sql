-- Login com e-mail e senha. A pessoa recebe um convite, cria a própria senha e pode redefini-la por e-mail.
alter table usuarios add column if not exists senha_hash text;
alter table usuarios add column if not exists senha_definida_em timestamptz;
alter table usuarios add column if not exists convite_enviado_em timestamptz;
alter table usuarios add column if not exists falhas_login int not null default 0;
alter table usuarios add column if not exists bloqueado_ate timestamptz;

-- Os links de convite e de redefinição usam a mesma tabela de tokens (de uso único).
alter table tokens_login add column if not exists tipo text not null default 'link';
alter table tokens_login add column if not exists criado_em timestamptz not null default now();
create index if not exists tokens_login_usuario on tokens_login (usuario_id);
