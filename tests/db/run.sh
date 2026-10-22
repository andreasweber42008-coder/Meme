#!/usr/bin/env bash
# Spielt alle Migrationen in eine frische, temporäre PostgreSQL-Instanz und prüft
# Ein-Konto-Sperre und Row Level Security. Braucht PostgreSQL ≥ 15 lokal.
set -euo pipefail
cd "$(dirname "$0")/../.."
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
[ -x "$PGBIN/initdb" ] || { echo "PostgreSQL nicht gefunden – Test übersprungen."; exit 0; }
DIR="$(mktemp -d)"
RUN_AS=()
if [ "$(id -u)" = "0" ]; then
  id pgtest >/dev/null 2>&1 || useradd -M -s /bin/bash pgtest
  chown -R pgtest "$DIR"
  RUN_AS=(su pgtest -c)
fi
run() { if [ ${#RUN_AS[@]} -gt 0 ]; then "${RUN_AS[@]}" "$*"; else bash -c "$*"; fi; }
cleanup() { run "'$PGBIN/pg_ctl' -D '$DIR/data' -m immediate stop" >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap cleanup EXIT
run "'$PGBIN/initdb' -D '$DIR/data' -U postgres -A trust" >/dev/null
run "'$PGBIN/pg_ctl' -D '$DIR/data' -o '-k $DIR -p 54329 -c listen_addresses=' -l '$DIR/log' start" >/dev/null
PSQL=(env PGOPTIONS=--client-min-messages=warning psql -h "$DIR" -p 54329 -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f tests/db/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  "${PSQL[@]}" -f "$f"
  pruefung="tests/db/nach_$(basename "$f" | cut -d_ -f1).sql"
  [ -f "$pruefung" ] && "${PSQL[@]}" -f "$pruefung"
done
