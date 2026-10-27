-- Dados que chegam das integrações (Meta agora; Drive e outras depois). Ficam fora de "docs" porque
-- crescem com o tempo e não passam pelas ações: só o coletor escreve aqui, e nada é apagado por ele.
create table metricas (
  fonte text not null,          -- 'ig', 'fb', 'ads'
  tipo text not null,           -- 'perfil', 'dia', 'post', 'story', 'anuncio', 'anuncio_dia'
  id text not null,
  dados jsonb not null,
  atualizado_em timestamptz not null default now(),
  primary key (fonte, tipo, id)
);
create index metricas_tipo on metricas (fonte, tipo);

-- Saúde de cada integração: a última coleta que deu certo e o último erro. Serve para o alerta de
-- "integração sem dados há mais de 24 h" (token expirado, permissão retirada, API mudou).
create table integracoes (
  fonte text primary key,
  ultimo_ok timestamptz,
  ultima_tentativa timestamptz,
  erro text,
  detalhe jsonb
);
