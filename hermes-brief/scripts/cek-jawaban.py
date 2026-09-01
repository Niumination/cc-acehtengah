#!/usr/bin/env python3
"""cek-jawaban.py — pemeriksa otomatis satu jawaban SAPA Smart AI.

Sumber kebenaran untuk semua "cek cacat" di brief ini. Dipanggil dari
scripts/probe-live.sh (live) dan bisa dijalankan ulang atas berkas SSE yang
sudah tersimpan tanpa menembak situs lagi:

    python3 scripts/cek-jawaban.py <berkas.sse> <detik> "<pertanyaan>"

Bila ada cacat baru yang ditemukan manual, tambahkan polanya DI SINI — jangan
menyalin logikanya ke tempat lain.
"""
import json
import re
import sys

raw = open(sys.argv[1], encoding='utf-8', errors='replace').read()
dur = sys.argv[2] if len(sys.argv) > 2 else '?'
q = sys.argv[3] if len(sys.argv) > 3 else ''

ev = re.findall(r'event: (\w+)\ndata: (.*)', raw)
n_narasi = sum(1 for e, _ in ev if e == 'narasi')
res = [json.loads(d) for e, d in ev if e == 'result']
err = [d for e, d in ev if e == 'error']

if not res:
    print(f"  HASIL: [GAGAL] tidak ada event:result ({dur}s, {n_narasi} delta narasi)")
    print("  ERROR:", (err[-1][:200] if err else "(stream terputus — timeout fungsi atau provider menggantung)"))
    sys.exit(0)

r = res[-1]
nar = (r.get('narasi') or '').replace('\n', ' | ')
v = r.get('visualisasi') or {}
cfg = v.get('konfigurasi') or {}
rows = cfg.get('rows') or cfg.get('data') or []
rows_json = json.dumps(rows, ensure_ascii=False)

print(f"  WAKTU : {dur}s   SUMBER: {r.get('dataSource')!r}")
print(f"  NARASI: {nar[:520]}{'...' if len(nar) > 520 else ''}")
print(f"  VIZ   : {v.get('tipe')} | {len(rows)} baris | kolom={cfg.get('columns')}")
if rows:
    print(f"          contoh: {rows_json[:240]}")
print(f"  REKOM : {json.dumps(r.get('rekomendasi'), ensure_ascii=False)[:240]}")

# ── Cek otomatis atas cacat yang diaudit 29–30 Agu 2026 ──
f = []
minta_persen = bool(re.search(r'\b(persen|persentase|proporsi|porsi|share)\b', q, re.I))
# Angka persen nyata = angka menempel pada '%' atau pada kata 'persen'.
# BUKAN sekadar kata 'persen' muncul (nama indikator SAPA sering mengandung
# 'Persen' sebagai satuan tanpa ada hitungan bagi) — itu false negative.
ada_persen = bool(re.search(r'\d+(?:[.,]\d+)?\s*%', nar + ' ' + rows_json)) \
    or bool(re.search(r'\d+(?:[.,]\d+)?\s+persen', nar + ' ' + rows_json, re.I))
if minta_persen and not ada_persen:
    f.append('DIMINTA PERSEN tapi tidak ada angka persen')
if minta_persen and ada_persen:
    f.append('ok: persen terjawab')
kosong = sum(1 for row in rows if isinstance(row, list) and len(row) >= 3 and str(row[2]).strip() == '')
if kosong:
    f.append(f'{kosong} baris tabel berkolom Satuan kosong')
if 'tidak ditemukan di  ' in nar:
    f.append('nama sumber kosong di template not-found')
if not r.get('dataSource'):
    f.append('dataSource kosong')
# Nama kecamatan yang BELUM dinormalisasi. Diperbaiki 31 Agu: pola lama menulis
# 'LUT TAWAR' saja, padahal data BAPPEDA/DTSEN memakai 'LAUT TAWAR' — jadi satu
# sumber kebocoran tidak pernah terdeteksi. 'LUT TAWAR' tetap dipertahankan karena
# itu alias lokal di src/data/excel/json/dok-b-01-stunting-2026-07.json:24.
if re.search(r'\b(LUT TAWAR|LAUT TAWAR|KUTE PANANG|SILIH NARA|ATU LINTANG|RUSIP ANTARA|JAGONG JEGET|KEBAYAKAN|PEGASING)\b', rows_json):
    f.append('nama kecamatan belum dinormalisasi')
rek = r.get('rekomendasi') or []
if not rek:
    f.append('rekomendasi kosong')
elif all(('Verifikasi angka di atas' in x) or ('produsen data' in x) for x in rek):
    f.append('rekomendasi boilerplate')
if re.search(r'\b(tren|perkembangan)\b', q, re.I) and not re.search(r'\b(tren|titik tahun|deret)\b', nar, re.I):
    f.append('permintaan tren tidak disinggung di narasi')
if re.search(r'(\d[\d.]*)\s*jiwa dalam \1\s*keluarga', nar):
    f.append('BUG jiwa == keluarga')
# Istilah internal: 'evidence' saja TIDAK CUKUP — putaran 4 (30 Agu 05:51 UTC)
# Q3 lolos padahal menulis "tidak tersedia dalam EVIDENSI yang ada". Pola
# diperluas ke bentuk Indonesia + istilah lapisan internal lainnya.
if re.search(r'\b(evidence|evidensi|bukti pelaporan|grounding|planner|arsitektur|payload|orchestrator)\b', nar, re.I):
    f.append('istilah internal bocor ke narasi')
# Menolak padahal datanya ADA: pertanyaan per-kecamatan + klaim "tidak tersedia",
# padahal DTSEN punya agregat per kecamatan (terverifikasi via endpoint breakdown).
if re.search(r'\bkecamatan\b', q, re.I) \
        and re.search(r'tidak (tersedia|ditemukan)|belum tersedia|tidak cukup', nar, re.I):
    f.append('MENOLAK padahal agregat per-kecamatan ADA di DTSEN (rute salah, bukan data kosong)')
# Q6: bertanya total penduduk, dijawab sub-kelompok ("kelas menengah") -> penyebut salah.
if re.search(r'\bjumlah penduduk\b', q, re.I) and re.search(r'kelas menengah', nar, re.I):
    f.append('menjawab sub-kelompok, bukan total yang ditanya (penyebut salah)')
print("  CEK   :", ("; ".join(f) if f else "-"))
