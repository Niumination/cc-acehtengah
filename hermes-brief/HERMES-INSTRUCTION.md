# INSTRUKSI KERJA — HERMES AGENT
## Penyempurnaan SAPA Smart AI Aceh Tengah: routing statistik + "data bercerita"

**Target repo:** `https://github.com/niumination/cc-acehtengah`
**Target live:** `https://cc-acehtengah.vercel.app`
**Branch kerja wajib:** berangkat dari **`hotfix/meeting-ready`** (yang live), **bukan** `main`
**Disusun:** 28 Agustus 2026 · **Rev 1:** 29 Agu 07:49 UTC · **Rev 2:** 29 Agu 15:17 UTC · **Rev 3:** 30 Agu 06:05 UTC · **Rev 4:** 31 Agu 13:45 UTC · **Rev 5:** 31 Agu 2026 **14:20 UTC** (audit mendalam)
**Dasar:** enam putaran pemeriksaan; **73 test audit yang semuanya lulus** (`hermes-brief/audit-tests/`) + bukti lapangan (`AUDIT-LIVE-2026-08-29.md` bagian 0000–11)

> **Status revisi 5 (31 Agu 14:20 UTC) — audit mendalam: kode dijalankan, bukan dibaca.**
>
> Saya menulis **73 test** yang memanggil fungsi produksi dengan data sintetis. Semuanya lulus,
> jadi setiap klaim di bawah **terbukti**. Jalankan ulang:
> `cp -r hermes-brief/audit-tests/*.test.ts src/__audit/ && npx vitest run src/__audit/`
>
> **Empat temuan baru yang paling penting:**
> 1. **Bug `jiwa == keluarga` direproduksi** dengan fungsi produksi (5 jiwa / **2** KK benar →
>    5 jiwa / **5** "keluarga" saat `no_kk` hilang, kosong, **atau** 15 digit) — **dan dikunci oleh
>    test yang sudah ada**: `faseJ.dtsen-impor.test.ts:97` *"keluargaId fallback deterministik saat
>    no_kk kosong"* meng-assert perilaku proxy itu sebagai hal yang diharapkan. Memperbaiki baris 205
>    akan membuat test itu merah. **Perbaikan wajib mengubah test itu juga.**
> 2. **Kripto: algoritmanya benar, validasi kuncinya berlubang.** `dataKey()` memakai
>    `b.length >= 32` padahal AES-256 menuntut **tepat** 32. Kunci 33–47 byte lolos gerbang lalu
>    **melempar** `RangeError: Invalid key length` — termasuk **64-char hex**, bentuk paling wajar
>    untuk kunci 256-bit. `encryptField` tidak punya try/catch. Perbaikannya satu karakter: `=== 32`.
> 3. **Mesin statistik Bapokting cacat di penyajian, bukan di matematika.** `hitungStdDev` benar
>    (pembagi `n−1`), tren benar dengan 14 titik. Tapi: tren **diam-diam "stabil"** bila titik < 14
>    tanpa tanda apa pun; satu komoditas disebut **"paling fluktuatif" DAN "paling stabil"** dengan
>    CV identik; `overallIndex` = **`NaN`** saat data kosong; `hargaAvg` kategori = **rata-rata dari
>    rata-rata** (20.000 vs tertimbang 12.500 — selisih 60%).
> 4. **Normalisasi kecamatan punya tiga jalur dan peta alias berisi SATU entri**
>    (`KEC_ALIAS = { 'lut tawar': 'Laut Tawar' }`), dan `kecLookup` hanya dipanggil dari
>    `dtsen-multisource.ts` — 0 kali dari `dtsen-planner`, `grounding`, `ai-orchestrator`,
>    `sapa-client`. `AGENTS.md:145` mengklaim masalah ini sudah selesai.
>
> **Empat klaim saya sendiri ternyata salah** dan sudah dikoreksi (lihat §0000.9 di AUDIT):
> parser rusak salah **7 dari 9** kasus (bukan 9 dari 9) · `parseNumericId("Rp 1.250.000")`
> mengembalikan **`null`**, bukan `1250000` · daftar kecamatan berisi **14** entri, bukan 15
> (`Takengon` adalah konstanta terpisah untuk titik tengah peta) · checker saya **sudah**
> mendeteksi `"LUT TAWAR"`, yang lolos hanya `"LAUT TAWAR"` (sudah diperbaiki).
>
> **Status revisi 4 (31 Agu 13:45 UTC) — dua koreksi atas brief ini sendiri.**
>
> **(a) Saya salah bilang "tidak ada satu pun fungsi statistik".** Itu tidak lagi benar di
> `hotfix/meeting-ready`: ada `src/lib/bapokting-stats.ts` (**322 baris**) yang benar-benar
> menghitung simpangan baku sampel, perubahan persen, tren 7-hari-vs-7-hari dengan ambang ±2 %,
> indeks volatilitas, dan agregasi per kategori/kecamatan — plus `generateAiNarrative()` yang
> menyusun narasi **tanpa LLM**. **Gunakan itu sebagai titik tolak WP3, jangan menulis dari nol.**
> Yang tetap benar: tidak ada lapisan statistik **umum** (tidak ada `src/lib/statistics/`), dan
> mesin itu **nol test** serta **punya error tipe** di baris 156.
>
> **(b) `tsc` di `hotfix` melaporkan 1 error — angka itu menyesatkan.** Ada galat sintaks
> (`scripts/debug-bapokting.ts:95` `TS1005`) yang membuat `tsc` berhenti memeriksa; setelah saya
> benahi satu tanda kurung itu secara lokal, hitungannya jadi **26**. Sejak sekarang: jalankan
> `npx tsc --noEmit 2>&1 | grep -c "error TS1"` lebih dulu, dan **`rm -rf .next`** sebelum `tsc`
> bila baru pindah branch (`.next/types/validator.ts` ikut terperiksa dan bisa menghasilkan
> error hantu).
>
> **Posisi tiga branch:** `main` `d86bdad` (3 commit baru, **nol perubahan `src/`**) ·
> `hotfix/meeting-ready` `14cfb19` = `main` + 23 (fitur Bapokting, 31 Agu 18:52) ·
> `v3` `1dd5ed7` = `main` + 13. `hotfix` dan `v3` **saling menyimpang**. Produksi tetap kode
> `e07edae` (`/api/bapokting` → 404). Kebocoran password + NIK kini ada di **tiga** branch.
>
> **Status revisi 3 (30 Agu 06:05 UTC).** Produksi **tidak bergerak** — `main` masih `e07edae`.
> Pekerjaan baru pindah ke `feat/ai-executive-answer-v3` @ `946e3f3` (= `main` + 10 commit, tidak
> terdeploy). Isinya **lapisan presentasi, bukan lapisan statistik**: `git ls-tree … | grep -i statistic`
> → kosong, dan `zScore`/`growthRate`/`shareOf`/`percentRate` → **0** kemunculan. Kebocoran
> kredensial, bug `jiwa == keluarga`, dan parser rusak **ikut terbawa ke `v3` apa adanya**.
> Kabar baiknya: `v3` justru menulis **parser angka yang benar** (`opd-drilldown.ts:35`) dan
> **menghabiskan berkas `.bak`** — keduanya bisa langsung dipakai. Lihat **WP0.13** dan **WP1.2**.
>
> **Status revisi 2 — ada satu hal yang harus dikerjakan sebelum apa pun.**
>
> 🔴 **Password akun `DTSEN_ROOT` dan satu NIK asli 16 digit ter-commit di `origin/main`**, di
> `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` baris 28 dan 52 (repo publik). `DTSEN_ROOT` adalah
> satu-satunya role yang bisa mendekripsi **nama asli + NIK 235.011 orang**. Kerjakan **WP0.00**
> lebih dulu — cabut kredensial, hapus dari riwayat, perbaiki `pii-gate.sh`.
>
> Selain itu: `main` **sudah disinkronkan** ke branch live (`e07edae`, riwayat ditulis ulang jadi
> 13 commit, branch 8 → 6) — temuan lama "yang live bukan `main`" selesai. Role & BNBA ditambah
> (`scope=individu` benar 401, enkripsi AES-256-GCM, audit trail) tetapi **belum menyeluruh** —
> lihat WP0.12. Dan pipeline AI **tidak berubah sedikit pun** di empat putaran uji: 3 pertanyaan
> "persen" masih menghasilkan nol angka persen.

---

## 0. Baca ini dulu

Keluhan pengguna: *"output AI masih belum sempurna, masih memerlukan routing pengolahan data yang pas sesuai ilmu statistik, agar bisa menghasilkan 'data berbicara / data bercerita'."*

> ### 🛑 Sebelum membaca apa pun yang lain
> **Ada password dan NIK warga ter-commit di HEAD `origin/main` yang publik.** `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` baris 52 memuat `dtsen_root` / `cPtnkHE7NYD3Gg_s`, dan baris 28 memuat nama asli + NIK 16 digit seorang warga. `DTSEN_ROOT` adalah satu-satunya role yang bisa mendekripsi nama asli + NIK **235.011 orang**. `scripts/pii-gate.sh` lolos karena ia hanya memindai `src/data/excel`.
>
> **Kerjakan `WP0.00` sebelum paket kerja lain apa pun** — cabut kredensial, bersihkan riwayat, perluas gate. Seluruh dokumen ini tentang kualitas jawaban AI; kebocoran ini lebih mendesak dari semua itu.

Diagnosis lapangan menyimpulkan ini **bukan** masalah model LLM. Model hanya diberi tiga tugas (narasi ≤3 kalimat, rekomendasi, pilih tipe visualisasi) dan sudah mengerjakannya. Yang rusak adalah **semua yang terjadi sebelum LLM dipanggil**:

1. **Routing** — pertanyaan tidak diklasifikasikan; yang ada rantai pendek-sirkuit berbasis substring sehingga jalur analisis mati total.
2. **Semantik** — sistem tidak tahu bedanya cacahan, persen, indeks, dan rupiah; tidak tahu penyebut; tidak tahu periode.
3. **Komputasi** — tidak ada satu pun fungsi statistik (rate, share, growth, rank, z-score, correlation).
4. **Rekonsiliasi** — sumber ganda ditumpuk, tidak didamaikan.

**Konsekuensi untuk Anda:** jangan mulai dari prompt engineering. Mulai dari WP0–WP3. Mengganti model atau memperpanjang prompt **tidak akan** memperbaiki satu pun dari 14 kegagalan terdokumentasi.

### Aturan yang tidak boleh dilanggar

| # | Aturan | Alasan |
|---|---|---|
| A1 | **Tidak ada angka yang tidak bersumber.** Setiap angka di `narasi`, `rekomendasi`, dan `visualisasi` harus dapat ditelusuri ke `Metric.provenance`. | Sudah ada (`grounding.ts`) — jangan dilemahkan |
| A2 | **Tidak ada PII.** NIK, nama per-orang, alamat, tanggal lahir tidak pernah masuk response, log, atau commit — **termasuk `docs/`**, yang selama ini tidak dipindai gate dan justru jadi tempat kebocoran 29 Agu. Jalankan `scripts/pii-gate.sh` (yang sudah diperluas) sebelum **setiap** commit, bukan hanya commit data. | UU 27/2022 ps. 20; gerbang ini terbukti buta terhadap `docs/` |
| A8 | **Audit gagal = akses ditolak (fail-closed).** Menulis audit lalu melanjutkan meski penulisannya gagal berarti ada akses data pribadi yang tidak tercatat. | Prinsip repo sendiri: *"Setiap akses restricted — izinkan atau tolak — diaudit"* |
| A9 | **Jangan pernah menulis istilah teknis perlindungan data yang salah di kalimat publik.** `"terenkripsi HMAC"` sudah ada di produksi dan itu salah — HMAC adalah hash satu arah. | Klaim keamanan yang salah adalah risiko hukum |
| A3 | **Lebih baik "tidak tersedia + alasan + alternatif" daripada angka karangan.** | Sudah jadi prinsip repo, pertahankan |
| A4 | **Jalur deterministik dulu, LLM terakhir.** LLM hanya untuk **gaya bahasa**, tidak pernah untuk angka, perhitungan, atau simpulan. | Menjamin reprodusibilitas |
| A5 | **Jangan menghapus mekanisme yang sudah benar**: `groundOutput`, `buildVizFromEvidence`, `formatAngkaPresentasi`, k-anonimitas `k≥5`, audit trail DTSEN, defleksi NIK, **dan yang baru: gerbang `scope=individu` (401), `encryptField`/`decryptField` AES-256-GCM, `fullIdentitas` khusus `DTSEN_ROOT`**. | Ini aset |
| A6 | **Setiap perubahan disertai test.** Tidak ada PR tanpa test yang gagal sebelum perubahan dan lulus sesudahnya. **Tambahkan role baru ke daftar test juga** — `DTSEN_ROOT` baru saja membuat `faseI.dtsen-gate.test.ts` gagal dan lolos ke `main`. | 26 error `tsc` + 5 test gagal lolos ke `main` karena gerbangnya longgar |
| A7 | **Satu konsep, satu fungsi.** Parser angka, normalisasi wilayah, normalisasi satuan masing-masing **satu** implementasi di `src/lib/statistics/`, dipanggil dari mana pun. | Sekarang ada 3 parser angka berbeda, satu di antaranya rusak |

---

## 1. Fakta dasar (terverifikasi 29 Agu 2026 — jangan diasumsikan ulang, tapi verifikasi sebelum mengubah)

Semua nilai di bawah diverifikasi ulang **29 Agu 2026 07:49 UTC**. Verifikasi lagi sebelum mengubah — repo ini bergerak cepat (3 commit dalam 12 jam).

| Hal | Nilai |
|---|---|
| Yang live di Vercel | kode **`e07edae`** (29 Agu 16:33). Bukti: `/api/bapokting` → **404** (hanya di `hotfix`), `/api/ews` `/api/datasets` `/api/analytics/opd/*` → **404** (hanya di `v3`) |
| `main` | **`d86bdad`** (30 Agu 16:05), 16 commit. 3 commit baru sejak `e07edae` **hanya dokumentasi** — `git diff --name-only e07edae origin/main -- src/` → **0 berkas** |
| `hotfix/meeting-ready` | **`14cfb19`** (31 Agu 18:52) = `main` + **23** (`hotfix..main = 0`). Isi: fitur **Bapokting** (20 commit) + 5 docs OpenCode Go |
| `feat/ai-executive-answer-v3` | **`1dd5ed7`** (30 Agu 16:06) = `main` + **13**. **Saling menyimpang** dengan `hotfix` — tidak ada yang memuat yang lain |
| Riwayat | **Ditulis ulang (force-push).** `git rev-list --count origin/main` = **13** (HEAD `e07edae`); `0f30398`, `016818e`, `f6d7cb2`, `1c5809d` **bukan** leluhur `main`. Akibatnya dokumentasi repo jadi tidak tertelusur: dari **29** hash unik yang dirujuk `docs/*.md` + `AGENTS.md`, **22 yatim** (ada sebagai objek tapi bukan leluhur `main`, mis. `794b80a` dirujuk 36×, `d1228c6` 11×) dan **3 sudah hilang total** dari repo |
| Branch | **6** (dari 8) — `hotfix/llm-reliability` & `pabrik-aplikasi` dihapus |
| `AGENTS.md` | `Last update` sudah benar (DTSEN_ROOT), tetapi baris `Deploy state` **tidak disentuh**: masih `PROD = 4f95617`, `"main tertinggal 44+ commit"`, `"Semua 8 branch"` — ketiganya salah |
| Konfigurasi AI live | `AI_BASE_URL=https://api.hcnsec.cn/v1`, `AI_MODEL=auto` (resolve → `agnes-2.5-flash`), `max_tokens 2500`, retry 3× |
| Data SAPA | 2.032 record · 38 OPD · 1.793 indikator (`/api/report` menyebut 1.805 — tidak direkonsiliasi) |
| Kualitas SAPA | 59,8% bertahun · **816 record (40,2%) tanpa tahun** · **32 indikator multi-tahun** · 148 nilai nol · 9 OPD tanpa tahun |
| Warehouse | `perubahan.tersedia: false` — snapshot **belum pernah dibuat** |
| DTSEN | SPLP API **401**. Urutan sumber kini: SPLP → **DB rilis PUBLISHED** → `dtsen-agregat-bappeda.json` → ~~demo~~ (demo **sudah dihapus**) |
| DTSEN — angka saling bertentangan | DB: **222.643 jiwa = 222.643 "keluarga"** ❌ · JSON: **71.370 KK / 234.740 jiwa** · tabel desil JSON: **67.702 KK / 227.385 jiwa** |
| PBI — dua angka | DB `breakdown?program=pbi`: **169.891 jiwa** · JSON `bansos_per_kecamatan`: **216.322 jiwa** (92% populasi) |
| Gerbang mutu (31 Agu, `.next` dibersihkan dulu) | `main`: vitest **5 gagal/195 lulus (200)**, tsc **26**, build ✅ · `hotfix`: vitest **5 gagal/197 lulus (202)**, tsc **1 ⚠️ menyesatkan → 26 nyata**, build ✅ · `v3`: vitest **5 gagal/213 lulus (218)**, tsc **32**, build ✅. Kelima test gagal **identik di ketiganya** |
| Mesin statistik | **Sudah ada satu domain** di `hotfix`: `src/lib/bapokting-stats.ts` (322 baris) — stdDev sampel, persen perubahan, tren 7-vs-7 hari (±2 %), volatilitas. **Nol test**, error tipe di baris 156, hanya untuk harga komoditas |
| Parser angka rusak | `replace(/[^\d.-]/g,'')` — **2 salinan** di `main`, **3** di `hotfix` (baru: `grounding.ts:247`), **2** di `v3`. Parser benar (`parseNumericId`) **hanya ada di `v3`** |
| Dokumen deploy | `AGENTS.md` dirampingkan jadi 16.420 byte (identik di 3 branch); baris `Deploy state` **dipindah** ke `docs/STATUS-CC.md` — dan **tetap salah**: masih `PROD = 4f95617`, `"main tertinggal 44+ commit"`, `"Semua 8 branch … hotfix-llm"`. `AGENTS.md:7` menyuruh membaca berkas itu sebelum deploy |
| Role | `ADMIN`, `SUPERADMIN`, `DTSEN_ANALYST`, `DTSEN_LOOKUP`, **`DTSEN_ROOT`** (baru, tertinggi — bisa dekripsi nama asli + NIK) |
| Kebocoran | 🔴 **password `dtsen_root` + satu NIK asli 16 digit ter-commit** di `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` (HEAD `origin/main`) |
| Route mati | **3** berkas `.bak` di branch live (`datasets`, `datasets/[slug]`, `ews`) — 5 route DTSEN sudah hidup. `/api/ews` 404 padahal `EwsPanel.tsx:18` masih memanggilnya |
| Endpoint baru | `GET /api/dtsen/breakdown?scope=kecamatan\|desa\|desil[&program=pbi]` — **publik, tanpa auth** (200). `/api/dtsen/status` — 401 tanpa role DTSEN |
| Halaman baru | `/dashboard/status` (200), `/dashboard/akun` (200 **tanpa login** — `/dashboard/laporan` benar 307) |

---

## 2. Bukti kegagalan (14 pertanyaan live, diuji ulang 29 Agu 2026)

Rincian lengkap + output mentah: `AUDIT-LIVE-2026-08-29.md` bagian 9. Kolom **Δ** = perubahan sejak 28 Agu.

| # | Pertanyaan | Yang terjadi (29 Agu) | Δ | Kelas cacat |
|---|---|---|---|---|
| Q1 | prevalensi stunting + tren 5 tahun | tren hilang; tabel campur cacahan & persen; 14 baris berkolom Satuan kosong; 654 vs 730 vs 4,9% vs 31,4% tidak didamaikan | tetap | routing, satuan, rekonsiliasi |
| Q2 | tren jumlah siswa SD 3 tahun | dibajak Dokumen A → tabel bantuan siswa miskin | tetap | routing |
| Q3 | kemiskinan antar kecamatan | template daftar indikator rupiah kabupaten; **tidak lagi mengakui** permintaan per-kecamatan tak terjawab | **🔻 memburuk** | retrieval, grounding |
| Q4 | hubungan kemiskinan–stunting | daftar indikator acak, tanpa analisis | tetap | routing, statistik |
| Q5 | OPD capaian terendah 2025 | `"tidak ditemukan di  untuk tahun 2025"` (sumber kosong) | tetap | template, routing |
| Q6 | jumlah penduduk 2025 | dijawab 8 indikator *"pemeriksaan kesehatan gratis 60,5 Persen"*, *"aktivitas fisik cukup 21,4 persen"* — **nol** angka penduduk | **🔻 memburuk** | retrieval, semantik |
| Q7 | produksi kopi arabika | **5 detik**, jawaban benar + rekomendasi substantif | **✅ membaik** | — |
| Q8 | tren IPM | jujur "1 titik tahun", tapi tanpa alternatif & tanpa warehouse | tetap | statistik |
| Q9 | bandingkan Dinkes vs Perkebunan | "perbandingan" = jumlah indikator; rupiah vs hektare disandingkan | tetap | statistik, satuan |
| Q10 | **persen** keluarga desil 1 per kecamatan | diberi **cacahan**; **`33.693 jiwa dalam 33.693 keluarga`**; 8 dari 14 kecamatan tanpa keterangan | tetap + bug baru | statistik, **data** |
| Q11 | keluarga di Bebesen | label desa **sudah diperbaiki** ✅; tapi `39.449 jiwa = 39.449 keluarga` di setiap desil; 39.449 ≠ 43.070 (JSON) tanpa rekonsiliasi | campuran | **data**, rekonsiliasi |
| Q12 | **persen** desil 1 dari total | **identik kata per kata** dengan Q10 | tetap | statistik, cache |
| Q13 | **persen** stunting per kecamatan | persen tidak dihitung; `730` dobel; `LUT TAWAR` belum dinormalisasi | tetap | statistik, dedupe, normalisasi |
| Q14 | berapa OPD yang melaporkan | angka benar (38 OPD) akhirnya muncul, tapi lewat *"tersedia **19 bukti pelaporan data** dari **5 OPD** berbeda"* — istilah internal `evidence` bocor & menyesatkan | **🔻 berubah bentuk** | narasi, meta-routing |

**Pola yang harus Anda hapus:** kata *"persen"* muncul di 3 pertanyaan dan **tidak satu pun** menghasilkan angka persen — dua putaran pemeriksaan, hasil sama. Itu satu baris diagnosis: **sistem tidak punya operator pembagian.** Endpoint `breakdown` yang baru pun hanya `groupBy` + `sum`, tanpa satu pembagian.

### 2.1 Bug data P0 — `jiwa == keluarga` di seluruh rilis DTSEN

Ditemukan pada pemeriksaan ulang. Prioritas lebih tinggi dari semua WP di bawah, karena `f71fe50` baru saja menjadikan DB sebagai sumber prioritas.

```
$ curl ".../api/dtsen/breakdown?scope=kecamatan"
total: 222643
[{"nama":"BEBESEN","jiwa":39449,"keluarga":39449},
 {"nama":"SILIH NARA","jiwa":25908,"keluarga":25908}, … 14/14 identik]
```

Akar (`src/services/dtsen-import.ts`):

```ts
// :153  no_kk TIDAK wajib — ekspor BAPPEDA tanpa kolom ini lolos validasi
const missingCols = TEMPLATE_HEADER.filter((h) => h !== 'no_kk' && !header.includes(h));
// :205  fallback: setiap individu jadi satu "keluarga"
keluargaId: /^\d{16}$/.test(noKk) ? `kk:${hmac(noKk, secret)}` : `individu:${nikHash}`
// :239-240  akibatnya jumlahKeluarga === jumlahJiwa
g.jiwa++;
if (r.keluargaId) g.keluarga.add(r.keluargaId);
```

Angka benar ada di sumber yang sama: `dtsen-agregat-bappeda.json` → **71.370 keluarga / 234.740 jiwa** (3,29 jiwa/KK). DB menggelembungkan jumlah keluarga **3,1×**.

**Tindakan (lihat WP0.8):** impor wajib **menolak** berkas tanpa `no_kk`, atau secara eksplisit menandai `jumlahKeluarga = null` + `warning` — **tidak pernah** menyamakan `keluarga` dengan `jiwa`. Rilis yang sudah terpublish harus di-import ulang.


---

## 3. Arsitektur target

```
                    ┌─────────────────────────────────────────────┐
   query ─────────► │ WP2  question-router                        │
                    │  archetypes + needs + entities + period +geo │
                    └───────────────────┬─────────────────────────┘
                                        │ QuestionPlan
                    ┌───────────────────▼─────────────────────────┐
                    │ WP1  semantic layer                         │
                    │  parseNilaiId · normalisasi satuan/wilayah  │
                    │  indicator-registry · MetricFactory         │
                    └───────────────────┬─────────────────────────┘
                                        │ Metric[]  (berdimensi, ber-provenance)
                    ┌───────────────────▼─────────────────────────┐
                    │ WP3  stat engine (murni, teruji)            │
                    │  rate·share·growth·cagr·rank·zscore·         │
                    │  pearson·spearman·iqr·describe               │
                    └───────────────────┬─────────────────────────┘
                                        │ StatResult[]
                    ┌───────────────────▼─────────────────────────┐
                    │ WP4  fusion + reconciliation + plausibility  │
                    └───────────────────┬─────────────────────────┘
                                        │
                    ┌───────────────────▼─────────────────────────┐
                    │ WP5  narrative templates per archetype       │
                    │  angka & simpulan DIBAKU di sini             │
                    │  LLM = opsional, hanya mempercantik kalimat  │
                    └───────────────────┬─────────────────────────┘
                                        │ HybridResponse (+blok baru)
                    ┌───────────────────▼─────────────────────────┐
                    │ grounding.ts (dipertahankan, diperluas)      │
                    └─────────────────────────────────────────────┘
```

**Prinsip kunci:** LLM dipindah dari posisi *penghasil isi* ke posisi *penyunting gaya*. Semua angka, perbandingan, arah tren, peringkat, dan simpulan dihitung di WP3 dan dibakukan di WP5. Bila LLM mati, jawaban tetap benar — hanya lebih kaku.

---

## 4. Paket Kerja

Urutan wajib. **Jangan melompat.** WP0–WP1 adalah fondasi; tanpa itu WP2–WP5 tidak bisa diuji.

---

### WP0 — Kebocoran kredensial, hotfix data, gerbang mutu  *(estimasi: 1,5 hari)*

**Konteks:** ada **kebocoran kredensial + PII di HEAD `main` dan di `v3`** (repo publik); ada **bug data P0** yang sedang tayang (`jiwa == keluarga`); `vitest` 5 gagal; `tsc` 26 error di `main` / **32 di `v3`**; berkas nyasar masih ter-commit.

**Urutan wajib: WP0.00 → WP0.0 → sisanya.** Masing-masing di-PR dan di-deploy terpisah — jangan ditumpuk dengan refactor.

**Kerjakan di `main`, lalu bawa ke `v3` — bukan sebaliknya.** `v3` sudah 65 berkas berbeda dari `main` (+4.161/−358) dan ikut membawa semua cacat ini tanpa perubahan. Memperbaiki di `main` lalu merge/rebase ke `v3` jauh lebih murah daripada memperbaiki dua kali.

**Tugas**

| ID | Tugas | Berkas |
|---|---|---|
| **WP0.00** | **🔴 P0-KEAMANAN — cabut kredensial & PII yang ter-commit.** (a) **Ganti password `dtsen_root` sekarang juga** — password lama `cPtnkHE7NYD3Gg_s` sudah publik, anggap seluruh BNBA 235.011 orang terekspos sampai diganti. (b) **Rotasi `DTSEN_DATA_KEY`** bila ada dugaan ikut tersebar; siapkan prosedur re-enkripsi `namaAsliEnc`/`nikEnc`. (c) Hapus baris 28 & 52 dari `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md`; pindahkan kredensial ke vault saja, rujuk dengan nama variabel tanpa nilai. (d) **Bersihkan riwayat** (`git filter-repo`/BFG) lalu force-push — riwayat saat ini hanya 13 commit, jadi murah; koordinasi dulu karena `main` = produksi. (e) **Perbaiki `scripts/pii-gate.sh`**: kini hanya `os.walk('src/data/excel')` — perluas ke **seluruh tree** (`docs/`, `src/`, root) untuk NIK 16 digit, pola password, dan pola secret (`DTSEN_DATA_KEY`, `sk-`, `Bearer `). (f) Tambah secret-scanning di pre-commit + CI. (g) Tulis satu baris di `docs/ai/`: NIK warga **tidak pernah** dipakai sebagai contoh verifikasi, bahkan termask. | `docs/ai/SESI-2026-08-29-dtsen-root-bnba.md`, `scripts/pii-gate.sh`, `.githooks/pre-commit` |
| **WP0.0** | **P0 — hentikan `jumlahKeluarga === jumlahJiwa`.** (a) `validateDtsenCsv`: jadikan `no_kk` **wajib** untuk format yang memang punya kolom KK; untuk sumber yang tidak punya, set `jumlahKeluarga = null` + `quality.warnings: ['jumlah keluarga tidak tersedia di sumber']` — **jangan pernah** memakai `individu:<hash>` sebagai proxy keluarga. (b) `buildAgregatNarasi`/`buildAgregatAnswer`: bila `totalKeluarga === totalJiwa`, jangan cetak kalimat "X jiwa dalam X keluarga"; cetak jiwa saja + peringatan. (c) **Import ulang** rilis `BAPPEDA-DES-2025` dari sumber yang punya `no_kk`, atau tandai rilis itu `jumlahKeluarga` tidak tersedia. (d) Tambah test regresi: impor tanpa `no_kk` → `jumlahKeluarga` null, bukan `=== jiwa`. | `src/services/dtsen-import.ts:153,205,239`, `src/services/dtsen-planner.ts` |
| WP0.1 | ~~Gabungkan `hotfix/meeting-ready` → `main`~~ ✅ **sudah dikerjakan tim** (29 Agu 16:33 WIB) — `main` == `hotfix/meeting-ready` == `e07edae`. **Sisa pekerjaan:** (a) catat bahwa riwayat **ditulis ulang** dan acuan commit lama di dokumentasi jadi yatim; (b) perbarui `docs/LAPORAN-BRANCH-2026-08-29.md` yang sudah basi terhadap dirinya sendiri (header `@5dd47d7`, detail `main HEAD: 016818e … tertinggal 60 commit … tinggal fast-forward`). | `docs/LAPORAN-BRANCH-2026-08-29.md` |
| WP0.2 | Hapus berkas nyasar `~/Desktop/Niumination/services/cc-acehtengah/src/lib/bapokting-client.ts` dari tree; bandingkan isinya dengan `src/lib/bapokting-client.ts` — bila ada perbedaan, selamatkan perbedaannya ke berkas yang benar sebelum menghapus. | — |
| WP0.2b | **Ubah test yang mengunci bug `jiwa == keluarga`.** `src/services/__tests__/faseJ.dtsen-impor.test.ts:97-100` bernama *"keluargaId fallback deterministik saat no_kk kosong"* dan meng-assert `keluargaId === \`individu:${hmac(nik(10), SECRET)}\`` — ia membekukan perilaku proxy sebagai hal yang diharapkan, **tanpa pernah memeriksa akibatnya pada agregat**. Ganti dengan dua test: (a) impor tanpa `no_kk` **ditolak** atau ditandai, (b) `buildAgregatWilayah` atas data tanpa `no_kk` **tidak** menghasilkan `jumlahKeluarga === jumlahJiwa`. Pakai `hermes-brief/audit-tests/dtsen-keluarga.test.ts` sebagai titik tolak — 9 test di situ sudah membuktikan keempat varian gagalnya. | `src/services/__tests__/faseJ.dtsen-impor.test.ts:97`, `src/services/dtsen-import.ts:205` |
| WP0.3 | Perbaiki **5** test gagal (naik dari 4). **Putuskan dulu arah yang benar**: bentuk baru (`releaseNumber`/`status`) adalah yang dipakai produksi → **perbaiki fixture**, jangan kembalikan kode ke bentuk lama. **Test ke-5** (`faseI.dtsen-gate.test.ts`) gagal karena `DTSEN_ROOT` ditambah ke `ROLES_PERSONAL` tanpa memperbarui test — perbarui test **dan** tulis matriks role lengkap di komentar agar penambahan role berikutnya tidak mengulang hal yang sama. | `faseK.dtsen-planner.test.ts:44`, `faseI.dtsen-gate.test.ts` |
| WP0.4 | Selesaikan error `tsc --noEmit`: **26 di `main`**, **32 di `v3`** (6 tambahan datang dari `scripts/seed.ts` dan tiga route yang baru di-restore dari `.bak` — persis pola yang WP0.5 ingin cegah). Distribusi `v3`: `warehouse-sync.ts` 16, `data-sync.ts` 4, `ai-orchestrator.ts` 4, `seed.ts` 3, `dtsen-planner.ts` 1, `ews/route.ts` 1, `datasets/route.ts` 1, `datasets/[slug]/route.ts` 1, 1 file test. Untuk `warehouse-sync.ts`/`data-sync.ts`: model Prisma `SapaSnapshot`, `SapaIndicatorValue`, `Dataset`, `Skpd`, `Indicator` **tidak ada di `prisma/schema.prisma`** — tambahkan modelnya (sesuai `src/lib/db-migration.ts`) atau hapus kodenya. Jangan `// @ts-ignore`. | `prisma/schema.prisma`, `src/services/warehouse-sync.ts`, `src/services/data-sync.ts` |
| WP0.5 | Tambah gerbang: `"typecheck": "tsc --noEmit"` di `package.json`; panggil dari `.githooks/pre-commit` bersama `scripts/pii-gate.sh`; pastikan Vercel build gagal bila `tsc` gagal. **Dua syarat tambahan yang lahir dari temuan 31 Agu:** (a) skrip typecheck wajib **`rm -rf .next` lebih dulu** — `.next/types/validator.ts` masuk `include` tsconfig dan menghasilkan error hantu antar-branch; (b) laporkan **jumlah galat sintaks** (`grep -c "error TS1"`) secara terpisah, karena satu `TS1005` membuat `tsc` berhenti dan **menyembunyikan semua error lain** — itulah sebabnya `hotfix` tampak "1 error" padahal nyata 26. | `package.json`, `.githooks/pre-commit`, `vercel.json` |
| WP0.6 | Putuskan nasib **3** route `.bak` yang tersisa di branch live (`datasets`, `datasets/[slug]`, `ews`). Minimal: hidupkan `src/app/api/ews/route.ts` **atau** ubah `EwsPanel.tsx` agar menampilkan *"EWS belum aktif — snapshot warehouse belum dibuat"* alih-alih diam. Diam = menyesatkan. | `src/components/EwsPanel.tsx:18` |
| WP0.7 | **Perbaiki `docs/STATUS-CC.md`** (bukan lagi `AGENTS.md` — baris `Deploy state` sudah **dipindah** ke sana pada 30 Agu, dan `AGENTS.md:7` kini menyuruh *"baca `docs/STATUS-CC.md` sebelum menyentuh config/deploy"*). Isinya masih salah dan kini makin salah: `PROD = 4f95617` (sebenarnya kode **`e07edae`**), `"main tertinggal 44+ commit dari hotfix"` (sebaliknya: **`hotfix` = `main` + 23**, `hotfix..main = 0`), `"Semua 8 branch … hotfix-llm"` (sebenarnya **6**, tanpa `hotfix-llm`), header masih `Last update: Aug 29, 2026`. **Tambahkan aturan:** status deploy harus memuat *branch + commit + bukti endpoint*, dan diperbarui di commit yang sama dengan deploy. Selaraskan juga `AI_MODEL`/`AI_BASE_URL` dengan `/api/health`. | `docs/STATUS-CC.md`, `AGENTS.md:7` |
| WP0.8 | **Tegakkan konsistensi auth endpoint DTSEN.** `/api/dtsen/status` benar 401 tanpa role, tetapi `/api/dtsen/breakdown` **publik 200**. Putuskan eksplisit dan tulis di `AGENTS.md`: bila breakdown memang publik, wajib (a) hanya membaca agregat tersensor `k≥5` hasil publish — **bukan** menghitung ulang dari `DtsenIndividu` saat query untuk `program=*`, dan (b) menolak sel `< 5`. | `src/app/api/dtsen/breakdown/route.ts` |
| WP0.9 | Lindungi `/dashboard/akun` — kini **200 tanpa login** padahal `/dashboard/laporan` dan `/dashboard/admin/dtsen` benar 307 → `/login`. | `middleware.ts`, `src/app/dashboard/akun/page.tsx` |
| WP0.10 | Terapkan `formatAngka` id-ID ke **sel tabel visualisasi**, bukan hanya narasi. Bukti: Q10 narasi menulis `33.693`, tabelnya `"33693"`. | `src/components/AIResponseRenderer.tsx` |
| WP0.11 | **Perbaiki label sumber DTSEN yang kini menyesatkan.** `dataSource` menulis `"DTSEN (BAPPEDA Des 2025 — offline)"` dan narasi menulis *"jalur impor manual"*, padahal sejak `f71fe50` angka berasal dari **DB** (bukti: Bebesen 39.449 jiwa/196 kelompok = DB, bukan 43.070/98 = JSON). Label harus menyatakan sumber **sebenarnya** (`DB rilis …` / `BAPPEDA offline` / `SPLP live`). Ini kelas kesalahan yang sama dengan bug label demo yang baru diperbaiki — jangan sampai terulang. | `src/data/dtsenBappedaSource.ts:24`, `src/services/dtsen-planner.ts` |
| WP0.12 | **Sempurnakan role & BNBA — ini bagian yang "masih belum menyeluruh".** Sembilan item, urut prioritas: | |
| WP0.12a | **Batas laju `scope=individu`.** Sekarang `take: 200` per panggilan tanpa rate limit → 295 desa × ~7 desil ≈ **1.175 permintaan** menyeret seluruh 235.011 nama. Wajib: kuota per role per hari (mis. 200 baris/hari untuk `DTSEN_LOOKUP`, lebih tinggi untuk `DTSEN_ROOT` dengan alasan tercatat), penolakan `429` dengan pesan jelas, dan alarm bila satu akun menembus ambang. Pakai `src/lib/rate-limit.ts` yang sudah ada. | `src/app/api/dtsen/breakdown/route.ts` |
| WP0.12b | **Audit gagal = akses ditolak.** Sekarang `dataAccessAudit.create(...).catch(e => console.error(...))` — data tetap dikembalikan walau audit gagal. Itu melanggar prinsip repo sendiri (*"Setiap akses restricted — izinkan atau tolak — diaudit"*). Ubah jadi **fail-closed**: bila INSERT audit gagal → `503`, jangan kirim data. | `src/app/api/dtsen/breakdown/route.ts` |
| WP0.12c | **Kunci breakdown agregat, atau putuskan eksplisit bahwa ia publik.** Hari ini `scope=kecamatan` → **200 tanpa login**, `program=pbi` → **200** (`total: 169891`), padahal `scope=individu` benar 401. Inkonsisten. Bila memang publik: (i) hanya boleh membaca agregat tersensor `k≥5` hasil publish — **bukan** menghitung ulang dari `DtsenIndividu` saat query untuk `program=*`, (ii) wajib menolak sel `< 5`, (iii) tulis keputusannya di `AGENTS.md`. | `src/app/api/dtsen/breakdown/route.ts` |
| WP0.12d | **Dasar hukum & tata kelola `DTSEN_ROOT`.** Satu role bisa melihat nama asli + NIK 235.011 orang. Wajib ada dokumen: dasar hukum (UU 27/2022 ps. 20 + Permen PPN/Bappenas 7/2025), tujuan spesifik, masa berlaku akun, peninjauan berkala (mis. 90 hari), siapa yang menyetujui, dan prosedur pencabutan. Tanpa ini, keberadaan role itu sendiri adalah risiko kepatuhan. | `docs/ai/` (baru), `AGENTS.md` |
| WP0.12e | **Perbaiki pesan gerbang.** Respons 401 menulis *"login dengan akun berrole DTSEN_LOOKUP/SUPERADMIN"* — `DTSEN_ROOT` tidak disebut padahal role tertinggi. Ambil daftar role dari `requiredRolesFor()` agar pesan tidak pernah basi lagi. | `src/app/api/dtsen/breakdown/route.ts`, `src/lib/data-gate.ts` |
| WP0.12f | **Betulkan istilah di narasi publik.** Defleksi NIK menulis *"data by-name tersimpan terpisah, **terenkripsi HMAC**"*. HMAC itu hash satu arah, bukan enkripsi — dan sekarang memang ada enkripsi sesungguhnya (`nikEnc` AES-256-GCM). Kalimat yang salah soal perlindungan data pribadi adalah risiko hukum, bukan sekadar kosmetik. | `src/services/dtsen-planner.ts` |
| WP0.12g | **Uji matriks role secara eksplisit.** Tambah test tabel: untuk tiap role × {`kecamatan`, `desa`, `desil`, `individu`} × {dengan/tanpa sesi} → status + `fullIdentitas` yang diharapkan. Termasuk: `DTSEN_ANALYST` **tidak** boleh `individu`; `SUPERADMIN` termask; hanya `DTSEN_ROOT` yang `fullIdentitas: true`. | `src/services/__tests__/` (baru) |
| WP0.12h | **Lindungi `/dashboard/akun`** — masih **200 tanpa login** (dilaporkan kemarin, belum ditangani). | `middleware.ts` |
| WP0.12i | **Jangan tampilkan NIK di DOM tanpa perlu.** Untuk `DTSEN_ROOT`, pertimbangkan klik-untuk-buka per baris + penanda air (watermark) nama akun, agar tangkapan layar tidak serta-merta membocorkan NIK. Minimal: jangan render NIK di tabel panjang yang bisa digulung. | `src/components/BreakdownExplorer.tsx` |
| WP0.13 | **Tata kelola TIGA branch aktif — sekarang ini risiko nyata, bukan teoretis.** `main` `d86bdad` = produksi (`e07edae` + docs) · `hotfix/meeting-ready` `14cfb19` = `main` + **23** (Bapokting) · `v3` `1dd5ed7` = `main` + **13** (executive UI + `.bak` habis + `parseNumericId`). **`hotfix` dan `v3` saling menyimpang** — tidak ada yang memuat yang lain, dan keduanya menambah berkas di path yang berdekatan (`ai-orchestrator.ts`, `grounding.ts`, `AIResponseRenderer.tsx`, `QueryBar.tsx`), jadi konflik merge sudah pasti. Tugas: (a) putuskan dan tulis di `docs/STATUS-CC.md` branch mana sumber kebenaran dan apa urutan merge-nya; (b) **jangan merge apa pun ke `main` sebelum WP0.00 + WP0.0 selesai** — ketiganya membawa kebocoran kredensial dan bug `jiwa == keluarga` apa adanya; (c) satukan dua paruh solusi yang terpisah: `parseNumericId` (hanya di `v3`) + `bapokting-stats.ts` (hanya di `hotfix`) → lihat WP1.2/WP3.0c; (d) sebelum merge, tiap branch wajib lolos `tsc` **setelah** galat sintaks dibenahi (lihat WP0.5) dan 5 test yang gagal; (e) `docs/ai/RENCANA_V3.md` menyatakan *"tanpa persetujuan eksplisit → tidak push ke main, tidak deploy"* — hormati itu. | `docs/STATUS-CC.md`, `docs/ai/RENCANA_V3.md` |
| WP0.14 | **Perbaiki validasi kunci `DTSEN_DATA_KEY` — satu karakter, tapi mencegah kegagalan total.** `src/lib/dtsen-crypto.ts:13` memakai `return b.length >= 32 ? b : null;` padahal `createCipheriv('aes-256-gcm', …)` menuntut **tepat 32 byte**. Terukur: kunci 44-char base64url (33 B), 60-char base64 (42 B), dan **64-char hex (48 B)** semuanya lolos gerbang lalu melempar `RangeError: Invalid key length`; `encryptField` tidak punya try/catch sehingga seluruh alur enkripsi BNBA gagal keras. Ubah jadi `=== 32`, tambah test untuk ketiga bentuk kunci itu, dan validasi sekali saat boot dengan pesan yang menyebut bentuk yang diharapkan (`openssl rand -base64url 32`). **Jangan** memotong kunci diam-diam (`subarray(0,32)`) tanpa mencatatnya — itu mengubah kunci yang dipakai mendekripsi data lama. | `src/lib/dtsen-crypto.ts:13` |
| WP0.15 | **Betulkan empat cacat mesin statistik Bapokting** (semuanya terbukti di `hermes-brief/audit-tests/bapokting-stats.test.ts`): (a) **tren < 14 titik** → jangan diam-diam `'stabil'`; kembalikan `trend: 'insufficient'` + `cukupData: false` dan sebut di narasi *"tren tidak dihitung: data hanya N hari"*; (b) **`tertinggi`/`terendah` tumpang tindih** → bila `volatilityList.length < 2`, jangan keluarkan rekomendasi "paling stabil" sama sekali; (c) **`overallIndex` `NaN`** → `volatilityList.length === 0` → `0` atau `null`, jangan `0/0`; (d) **`hargaAvg` kategori/kecamatan** → hitung rata-rata **tertimbang** dari seluruh titik, bukan rata-rata dari rata-rata (selisih terukur 20.000 vs 12.500). Sekalian hapus dua ternari mati di baris 214 & 218 (`? 'naik' : 'naik'`). | `src/lib/bapokting-stats.ts:156, 205-210, 214, 218` |
| WP0.16 | **Satukan normalisasi kecamatan — satu fungsi, satu bentuk, dipakai semua jalur.** Sekarang ada **tiga** jalur dengan **tiga** bentuk keluaran (DTSEN/BAPPEDA `ALL-CAPS` · `dtsen-import` `KEC_NORM` → Title Case · `dtsen-multisource` `kecLookup` → Title Case) dan SAPA/Excel mentah (`"LUT TAWAR"` di `dok-b-01-stunting-2026-07.json:24`, `"Lut Tawar"` di `dok-c-01-kominfo-ppks.json:58`). `KEC_ALIAS` berisi **satu** entri dan `kecLookup` **nol** kali dipanggil dari `dtsen-planner`/`grounding`/`ai-orchestrator`/`sapa-client`. Tugas: pindahkan `kecLookup` + alias ke `src/lib/statistics/normalize.ts` (WP1.4), isi alias untuk **ke-14** kecamatan (minimal `LUT TAWAR`→`Laut Tawar`), tentukan **satu** bentuk kanonik untuk tampilan, dan panggil dari **semua** jalur. Lalu perbarui `AGENTS.md:145` yang kini mengklaim masalah ini sudah selesai. | `src/services/dtsen-multisource.ts:36`, `src/lib/statistics/normalize.ts` (baru), `AGENTS.md:145` |

**Kriteria selesai (semua harus dijalankan dan ditempel outputnya di PR):**
```
# Keamanan (WP0.00) — WAJIB lebih dulu
git grep -n "cPtnkHE7NYD3Gg_s" $(git rev-list --all)   → kosong (riwayat bersih)
git grep -nE "\b[0-9]{16}\b" -- ':!src/data/excel'    → kosong (tak ada NIK di luar data agregat)
bash scripts/pii-gate.sh .                             → OK, dan kini MEMINDAI seluruh tree
   (uji: sisipkan NIK palsu 16 digit ke docs/uji.md → gate HARUS gagal)
Password dtsen_root sudah diganti (buktikan dengan login lama → gagal)

# Data (WP0.0)
curl -s "$BASE/api/dtsen/breakdown?scope=kecamatan" | jq '.rows[0]'
   → jiwa != keluarga      (sekarang 39449 == 39449 — harus berubah)

# Role (WP0.12)
curl -s -o /dev/null -w '%{http_code}' "$BASE/api/dtsen/breakdown?scope=individu&kecamatan=X&desa=Y&desil=1"
   → 401 tanpa sesi (sudah benar — jaga)
curl -s -o /dev/null -w '%{http_code}' "$BASE/api/dtsen/breakdown?scope=kecamatan"
   → keputusan sadar: 401/403 (dikunci) ATAU 200 + tercatat di AGENTS.md sebagai publik tersensor

# Gerbang mutu
npx vitest run      → 0 failed          (sekarang 5 gagal)
npx tsc --noEmit    → 0 error           (sekarang 26)
npx next build      → sukses
git log --oneline -1 origin/main == git log --oneline -1 origin/hotfix/meeting-ready   (sudah ✅)
```

---

### WP1 — Lapisan semantik (semantic layer)  *(estimasi: 2 hari)*

**Konteks:** tidak ada tipe ukuran, tidak ada penyebut, tiga parser angka berbeda (satu rusak), satuan teks bebas (`"Orang"` 309 vs `"orang"` 210 di `/api/analytics`), nama wilayah tidak dinormalisasi (`LUT TAWAR` vs `Laut Tawar`).

**Tugas**

| ID | Tugas | Berkas baru/berubah |
|---|---|---|
| WP1.1 | Definisikan taksonomi. | **baru** `src/lib/statistics/types.ts` |
| WP1.2 | **Satu** parser angka Indonesia, dipakai seluruh basis kode. **Kabar baik (30 Agu): parser yang benar sudah ditulis tim** di `src/services/opd-drilldown.ts:35` (`parseNumericId` — titik ribuan dihapus, koma → titik desimal, menolak teks non-numerik dengan `null`, dan **sudah punya test** di `opd-drilldown.test.ts`). **Jangan menulis ulang dari nol**: pindahkan fungsi itu ke `src/lib/statistics/parse.ts`, ekspor, lalu panggil dari mana pun. **Koreksi (terukur 31 Agu):** `parseNumericId` benar untuk **8 dari 9** kasus nyata, tapi **mengembalikan `null` untuk `"Rp 1.250.000"`** karena regex `^\d+(\.\d+)?$` tidak mengizinkan huruf — itu gagal **aman** (tidak mengarang), tapi belum lengkap. Jadi tugasnya: buang awalan satuan (`Rp`, `US$`, `%`) **sebelum** regex, lalu tambah test untuk `"Rp 1.250.000"` → `1250000`, `"11.503.360.000.000"`, `"31,4"`, `"1.234,567"`, `"16.000"`, `""`, `"-"`, `"N/A"`, `"belum ada data"`. Bandingkan perilakunya dengan parser rusak di `hermes-brief/audit-tests/parser-stats.test.ts` — 27 test di situ sudah memetakan keduanya. | **baru** `src/lib/statistics/parse.ts` ← pindahan dari `src/services/opd-drilldown.ts:35` |
| WP1.3 | Registri indikator: varian nama → satu konsep. | **baru** `src/lib/statistics/indicator-registry.ts` |
| WP1.4 | Normalisasi satuan & wilayah. | **baru** `src/lib/statistics/normalize.ts` |
| WP1.5 | `MetricFactory`: `SapaRecord`/baris DTSEN/`ExcelDoc` → `Metric`. | **baru** `src/lib/statistics/metric.ts` |
| WP1.6 | Ganti **semua** pemanggil parser rusak dengan `parseNumericId`. Daftar lengkap per branch (dihitung 31 Agu dengan `git grep -n "replace(/[^\\d.-]/g" origin/<branch> -- 'src/**'`): **`main` 2** (`sapa-client.ts:433`, `grounding.ts:265`) · **`hotfix` 3** (`sapa-client.ts:433`, `grounding.ts:247`, `grounding.ts:287`) · **`v3` 2** (`sapa-client.ts:433`, `grounding.ts:267`). Prioritas utama `sapa-client.ts:433` — **inilah yang memberi makan agregasi**, mengubah `"31,4"` → `314` dan membuang `"11.503.360.000.000"`. `grounding.ts:247` baru (Bapokting) kebetulan aman karena harga berupa integer polos, tapi akan membaca `"16.000"` sebagai **16**. Sisanya: `trend-analysis.ts:26`, `kpi.ts:78`. Setelah ini **hapus** parser lokal di `opd-drilldown.ts` agar tidak tersisa dua implementasi (aturan A7), dan **tambah test regresi**: `parseNumericId("16.000") === 16000`, `parseNumericId("31,4") === 31.4`, `parseNumericId("11.503.360.000.000") === 11503360000000`, `parseNumericId("Rp 1.250.000") === 1250000`. | `src/lib/sapa-client.ts:433`, `src/services/grounding.ts:247/265/267/287`, `src/services/trend-analysis.ts:26`, `src/services/kpi.ts:78`, `src/services/opd-drilldown.ts` |

**WP1.1 — taksonomi (spesifikasi wajib)**

```ts
export type MeasureType =
  | 'count'          // cacahan: jiwa, KK, unit, orang, kasus
  | 'rate_percent'   // punya penyebut eksplisit: prevalensi, persen, cakupan
  | 'ratio'          // punya penyebut, bukan persen: rasio, per kapita
  | 'index'          // skala 0–100 tanpa satuan fisik: IPM, indeks
  | 'currency'       // Rp
  | 'area' | 'length' | 'weight' | 'duration' | 'temperature' | 'other';

export type PeriodKind = 'none' | 'year' | 'quarter' | 'month' | 'point_in_time';

export interface Period { kind: PeriodKind; year?: number; quarter?: 1|2|3|4;
                          month?: number; asOf?: string; label: string }

export type GeoLevel = 'kabupaten' | 'kecamatan' | 'desa';

export interface Geo { level: GeoLevel; kabupaten?: string;
                       kecamatan?: string; desa?: string }

export interface Metric {
  id: string;
  conceptId: string;        // kunci registri — BUKAN nama mentah
  label: string;            // nama tampilan
  measure: MeasureType;
  value: number;            // hasil parseNilaiId — BUKAN string mentah
  valueRaw: string;         // string asli, untuk jejak
  unitCanonical: string;    // 'jiwa' | 'kk' | 'persen' | 'rupiah' | 'km' | 'ha' | 'ton' | 'indeks'
  unitRaw: string;
  period: Period;
  geo: Geo;
  numerator?: Metric;       // untuk rate/ratio
  denominator?: Metric;     // WAJIB ada bila measure = rate_percent|ratio
  opd: string;
  source: SourceRef;
  quality: QualityFlags;
}

export interface SourceRef {
  id: 'sapa' | 'dtsen-bappeda' | 'dtsen-splp' | 'dtsen-db' | 'dtsen-demo'
     | 'dok-a' | 'dok-b' | 'dok-c' | 'bapokting';
  label: string;            // label tampil yang JUJUR (demo ≠ live)
  releaseNumber?: string;
  asOf?: string;
  isDemo?: boolean;         // true → label wajib menyebut "simulasi"
  recordRef?: string;       // id_kode_indikator / baris sumber
}

export interface QualityFlags {
  hasPeriod: boolean;
  hasGeo: boolean;
  hasDenominator: boolean;
  isZero: boolean;          // 148 record bernilai 0 di SAPA
  isPlausible: boolean;     // hasil uji WP4.4
  warnings: string[];       // alasan manusia, siap ditampilkan
}
```

**WP1.2 — `parseNilaiId` (spesifikasi + test wajib)**

Satu fungsi. Menggantikan `sapa-client.ts:428`, `trend-analysis.ts:26`, `kpi.ts:78`.

| Input | Output | Catatan |
|---|---|---|
| `"2.156,28"` | `2156.28` | titik = ribuan, koma = desimal |
| `"11.503.360.000.000"` | `11503360000000` | **jangan dibuang** (PDRB) |
| `"31,4"` | `31.4` | koma = desimal (bukan `314`) |
| `"29.019"` | `29019` | titik = ribuan |
| `"Rp 1.250.000"` | `1250000` | simbol dibuang, `measure='currency'` |
| `"-1.234,5"` | `-1234.5` | tanda dipertahankan |
| `"1.234"` | `1234` | titik ribuan |
| `"1.2"` | `1.2` | bukan pola ribuan → desimal |
| `""` / `"-"` / `"N/A"` | `null` | eksplisit, bukan `0` |
| `"730 Orang"` | `730` | satuan dilepas ke `unitRaw` |

Test wajib: `src/lib/statistics/__tests__/parse.test.ts`, ≥20 kasus, **termasuk keenam kasus bug di atas sebagai regresi**.

**WP1.3 — registri indikator**

Bukti kebutuhan: live menampilkan `Jumlah anak balita yang mengalami stunting (JAB(5) P stunting) 730 Orang (2025)` **dan** `Jumlah Balita Stunting 730 Orang` sebagai dua bukti berbeda — dedupe lama memakai kunci `nama|tahun` dan gagal karena satu baris `tahun=null`.

```ts
export interface IndicatorConcept {
  conceptId: string;                 // 'stunting.balita.count'
  canonicalName: string;
  aliases: string[];                 // varian nama mentah di SAPA
  matchRegex?: RegExp;               // untuk nama yang sangat bervariasi
  measure: MeasureType;
  unitCanonical: string;
  ownerOpd?: string;                 // OPD yang seharusnya memiliki
  denominatorConceptId?: string;     // 'penduduk.balita.count' → enables rate
  isPrimary: boolean;                // true = yang dipakai KPI/etalase
  notes?: string;
}
```

Minimal 40 konsep prioritas: stunting (count, prevalensi), kemiskinan (count, persen), IPM, PDRB, panjang jalan (+kondisi baik), ASN, PPPK, putus sekolah, produksi kopi (arabika/robusta), luas areal, penduduk (total, balita, kelas menengah), penerima bansos (PKH/BPNT/PBI/sembako), desil, PPKS, santri, mahasiswa, BSM.

**WP1.4 — normalisasi**

- `normalizeUnit(raw)`: `"Orang"|"orang"|"Orng"|"jiwa"|"Jiwa"` → kanonik. Target: `satuanDistribusi` di `/api/analytics` turun dari **15 kelompok** menjadi **≤8**.
- `normalizeKecamatan(raw)`: `"LUT TAWAR"|"Lut Tawar"|"Laut Tawar"` → `"Laut Tawar"`. Sumber kebenaran: `/api/geodata` (14 kecamatan, sudah benar) + `KEC_ALIAS` yang sudah ada di `src/services/dtsen-multisource.ts`.
- `normalizeDesa(raw)`, `normalizeOpd(raw)`: sama. Nama OPD harus berasal dari **daftar nyata 38 OPD**, bukan peta kata kunci buatan tangan.

**Kriteria selesai WP1**
```
npx vitest run src/lib/statistics   → 0 failed, ≥60 test baru
grep -rn "replace(/\[^\\\\d.-\]/g" src/lib/sapa-client.ts   → tidak ada lagi
```
Test regresi wajib: `aggregateByIndicator` atas `[{nilai:"11.503.360.000.000"},{nilai:"2.156,28"},{nilai:"31,4"}]` menghasilkan `nilaiNumber` = `11503360000000`, `2156.28`, `31.4` — **tidak ada yang dibuang**.

---

### WP2 — Router pertanyaan statistik  *(estimasi: 2 hari)*

**Konteks:** urutan routing live membuat jalur tren/perbandingan **tidak dapat dicapai** bila keyword Dokumen cocok. `intent.kategori` dideteksi lalu dibuang.

**Tugas**

| ID | Tugas | Berkas |
|---|---|---|
| WP2.1 | `QuestionPlan` + `routeQuestion()` berbasis **skor**, bukan first-match. | **baru** `src/services/statistics/question-router.ts` |
| WP2.2 | `resolveMetrics(plan)` — ambil metrik sesuai kebutuhan, lintas sumber. | **baru** `src/services/statistics/metric-retrieval.ts` |
| WP2.3 | Eksekusi per arketipe. | **baru** `src/services/statistics/analyzers/*.ts` |
| WP2.4 | Pasang router sebagai **satu-satunya** pintu; hapus pendek-sirkuit. | `src/services/ai-orchestrator.ts` (`processAIQuery` & `processAIQueryStreaming`) |
| WP2.5 | Ganti `OPD_KEYWORDS` dengan pencocokan berbasis daftar 38 OPD nyata + alias. | `src/services/intent-detector.ts` |
| WP2.6 | Ganti gerbang negatif `detectMetaQuery` dengan skor. | `src/services/meta-query.ts` |

**WP2.1 — arketipe (spesifikasi)**

```ts
export type Archetype =
  | 'level'          // "berapa X"                       → nilai + satuan + periode + sumber
  | 'trend'          // "tren / perkembangan / naik turun" → deret waktu
  | 'comparison'     // "bandingkan / vs / antar"         → selisih + peringkat
  | 'composition'    // "sebaran / proporsi / komposisi"  → share, wajib penyebut
  | 'distribution'   // "per kecamatan / per desa"        → statistik deskriptif + peringkat
  | 'ranking'        // "tertinggi / terendah / top N"    → peringkat eksplisit
  | 'correlation'    // "hubungan / kaitan / pengaruh"    → koefisien + batas kejujuran
  | 'anomaly'        // "waspada / tidak wajar / outlier" → z-score / IQR
  | 'meta'           // tentang portal
  | 'personal'       // NIK / per-orang → defleksi (pertahankan perilaku sekarang)
  | 'unanswerable';  // jujur + saran

export interface QuestionPlan {
  archetype: Archetype;
  confidence: number;              // 0..1 — WAJIB, untuk memutuskan jujur/alternatif
  concepts: string[];              // conceptId dari registri
  measureNeed: MeasureType | null; // 'rate_percent' bila user minta "persen"
  period: { requested: Period | null; available: Period[] };
  geo: { level: GeoLevel; filter?: Geo };
  compare: { dimension: 'geo' | 'opd' | 'concept' | 'period'; items: string[] };
  needs: {
    denominatorConcept?: string;
    minSeriesLength: number;       // trend → 3
    minGroupCount: number;         // distribution/correlation → 5
  };
  sources: SourceRef['id'][];      // sumber yang HARUS dicoba, berurutan
  trace: string[];                 // alasan tiap keputusan — WAJIB, untuk debug & UI
}
```

**Aturan routing yang wajib ditegakkan**

| Aturan | Alasan (bukti) |
|---|---|
| R2.1 — Arketipe `trend`/`comparison`/`distribution`/`ranking` **tidak boleh** dipotong oleh kecocokan keyword Dokumen. Dokumen hanya boleh menjadi **salah satu sumber**, bukan jalur keluar. | Q1, Q2, Q4, Q13 |
| R2.2 — Bila `measureNeed = 'rate_percent'` dan `denominatorConcept` tersedia di sumber mana pun → **hitung**. Bila tidak tersedia → katakan penyebutnya yang tidak ada, sebutkan penyebut apa yang dibutuhkan, jangan diam-diam mengembalikan cacahan. | Q10, Q12, Q13 |
| R2.3 — Bila `sources` memuat `dtsen-bappeda`, pencarian **wajib** mencoba `per_kecamatan_desil`, `per_desa`, `per_desil`, `bansos_per_kecamatan`. | Q3 menjawab "tidak tersedia" padahal datanya ada |
| R2.4 — `unanswerable` wajib menyertakan: (a) apa yang tidak ada, (b) apa yang **ada** dan terdekat, (c) apa yang dibutuhkan agar bisa dijawab. | Q5, Q8 |
| R2.5 — Setiap keputusan tercatat di `trace` dan dikirim sebagai event SSE `trace`. | Debuggability; sekarang `metadata` tidak sampai ke pengguna |
| R2.6 — Kata kerja turunan ("melaporkan", "tercatat", "dilaporkan") tidak boleh mematikan jalur meta. | "Berapa OPD yang melaporkan data?" gagal |
| R2.7 — OPD dikenali dari daftar 38 OPD nyata + alias, dengan batas kata. 20 OPD yang kini tak terjangkau harus terjangkau. | §6 audit |

**WP2.3 — analyzer per arketipe**

Satu modul murni per arketipe di `src/services/statistics/analyzers/`: `level.ts`, `trend.ts`, `comparison.ts`, `composition.ts`, `distribution.ts`, `ranking.ts`, `correlation.ts`, `anomaly.ts`. Masing-masing `(metrics: Metric[], plan: QuestionPlan) => StatResult`, **tanpa IO, tanpa LLM**.

`trend.ts` **wajib** membaca sumber berurutan:
1. deret multi-tahun dalam payload SAPA (32 indikator),
2. **`SapaIndicatorValue` / `SapaSnapshot` dari warehouse** (belum pernah dipakai `trend-analysis.ts`),
3. Dokumen/DTSEN bila punya kolom periode,
4. bila semua gagal → `unavailable` + alternatif (bandingkan antar-kecamatan, atau posisi vs periode berikutnya setelah snapshot terkumpul).

**Kriteria selesai WP2**
- `src/services/statistics/__tests__/router.test.ts` memuat **seluruh 75 pertanyaan golden ber-arketipe** (14 di antaranya pertanyaan audit yang gagal di live) (`hermes-brief/data/golden-queries.json`); akurasi arketipe **≥95%**. Sebelas kasus `archetype: "gate"` (S1–S11) **tidak** ikut uji routing — lihat WP6.7.
- Test regresi eksplisit: `"Berapa prevalensi stunting dan bagaimana trennya 5 tahun terakhir?"` → `archetype='trend'`, `trace` menyebut Dokumen B **sebagai sumber**, bukan sebagai jalur keluar.
- `"Bandingkan Dinas Kesehatan dan Dinas Pendidikan"` → `archetype='comparison'`, `compare.dimension='opd'`.

---

### WP3 — Mesin statistik  *(estimasi: 2 hari — lebih murah dari perkiraan awal)*

**Konteks (diperbarui 31 Agu):** *sebagian* mesin sudah ditulis tim di `hotfix/meeting-ready`:
`src/lib/bapokting-stats.ts` (322 baris) menghitung simpangan baku sampel, perubahan persen,
tren 7-hari-vs-7-hari (ambang ±2 %), indeks volatilitas, dan agregasi per kategori/kecamatan.
**Jangan menulis ulang dari nol** — pindahkan dan generalisasi. Yang belum ada sama sekali:
`share`, `growth`/CAGR, `rank` + persentil, `zscore`, `describe` (kuartil), `pearson`/`spearman`,
`iqrOutliers`, dan **seluruh aturan kejujuran S1–S8**. Tidak ada satu pun dari 8 fungsi di bawah
yang ada di branch mana pun (`zScore`/`growthRate`/`shareOf`/`percentRate` → 0 kemunculan di
ketiga branch).

**Tiga pekerjaan pendahuluan wajib, sebelum menambah fungsi baru:**

| # | Tugas | Bukti saat ini |
|---|---|---|
| WP3.0a | **Beri test pada `hitungStatsBapokting` sebelum menyentuhnya.** Sekarang **nol test**: `git grep -l "hitungStatsBapokting" origin/hotfix/meeting-ready -- 'src/**/*.test.ts'` → kosong. `bapokting-viz.test.ts` hanya menguji `buildVizFromEvidence`. Menggeneralisasi kode tanpa test = memindahkan bug tanpa sadar. | aturan A6 |
| WP3.0b | **Perbaiki error tipe di dalam mesinnya:** `bapokting-stats.ts(156,47): TS2322: Type '"stabil"' is not assignable to type '"naik" \| "turun"'`. Lebarkan `KomoditasTrend.arah` jadi `'naik' \| 'turun' \| 'stabil'`. | `npx tsc --noEmit` |
| WP3.0c | **Angkat `hitungStdDev`/`hitungPersentase` ke `src/lib/statistics/compute.ts`** sebagai `describe()`/`growth()`, lalu panggil dari `bapokting-stats.ts`. Jangan biarkan dua implementasi simpangan baku hidup berdampingan (aturan A7). | `bapokting-stats.ts:66–79` |

**Tugas** — **baru** `src/lib/statistics/compute.ts`, semua fungsi murni:

```ts
rate(numerator, denominator): number | null      // null bila penyebut 0/null — BUKAN Infinity, BUKAN 0
share(part, whole): number | null
growth(points): { abs, pct, direction: 'up'|'down'|'flat', cagr } | null
rank(items, { by, order }): Ranked[]             // setiap entri: { rank, value, gapToTop, gapToPrev, percentile }
zscore(values, target): number
describe(values): { n, min, q1, median, q3, max, mean, sd, cv }
pearson(xs, ys): { r, n, decision: 'report'|'insufficient' }
spearman(xs, ys): { rho, n, decision }
iqrOutliers(values): { outliers, fences }
```

**Aturan kejujuran statistik (wajib diimplementasikan, bukan di komentar)**

| Aturan | Implementasi |
|---|---|
| S1 | `n < 3` untuk tren → `decision:'insufficient'`, jangan hitung arah |
| S2 | `n < 5` untuk korelasi → `decision:'insufficient'` |
| S3 | `|r| < 0,3` → wajib disebut "lemah"; dilarang kata "berpengaruh"/"menyebabkan" |
| S4 | Korelasi **tidak pernah** ditulis sebagai kausalitas. Template wajib menyertakan kalimat "korelasi bukan sebab-akibat". |
| S5 | Penyebut `0`/`null` → `null` + `warning` yang menyebut penyebutnya hilang |
| S6 | Perbandingan lintas satuan **ditolak**: `rank()` atas `[rupiah, hektare]` → error, bukan daftar |
| S7 | Perbandingan lintas periode **ditolak** kecuali periode dinyatakan eksplisit di output |
| S8 | `describe` atas <4 nilai → tampilkan nilai apa adanya, jangan median/kuartil palsu |

**Kriteria selesai WP3**
- `src/lib/statistics/__tests__/compute.test.ts`, **≥40 test**, setiap fungsi punya kasus batas (penyebut 0, n=1, n=2, nilai identik, nilai negatif).
- `hitungStatsBapokting` **turut teruji** (WP3.0a) — minimal: data <14 titik → `trend:'stabil'` dan `persentasePerubahan:0`; harga identik → `stdDev:0`; satu komoditas saja → tidak crash.
- `arah:'stabil'` lolos `tsc` (WP3.0b).
- Test wajib: `rate(33996, 234740)` → `0.14482…`; diformat `14,5%`.
- Test wajib: `rank([{satuan:'rupiah'},{satuan:'ha'}])` → melempar error.

---

### WP4 — Fusi, rekonsiliasi, dan uji kewajaran  *(estimasi: 1,5 hari)*

**Konteks:** `buildFusedMultiSourceResponse` menumpuk baris tanpa menyatukan satuan/periode, mengosongkan kolom `Satuan` untuk baris dokumen, dan tidak mendamaikan konflik.

**Tugas**

| ID | Tugas | Berkas |
|---|---|---|
| WP4.1 | `reconcile(metrics)` — kelompokkan per `conceptId`, deteksi beda periode/definisi/sumber. | **baru** `src/services/statistics/reconcile.ts` |
| WP4.2 | Tabel fusi **satu satuan per tabel**. Bila satuan berbeda → pecah jadi beberapa tabel bertajuk, atau satu tabel dengan kolom `Satuan` **terisi di setiap baris**. | `src/services/excel-doc-query.ts` |
| WP4.3 | `plausibility(metric)` — uji kewajaran dengan batas berbasis domain. | **baru** `src/services/statistics/plausibility.ts` |
| WP4.4 | `profileDataset()` — laporkan cacat data ke dalam jawaban (bukan disembunyikan). | **baru** `src/services/statistics/data-profile.ts` |

**WP4.1 — perilaku wajib**

Untuk Q1 (stunting), keluaran yang benar:

```
Konsep: stunting.balita.count
  • 654 balita  — Dokumen B (Dinas Kesehatan), per 2026-07
  • 730 balita  — SAPA, 2025
  → Selisih 76 balita (10,4%). Kemungkinan penyebab: periode berbeda (2025 vs
    2026-07) dan cakupan pencatatan berbeda. Belum dapat dipastikan dari data
    yang tersedia; konfirmasi ke Dinas Kesehatan.
Konsep: stunting.prevalensi
  • 4,9%  — SAPA "Prevalensi Stunting (Pendek dan Sangat Pendek)", 2025
  • 31,4% — SAPA "Prevalensi Stunting", 2025 (dipakai kartu KPI)
  → DUA indikator berbeda nama untuk satu konsep dengan selisih 6,4×.
    Keduanya tidak boleh ditampilkan bergantian tanpa penjelasan.
```

Kasus kedua yang **wajib** tertangani (ditemukan 29 Agu) — populasi & keluarga DTSEN, tiga sumber tiga angka:

```
Konsep: dtsen.keluarga.total
  • 222.643 — DB rilis BAPPEDA-DES-2025 (dipakai jalur live)  ← SALAH, lihat WP0.0
  •  71.370 — dtsen-agregat-bappeda.json  per_kecamatan
  •  67.702 — dtsen-agregat-bappeda.json  per_kecamatan_desil
  → Selisih maksimum 3,3×. Sumber pertama cacat (jiwa dipakai sebagai keluarga).
    Sebelum diperbaiki: JANGAN sajikan angka keluarga dari DB; sajikan jiwa +
    peringatan "jumlah keluarga tidak tersedia di rilis aktif".
Konsep: dtsen.pbi.jiwa
  • 169.891 — DB (hitung ulang dari DtsenIndividu)  = 76,3% populasi
  • 216.322 — JSON bansos_per_kecamatan (pbi_nas + pbi_pemda)  = 92,2% populasi
  → Keduanya melewati batas kewajaran. Dugaan: JSON mendobel-hitung PBI nasional
    dan PBI pemda. Wajib blok peringatan + arahan verifikasi ke Dinas Sosial.
```

Aturan:
- **Tidak pernah** memilih satu angka secara diam-diam bila ada konflik.
- **Tidak pernah** menumpuk cacahan dan persen dalam satu kolom `Nilai`.
- Selisih <2% → disebut "konsisten". 2–15% → disebut dengan angka selisih + kemungkinan penyebab. >15% → **wajib** blok peringatan di awal narasi.
- Bila salah satu sumber diketahui cacat (mis. hasil WP0.0), sumber itu **tidak dipakai** dan alasannya dicatat di `caveats` — bukan disandingkan seolah setara.

**WP4.3 — batas kewajaran yang wajib diuji**

| Uji | Ambang | Bukti kebutuhan |
|---|---|---|
| Cakupan program vs populasi | penerima > 90% populasi → `warning` | PBI 216.322 dari 234.740 jiwa = 92% |
| Kelengkapan desil | jumlah kelompok desil ≠ 10 → `warning` | data hanya desil 1–7 |
| Konsistensi tabel | `Σ per_kecamatan_desil ≠ total` → `warning` + **pakai `per_kecamatan` untuk total kabupaten** | 67.702 vs 71.370 KK (−5,1%) |
| Nilai nol | `isZero` → jangan dipakai sebagai "terendah" tanpa verifikasi | 148 record bernilai 0 |
| Persen | di luar 0–100 untuk `rate_percent` → `warning` | — |
| Lonjakan | `|growth| > 100%` antar periode → `warning` | — |

**Kriteria selesai WP4**
- Test regresi Q13: keluaran **tidak** memuat dua baris `730`; memuat satu konsep dengan rekonsiliasi 654 vs 730.
- Test regresi Q11: keluaran memakai **satu** angka keluarga Bebesen dan menyebut angka lainnya sebagai varian beserta sumbernya.
- Test regresi Q1: kolom `Satuan` terisi di **setiap** baris; tidak ada tabel yang mencampur `jiwa` dan `persen`.

---

### WP5 — Narasi "data bercerita"  *(estimasi: 2 hari)*

**Konteks:** narasi sekarang adalah template penggabungan sumber ("Berdasarkan penggabungan beberapa sumber resmi… 1) … 2) …"). Itu **daftar bahan**, bukan cerita.

**Tugas**

| ID | Tugas | Berkas |
|---|---|---|
| WP5.1 | Template narasi per arketipe. | **baru** `src/services/statistics/narrative.ts` |
| WP5.2 | `insight` — temuan yang diturunkan dari `StatResult`, bukan dari teks. **Contoh yang harus dihindari sudah ada di depan mata:** `src/services/executive-presentation.ts:233–258` (`buildInsights`, baru di `v3`) mengembalikan maksimum 3 insight dari **template kalimat tetap** seperti *"Data disajikan sebagai perubahan antar-periode; periksa kesamaan indikator dan satuan."* — tidak ada satu angka pun di dalamnya, dan teksnya memuat kata `evidence` (istilah internal yang bocornya tercatat di Q6/Q14). Wiring `insight.ts` **ke `buildInsights`** agar label "Insight" di UI baru itu berisi hitungan nyata; bila belum sempat, **hapus panelnya** — panel kosong yang terlihat pintar lebih menyesatkan daripada tidak ada panel. | **baru** `src/services/statistics/insight.ts` + `src/services/executive-presentation.ts:233` |
| WP5.3 | `caveat` — keterbatasan yang **wajib** muncul, diturunkan dari `QualityFlags`. | `narrative.ts` |
| WP5.4 | LLM opsional sebagai penyunting gaya, dengan **grounding dua arah**. | `src/services/ai-orchestrator.ts`, `src/services/grounding.ts` |
| WP5.5 | Perluas `HybridResponse` (aditif, jangan merusak renderer lama). | `src/types/index.ts` |
| WP5.6 | Render blok baru di UI. | `src/components/AIResponseRenderer.tsx`, `src/components/AIDataWidget.tsx` |

**WP5.1 — pola per arketipe (wajib)**

| Arketipe | Kalimat 1 (kepala) | Kalimat 2–3 (isi) | Kalimat terakhir (caveat) |
|---|---|---|---|
| `level` | Nilai + satuan kanonik + periode + sumber | Pembanding yang tersedia (periode lalu / wilayah lain / target) | Cakupan & ketidakpastian |
| `trend` | Arah + besaran absolut + persen + rentang periode | Titik belok / laju (CAGR) / periode tercepat | Jumlah titik data; bila <3 → tidak ada klaim arah |
| `comparison` | Siapa tertinggi & terendah + **selisihnya** | Posisi yang ditanyakan dalam peringkat | Keseragaman satuan & periode |
| `composition` | Bagian terbesar + **persennya terhadap penyebut yang disebut** | Dua bagian berikutnya | Definisi penyebut |
| `distribution` | Median + rentang + **nama** wilayah ekstrem | Kesenjangan (rasio tertinggi:terendah) | Jumlah kelompok; k-anonimitas |
| `ranking` | Peringkat 1–3 dengan nilai | Posisi yang ditanyakan | Kriteria peringkat |
| `correlation` | Koefisien + kekuatan | Arah + contoh pasangan | **"Korelasi bukan sebab-akibat"** + n |
| `anomaly` | Apa yang menyimpang + berapa simpangannya | Pembanding (z-score / IQR) | Ambang yang dipakai |
| `unanswerable` | Apa yang tidak tersedia | Apa yang **ada** terdekat | Apa yang dibutuhkan agar bisa dijawab |

**Contoh keluaran yang benar untuk Q10** *(bandingkan dengan keluaran live)*

```
narasi:
  Keluarga pada desil 1 berjumlah 9.342 dari 71.370 keluarga di Aceh Tengah,
  atau 13,1% — proporsi terkecil kedua setelah desil 4 (8,5%). Sebarannya
  tidak merata: Pegasing mencatat 1.163 keluarga desil 1 (15,3% dari keluarga
  di kecamatan itu), sementara Bebesen 834 keluarga (7,1%).

  Peringatan data: agregat per desil hanya memuat desil 1–7 dan berjumlah
  67.702 keluarga, sedangkan total kabupaten 71.370 — 3.668 keluarga (5,1%)
  belum terpetakan ke desil. Persentase di atas memakai penyebut total
  kabupaten. Sumber: DTSEN Versi 4 (Des 2025) — BAPPEDA Aceh Tengah, offline.

visualisasi: table
  columns: ["Kecamatan", "Keluarga Desil 1", "Total Keluarga", "Persen", "Peringkat"]
  rows: 14 baris LENGKAP, kolom Persen terhitung, kolom Satuan tidak diperlukan
        karena satu satuan per kolom

rekomendasi:
  1. Pegasing, Silih Nara, dan Celala punya konsentrasi desil 1 tertinggi —
     jadikan prioritas verifikasi DTSEN periode berikutnya.
  2. Minta BAPPEDA melengkapi pemetaan desil 8–10 agar 3.668 keluarga yang
     belum terpetakan masuk dalam analisis kemiskinan.
  3. …
```

Perhatikan apa yang berubah: **ada pembagian**, **ada penyebut yang disebut**, **ada peringkat**, **ada peringatan data**, **rekomendasi merujuk angka spesifik**, dan **14 baris lengkap bukan 8**.

**WP5.4 — aturan pemakaian LLM**

| Aturan | Isi |
|---|---|
| N1 | Narasi deterministik **selalu** dihitung lebih dulu dan **selalu** disimpan. |
| N2 | LLM menerima narasi deterministik + `StatResult`, dan hanya boleh **menyusun ulang kalimat**. |
| N3 | Keluaran LLM divalidasi: himpunan angka **harus identik** dengan narasi deterministik. Bila berbeda → pakai yang deterministik. (`groundOutput` sudah memeriksa terhadap evidence; perketat menjadi terhadap narasi deterministik.) |
| N4 | Bila LLM gagal/timeout → narasi deterministik dipakai **tanpa** pesan "AI sibuk". Pengguna tidak boleh melihat kegagalan penyunting gaya sebagai kegagalan jawaban. |
| N5 | `rekomendasi` wajib merujuk **setidaknya satu angka atau satu nama wilayah** dari `StatResult`. Boilerplate `"Verifikasi angka di atas dengan <OPD> selaku produsen data"` **dilarang** sebagai satu-satunya rekomendasi. |

**WP5.5 — perluasan `HybridResponse` (aditif)**

```ts
export interface HybridResponse {
  narasi: string;
  visualisasi: { tipe: 'chart'|'table'|'map'|'metric'|'none'; konfigurasi: Record<string, any> };
  rekomendasi: string[];
  dataSource: string;
  timestamp: string;
  // ── baru (aditif; renderer lama tetap jalan bila field ini absen) ──
  analysis?: {
    archetype: Archetype;
    confidence: number;
    stats: StatResult[];          // hasil WP3
    metrics: MetricSummary[];     // ringkas, tanpa payload besar
    reconciliations: Reconciliation[];
    caveats: string[];
    dataQuality: { warnings: string[]; coverage: Record<string, number> };
    trace: string[];
  };
}
```

**Kriteria selesai WP5**
- 75 golden query: setiap jawaban punya **≥1 angka berpenyebut** bila diminta persen, **≥1 insight**, **≥1 caveat**, dan rekomendasi yang merujuk angka/wilayah.
- `AIResponseRenderer` menampilkan blok `caveats` dan `reconciliations` secara visual berbeda dari narasi (mis. panel kuning "Catatan data").
- Matikan LLM (kosongkan `AI_API_KEY`) → 75 golden query **tetap menghasilkan jawaban benar**, hanya lebih kaku.

---

### WP6 — Harness evaluasi & gerbang mutu  *(estimasi: 1,5 hari)*

**Konteks:** 200 unit test menguji fungsi, **nol** test menguji kualitas jawaban. Tidak ada cara mengetahui regresi.

**Tugas**

| ID | Tugas | Berkas |
|---|---|---|
| WP6.1 | Golden set 75 query ber-arketipe ke `src/services/statistics/__tests__/golden/`. | pakai `hermes-brief/data/golden-queries.json` (v2.2, 86 entri) sebagai titik awal |
| WP6.2 | Runner golden offline (tanpa LLM, tanpa DB): `npm run eval`. | **baru** `src/services/statistics/__tests__/golden.test.ts` |
| WP6.3 | Metrik kualitas + ambang kelulusan. | `vitest.config.ts`, `package.json` |
| WP6.4 | Smoke test live: `npm run eval:live` menembak `POST /api/query` (hormati rate limit 10/menit → jeda 7 dtk). | **baru** `scripts/eval-live.mjs` |
| WP6.5 | `tsc --noEmit` di pre-commit & di build Vercel. | `.githooks/pre-commit`, `package.json` |
| WP6.6 | Rekam baseline sebelum/sesudah di `docs/ai/EVAL-BASELINE-<tanggal>.md`. | — |
| WP6.7 | **Pisahkan 11 kasus `archetype: "gate"` (S1–S11) menjadi test keamanan/gerbang tersendiri**, bukan bagian uji routing. Wajib mencakup: matriks role × scope × sesi (WP0.12g), uji balik `pii-gate.sh` dengan NIK yang disengaja, `git grep` riwayat untuk password lama **di setiap branch yang masih hidup**, audit fail-closed, dan **test untuk setiap fungsi statistik yang digeneralisasi** (S11). Keluarkan dari `npm run eval` skor akurasi, tapi **blok PR bila ada yang merah**. | `src/app/api/dtsen/__tests__/`, `scripts/pii-gate.sh` |

**Metrik wajib (ambang kelulusan)**

| Metrik | Baseline 28 Agu | Baseline 29 Agu | Ambang |
|---|---|---|---|
| Akurasi routing arketipe (75 query) | ~23% | **~23%** (3 dari 13 ber-arketipe: Q5 `ranking`, Q8 `trend`, Q3 `unanswerable`) | **≥95%** |
| Pertanyaan "persen" menghasilkan angka persen | 0 dari 3 | **0 dari 3** | **3 dari 3** |
| Tabel campur satuan dalam satu kolom | Q1, Q10, Q11 | **Q1, Q4, Q13** | **0** |
| Baris tabel berkolom satuan kosong | 14 dari 15 (Q1) | **14 dari 15 (Q1)** | **0** |
| Konflik sumber tanpa rekonsiliasi | Q1 (4 angka), Q11 (2 angka) | **Q1 (4 angka), Q11 (2 angka), populasi DTSEN (3 angka), PBI (2 angka)** | **0** |
| `jiwa == keluarga` di rilis DTSEN | belum terdeteksi | **14 dari 14 kecamatan** | **0** |
| Query menggantung tanpa `event: result` | Q7 (>175 dtk) | **0** ✅ | **0**, batas 45 dtk |
| Narasi memakai istilah internal (`evidence`, "bukti pelaporan") | — | **Q14** | **0** |
| `vitest` | 4 gagal | **4 gagal** | **0 gagal** |
| `tsc --noEmit` | 29 (main) | **26 (live)** | **0 error** |
| Menolak padahal datanya ada | Q3 | **Q3** (kini tanpa pengakuan) | **0** |
| Data demo disajikan sebagai live | ada | **0** ✅ | **0** |

---

### WP7 — Hardening operasional  *(estimasi: 1 hari)*

| ID | Tugas | Alasan / bukti |
|---|---|---|
| WP7.1 | **Pin model deterministik.** Ganti `AI_MODEL=auto` dengan model bernama; simpan `auto` sebagai fallback. Catat model di `metadata.model`. | `auto` bisa berubah kapan saja di sisi provider → jawaban tidak reprodusen; AGENTS.md sendiri menyebut ini |
| WP7.2 | Batas waktu LLM **20 detik** (bukan 60). Bila lewat → pakai narasi deterministik + `caveat` "disajikan tanpa penyuntingan AI". | Q7 menggantung >175 dtk tanpa hasil |
| WP7.3 | Kirim `queryId` di event SSE pertama; simpan di `ChatSession.metadata`; tampilkan di UI. | Sekarang `metadata` observability tidak pernah sampai ke pengguna — tidak ada cara menautkan keluhan ke jejak |
| WP7.4 | Kirim event SSE `trace` (dari `QuestionPlan.trace`). | Debuggability; memenuhi R2.5 |
| WP7.5 | `/api/health` melaporkan: jumlah snapshot warehouse, tanggal snapshot terakhir, jumlah indikator multi-tahun, status SPLP DTSEN. | Sekarang `healthy` padahal warehouse kosong dan SPLP 401 |
| WP7.6 | Hidupkan cron warehouse + `POST /api/setup` sekali, lalu verifikasi `SapaIndicatorValue` terisi — ini prasyarat tren nyata. | `perubahan.tersedia: false` |
| WP7.7 | Perbaiki `EwsPanel` agar tidak diam saat `/api/ews` gagal. | §3 audit |

---

## 5. Definisi Selesai (semua wajib, terukur)

### Tingkat 0 — Aman (GERBANG MUTLAK; kalau ini belum lolos, yang lain tidak berarti)
```
Password dtsen_root sudah diganti          → login dengan password lama HARUS gagal
git grep -n "cPtnkHE7NYD3Gg_s" $(git rev-list --all)   → kosong
git grep -nE "[0-9]{16}" -- ':!src/data/excel'         → kosong
# cek DI SETIAP BRANCH yang masih hidup, bukan hanya main (30 Agu: ada di main DAN di v3):
for b in main hotfix/meeting-ready feat/ai-executive-answer-v3; do
  git show origin/$b:docs/ai/SESI-2026-08-29-dtsen-root-bnba.md | grep -cE "cPtnkHE7NYD3Gg_s|3216022603070011"
done                                              → 0, 0, 0   (31 Agu: 2, 2, 2 — masih bocor di ketiganya)
bash scripts/pii-gate.sh .   → OK, dan uji balik: sisipkan NIK palsu ke docs/uji.md → gate GAGAL
Ada dokumen dasar hukum & masa berlaku akun DTSEN_ROOT  (docs/ai/…)
```

### Tingkat 1 — Repo sehat
```
main == branch yang live di Vercel        (sudah ✅ per 29 Agu 16:33 WIB — jaga)
# jalankan di KETIGA branch selama main / hotfix / v3 masih hidup
rm -rf .next                                     # WAJIB sebelum tsc bila baru pindah branch
npx tsc --noEmit 2>&1 | grep -c "error TS1"      → 0 dulu; bila bukan 0, hitungan di bawah tidak berarti
npx vitest run                 → 0 failed        (31 Agu: 5 gagal di ketiganya)
npx tsc --noEmit               → 0 error         (31 Agu: main 26 · hotfix 26 nyata · v3 32)
npx next build                 → sukses          (sudah ✅ di ketiganya)
bash scripts/pii-gate.sh .     → OK
tidak ada berkas di luar struktur repo (cek: git ls-tree -r --name-only | grep -c '~'  → 0)
AGENTS.md baris "Deploy state" = fakta (PROD, jumlah commit, jumlah branch)
docs/LAPORAN-BRANCH-2026-08-29.md konsisten terhadap dirinya sendiri
```

### Tingkat 2 — Perilaku (offline, `npm run eval`)
```
75 golden query: akurasi arketipe ≥95%
3 pertanyaan "persen" → 3 angka persen berpenyebut
0 tabel campur satuan
0 konflik sumber tanpa rekonsiliasi
0 rekomendasi boilerplate-tunggal, DAN 0 rekomendasi kosong   (30 Agu: 3 kosong + 1 boilerplate)
0 insight tanpa angka   (setiap `ExecutiveInsight.text` harus memuat ≥1 angka bersumber)
LLM dimatikan → 75 query tetap benar
11 kasus gate (S1–S11) → 11/11 lulus, dan `git grep` riwayat untuk kredensial/NIK → kosong
0 istilah internal: evidence|evidensi|bukti pelaporan|grounding|planner|payload|orchestrator
73 test audit (hermes-brief/audit-tests/) lulus — dan 4 test di antaranya SUDAH DIMUTAKHIRKAN
  untuk perilaku yang DIPERBAIKI (bukan lagi meng-assert bug): keluarga-proxy, tren <14 titik,
  rekomendasi fluktuatif/stabil, overallIndex NaN
0 kolom "Nilai" yang mencampur cacahan dan persen dalam satu tabel (bukti Q1: 14 baris cacahan
  + 1 baris "4,9 Persen" dalam satu kolom)
1 bentuk kanonik nama kecamatan di SELURUH sumber (sekarang 4: LUT TAWAR / Lut Tawar /
  LAUT TAWAR / Laut Tawar)
```

### Tingkat 3 — Live (setelah deploy ke Vercel)
**Jangan menembak live bila kode produksi tidak berubah.** `/api/query` dibatasi 10/menit dan
60/jam per IP. Pada 31 Agu saya **tidak** menjalankan probe putaran 5 karena tiga commit baru di
`main` tidak menyentuh `src/` sama sekali (`git diff --name-only e07edae origin/main -- src/` → 0)
dan fitur `hotfix` belum naik (`/api/bapokting` → 404). Mengukur ulang berkas yang identik hanya
membuang kuota. Jalankan probe **begitu `hotfix` atau `v3` benar-benar di-deploy**, dan sertakan
bukti deploy-nya (commit + satu endpoint yang hanya ada di branch itu → 200).

Jalankan `hermes-brief/scripts/probe-live.sh` terhadap `https://cc-acehtengah.vercel.app` dan **tempel keluaran mentahnya** di PR. Ke-14 pertanyaan audit harus menunjukkan perbaikan yang sesuai tabel di §2 dokumen ini.

**Sebelum mempercayai "CEK: -" (bersih), periksa alatnya.** Pada putaran 3 saya menandai Q3 dan Q6
bersih; itu **salah** — pola checker hanya mengenal `evidence`, sedangkan jawaban live menulis
`evidensi`. Alat ukur yang buta lebih berbahaya daripada tidak mengukur, karena ia membuat cacat
tampak selesai. Karena itu: (a) seluruh logika cek kini ada di satu berkas
`scripts/cek-jawaban.py` — ubah di situ, jangan menyalinnya; (b) jalankan ulang checker atas
**berkas `.sse` yang tersimpan** untuk memastikan perubahan pola tidak menghapus temuan lama;
(c) tempel keluaran `CEK` apa adanya, termasuk yang memalukan.

Khususnya:

| Query | Harus berubah menjadi |
|---|---|
| Q1 | ada deret/penjelasan tren **atau** pernyataan eksplisit "tren tidak tersedia karena hanya 1 titik tahun" + rekonsiliasi 654/730/4,9%/31,4% |
| Q2 | topik **jumlah siswa**, bukan bantuan siswa miskin |
| Q3 | memakai agregat DTSEN per kecamatan → angka kemiskinan per kecamatan. **Catatan penting:** jawabannya jujur tetapi menyesatkan — ia menulis *"perbandingan angka kemiskinan secara spesifik antar kecamatan tidak tersedia"* dan *"tidak tersedia dalam evidensi yang ada"*, padahal data itu **ada** di DTSEN; yang terjadi hanyalah query tidak mengandung kata "DTSEN" sehingga planner memilih SAPA. Yang harus berubah adalah **rutenya**, bukan kejujurannya. Persisten di 4 putaran. Jangan juga regresi ke template daftar indikator rupiah (regresi pagi 29 Agu). |
| Q6 | menjawab **total** penduduk (penyebut sah: 234.740 jiwa / 71.370 KK di DTSEN), bukan sub-kelompok. Selama 4 putaran pertanyaan ini dijawab bergantian "kelas menengah 94.754 jiwa" / nol angka penduduk — bukti tidak ada determinisme. |
| Q8, Q9, Q5 | rekomendasi **tidak boleh kosong**. 30 Agu: 3 pertanyaan menghasilkan `rekomendasi: []`. Kosong lebih buruk daripada boilerplate — pengguna tidak dapat apa-apa. |
| Q5 | nama sumber terisi + penjelasan + alternatif |
| Q6 | angka penduduk, atau pernyataan jujur indikator penduduk tidak ada + penyebut DTSEN disebut |
| Q7 | **sudah benar (5 dtk)** — jaga, jangan regresi |
| Q9 | membandingkan hal yang sebanding, atau menolak dengan alasan satuan |
| Q10/Q12 | **angka persen** dengan penyebut disebut; `jiwa != keluarga` |
| Q11 | satu angka keluarga Bebesen + varian disebut (label desa **sudah benar** sejak 29 Agu — jaga) |
| Q13 | persen per kecamatan; `730` tidak dobel; `Laut Tawar` bukan `LUT TAWAR` |
| Q14 | angka OPD **tanpa** istilah internal ("19 bukti pelaporan data dari 5 OPD" harus hilang) |

### Sudah benar — pertahankan, jangan dikerjakan ulang

Ditemukan/diperbaiki sendiri oleh tim pada 29 Agu. **Jangan diregresi:**

| Sudah benar | Bukti |
|---|---|
| Data demo DTSEN dihapus total | `grep -rn "fetchDtsenDemoData\|DemoFilter" src/` → kosong |
| Format ribuan id-ID di narasi | Q7: `29.019`, `50.162`, `38.294` |
| Q7 tidak menggantung | 5 dtk, ada `event: result` |
| Label desa DTSEN tidak kosong lagi | Q11: `KEMILI (BEBESEN): 4.490 jiwa` |
| Filter kecamatan case-insensitive | `mode: 'insensitive'` di `dtsen/breakdown` & `dtsen/query` |
| Jalur breakdown deterministik tanpa LLM | `GET /api/dtsen/breakdown` + `BreakdownExplorer.tsx` — pola yang **benar**, lanjutkan ke arketipe lain |
| Halaman transparansi sumber | `/dashboard/status` + diagram relasi SVG |
| 5 route DTSEN hidup kembali | `.bak` tersisa 3 |
| **`main` == yang live** | `git rev-parse origin/main origin/hotfix/meeting-ready` → keduanya `e07edae` |
| **`DTSEN_NIK_KEY` fail-closed** | `dtsen/import/route.ts:68-71` + `dtsen/query/route.ts:162-165`: kunci hilang atau `< 16` char → **503**, bukan lanjut dengan kunci kosong. Teruji baca kode 31 Agu |
| **Algoritma & format AES-256-GCM** | 25 test di `audit-tests/dtsen-crypto.test.ts` lulus: IV acak per panggilan, offset `iv(12)‖tag(16)‖ct` benar, tag GCM menolak ciphertext yang diubah 1 bit, kunci berbeda tidak bisa mendekripsi, `canSeeFullIdentitas` benar atas 11 masukan. **Yang rusak hanya validasi panjang kunci** (WP0.14) |
| **Matematika `hitungStdDev` & `hitungPersentase`** | simpangan baku **sampel** (pembagi `n−1`) teruji: `[10,12,14,16,18]` → `3,16228`; `n=1` → `0`; `(0→50)` → `0` bukan `Infinity`. Tren dengan 14 titik → `'naik'`, `pct=25` |
| **Berkas `.bak` tidak menyimpan rahasia** | `grep -ciE "sk-\|password\|secret\|token\|apikey"` → **0** di ketiganya; versi `v3` identik dengan `.bak` kecuali 1 baris import |
| **Mesin statistik satu-domain sudah ada** (hotfix) | `src/lib/bapokting-stats.ts` 322 baris: `hitungStdDev` (simpangan baku **sampel**, pembagi `n−1` — benar), `hitungPersentase`, tren 7-hari-vs-7-hari ambang ±2 %, indeks volatilitas, agregasi kategori/kecamatan. **Titik tolak WP3, jangan ditulis ulang** |
| **Narasi tanpa LLM untuk Bapokting** (hotfix) | `generateAiNarrative()` baris 245: peringkat top-5 termahal/termurah dari `hargaAvg`, daftar naik/turun, rekomendasi — semua diturunkan dari angka yang dihitung. Commit `6d03935`: *"jalur deterministik harga komoditas tanpa LLM"*. Ini pola A4 yang brief ini minta |
| **Error `ai-orchestrator.ts` turun 4 → 1** (hotfix) | integrasi Bapokting merapikan sebagian tipe `{ label }` vs `{ label, releaseNumber, status, publishedAt }` |
| **`.bak` habis di `v3`** | `git ls-tree -r --name-only origin/feat/ai-executive-answer-v3 \| grep -c '\.bak$'` → **0** (dari 3 di `main`); `ews`/`datasets`/`datasets/[slug]` dihidupkan (`c2dfe9f`) |
| **Parser angka yang benar sudah ada** | `src/services/opd-drilldown.ts:35` `parseNumericId` + test di `opd-drilldown.test.ts` — tinggal dipindah & dipakai (WP1.2/WP1.6) |
| **Test bertambah 18 di `v3`** | `vitest` 200 → **218** test; ada jalur rollback `NEXT_PUBLIC_AI_EXECUTIVE_UI=false` |
| **BNBA individu digembok** | `curl "…/api/dtsen/breakdown?scope=individu…"` → **401** tanpa sesi |
| **Identitas asli dienkripsi at-rest** | `src/lib/dtsen-crypto.ts`: AES-256-GCM, `iv(12)‖tag(16)‖ct`, base64url `DTSEN_DATA_KEY` ≥32 B, ditolak bila bukan 32 B |
| **Hanya `DTSEN_ROOT` yang melihat identitas asli** | `canSeeFullIdentitas()` = `role === 'DTSEN_ROOT'` |
| **Akses individu diaudit** | `AuditAction 'BREAKDOWN_INDIVIDU'` ditulis di jalur `scope=individu` |
| **`scope` tak dikenal ditolak** | `?scope=xxx` → **400** |
| **Tombol 🔐 Login tersedia publik** | `BreakdownExplorer.tsx` + header dashboard |
| **Enum & migrasi role selaras** | `prisma/schema.prisma` dan `CREATE TYPE` di `setup/admin/route.ts` sama-sama memuat `DTSEN_ROOT` |
| **Defleksi NIK di `/api/query` masih jalan** | pertanyaan NIK → ditolak dengan alasan |

### Tingkat 4 — Dokumentasi
- `AGENTS.md` diperbarui: routing baru, lapisan statistik, metrik evaluasi, konfigurasi AI yang benar.
- `docs/ai/RENCANA_AI_SOURCE_OF_TRUTH.md` ditambah **Fase M — Statistik & Narasi** (matriks `M1–M12`, mengikuti gaya `R1–R12` yang sudah ada).
- `docs/ai/EVAL-BASELINE-<tanggal>.md` berisi keluaran sebelum/sesudah.
- Catatan sesi di `docs/ai/SESI-<tanggal>-statistical-layer.md` (mengikuti gaya berkas sesi yang sudah ada).

---

## 6. Larangan

| # | Dilarang | Alasan |
|---|---|---|
| D1 | Mengubah `AI_MODEL`/prompt sebagai "perbaikan" utama | 14 kegagalan berasal dari pra-LLM |
| D2 | Menambah kata kunci baru ke `KEYWORD_MAP` **atau pendek-sirkuit substring baru** | itu akar Q1/Q2/Q4/Q13. **Sudah dilanggar lagi 31 Agu:** `ai-orchestrator.ts:332` (hotfix) menambah `priceKeywords = /\b(harga\|prix\|market\|commodity\|komoditas\|sayur\|buah\|pangan\|bahan pokok)\b/i` + daftar `specificCommodities` berbasis substring. Rantainya kini tiga tingkat. Fitur Bapokting-nya bagus; **cara routingnya** yang harus diganti di WP2, bukan dipertahankan |
| D3 | `// @ts-ignore`, `as any` baru, atau menghapus test yang gagal | 26 error `tsc` + 5 test gagal sudah lolos ke `main`; **32** lolos ke `v3`; **26** lolos ke `hotfix` di balik satu galat sintaks |
| D13 | **Mempercayai hitungan `tsc` tanpa memeriksa galat sintaks lebih dulu** | `hotfix` melaporkan **1 error** padahal nyata **26** — `TS1005` di `scripts/debug-bapokting.ts:95` menghentikan pemeriksaan. Selalu `grep -c "error TS1"` dan `rm -rf .next` dulu |
| D14 | **Menggeneralisasi kode tanpa test** | `hitungStatsBapokting` (stdDev, tren, volatilitas) lahir tanpa satu pun test; `bapokting-viz.test.ts` hanya menguji `buildVizFromEvidence` |
| D4 | Menampilkan data demo sebagai data live | sudah pernah terjadi (lihat §4 dokumen sesi 28 Agu) |
| D5 | Menghapus/melonggarkan k-anonimitas `k≥5`, defleksi NIK, audit trail, gerbang `scope=individu`, atau `canSeeFullIdentitas` | UU 27/2022 |
| D11 | Meng-commit password, kunci enkripsi, atau NIK asli **di mana pun** dalam repo — termasuk `docs/ai/` dan catatan sesi | Sudah terjadi 29 Agu di `origin/main`; gate tidak memindai `docs/` |
| D12 | Menulis contoh verifikasi memakai data warga asli (walau sebagian termask) | Pakai data sintetis |
| D6 | Menyatakan kausalitas dari korelasi | S4 |
| D7 | Menghitung tren dari 1–2 titik | S1 |
| D8 | Menumpuk satuan berbeda dalam satu kolom tabel | WP4.2 |
| D9 | Mengklaim "data lengkap" bila cakupan <100% tanpa menyebut angkanya | WP4.4 |
| D10 | ~~Bekerja di `main` sebelum WP0.1 selesai~~ **tidak berlaku lagi** — `main` sudah sinkron (`e07edae`). **Pengganti:** jangan mengasumsikan acuan commit di dokumentasi masih tertelusur; riwayat **sudah ditulis ulang** dan `main` kini hanya 13 commit. Selalu mulai dari `git fetch --prune && git rev-parse origin/main`. |

---

## 7. Urutan PR yang disarankan

| PR | Isi | Gerbang |
|---|---|---|
| **PR-M00** | **WP0.00 saja** — cabut kredensial + PII, bersihkan riwayat, perbaiki `pii-gate.sh` | gate menolak NIK yang disengaja · password lama ditolak · `git grep` riwayat bersih |
| **PR-M0a** | **WP0.0 + WP0.2b** (hotfix `jiwa == keluarga` **beserta test yang menguncinya**) — deploy segera | `breakdown` → `jiwa != keluarga` · `audit-tests/dtsen-keluarga.test.ts` 9/9 lulus **dengan makna baru** · `faseJ:97` tidak lagi meng-assert proxy |
| **PR-M0f** | **WP0.14** (validasi kunci `DTSEN_DATA_KEY` `=== 32`) | test 3 bentuk kunci lulus · kunci hex 64-char ditolak dengan pesan, bukan `RangeError` |
| **PR-M0g** | **WP0.15** (4 cacat mesin statistik Bapokting) | `audit-tests/bapokting-stats.test.ts` diperbarui: tren <14 titik → `insufficient` · 1 komoditas tidak lagi "paling fluktuatif **dan** paling stabil" · `overallIndex` bukan `NaN` · `hargaAvg` tertimbang |
| **PR-M0h** | **WP0.16** (satu normalisasi kecamatan untuk semua jalur) | satu fungsi dipanggil dari 5 berkas · 14 alias terisi · `AGENTS.md:145` diperbarui |
| **PR-M0c** | **WP0.12a–i** (role & BNBA) | matriks role teruji · audit fail-closed · batas laju aktif |
| **PR-M0d** | **WP0.13** (tata kelola `main` / `hotfix` / `v3`) | urutan merge tertulis di `docs/STATUS-CC.md` · tidak ada yang di-merge sebelum PR-M00 & PR-M0a masuk |
| **PR-M0e** | **WP0.5** (gerbang `tsc` yang jujur: `rm -rf .next` + hitung `TS1xxx` terpisah) | `hotfix` melaporkan **26**, bukan 1 · galat sintaks `debug-bapokting.ts:95` dibenahi |
| **PR-M0b** | WP0.1–WP0.11 | `vitest` 0 gagal · `tsc` 0 error (**di kedua branch**) · `main` == live |
| **PR-M1** | WP1 (semantic layer) + test | ≥60 test baru · regresi parser |
| **PR-M2** | WP2 (router) + golden routing test | akurasi arketipe ≥95% |
| **PR-M3a** | **WP3.0a–c** (beri test `hitungStatsBapokting`, betulkan `arah:'stabil'`, angkat `hitungStdDev`/`hitungPersentase` ke `statistics/compute.ts`) | test baru hijau · `tsc` bersih untuk `bapokting-stats.ts` · tidak ada dua implementasi stdDev |
| **PR-M3** | WP3 (stat engine) + test | ≥40 test · kasus batas lengkap |
| **PR-M4** | WP4 (rekonsiliasi + plausibilitas) | regresi Q1, Q11, Q13 |
| **PR-M5** | WP5 (narasi) + UI | 75 golden benar tanpa LLM · 11 kasus gate hijau |
| **PR-M6** | WP6 (eval harness) + baseline | `npm run eval` hijau |
| **PR-M7** | WP7 (hardening) + deploy | `probe-live.sh` ditempel di PR |

Setiap PR: **satu** paket kerja, test lebih dulu, keluaran perintah ditempel di deskripsi PR.

---

## 8. Berkas pendukung brief ini

| Berkas | Isi |
|---|---|
| `hermes-brief/AUDIT-LIVE-2026-08-29.md` | Seluruh bukti lapangan + perintah reproduksi |
| `hermes-brief/data/golden-queries.json` | **86** entri (v2.2): 75 query golden ber-arketipe (kriteria `mustInclude`/`mustNotInclude`/`mustCompute`) + **11 kasus `gate` S1–S11** untuk keamanan, otorisasi, dan gerbang mutu |
| `hermes-brief/scripts/probe-live.sh` | Penembak 14 pertanyaan audit ke situs live (SSE); dukung `BASE`, `ONLY`, `JEDA`, `OUT` |
| `hermes-brief/scripts/cek-jawaban.py` | **Sumber kebenaran seluruh cek cacat.** Bisa dijalankan ulang atas berkas `.sse` tersimpan tanpa menembak situs: `python3 scripts/cek-jawaban.py <berkas.sse> <detik> "<pertanyaan>"` |
| `hermes-brief/README.md` | Peta singkat: apa isinya, urutan baca, cara menjalankan probe |

---

## 9. Kalimat pembuka untuk Hermes Agent (salin apa adanya)

```
Anda mengerjakan repo github.com/niumination/cc-acehtengah (SAPA Smart AI Aceh Tengah).
Baca dulu, berurutan:
  1. hermes-brief/HERMES-INSTRUCTION.md   ← instruksi kerja Anda
  2. hermes-brief/AUDIT-LIVE-2026-08-29.md ← bukti lapangan
  3. hermes-brief/data/golden-queries.json ← kriteria kelulusan
  4. AGENTS.md di branch hotfix/meeting-ready
  5. docs/ai/RENCANA_AI_SOURCE_OF_TRUTH.md

KONDISI PER 31 AGU 2026 14:20 UTC — sudah diaudit MENDALAM: fungsi produksi
dijalankan dengan data sintetis, bukan sekadar dibaca. 73 test audit di
hermes-brief/audit-tests/ SEMUA LULUS, jadi tiap klaim di bawah terbukti.
Jalankan ulang:
  cd cc-acehtengah && git checkout -B audit-hotfix origin/hotfix/meeting-ready && npm ci
  cp -r hermes-brief/audit-tests/*.test.ts src/__audit/ && npx vitest run src/__audit/

  • 🛑 PALING DULU: password `dtsen_root` + satu NIK asli 16 digit ter-commit di
    docs/ai/SESI-2026-08-29-dtsen-root-bnba.md:28 dan :52, ada di TIGA branch
    (main, hotfix/meeting-ready, feat/ai-executive-answer-v3). URL mentah
    raw.githubusercontent.com masih 200 tanpa login. `pii-gate.sh` tidak disentuh.

  • 🔴 BUG `jiwa == keluarga` DIREPRODUKSI dengan fungsi produksi (5 jiwa / 2 KK
    benar → 5 jiwa / 5 "keluarga" saat no_kk hilang, kosong, atau 15 digit).
    Penyebab: dtsen-import.ts:153 mengecualikan no_kk dari kolom wajib + :205
    memakai `individu:<hash>` sebagai proxy + :249 menghitung keluarga sebagai
    banyaknya keluargaId unik. Skala: 222.643/222.643 = 1,00 jiwa per keluarga;
    sumber yang sama menyatakan 71.370 KK / 234.740 jiwa = 3,29 (DB
    menggelembung 3,12×).
    PENTING: bug ini DIKUNCI oleh test yang sudah ada —
    `faseJ.dtsen-impor.test.ts:97` "keluargaId fallback deterministik saat no_kk
    kosong" meng-assert proxy itu sebagai perilaku diharapkan. Memperbaiki :205
    akan membuat test itu merah. Kerjakan WP0.0 + WP0.2b bersamaan.

  • 🔴 KRIPTO: algoritmanya BENAR (25 test lulus: IV acak, format iv12|tag16|ct,
    GCM menolak ciphertext yang diubah, hanya DTSEN_ROOT boleh identitas asli). Yang berlubang:
    dtsen-crypto.ts:13 memakai `b.length >= 32` padahal AES-256 butuh TEPAT 32.
    Kunci 33–47 byte lolos lalu MELEMPAR `RangeError: Invalid key length` —
    termasuk 64-char hex, bentuk paling wajar untuk kunci 256-bit. `encryptField`
    tanpa try/catch. Perbaikannya satu karakter (WP0.14): `=== 32`.

  • ✅ MESIN STATISTIK SUNGGUHAN sudah ada di hotfix: src/lib/bapokting-stats.ts
    (322 baris). Matematikanya BENAR (stdDev sampel pembagi n−1, tren benar dgn
    14 titik, persen aman dari Infinity). JADIKAN TITIK TOLAK WP3.
    Tapi 4 cacat terbukti (WP0.15): tren <14 titik diam-diam "stabil" tanpa tanda;
    satu komoditas disebut "paling fluktuatif" DAN "paling stabil" dengan CV
    identik; overallIndex = NaN saat data kosong (0/0); hargaAvg kategori =
    rata-rata dari rata-rata (20.000 vs tertimbang 12.500). Plus 2 ternari mati
    (`? 'naik' : 'naik'`) dan error tipe di baris 156. Dan NOL test.

  • 🔴 PARSER: diukur atas 9 masukan nyata. Yang rusak (sapa-client.ts:433) salah
    7 dari 9 — "31,4"→314, "16.000"→16, "4,9"→49, PDRB & "Rp 1.250.000"→NaN.
    `parseNumericId` (hanya di v3) benar 8 dari 9; yang satu mengembalikan null
    (gagal AMAN) untuk "Rp 1.250.000". Salinan parser rusak: main 2, hotfix 3,
    v3 2. Kerjakan WP1.2 + WP1.6.

  • 🔴 NORMALISASI KECAMATAN: tiga jalur, tiga bentuk keluaran (DTSEN/BAPPEDA
    ALL-CAPS · dtsen-import KEC_NORM Title Case · dtsen-multisource kecLookup
    Title Case) dan SAPA/Excel mentah. KEC_ALIAS berisi SATU entri
    ('lut tawar' → 'Laut Tawar') dan kecLookup NOL kali dipanggil dari
    dtsen-planner / grounding / ai-orchestrator / sapa-client. AGENTS.md:145
    mengklaim masalah ini sudah selesai. Kerjakan WP0.16.

  • 🟠 SATU TABEL, ENAM MASALAH (bukti mentah Q1, 31 Agu): kolom "Nilai"
    mencampur 14 baris cacahan balita (Satuan kosong) dengan 1 baris "4,9 Persen";
    tanpa penyebut; diminta tren 5 tahun diberi satu titik; 654 tidak
    direkonsiliasi dengan 4,9%; nama indikator salah ketik ("Pendek dam Sangat
    Pendek") ikut tersaji; narasi menulis "tidak ada data per-orang (UU PDP)"
    padahal sumbernya STUNTING BY NIK.xlsx.

  • 🟠 ANGKA INDIKATOR TIDAK STABIL: 13:40 UTC stats=1790 vs report=1810
    (selisih 20); 06:04 UTC stats=1793 vs report=1805 (selisih 12). Keduanya
    bergeser karena dihitung ulang dari SAPA live. Inilah sebabnya Q14 pernah
    dijawab 38 OPD lalu 5 OPD untuk pertanyaan yang sama.

  • ⚠️ JEBAKAN `tsc`: hotfix melaporkan 1 error karena galat sintaks
    (scripts/debug-bapokting.ts:95 TS1005) menghentikan pemeriksaan; nyatanya 26.
    Selalu `grep -c "error TS1"` dulu, dan `rm -rf .next` sebelum tsc bila baru
    pindah branch.

  • TIGA BRANCH SALING MENYIMPANG: main d86bdad (produksi = kode e07edae, 3 commit
    baru nol perubahan src/) · hotfix 14cfb19 = main+23 (Bapokting) ·
    v3 1dd5ed7 = main+13 (executive UI, .bak habis, parseNumericId).
    hotfix dan v3 TIDAK saling memuat. /api/bapokting → 404 (belum deploy).

  • YANG BENAR, JANGAN DIREGRESI: DTSEN_NIK_KEY fail-closed (503 bila kunci
    hilang/<16 char) · algoritma AES-256-GCM · matematika stdDev/tren/persen
    Bapokting · gerbang scope=individu 401 · audit BREAKDOWN_INDIVIDU ·
    tombol 🔐 Login · .bak tidak menyimpan rahasia · data demo dihapus.

URUTAN: WP0.00 (cabut kredensial+PII di SEMUA branch) → WP0.0 + WP0.2b (hotfix
data + test yang menguncinya) → WP0.14 (kunci kripto) → WP0.12 (role/BNBA)
→ WP0.13 (tata kelola 3 branch) → WP0.5 (gerbang tsc jujur) → WP0.15 (mesin
Bapokting) → WP0.16 (normalisasi kecamatan) → WP0.1–WP0.11 → WP1 → WP3.0 → WP3 → WP7.
Jangan menyentuh prompt LLM sebelum WP1–WP3 selesai. Bukti paling telanjang:
3 pertanyaan yang eksplisit minta "persen" menghasilkan NOL angka persen, di
EMPAT putaran uji — dan di Q1 satu kolom "Nilai" mencampur cacahan dengan persen.

Setiap klaim "selesai" wajib disertai keluaran perintah yang benar-benar dijalankan:
  rm -rf .next · npx tsc --noEmit 2>&1 | grep -c "error TS1"   (harus 0 lebih dulu)
  npx vitest run · npx tsc --noEmit · npx next build · npm run eval · bash scripts/pii-gate.sh .
Jalankan di KETIGA branch (main, hotfix/meeting-ready, feat/ai-executive-answer-v3)
selama ketiganya masih hidup. Untuk PR-M7, sertakan keluaran
hermes-brief/scripts/probe-live.sh terhadap situs live — tetapi hanya bila kode
produksi benar-benar berubah, dan buktikan lebih dulu (commit + satu endpoint yang
hanya ada di branch itu → 200).
Bila ada yang tidak bisa Anda jalankan, katakan apa adanya dan sebut alasannya —
jangan menandai pekerjaan yang belum terverifikasi sebagai selesai.
```
