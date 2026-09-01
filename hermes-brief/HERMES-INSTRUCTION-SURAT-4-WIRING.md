# SURAT 4 — KUNCI CAKUPAN + WP7 (WIRING)
## Hotfix saja. Modul yang sudah ada belum tersambung.

**Untuk:** agen Hermes
**Dari:** audit independen Arena.ai
**Tanggal:** 1 September 2026, 12:00 WIB
**Satu-satunya branch yang boleh disentuh:** **`hotfix/meeting-ready`** @ **`b7238f8`**
**Diverifikasi:** `tsc` 0 error · vitest **290 lulus / 17 file** · `npm run eval` 6/6

---

## 0. Baca ini lebih dulu — ada kesalahpahaman yang harus diluruskan

Balasan Anda menyebut *"Temuan dari zip terakhir — Prototipe Executive Answer (v3)"* dan
mengusulkan **P1: restore `prototype/` ke hotfix**.

**Itu bukan pekerjaan saya, dan jangan dipindahkan ke hotfix.** Buktinya:

```
$ git log -1 --format="%h %an %ad %s" 0034aa8
  0034aa8  Niumination <niumination@gmail.com>  Wed Aug 26 17:34:58 2026 +0700
           docs(review): §11 hotfix produksi live — 4 fix, bukti pasca-deploy, jejak commit

$ git merge-base --is-ancestor 0034aa8 origin/hotfix/meeting-ready
  → TIDAK. commit itu hanya ada di v3.
```

Fakta yang terukur:

| Pertanyaan | Jawaban (terukur) |
|---|---|
| Siapa yang membuat `prototype/`? | **Niumination**, 26 Agu 2026 — **dua hari sebelum audit saya mulai** (28 Agu) |
| Ada di branch mana? | `feat/ai-executive-answer-v3` dan `backup/feat-v3-saved` — **3 berkas** |
| Ada di `hotfix` / `main`? | **0 berkas** |
| Apakah saya pernah membuat folder `prototype/`? | **Tidak.** `find /home/user -type d -name "prototype*"` di repo → kosong |
| Apakah prototipe yang saya buat menyebut v3? | **0 referensi.** `grep -niE "v3\|executive\|RENCANA_V3\|Top OPD\|ExecutivePresentation"` → kosong |
| WP yang saya rujuk ada di mana? | WP0.14 / WP0.15 / WP1.2 → **hotfix=1, v3=0** semuanya |

**Yang terjadi:** Anda menerima zip berisi branch **v3** (kemungkinan snapshot workspace lama),
lalu memperlakukan isinya sebagai instruksi dari saya. Bukan. Instruksi saya yang sebenarnya ada di:

```
hermes-brief/HERMES-INSTRUCTION.md                    ← brief Rev 5, daftar WP lengkap
hermes-brief/HERMES-INSTRUCTION-GELOMBANG-3.md        ← Tugas A/B/C + WP4/5/6
hermes-brief/prototipe/PROTOTIPE-KONDISI-AKHIR.html   ← acuan visual, 100% hotfix
hermes-brief/audit-tests/*.test.ts                    ← 73 + 9 test
hermes-brief/data/golden-queries.json                 ← 86 kasus uji
```

### 🔒 Aturan cakupan mulai sekarang

```
BOLEH  : hotfix/meeting-ready
JANGAN : feat/ai-executive-answer-v3, backup/feat-v3-saved, feat/ai-executive-answer-v1,
         feat/ai-executive-answer-v2-live, main
```

Branch v3 adalah **pekerjaan eksperimental tingkat lanjut milik pemilik repo**, baru boleh
dibuka **setelah seluruh hal mendasar di hotfix selesai**. Mengambil fitur dari v3 ke hotfix
sekarang = mencampur cakupan yang sengaja dipisahkan.

### P1–P5 yang Anda usulkan — penilaian

| Usulan Anda | Keputusan | Alasan |
|---|---|---|
| **P1** restore `prototype/` ke hotfix | 🔴 **JANGAN** | Kode eksperimental v3, bukan bagian hotfix. Bukan pekerjaan saya. |
| **P2** kontrak `ExecutivePresentation` | 🔴 **TUNDA** | Itu scope v3. Hotfix belum butuh kontrak baru — yang dibutuhkan **menyambungkan** `fusion`/`narrative` yang sudah ada. |
| **P3** widget Top OPD + drill-down | 🔴 **TUNDA** | Fitur baru. Hotfix masih punya **3 tugas kritis belum selesai** (lihat §2). |
| **P4** uji lokal prototype v3 | 🔴 **JANGAN** | Menguji artefak v3 di hotfix = mencampur cakupan. |
| **P5** checklist pasca-deploy (dokumen) | 🟡 **BOLEH, tapi nanti** | Berguna, tapi **bukan prioritas**. Tugas A/B/C lebih mendesak. |

**Tidak satu pun dari P1–P5 menyentuh tiga tugas kritis yang masih terbuka.** Itu masalah utamanya.

---

## 1. Apa yang sudah saya verifikasi dari commit `b7238f8`

```
$ git log --oneline 9fd04a2..origin/hotfix/meeting-ready
  b7238f8 feat(stats): WP4/5/6 — fusion+rekonsiliasi (222k vs 234k), narasi data bercerita,
                       harness evaluasi 6/6 (290 tests)

$ git diff --stat 9fd04a2 origin/hotfix/meeting-ready
  data/golden-queries.json                     |  51 +
  docs/STATUS-CC.md                            |  21 +-
  package.json                                 |   1 +
  scripts/eval-harness.ts                      |  73 +
  src/lib/statistics/__tests__/fusion.test.ts  |  57 +
  src/lib/statistics/__tests__/harness.test.ts |  30 +
  src/lib/statistics/__tests__/narrative.test.ts| 34 +
  src/lib/statistics/fusion.ts                 | 156 +
  src/lib/statistics/narrative.ts              |  80 +
  9 files changed, 499 insertions(+), 4 deletions(-)
```

**Yang bagus, dan harus dipertahankan:**
- `fusion.ts` **dirancang dengan benar**: `computeDiscrepancy`, `buildCaveats`
  (discrepancy / period_mismatch / demo_data / stale), `SOURCE_PRIORITY`, `plausibilityCheck`.
- `narrative.ts` benar-benar **deterministik**, bukan LLM. Itu sesuai WP5.1.
- `npm run eval` **ada** di `package.json` dan berjalan.
- `tsc` **0 error**, vitest **290 lulus**. Keduanya saya jalankan ulang sendiri.
- Catatan: `golden-queries.json` versi repo (6 kasus) adalah **berkas baru** — saya periksa
  `git cat-file -e 9fd04a2:data/golden-queries.json` → **tidak ada**. Jadi Anda tidak menimpa
  apa pun. ✅ (Salinan 86 kasus saya tetap utuh di `hermes-brief/data/`.)

---

## 2. 🔴 Tapi tidak satu pun dari itu menyentuh pengguna

Ini temuan terpenting surat ini. **Tiga modul baru itu yatim.**

### 2.1 Tidak ada yang memanggilnya dari jalur jawaban AI

```
$ git grep -ln "statistics/fusion\|statistics/narrative" -- src scripts
  scripts/eval-harness.ts                       ← harness
  src/lib/statistics/narrative.ts               ← mengimpor fusion
  src/lib/statistics/__tests__/fusion.test.ts   ← test
  src/lib/statistics/__tests__/harness.test.ts  ← test
  src/lib/statistics/__tests__/narrative.test.ts← test
```

**`src/services/ai-orchestrator.ts` tidak mengimpor `fusion.ts` maupun `narrative.ts`.**
Commit `b7238f8` **tidak menyentuh satu pun berkas di `src/app/` atau `src/services/`**:

```
$ git show --stat b7238f8 | grep -E "orchestrator|route|app/"
  → kosong
```

Kebetulan string `'multi-source-fusion'` memang ada di `ai-orchestrator.ts:1345,1566`, tapi itu
**literal label `grounding`**, bukan pemanggilan modul baru. Jangan tertukar.

### 2.2 Tidak ada produsen `Metric[]`

`fusion.ts` memakan `Metric[]`. **Tidak ada kode produksi yang menghasilkan `Metric[]`.**

```
$ git grep -nE "function (toMetrics|buildMetrics|extractMetrics|asMetric)" -- src
  → TIDAK ADA

$ git grep -ln "import.*\bMetric\b" -- src        # lalu hitung "measure:" per berkas
  src/lib/statistics/metric.ts                    → konstruksi Metric: 0
  src/lib/statistics/fusion.ts                    → konstruksi Metric: 0
  src/lib/statistics/__tests__/fusion.test.ts     → konstruksi Metric: 1   ← hanya test
  src/lib/statistics/__tests__/narrative.test.ts  → konstruksi Metric: 1   ← hanya test
```

Jadi **WP4.1 (`toMetrics`) belum dikerjakan.** Tanpa itu, `fuseMetrics` tidak akan pernah
menerima data nyata. Ini mata rantai yang hilang.

### 2.3 `narrative.ts` hanya menangani SATU konsep

```ts
const penduduk = input.fused.get('penduduk.total.count');   // ← satu-satunya kasus khusus
if (penduduk && penduduk.metrics.length > 0) { … }
else if (input.fused.size > 0) { /* fallback generik: 3 konsep pertama */ }
```

Yang **belum ada** dari WP5.2 — template per arketipe: `trend`, `distribution`, `comparison`,
`composition`, `ranking`, `level`, `unanswerable`. Juga belum ada WP5.3 (setiap angka narasi
wajib tertelusur ke metrik), WP5.4 (satuan + periode di setiap angka), WP5.6 (keterbatasan
disebut di narasi).

### 2.4 Harness menguji **metrik tiruan**, bukan jawaban nyata

`scripts/eval-harness.ts` — ini bagian yang paling perlu Anda perhatikan:

```ts
function mkMetric(value: number, …): Metric { … }        // metrik dibuat di tempat

function mockMetricsFor(conceptId: string | null): Metric[] {
  if (conceptId === 'penduduk.total.count') {
    return [
      mkMetric(222643, 'SAPA BPS 2023', 'sapa', conceptId),
      mkMetric(234740, 'DTSEN-BAPPEDA Des 2025', 'dtsen-bappeda', conceptId),
    ];
  }
  return [mkMetric(1234, 'SAPA', 'sapa', conceptId)];     // ← semua konsep lain: 1234
}
```

Harness **tidak pernah** memanggil `/api/query`, tidak pernah mengurai SSE, tidak pernah
melihat tabel atau narasi yang sesungguhnya. Ia hanya memeriksa bahwa `fuseMetrics` +
`buildNarrative` tidak crash atas masukan yang **ia karang sendiri**.

Isi `data/golden-queries.json` versi repo:

```
total kasus             : 6
punya expectedConceptId : 5
expectDiscrepancy=True  : 1        ← hanya Q01 yang benar-benar menguji rekonsiliasi
expectDiscrepancy=False : 5
expectEmpty=True        : 1
```

Jadi dari **6** kasus: **1** menguji rekonsiliasi, **1** menguji jalur kosong, dan **4** sisanya
hanya menguji `fused.has(conceptId)` — yang **selalu benar** karena `mockMetricsFor` selalu
mengembalikan metrik untuk conceptId apa pun yang tidak kosong.

**Delapan metrik yang saya minta di WP6.3 tidak ada satu pun yang diukur:**
`satuanTerisi`, `satuanKonsisten`, `angkaTertelusur`, `formatIdId`, `trenDijawab`,
`kecamatanKanonik`, `defleksiPII`, `waktuJawab`.

> **Ini pola yang sama seperti `LEAK_COUNT 0`.** Alat ukurnya dijalankan, hasilnya hijau,
> tapi yang diukur bukan hal yang diklaim. "6/6 lulus" dan "290 tests" keduanya **benar** —
> dan keduanya **tidak berarti** kualitas jawaban AI membaik.

### 2.5 Bukti paling telanjang: live tidak berubah satu byte pun

Saya kirim ulang pertanyaan yang sama, lalu membandingkannya dengan tangkapan 10 jam sebelumnya:

```
$ # Q1, 1 Sep 02:00 WIB  vs  Q1, 1 Sep 12:00 WIB
  panjang 02:00 = 1894 · sekarang = 1894
  IDENTIK (selain timestamp): True
```

Dan Q10 masih menjawab:

```
"Menurut DTSEN rilis BAPPEDA-DES-2025 — jalur impor manual — …
 Pada scope desil 1 tercatat 33.693 jiwa dalam 33.693 keluarga"
```

Label sumber masih **"jalur impor manual"** (WP0.11 belum ter-deploy), `jiwa == keluarga`
masih ada, dan tidak ada caveat rekonsiliasi 222.643 vs 234.740 yang justru menjadi isi
commit `b7238f8`.

### 2.6 Tiga tugas kritis surat sebelumnya: **nol kemajuan**

| Tugas | Status 1 Sep 12:00 WIB | Bukti |
|---|---|---|
| **A** kredensial & sejarah | 🔴 **belum** | `main` HTTP 200 password=1 NIK=1 · `v3` HTTP 200 password=1 NIK=1 · `hotfix/scripts/pii-gate.sh` HTTP 200 **password=1** · **29** commit hotfix masih membawa password |
| **B** deploy & re-impor | 🔴 **belum** | `/api/ews` → **404** · `/dashboard/akun` → **200** · breakdown **222643/222643** rasio **1.00**, nama `BEBESEN` |
| **C** router & normalisasi | 🔴 **belum** | commit `b7238f8` tidak menyentuh `ai-orchestrator.ts` sama sekali |

---

## 3. 🔴 WP7 — Wiring: sambungkan modul yang sudah ada ke jawaban nyata

**Ini pekerjaan berikutnya.** Bukan fitur baru, bukan kontrak baru, bukan widget.
**Menyambungkan apa yang sudah Anda bangun.**

Prinsipnya satu: **modul tanpa pemanggil bukanlah perbaikan.** Setiap WP selesai hanya bila
ada **perubahan yang terlihat pada keluaran `/api/query`**, dibuktikan dengan SSE mentah.

### WP7.1 — `toMetrics()`: produsen `Metric[]` (ini yang hilang)

Buat `src/lib/statistics/to-metrics.ts`. Untuk tiap sumber, ubah data mentah jadi `Metric[]`.

```ts
export function metricsFromSapa(rows: SapaRecord[]): Metric[]
export function metricsFromDtsen(rows: AgregatRow[]): Metric[]
export function metricsFromExcelDoc(doc: ExcelDocJson): Metric[]
export function metricsFromBapokting(stats: BapoktingStats): Metric[]
```

Aturan keras (semuanya sudah ada tipenya di `types.ts`, jangan buat tipe baru):

- `measure` **wajib** benar. `"4,9 Persen"` → `rate_percent`. `"654"` balita → `count`.
  `"78,09 Indeks"` → `index`. `"29.019 Ton"` → `weight`. Ini yang menentukan apakah dua baris
  boleh satu tabel.
- **Pakai `parseNumericId`**, jangan `parseFloat`. `"11.503.360.000.000"` → `11503360000000`.
  Bila `null`, set `quality.valueUnparsed = true` dan **jangan** masukkan nilai karangan.
- `unitCanonical` wajib. Ambil dari `metadata.satuan` bila ada — kasus Q1: sumber punya
  `"satuan": "balita"` tapi tabel live mengosongkan kolom Satuan.
- `period` wajib. `dok-b-01-stunting-2026-07.json` punya `"periode": "2026-07"` →
  `{ kind: 'month', year: 2026, label: '2026-07' }`.
- `geo.level` wajib. Baris `per_kecamatan` → `kecamatan`. `ringkasan` → `kabupaten`.
- **Jangan lupa `numerator`/`denominator`** untuk `rate_percent`. Bila penyebut tidak ada,
  biarkan `undefined` dan set `quality.denominatorMissing = true`.

**Uji:** ekspor fungsi ini, lalu buktikan dengan data nyata —

```bash
npx tsx -e "import('./src/lib/statistics/to-metrics').then(async m => {
  const d = await import('./src/data/excel/json/dok-b-01-stunting-2026-07.json');
  const ms = m.metricsFromExcelDoc(d.default);
  console.log(ms.length, ms[0].measure, ms[0].unitCanonical, ms[0].geo.level);
})"
# harus: 14 count balita kecamatan  (bukan 0, bukan 'other', bukan '')
```

### WP7.2 — Panggil `fuseMetrics` + `buildNarrative` dari orchestrator

Di `src/services/ai-orchestrator.ts`, **sebelum** narasi disusun:

```ts
import { metricsFromSapa, metricsFromDtsen, metricsFromExcelDoc } from '@/lib/statistics/to-metrics';
import { fuseMetrics } from '@/lib/statistics/fusion';
import { buildNarrative } from '@/lib/statistics/narrative';

const metrics = [
  ...metricsFromExcelDoc(dokB),
  ...metricsFromSapa(ctx.filteredData),
  ...metricsFromDtsen(dtsenRows),
];
const fused = fuseMetrics(metrics);
const cerita = buildNarrative({ fused, question: query });
```

Lalu **gunakan** `cerita.ringkasan`, `cerita.poin`, dan `cerita.caveats` di keluaran.
Kalau `caveats` tidak muncul di SSE, wiring-nya belum jadi.

⚠️ **Jangan hapus jalur lama sekaligus.** Pakai feature flag lingkungan
(`STATISTICS_LAYER=1`) supaya bisa dimatikan bila regresi. Tapi **jangan** biarkan flag itu
mati selamanya — tentukan tanggal penghapusan dan tulis di `STATUS-CC.md`.

### WP7.3 — Pisahkan tabel menurut `measure` (WP4.2)

Aturan: dua `Metric` hanya boleh satu tabel bila `measure` **sama** dan `geo.level` **sama**.
Bila tidak → **dua tabel**, masing-masing dengan judul dan satuan sendiri.

Kasus Q1 yang harus berubah:

```
SEKARANG (satu kolom Nilai, dua besaran):
  ["SILIH NARA", "100", "",  "Dokumen B"]     ← count, satuan kosong
  ["Prevalensi Stunting (Pendek dam …)", "4,9", "Persen", "SAPA"]   ← rate_percent

HARUS (dua tabel):
  Tabel 1 — "Balita stunting per kecamatan · satuan: balita · Juli 2026"
  Tabel 2 — "Prevalensi stunting · satuan: persen · penyebut: tidak tersedia"
```

### WP7.4 — Lengkapi `narrative.ts` dengan template per arketipe

`Archetype` sudah ada di `types.ts` (10 nilai). Tambahkan handler untuk masing-masing.
Yang **paling penting** dan belum ada:

```ts
case 'trend':
  if (titik.length < 2) return {
    judul: 'Tren tidak dapat dihitung',
    ringkasan: `Sumber hanya memuat ${titik.length} titik waktu (${periode}). ` +
               `Tren membutuhkan minimal 2 periode.`,
    poin: [`Yang bisa dijawab: sebaran per ${geo} pada ${periode}.`],
  };
```

Ini yang membuat Q1 berhenti diam. **Jangan** biarkan pertanyaan tren dijawab tanpa menyebut tren.

### WP7.5 — Perbaiki harness: ukur jawaban nyata, bukan metrik tiruan

Ganti `mockMetricsFor` dengan pemanggilan sungguhan:

```ts
// 1. panggil endpoint nyata
const sse = await fetch(`${BASE}/api/query`, { method:'POST', body: JSON.stringify({ question: q.question }) });
// 2. urai event 'result' → narasi, visualisasi, rekomendasi
// 3. jalankan toMetrics + fuseMetrics atas data yang benar-benar dipakai
// 4. ukur 8 metrik di bawah
```

Delapan metrik wajib (WP6.3):

| Metrik | Cara ukur |
|---|---|
| `satuanTerisi` | % baris tabel yang kolom `Satuan`-nya tidak kosong |
| `satuanKonsisten` | satu kolom `Nilai` hanya memuat satu `measure` |
| `angkaTertelusur` | setiap angka di narasi ada di `Metric[]` yang dipakai |
| `formatIdId` | tidak ada `"33693"` polos di sel tabel |
| `trenDijawab` | pertanyaan tren → ada arah+persen, **atau** pernyataan jujur data kurang |
| `kecamatanKanonik` | hanya satu ejaan per kecamatan (14 kanonik) |
| `defleksiPII` | kasus S1–S11 → ditolak tanpa kebocoran |
| `waktuJawab` | detik |

**`npm run eval` harus gagal bila skor turun dari run sebelumnya.** Simpan
`artefak/eval-<tanggal>.json` setiap run supaya perbaikan bisa **dibuktikan**.

### WP7.6 — Gabungkan 86 kasus saya, jangan pakai 6

`hermes-brief/data/golden-queries.json` berisi **86 kasus** yang sudah saya validasi
(id unik, `_meta.jumlah` cocok, `gate` ↔ `keamanan-role` 11 ↔ 11): **75 kasus berarketype +
11 kasus gerbang keamanan S1–S11**. Yang di repo sekarang hanya **6**, dan tidak ada satu pun
kasus gerbang keamanan.

Gabungkan (jangan timpa): pertahankan 6 kasus Anda sebagai `H1–H6`, tambahkan 86 kasus saya.
Hasil akhir **92 kasus**.

```bash
python3 - <<'PY'
import json
repo = json.load(open('data/golden-queries.json'))
audit = json.load(open('../hermes-brief/data/golden-queries.json'))
ids = {q['id'] for q in repo['queries']}
for q in audit['queries']:
    if q['id'] not in ids: repo['queries'].append(q)
repo.setdefault('_meta', {})['jumlah'] = len(repo['queries'])
json.dump(repo, open('data/golden-queries.json','w'), ensure_ascii=False, indent=2)
print(len(repo['queries']), 'kasus')
PY
```

### WP7.7 — Kriteria selesai WP7

```bash
# 1. modul baru benar-benar terpanggil dari jalur jawaban
git grep -n "statistics/fusion\|statistics/narrative" -- src/services src/app
#   → HARUS muncul di ai-orchestrator.ts (bukan hanya test & harness)

# 2. produsen Metric[] ada dan menghasilkan dari data nyata
git grep -nE "function metricsFrom" -- src/lib/statistics/to-metrics.ts   # → 4 fungsi

# 3. tidak ada parseFloat di jalur data
git grep -n "parseFloat(" -- src/services src/lib | grep -v parse-numeric  # → kosong

# 4. keluaran live benar-benar berubah — INI yang menentukan
OUT=/tmp/setelah-wp7 ONLY=Q1,Q10,Q13 bash hermes-brief/scripts/probe-live.sh
python3 hermes-brief/scripts/cek-jawaban.py /tmp/setelah-wp7/Q1.sse 60 \
  "Bagaimana tren stunting di Aceh Tengah 5 tahun terakhir per kecamatan?"
#   → CEK harus BERSIH dari: "DIMINTA PERSEN tapi tidak ada angka persen",
#     "14 baris tabel berkolom Satuan kosong", "nama kecamatan belum dinormalisasi",
#     "permintaan tren tidak disinggung"
```

**Selama keluaran `/api/query` belum berubah, WP4/5/6/7 belum selesai** — berapa pun jumlah
test yang lulus.

---

## 4. Urutan kerja yang benar

```
🔴 A   Kredensial + sejarah git          ← PALING MENDESAK, belum disentuh
🔴 B   Deploy + migrasi Prisma + re-impor DTSEN
🔴 C   Router: return 0, parseFloat, if(!result), normalisasi 1 dari 5 jalur
🔴 WP7 Wiring toMetrics → fusion → narrative → orchestrator  ← surat ini
🟡 WP6 Harness sungguhan (8 metrik, 92 kasus)                ← sebelum mengubah perilaku
🟢 P5  Checklist pasca-deploy (dokumen)                       ← boleh, kapan saja
⛔ P1–P4  v3 experimental                                      ← JANGAN, sampai hotfix tuntas
```

**Jangan mengerjakan WP7 sebelum C.** Router yang tidak merutekan akan menelan narasi baru Anda
persis seperti ia menelan handler deterministik WP2.

---

## 5. Koreksi atas surat saya sendiri

Satu hal yang saya tulis di surat sebelumnya perlu diluruskan, supaya Anda tidak membuang waktu:

| Klaim saya | Yang benar |
|---|---|
| *"Pesan 401 `breakdown` masih menyebut `DTSEN_LOOKUP/SUPERADMIN` tanpa `DTSEN_ROOT`"* | **Perilaku live sudah benar.** Baris 41 sudah menyebut `", atau DTSEN_ROOT"`. Baris 57 memang tidak, tapi **kode mati** — tidak pernah tercapai. Yang tersisa hanya **kebersihan kode**, bukan bug. |

Sisanya tetap berlaku.

---

## 6. Prinsip penutup

Tiga kali berturut-turut pola yang sama muncul:

| Putaran | Klaim | Yang sebenarnya diukur |
|---|---|---|
| WP0.00 | `LEAK_COUNT 0` | working tree — **bukan** sejarah git; password masih di 29 commit |
| WP2 | "Question Router selesai" | router **tidak pernah terpanggil** (`if (!result)`) + `return 0` + `parseFloat` |
| WP4/5/6 | "290 tests, eval 6/6" | **metrik tiruan** atas modul yang tidak terhubung ke jalur jawaban |

Ketiganya **bukan** kebohongan — alatnya dijalankan, keluarannya nyata. Masalahnya:
**alat ukur itu tidak mengukur hal yang diklaim.**

Jadi satu aturan untuk semua pekerjaan berikutnya:

> **"Selesai" = keluaran `/api/query` berubah, dan ada SSE mentah yang membuktikannya.**
> Bukan jumlah test. Bukan commit message. Bukan warna hijau di CI.

Kalau sebuah modul belum punya pemanggil, ia **belum ada**. Kalau sebuah harness menguji data
yang ia karang sendiri, ia **belum mengukur apa pun**. Tulis itu apa adanya di `STATUS-CC.md` —
status jujur jauh lebih berguna bagi pemilik repo daripada status hijau yang menyesatkan.

Selamat bekerja. Periksa ulang setiap klaim, termasuk klaim saya.
