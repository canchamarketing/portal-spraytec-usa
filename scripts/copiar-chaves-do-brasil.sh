#!/usr/bin/env bash
# Reaproveita no Portal Spraytec USA as chaves que o Portal Brasil já usa (decisão do Diogo, 12/11/2026:
# mesmo app da Meta, mesmo projeto Google Cloud, mesmo token de desenvolvedor do MCC).
# Só LÊ o .env do Brasil: nada no Brasil é alterado. Nenhum valor aparece na tela.
#
# Uso (no seu terminal):
#   ssh -t cancha@200.141.21.44 "bash /opt/spraytecusa/app/scripts/copiar-chaves-do-brasil.sh"
set -euo pipefail
ORIGEM="/opt/spraytec/.env"
DESTINO="/opt/spraytecusa"
[ "$DESTINO" = "/opt/spraytecusa" ] || { echo "ERRO: o destino só pode ser o portal dos EUA."; exit 1; }
[ -r "$ORIGEM" ] || { echo "ERRO: não consigo ler $ORIGEM."; exit 1; }
cd "$DESTINO"
[ -f .env ] || { echo "ERRO: não achei $DESTINO/.env"; exit 1; }

# Só estas chaves são copiadas. Página, conta de anúncios, conta do Google Ads e chave de cifragem são próprias dos EUA.
CHAVES="META_TOKEN GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GOOGLE_ADS_TOKEN_DEV GOOGLE_ADS_CLIENT_ID GOOGLE_ADS_CLIENT_SECRET"

echo "Proteção do portal do Brasil (o Meta agora enxerga também os ativos dos EUA):"
for v in META_PAGINA_ID META_CONTA_ANUNCIOS; do
  if grep -q "^$v=." "$ORIGEM"; then echo "  $v: fixada no Brasil (ok)"; else echo "  $v: NÃO fixada no Brasil (avise o Claude)"; fi
done

umask 077
TMP="$(mktemp "$DESTINO/.env.XXXXXX")"
cp .env "$TMP"
echo "Copiando para o portal dos EUA:"
for n in $CHAVES; do
  linha="$(grep -m1 "^$n=" "$ORIGEM" || true)"
  v="${linha#*=}"
  if [ -z "$linha" ] || [ -z "$v" ]; then echo "  $n: não existe no Brasil (pulei)"; continue; fi
  NOME="$n" VALOR="$v" awk 'BEGIN { n = ENVIRON["NOME"]; v = ENVIRON["VALOR"]; f = 0 }
    index($0, n "=") == 1 { print n "=" v; f = 1; next } { print } END { if (!f) print n "=" v }' "$TMP" > "$TMP.2"
  mv "$TMP.2" "$TMP"
  echo "  $n: copiada"
done
unset v linha
chmod 600 "$TMP"
mv "$TMP" .env
echo "Reiniciando o portal dos EUA..."
docker compose up -d --force-recreate app >/dev/null 2>&1 && echo "Pronto. Em 1 a 2 minutos o portal começa a buscar os dados." || echo "As chaves foram copiadas, mas o portal não reiniciou. Avise o Claude."
