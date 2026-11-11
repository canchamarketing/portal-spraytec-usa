# Portal Spraytec USA — contexto do projeto

Portal que a Cancha Marketing está construindo para o cliente **Spraytec USA**.
Reúne num lugar só o que a agência faz para eles: **tráfego pago (Meta e Google), e-mail marketing,
site, landing pages, GEO e SEO**.

**A Spraytec USA é o cliente mais importante da Cancha, mais ainda que a Spraytec Brasil.**
Confiabilidade, backup e rastreabilidade (quem aprovou o quê, quando) pesam mais do que velocidade
de entrega. Na dúvida, perguntar antes de agir.

## O que a Cancha faz (e não faz) para a Spraytec USA
- **Faz:** tráfego pago (Meta e Google), e-mail marketing, site, landing pages, GEO e SEO.
  Pode escrever **roteiros de vídeo** para a produtora.
- **Não faz:** social media, criação de posts nem publicação nas redes. Por isso o fluxo do
  portal do Brasil (pauta → copy → arte → aprovação → agendar) **não se aplica aqui**.

## De onde veio este código
Este repositório nasceu como **clone do Portal Spraytec Brasil** (commit 69a6ed8, 11/11/2026),
com o histórico dele. É um projeto **separado**: mudanças daqui não vão para o Brasil e vice-versa.
Correções úteis do Brasil podem ser trazidas depois (cherry-pick), com cuidado.

- O portal do Brasil fica em `D:\Clientes\Cancha\Spraytec Brasil\Sistema Spraytec`, no ar em
  `spraytec.canchamarketing.com.br` (`/opt/spraytec` no servidor). **Nunca mexer nele a partir daqui.**
- `prototipo-spraytec.html`, `server/seed.ts`, os textos e o catálogo de produtos (`CATALOGO` em
  `public/app.js`) ainda são **do Brasil** (pessoas, produtos, redes, português). Precisam ser
  trocados; não mostrar nada disso ao cliente dos EUA.

**O que dá para reaproveitar:** login por e-mail e senha com convite, papéis, histórico/auditoria
(antes/depois), comentários com @ e e-mail, conexão com o Google Drive (o portal guarda só links,
arquivos ficam no Drive), kanban de vídeos (a partir do roteiro), integrações já escritas
(Meta Ads, Google Ads, GA4, YouTube), estrutura de servidor/banco/publicação e os testes.

**O que sai ou muda:** calendário e aprovação de posts, redes sociais orgânicas, acervo de posts,
stories e dark posts, aviso de Reels sem Short, "versão para postar" (avaliar se serve para vídeos
de anúncio).

## Decisões já tomadas (Diogo, 11/11/2026)
- **Endereço:** `spraytecusa.canchamarketing.com.br`. Registro A aponta para 200.141.21.44 e já
  propagou (conferido em 11/11).
- **Idioma por pessoa:** cada usuário escolhe português ou inglês. Nenhum texto fixo no código:
  tudo em arquivos de tradução (pt-BR e en-US). Datas, números e moeda no formato do idioma
  (en-US: MM/DD/YYYY, US$).
- **Tradução automática nas conversas e comentários:** cada mensagem aparece no idioma de quem lê,
  com opção de ver o original. Guardar sempre o texto original e a tradução (rastreabilidade).
  Serviço de tradução a decidir com o Diogo (custo e qualidade).
- **Pessoas da Spraytec USA:** por enquanto só o **Renato** (aprovador).
- **Fuso:** EUA (confirmar com o Diogo o estado/fuso da Spraytec USA). O servidor está em UTC.

## O que o Diogo quer no portal (ponto de partida, confirmar o desenho antes de codar)
1. **Mídia paga:** rotação de anúncios (ciclos de criativos), feedbacks do cliente sobre
   anúncios e leads, observações para o mês seguinte. Integração com o **CRM** deles no futuro.
2. **Ano safra e eventos:** entender o calendário agrícola e os eventos da Spraytec USA e usar
   isso para planejar as campanhas.
3. **Roteiros de vídeo** para a produtora (com aprovação do cliente).
4. **GEO e SEO:** palavras buscadas e posições (Google Search Console), tráfego orgânico (GA4) e
   presença nas respostas de IA (GEO).
5. **E-mail marketing, landing pages e site:** acompanhar entregas, aprovações e resultados.

Ideias extras propostas pelo Claude em 11/11 (ainda **não aprovadas**, validar com o Diogo):
alerta de ritmo de verba e de campanha parada/sem conversão, fadiga de criativos, funil de leads
(custo por lead, qualidade via feedback/CRM), aprovação de e-mails e landing pages com checklist
de publicação (pixel, conversão, formulário testado), saúde técnica do site (PageSpeed / Core Web
Vitals), registro de alterações nas campanhas, relatório mensal automático no idioma de cada um.

## Referências na pasta do cliente (`D:\Clientes\Cancha\Spraytec`)
- `Rotation/`: ferramenta anterior da Cancha para **rotações quinzenais de criativos** (cola a URL,
  baixa, transcreve, classifica o objetivo com IA e gera link de aprovação para o cliente).
  Boa referência para o módulo de rotação de anúncios. Ler o README antes de propor.
- `App/`: app de catálogo de produtos (Supabase/Vercel, outro projeto). **Não mexer.**
- `2025-26 Product Guide.pdf`, `Product-Guide-2025-…pdf`, flyers Fulltec: produtos dos EUA.
- `Plano_Midias_Spraytec_Agosto.xlsx`, `Relatórios/`, `Ads/`, `Emails/`, `LP/`, `Lista Feedback/`.
- `info.txt` tem credenciais em texto puro: **nunca exibir no chat**.

## Contas conhecidas
- **Google Ads Spraytec USA:** 378-993-7807 (USD). A Cancha acessa via MCC 223-025-0690. A API do
  Google Ads usada no Brasil é pelo projeto Google Cloud do Luis (nível Explorer).
- **Meta:** a página "Spraytec" no Facebook é a dos EUA (a do Brasil é "Spraytec Brasil").
- Credenciais do Brasil **não** são copiadas: este portal terá `.env` próprio. Decidir com o Diogo
  se reaproveita o app da Meta e o projeto Google Cloud da Cancha (acrescentando o novo endereço)
  ou cria novos.

## Confiabilidade (antes de qualquer uso real)
- **Backup:** dump do Postgres a cada 4 a 6 horas, enviado para FORA da Hostinger (Object Storage
  da Oracle, conta da Cancha). Aqui o backup **não pode ser adiado**: fica pronto e com restauração
  testada antes do primeiro convite. Depois, testar a restauração todo mês.
- **Monitoramento externo** (UptimeRobot, como o Brasil) vigiando `/saude`, com alerta.
- **Integrações:** alerta de "integração X sem dados há mais de 24 h".
- Dados de exemplo só **claramente marcados como exemplo**.

## Servidor (produção)
O mesmo VPS do Portal Brasil, compartilhado com outros projetos da Cancha.
- Hostinger KVM 4, datacenter no Brasil. x86_64, Ubuntu 24.04, 4 vCPU, 16 GB RAM, 200 GB NVMe.
  Docker 29 e Docker Compose v5. Fuso UTC.
- Acesso: `ssh cancha@200.141.21.44` (chave SSH com senha, no ssh-agent do Windows: usar
  `/c/Windows/System32/OpenSSH/ssh.exe` e `scp.exe`; o ssh do Git Bash não acessa o agente).
  `sudo` pede senha: o que exige root o Diogo faz pelo Web console da Hostinger.
- Firewall no painel da Hostinger: só portas 22, 80 e 443.
- **Este portal:** pasta `/opt/spraytecusa`, prefixo de rotas do Traefik `spraytecusa`, imagem
  `portal-spraytecusa`. `compose.yaml` já está ajustado. Publicar com `bash scripts/publicar.sh`
  (tem trava para nunca publicar em `/opt/spraytec`). A primeira publicação exige criar a pasta e o
  `.env` no servidor.
- E-mails do portal: redirecionamento SMTP do Google Workspace (smtp-relay.gmail.com, conta
  analytics@canchamarketing.com.br), já liberado para o IP do servidor.

### Traefik (proxy compartilhado), já rodando em /opt/traefik
- Atende 80/443 e emite HTTPS via Let's Encrypt. Rede Docker externa `traefik_proxy`.
- Resolvedor `letsencrypt` (desafio HTTP no entrypoint `web`). Entrypoints `web` e `websecure`.
- `exposedbydefault=false`: cada app precisa de `traefik.enable=true`.

### Regras do servidor (não quebrar)
1. **Não tocar em `/opt/spraytec` nem nos contêineres do portal do Brasil.** Nem nos de outros projetos.
2. Não editar nem reiniciar o Traefik (/opt/traefik) sem combinar antes.
3. Cada projeto em `/opt/NOME_DO_PROJETO`, dono `cancha`, com compose + `.env` (permissão 600, nunca no git).
4. DNS precisa estar propagado antes de subir. O Let's Encrypt bloqueia por 1 hora após 5 falhas.
5. Prefixo único nos nomes das rotas do Traefik (aqui: `spraytecusa`).
6. Todo contêiner com `mem_limit`. O servidor é compartilhado.
7. Banco próprio, em contêiner separado, sem publicar porta, nunca na rede `traefik_proxy`.
8. Builds pesados rodam em segundo plano (`nohup`) e de preferência fora do horário comercial.
9. Nunca exibir senhas, chaves ou o conteúdo de arquivos `.env` no chat.
10. Antes de qualquer ação destrutiva (remover contêiner, volume, imagem, mexer em firewall), pedir confirmação.
11. Não rodar `do-release-upgrade` no servidor.

## Código e GitHub
- Repositório no GitHub **da Cancha** (organização `canchamarketing`), privado:
  `canchamarketing/portal-spraytec-usa`. Nunca em conta pessoal.
- Commits com autor "Cancha Marketing" (já configurado neste repositório).
- O `gh` e o `git push` rodam pelo terminal do Diogo (o Bash interno do Claude usa outra configuração).

## Quem está envolvido
- Diogo e Luis, sócios da Cancha Marketing. Diogo não é desenvolvedor: explicar passos de
  terminal um de cada vez, em português, sem pressupor conhecimento.
- Renato, da Spraytec USA (aprovador).
