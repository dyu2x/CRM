#!/usr/bin/env sh
set -eu
STAMP=$(date +%Y%m%d_%H%M%S)
OUT="${1:-./backups/mesina_crm_${STAMP}.sql}"
mkdir -p "$(dirname "$OUT")"
TMP="${OUT}.tmp"
trap 'rm -f "$TMP"' EXIT
# pg_dump must finish successfully before the final backup file is published.
docker compose exec -T db sh -c 'pg_dump -v -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "$TMP"
test -s "$TMP"
mv "$TMP" "$OUT"
if command -v sha256sum >/dev/null 2>&1; then sha256sum "$OUT" > "${OUT}.sha256"; fi
echo "Backup written to $OUT"
[ ! -f "${OUT}.sha256" ] || echo "Checksum written to ${OUT}.sha256"
