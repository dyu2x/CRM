#!/usr/bin/env sh
set -eu
if [ "${1:-}" = "" ] || [ ! -s "$1" ]; then echo "Usage: CONFIRM_RESTORE=YES $0 backup.sql" >&2; exit 2; fi
if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
  echo "Refusing restore: set CONFIRM_RESTORE=YES after reviewing the backup file." >&2
  exit 2
fi
if [ -f "$1.sha256" ] && command -v sha256sum >/dev/null 2>&1; then
  (cd "$(dirname "$1")" && sha256sum -c "$(basename "$1").sha256")
fi
STAMP=$(date +%Y%m%d_%H%M%S)
PRE_RESTORE="./backups/pre_restore_${STAMP}.sql"
"$(dirname "$0")/backup.sh" "$PRE_RESTORE"
echo "Restoring $1. A pre-restore backup is available at $PRE_RESTORE."
docker compose exec -T db sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "$1"
echo "Restore command completed. Verify CRM login, record counts, and key workflows before returning to service."
