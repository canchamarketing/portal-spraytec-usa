# Portal Spraytec Brasil — contexto do projeto

Portal de marketing que a Cancha Marketing está construindo para o cliente **Spraytec Brasil**.
Reúne num lugar só o que a agência faz para eles: social media, tráfego pago, e-mail marketing,
produção de vídeo e manutenção do site.

**A Spraytec é um cliente em que não podemos errar.** Confiabilidade, backup e rastreabilidade
(quem aprovou o quê, quando) pesam mais do que velocidade de entrega.

## Objetivo desta fase
**Mostrar funcionando tudo o que dá funcionar sem integrações.** Ainda não temos os acessos às
plataformas (Meta, Google Ads, Brevo da Spraytec, Buffer), então nenhuma integração entra agora.

- O que depende só do portal deve funcionar de verdade: login, papéis, fluxo de aprovação,
  calendário, kanbans, comentários, histórico, salvo em banco.
- O que depende de integração (métricas de redes, mídia paga, e-mail, stories capturados) entra
  com dados de exemplo **claramente marcados como exemplo** ou com cadastro manual, atrás de uma
  camada de "fonte de dados" que depois troca o exemplo pela integração real sem refazer as telas.

## Referência: o protótipo
`prototipo-spraytec.html` é um protótipo navegável de uma página, com dados de exemplo e estado em
localStorage. **Leia antes de propor qualquer coisa.** Ele define telas, fluxos, papéis, status e
identidade visual (verde-folha #8BC540, verde-escuro #235F3F, fonte Poppins).

Resumo do que está nele:
- **Papéis:** Matheus (aprovador da Spraytec), Diretoria da Spraytec, Cancha (equipe),
  Produtora de vídeo. Cada papel vê um conjunto de telas (constante `VIEWS`).
- **Telas:** Início, Estratégia (plano de mídia com versões e aprovação), Aprovação, Calendário,
  Redes sociais, Performance (tráfego, social, e-mail), Vídeos (kanban da produtora), Acervo
  (materiais, posts, stories, dark posts, aprendizados, guia de marca), Demandas, Relatórios.
- **Status de um post:** pauta, em produção, em aprovação, validação interna Spraytec,
  ajuste solicitado, aprovado, agendado, publicado, em espera.
- **Vídeos:** pauta (Cancha) → viabilidade (produtora) → roteiro (Spraytec aprova) →
  gravação e edição (produtora) → entregue (Cancha publica).
- **Decisões em aberto:** a constante `DECISOES` lista perguntas de produto, comunicação,
  integrações e infraestrutura com a opção recomendada marcada. Use como ponto de partida e
  confirme com o Diogo; o que já foi decidido está na seção abaixo e prevalece.

## Decisões já tomadas
- **Fotos e vídeos ficam no Google Drive**, não no servidor nem em outro storage. O portal
  guarda só links, status, comentários e aprovações. Nesta fase os links do Drive são colados
  manualmente; a integração com a API do Drive vem depois.
- **Banco:** PostgreSQL em contêiner próprio, só com texto (alguns MB por ano).
- **Endereço:** `spraytec.canchamarketing.com.br` (registro A já aponta para o servidor e
  propagou). Isso substitui a opção recomendada no protótipo.
- **Hospedagem:** VPS Hostinger KVM 4 (detalhes abaixo), compartilhado com outros projetos da Cancha.
- **Backup:** dump do Postgres a cada 4 a 6 horas, enviado para FORA da Hostinger (Object
  Storage da Oracle, conta que a Cancha já tem). O backup da Hostinger é só semanal e não basta.
  Testar a restauração antes de colocar em uso e depois mensalmente.
- **Monitoramento:** externo ao servidor (UptimeRobot ou Better Stack), com alerta.
- **Quando as integrações entrarem:** alerta de "integração X sem dados há mais de 24 h"
  (token expirado, API mudou), para o portal nunca mostrar números velhos sem ninguém perceber.

## Servidor (produção)
- Hostinger KVM 4, datacenter no Brasil. **x86_64 (amd64)**, Ubuntu 24.04, 4 vCPU, 16 GB RAM, 200 GB NVMe
- Docker 29 e Docker Compose v5. Fuso UTC
- Acesso: `ssh cancha@200.141.21.44` (chave SSH; usuário `cancha` tem sudo e está no grupo `docker`)
- Firewall no painel da Hostinger: só portas 22, 80 e 443 abertas

### Traefik (proxy compartilhado), já rodando em /opt/traefik
- Atende 80/443 e emite HTTPS via Let's Encrypt
- Rede Docker externa: `traefik_proxy`
- Resolvedor de certificados: `letsencrypt` (desafio HTTP no entrypoint `web`)
- Entrypoints: `web` (80) e `websecure` (443)
- `exposedbydefault=false`: cada app precisa de `traefik.enable=true`

Modelo de compose para o portal:

```yaml
services:
  app:
    image: ...
    restart: unless-stopped
    mem_limit: 1g               # sempre limitar
    networks: [traefik_proxy, interna]
    labels:
      - traefik.enable=true
      - traefik.docker.network=traefik_proxy
      - traefik.http.routers.spraytec.rule=Host(`${SITE_HOST}`)
      - traefik.http.routers.spraytec.entrypoints=websecure
      - traefik.http.routers.spraytec.tls=true
      - traefik.http.routers.spraytec.tls.certresolver=letsencrypt
      - traefik.http.routers.spraytec.service=spraytec
      - traefik.http.services.spraytec.loadbalancer.server.port=PORTA_INTERNA
      - traefik.http.routers.spraytec-http.rule=Host(`${SITE_HOST}`)
      - traefik.http.routers.spraytec-http.entrypoints=web
      - traefik.http.routers.spraytec-http.middlewares=spraytec-https
      - traefik.http.middlewares.spraytec-https.redirectscheme.scheme=https
      - traefik.http.middlewares.spraytec-https.redirectscheme.permanent=true
  db:
    image: postgres:17
    restart: unless-stopped
    mem_limit: 1g
    networks: [interna]          # banco nunca na traefik_proxy, nunca com porta publicada
networks:
  traefik_proxy:
    external: true
  interna:
```

### Regras do servidor (não quebrar)
1. Não editar nem reiniciar o Traefik (/opt/traefik) sem combinar antes.
2. Cada projeto em `/opt/NOME_DO_PROJETO`, dono `cancha`, com compose + `.env` (permissão 600, nunca no git).
3. DNS precisa estar propagado antes de subir. O Let's Encrypt bloqueia por 1 hora após 5 falhas.
4. Prefixo único nos nomes das rotas do Traefik (aqui: `spraytec`).
5. Todo contêiner com `mem_limit`. O servidor é compartilhado com outros projetos da Cancha.
6. Banco próprio por projeto, em contêiner separado, sem publicar porta.
7. Builds pesados rodam em segundo plano (`nohup`) e de preferência fora do horário comercial.
8. Nunca exibir senhas, chaves ou o conteúdo de arquivos `.env` no chat.
9. Antes de qualquer ação destrutiva (remover contêiner, volume, imagem, mexer em firewall), pedir confirmação.
10. Não rodar `do-release-upgrade` no servidor.

## Outro servidor (Oracle)
VM ARM (aarch64) na Oracle Cloud, `ssh ubuntu@147.15.6.78`, que hospeda o site de outro cliente
(Revive Neuro, intocável). Papel aqui: destino dos backups do banco (Object Storage).

## Quem está envolvido
- Diogo e Luis, sócios da Cancha Marketing. Diogo não é desenvolvedor: explicar passos de
  terminal um de cada vez, em português, sem pressupor conhecimento.
