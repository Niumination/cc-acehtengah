# Brief untuk Hermes Agent — SAPA Smart AI Aceh Tengah

Paket instruksi agar Hermes Agent menyempurnaan **routing pengolahan data sesuai ilmu statistik**
sehingga SAPA Smart AI benar-benar menghasilkan *"data bercerita"*.

**Disusun:** 28 Agustus 2026 · **Rev 1:** 29 Agu 07:49 UTC · **Rev 2:** 29 Agu 15:17 UTC · **Rev 3:** 30 Agu 06:05 UTC · **Rev 4:** 31 Agu 13:45 UTC · **Rev 5:** 31 Agu 2026 **14:20 UTC** (audit mendalam).

Enam putaran. Putaran terakhir tidak lagi membaca kode — **menjalankannya**: repo di-clone → `git fetch --prune` → `npm ci` → `vitest`
→ `tsc` → `next build` → `git checkout` ke branch live → probe fungsi murni via `tsx` →
**14 panggilan nyata** ke `POST https://cc-acehtengah.vercel.app/api/query` → pembacaan endpoint
live → pemeriksaan seluruh branch di GitHub.

---

## ⚠️ DOKUMEN TERBARU: [`HERMES-INSTRUCTION-SURAT-4-WIRING.md`](HERMES-INSTRUCTION-SURAT-4-WIRING.md)

**1 Sep 2026 12:00 WIB · commit `b7238f8`.** Dua hal penting:

**1. 🔒 Kunci cakupan — hotfix saja.** Hermes mengira menerima instruksi dari sebuah "zip" berisi
branch `feat/ai-executive-answer-v3` dan mengusulkan memindahkan folder `prototype/` ke hotfix.
**Itu bukan pekerjaan saya.** Terukur:

```
$ git log -1 --format="%h %an %ad" 0034aa8
  0034aa8  Niumination  Wed Aug 26 17:34:58 2026   ← dibuat pemilik repo, 2 HARI SEBELUM audit saya
$ git merge-base --is-ancestor 0034aa8 origin/hotfix/meeting-ready   → TIDAK
$ grep -ciE "v3|executive|Top OPD" prototipe/PROTOTIPE-KONDISI-AKHIR.html   → 0
```

Prototipe yang saya buat **100% hotfix**. Branch v3 adalah pekerjaan eksperimental pemilik repo,
baru dibuka setelah hal mendasar di hotfix tuntas. **Usulan P1–P4 ditolak.**

**2. 🔴 WP4/5/6 di `b7238f8` membangun modul yang tidak tersambung.** Terukur:

| Fakta | Bukti |
|---|---|
| `fusion.ts` + `narrative.ts` **tidak dipanggil** dari jalur AI | `git grep` → hanya test + harness; `ai-orchestrator.ts` **tidak** mengimpornya |
| Commit `b7238f8` **tidak menyentuh** `src/app/` atau `src/services/` | `git show --stat` → 0 berkas |
| **Tidak ada** produsen `Metric[]` (WP4.1) | `git grep "function metricsFrom"` → kosong |
| `narrative.ts` hanya menangani **satu** konsep | `fused.get('penduduk.total.count')` hard-coded |
| Harness menguji **metrik tiruan**, bukan jawaban nyata | `mockMetricsFor()` — tidak pernah memanggil `/api/query` |
| 8 metrik WP6.3 **tidak satu pun** diukur | harness hanya cek `fused.has(conceptId)` |
| **Live tidak berubah satu byte pun** | Q1 02:00 vs 12:00 WIB → `IDENTIK: True` |
| Tugas A/B/C **nol kemajuan** | password masih di 3 URL + `pii-gate.sh` · `/api/ews` 404 · rasio 1.00 |

`tsc` 0 error dan **290 test lulus** itu nyata — tapi tidak berarti kualitas jawaban membaik.
Pekerjaan berikutnya adalah **WP7 (wiring)**, bukan fitur baru.

---

## ⚠️ DOKUMEN TERBARU: [`HERMES-INSTRUCTION-GELOMBANG-3.md`](HERMES-INSTRUCTION-GELOMBANG-3.md)

**1 Sep 2026.** Hermes sudah mengerjakan gelombang 1–2 — **22 commit** di `hotfix/meeting-ready`
@ `9fd04a2`. Saya verifikasi ulang semuanya sendiri, bukan menerima klaimnya:

| | Hasil verifikasi |
|---|---|
| ✅ **Terkonfirmasi** | `tsc` **0 error** · vitest **278 lulus** · `next build` ✅ · WP0.0/0.2b/0.14/0.15/1.2/0.3/0.5/0.6/0.8/0.9/0.10 **terbukti** dengan test yang saya tulis |
| 🔴 **Belum tuntas** | Password + NIK **masih bisa diunduh dari 4 URL publik tanpa login** · `pii-gate.sh` sendiri memuat literal passwordnya · sejarah git belum dibersihkan (**29** commit di hotfix, **6** di `main`) · `STATUS-CC.md` mengklaim force-push yang **belum terjadi** · 0 PR terbuka |
| 🔴 **Belum sampai** | Live masih `jiwa == keluarga` + `ALL-CAPS` · `/api/ews` 404 · `/dashboard/akun` 200 · **skema Prisma berubah secara merusak** (`Int`→`String`, 2 model dihapus) → deploy tanpa migrasi bisa mematikan situs |
| 🟠 **Cacat baru** | Integrasi Question Router: `sort(() => 0)` (tidak mengurutkan apa pun) + **`parseFloat`** yang memperkenalkan kembali bug parser (`"11.503.360.000.000"` → `11.503`) · router hanya jalan bila handler lama gagal · normalisasi kecamatan dipanggil **1 dari 5** jalur |

Dokumen-dokumen di bawah tetap menjadi acuan untuk **WP4 / WP5 / WP6** (belum disentuh sama sekali).

---

## 🛑 Sebelum apa pun: ada kebocoran kredensial — dan kini di **tiga** branch

Diverifikasi ulang **baru saja** lewat URL mentah publik (HTTP 200, tanpa login):

```
$ curl -s https://raw.githubusercontent.com/niumination/cc-acehtengah/main/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md | grep -nE "cPtnkHE7NYD3Gg_s|3216022603070011"
28:- Verifikasi live: `dtsen_root` → "AL HAFIZH RAIHAN ARIGADIEI · 3216022603070011" ✅; `master_admin` → termask ✅
52:- `dtsen_root` / `cPtnkHE7NYD3Gg_s` (DTSEN_ROOT — ganti password segera)
```

Baris 52 memuat **password akun `DTSEN_ROOT`** — satu-satunya role yang dapat mendekripsi nama
asli + NIK **235.011 orang** — dan baris 28 memuat **nama lengkap + NIK 16 digit seorang warga
asli**. Berkas ini ada di HEAD `origin/main` yang publik. Dokumen itu sendiri menulis
*"ganti password segera"*, tetapi sampai pemeriksaan ini passwordnya belum diganti dan
riwayatnya belum dibersihkan.

`scripts/pii-gate.sh` **lolos** karena ia hanya `os.walk('src/data/excel')` — `docs/` tidak
pernah dipindai.

**Diperbarui 31 Agu 13:45 UTC:** berkas yang sama kini ada di **`main`, `hotfix/meeting-ready`,
dan `feat/ai-executive-answer-v3`** — `git show origin/<branch>:… | grep -cE …` mengembalikan
**2** di ketiganya, dan `raw.githubusercontent.com` masih menjawab **200**. `scripts/pii-gate.sh`
tidak disentuh di branch mana pun. Membersihkan satu branch tidak akan cukup.

→ **Kerjakan `WP0.00` sebelum paket kerja lain apa pun.** Semua isi paket ini tentang kualitas
jawaban AI; kebocoran ini lebih mendesak dari seluruhnya. **Dan jangan merge `v3` ke `main`
sebelum WP0.00 + WP0.0 selesai** (WP0.13).

---

## Isi paket

| Berkas | Untuk apa |
|---|---|
| **`HERMES-INSTRUCTION.md`** | **Instruksi kerja utama.** WP0.00 (cabut kredensial + PII) + WP0.0 (hotfix data P0) + WP0.1–WP0.12 + WP1–WP7, dengan berkas target, spesifikasi tipe data, kriteria selesai terukur, daftar "sudah benar — jangan diregresi", 12 larangan, urutan PR, dan kalimat pembuka siap salin di bagian 9. |
| `AUDIT-LIVE-2026-08-29.md` | Bukti lapangan **empat putaran**. **Bagian 00 = delta terbaru (30 Agu): branch `v3`, kebocoran di 2 branch, probe putaran 4, dan koreksi atas checker saya sendiri.** Bagian 0 = delta 29 Agu (force-push, role/BNBA). Bagian 1 = delta 28 → 29 Agu. Lalu kondisi repo, gerbang mutu, runtime live, cacat statistik data, bug parser, tabel routing, 14 keluaran live apa adanya, perintah reproduksi. |
| `data/golden-queries.json` | **86 entri** (v2.2): 75 pertanyaan golden berlabel arketipe + `mustInclude`/`mustNotInclude`/`mustCompute`/`note`, **plus 11 kasus `gate` (S1–S11)** untuk keamanan, otorisasi, dan gerbang mutu (matriks role × scope × sesi, audit fail-closed, uji balik `pii-gate.sh`, cek di setiap branch, test untuk mesin statistik). |
| `audit-tests/*.test.ts` | **73 test audit** yang memanggil fungsi produksi (`dtsen-crypto`, `dtsen-keluarga`, `bapokting-stats`, `parser-stats`). Salin ke `src/__audit/` lalu `npx vitest run src/__audit/`. |
| `artefak/probe-0831-verif/` | Berkas SSE mentah Q1/Q10/Q13 (31 Agu) — bukti tabel campur satuan & `jiwa == keluarga`. |
| `scripts/cek-jawaban.py` | **Sumber kebenaran seluruh cek cacat.** Dipanggil `probe-live.sh`, tapi bisa dijalankan ulang atas berkas `.sse` tersimpan tanpa menembak situs: `python3 scripts/cek-jawaban.py <berkas.sse> <detik> "<pertanyaan>"`. |
| `scripts/probe-live.sh` | Penembak 14 pertanyaan audit ke situs live (SSE) + cek otomatis. Sudah diuji jalan 3×; cek-nya mendeteksi bug `jiwa == keluarga`, kolom `Satuan` kosong, dan kebocoran istilah internal. |

---

## Inti diagnosis (tidak berubah setelah **empat** putaran)

Ini **bukan** masalah model LLM. LLM hanya diberi tiga tugas sempit (narasi ≤3 kalimat,
rekomendasi, pilih tipe visualisasi). Yang rusak adalah **semua yang terjadi sebelum LLM
dipanggil**: pertanyaan tidak diklasifikasikan (routing berupa rantai pendek-sirkuit berbasis
substring sehingga jalur tren/perbandingan mati secara struktural), sistem tidak punya taksonomi
ukuran maupun penyebut, dan **tidak ada satu pun fungsi statistik** di seluruh basis kode.

Bukti paling telanjang, **empat putaran uji, hasil identik**: tiga pertanyaan live yang eksplisit
meminta *"persen"* menghasilkan **nol** angka persen. Endpoint `breakdown` yang baru pun hanya
`groupBy` + `sum` — tidak ada satu pembagian.

Dan ini terkonfirmasi lagi di dua branch fitur (31 Agu): di `feat/ai-executive-answer-v3` @ `1dd5ed7` dan di `hotfix/meeting-ready` @ `14cfb19`,
`git ls-tree -r --name-only … | grep -i statistic` → **kosong**, dan `zScore` / `growthRate` /
`shareOf` / `percentRate` → **0** kemunculan di **ketiga** branch. Satu-satunya pengecualian adalah
`src/lib/bapokting-stats.ts` (hanya di `hotfix`) — mesin statistik satu domain, lihat bagian
putaran kelima di atas. Yang baru di sana adalah **lapisan presentasi**:
`buildInsights()` di `executive-presentation.ts:233` merangkai maksimum 3 "insight" dari template
kalimat tetap — tidak ada satu angka pun di dalamnya.

---

## Putaran keenam (31 Agu 14:20 UTC) — audit mendalam: **73 test, semua lulus**

Putaran sebelumnya membaca kode dan menembak endpoint. Putaran ini memanggil **fungsi produksi**
dengan data sintetis. Hasilnya tersimpan sebagai artefak yang bisa dijalankan ulang:

```
hermes-brief/audit-tests/
├── dtsen-crypto.test.ts      25 test — enkripsi, panjang kunci, matriks role
├── dtsen-keluarga.test.ts     9 test — reproduksi bug jiwa == keluarga
├── bapokting-stats.test.ts   12 test — mesin statistik Bapokting
└── parser-stats.test.ts      27 test — kedua parser angka atas 9 masukan nyata
```

```bash
cd cc-acehtengah && git checkout -B audit-hotfix origin/hotfix/meeting-ready && npm ci
cp -r hermes-brief/audit-tests/*.test.ts src/__audit/
npx vitest run src/__audit/        # → Test Files 4 passed · Tests 73 passed
```

### 🔴 Temuan 1 — bug `jiwa == keluarga` direproduksi, **dan dikunci oleh test yang sudah ada**

| Masukan | `jumlahJiwa` | `jumlahKeluarga` | |
|---|---|---|---|
| `no_kk` lengkap (5 orang, 2 KK) | 5 | **2** | ✅ |
| `no_kk` hilang dari header | 5 | **5** | 🔴 |
| `no_kk` ada tapi kosong | 5 | **5** | 🔴 |
| `no_kk` 15 digit (cacat) | 5 | **5** | 🔴 |

Yang membuatnya bertahan: `src/services/__tests__/faseJ.dtsen-impor.test.ts:97` bernama
*"keluargaId fallback deterministik saat no_kk kosong"* dan **meng-assert perilaku proxy itu
sebagai hal yang diharapkan** — tanpa pernah memeriksa akibatnya pada agregat. Siapa pun yang
memperbaiki `dtsen-import.ts:205` akan melihat test itu merah.

### 🔴 Temuan 2 — kripto: algoritmanya benar, **validasi kuncinya berlubang**

25 test membuktikan AES-256-GCM-nya **benar**: IV acak per panggilan, format `iv(12)‖tag(16)‖ct`,
tag GCM menolak ciphertext yang diubah 1 bit, kunci berbeda tidak bisa mendekripsi,
`canSeeFullIdentitas` benar atas 11 masukan.

Tapi `dtsen-crypto.ts:13` memakai `b.length >= 32` padahal AES-256 menuntut **tepat** 32 byte:

| `DTSEN_DATA_KEY` | byte | lolos `>=32`? | akibat |
|---|---|---|---|
| 43-char base64url (dokumentasi) | 32 | ya | ✅ OK |
| 44-char base64url | 33 | **ya** | 🔴 `RangeError: Invalid key length` |
| **64-char hex** (paling wajar untuk 256-bit) | 48 | **ya** | 🔴 `RangeError` |

`encryptField` tidak punya try/catch → seluruh alur enkripsi BNBA gagal keras. Perbaikannya satu
karakter: `=== 32`.

### 🔴 Temuan 3 — mesin statistik Bapokting: matematika benar, penyajian berbahaya

**Benar:** `hitungStdDev` = simpangan baku **sampel** (`[10,12,14,16,18]` → `3,16228`; populasi
akan `2,82843`) · `n=1` → `0` · tren dengan 14 titik → `'naik'`, `pct=25` · `(0→50)` → `0` bukan
`Infinity`.

**Empat cacat terbukti:** tren **diam-diam "stabil"** bila titik < 14 tanpa tanda apa pun ·
satu komoditas disebut **"paling fluktuatif" DAN "paling stabil"** dengan CV identik ·
`overallIndex` = **`NaN`** saat data kosong (`0/0`) · `hargaAvg` kategori = **rata-rata dari
rata-rata** (dilaporkan 20.000, tertimbang 12.500 — selisih 60%). Ditambah dua ternari mati
(`? 'naik' : 'naik'`) dan **nol test**.

### 🔴 Temuan 4 — parser angka, diukur atas 9 masukan nyata

| Masukan | Seharusnya | `sapa-client.ts:433` | `parseNumericId` (v3) |
|---|---|---|---|
| `"31,4"` | `31.4` | **`314`** | ✅ |
| `"16.000"` | `16000` | **`16`** | ✅ |
| `"4,9"` | `4.9` | **`49`** | ✅ |
| `"11.503.360.000.000"` | `11503360000000` | **`NaN`** | ✅ |
| `"Rp 1.250.000"` | `1250000` | **`NaN`** | `null` (gagal **aman**) |
| | | **7 dari 9 salah** | **8 dari 9 benar** |

Bedanya bukan jumlah tapi **cara gagal**: yang rusak **mengarang angka**; yang benar **menolak**.

### 🔴 Temuan 5 — normalisasi kecamatan: tiga jalur, peta alias berisi **satu** entri

`KEC_ALIAS = { 'lut tawar': 'Laut Tawar' }` — satu entri. Dan `kecLookup` **nol kali** dipanggil
dari `dtsen-planner`, `grounding`, `ai-orchestrator`, `sapa-client`. Akibatnya satu kabupaten punya
empat ejaan untuk satu kecamatan (`LUT TAWAR` / `Lut Tawar` / `LAUT TAWAR` / `Laut Tawar`), dan
`AGENTS.md:145` mengklaim masalah ini sudah selesai.

### 🟠 Bukti mentah Q1 — kenapa "data bercerita" belum terjadi

```
columns: ['Indikator / Area', 'Nilai', 'Satuan', 'Sumber']   _multiSource: true
  ["SILIH NARA", "100", "", "Dokumen B — Dinas Kesehatan"]   ← cacahan, Satuan kosong
  … 14 baris kecamatan …
  ["Prevalensi Stunting (Pendek dam Sangat Pendek)", "4,9", "Persen", "SAPA Aceh Tengah"]  ← persen
```

Satu kolom `Nilai` mencampur **cacahan** dan **persen**; tanpa penyebut; diminta tren 5 tahun
diberi satu titik; `654` tidak direkonsiliasi dengan `4,9 %`; nama indikator salah ketik ikut
tersaji; dan narasi menulis *"tidak ada data per-orang (UU PDP)"* padahal sumbernya
`STUNTING BY NIK.xlsx`.

### 🟠 Angka indikator tidak stabil

```
13:40 UTC   /api/stats 1790   vs   /api/report "1.810 indikator unik"   (selisih 20)
06:04 UTC   /api/stats 1793   vs   /api/report "1.805 indikator unik"   (selisih 12)
```

Keduanya bergeser karena dihitung ulang dari SAPA live — jadi tidak ada angka indikator yang stabil
untuk dirujuk. Inilah sebabnya Q14 pernah dijawab **38 OPD** lalu **5 OPD** untuk pertanyaan sama.

### 🔻 Empat klaim saya sendiri yang salah, dan bagaimana ketahuan

| Klaim saya | Yang benar | Ketahuan dari |
|---|---|---|
| "parser rusak salah 9 dari 9" | **7 dari 9** (`"16000"`, `"0"` kebetulan benar) | test gagal: `expected 7 to be 9` |
| "`parseNumericId("Rp 1.250.000") === 1250000`" | mengembalikan **`null`** | test gagal: `expected null to be 1250000` |
| "daftar kecamatan 15 entri termasuk `Takengon`" | **14**; `Takengon` konstanta terpisah untuk titik tengah peta | `npx tsx` meng-impor modulnya |
| "checker gagal mendeteksi `LAUT TAWAR`" | `"LUT TAWAR"` **sudah** terdeteksi; hanya `"LAUT TAWAR"` yang lolos (sudah diperbaiki) | membaca ulang `rows` Q1 |

Empat-empatnya tersembunyi di balik kalimat yang terdengar pasti. Yang membongkarnya bukan membaca
ulang, tapi **menjalankan**.

### Yang justru benar (teruji, bukan diduga)

`DTSEN_NIK_KEY` **fail-closed** (503 bila kunci hilang atau `< 16` char) · algoritma AES-256-GCM ·
matematika `hitungStdDev`/tren/persen Bapokting · berkas `.bak` **tidak** menyimpan rahasia
(`grep` → 0) dan versi `v3` identik kecuali 1 baris import · `golden-queries.json` konsisten
(86 entri, `id` unik, `_meta.jumlah` cocok).

---

## Yang berubah pada putaran kelima (31 Agu 13:45 UTC) — tiga branch diperiksa

Ketiga branch bergerak sekaligus, dan **saling menyimpang**:

| Branch | HEAD | Waktu | Relasi ke `main` |
|---|---|---|---|
| `main` | `d86bdad` | 30 Agu 16:05 | 16 commit; 3 commit baru **nol perubahan `src/`** (docs saja) |
| `hotfix/meeting-ready` | `14cfb19` | **31 Agu 18:52** | **`main` + 23** — fitur **Bapokting** (20 commit) |
| `feat/ai-executive-answer-v3` | `1dd5ed7` | 30 Agu 16:06 | **`main` + 13** — executive UI |

Produksi **tetap kode `e07edae`**: `/api/bapokting` → **404** (hanya di `hotfix`),
`/api/ews` → **404** (hanya di `v3`).

### ✅ Kabar baik terbesar: mesin statistik sungguhan sudah ditulis — di `hotfix`

Ini **membatalkan sebagian diagnosis saya**. `src/lib/bapokting-stats.ts` (**322 baris**, baru,
hanya di `hotfix`) benar-benar menghitung: simpangan baku **sampel** (pembagi `n−1`), perubahan
persen, tren rata-rata 7 hari terakhir vs 7 hari sebelumnya dengan ambang ±2 %, indeks volatilitas,
agregasi per kategori & kecamatan. Dan `generateAiNarrative()` menyusun narasi **tanpa LLM**:
peringkat top-5 termahal/termurah, daftar harga naik/turun, rekomendasi — semua diturunkan dari
angka yang baru dihitung. Commit `6d03935` menamainya *"jalur deterministik harga komoditas tanpa
LLM"*. **Itu persis pola yang brief ini minta** (aturan A4) → jadikan titik tolak WP3.

Empat cacat menyertainya: **nol test** untuk mesin statistiknya (`bapokting-viz.test.ts` hanya
menguji `buildVizFromEvidence`) · **error tipe** `bapokting-stats.ts:156` (`'stabil'` tidak cocok
dengan `'naik' | 'turun'`) · menambah **pendek-sirkuit kata kunci ketiga**
(`ai-orchestrator.ts:332`: `priceKeywords = /harga|prix|market|commodity|komoditas|sayur|buah|pangan|bahan pokok/i`
— pola yang sama dengan akar Q1/Q2/Q4/Q13) · menambah **salinan ketiga parser angka rusak**
(`grounding.ts:247`).

**Dua paruh solusi kini terpisah di dua branch:** parser angka yang **benar** (`parseNumericId`)
hanya ada di `v3`; mesin statistik hanya ada di `hotfix`. Parser rusak
`replace(/[^\d.-]/g,'')` ada **2** salinan di `main`, **3** di `hotfix`, **2** di `v3`.

### ⚠️ Jebakan yang hampir menipu saya: `tsc` di `hotfix` melaporkan **1 error**

```
$ rm -rf .next && npx tsc --noEmit
scripts/debug-bapokting.ts(95,13): error TS1005: ',' expected.      # ← galat sintaks
$ npx tsc --noEmit 2>&1 | grep -c "error TS"
1
```

`tsc` **berhenti memeriksa** setelah galat sintaks, sehingga 25 error lain tersembunyi. Saya
benahi satu tanda kurung itu secara lokal (baris 94: `.flat()))]` → `.flat())]`) dan hitungannya
jadi **26**. Berkas sudah dikembalikan (`git status --porcelain` → kosong).

**Dua aturan metode baru:** (1) `npx tsc --noEmit 2>&1 | grep -c "error TS1"` harus **0** lebih
dulu, kalau tidak hitungannya tidak berarti; (2) **`rm -rf .next`** sebelum `tsc` bila baru pindah
branch — `.next/types/validator.ts` masuk `include` tsconfig dan sempat memberi saya error hantu
`Cannot find module '…/api/bapokting/route.js'` saat memeriksa `main`.

### 🔻 Gerbang mutu ketiga branch (`.next` dibersihkan dulu)

| Gerbang | `main` `d86bdad` | `hotfix` `14cfb19` | `v3` `1dd5ed7` |
|---|---|---|---|
| `vitest` | 5 gagal / 195 lulus (200) | 5 gagal / 197 lulus (202) | 5 gagal / 213 lulus (218) |
| `tsc` apa adanya | 26 | **1** ⚠️ menyesatkan | 32 |
| `tsc` nyata | 26 | **26** | 32 |
| galat sintaks `TS1xxx` | 0 | **1** | 0 |
| `next build` | ✅ | ✅ | ✅ |
| `.bak` | 3 | 3 | **0** ✅ |
| berkas nyasar `~/Desktop/…` | 1 | 1 | 1 |

Kelima test yang gagal **identik di ketiganya** (`faseI.dtsen-gate` 1 + `faseK.dtsen-planner` 4).

### 🔻 Dokumentasi deploy dipindah, bukan dibetulkan

`AGENTS.md` dirampingkan jadi 16.420 byte (identik di 3 branch) dan baris `Deploy state`
**dipindah** ke `docs/STATUS-CC.md` — isinya masih `PROD = 4f95617`, *"main tertinggal 44+ commit"*,
*"Semua 8 branch … hotfix-llm"*. Ketiganya salah dan kini makin salah (kode live `e07edae`;
`hotfix` = `main` + 23, bukan sebaliknya; branch tinggal 6). `AGENTS.md:7` justru menyuruh membaca
berkas itu sebelum deploy.

### Probe putaran 5 **tidak** dijalankan — dan itu disengaja

`/api/query` dibatasi 10/menit dan 60/jam per IP, dan **kode yang melayani produksi tidak berubah
sama sekali** sejak putaran 4 (`git diff --name-only e07edae origin/main -- src/` → **0 berkas**;
fitur `hotfix` belum di-deploy). Menembakkan 14 pertanyaan lagi hanya menghabiskan kuota untuk
mengukur berkas yang identik. Tabel putaran 4 tetap berlaku.

---

## Yang berubah pada putaran keempat (30 Agu 06:05 UTC)

**Produksi tidak bergerak.** `main` masih `e07edae` (29 Agu 16:33). Pekerjaan baru pindah ke
**`feat/ai-executive-answer-v3` @ `946e3f3`** = `main` + 10 commit, 65 berkas berbeda
(+4.161/−358), **tidak terdeploy** — dibuktikan dengan route yang hanya ada di `v3`:
`/api/ews`, `/api/datasets`, `/api/analytics/opd/*` → **404** di produksi.

**✅ Membaik di `v3`:** berkas `.bak` **habis** (3 → 0, route `ews`/`datasets` dihidupkan) ·
**parser angka yang benar sudah ditulis** (`opd-drilldown.ts:35` `parseNumericId`, sudah ada test) ·
test 200 → **218** · ada jalur rollback `NEXT_PUBLIC_AI_EXECUTIVE_UI=false`.

**🔻 Memburuk:** `tsc --noEmit` **26 → 32 error** — 6 di antaranya baru, berasal dari
`scripts/seed.ts` dan tiga route yang baru di-restore dari `.bak`. `next build` tetap hijau,
jadi keduanya lolos lagi ke branch. Test gagal **tidak berkurang** (5, sama persis dengan `main`).

**❌ Tidak disentuh sama sekali:** `dtsen-import.ts` (bug `jiwa == keluarga`) · `pii-gate.sh` ·
`src/lib/sapa-client.ts:433` (parser rusak) · berkas bocor. Semuanya ikut terbawa ke `v3`.

**🔻 Koreksi atas alat ukur saya sendiri.** Putaran 3 saya tandai Q3 dan Q6 "bersih" — itu **salah**.
Pola checker hanya mengenal `evidence`, sedangkan jawaban live menulis **"evidensi"**. Logika cek
kini dipindah ke satu berkas `scripts/cek-jawaban.py`, polanya diperluas, dua cek baru ditambahkan,
lalu **dijalankan ulang atas 14 berkas `.sse` tersimpan** (tanpa menembak situs lagi). Hasilnya:
Q3 → *"MENOLAK padahal agregat per-kecamatan ADA di DTSEN"*, Q6 → *"istilah internal bocor +
menjawab sub-kelompok, bukan total"*. Pelajarannya masuk ke brief: **periksa alatnya sebelum
mempercayai hasil "bersih"**.

---

## Yang berubah pada putaran ketiga (HEAD `e07edae`, 29 Agu ~16:33 WIB)

**✅ Selesai — temuan lama tertutup:** `main` **sudah disinkronkan** dengan branch live.
`git rev-parse origin/main origin/hotfix/meeting-ready` → keduanya **`e07edae`**.

**✅ Selesai — role & BNBA (sebagian besar benar):** `scope=individu` benar **401** tanpa sesi ·
identitas asli dienkripsi at-rest AES-256-GCM (`src/lib/dtsen-crypto.ts`) · hanya `DTSEN_ROOT`
yang `fullIdentitas` · akses diaudit (`BREAKDOWN_INDIVIDU`) · `?scope=xxx` → 400 · tombol 🔐 Login
di blocker & header · enum + `CREATE TYPE` selaras · defleksi NIK di `/api/query` tetap jalan.

**⚠️ Belum menyeluruh (WP0.12a–i):** tanpa batas laju, `scope=individu` bisa diseret seluruhnya
(295 desa × ~7 desil ≈ **1.175 permintaan** = 235.011 nama) · audit ditulis
`.catch(console.error)` sehingga **akses tetap berhasil walau audit gagal** · breakdown agregat
masih **200 publik** tanpa keputusan tercatat · `DTSEN_ROOT` belum punya dasar hukum, masa
berlaku, atau prosedur peninjauan · pesan 401 belum menyebut `DTSEN_ROOT` · narasi publik menulis
*"terenkripsi **HMAC**"* (HMAC = hash satu arah, bukan enkripsi) · `/dashboard/akun` masih 200
tanpa login · NIK dirender langsung di tabel yang bisa digulung.

**🔻 Regresi:** `vitest` **4 → 5 gagal** — `faseI.dtsen-gate.test.ts` rusak karena `DTSEN_ROOT`
ditambah ke `ROLES_PERSONAL` tanpa memperbarui test, dan tetap lolos ke `main`.

**🆕 Riwayat ditulis ulang (force-push):** `main` kini **13 commit**, branch **8 → 6**
(`hotfix/llm-reliability` & `pabrik-aplikasi` dihapus), ukuran repo 32.261 kB → 1.291 kB.
`0f30398`, `016818e`, `f6d7cb2`, `1c5809d` **bukan** lagi leluhur `main`. Konsekuensi nyata,
diukur: dari **29** hash commit unik yang dirujuk `docs/*.md` + `AGENTS.md`, **22 yatim**
(mis. `794b80a` dirujuk 36×, `d1228c6` 11×) dan **3 sudah hilang total**.

**❌ Tetap rusak:** bug data P0 **`jiwa == keluarga`** bertahan **setelah impor ulang 235.011
baris** (rilis dipublikasikan ulang `2026-08-29T08:57:31Z`). Diverifikasi ulang barusan:
`total 222643`, **14/14** kecamatan `jiwa == keluarga`, Bebesen `39449/39449`. Akar tidak berubah:
`dtsen-import.ts:205` memakai `individu:<hash>` sebagai proxy keluarga saat kolom `no_kk` absen
(`:153` tidak mewajibkannya). Angka benar ada di sumber yang sama: **71.370 keluarga / 234.740
jiwa** — DB menggelembungkan jumlah keluarga **3,1×**.

**❌ Tetap rusak:** pipeline AI tidak berubah sedikit pun di empat putaran — 3 pertanyaan "persen"
masih nol persen · 5 pertanyaan analisis masih dibajak jalur Dokumen · 14 kolom `Satuan` kosong ·
stunting 654/730/4,9 %/31,4 % belum direkonsiliasi · Q5 `dataSource: ""` · Q9 Rupiah vs Hektare ·
istilah internal kini bocor di **Q3 + Q14** · Q6 berbalik lagi ke "kelas menengah 94.754 jiwa"
untuk pertanyaan yang sama dalam satu hari (tidak deterministik).

---

## Tiga temuan struktural yang paling menentukan

1. **Gerbang mutu longgar, dan akibatnya sudah nyata.** `vitest` 5 gagal + `tsc` 26 error lolos ke
   `main`; `pii-gate.sh` tidak memindai `docs/` sehingga password & NIK lolos ke repo publik;
   `AGENTS.md` baris `Deploy state` tidak pernah diperbarui (masih `PROD = 4f95617`, "main
   tertinggal 44+ commit", "Semua 8 branch" — ketiganya salah).
2. **Parser angka yang dipakai agregasi merusak nilai.** `sapa-client.ts:433` mengubah
   `"2.156,28"` → `2.15628`, `"31,4"` → `314`, dan **membuang** `"11.503.360.000.000"` (PDRB)
   serta `"Rp 1.250.000"`. Angka ini yang mengurutkan bukti, menentukan arah tren, dan memilih
   "nilai teratas" — sementara teks ke pengguna memakai string mentah yang benar.
3. **Routing mematikan analisis.** `detectExcelDocQuery` (bobot `1000 + panjang kata`) dieksekusi
   sebelum jalur tren/perbandingan, sehingga lima pertanyaan analisis dibajak menjadi dump tabel
   Excel. Diuji ulang via `tsx` di branch live — hasil identik di empat putaran.

---

## Cara menjalankan Hermes

Salin blok di **bagian 9 `HERMES-INSTRUCTION.md`** sebagai pesan pembuka, lalu pastikan
keempat berkas paket ini ada di workspace agent:

```
hermes-brief/
├── HERMES-INSTRUCTION.md
├── AUDIT-LIVE-2026-08-29.md
├── data/golden-queries.json
└── scripts/probe-live.sh
```

Urutan wajib: **WP0.00** (cabut kredensial + PII, bersihkan riwayat, perluas gate) → **WP0.0**
(hotfix `jiwa == keluarga`, deploy terpisah) → **WP0.12** (role/BNBA menyeluruh) → WP0.1–WP0.11 →
WP1 → WP7. Setiap klaim "selesai" harus disertai keluaran perintah yang benar-benar dijalankan.

---

## Ambang kelulusan (ringkas)

Kolom terakhir = probe putaran 4 (30 Agu 05:51 UTC), diperiksa dengan `cek-jawaban.py` yang sudah diperbaiki.

| Metrik | 28 Agu | 29 Agu 07:49 | 29 Agu 15:17 | **30 Agu 05:51** | Target |
|---|---|---|---|---|---|
| Kredensial/PII ter-commit | belum diperiksa | belum ada | ADA (1 branch) | **ADA di 2 branch** | 0 |
| `main` == branch yang live | ✗ (jarak 5) | ✗ (jarak 8) | ✅ `e07edae` | ✅ `e07edae` | ✅ jaga |
| Branch kerja menyimpang dari `main` | — | — | 0 | **10 commit / 65 berkas** | keputusan tertulis |
| `scope=individu` tanpa sesi | n/a | n/a | ✅ 401 | ✅ 401 | ✅ jaga |
| Batas laju `scope=individu` | n/a | n/a | ✗ tidak ada | ✗ tidak ada (`take: 200`) | ada, teruji |
| Audit gagal → akses ditolak | n/a | n/a | ✗ fail-open | ✗ fail-open | fail-closed |
| `vitest` / `tsc --noEmit` | 4 gagal / 29 | 4 gagal / 26 | 5 gagal / 26 | **5 gagal / 26 (`main`) · 5 gagal / 32 (`v3`)** | 0 / 0 |
| `next build` | ✅ | ✅ | ✅ | ✅ keduanya | ✅ |
| Berkas `.bak` | 8 | 3 | 3 | **0 di `v3`** ✅ | 0 |
| Akurasi routing arketipe (75 golden) | ~23% | ~23% | ~23% | ~23% | ≥95% |
| Pertanyaan "persen" menghasilkan persen | 0 dari 3 | 0 dari 3 | 0 dari 3 | **0 dari 3** | 3 dari 3 |
| `jiwa == keluarga` di rilis DTSEN | belum terdeteksi | 14 dari 14 | 14 dari 14 | **14 dari 14** | 0 |
| Tabel campur satuan dalam satu kolom | Q1, Q10, Q11 | Q1, Q4, Q13 | Q1, Q4, Q13 | Q1, Q4, Q13 | 0 |
| Kolom `Satuan` kosong | 14 baris | 14 baris | 14 baris | **14 baris (4 pertanyaan)** | 0 |
| Konflik sumber tanpa rekonsiliasi | 2 kasus | 4 kasus | 4 kasus | 4 kasus | 0 |
| Query menggantung tanpa hasil | Q7 (>175 dtk) | 0 ✅ | 0 ✅ | 0 ✅ | 0 (batas 45 dtk) |
| Narasi memakai istilah internal | — | Q14 | Q3 + Q14 *(checker sempit)* | **Q6 + Q14** | 0 |
| Rekomendasi kosong / boilerplate | — | — | 0 / 1 | **3 kosong + 1 boilerplate** | 0 / 0 |
| `dataSource` kosong | Q5 | Q5 | Q5 | Q5 | 0 |
| Menolak padahal datanya ada | Q3 | Q3 | Q3 | Q3 *(kini terdeteksi checker)* | 0 |
| Data demo disajikan sebagai live | ada | 0 ✅ | 0 ✅ | 0 ✅ | 0 |
| `/dashboard/akun` tanpa login | 200 | 200 | 200 | **200** | 307 → `/login` |

---

## Catatan kejujuran

Tidak dapat diverifikasi dari lingkungan ini: isi Supabase (angka 222.643 berasal dari endpoint
publik, bukan query DB langsung) dan `/api/dtsen/status` (401, butuh role DTSEN). Kasus S2–S4
(matriks role dengan sesi nyata) **belum diuji** — butuh akun, jadi saya tandai
`"belum diuji (butuh sesi)"` di JSON, bukan saya klaim lulus.

**Dua kesalahan saya sendiri yang perlu Anda ketahui.** *Pertama*, pada putaran 3 saya menandai
Q3 dan Q6 "bersih" — itu salah — pola checker saya hanya mengenal `evidence`, sedangkan jawaban live menulis
`evidensi`. Kedua cacat itu nyata dan kini terdeteksi. Sebagian variasi antar-putaran
(Q3/Q6 kadang lolos, rekomendasi kadang kosong kadang boilerplate) adalah **non-determinisme LLM**,
bukan perbaikan; karena itu yang saya pegang sebagai fakta adalah cacat yang muncul di **semua**
putaran.

*Kedua*, sampai 30 Agu saya menulis **"tidak ada satu pun fungsi statistik di basis kode"**.
Sejak 31 Agu itu **tidak lagi benar** untuk `hotfix/meeting-ready` — lihat bagian putaran kelima.
Yang tetap benar: tidak ada lapisan statistik **umum**, dan mesin yang ada itu nol test serta
ber-error tipe. Saya juga nyaris menyimpulkan `hotfix` "jauh lebih sehat" dari `main` karena
`tsc`-nya melaporkan 1 error; angka itu artefak galat sintaks.

Semua angka lain di paket ini berasal dari perintah yang benar-benar dijalankan pada 28–30 Agustus
2026; daftar lengkapnya ada di `AUDIT-LIVE-2026-08-29.md` bagian 11.
