-- Portal Spraytec USA: papéis próprios e idioma por pessoa.
-- Papéis: cancha (equipe da agência), aprovador (Spraytec USA, aprova), leitor (Spraytec USA, só vê),
-- produtora (produtora de vídeo, só os roteiros enviados a ela).
alter table usuarios drop constraint if exists usuarios_papel_check;
update usuarios set papel = 'aprovador' where papel = 'operacao';
update usuarios set papel = 'leitor' where papel = 'diretoria';
alter table usuarios add constraint usuarios_papel_check
  check (papel in ('cancha', 'aprovador', 'leitor', 'produtora'));

-- Idioma escolhido pela pessoa (telas, datas, números e e-mails do portal).
alter table usuarios add column if not exists idioma text;
update usuarios set idioma = case when papel = 'cancha' then 'pt-BR' else 'en-US' end where idioma is null;
alter table usuarios alter column idioma set not null;
alter table usuarios alter column idioma set default 'en-US';
alter table usuarios add constraint usuarios_idioma_check check (idioma in ('pt-BR', 'en-US'));

-- O conteúdo herdado do Portal Brasil (posts, redes sociais) não vale aqui. O banco deste portal
-- nasceu vazio; se houver algo das coleções antigas, sai.
delete from docs where colecao in ('posts', 'demandas', 'threads', 'conc', 'aprendizados', 'materiais', 'ciclos', 'classif', 'ano', 'marcos', 'relatorios', 'videos')
   or (colecao = 'config' and id in ('plano', 'guia', 'lanes', 'concAcoes', 'links'));
