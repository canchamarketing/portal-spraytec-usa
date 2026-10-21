#!/usr/bin/env bash
# Publica a versão atual (último commit) no servidor da Hostinger.
# Uso: bash scripts/publicar.sh
set -euo pipefail
SERVIDOR="cancha@200.141.21.44"
DESTINO="/opt/spraytec"
cd "$(dirname "$0")/.."

git diff --quiet || { echo "Há alterações sem commit. Faça o commit antes de publicar."; exit 1; }
VERSAO=$(git rev-parse --short HEAD)
git archive --format=tar.gz -o /tmp/portal-spraytec.tgz HEAD
scp -q /tmp/portal-spraytec.tgz "$SERVIDOR:/tmp/portal-spraytec.tgz"
ssh "$SERVIDOR" bash -s <<EOF
set -euo pipefail
mkdir -p $DESTINO/app
tar -xzf /tmp/portal-spraytec.tgz -C $DESTINO/app
cp $DESTINO/app/compose.yaml $DESTINO/compose.yaml
sed -i 's#^    build: \.#    build: ./app#' $DESTINO/compose.yaml
echo "$VERSAO" > $DESTINO/VERSAO
cd $DESTINO
nohup docker compose build > build.log 2>&1 && docker compose up -d >> build.log 2>&1
tail -5 build.log
EOF
echo "Publicado: $VERSAO"
