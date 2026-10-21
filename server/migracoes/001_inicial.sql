-- Pessoas que entram no portal. Cada uma tem a própria conta: é o que permite registrar quem fez o quê.
create table usuarios (
  id text primary key,
  nome text not null,
  email text unique,
  papel text not null check (papel in ('matheus', 'diretoria', 'cancha', 'produtora', 'leitor')),
  ativo boolean not null default true,
  demo boolean not null default false,
  ordem int not null default 0,
  criado_em timestamptz not null default now(),
  visto_em timestamptz,
  visita_anterior timestamptz
);

create table sessoes (
  token_hash text primary key,
  usuario_id text not null references usuarios(id) on delete cascade,
  criada_em timestamptz not null default now(),
  expira_em timestamptz not null,
  ip text,
  agente text
);

create table tokens_login (
  token_hash text primary key,
  usuario_id text not null references usuarios(id) on delete cascade,
  expira_em timestamptz not null,
  usado_em timestamptz
);

-- Conteúdo do portal (posts, vídeos, demandas, conversas, plano...). Um registro por item.
create table docs (
  colecao text not null,
  id text not null,
  dados jsonb not null,
  ordem bigserial,
  atualizado_em timestamptz not null default now(),
  atualizado_por text,
  primary key (colecao, id)
);

-- Registro de auditoria: cada ação vira uma linha. Só aceita inclusão; alterar ou apagar dá erro.
create table auditoria (
  id bigserial primary key,
  em timestamptz not null default now(),
  usuario_id text,
  usuario_nome text,
  papel text,
  acao text not null,
  resumo text,
  entrada jsonb,
  mudancas jsonb,
  ip text
);
create index auditoria_em on auditoria (em desc);

create function auditoria_imutavel() returns trigger language plpgsql as $$
begin
  raise exception 'O registro de auditoria só aceita inclusão.';
end $$;
create trigger auditoria_sem_alteracao before update or delete on auditoria
  for each row execute function auditoria_imutavel();
create trigger auditoria_sem_truncate before truncate on auditoria
  for each statement execute function auditoria_imutavel();
