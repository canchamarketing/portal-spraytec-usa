-- Google Drive: autorização cifrada (refresh token) e as pastas que o portal já criou no Drive.
create table segredos (
  nome text primary key,
  valor text not null,            -- cifrado com DRIVE_CHAVE (AES-256-GCM)
  atualizado_em timestamptz not null default now()
);
create table drive_pastas (
  caminho text primary key,       -- '/', '/Posts', '/Posts/2026-11', ...
  id text not null
);
