#!/usr/bin/env bash
# Backup SQLite DB an toàn (không cần dừng server) bằng `.backup` của sqlite3.
#
# Dùng:
#   bash scripts/backup-db.sh                 # backup vào ./backups/
#   DB_PATH=/app/data/caffiliate.db bash ...  # custom path
#
# Chạy định kỳ qua cron:
#   0 3 * * * cd /path/to/app && bash scripts/backup-db.sh >/dev/null 2>&1

set -euo pipefail

DB_PATH="${DB_PATH:-./caffiliate.db}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETAIN_DAYS="${RETAIN_DAYS:-14}"

if [ ! -f "$DB_PATH" ]; then
  echo "[backup-db] DB không tồn tại tại $DB_PATH" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"
timestamp=$(date +%Y%m%d_%H%M%S)
out="$BACKUP_DIR/caffiliate_${timestamp}.db"

# Dùng .backup của sqlite3 → an toàn với WAL mode, không cần dừng app.
sqlite3 "$DB_PATH" ".backup '$out'"
echo "[backup-db] Backup → $out ($(du -h "$out" | cut -f1))"

# Xoá file cũ hơn N ngày
find "$BACKUP_DIR" -name "caffiliate_*.db" -mtime +"$RETAIN_DAYS" -delete 2>/dev/null || true
echo "[backup-db] Đã dọn backup > $RETAIN_DAYS ngày."
