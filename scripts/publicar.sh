#!/usr/bin/env bash
# Publica a versão atual (último commit) no servidor da Hostinger.
# Uso: bash scripts/publicar.sh
set -euo pipefail
SERVIDOR="cancha@200.141.21.44"
# No Windows, usa o ssh do próprio Windows (é ele que conversa com o ssh-agent onde a chave está destravada)
if [ -x /c/Windows/System32/OpenSSH/ssh.exe ]; then ssh() { /c/Windows/System32/OpenSSH/ssh.exe "$@"; }; scp() { /c/Windows/System32/OpenSSH/scp.exe "$@"; }; fi
DESTINO="/opt/spraytecusa"
# Trava: este é o portal da Spraytec USA. /opt/spraytec é o portal do Brasil e nunca pode ser sobrescrito daqui.
[ "$DESTINO" = "/opt/spraytecusa" ] || { echo "ERRO: este script só publica em /opt/spraytecusa."; exit 1; }
cd "$(dirname "$0")/.."
grep -q 'routers\.spraytecusa\.' compose.yaml || { echo "ERRO: compose.yaml não está com as rotas spraytecusa."; exit 1; }

git diff --quiet || { echo "Há alterações sem commit. Faça o commit antes de publicar."; exit 1; }
VERSAO=$(git rev-parse --short HEAD)
PACOTE="${TEMP:-/tmp}/portal-spraytecusa.tgz"
git archive --format=tar.gz -o "$PACOTE" HEAD
command -v cygpath >/dev/null && PACOTE=$(cygpath -w "$PACOTE")
scp -q "$PACOTE" "$SERVIDOR:/tmp/portal-spraytecusa.tgz"
ssh "$SERVIDOR" bash -s <<EOF
set -euo pipefail
rm -rf $DESTINO/app && mkdir -p $DESTINO/app
tar -xzf /tmp/portal-spraytecusa.tgz -C $DESTINO/app
cp $DESTINO/app/compose.yaml $DESTINO/compose.yaml
sed -i 's#^    build: \.#    build: ./app#' $DESTINO/compose.yaml
echo "$VERSAO" > $DESTINO/VERSAO
cd $DESTINO
nohup docker compose build > build.log 2>&1 && docker compose up -d >> build.log 2>&1
tail -5 build.log
EOF
echo "Publicado: $VERSAO"
