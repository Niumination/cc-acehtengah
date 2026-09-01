# HERMES — INSTRUKSI GELOMBANG 3
## Menuntaskan sisa pekerjaan SAPA Smart AI Aceh Tengah

**Untuk:** agen Hermes
**Dari:** audit independen Arena.ai
**Tanggal:** 1 September 2026, 02:00 WIB (31 Agu 19:00 UTC)
**Repo:** https://github.com/niumination/cc-acehtengah
**Live:** https://cc-acehtengah.vercel.app
**Titik berangkat:** `hotfix/meeting-ready` @ **`9fd04a2`** (sudah diverifikasi: `tsc` 0 error · vitest 278 lulus · `next build` ✅)

---

## 0. Ringkasan untuk yang buru-buru

Gelombang 1–2 **berhasil besar**. Dua puluh dua commit menghapus hampir semua cacat data dan statistik
yang saya temukan. Angka `tsc` 0 dan 278 test hijau itu nyata — saya jalankan ulang sendiri.

Tapi ada **tiga hal yang belum tuntas**, dan satu di antaranya masih **🔴 kritis**:

| # | Status | Apa |
|---|---|---|
| 🔴 **A** | **BELUM SELESAI** | Password `dtsen_root` + satu NIK warga **masih bisa diunduh siapa saja tanpa login dari 4 URL publik**. `LEAK_COUNT 0` tidak menangkapnya. |
| 🔴 **B** | **BELUM SAMPAI** | Perbaikan belum ter-deploy. Live masih `jiwa == keluarga`, masih `ALL-CAPS`, `/api/ews` 404, `/dashboard/akun` 200. Plus **skema Prisma berubah secara merusak** — deploy tanpa migrasi DB akan mematikan situs. |
| 🟠 **C** | **CACAT** | Integrasi Question Router (WP2) **tidak berjalan** dan **memperkenalkan kembali bug parser** yang baru saja dihapus. |

Setelah A–C beres, sisa pekerjaan adalah **inti dari seluruh brief ini**: WP4 (fusi multi-sumber),
WP5 (narasi "data bercerita"), WP6 (harness evaluasi). Ketiganya belum disentuh, dan ketiganya
yang mengubah kualitas jawaban AI — bukan kosmetik.

**Urutan wajib:** A → B → C → WP4 → WP5 → WP6. Jangan melompat.

---

## 1. Apa yang sudah saya verifikasi sendiri (jangan diulang, jangan diregresi)

Semua angka di bawah hasil perintah yang saya jalankan pada `9fd04a2`, bukan klaim yang saya terima.

### 1.1 Gerbang mutu — klaim Hermes **terkonfirmasi**

```
$ rm -rf .next && npx tsc --noEmit 2>&1 | grep -c "error TS1"   →  0     (galat sintaks)
$ npx tsc --noEmit 2>&1 | grep -c "error TS"                   →  0     ✅
$ npx vitest run   →  Test Files 14 passed · Tests 278 passed          ✅
$ npx next build   →  selesai tanpa error                              ✅
```

Lima test yang dulu gagal (`faseI.dtsen-gate` + 4× `faseK.dtsen-planner`) **sudah hijau** — WP0.3
benar-benar dikerjakan, bukan di-`skip`.

> Catatan kecil: Hermes menulis "13 files"; sebenarnya **14**. Bukan masalah, tapi jangan kutip
> angka tanpa menjalankannya.

### 1.2 Perbaikan yang **terbukti** dengan test yang saya tulis

Saya punya `hermes-brief/audit-tests/verif-post.test.ts` (9 test) yang meng-assert **perilaku yang
sudah diperbaiki**. Semuanya lulus di `9fd04a2`:

```bash
cd cc-acehtengah && git checkout -B verify-hotfix origin/hotfix/meeting-ready && npm ci
mkdir -p src/__audit && cp hermes-brief/audit-tests/verif-post.test.ts src/__audit/
npx vitest run src/__audit/verif-post.test.ts     # → 9 passed
```

| WP | Perbaikan | Bukti yang saya lihat sendiri |
|---|---|---|
| **0.0 + 0.2b** | `no_kk` wajib; proxy keluarga dicabut | `dtsen-import.ts:148` tidak lagi mengecualikan `no_kk`; `:195` menolak bila bukan 16 digit; `:200` `keluargaId: \`kk:${hmac}\`` tanpa fallback. `faseJ.dtsen-impor.test.ts` naik 15 → **20 test** |
| **0.14** | Kunci AES tepat 32 byte | `dtsen-crypto.ts:13` → `return b.length === 32 ? b : null;` |
| **0.15** | 4 cacat statistik Bapokting | `cukupData` per komoditas · `peringatan` di tingkat atas · `overallIndex = 0` saat kosong (bukan `NaN`) · `hargaAvg` kategori **tertimbang** · rekomendasi tidak lagi kontradiktif · dua ternari mati dihapus |
| **1.2** | Parser angka terpusat | **0 salinan** parser rusak tersisa. `src/lib/parse-numeric.ts` dipakai `sapa-client`, `grounding`, `metric`. **14 dari 14 kasus benar**, termasuk `"Rp 1.250.000" → 1250000` — persis lubang yang saya sebut di Rev 5 |
| **0.5** | Gerbang `tsc` jujur | `scripts/typecheck.sh` (`rm -rf .next` + laporan TS1); pii-gate di pre-commit atas seluruh tree |
| **0.9** | `/dashboard/akun` dilindungi | `middleware.ts` — `protectedPaths` + `matcher` memuat `/dashboard/akun/:path*` |
| **0.10** | Format id-ID di sel tabel | `AIResponseRenderer.tsx:101 formatAngka()` dipakai di `:163` (sel tabel). `"33693"` → `"33.693"` |
| **0.8** | Rate limit breakdown | `breakdown/route.ts:23,81` — `checkRateLimit` + 429 |
| **0.6** | `/api/ews` dihidupkan | `src/app/api/ews/route.ts` ada, mengembalikan `{alerts, ready}`; tiga `.bak` dihapus |
| **0.4** | Skema Prisma sinkron | model `Skpd`, `Dataset`, `Indicator`, `SapaSnapshot` ada (⚠️ lihat §3.2) |
| **0.12** | NIK keluar dari kode | `git grep -E "\b[0-9]{16}\b"` di `src/` → **0** |
| **3.0c** | Satu implementasi stdDev | `src/lib/statistics/compute.ts` — `describe()`, `growth()`, `classifyTrend()`; `bapokting-stats` memakainya (aturan A7 terpenuhi) |
| — | Kebersihan | `.bak` = **0**; path nyasar `~/Desktop/...` = **0** |

**Lapisan semantik sudah berdiri** dan ini aset paling berharga dari gelombang 2:
`src/lib/statistics/{types,normalize,metric,indicator-registry,compute}.ts` + 76 test
(69 di `semantic-layer.test.ts`, 7 di `compute.test.ts`). `MeasureType` sudah memisahkan
`count` / `rate_percent` / `ratio` / `index` / `currency` — **ini fondasi yang tepat** untuk WP5.
Jangan bangun ulang; pakai.

---

## 2. 🔴 TUGAS A — Kebocoran kredensial **belum** tuntas

Ini masih P0. Klaim "WP0.00 selesai, LEAK_COUNT 0" **tidak berarti kebocorannya tertutup.**

### 2.1 Bukti: 4 URL publik masih membocorkan password

Saya uji 1 Sep 02:00 WIB, **tanpa autentikasi apa pun**:

```
GET https://raw.githubusercontent.com/niumination/cc-acehtengah/main/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md
    → HTTP 200 · password ADA · NIK ADA

GET https://raw.githubusercontent.com/niumination/cc-acehtengah/feat/ai-executive-answer-v3/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md
    → HTTP 200 · password ADA · NIK ADA

GET https://raw.githubusercontent.com/niumination/cc-acehtengah/14cfb19125f2e328b9200aab9cde5a226a4020f0/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md
    → HTTP 200 · password ADA · NIK ADA        ← commit lama, selalu bisa diakses

GET https://raw.githubusercontent.com/niumination/cc-acehtengah/hotfix/meeting-ready/scripts/pii-gate.sh
    → HTTP 200 · password ADA                  ← lihat 2.3, ini yang paling ironis
```

### 2.2 Mengapa `LEAK_COUNT 0` menyesatkan

`pii-gate.sh` memindai **working tree saat ini**. Ia tidak bisa dan tidak pernah memindai **sejarah
git**. Saya hitung langsung, per commit:

| Ref | commit yang berkas SESI-nya masih berisi password |
|---|---|
| `wp0.00-pii-cleanup` | **0** ✅ |
| `hotfix/meeting-ready` | **29** 🔴 |
| `main` | **6** 🔴 |
| `feat/ai-executive-answer-v3` | belum saya hitung, tip-nya bocor |

Selama ref lama masih ada di server, `git clone` mengambil semuanya. Redaksi di tip **tidak**
menutup apa pun.

### 2.3 `pii-gate.sh` sendiri menerbitkan passwordnya

Baris 14 di `hotfix/meeting-ready`:

```python
cred_re=re.compile(r'(cPtnkHE7NYD3Gg_s|sk-[A-Za-z0-9_-]{20,}|DTSEN_DATA_KEY\s*=\s*["\']?[A-Za-z0-9+/=_-]{20,})')
```

Pendeteksinya memuat **literal password yang dicari**. Siapa pun yang membaca skrip gerbang itu —
dari branch yang justru di-deploy — langsung mendapat passwordnya. Gerbangnya menjadi vektor.

### 2.4 Klaim di `STATUS-CC.md` belum benar

`docs/STATUS-CC.md:14` menulis *"nilai kredensial & NIK di-redaksi dari git history (amend/force-push
`main`)"*. Yang saya ukur:

```
$ git rev-list --count origin/main..origin/hotfix/meeting-ready   → 44
$ git merge-base origin/main origin/wp0.00-pii-cleanup            → (kosong)
$ curl -s .../pulls?state=open                                    → 0 PR
```

`main` **tidak** di-force-push (masih `d86bdad`, berkasnya masih bocor). Branch pembersih itu
**yatim** — tidak punya nenek moyang bersama dengan `main`, jadi tidak bisa di-merge biasa. Dan
tidak ada satu pun PR terbuka. Jadi pembersihan sejarah **belum terjadi sama sekali**.

Satu lagi: `STATUS-CC.md:65` menulis *"main tertinggal 157 commit"*. Angka yang benar **44**.

### 2.5 Yang harus dikerjakan

**A1 — Putar kredensial dulu. Sebelum apa pun.**
Redaksi tidak pernah cukup. Anggap `cPtnkHE7NYD3Gg_s` dan `DTSEN_DATA_KEY` **sudah di tangan orang
lain** sejak 29 Agu.
- Ganti password akun `dtsen_root`.
- **Periksa apakah `DTSEN_DATA_KEY` juga perlu diputar.** Ini penting: kunci itu mendekripsi
  235.011 `namaAsliEnc`/`nikEnc`. Kalau diputar, semua baris harus **dienkripsi ulang** — buat
  skrip migrasinya, jangan putar tanpa rencana. Kalau tidak diputar, **tulis alasannya** di
  `STATUS-CC.md` (mis. "kunci tidak pernah ter-commit; hanya password akun yang bocor") — saya
  **tidak bisa** memverifikasi isi vault dari luar, jadi ini harus Anda nyatakan eksplisit.
- Cabut/rotasi token lain yang ada di `vault/cc-acehtengah.env`.

**A2 — Bersihkan sejarah di SEMUA ref, bukan hanya satu branch.**

```bash
# 1. cadangkan dulu — jangan pernah rewrite tanpa jaring pengaman
git clone --mirror https://github.com/niumination/cc-acehtengah.git backup-$(date +%F).git

# 2. hapus berkas dari seluruh sejarah semua branch
git filter-repo --invert-paths \
  --path docs/ai/SESI-2026-08-29-dtsen-root-bnba.md --force

# 3. force-push SEMUA ref, lalu hapus branch yang tidak dipakai lagi
git push origin --force --all && git push origin --force --tags
```

Ref yang **wajib** ikut dibersihkan: `main`, `hotfix/meeting-ready`,
`feat/ai-executive-answer-v3`, `backup/feat-v3-saved`, `feat/ai-executive-answer-v1`,
`feat/ai-executive-answer-v2-live`. Kalau ada yang tidak lagi dibutuhkan, **hapus saja** —
setiap ref tambahan adalah satu salinan kebocoran lagi.

⚠️ **Minta persetujuan pemilik repo sebelum force-push.** Ini me-rewrite sejarah publik; siapa pun
yang punya clone lokal akan berkonflik. Itu memang harga yang harus dibayar, tapi keputusannya
bukan milik agen.

Kalau pemilik **menolak** rewrite: satu-satunya alternatif yang jujur adalah membuat repo baru
(tanpa sejarah), memindahkan kode ke sana, dan **mengarsipkan + mengunci** repo lama agar tidak
bisa di-clone publik. Redaksi saja tidak pernah cukup.

**A3 — Pisahkan rahasia dari pendeteksinya.**
Jangan taruh literal di skrip. Pakai pola atau berkas di luar repo:

```python
# scripts/pii-gate.sh — pola, bukan nilai
cred_re = re.compile(
    r'(sk-[A-Za-z0-9_-]{20,}'
    r'|DTSEN_(DATA|NIK)_KEY\s*=\s*["\']?[A-Za-z0-9+/=_-]{16,}'
    r'|password\s*[:=]\s*["\'][A-Za-z0-9+/=_-]{12,}["\'])'
)
# nilai spesifik dibaca dari berkas yang di-gitignore:
extra = Path(".secrets-denylist").read_text().split() if Path(".secrets-denylist").exists() else []
```

Tambahkan `.secrets-denylist` ke `.gitignore` **dan** sediakan `.secrets-denylist.example` kosong.

**A4 — Perkuat gerbang supaya kejadian ini tidak bisa terulang diam-diam.**
`pii-gate.sh` harus memindai **sejarah**, bukan hanya tree:

```bash
git log --all -p --diff-filter=A -- . | grep -nE "$POLA" && exit 1
# atau lebih murah: git rev-list --all | xargs -I{} git grep -lE "$POLA" {} --
```

**A5 — Verifikasi, jangan berasumsi.** Setelah semua langkah di atas, jalankan ini dan tempel
keluarannya di laporan:

```bash
for b in main hotfix/meeting-ready feat/ai-executive-answer-v3; do
  curl -s -o /tmp/x -w "  $b %{http_code} " \
    "https://raw.githubusercontent.com/niumination/cc-acehtengah/$b/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md"
  grep -c "cPtnkHE7NYD3Gg_s" /tmp/x
done
curl -s https://raw.githubusercontent.com/niumination/cc-acehtengah/hotfix/meeting-ready/scripts/pii-gate.sh \
  | grep -c "cPtnkHE7NYD3Gg_s"
```

**Harus 0 semua.** Selama ada satu `1`, tugas ini belum selesai — apa pun bunyi commit message-nya.

**A6 — Perbaiki `STATUS-CC.md`.** Jangan tulis sesuatu yang belum terjadi. Tulis apa adanya:
tanggal rotasi, ref mana yang di-rewrite, dan — bila ada yang tidak dikerjakan — **mengapa**.

---

## 3. 🔴 TUGAS B — Deploy, migrasi DB, dan re-impor DTSEN

### 3.1 Perbaikan belum sampai ke live

Push terakhir `9fd04a2` jam **18:35:35 UTC**. Saya probe jam **18:52 UTC** (17 menit kemudian):

```
/api/ews                      → 404 (HTML)   harusnya 200 JSON   ← route ini BARU di 6a031b0
/dashboard/akun               → 200          harusnya 307        ← middleware baru di f6107e1
/api/dtsen/breakdown          → jiwa == keluarga, nama ALL-CAPS
```

Live masih menjalankan build lama. Mungkin deploy masih berjalan, mungkin **gagal**. Saya tidak
punya token Vercel, jadi tidak bisa melihat log build — **Anda harus memeriksa dashboard Vercel
dan menempel statusnya.**

### 3.2 ⚠️ Skema Prisma berubah secara **merusak** — ini bisa mematikan situs

`git diff 14cfb19 9fd04a2 -- prisma/schema.prisma` menunjukkan ini **bukan** perubahan aditif:

- `EwsAlert.indicatorId` berubah tipe **`Int` → `String`**
- `EwsAlert` sekarang berelasi ke **`Indicator`**, bukan `SapaIndicator`
- model **`IndicatorThreshold`** dan **`SapaIndicator`** **dihapus**
- model **baru**: `Skpd`, `Dataset`, `DatasetRecord`, `SapaSnapshot`, `SapaIndicatorValue`

Kalau kode baru berjalan di atas DB berskema lama, `prisma.ewsAlert.findMany({ include: { indicator:
{ select: { dataset: ... }}}})` akan gagal — dan `/api/ews` menelan galat itu lalu menjawab
`ready:false` (sudah benar, WP0.6). Tapi route lain yang menyentuh model baru bisa 500.

**Yang harus dikerjakan:**

**B1 — Jangan `prisma db push` di produksi.** Buat migrasi yang bisa ditinjau:
```bash
npx prisma migrate diff --from-schema-datasource prisma/schema.prisma \
                        --to-schema-datamodel  prisma/schema.prisma --script > prisma/migrations/<ts>_wp04_sync/migration.sql
```
Baca SQL-nya. Perhatikan kolom yang **di-drop** — itu data hilang. Kalau `SapaIndicator` /
`IndicatorThreshold` berisi data produksi, tulis migrasi datanya dulu.

**B2 — Urutan deploy yang aman:** backup DB → jalankan migrasi di **staging** → smoke test →
baru produksi. Tulis hasilnya di `STATUS-CC.md`.

**B3 — Smoke test wajib setelah deploy** (tempel keluarannya):
```bash
for p in /api/health /api/stats /api/report /api/geodata /api/ews /api/kpi \
         "/api/dtsen/breakdown?scope=kecamatan"; do
  curl -s -o /dev/null -w "  %{http_code}  $p\n" "https://cc-acehtengah.vercel.app$p"
done
curl -s -o /dev/null -w "  %{http_code} %{redirect_url}\n" https://cc-acehtengah.vercel.app/dashboard/akun
```
Semua harus 200, kecuali `/dashboard/akun` yang harus **307 → /login**.

### 3.3 🔴 `jiwa == keluarga` masih ada di **data**, bukan hanya di kode

Perbaikan WP0.0 mengubah **jalur impor**. Ia **tidak** memperbaiki 235.011 baris yang sudah masuk.
Live masih menjawab:

```
/api/dtsen/breakdown?scope=kecamatan
  total: 222643
  BEBESEN     jiwa 39449 · keluarga 39449
  SILIH NARA  jiwa 25908 · keluarga 25908
  … (semua 14 kecamatan identik)
```

Dan Q10 live masih menulis *"tercatat 33.693 jiwa dalam **33.693 keluarga**"* — 1,00 jiwa per
keluarga. Kebenaran dari sumber yang sama (`dtsen-agregat-bappeda.json`):
**71.370 KK / 234.740 jiwa = 3,29 jiwa per keluarga**. DB menggelembung **3,12×**.

**B4 — Re-impor wajib.** Ini satu-satunya cara menutupnya:
1. Pastikan CSV sumber **punya kolom `no_kk` 16 digit**. Kalau tidak punya, impor akan ditolak
   sekarang — dan itu **benar**. Jangan longgarkan validasinya demi membuat impor jalan; carilah
   `no_kk`-nya di BAPPEDA.
2. Jalankan impor ulang ke release baru, terbitkan sebagai `PUBLISHED`.
3. **Verifikasi hasilnya**, jangan berasumsi:
```bash
curl -s "https://cc-acehtengah.vercel.app/api/dtsen/breakdown?scope=kecamatan" \
 | python3 -c "import json,sys;d=json.load(sys.stdin);r=d['rows'];\
print('jiwa',sum(x['jiwa'] for x in r),'keluarga',sum(x['keluarga'] for x in r),\
'rasio',round(sum(x['jiwa'] for x in r)/sum(x['keluarga'] for x in r),2))"
```
**Rasio harus ≈ 3,3.** Selama masih `1.0`, WP0.0 belum selesai betapapun hijaunya test-nya.

**B5 — Normalisasi nama belum sampai ke data.** Live masih `BEBESEN`, `LAUT TAWAR` (huruf besar
semua). Lihat Tugas C-4.

---

## 4. 🟠 TUGAS C — Perbaiki integrasi Question Router (WP2)

Router-nya sendiri bagus: berbasis skor, bukan first-match, 10 arketipe, ada test.
**Integrasinya ke `ai-orchestrator.ts` yang bermasalah.** Empat hal, semuanya terverifikasi:

### C1 — Sort yang tidak melakukan apa-apa

`src/services/ai-orchestrator.ts:1111-1115`:

```ts
const evidenceSorted = [...ctx.evidence].sort((a, b) => {
  // Urutkan berdasarkan skor relevansi internal (simpan di skor field custom)
  return 0;                                    // ← komparator konstan: tidak mengurutkan apa pun
});
const top3 = evidenceSorted.slice(0, 3);       // ← "top 3" = 3 pertama apa adanya
```

Komentarnya menjanjikan pengurutan berdasarkan relevansi; kodenya mengembalikan `0` untuk setiap
pasangan. `top3` adalah tiga bukti pertama dalam urutan penyimpanan, lalu narasi mengutip
`top3[0]?.indikator` seolah-olah itu yang paling relevan. **Ini mengarang relevansi.**

**Perbaikan:** urutkan sungguh-sungguh. Bila `evidence` tidak punya skor, hitung dari kecocokan
dengan `plan.concepts` (sudah ada dari `routeQuestion`), atau hapus klaim "top 3" dan sebut
apa adanya.

### C2 — 🔴 Bug parser Indonesia **diperkenalkan kembali**

WP1.2 menghapus semua salinan `replace(/[^\d.-]/g,'')` dan memusatkan ke `parseNumericId`.
Tapi jalur deterministik yang baru memakai `parseFloat` mentah:

```
src/services/ai-orchestrator.ts:1122   nilai: parseFloat(r.variabel ?? '0') || 0,
src/services/ai-orchestrator.ts:1147   const val = parseFloat(r.variabel ?? '0') || 0;
```

Saya ukur selisihnya:

| `variabel` (mentah dari SAPA) | `parseFloat` | `parseNumericId` |
|---|---|---|
| `"31,4"` | `31` | `31.4` |
| `"2.156,28"` | `2.156` | `2156.28` |
| `"16.000"` | **`16`** | `16000` |
| `"4,9"` | **`4`** | `4.9` |
| `"11.503.360.000.000"` (PDRB) | **`11.503`** | `11503360000000` |
| `"Rp 1.250.000"` | **`NaN` → `0`** | `1250000` |

`parseFloat("11.503.360.000.000")` → `11.503`. PDRB dilaporkan **sepertriliun** dari nilai
sebenarnya, tanpa galat, tanpa peringatan. Dan `|| 0` mengubah `NaN` menjadi `0` — angka karangan
yang terlihat sah.

**Perbaikan:** ganti keduanya dengan `parseNumericId(r.variabel ?? '')` dan **jangan** pakai
`|| 0`. Bila `null`, jangan masukkan baris itu ke ranking, dan catat di `quality` bahwa nilainya
tidak terbaca. Ranking yang diam-diam membuang baris lebih jujur daripada ranking yang salah urut.

Tambahkan **lint rule** supaya ini tidak terulang:
```jsonc
// eslint: no-restricted-syntax
{ "selector": "CallExpression[callee.name='parseFloat']",
  "message": "Pakai parseNumericId dari @/lib/parse-numeric — format id-ID bukan format JS." }
```
(`Number()` juga perlu dibatasi di berkas yang menyentuh data SAPA/DTSEN/Bapokting.)

### C3 — Router tidak pernah jalan untuk pertanyaan yang paling bermasalah

`src/services/ai-orchestrator.ts:1109`:

```ts
if (!result) {          // ← hanya bila handler LAMA tidak menghasilkan apa pun
  const plan = routeQuestion(query);
```

Handler lama (multi-source, DTSEN, Bapokting) menghasilkan `result` lebih dulu untuk sebagian
besar pertanyaan, jadi router **terlewati**. Ini sebabnya jawaban live Q1 dan Q13 **tidak berubah
sedikit pun** antara 31 Agu dan 1 Sep — saya bandingkan byte demi byte, identik.

**Perbaikan:** balik urutannya. `routeQuestion(query)` harus jalan **lebih dulu** dan menentukan
handler mana yang dipakai — itulah arti "router". Handler lama menjadi penyedia **data**, bukan
penentu **bentuk jawaban**. Ini perubahan perilaku yang nyata, jadi kerjakan **setelah** WP6
(harness) ada, supaya ada yang mengukur apakah hasilnya membaik atau memburuk.

### C4 — `distribution` mengelompokkan per **OPD** lalu menyajikannya sebagai wilayah

```ts
// SapaRecord tidak punya field kecamatan/desa — gunakan OPD sebagai proxy
const key = r.opds_nama_opd || 'tidak diketahui';
```

Pertanyaan *"per kecamatan"* dijawab dengan pengelompokan per **dinas**. Itu bukan proxy yang
netral — itu jawaban yang salah dengan label yang benar.

**Perbaikan:** bila `plan.geo.level !== 'kabupaten'` tetapi datanya tidak punya dimensi geografis,
**katakan begitu**:
> *"Data indikator ini direkam per OPD, bukan per kecamatan. Berikut rincian per dinas; untuk
> rincian per kecamatan, sumber yang tersedia adalah DTSEN (jiwa/keluarga) dan Dokumen B (stunting)."*

Itu **lebih** bercerita daripada tabel yang salah kolom. Ini persis semangat WP5.

### C5 — Normalisasi kecamatan: pusatnya ada, tapi tidak dipakai

WP0.16 membuat `src/lib/normalize-kecamatan.ts` — bagus, dan `KEC_ALIAS` kini 8 entri.
Tapi saya hitung pemanggilnya:

| Berkas | memanggil `normalizeKecamatan`? |
|---|---|
| `dtsen-import.ts` | ✅ |
| `dtsen-multisource.ts` | ❌ — masih punya `KEC_ALIAS` + `kecLookup` **duplikat** (baris 36, 41) |
| `dtsen-planner.ts` | ❌ 0 |
| `grounding.ts` | ❌ 0 |
| `ai-orchestrator.ts` | ❌ 0 |
| `sapa-client.ts` | ❌ 0 |

Komentar di baris 2 berkas itu menulis *"Dipakai oleh dtsen-import, dtsen-planner, grounding,
ai-orchestrator, sapa-client"* — **lima nama, satu yang benar**. Jangan biarkan komentar mengklaim
lebih dari yang dilakukan kode; itu yang membuat bug bertahan lama.

**Perbaikan:** hapus `KEC_ALIAS`/`kecLookup` dari `dtsen-multisource.ts`, impor dari pusat, lalu
panggil `normalizeKecamatan()` di setiap titik di mana nama wilayah masuk ke atau keluar dari
sistem. **Buktikan** dengan:
```bash
git grep -n "KEC_ALIAS\|kecLookup" -- src     # → hanya src/lib/normalize-kecamatan.ts
git grep -c "normalizeKecamatan" -- src       # → muncul di 5+ berkas
```
Lalu perbarui `AGENTS.md:145` yang mengklaim masalah ini sudah selesai sejak lama.

**Tentukan satu bentuk kanonik untuk tampilan** (saran: Title Case, `"Laut Tawar"`). Simpan bentuk
mentah di `valueRaw`, tampilkan yang kanonik. Jangan normalisasi di lima tempat dengan lima aturan.

### C6 — Dua pesan 401, satu tak pernah tercapai

`breakdown/route.ts` punya **dua** gerbang:
- baris **41-45**: menyusun `roleList` **termasuk** `", atau DTSEN_ROOT"` ✅ — dan **ini** yang
  selalu tercapai, karena ia mengembalikan respons untuk semua `scope`
- baris **52-61**: menyusun pesan khusus `individu` yang **menyebut hanya**
  `DTSEN_LOOKUP/SUPERADMIN` — **kode mati**, tidak pernah dijalankan

Jadi perilaku live sudah benar, tapi ada kode mati yang menyesatkan pembaca berikutnya.
**Hapus blok kedua**, atau jadikan blok pertama satu-satunya sumber pesan.

### C7 — Selisih 20 indikator belum dijelaskan

Saya ukur tiga kali, selisihnya **stabil di 20**:

```
31 Agu 06:04 UTC   /api/stats 1793   vs  /api/report 1805    selisih 12
31 Agu 13:40 UTC   /api/stats 1790   vs  /api/report 1810    selisih 20
 1 Sep 02:00 WIB   /api/stats 1795   vs  /api/report 1815    selisih 20
```

Angka absolutnya bergeser (dihitung ulang dari SAPA live — wajar), tapi **selisihnya menetap**.
Itu berarti dua endpoint **menghitung hal yang berbeda**, bukan bahwa datanya berubah.

**Perbaikan:** satu fungsi hitung, dipakai keduanya. Lalu tulis definisinya di UI:
*"1.795 indikator unik dari 2.048 catatan; 20 catatan tidak punya nama indikator dan dikeluarkan."*
Kalau memang ada 20 catatan tanpa nama, **katakan** — itu informasi, bukan aib.

---

## 5. WP4 — Fusi multi-sumber (inti, belum disentuh)

**Masalah yang harus diselesaikan.** Bukti mentah Q1, diambil 1 Sep 02:00 WIB, **tidak berubah
dari 29 Agu**:

```
columns: ["Indikator / Area", "Nilai", "Satuan", "Sumber"]      _multiSource: true
  ["SILIH NARA",  "100", "", "Dokumen B — Dinas Kesehatan"]   ← cacahan, Satuan KOSONG
  ["KETOL",       "75",  "", "Dokumen B — Dinas Kesehatan"]
  … 14 baris kecamatan, semuanya Satuan kosong …
  ["Prevalensi Stunting (Pendek dam Sangat Pendek)", "4,9", "Persen", "SAPA Aceh Tengah"]  ← PERSEN
```

**Satu kolom `Nilai` mencampur cacahan dengan persen.** Itu bukan tabel, itu dua tabel yang
ditumpuk. Pembaca tidak bisa menjumlahkan kolom itu, tidak bisa membandingkan barisnya, dan tidak
bisa tahu satuan 14 baris pertama karena `metadata.satuan = "balita"` **ada di sumber** tapi tidak
pernah dipakai.

Fakta lain dari sumber yang sama (`src/data/excel/json/dok-b-01-stunting-2026-07.json`) yang
**tidak** dipakai jawaban:

| Ada di sumber | Dipakai jawaban? |
|---|---|
| `per_jenis_kelamin`: P 297 · L 357 | ❌ tidak |
| `metadata.satuan`: `"balita"` | ❌ kolom Satuan kosong |
| `metadata.periode`: `"2026-07"` — **satu titik waktu** | ❌ tidak disebut |
| `ringkasan.total_balita_stunting`: 654 = Σ per-kecamatan = Σ per-gender ✅ konsisten | ❌ tidak dinyatakan |

Saya periksa: 654 **cocok** di ketiga potongan. Datanya sehat. Yang gagal adalah penyajiannya.

**Yang harus dibangun.** Fondasi sudah ada di `src/lib/statistics/types.ts` — `Metric` sudah punya
`measure`, `unitCanonical`, `period`, `geo`, `numerator`, `denominator`, `source`, `quality`.
**Jangan buat tipe baru.** Yang belum ada adalah **produsennya**:

**WP4.1 — `toMetrics(source, raw): Metric[]`** untuk tiap sumber (SAPA, DTSEN, Dokumen A–D,
Bapokting). Aturan keras:
- `measure` **wajib** terisi. `count` vs `rate_percent` vs `index` bukan hiasan — itu yang
  menentukan apakah dua baris boleh berada di satu tabel.
- `unitCanonical` wajib. `"balita"`, `"jiwa"`, `"persen"`, `"Rp"`, `"Kg"`.
- `period` wajib, termasuk `kind: 'point_in_time'` bila hanya satu waktu.
- `geo.level` wajib: `kabupaten` / `kecamatan` / `desa`.
- `quality` wajib: `unitMissing`, `periodAmbiguous`, `geoMismatch`, `valueUnparsed`,
  `singleSource`, `staleDays`.

**WP4.2 — Aturan penggabungan.** Dua `Metric` hanya boleh satu tabel bila `measure` **sama** dan
`geo.level` **sama**. Bila tidak: **dua tabel terpisah**, masing-masing dengan judul dan satuannya
sendiri. Jangan pernah menumpuk `"100"` (balita) dengan `"4,9"` (persen) di satu kolom `Nilai`.

**WP4.3 — `rate_percent` wajib berpenyebut.** `4,9 %` tanpa penyebut bukan angka yang bisa
dipakai. Isi `denominator` (jumlah balita di Aceh Tengah) atau **tolak** menyebutnya sebagai
prevalensi — sebut apa adanya: *"angka prevalensi 4,9 % dilaporkan SAPA; jumlah balita sebagai
penyebut tidak tersedia di sumber"*.

**WP4.4 — Rekonsiliasi antar-sumber.** 654 (Dokumen B) vs 730 (SAPA) untuk konsep yang mirip
adalah **temuan**, bukan gangguan. Tampilkan:
> *"Dinas Kesehatan mencatat 654 balita stunting (per Juli 2026, dari berkas per-NIK yang
> diagregasi). SAPA melaporkan 730 (2025). Selisih 76 kemungkinan karena periode berbeda dan
> definisi yang belum disamakan — perlu dikonfirmasi ke Dinas Kesehatan."*

Satu kalimat seperti ini **lebih** "data bercerita" daripada sepuluh angka tanpa konteks.

**WP4.5 — Jangan campur sumber di satu kolom `Sumber`.** Kalau satu tabel berasal dari satu
sumber, sebut sumbernya di judul tabel, bukan diulang di setiap baris.

---

## 6. WP5 — Narasi "data bercerita" (inti, belum disentuh)

**Bukti kegagalannya.** Q1 live, 1 Sep 02:00 WIB — pertanyaan *"Bagaimana **tren** stunting
**5 tahun terakhir** per kecamatan?"*:

- Narasi **tidak menyebut tren sama sekali**. Tidak ada kata "naik", "turun", "tidak tersedia".
- Sumber punya **satu** periode (`2026-07`). Tren 5 tahun **mustahil** dari data itu — dan sistem
  tidak mengatakannya.
- Ada typo yang ikut tersaji: `"Pendek **dam** Sangat Pendek"` (dari nama indikator SAPA).
- Narasi menutup dengan *"tidak ada data per-orang (UU PDP)"* padahal sumbernya
  `STUNTING BY NIK.xlsx` — benar bahwa NIK-nya tidak ditampilkan, tapi kalimatnya membingungkan.

**Yang harus dibangun.**

**WP5.1 — Narasi dihasilkan dari `Metric[]`, bukan dari LLM yang membaca teks mentah.**
Urutannya: data → `Metric[]` → **template per arketipe** → LLM hanya untuk **merangkai kalimat**,
tidak untuk **memilih angka**. Kalau LLM masih memilih angka, halusinasi tetap mungkin.

**WP5.2 — Template per arketipe** (`Archetype` sudah ada di `types.ts`). Minimal:

| Arketipe | Wajib ada di narasi |
|---|---|
| `trend` | periode awal & akhir · arah · persen perubahan · **bila titik < 2: "tren tidak dapat dihitung karena hanya ada N titik (periode X)"** |
| `distribution` | total · unit · 3 tertinggi & 3 terendah · **penyebut bila persen** |
| `comparison` | kedua nilai · selisih absolut **dan** relatif · apakah sebanding (satuan/periode sama?) |
| `composition` | bagian vs keseluruhan · persen **dengan** penyebutnya |
| `ranking` | peringkat · nilai · satuan · **peringatan bila selisih antar-peringkat < ambang** |
| `level` | nilai · satuan · periode · sumber · **bila satu sumber saja, sebut** |
| `unanswerable` | **apa yang tidak ada** · sumber mana yang diperiksa · pertanyaan terdekat yang **bisa** dijawab |

Baris terakhir itu yang paling penting. *"Saya tidak punya data tren stunting 5 tahun; yang ada
satu titik (Juli 2026). Yang bisa saya jawab: sebaran per kecamatan pada Juli 2026, dan
perbandingan antar-kecamatan."* — itu jawaban yang **berguna**. Diam, atau mengarang tren, bukan.

**WP5.3 — Setiap angka di narasi wajib bisa ditelusuri.** Tidak ada angka yang tidak ada di
`Metric[]`. Uji otomatisnya: ekstrak semua angka dari narasi, pastikan masing-masing muncul di
metrik yang dipakai. Bila ada yang tidak, **gagalkan** jawabannya.

**WP5.4 — Satuan dan periode di setiap angka pertama kali disebut.**
`"654 balita (Juli 2026)"`, bukan `"654"`.

**WP5.5 — Bersihkan nama indikator sebelum ditampilkan.** `"Pendek dam Sangat Pendek"` →
`"Pendek dan Sangat Pendek"`. Satu peta koreksi di `normalize.ts`, jangan di lima tempat.
Tapi **simpan** `valueRaw`/`labelRaw` supaya jejak aslinya tidak hilang.

**WP5.6 — Jujur soal keterbatasan.** Bila `quality.unitMissing`, `quality.singleSource`, atau
`period.kind === 'point_in_time'`, **narasi wajib menyebutnya**. Ini bukan kelemahan produk —
ini yang membuat produk bisa dipercaya.

---

## 7. WP6 — Harness evaluasi (kerjakan **sebelum** WP4/WP5 mengubah perilaku)

Tanpa ini, Anda tidak akan tahu apakah WP4/WP5 memperbaiki atau merusak. Saya sudah menyediakan
bahannya.

**WP6.1 — `npm run eval`.** Belum ada di `package.json` (saya periksa: hanya `dev`, `build`,
`start`, `lint`, `test`, `test:watch`, `typecheck`). Tambahkan.

**WP6.2 — Pakai `hermes-brief/data/golden-queries.json`.** Sudah **86 entri** dan sudah saya
validasi: `id` unik, `_meta.jumlah` cocok, `gate` ↔ `keamanan-role` 11 ↔ 11.
75 kasus berarketype + 11 kasus gerbang keamanan **S1–S11**.

**WP6.3 — Metrik per kasus, bukan kesan umum.** Minimal:

| Metrik | Cara ukur |
|---|---|
| `satuanTerisi` | % baris tabel yang `Satuan`-nya tidak kosong |
| `satuanKonsisten` | satu kolom `Nilai` hanya satu `measure` |
| `angkaTertelusur` | setiap angka di narasi ada di metrik |
| `formatIdId` | tidak ada `"33693"` polos di sel tabel |
| `trenDijawab` | pertanyaan tren → ada arah + persen, **atau** pernyataan jujur bahwa data kurang |
| `kecamatanKanonik` | hanya satu ejaan per kecamatan |
| `defleksiPII` | pertanyaan NIK → ditolak, tanpa kebocoran |
| `waktuJawab` | detik |

**WP6.4 — Jadikan gerbang CI.** `npm run eval` merah → build gagal. Tanpa ini, regresi akan
masuk diam-diam seperti yang terjadi pada WP2.

**WP6.5 — Simpan keluaran tiap run** sebagai artefak (`artefak/eval-<tanggal>.json`) supaya
perbaikan bisa **dibuktikan**, bukan diklaim.

**Alat bantu yang sudah ada dan siap pakai:**

```bash
# 14 pertanyaan nyata ke live, simpan SSE mentah
OUT=/tmp/probe bash hermes-brief/scripts/probe-live.sh

# periksa satu jawaban: persen? satuan? normalisasi? jiwa==keluarga?
python3 hermes-brief/scripts/cek-jawaban.py /tmp/probe/Q1.sse 60 \
  "Bagaimana tren stunting di Aceh Tengah 5 tahun terakhir per kecamatan?"
```

Kedua skrip itu sudah saya pakai di empat putaran; `cek-jawaban.py` sudah diperbaiki agar
mendeteksi **`LUT TAWAR`** dan **`LAUT TAWAR`**.

---

## 8. Koreksi atas brief saya sendiri

Supaya Anda tidak mengejar hantu, empat hal yang **saya** tulis sebelumnya ternyata salah.
Semuanya saya temukan dengan menjalankan kode, bukan membaca ulang:

| Klaim saya sebelumnya | Yang benar | Bagaimana ketahuan |
|---|---|---|
| "Σ per-kecamatan = 614, tidak cocok dengan total 654" | **Salah — Σ = 654**, cocok persis. Juga cocok dengan Σ gender (297 + 357). Datanya **konsisten**; yang gagal hanya penyajiannya | `python3` menjumlahkan JSON sumbernya |
| "`main` tertinggal 157 commit" (saya kutip dari `STATUS-CC.md` tanpa memeriksa) | **44** | `git rev-list --count origin/main..origin/hotfix/meeting-ready` |
| "`hargaAvg` **kecamatan** juga rata-rata dari rata-rata" | **Salah.** Blok kecamatan (`bapokting-stats.ts:183-201`) melakukan loop atas `data` mentah, jadi sudah benar sejak awal. Yang cacat hanya `hargaAvg` **kategori** — dan itu sudah diperbaiki | membaca ulang baris 183-201 |
| "Pesan 401 `breakdown` tidak menyebut `DTSEN_ROOT`" | **Setengah salah.** Baris 41 sudah menyebutnya; baris 57 tidak, tapi **tidak pernah tercapai**. Perilaku live sudah benar; yang tersisa **kode mati** | membaca alur `return` di `route.ts` |

**Pelajarannya sama seperti putaran sebelumnya:** kalimat yang terdengar pasti bukan bukti.
Untuk setiap klaim di dokumen ini, saya cantumkan perintah atau nomor barisnya — jalankan sendiri
sebelum Anda mempercayainya, termasuk yang ini.

---

## 9. Urutan kerja dan definisi "selesai"

### Urutan

```
A (kredensial + sejarah)  →  B (deploy + migrasi + re-impor)  →  C (router + normalisasi)
                                                                   ↓
                                                          WP6 (harness) ← lebih dulu!
                                                                   ↓
                                                          WP4 (fusi)  →  WP5 (narasi)
```

**Jangan** mengerjakan WP4/WP5 sebelum WP6 ada. Anda akan mengubah perilaku AI tanpa alat ukur,
dan itu persis cara WP2 lolos dengan `return 0` dan `parseFloat`.

### Definisi selesai — setiap baris harus dibuktikan dengan keluaran perintah

```bash
# ── A: kebocoran tertutup ────────────────────────────────────────────────
for b in main hotfix/meeting-ready feat/ai-executive-answer-v3; do
  curl -s "https://raw.githubusercontent.com/niumination/cc-acehtengah/$b/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md" \
    | grep -c "cPtnkHE7NYD3Gg_s"                              # → 0 untuk SEMUA branch
done
curl -s https://raw.githubusercontent.com/niumination/cc-acehtengah/hotfix/meeting-ready/scripts/pii-gate.sh \
  | grep -c "cPtnkHE7NYD3Gg_s"                                # → 0

# ── B: live sudah benar ──────────────────────────────────────────────────
curl -s -o /dev/null -w "%{http_code}\n" https://cc-acehtengah.vercel.app/api/ews        # → 200
curl -s -o /dev/null -w "%{http_code}\n" https://cc-acehtengah.vercel.app/dashboard/akun # → 307
curl -s "https://cc-acehtengah.vercel.app/api/dtsen/breakdown?scope=kecamatan" \
  | python3 -c "import json,sys;r=json.load(sys.stdin)['rows'];\
j=sum(x['jiwa'] for x in r);k=sum(x['keluarga'] for x in r);print(j,k,round(j/k,2))"     # → rasio ≈ 3,3

# ── C: tidak ada duplikasi ───────────────────────────────────────────────
git grep -n "KEC_ALIAS\|kecLookup" -- src        # → hanya src/lib/normalize-kecamatan.ts
git grep -n "parseFloat(" -- src/services src/lib | grep -v parse-numeric   # → kosong

# ── gerbang mutu, di branch yang akan di-deploy ──────────────────────────
rm -rf .next && npx tsc --noEmit 2>&1 | grep -c "error TS"    # → 0
npx vitest run                                                # → 0 gagal
npx next build                                                # → sukses
npm run eval                                                  # → hijau, dan SKOR NAIK dari run sebelumnya
bash scripts/pii-gate.sh .                                    # → LEAK_COUNT 0
```

**Satu aturan yang mengikat semuanya:** setiap klaim "selesai" dalam laporan Anda wajib disertai
**keluaran perintah yang benar-benar dijalankan**, bukan ringkasan niat. Gelombang 2 memberi
contoh yang baik untuk `tsc`/`vitest`, dan contoh yang buruk untuk `LEAK_COUNT 0` — skripnya
dijalankan, tapi pertanyaannya salah. **Pastikan alat ukurnya mengukur hal yang Anda klaim.**

---

## 10. Berkas di paket ini

| Berkas | Isi |
|---|---|
| `HERMES-INSTRUCTION.md` | Brief Rev 5 — daftar WP lengkap (1.097 baris). Masih acuan untuk WP4/5/6. |
| `AUDIT-LIVE-2026-08-29.md` | Bukti lapangan enam putaran (1.490 baris), bagian 0000 = audit mendalam. |
| `README.md` | Ringkasan untuk manusia (448 baris). |
| `data/golden-queries.json` | **86 kasus uji** untuk WP6 — 75 arketipe + 11 gerbang keamanan S1–S11. |
| `scripts/probe-live.sh` | Kirim 14 pertanyaan nyata ke live, simpan SSE mentah. Env: `BASE`, `ONLY`, `JEDA`, `OUT`. |
| `scripts/cek-jawaban.py` | Pemeriksa cacat per jawaban. `python3 scripts/cek-jawaban.py <berkas.sse> <detik> "<pertanyaan>"` |
| `audit-tests/*.test.ts` (4 berkas, 73 test) | Meng-assert **bug**. Merah = bug masih ada. **Jangan di-commit.** |
| `audit-tests/verif-post.test.ts` (9 test) | Meng-assert **perbaikan**. Merah = perbaikan hilang/regresi. **Jangan di-commit.** |
| `artefak/probe-0901/` | SSE mentah Q1/Q10/Q13 per 1 Sep 02:00 WIB — bukti bahwa live belum berubah. |

```bash
# reproduksi lengkap
cd cc-acehtengah
git remote add origin https://github.com/niumination/cc-acehtengah.git   # bila hilang
git fetch origin --prune
git checkout -B verify-hotfix origin/hotfix/meeting-ready
rm -rf .next && npm ci
mkdir -p src/__audit && cp hermes-brief/audit-tests/*.test.ts src/__audit/
npx vitest run src/__audit/verif-post.test.ts      # → 9 passed  (perbaikan utuh)
rm -rf src/__audit                                  # JANGAN pernah di-commit
```

---

## 11. Penutup

Pekerjaan gelombang 2 itu **nyata dan bagus**. 22 commit, 278 test hijau, `tsc` bersih, satu
lapisan semantik yang dirancang dengan benar, parser yang gagal-aman, kunci kripto yang ketat,
dan bug `jiwa == keluarga` yang akhirnya ditolak di pintu masuk. Itu bukan kemajuan kecil.

Yang belum selesai bukan soal jumlah kode. Tiga hal:

1. **Rahasia yang masih bisa diambil siapa saja** — dan gerbang yang seharusnya menangkapnya
   justru menerbitkannya.
2. **Perbaikan yang belum sampai ke pengguna** — dan satu migrasi skema yang bisa mematikan
   situs bila dijalankan sembrono.
3. **Router yang tidak merutekan** — dengan `return 0` dan `parseFloat` yang mengulang kesalahan
   yang baru saja diperbaiki.

Setelah ketiganya beres, barulah WP4/WP5/WP6 — dan di sanalah "data bercerita" benar-benar
dibangun. Bukan di prompt LLM. Di **`Metric[]` yang jujur tentang satuan, periode, wilayah,
penyebut, dan keterbatasannya.**

Selamat bekerja. Periksa ulang setiap klaim — termasuk klaim saya di dokumen ini.
