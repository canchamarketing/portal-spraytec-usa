#!/usr/bin/env bash
# Guarda uma chave (token, senha de cliente OAuth, ID de conta) no .env do Portal Spraytec USA, no servidor,
# sem que ela apareça na tela, no histórico do terminal ou no chat. Depois reinicia só o portal dos EUA.
#
# Uso (no seu computador, no terminal):
#   ssh -t cancha@200.141.21.44 "bash /opt/spraytecusa/app/scripts/definir-segredo.sh META_TOKEN"
# O script pede o valor (o que você colar não aparece) e confirma quando terminar.
set -euo pipefail
DESTINO="/opt/spraytecusa"
# Trava: nunca mexe no portal do Brasil.
[ "$DESTINO" = "/opt/spraytecusa" ] || { echo "ERRO: só o portal dos EUA."; exit 1; }
PERMITIDAS="META_TOKEN META_PAGINA_ID META_CONTA_ANUNCIOS GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_ADS_TOKEN_DEV GOOGLE_ADS_CLIENT_ID GOOGLE_ADS_CLIENT_SECRET GOOGLE_ADS_MCC GOOGLE_ADS_CONTA GA4_PROPRIEDADE BREVO_API_KEY TRADUCAO_CHAVE SMTP_HOST SMTP_PORT EMAIL_REMETENTE SMTP_NOME"
NOME="${1:-}"
if [ -z "$NOME" ] || ! [[ " $PERMITIDAS " == *" $NOME "* ]]; then
  echo "Diga qual chave guardar. Opções: $PERMITIDAS"
  exit 1
fi
cd "$DESTINO"
[ -f .env ] || { echo "ERRO: não achei $DESTINO/.env"; exit 1; }

printf 'Cole o valor de %s e aperte Enter (não aparece na tela): ' "$NOME"
IFS= read -rs VALOR
echo
VALOR="$(printf '%s' "$VALOR" | tr -d '\r\n' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
[ -n "$VALOR" ] || { echo "Nada foi colado. Nada mudou."; exit 1; }
case "$VALOR" in *$'\n'*|*'"'*|*"'"*|*' '*) echo "O valor tem espaço ou aspas: confira o que foi copiado. Nada mudou."; exit 1;; esac

# Troca a linha (ou acrescenta), sem passar o valor por linha de comando.
umask 077
TMP="$(mktemp "$DESTINO/.env.XXXXXX")"
NOME="$NOME" VALOR="$VALOR" awk 'BEGIN { n = ENVIRON["NOME"]; v = ENVIRON["VALOR"]; feito = 0 }
  index($0, n "=") == 1 { print n "=" v; feito = 1; next } { print }
  END { if (!feito) print n "=" v }' .env > "$TMP"
chmod 600 "$TMP"
mv "$TMP" .env
unset VALOR
echo "Guardado: $NOME ($(date -u +%F' '%H:%M) UTC). Reiniciando o portal dos EUA..."
docker compose up -d --force-recreate app >/dev/null 2>&1 && echo "Pronto. O portal já está usando a chave nova." || echo "A chave foi guardada, mas o portal não reiniciou. Avise o Claude."
