#!/usr/bin/env bash
# ─── PII / secret leak gate ───
# Jalankan SEBELUM commit/push data Excel. Exit 1 bila ditemukan kebocoran.
set -e
ROOT="${1:-.}"
echo "== Scan PII/NIK 16-digit di src/data/excel =="
LEAK=0
# 1. NIK 16 digit di json maupun xlsx
python3 - "$ROOT" <<'PY'
import os, re, sys, json
root=sys.argv[1]
nik=re.compile(r'\b\d{16}\b')
bad=0
for dp,_,fs in os.walk(os.path.join(root,'src/data/excel')):
    for fn in fs:
        p=os.path.join(dp,fn)
        if not fn.endswith(('.json','.xlsx')):
            continue
        if fn.endswith('.json'):
            txt=open(p,encoding='utf-8').read()
        else:
            import openpyxl
            wb=openpyxl.load_workbook(p,read_only=True,data_only=True)
            txt=""
            for ws in wb.worksheets:
                for row in ws.iter_rows(values_only=True):
                    txt+=" "+" ".join(str(c) for c in row if c is not None)
        # Hanya flag NIK 16 digit sungguhan (bukan substring kata 'NIK').
        if nik.findall(txt):
            print("LEAK NIK16:",p); bad+=1
        # Flag nama per-orang nyata (daftar kecil, deterministik).
        real_names=re.compile(r'(Abdul Ghafur|ARSILA SYAFIKA|DAHLIA|Sabikul Haily|Rizki Kusiar|Alisyah|Mahdalena)', re.I)
        if real_names.findall(txt):
            print("LEAK NAME:",p); bad+=1
print("LEAK_COUNT",bad)
sys.exit(1 if bad else 0)
PY
echo "== OK: tidak ada kebocoran PII di src/data/excel =="
