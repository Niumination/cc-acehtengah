#!/usr/bin/env bash
# ─── probe-live.sh — penembak 14 pertanyaan audit ke situs live SAPA Smart AI ───
#
# Pakai:
#   bash probe-live.sh                       # semua pertanyaan (~4 menit)
#   BASE=https://staging.example.com bash probe-live.sh
#   ONLY=Q10,Q12,Q13 bash probe-live.sh      # hanya pertanyaan tertentu
#
# Keluaran: laporan ringkas per pertanyaan + berkas mentah di ./probe-out/
#
# CATATAN rate limit: /api/query dibatasi 10 permintaan/menit & 60/jam per IP
# (src/app/api/query/route.ts). Jeda bawaan 8 detik -> ~7,5 permintaan/menit.
# 14 pertanyaan = 14 dari kuota 60/jam. Jangan jalankan berulang-ulang.
set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BASE="${BASE:-https://cc-acehtengah.vercel.app}"
JEDA="${JEDA:-8}"
OUT="${OUT:-./probe-out}"
mkdir -p "$OUT"

# id|pertanyaan
PERTANYAAN=(
"Q1|Berapa prevalensi stunting di Aceh Tengah dan bagaimana trennya 5 tahun terakhir?"
"Q2|Bagaimana tren jumlah siswa SD di Aceh Tengah 3 tahun terakhir?"
"Q3|Bandingkan angka kemiskinan antar kecamatan di Aceh Tengah"
"Q4|Apa hubungan antara kemiskinan dan stunting di Aceh Tengah?"
"Q5|OPD mana dengan capaian terendah tahun 2025?"
"Q6|Berapa jumlah penduduk Aceh Tengah tahun 2025?"
"Q7|berapa produksi kopi arabika"
"Q8|Bagaimana tren Indeks Pembangunan Manusia Aceh Tengah?"
"Q9|Bandingkan Dinas Kesehatan dan Dinas Perkebunan"
"Q10|Seberapa besar persentase keluarga desil 1 di tiap kecamatan menurut DTSEN?"
"Q11|Berapa jumlah keluarga di Kecamatan Bebesen menurut DTSEN?"
"Q12|Berapa persen keluarga di desil 1 dari total keluarga di Aceh Tengah?"
"Q13|Berapa persentase balita stunting per kecamatan?"
"Q14|Berapa OPD yang melaporkan data?"
)

echo "==============================================================="
echo " SAPA Smart AI — probe live"
echo " Base : $BASE"
echo " Jeda : ${JEDA}s antar permintaan (hormati rate limit 10/menit)"
echo " Out  : $OUT"
echo "==============================================================="
echo

# ── Endpoint kontrol (bukan /api/query, tidak kena rate limit chat) ──
echo "── Endpoint kontrol ─────────────────────────────────────────────"
for p in /api/health /api/stats /api/kpi /api/report /api/geodata /api/ews; do
  nama=$(echo "$p" | sed 's|/|_|g')
  kode=$(curl -s -o "$OUT$nama.json" -m 60 -w '%{http_code}' "$BASE$p")
  printf "  %-16s %s\n" "$p" "$kode"
done
echo
if [ -s "$OUT/_api_health.json" ]; then
  python3 - "$OUT/_api_health.json" <<'PY'
import json,sys
try:
    d=json.load(open(sys.argv[1],encoding='utf-8'))
    print("  health.config :", json.dumps(d.get('config'),ensure_ascii=False))
except Exception as e:
    print("  (gagal baca health:",e,")")
PY
fi
if [ -s "$OUT/_api_report.json" ]; then
  python3 - "$OUT/_api_report.json" <<'PY'
import json,sys
try:
    r=json.load(open(sys.argv[1],encoding='utf-8'))['report']
    k=r.get('kualitasData',{})
    print(f"  cakupan tahun : {k.get('cakupanTahunPct')}%")
    for t in k.get('temuan',[]): print(f"                  - {t}")
    print(f"  perubahan     : tersedia={r.get('perubahan',{}).get('tersedia')}")
except Exception as e:
    print("  (gagal baca report:",e,")")
PY
fi
echo

# ── 14 pertanyaan audit ──
FILTER="${ONLY:-}"
for entri in "${PERTANYAAN[@]}"; do
  id="${entri%%|*}"
  q="${entri#*|}"
  if [ -n "$FILTER" ] && ! echo ",$FILTER," | grep -q ",$id,"; then continue; fi

  echo "── $id ──────────────────────────────────────────────────────────"
  echo "  TANYA: $q"
  raw="$OUT/$id.sse"
  t0=$(date +%s)
  curl -sN -m 200 -X POST "$BASE/api/query" \
    -H 'Content-Type: application/json' \
    -d "$(python3 -c "import json,sys;print(json.dumps({'query':sys.argv[1]}))" "$q")" > "$raw"
  dur=$(( $(date +%s) - t0 ))

  python3 "$SCRIPT_DIR/cek-jawaban.py" "$raw" "$dur" "$q"
  echo
  sleep "$JEDA"
done

echo "==============================================================="
echo " Selesai. Berkas mentah di: $OUT"
echo " Bandingkan dengan: hermes-brief/AUDIT-LIVE-2026-08-29.md bagian 8"
echo "==============================================================="
