#!/usr/bin/env python3
"""Benchmark model untuk cc-acehtengah — ukur kecepatan + kualitas output."""
import json, time, urllib.request, urllib.error

env = {}
with open('.env') as f:
    for line in f:
        line = line.strip()
        if '=' in line and not line.startswith('#'):
            k, v = line.split('=', 1)
            env[k] = v.strip().strip('"')

BASE = env['AI_BASE_URL']
KEY = env['AI_API_KEY']

# Simulasi payload orchestrator (seperti di ai-orchestrator)
system = """Anda adalah AI Command Center Pemerintah Kabupaten Aceh Tengah.
Tugas: Membantu Kepala Daerah mengambil keputusan berbasis data dari SAPA.

STATISTIK: 35 OPD, 905 indikator, sumber: api-splp.layanan.go.id

ATURAN:
1. HANYA gunakan data riil dari field "data_ditemukan". Jangan mengarang angka.
2. Tampilkan data yang ditemukan dengan format yang jelas (nilai + satuan + periode).
3. Jika data spesifik tidak ada di "data_ditemukan", tampilkan data terkait dari "indikator_relevan".
4. Selalu sebutkan OPD dan sumber data.
5. Gunakan Bahasa Indonesia formal, lugas, actionable.
6. Analisis bermakna — interpretasi, bukan sekadar membaca angka.

VISUALISASI (pilih salah satu):
- "table" untuk daftar (columns, rows)
- "metric" untuk ringkasan angka (metrics: [{label, value, unit}])
- "chart" untuk tren (xKey, lines/bar, data array)
- "none" jika tidak perlu

FORMAT JSON:
{"narasi":"...","visualisasi":{"tipe":"table|metric|chart|none","konfigurasi":{}},"rekomendasi":["..."]}"""

records = [{"opd": "Badan Kepegawaian", "indikator": "Jumlah ASN", "nilai": "9694", "satuan": "orang", "tahun": "2025", "periode": "2025"},
           {"opd": "Badan Kepegawaian", "indikator": "Jumlah PNS", "nilai": "4286", "satuan": "pegawai", "tahun": "2025", "periode": "2025"},
           {"opd": "Badan Kepegawaian", "indikator": "Jumlah PPPK", "nilai": "5408", "satuan": "pegawai", "tahun": "2025", "periode": "2025"},
           {"opd": "Dinas Kesehatan", "indikator": "Jumlah Puskesmas", "nilai": "17", "satuan": "unit", "tahun": "2025", "periode": "2025"},
           {"opd": "Dinas Pendidikan", "indikator": "Jumlah Sekolah", "nilai": "324", "satuan": "unit", "tahun": "2025", "periode": "2025"}]
data_payload = json.dumps({"ringkasan": {"total_data": 1374, "total_opd": 35, "total_indikator": 905}, "filtered": {"count": 5, "opd": "Badan Kepegawaian", "opd_ditemukan": "Badan Kepegawaian", "indikator_relevan": "Jumlah ASN; Jumlah PNS; Jumlah PPPK", "data_ditemukan": records}})

messages = [
    {"role": "system", "content": system},
    {"role": "system", "content": f"Data Terkini dari SAPA:\n{data_payload}"},
    {"role": "user", "content": "Berapa jumlah ASN di Kabupaten Aceh Tengah?"},
]

MODELS = [
    "deepseek-v4-flash-free",  # baseline (saat ini)
    "deepseek-v4-flash",       # non-free versi
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gpt-5.4-nano",
    "gpt-5.4-mini",
    "claude-haiku-4-5",
    "kimi-k3",
    "mimo-v2.5-free",
    "ling-3.0-flash-free",
    "nemotron-3-ultra-free",
]

def bench(model):
    body = json.dumps({
        "model": model, "messages": messages,
        "temperature": 0.1, "top_p": 0.9, "max_tokens": 4096, "stream": True,
    }).encode()
    req = urllib.request.Request(
        f"{BASE}/chat/completions", data=body,
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {KEY}",
                 "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"},
        method="POST")
    t0 = time.time()
    first_content = None
    content = ""
    try:
        resp = urllib.request.urlopen(req, timeout=90)
        for line in resp:
            line = line.decode().strip()
            if not line.startswith('data:'):
                continue
            payload = line[5:].strip()
            if payload == '[DONE]':
                break
            try:
                chunk = json.loads(payload)
                delta = chunk.get('choices', [{}])[0].get('delta', {})
                txt = delta.get('content') or ''
                if txt:
                    if first_content is None:
                        first_content = time.time() - t0
                    content += txt
            except Exception:
                pass
        total = time.time() - t0
        # Kualitas: valid JSON?
        valid = False
        narasi_len = 0
        vis = None
        try:
            start = content.find('{')
            cleaned = content[start:] if start >= 0 else content
            parsed = json.loads(cleaned)
            valid = True
            narasi_len = len(parsed.get('narasi', ''))
            vis = parsed.get('visualisasi', {}).get('tipe')
        except Exception:
            pass
        return {"model": model, "ttfb": round(first_content, 1) if first_content else None,
                "total": round(total, 1), "content_len": len(content),
                "json_valid": valid, "narasi_len": narasi_len, "vis": vis}
    except Exception as e:
        return {"model": model, "error": str(e)[:100]}

print(f"{'Model':<24} {'TTFB':>6} {'Total':>6} {'ContLen':>7} {'JSON':>5} {'Narasi':>6} {'Vis':>10}")
print("-" * 78)
for m in MODELS:
    r = bench(m)
    if 'error' in r:
        print(f"{m:<24} ERROR: {r['error']}")
    else:
        print(f"{m:<24} {r['ttfb'] or '-':>6} {r['total']:>6} {r['content_len']:>7} "
              f"{'✅' if r['json_valid'] else '❌':>5} {r['narasi_len']:>6} {r['vis'] or '-':>10}")
    time.sleep(1)
