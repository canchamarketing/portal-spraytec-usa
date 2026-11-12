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
  Serviço de tradução: **gratuito** (Diogo, 11/11). Proposta: Google Cloud Translation dentro da
  cota grátis mensal, com contador e trava no portal. DeepL grátis não serve (guarda os textos).
- **Pessoas da Spraytec USA:** por enquanto só o **Renato** (aprovador).
- **Produtora de vídeo:** nome ainda não definido. Usar o genérico "Produtora de vídeo".
  Fica **nos EUA** e trabalha **em inglês**.
- **E-mail marketing:** a ferramenta de envio é o **Brevo** (integração por API).
- **TikTok Ads:** inativo. Deixar "canal" genérico para incluir depois se precisar.
- **Feiras:** o Diogo não sabe de quais a Spraytec participa. Calendário de feiras é só EXEMPLO.
- **Sem IA no portal por enquanto** (Diogo, 11/11): nada de transcrição, classificação ou resumo
  automático. A ferramenta Rotation (com IA) continua **separada**, não é integrada.
- **Rotação de anúncios no portal:** só o necessário para o Renato aprovar. A Cancha cadastra os
  anúncios à mão (arquivo no Drive ou link, canal, campanha, objetivo em palavras simples, produto)
  e o Renato aprova ou pede ajuste, com tudo registrado. Simples e didático.
- **Desenho do portal aprovado** pelo Diogo em 11/11/2026 (telas, papéis, fluxos, idioma).

## Ordem de construção (definida em 11/11/2026)
A tela do Brasil (`public/app.js`, toda amarrada a posts) foi **refeita do zero**, já em dois idiomas.
O servidor foi mantido (login, convites, auditoria, banco, Drive, integrações) e o domínio trocado.
1. **Fundação + Rotação:** idiomas pt-BR/en-US por pessoa, fuso America/Chicago e feriados dos EUA,
   papéis (`cancha`, `aprovador`, `leitor`, `produtora`), Início, Rotação de anúncios, Ano safra
   (exemplo), Produtos, Pessoas, Histórico.
2. Feedbacks, Planejamento do mês, Roteiros de vídeo (kanban + produtora).
3. E-mails (Brevo), Site e landing pages (checklist de publicação), SEO e GEO (manual).
4. Integrações (Google Ads, Meta, GA4 + Search Console, Brevo, PageSpeed), tradução automática,
   alertas de integração sem dados.
5. **Antes do primeiro convite:** backup fora da Hostinger com restauração testada, monitor externo,
   publicação em `/opt/spraytecusa`.

**Situação em 12/11/2026:** etapas 1 a 3 prontas e publicadas em modo demonstração, com o visual do Portal Brasil.
Etapa 4 em andamento: Conversas (chat por tema, como no Brasil, canal Spraytec e canal Produtora), Performance
(abas Funil, Mídia paga, Site, Social, E-mail), Redes sociais (Instagram e Facebook como na rede), Buscas no Google
(Search Console de exemplo) e painel de Integrações prontos. Drive fica desligado por enquanto (Diogo, 12/11);
reaproveitar o app da Meta e o projeto Google Cloud da Cancha (Diogo, 12/11). Chaves vão para o servidor com
`scripts/definir-segredo.sh` (o valor não aparece na tela nem no chat). Página de privacidade dos EUA reescrita. Cada fonte mostra dados reais quando conectada e EXEMPLO enquanto não está
(`public/js/metricas.js`). Meta, Google Ads e GA4 nunca escolhem sozinhos a conta da Spraytec Brasil.
Falta para ligar de verdade: chaves e acessos (lista no painel Integrações e em "O que precisa" de cada uma);
Search Console, Brevo e tradução automática ainda não têm coletor. Etapa 5 (backup etc.) fica para depois.
Pendências: rotas `/api/*/conectar` com mensagens só em português; datas dos e-mails de aviso em AAAA-MM-DD.
- **Sede e fuso:** Urbandale, Iowa → fuso **America/Chicago** (Central, com horário de verão).
  O servidor está em UTC: prazos, lembretes e "hoje" seguem o fuso da Spraytec USA.
- **Site:** https://spraytecusa.com (WordPress). Produtos, programas e textos estão no site e na
  pasta do cliente (ver Referências).
- **CRM:** provavelmente **Salesforce** (confirmar com o Diogo antes de integrar). Integração é futura.

## Ano safra e eventos (usar como EXEMPLO, marcado como exemplo)
O Diogo ainda não tem o calendário real da Spraytec USA. Pesquisar e montar um exemplo plausível,
claramente marcado como exemplo, para confirmar com o Renato depois. Pontos de partida (verificar
datas e se a Spraytec participa):
- **Ciclo no Meio-Oeste (milho e soja):** planejamento e compra de insumos no inverno (dez–mar),
  plantio de abril a maio, aplicações foliares de junho a agosto, colheita de setembro a novembro.
- **Feiras do setor:** Commodity Classic (fev/mar), National Farm Machinery Show (fev, Louisville),
  World Ag Expo (fev, Califórnia), Farm Progress Show (fim de agosto, alterna Boone/IA e
  Decatur/IL), Husker Harvest Days (set, Nebraska), Farm Science Review (set, Ohio).
- Hoje (11/2026) é a janela pós-colheita e de planejamento da próxima safra.

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
- **Conteúdo do site e dos produtos:** `Site/` (produtos, programas, materiais institucionais,
  imagens), `backupspraytecusa-com-….wpress` (backup completo do WordPress do spraytecusa.com),
  `2025-26 Product Guide.pdf`, `Product-Guide-2025-…pdf` e flyers Fulltec. O catálogo de produtos
  do portal sai daqui e do site, não do Brasil.
- `Plano_Midias_Spraytec_Agosto.xlsx`, `Relatórios/`, `Ads/`, `Emails/`, `LP/`, `Lista Feedback/`.
- `info.txt` tem credenciais em texto puro: **nunca exibir no chat**.

## Contas conhecidas
- **Meta (12/11/2026):** o portal dos EUA reaproveita o app e o usuário do sistema do Brasil (mesmo
  META_TOKEN). Esse usuário enxerga os dois países, então **as IDs ficam fixadas nos dois portais**:
  EUA = página 701145173329947 ("Spraytec", IG spraytec_usa) e conta act_1155413918550172 (USD);
  Brasil = página 1095087167028463 ("Spraytec Brasil", IG spraytecbr) e conta act_1575572892594181
  ("Head - Spraytec", BRL). Sem a página fixada, o código escolhe a de mais seguidores (a dos EUA).
- Chaves Google (cliente OAuth do projeto "Portal Spraytec", token de desenvolvedor do MCC) também são as
  mesmas do Brasil, copiadas com `scripts/copiar-chaves-do-brasil.sh`. DRIVE_CHAVE é própria dos EUA.
- **Clientes OAuth (12/11/2026):** GA4 usa o cliente do projeto nº 492401704739 (conta analytics@cancha);
  Google Ads usa o cliente "Portal Spraytec - Google Ads" do projeto nº 152091962542 (conta do Luis).
  Os dois têm o retorno `https://spraytecusa.canchamarketing.com.br/api/drive/retorno` (além do do Brasil).
- **GA4 dos EUA:** propriedade 465147731 "Spraytec" (fuso Chicago, USD), código G-N7R4CX73X6, carregado
  pelo GTM-NSBLCM35 do spraytecusa.com; conversão = evento `form_submit_lp`. Existe outra propriedade
  "Spraytec.com - GA4" (390636677, fuso São Paulo, mede www.spraytec.com), aparentemente antiga.
- **GTM-NSBLCM35 (diagnóstico 12/11/2026):** a conversão do Google Ads AW-454894844 "[Enviou Form LP]"
  contava duas vezes por lead (envio do formulário + página /thank-you); uma tag do GA4 mandava o evento
  lixo "gtm.js"; o pixel da Meta (647192584735430, fixo no WordPress) só manda PageView, nenhum Lead.
  **Corrigido e publicado pelo Diogo em 12/11/2026** (versão 18 "Cancha – lead único (Ads, GA4, Meta)",
  testada no Visualizar): um sinal de lead só (página /thank-you ou envio Elementor sem redirecionamento,
  evento `cancha_lead`) dispara Google Ads, GA4 `form_submit_lp` (com `form_nome`) e Meta `Lead`, uma vez
  cada. Ferramenta: `ferramentas/gtm-eua.mjs` (monta num espaço de trabalho separado, **nunca publica**;
  quem publica é o Diogo). A conta GTM do contêiner é a 6255675291 (a analytics@ tem "Editar").
  **Pendente (Diogo):** no Google Ads, deixar só "[Enviou Form LP]" como conversão principal.
  Leads de teste: avisar o Renato antes e marcar "TESTE CANCHA – ignorar". O portal conta como "contatos" do Google só conversões de categoria
  de lead (formulário, ligação, contato, orçamento).
- **Situação 12/11 05:05 UTC:** Meta Ads, Instagram, Google Ads (conta 3789937807) e GA4 coletando dados
  reais. Facebook: falta a permissão "Insights" da página dos EUA no usuário do sistema.
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
  https://github.com/canchamarketing/portal-spraytec-usa (remoto `origin`). Nunca em conta pessoal.
- Commits com autor "Cancha Marketing" (já configurado neste repositório).
- O `gh` e o `git push` rodam pelo terminal do Diogo (o Bash interno do Claude usa outra configuração).

## Quem está envolvido
- Diogo e Luis, sócios da Cancha Marketing. Diogo não é desenvolvedor: explicar passos de
  terminal um de cada vez, em português, sem pressupor conhecimento.
- Renato, da Spraytec USA (aprovador).
- Produtora de vídeo (nome a definir): recebe os roteiros.
