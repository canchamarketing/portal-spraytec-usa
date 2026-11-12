# Portal Spraytec USA

Portal de marketing da Spraytec USA, feito pela Cancha. Contexto, decisões e ordem de construção:
[CLAUDE.md](CLAUDE.md).

## Como está montado
- `server/`: servidor em Node.js 24 + TypeScript (Fastify). Toda alteração passa por `server/acoes.ts`,
  que confere o papel de quem pede, grava no PostgreSQL e registra na auditoria (só inclusão).
- `server/visao.ts`: o que cada papel recebe (a Spraytec não recebe rascunhos nem comentários internos;
  a produtora não recebe rotações, números nem calendário).
- `server/dominio.ts`: papéis, fuso de Iowa (America/Chicago) e feriados dos EUA.
- `server/modulos.ts`: feedbacks, observações e plano do mês, roteiros (com a produtora), e-mails, landing
  pages, pedidos do site, SEO e GEO. Plano, roteiro, e-mail e landing page usam o mesmo fluxo de aprovação.
- Visual: o mesmo do Portal Spraytec Brasil (cores, menu, títulos, gaveta à direita), em `public/app.css`.
- `public/js/`: a tela, em módulos JavaScript sem etapa de build. Uma tela por arquivo em `public/js/telas/`.
- `public/i18n/pt-BR.json` e `en-US.json`: **todos** os textos (tela, e-mails e mensagens de erro do
  servidor). Nenhum texto fica fixo no código. Cada pessoa escolhe o idioma em "Minha conta".
- `public/js/metricas.js` e `public/js/graficos.js`: números das integrações num formato só (com dados de
  EXEMPLO enquanto a fonte não está conectada) e os gráficos em SVG (sem biblioteca).
- `public/dados/produtos.json`: catálogo Fulltec (site + Product Guide 2025-26), nos dois idiomas.
- `server/seed.ts`: dados de demonstração, marcados como EXEMPLO na tela.

## Rodar no computador
```bash
npm install
node --env-file=.env.dev server/main.ts
```
Sem `DATABASE_URL`, usa um PostgreSQL embutido (PGlite) gravado em `.dados-dev/`.
Com `DEMO_CODIGO` no `.env.dev`, a tela de entrada mostra as pessoas de demonstração.

## Testes
```bash
node testes/rotacao.ts        # regras da rotação, papéis, feriados dos EUA, dados de exemplo
node testes/modulos.ts        # feedbacks, plano do mês, roteiros/produtora, e-mails, site, SEO e GEO
node testes/traducoes.mjs     # toda chave usada existe nos dois idiomas
node testes/drive-simulado.ts # Google Drive (e os simulados de GA4, Google Ads, Meta, YouTube)
npm run checar                # tipos do servidor
```

## Publicar
```bash
bash scripts/publicar.sh
```
No servidor fica em `/opt/spraytecusa` (compose + `.env` com permissão 600). Nunca em `/opt/spraytec`.

## Antes de entrar em uso real
1. Backup fora da Hostinger (Oracle) com restauração testada e monitor externo em `/saude`.
2. Apagar os dados fictícios: `docker compose exec app node server/cli.ts limpar-tudo --confirmo`
3. Tirar `DEMO_CODIGO` do `.env` e configurar o envio de e-mail (SMTP).
4. Cadastrar as pessoas reais (nome, e-mail, papel, idioma) e enviar os convites.
