# Portal Spraytec Brasil

Portal de marketing da Spraytec, feito pela Cancha. Contexto e decisões do projeto: [CLAUDE.md](CLAUDE.md).

## Como está montado
- `server/`: servidor em Node.js 24 + TypeScript (Fastify). Toda alteração passa por `server/acoes.ts`,
  que confere o papel de quem pede, grava no PostgreSQL e registra na auditoria (só inclusão).
- `server/visao.ts`: o que cada papel recebe (o cliente não recebe rascunhos nem comentários internos;
  a produtora só recebe as pautas de vídeo).
- `public/`: a interface (a do protótipo, agora lendo e gravando no servidor). Tudo o que depende de
  integração está na seção "FONTE DE DADOS: EXEMPLO" de `public/app.js` e aparece com o selo "Exemplo".
- `server/seed.ts`: dados fictícios de demonstração.

## Rodar no computador
```bash
npm install
node --env-file=.env.dev server/main.ts
```
Sem `DATABASE_URL`, usa um PostgreSQL embutido (PGlite) gravado em `.dados-dev/`.

## Testar os fluxos
Com o portal rodando em modo demonstração:
```bash
BASE_URL=http://localhost:3000 DEMO_CODIGO=... node testes/fluxos.mjs
```
O teste recarrega os dados de demonstração. Não rode contra dados reais.

## Publicar
```bash
bash scripts/publicar.sh
```
No servidor fica em `/opt/spraytec` (compose + `.env` com permissão 600).

## Antes de entrar em uso real
1. Apagar os dados fictícios: `docker compose exec app node server/cli.ts limpar-tudo --confirmo`
2. Tirar `DEMO_CODIGO` do `.env` e configurar o envio de e-mail (SMTP) para o login por link.
3. Cadastrar as pessoas reais (nome, e-mail, papel).
4. Ligar o backup fora da Hostinger (Oracle) e testar a restauração.
