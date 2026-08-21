#!/usr/bin/env bash
#
# ─── Sinkronisasi seluruh dataset SAPA → database ───
#
# Pemakaian:
#   bash scripts/sync-all.sh            # jalankan sinkronisasi
#   bash scripts/sync-all.sh --dry-run  # hanya periksa prasyarat
#
# Keluaran log: logs/sync-YYYY-MM-DD.log
#
# ─── Perbaikan atas versi sebelumnya (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P3-08)
#   1. `EXIT_CODE=$?` diambil SETELAH pipeline `| tee`, sehingga yang tertangkap
#      adalah status `tee` (hampir selalu 0), bukan status perintah sync.
#      Ditambah `set -e` membuat skrip keluar lebih dulu sehingga baris itu
#      tidak pernah tercapai. Kini memakai PIPESTATUS.
#   2. Memanggil `npx tsx` padahal `tsx` bukan dependency proyek — di mesin
#      bersih npx akan mengunduh paket acak dari internet saat runtime.
#      Kini memakai `node --experimental-strip-types` yang sudah tersedia
#      (Node >= 22, sesuai .nvmrc), tanpa unduhan.
#   3. Memakai `require()` di dalam konteks ESM proyek ini → ReferenceError.
#      Kini memakai dynamic `import()`.
#   4. Menambah strict mode penuh, ERR trap, dan lock file agar dua proses
#      sinkronisasi tidak berjalan bersamaan (mis. cron menumpuk).

set -Eeuo pipefail

# ─── Lokasi ───
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
cd -- "$PROJECT_ROOT"

LOG_DIR="${PROJECT_ROOT}/logs"
LOG_FILE="${LOG_DIR}/sync-$(date +%Y-%m-%d).log"
LOCK_FILE="${LOG_DIR}/.sync.lock"
DRY_RUN=0

[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

mkdir -p -- "$LOG_DIR"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a -- "$LOG_FILE"
}

on_error() {
  local exit_code=$?
  local line=${1:-?}
  log "FATAL: gagal pada baris ${line} (exit ${exit_code})"
  exit "$exit_code"
}
trap 'on_error $LINENO' ERR

cleanup() {
  rm -f -- "$LOCK_FILE"
}
trap cleanup EXIT

# ─── Cegah eksekusi ganda ───
# noclobber: gagal jika file sudah ada — atomik, tanpa race condition.
if ! (set -o noclobber; printf '%s' "$$" > "$LOCK_FILE") 2>/dev/null; then
  log "DILEWATI: sinkronisasi lain sedang berjalan (PID $(cat -- "$LOCK_FILE" 2>/dev/null || echo '?'))"
  trap - EXIT
  exit 0
fi

log "=== SINKRONISASI MULAI ==="

# ─── Prasyarat ───
if ! command -v node >/dev/null 2>&1; then
  log "GAGAL: node tidak ditemukan di PATH"
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if (( NODE_MAJOR < 22 )); then
  log "GAGAL: butuh Node >= 22 (terpasang: v$(node -p 'process.versions.node'))"
  exit 1
fi

if [[ ! -d node_modules/.prisma/client ]]; then
  log "GAGAL: Prisma Client belum dibuat. Jalankan: npx prisma generate"
  exit 1
fi

# DATABASE_URL boleh berasal dari environment (mis. cron/CI) atau .env.local
if [[ -z "${DATABASE_URL:-}" ]] && ! grep -qs '^DATABASE_URL=' .env.local; then
  log "GAGAL: DATABASE_URL tidak di-set (environment maupun .env.local)"
  exit 1
fi

if (( DRY_RUN )); then
  log "--dry-run: seluruh prasyarat terpenuhi, sinkronisasi tidak dijalankan"
  exit 0
fi

# ─── Jalankan sinkronisasi ───
log "Menjalankan sinkronisasi dataset..."

# PIPESTATUS[0] = status `node`, bukan status `tee`.
# `|| true` mencegah `set -e` keluar sebelum status sempat dibaca.
set +e
# --import ts-alias-loader WAJIB: tanpa itu `import '@/lib/prisma'` di dalam
# data-sync.ts gagal ERR_MODULE_NOT_FOUND, karena alias tsconfig hanya
# dipahami bundler Next.js — bukan Node.
node \
  --import ./scripts/ts-alias-loader.mjs \
  --experimental-strip-types \
  --disable-warning=ExperimentalWarning \
  --input-type=module \
  -e '
    const { syncAllDatasets } = await import("./src/services/data-sync.ts");
    const results = await syncAllDatasets();
    for (const r of results) {
      console.log(r.status === "ok" ? "OK  " : "GAGAL", r.slug, r.error ?? "");
    }
    process.exit(results.some((r) => r.status === "error") ? 1 : 0);
  ' 2>&1 | tee -a -- "$LOG_FILE"
SYNC_STATUS=${PIPESTATUS[0]}
set -e

log "=== SINKRONISASI SELESAI (exit ${SYNC_STATUS}) ==="
exit "$SYNC_STATUS"
