# Audit Lapangan — SAPA Smart AI Aceh Tengah

**Pemeriksaan 1:** 28 Agu 2026 19:09 UTC — branch live `b519894`
**Pemeriksaan 2:** 29 Agu 2026 07:49 UTC — branch live `7cc9a76`
**Pemeriksaan 3:** 29 Agu 2026 15:17 UTC — `main` = `hotfix/meeting-ready` = `e07edae` *(delta di bagian 0)*
**Pemeriksaan 4:** 30 Agu 2026 05:45–06:05 UTC — `main` tetap `e07edae`; pekerjaan baru di `feat/ai-executive-answer-v3` @ `946e3f3` *(delta di bagian 00)*
**Pemeriksaan 5:** 31 Agu 2026 13:30–13:45 UTC — tiga branch aktif dan saling menyimpang *(delta di bagian 000)*
**Pemeriksaan 7:** 1 Sep 2026 **12:00 WIB** — commit `b7238f8`; modul WP4/5/6 ada tapi **tidak tersambung**; live identik byte demi byte *(dokumen ini versi mutakhir; temuan di **bagian 00000**, lalu 0000)*
**Pemeriksaan 6:** 31 Agu 2026 **14:00–14:20 UTC** — **audit mendalam: fungsi produksi dijalankan, bukan dibaca.** 73 test audit di `hermes-brief/audit-tests/`, semuanya lulus. *(dokumen ini versi mutakhir; temuan di **bagian 0000**)*
**Repo:** https://github.com/niumination/cc-acehtengah · **Live:** https://cc-acehtengah.vercel.app

**Metode (tujuh putaran):** clone → `npm ci` → `npx vitest run` → `npx tsc --noEmit` → `npx next build` → `git checkout` ke branch live → probe fungsi murni via `tsx` → **14 panggilan nyata** `POST /api/query` (SSE) → pembacaan `/api/health`, `/api/stats`, `/api/kpi`, `/api/report`, `/api/analytics`, `/api/geodata`, `/api/ews`, `/api/dtsen/breakdown`, `/api/dtsen/status` → GitHub API untuk seluruh branch.

> Setiap angka di dokumen ini hasil perintah yang benar-benar dijalankan. Perintah reproduksi di bagian 11.
> **Baca bagian 00000 lebih dulu** — itu putaran terbaru (1 Sep 12:00 WIB). Lalu bagian 0000 (31 Agu, audit mendalam). Bagian 000 = delta 30 → 31 Agu, bagian 0 = 29 → 30 Agu, bagian 1 = 28 → 29 Agu.

---

## 00000. Pemeriksaan 7 — 1 Sep 2026 12:00 WIB · commit `b7238f8`

Hermes mengerjakan gelombang 3 sebagian: satu commit `b7238f8` mengklaim *"WP4/5/6 —
fusion+rekonsiliasi (222k vs 234k), narasi data bercerita, harness evaluasi 6/6 (290 tests)"*.
Saya verifikasi ulang semuanya. Hasilnya: **kode yang bagus, tapi tidak tersambung.**

### 00000.1 Apa yang benar dari klaim itu

```
$ rm -rf .next && npx tsc --noEmit 2>&1 | grep -c "error TS"   →  0     ✅
$ npx vitest run   →  Test Files 17 passed · Tests 290 passed           ✅
$ npm run eval     →  Harness WP6: 6/6 lulus, 0 gagal                   ✅ (tapi lihat 00000.3)
```

`fusion.ts` (156 baris) dirancang dengan benar: `computeDiscrepancy` dengan ambang 3%,
`buildCaveats` (discrepancy / period_mismatch / demo_data / stale), `SOURCE_PRIORITY`,
`plausibilityCheck`. `narrative.ts` (80 baris) benar-benar **deterministik**, bukan LLM —
sesuai WP5.1. `npm run eval` ada di `package.json`.

Catatan penting: `data/golden-queries.json` versi repo (6 kasus) adalah **berkas baru**, bukan
timpaan — `git cat-file -e 9fd04a2:data/golden-queries.json` → **tidak ada**. Salinan 86 kasus
saya tetap utuh.

### 00000.2 🔴 Tapi tidak satu pun menyentuh pengguna

**Modul baru itu yatim.** Tidak ada pemanggil dari jalur jawaban:

```
$ git grep -ln "statistics/fusion\|statistics/narrative" -- src scripts
  scripts/eval-harness.ts                        ← harness
  src/lib/statistics/narrative.ts                ← mengimpor fusion
  src/lib/statistics/__tests__/fusion.test.ts    ← test
  src/lib/statistics/__tests__/harness.test.ts   ← test
  src/lib/statistics/__tests__/narrative.test.ts ← test

$ git show --stat b7238f8 | grep -E "orchestrator|route|app/"
  → kosong. Tidak ada berkas src/app/ atau src/services/ yang disentuh.
```

`ai-orchestrator.ts:1345,1566` memang memuat string `'multi-source-fusion'`, tapi itu
**literal label `grounding`**, bukan pemanggilan modul.

**Mata rantai yang hilang: tidak ada produsen `Metric[]`.**

```
$ git grep -nE "function (toMetrics|buildMetrics|extractMetrics|asMetric)" -- src   → TIDAK ADA
$ git grep -ln "import.*\bMetric\b" -- src     # lalu hitung "measure:" per berkas
  src/lib/statistics/metric.ts                    → 0
  src/lib/statistics/fusion.ts                    → 0
  src/lib/statistics/__tests__/fusion.test.ts     → 1   ← hanya test
  src/lib/statistics/__tests__/narrative.test.ts  → 1   ← hanya test
```

`narrative.ts` juga hanya menangani **satu** konsep — `fused.get('penduduk.total.count')`
di-hard-code; sisanya jatuh ke fallback generik "Ringkasan N Indikator". Template per arketipe
(trend/distribution/ranking/composition/…) **belum ada**.

### 00000.3 🔴 Harness menguji metrik tiruan

```ts
function mockMetricsFor(conceptId: string | null): Metric[] {
  if (conceptId === 'penduduk.total.count') {
    return [ mkMetric(222643, 'SAPA BPS 2023', 'sapa', conceptId),
             mkMetric(234740, 'DTSEN-BAPPEDA Des 2025', 'dtsen-bappeda', conceptId) ];
  }
  return [mkMetric(1234, 'SAPA', 'sapa', conceptId)];   // ← semua konsep lain: 1234
}
```

Harness **tidak pernah** memanggil `/api/query`, tidak mengurai SSE, tidak melihat tabel atau
narasi nyata. Isi `golden-queries.json` repo: 6 kasus, hanya **1** dengan
`expectDiscrepancy=true`, **1** `expectEmpty`, dan **4** sisanya hanya menguji
`fused.has(conceptId)` yang **selalu benar** dari mock.

Delapan metrik WP6.3 (`satuanTerisi`, `satuanKonsisten`, `angkaTertelusur`, `formatIdId`,
`trenDijawab`, `kecamatanKanonik`, `defleksiPII`, `waktuJawab`) — **nol yang diukur**.

> **Pola yang sama seperti `LEAK_COUNT 0`.** Alat dijalankan, hijau, tapi tidak mengukur
> hal yang diklaim.

### 00000.4 Bukti paling telanjang: live identik byte demi byte

```
$ # Q1 pada 1 Sep 02:00 WIB  vs  Q1 pada 1 Sep 12:00 WIB
  panjang 02:00 = 1894 · sekarang = 1894
  IDENTIK (selain timestamp): True
```

Q10 masih: *"Menurut DTSEN rilis BAPPEDA-DES-2025 — **jalur impor manual** — … tercatat
33.693 jiwa dalam **33.693 keluarga**"*. Label sumber salah (WP0.11 belum ter-deploy),
`jiwa == keluarga` masih ada, dan caveat rekonsiliasi 222.643 vs 234.740 — isi utama commit
`b7238f8` — tidak muncul di mana pun.

### 00000.5 Tugas A/B/C surat sebelumnya: nol kemajuan

| Tugas | Status 1 Sep 12:00 WIB | Bukti terukur |
|---|---|---|
| **A** kredensial & sejarah | 🔴 belum | `main` HTTP 200 password=1 NIK=1 · `v3` HTTP 200 password=1 NIK=1 · `hotfix/scripts/pii-gate.sh` HTTP 200 **password=1** · **29** commit hotfix masih membawa password |
| **B** deploy & re-impor | 🔴 belum | `/api/ews` **404** · `/dashboard/akun` **200** · breakdown **222643/222643** rasio **1.00**, nama `BEBESEN` |
| **C** router & normalisasi | 🔴 belum | `b7238f8` tidak menyentuh `ai-orchestrator.ts` |

### 00000.6 🔒 Klarifikasi cakupan: `prototype/` di v3 bukan pekerjaan saya

Hermes mengusulkan *"P1: restore `prototype/` ke hotfix"* dengan sumber *"zip: audit-v3:prototype/"*.
Terukur:

```
$ git log -1 --format="%h  %an  %ad  %s" 0034aa8
  0034aa8  Niumination <niumination@gmail.com>  Wed Aug 26 17:34:58 2026 +0700
           docs(review): §11 hotfix produksi live — 4 fix, bukti pasca-deploy, jejak commit

$ git merge-base --is-ancestor 0034aa8 origin/hotfix/meeting-ready   → TIDAK
$ git ls-tree -r --name-only origin/feat/ai-executive-answer-v3 | grep -c "^prototype/"   → 3
$ git ls-tree -r --name-only origin/hotfix/meeting-ready          | grep -c "^prototype/"   → 0
$ git ls-tree -r --name-only origin/main                          | grep -c "^prototype/"   → 0
$ git ls-remote --heads origin | grep -i audit                                              → kosong
$ find /home/user -maxdepth 3 -type d -name "prototype*"          → kosong
```

Jadi: `prototype/` (3 berkas) dibuat **Niumination pada 26 Agu 2026** — **dua hari sebelum
audit saya mulai** (28 Agu) — dan hanya ada di v3 + `backup/feat-v3-saved`. Saya tidak pernah
membuat folder `prototype/` di repo. Prototipe yang saya buat
(`hermes-brief/prototipe/PROTOTIPE-KONDISI-AKHIR.html`) memuat **0** referensi ke
v3/executive/Top OPD, dan seluruh WP yang dirujuknya ada di hotfix (WP0.14 / WP0.15 / WP1.2 →
hotfix=1, v3=0).

**Keputusan:** `hotfix/meeting-ready` adalah satu-satunya branch yang boleh disentuh.
Usulan P1–P4 (restore prototype v3, kontrak `ExecutivePresentation`, widget Top OPD, uji
prototype v3) **ditolak** — itu cakupan eksperimental yang sengaja dipisahkan pemilik repo.

### 00000.7 Pola tiga putaran

| Putaran | Klaim | Yang sebenarnya diukur |
|---|---|---|
| WP0.00 | `LEAK_COUNT 0` | working tree — bukan sejarah git |
| WP2 | "Question Router selesai" | router tidak pernah terpanggil (`if (!result)`) + `return 0` + `parseFloat` |
| WP4/5/6 | "290 tests, eval 6/6" | metrik tiruan atas modul yang tidak terhubung ke jalur jawaban |

Ketiganya bukan kebohongan — alatnya dijalankan. Masalahnya alat ukur itu **tidak mengukur hal
yang diklaim**. Karena itu surat 4 menetapkan satu kriteria: **"selesai" = keluaran `/api/query`
berubah, dibuktikan SSE mentah.**

---

## 0000. Audit mendalam — 31 Agu 14:00–14:20 UTC

Putaran sebelumnya membaca kode dan menembak endpoint. Putaran ini **menjalankan fungsi produksi
dengan data sintetis** dan menulis test yang harus lulus. Hasilnya: 73 test di 4 berkas
(`hermes-brief/audit-tests/`), semuanya hijau — artinya setiap klaim di bawah **terbukti**, bukan
diduga. Empat klaim saya sendiri ternyata salah dan dikoreksi di §0000.9.

Cara menjalankan ulang:

```bash
cd cc-acehtengah && git checkout -B audit-hotfix origin/hotfix/meeting-ready && npm ci
cp -r hermes-brief/audit-tests/*.test.ts src/__audit/
npx vitest run src/__audit/          # → 4 passed · 73 tests
```

### 0000.1 🔴 Bug `jiwa == keluarga` direproduksi dengan fungsi produksi — dan **dikunci oleh test yang sudah ada**

`src/__audit/dtsen-keluarga.test.ts` memanggil `parseAndValidateDtsenCsv` + `buildAgregatWilayah`
yang sebenarnya. Data uji: 5 orang, **2 KK nyata** (3 + 2), satu desa, satu desil.

| Masukan | `jumlahJiwa` | `jumlahKeluarga` | Verdict |
|---|---|---|---|
| `no_kk` lengkap | 5 | **2** | ✅ benar |
| `no_kk` **hilang dari header** | 5 | **5** | 🔴 BUG |
| `no_kk` ada tapi **kosong** | 5 | **5** | 🔴 BUG |
| `no_kk` **15 digit** (cacat) | 5 | **5** | 🔴 BUG |

Rantai penyebabnya, terverifikasi baris demi baris:

```ts
// dtsen-import.ts:153 — no_kk DIKECUALIKAN dari kolom wajib
const missingCols = TEMPLATE_HEADER.filter((h) => h !== 'no_kk' && !header.includes(h));

// dtsen-import.ts:205 — tanpa no_kk valid, tiap orang jadi "keluarga" sendiri
keluargaId: /^\d{16}$/.test(noKk) ? `kk:${hmac(noKk, secret)}` : `individu:${nikHash}`,

// dtsen-import.ts:249 — agregat menghitung keluarga sebagai banyaknya keluargaId unik
out.push({ …, jumlahJiwa: g.jiwa, jumlahKeluarga: g.keluarga.size });
```

Skala: produksi `222.643 / 222.643` = **1,00 jiwa per keluarga** (mustahil). Sumber yang sama
menyatakan `71.370 keluarga / 234.740 jiwa` = **3,29 jiwa per keluarga**
(`src/data/dtsen-agregat-bappeda.json` → `total: {"keluarga":71370,"jiwa":234740}`, diverifikasi
dengan membaca berkasnya). DB menggelembungkan jumlah keluarga **3,12×**.

**Temuan baru yang menjelaskan kenapa bug ini bertahan:** perilaku itu **sudah di-encode sebagai
perilaku yang diharapkan** oleh test yang ada:

```ts
// src/services/__tests__/faseJ.dtsen-impor.test.ts:97-100
it('keluargaId fallback deterministik saat no_kk kosong', () => {
  const r = parseAndValidateDtsenCsv(`${HEADER}\n${csvRow(nik(10), 'Tanpa Kk')}`, SECRET);
  expect(r.valid[0].keluargaId).toBe(`individu:${hmac(nik(10), SECRET)}`);
});
```

Judulnya *"fallback deterministik"* — seolah disengaja. Test itu **hanya** memeriksa nilai
`keluargaId` per baris, dan **tidak pernah** memeriksa akibatnya pada agregat. Jadi siapa pun yang
memperbaiki baris 205 akan melihat test ini merah dan tergoda membatalkan perbaikannya.
**Perbaikan wajib disertai:** (a) ubah test itu menjadi test yang menolak proxy diam-diam,
(b) tambah `jumlahKeluargaProksi` + `peringatan` pada keluaran agregat, (c) tolak impor tanpa
`no_kk` **atau** tandai rilisnya sebagai "jumlah keluarga tidak tersedia".

### 0000.2 🔴 Kripto: algoritmanya benar, **validasi kuncinya berlubang**

`src/__audit/dtsen-crypto.test.ts` (25 test) memanggil `encryptField`/`decryptField`/
`canSeeFullIdentitas` yang sebenarnya.

**Yang benar — pertahankan:**

| Uji | Hasil |
|---|---|
| Kunci 43-char base64url (bentuk yang didokumentasikan) → 32 byte | ✅ |
| IV **acak per panggilan** (dua enkripsi plaintext sama → ciphertext beda) | ✅ tidak ada *nonce reuse* |
| Offset format `iv(12) ‖ tag(16) ‖ ct` | ✅ panjang = 12+16+len(plain) |
| Ubah 1 bit ciphertext → GCM menolak | ✅ `decryptField` → `null` |
| Kunci berbeda tidak bisa mendekripsi | ✅ |
| Tanpa kunci / plaintext kosong / input sampah | ✅ `null`, tidak melempar |
| `canSeeFullIdentitas` atas 11 masukan | ✅ hanya `'DTSEN_ROOT'` → `true` |

**Yang berlubang:**

```ts
// dtsen-crypto.ts:9-14
function dataKey(): Buffer | null {
  const k = process.env.DTSEN_DATA_KEY;
  if (!k) return null;
  const b = Buffer.from(k, 'base64url');
  return b.length >= 32 ? b : null;      // ← ">=" padahal AES-256 butuh TEPAT 32
}
```

`createCipheriv('aes-256-gcm', …)` menuntut kunci **tepat 32 byte**. Jadi setiap kunci yang
dekodenya 33–47 byte **lolos gerbang `>= 32` lalu melempar**. Diukur langsung:

| `DTSEN_DATA_KEY` | byte hasil decode | lolos `>=32`? | akibat di `encryptField` |
|---|---|---|---|
| 43-char base64url (dokumentasi) | 32 | ya | ✅ OK |
| 44-char base64url (lebih 1 char) | 33 | **ya** | 🔴 `RangeError: Invalid key length` |
| 60-char base64 | 42 | **ya** | 🔴 `RangeError` |
| **64-char hex** (bentuk paling wajar untuk 256-bit) | 48 | **ya** | 🔴 `RangeError` |
| 32-char ASCII | 24 | tidak | `null` (aman) |

`encryptField` **tidak punya try/catch**, jadi `RangeError` itu naik ke pemanggil. Artinya:
mengisi `DTSEN_DATA_KEY` dengan kunci hex 64-char — hal pertama yang akan dicoba kebanyakan orang —
membuat **seluruh alur enkripsi BNBA gagal keras**, bukan gagal rapi.

**Perbaikan (satu baris):** `return b.length === 32 ? b : null;` — atau potong `b.subarray(0,32)`
dan **tolak** bila panjangnya bukan 32. Plus: validasi sekali saat boot dengan pesan yang menyebut
bentuk kunci yang diharapkan.

**Catatan kecil:** `canSeeFullIdentitas` peka huruf besar/kecil dan spasi — `'dtsen_root'`,
`' DTSEN_ROOT'`, `'DTSEN_ROOT '` semuanya → `false`. Aman (fail-closed), tapi berarti satu typo
pada enum membuat role tertinggi kehilangan akses tanpa pesan yang menjelaskan.

### 0000.3 🔴 Mesin statistik Bapokting: matematikanya benar, **penyajian dan batas datanya berbahaya**

`src/__audit/bapokting-stats.test.ts` (12 test) memanggil `hitungStatsBapokting` yang sebenarnya.

**Yang benar — ini modal bagus:**

| Uji | Hasil |
|---|---|
| `hitungStdDev` = simpangan baku **sampel** (pembagi `n−1`) | ✅ `[10,12,14,16,18]` → `3,16228` (populasi akan `2,82843`) |
| `n=1` → `stdDev 0`, tidak membagi nol | ✅ |
| `hitungPersentase` arah & besarnya | ✅ `(100→110)=+10`, `(100→90)=−10`, `(0→50)=0` (aman dari `Infinity`) |
| Tren dengan 14 titik, harga naik terus | ✅ `trend='naik'`, `pct=25` |
| Data kosong | ✅ tidak crash |

**Empat cacat yang terbukti:**

| # | Cacat | Bukti terukur |
|---|---|---|
| 🔴 C1 | **Tren diam-diam "stabil" bila titik < 14.** Deret **13 titik yang naik terus** dilaporkan `trend='stabil'`, `persentasePerubahan=0`, dan **tidak ada satu pun tanda** bahwa tren tidak dihitung. Objek keluaran tidak punya field `cukupData`/`peringatan`. | test B1 |
| 🔴 C2 | **Rekomendasi saling bertentangan.** Dengan satu komoditas, keluarannya: *"Komoditas paling fluktuatif: Beras Uji (CV: 3.9%)"* **dan** *"Komoditas paling stabil: Beras Uji (CV: 3.9%)"* — barang yang sama, dua label berlawanan, angka identik. Penyebab: `terendah = [...volatilityList].reverse().slice(0,5)` selalu memuat elemen yang sama dengan `tertinggi` saat daftar pendek. | test B7 |
| 🔴 C3 | **`overallIndex` = `NaN` saat tidak ada komoditas.** `reduce(...)/volatilityList.length` = `0/0`. `NaN` akan mengalir ke JSON. | test B5b |
| 🟠 C4 | **`hargaAvg` kategori = rata-rata dari rata-rata, bukan tertimbang.** Dua komoditas dengan 14 titik @10.000 dan 2 titik @30.000 → dilaporkan **20.000**; rata-rata tertimbang seluruh titik = **12.500**. Selisih 60%. Pola sama di agregasi `kecamatan`. | test B3 |

Ditambah dua cacat yang terlihat dari pembacaan kode:

```ts
// bapokting-stats.ts:214 & 218 — ternari yang kedua cabangnya SAMA (kode mati)
`${trendNaik.length === 1 ? 'naik' : 'naik'}`
`${trendTurun.length === 1 ? 'turun' : 'turun'}`

// bapokting-stats.ts:156 — error tipe yang membuat tsc merah
trendStabil.push({ nama, persentase: 0, arah: 'stabil' });   // TS2322: 'stabil' ∉ 'naik'|'turun'
```

Dan **nol test** untuk seluruh mesin ini (`git grep -l "hitungStatsBapokting" origin/hotfix/meeting-ready -- 'src/**/*.test.ts'` → kosong).

### 0000.4 🔴 Parser angka: diukur, bukan diperkirakan

`src/__audit/parser-stats.test.ts` (27 test) membandingkan kedua parser atas 9 masukan nyata.

| Masukan | Seharusnya | `sapa-client.ts:433` (rusak) | `parseNumericId` (v3) |
|---|---|---|---|
| `"31,4"` | `31.4` | **`314`** ❌ | `31.4` ✅ |
| `"2.156,28"` | `2156.28` | **`2.15628`** ❌ | `2156.28` ✅ |
| `"11.503.360.000.000"` (PDRB) | `11503360000000` | **`NaN`** ❌ | ✅ |
| `"Rp 1.250.000"` | `1250000` | **`NaN`** ❌ | `null` ⚠️ gagal **aman** |
| `"16.000"` (harga Bapokting) | `16000` | **`16`** ❌ | `16000` ✅ |
| `"16000"` | `16000` | `16000` ✅ | ✅ |
| `"4,9"` (prevalensi) | `4.9` | **`49`** ❌ | `4.9` ✅ |
| `"0"` | `0` | `0` ✅ | ✅ |
| `"1.234,567"` | `1234.567` | **`1.234567`** ❌ | `1234.567` ✅ |
| | | **7 dari 9 salah** | **1 dari 9 "salah"**, dan itu `null` |

Perbedaan pentingnya bukan jumlah, tapi **cara gagalnya**: parser rusak **mengarang angka**
(`31,4` → `314`, `16.000` → `16`) yang kemudian mengurutkan bukti, menentukan arah tren, dan
memilih "nilai teratas". `parseNumericId` **menolak** (`null`) sehingga tidak ada angka palsu.

Jumlah salinan parser rusak (`git grep -n "replace(/[^\d.-]/g" origin/<branch> -- 'src/**'`):
**`main` 2** (`sapa-client.ts:433`, `grounding.ts:265`) · **`hotfix` 3** (+ `grounding.ts:247`,
`grounding.ts:287`) · **`v3` 2**. Parser benar **hanya ada di `v3`**.

### 0000.5 🟠 Normalisasi kecamatan: tiga jalur, tiga bentuk, dan peta alias berisi **satu** entri

| Jalur | Bentuk keluaran | Bukti |
|---|---|---|
| DTSEN/BAPPEDA (impor + endpoint) | **ALL-CAPS** | `/api/dtsen/breakdown` → `BEBESEN`, `LAUT TAWAR`, … |
| `dtsen-import.ts` `KEC_NORM` | **Title Case** kanonik | test audit: masukan `"BEBESEN"` → keluaran `"Bebesen"` |
| `dtsen-multisource.ts` `kecLookup` | **Title Case** | mengembalikan entri `KECAMATAN_ACEH_TENGAH` |
| SAPA / Excel | **mentah, campur aduk** | `dok-b-01-stunting-2026-07.json:24` → `"LUT TAWAR"`; `dok-c-01-kominfo-ppks.json:58` → `"Lut Tawar"` |

Jadi satu kabupaten punya **empat** ejaan untuk satu kecamatan (`LUT TAWAR` / `Lut Tawar` /
`LAUT TAWAR` / `Laut Tawar`), dan setiap sumber memakai yang berbeda.

**Penyebab strukturalnya terukur:**

```ts
// dtsen-multisource.ts:36-38 — SELURUH peta alias
const KEC_ALIAS: Record<string, string> = {
  'lut tawar': 'Laut Tawar',          // ← SATU entri
};
```

Dan `kecLookup` **hanya dipanggil dari satu berkas**:

```
$ git grep -c "KEC_ALIAS\|kecLookup" origin/main -- <berkas>
src/services/dtsen-multisource.ts   5
src/services/dtsen-planner.ts       0
src/services/grounding.ts           0
src/services/ai-orchestrator.ts     0
src/lib/sapa-client.ts              0
```

Jadi setiap penggabungan lintas sumber atas kolom `kecamatan` akan gagal diam-diam.
`AGENTS.md:145` mengklaim masalah ini sudah ditangani *"KEC_ALIAS map + kecLookup() menge-resolve
alias sebelum pencocokan"* — klaim itu benar **hanya untuk satu jalur dari empat**.

Bukti hidup (Q1, 31 Agu): tabelnya mencampur `"LUT TAWAR"` (dari Dokumen B) dengan `"BEBESEN"`,
`"KETOL"`, … — dan `"LAUT TAWAR"` versi DTSEN tidak akan cocok dengan `"LUT TAWAR"` maupun
`"Laut Tawar"` tanpa alias eksplisit.

### 0000.6 🟠 Bukti mentah Q1 — kenapa "data bercerita" belum terjadi

Pertanyaan: *"Berapa prevalensi stunting di Aceh Tengah dan bagaimana trennya 5 tahun terakhir?"*
Jawaban live 31 Agu (6 detik, `dataSource: 'Dokumen B — Dinas Kesehatan + SAPA Aceh Tengah'`):

```
columns: ['Indikator / Area', 'Nilai', 'Satuan', 'Sumber']   _multiSource: true
  ["SILIH NARA",  "100", "", "Dokumen B — Dinas Kesehatan"]
  ["KETOL",       "75",  "", "Dokumen B — Dinas Kesehatan"]
  ["KEBAYAKAN",   "70",  "", "Dokumen B — Dinas Kesehatan"]
  ["LUT TAWAR",   "65",  "", "Dokumen B — Dinas Kesehatan"]
  … 14 baris kecamatan, semuanya Satuan kosong …
  ["CELALA",      "14",  "", "Dokumen B — Dinas Kesehatan"]
  ["Prevalensi Stunting (Pendek dam Sangat Pendek)", "4,9", "Persen", "SAPA Aceh Tengah"]
```

Satu tabel, **enam** masalah yang saling memperkuat:

1. **Kolom "Nilai" mencampur cacahan dan persen.** 14 baris pertama = jumlah balita; baris terakhir
   = `4,9` persen. Kolom `Satuan` justru kosong di 14 baris yang cacahan.
2. **Tidak ada penyebut.** `100` balita di Silih Nara berarti apa tanpa jumlah balita di sana?
3. **Nol informasi tren.** Diminta tren 5 tahun, diberikan satu titik. Kata "tren" tidak muncul di narasi.
4. **`654` tidak direkonsiliasi dengan `4,9 %`.** Narasi menyebut `654` lalu `4,9 Persen` sebagai
   dua fakta berdampingan tanpa menghubungkan keduanya.
5. **Salah ketik di nama indikator ikut tersaji:** `"Pendek dam Sangat Pendek"` (dari sumber).
6. **Klaim yang menyesatkan di narasi:** *"tidak ada data per-orang (UU PDP)"* — padahal sumbernya
   bernama `STUNTING BY NIK.xlsx`, yaitu berkas **per-NIK** yang diagregasi. Kalimat itu benar
   untuk keluarannya tapi mengundang salah paham tentang sumbernya.

### 0000.7 Indikator berbeda antar-endpoint, dan **berubah dalam hitungan jam**

```
31 Agu 13:40 UTC   /api/stats → totalIndicators 1790     /api/report → "1.810 indikator unik"   (selisih 20)
31 Agu 06:04 UTC   /api/stats → totalIndicators 1793     /api/report → "1.805 indikator unik"   (selisih 12)
```

Kedua angka **bergeser** antar-pengukuran (1793→1790, 1805→1810) karena dihitung ulang dari SAPA
live, dan **selisihnya pun berubah** (12 → 20). Jadi ini bukan sekadar dua endpoint yang tidak
sinkron — tidak ada satu pun angka indikator yang stabil untuk dirujuk. Ini juga menjelaskan
kenapa Q14 ("berapa OPD yang melapor") pernah dijawab **38 OPD** lalu **5 OPD** untuk pertanyaan
yang sama: tidak ada *deterministic resolver* untuk pertanyaan meta.

### 0000.8 Yang justru **benar** dan harus dipertahankan

| Aset | Bukti |
|---|---|
| `DTSEN_NIK_KEY` **fail-closed** | `dtsen/import/route.ts:68-71` dan `dtsen/query/route.ts:162-165`: kunci hilang atau `< 16` char → **503**, bukan lanjut dengan kunci kosong |
| `/api/dtsen/breakdown` **tidak** punya rate limit — dikonfirmasi sebagai celah, bukan dugaan | `rate-limit.ts` dipakai di 6 route (`auth/login`, `dtsen/import`, `dtsen/query`, `dtsen/release/[id]/publish`, `dtsen/source`, `api/query`) dan **tidak** di `dtsen/breakdown` |
| Rate limit `/api/query` = 10/menit, 60/jam | `api/query/route.ts:15-16` `RATE_LIMIT_PER_MINUTE = 10`, `RATE_LIMIT_PER_HOUR = 60` |
| Berkas `.bak` **tidak** menyimpan rahasia | `grep -ciE "sk-\|password\|secret\|token\|apikey"` → **0** di ketiganya; versi `v3` **identik** dengan `.bak` kecuali 1 baris import (`NextRequest` tidak dipakai) |
| `golden-queries.json` konsisten | 86 entri, `id` unik semua, `_meta.jumlah` = 86, tidak ada `archetype`/`query` kosong, `gate` ↔ `keamanan-role` cocok 11↔11 |
| Enkripsi AES-256-GCM | lihat §0000.2 — algoritma & format benar |

### 0000.9 🔻 Empat klaim saya sendiri yang **salah**, dikoreksi di putaran ini

| # | Klaim saya sebelumnya | Yang benar | Bagaimana ketahuan |
|---|---|---|---|
| 1 | *"Parser rusak membuat 9 dari 9 kasus salah."* | **7 dari 9.** `"16000"` dan `"0"` kebetulan benar. | test P1 gagal: `expected 7 to be 9` |
| 2 | *"`parseNumericId` adalah parser yang benar; `parseNumericId("Rp 1.250.000") === 1250000`."* | Ia mengembalikan **`null`** untuk `"Rp 1.250.000"` (regex `^\d+(\.\d+)?$` tidak mengizinkan huruf). Ia **lebih baik** karena gagal aman, tapi **belum lengkap** — WP1.2 harus menambah penanganan awalan satuan. | test P2 gagal: `expected null to be 1250000` |
| 3 | *"Daftar kecamatan berisi 15 entri termasuk `Takengon`, padahal `JUMLAH_KECAMATAN = 14`."* | **Salah.** Array-nya **14**. `Takengon` adalah konstanta **terpisah** (`IBU_KOTA`, baris 56-58) untuk titik tengah peta. Guard di `geodata/route.ts:126` benar dan tidak pernah gagal. | `npx tsx` meng-impor modulnya: `array.length = 14` |
| 4 | *"Checker saya gagal mendeteksi `LAUT TAWAR`, jadi normalisasi kecamatan tidak pernah terdeteksi."* | **Setengah salah.** `"LUT TAWAR"` (alias lokal di dokumen Excel) **memang** terdeteksi — dan itu yang terpicu di Q1. `"LAUT TAWAR"` (bentuk DTSEN) yang tidak. Pola sudah saya perbaiki mencakup keduanya. | membaca ulang `rows` Q1: `LUT TAWAR 1×`, `LAUT TAWAR 0×` |

Tiga kegagalan lain murni salah konstruksi data uji saya (arah deret harga terbalik, jendela `historis`
mengambil 7 titik **terbaru**, dan nama uji < 3 karakter yang ditolak validasi) — semuanya sudah
diperbaiki, dan tidak ada satu pun yang merupakan bug produk.

**Pelajaran metode:** empat dari empat kesalahan itu tersembunyi di balik kalimat yang terdengar
pasti. Yang membongkarnya bukan membaca ulang, tapi **menjalankan**. Karena itu setiap temuan di
bagian ini punya test yang bisa dijalankan ulang.

---

## 000. Delta 30 Agu 06:05 → 31 Agu 13:45 UTC (tiga branch) *(dilengkapi bagian 0000)*

Ketiga branch yang diminta bergerak. **Produksi tetap tidak berubah**, tapi `hotfix/meeting-ready`
kini berisi **mesin statistik sungguhan** — dan itu mengubah sebagian diagnosis saya.

### 000.1 Posisi ketiga branch

```
$ git fetch origin --prune
   946e3f3..1dd5ed7  feat/ai-executive-answer-v3
   e07edae..14cfb19  hotfix/meeting-ready
   e07edae..d86bdad  main
```

| Branch | HEAD | Commit terakhir | Relasi ke `main` |
|---|---|---|---|
| `main` | **`d86bdad`** | 30-Agu 16:05 | 16 commit total |
| `hotfix/meeting-ready` | **`14cfb19`** | **31-Agu 18:52** ← paling baru | **`main` + 23**, `main..hotfix = 23`, `hotfix..main = 0` (sudah memuat seluruh `main`) |
| `feat/ai-executive-answer-v3` | **`1dd5ed7`** | 30-Agu 16:06 | **`main` + 13**, `main..v3 = 13`, `v3..main = 0` |

`hotfix` dan `v3` **saling menyimpang** — tidak ada yang memuat yang lain. GitHub API:
`pushed_at 2026-08-31T11:52:05Z`, `size 1323 kB`, tetap **6 branch**.

**Yang terdeploy tetap kode `e07edae`.** Tiga commit baru di `main` **hanya dokumentasi**
(`git diff --name-only e07edae origin/main` → `AGENTS.md`, `docs/STATUS-CC.md`,
`docs/reference/cc-acehtengah-env-vars.md`, `docs/reference/cc-acehtengah-struktur.md`;
`-- src/` → **0 berkas**). Dan fitur baru `hotfix` belum naik:

```
/api/bapokting                    → 404   # route baru, hanya ada di hotfix
/api/ews , /api/datasets          → 404   # hanya ada di v3
/api/analytics/opd/<slug>         → 404   # hanya ada di v3
/api/health                       → 200   # pembanding
```

### 000.2 🔴 Kebocoran password + NIK: kini ada di **tiga** branch, tidak ditangani

```
$ for b in main hotfix/meeting-ready feat/ai-executive-answer-v3; do
    git show origin/$b:docs/ai/SESI-2026-08-29-dtsen-root-bnba.md | grep -cE "cPtnkHE7NYD3Gg_s|3216022603070011"
  done
2      # main
2      # hotfix/meeting-ready
2      # feat/ai-executive-answer-v3

$ curl -s -o /dev/null -w '%{http_code}' https://raw.githubusercontent.com/niumination/cc-acehtengah/main/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md
200
```

`scripts/pii-gate.sh` **tidak disentuh** di branch mana pun
(`git diff e07edae origin/hotfix/meeting-ready -- scripts/pii-gate.sh` → kosong).
`src/services/dtsen-import.ts` juga **tidak disentuh** → bug `jiwa == keluarga` ada di ketiganya,
dan terverifikasi masih tayang: `breakdown?scope=kecamatan` → `total 222643`, **14/14**
`jiwa == keluarga`, `release.publishedAt 2026-08-29T08:57:31.218Z`.

`/api/dtsen/breakdown/route.ts` juga tidak berubah di `hotfix`: `take: 200` di baris **70** dan
`.catch((e) => console.error('[dtsen/breakdown] audit gagal:', e))` di baris **83** masih ada
→ WP0.12a dan WP0.12b masih terbuka.

### 000.3 ✅ Koreksi atas diagnosis saya: mesin statistik **sudah mulai ditulis** — di `hotfix`

Di bagian 00 saya menulis *"tidak ada satu pun fungsi statistik di seluruh basis kode"*.
**Itu tidak lagi benar untuk `hotfix/meeting-ready`.** Ada `src/lib/bapokting-stats.ts`
(**322 baris**, baru, hanya di `hotfix`) yang benar-benar menghitung:

```ts
function hitungStdDev(values: number[], rataRata: number): number {
  if (values.length < 2) return 0;
  const sumSquares = values.reduce((sum, v) => sum + Math.pow(v - rataRata, 2), 0);
  return Math.sqrt(sumSquares / (values.length - 1));        // simpangan baku sampel — benar
}
function hitungPersentase(lama: number, baru: number): number {
  if (lama === 0) return 0;
  return ((baru - lama) / lama) * 100;                        // perubahan relatif — benar
}
// hitungStatsBapokting(): min/max/avg per komoditas, tren = rata-rata 7 hari terakhir
// vs 7 hari sebelumnya dengan ambang ±2%, indeks volatilitas, agregasi per kategori & kecamatan
```

Dan `generateAiNarrative()` (baris 245) menyusun narasi **tanpa LLM**: peringkat top-5
termahal/termurah berdasar `hargaAvg`, daftar harga naik/turun, lalu rekomendasi — semuanya
diturunkan dari angka yang baru dihitung. Ini persis pola *"jalur deterministik dulu, LLM
terakhir"* (aturan A4) yang brief ini minta, dan commit `6d03935` menuliskannya sebagai
*"jalur deterministik harga komoditas tanpa LLM"*.

**Pernyataan yang benar sekarang:** tidak ada lapisan statistik **umum** — tidak ada
`src/lib/statistics/`, dan `zScore`/`growthRate`/`shareOf`/`percentRate` tetap 0 di ketiga branch.
Yang ada adalah mesin statistik **satu domain** (harga komoditas mingguan) yang belum digeneralisasi.

**Tapi empat cacat menyertainya:**

| # | Cacat | Bukti |
|---|---|---|
| 🔴 C1 | **Nol test untuk mesin statistiknya.** `bapokting-viz.test.ts` hanya menguji `buildVizFromEvidence` (2 test). `git grep -l "hitungStatsBapokting" origin/hotfix/meeting-ready -- 'src/**/*.test.ts'` → **kosong**. Fungsi yang menghitung stdDev, tren, dan volatilitas tanpa satu pun test — melanggar aturan A6. | `git grep` |
| 🔴 C2 | **Error tipe di dalam mesinnya.** `src/lib/bapokting-stats.ts(156,47): error TS2322: Type '"stabil"' is not assignable to type '"naik" \| "turun"'`. Ada di baris `trendStabil.push({ nama, persentase: 0, arah: 'stabil' })` — tipe `KomoditasTrend.arah` terlalu sempit. | `npx tsc --noEmit` (lihat §000.5) |
| 🟠 C3 | **Menambah pendek-sirkuit kata kunci ketiga.** `ai-orchestrator.ts:332`: `const priceKeywords = /\b(harga\|prix\|market\|commodity\|komoditas\|sayur\|buah\|pangan\|bahan pokok)\b/i` lalu `.test(query)`, plus daftar `specificCommodities` yang juga disaring dengan substring. Ini **pola yang sama** dengan `detectExcelDocQuery` dan `planDtsenQuery` yang saya identifikasi sebagai akar Q1/Q2/Q4/Q13 — rantainya bertambah panjang, bukan bertambah pintar. | `git show origin/hotfix/meeting-ready:src/services/ai-orchestrator.ts` |
| 🟠 C4 | **Menambah salinan parser angka rusak.** `grounding.ts:247` (baru): `harga: Number(String(e.nilai).replace(/[^\d.-]/g, '')) \|\| 0` — pola rusak yang sama. Untuk harga Bapokting yang berupa integer polos ia kebetulan benar; begitu ada `"16.000"` ia akan membaca **16**. | lihat tabel parser di bawah |

**Jumlah salinan parser angka rusak (`replace(/[^\d.-]/g, '')`) per branch:**

| Branch | Salinan | Lokasi |
|---|---|---|
| `main` | **2** | `sapa-client.ts:433`, `grounding.ts:265` |
| `hotfix/meeting-ready` | **3** | `sapa-client.ts:433`, `grounding.ts:247`, `grounding.ts:287` |
| `feat/ai-executive-answer-v3` | **2** | `sapa-client.ts:433`, `grounding.ts:267` |

Dan parser yang **benar** (`parseNumericId`) hanya ada di `v3`:
`git grep -n "export function parseNumericId" origin/hotfix/meeting-ready -- 'src/**'` → **kosong**.

**Jadi dua branch itu masing-masing memegang separuh solusi:** `hotfix` punya mesin statistik
tanpa parser yang benar; `v3` punya parser yang benar tanpa mesin statistik. Menyatukannya
(WP1.2 + WP1.6 + WP3) jauh lebih murah daripada membangun dari nol.

### 000.4 🔻 `tsc` di `hotfix` melaporkan **1 error** — itu menyesatkan, dan saya hampir tertipu

```
$ git checkout -B audit-hotfix origin/hotfix/meeting-ready && rm -rf .next && npx tsc --noEmit
scripts/debug-bapokting.ts(95,13): error TS1005: ',' expected.
$ npx tsc --noEmit 2>&1 | grep -c "error TS"
1
```

Satu error. Terdengar seperti `hotfix` jauh lebih sehat daripada `main` (26). **Tidak.**
`tsc` berhenti memeriksa setelah menemukan **galat sintaks** (TS1xxx), sehingga 25 error lain
tersembunyi di belakangnya. Buktinya — saya perbaiki satu tanda kurung itu **secara lokal**
(baris 94: `.flat()))]` → `.flat())]`, lalu berkas dikembalikan lagi) dan jalankan ulang:

```
$ npx tsc --noEmit 2>&1 | grep -c "error TS"
26
16  src/services/warehouse-sync.ts
 4  src/services/data-sync.ts
 2  scripts/debug-bapokting.ts
 1  src/services/ai-orchestrator.ts
 1  src/services/__tests__/faseK.dtsen-planner.test.ts
 1  src/services/__tests__/faseA.kontrak.test.ts
 1  src/lib/bapokting-stats.ts
```

**Metode wajib sejak sekarang:** sebelum mempercayai hitungan `tsc`, jalankan
`npx tsc --noEmit 2>&1 | grep -c "error TS1"` — bila bukan nol, hitungannya **tidak berarti**
sampai galat sintaksnya dibenahi. (Berkas lokal sudah saya kembalikan; `git status --porcelain
scripts/debug-bapokting.ts` → kosong.)

**Koreksi kedua atas cara kerja saya sendiri:** `.next/types/validator.ts` masuk ke `include`
tsconfig (`'.next/types/**/*.ts'`), dan `.next/` tidak dibersihkan saat pindah branch. Menjalankan
`tsc` di `main` tepat setelah `next build` di `hotfix` menghasilkan error hantu
`Cannot find module '../../src/app/api/bapokting/route.js'` — route yang tidak ada di `main`.
Sekali sempat membuat hitungan saya naik jadi 27. **Selalu `rm -rf .next` sebelum `tsc`** bila
pindah branch.

### 000.5 Gerbang mutu ketiga branch (`.next` dibersihkan lebih dulu)

| Gerbang | `main` `d86bdad` | `hotfix/meeting-ready` `14cfb19` | `v3` `1dd5ed7` |
|---|---|---|---|
| `npx vitest run` | **5 gagal / 195 lulus (200)** | **5 gagal / 197 lulus (202)** | **5 gagal / 213 lulus (218)** |
| `npx tsc --noEmit` (apa adanya) | **26** | **1** ⚠️ *menyesatkan* | **32** |
| `npx tsc --noEmit` (nyata, setelah galat sintaks dibenahi) | 26 | **26** | 32 |
| galat sintaks TS1xxx | 0 | **1** (`scripts/debug-bapokting.ts:95`) | 0 |
| `npx next build` | ✅ `exit=0` | ✅ `exit=0` | ✅ `exit=0` |
| berkas `.bak` | **3** | **3** | **0** ✅ |
| berkas nyasar `~/Desktop/…` | 1 | 1 | 1 |

Distribusi 26 error `main` (tidak berubah dari 29 Agu): `warehouse-sync.ts` 16 · `data-sync.ts` 4 ·
`ai-orchestrator.ts` 4 · `faseK.dtsen-planner.test.ts` 1 · `faseA.kontrak.test.ts` 1.
Di `hotfix`, error `ai-orchestrator.ts` turun **4 → 1** (Bapokting merapikan sebagian), tetapi
muncul 3 error baru: `bapokting-stats.ts` 1, `debug-bapokting.ts` 2.

Kelima test yang gagal **identik di ketiga branch**:

```
× faseI.dtsen-gate.test.ts  > requiredRolesFor > AGGR: …; PERSONAL: hanya lookup + superadmin
× faseK.dtsen-planner.test.ts > provenance > label membawa versi + jalur + tanggal rilis
× faseK.dtsen-planner.test.ts > provenance > header narasi persis pola desain §8
× faseK.dtsen-planner.test.ts > buildAgregatAnswer > A1: desil per kecamatan
× faseK.dtsen-planner.test.ts > buildLookupNarasi > B1: ditemukan → terminimasi penuh, TANPA kebocoran
```

### 000.6 Dokumentasi deploy dipindah, bukan dibetulkan — dan tetap salah

`AGENTS.md` dirampingkan ke **16.420 byte, identik di ketiga branch**, dan baris `Deploy state`
**dipindah** ke berkas baru `docs/STATUS-CC.md`. Isinya masih klaim lama yang sudah saya bantah:

```
$ git show origin/main:docs/STATUS-CC.md | sed -n '3p'
> **Deploy state:** PROD = `4f95617` (hotfix/meeting-ready, live di Vercel). `main` tertinggal
  44+ commit dari `hotfix/meeting-ready`. Semua 8 branch sudah di-push ke GitHub
  (v1/v2-live/v3/backup/hotfix-llm).
```

Ketiganya salah, dan sekarang salahnya lebih jauh: kode yang live adalah **`e07edae`** (bukan
`4f95617`); `main` **tidak** tertinggal dari `hotfix` — justru `hotfix` = `main` + 23; dan branch
tinggal **6**, tanpa `hotfix-llm`. `AGENTS.md` baris 7 menyuruh *"baca `docs/STATUS-CC.md`
sebelum menyentuh config/deploy"* — jadi pointer-nya menunjuk ke informasi yang menyesatkan.
Header berkas itu bahkan masih `Last update: Aug 29, 2026`.

### 000.7 Catatan kecil: dokumen OpenCode Go di `hotfix`

Lima berkas `docs/OPENCODE_GO_*.md` baru (hanya di `hotfix`) memuat status integrasi, termasuk
**ID workspace `wrk_01K919CRFT6F630NV9K0HA82GE`** dan dua kunci API yang **terpotong**
(`sk-h8t...`, `sk-8qZ...`). Saya periksa: `grep -cE "sk-[A-Za-z0-9_-]{8,}"` → **0** di kelimanya,
jadi **tidak ada kredensial utuh yang bocor** di sini. Yang perlu dicatat hanya polanya:
identifikasi sumber daya (workspace ID) masuk ke repo publik, dan `pii-gate.sh` tidak akan
menangkapnya. Ini risiko kelas yang sama dengan WP0.00, jauh lebih kecil.

### 000.8 Kondisi live yang diverifikasi ulang 31 Agu 13:40 UTC

```
/api/health                              200
/api/dtsen/breakdown?scope=kecamatan     200  total 222643 · 14/14 jiwa==keluarga · BAPPEDA-DES-2025
/api/dtsen/breakdown?scope=individu      401 ✅
/api/dtsen/breakdown?scope=xxx           400 ✅
/api/dtsen/status                        401
/dashboard/akun                          200 ❌ (masih tanpa login)
docs/ai/SESI-…-dtsen-root-bnba.md (raw)  200 ❌ (password + NIK masih terbaca publik)
```

**Probe putaran 5 tidak dijalankan.** Alasannya: `/api/query` dibatasi 10/menit dan 60/jam per IP,
dan **kode yang melayani produksi tidak berubah sama sekali** sejak putaran 4 (`e07edae`, tiga
commit `main` sesudahnya nol perubahan `src/`). Menembakkan 14 pertanyaan lagi hanya akan
menghabiskan kuota untuk mengukur berkas yang identik. Tabel putaran 4 di bagian 00.7 tetap
berlaku; jalankan ulang begitu `hotfix` atau `v3` benar-benar di-deploy.

---

## 00. Delta 29 Agu 15:17 → 30 Agu 06:05 UTC *(digantikan bagian 000)*

Dua hal berubah sejak pemeriksaan 3, dan **tidak satu pun menyentuh akar masalah yang saya laporkan**.

### 00.1 Produksi tidak bergerak; pekerjaan baru pindah ke branch `v3`

```
$ git fetch origin --prune
   e028d84..946e3f3  feat/ai-executive-answer-v3 -> origin/feat/ai-executive-answer-v3   # satu-satunya perubahan

$ git rev-parse --short origin/main origin/hotfix/meeting-ready
e07edae
e07edae                                    # TIDAK BERUBAH sejak 29 Agu 16:33

$ git rev-list --count origin/main..origin/feat/ai-executive-answer-v3
10                                         # v3 = main + 10 commit, tanpa divergensi
$ git rev-list --count origin/feat/ai-executive-answer-v3..origin/main
0
```

| Cabang | HEAD | Waktu commit terakhir |
|---|---|---|
| `main` (= produksi) | `e07edae` | 29-Agu 16:33 |
| `hotfix/meeting-ready` | `e07edae` | 29-Agu 16:33 |
| **`feat/ai-executive-answer-v3`** | **`946e3f3`** | **30-Agu 02:23** ← pekerjaan aktif |
| `backup/feat-v3-saved` | `e028d84` | 26-Agu 19:39 |
| `feat/ai-executive-answer-v2-live` | `225cb36` | 26-Agu 02:16 |
| `feat/ai-executive-answer-v1` | `1dc36e5` | 25-Agu 00:00 |

GitHub API: `pushed_at 2026-08-29T19:23:41Z`, `size 1121 kB`, default `main`, tetap **6 branch**.

**Sepuluh commit baru itu (semuanya di `v3`):**

```
946e3f3 fix(ui): header pakai token tema solid (hilangkan efek overlay)
eba4dae feat(AI): tampilkan tombol Pecah Jawaban (BreakdownExplorer) di mode Executive UI
af9a404 fix(QueryBar): hapus duplikasi render CHIP_GROUPS (muncul double)
c2dfe9f fix(merge): restore ews/datasets route.ts dari .bak + restore scripts/seed.ts
7cd1d84 merge: bawa fitur DTSEN/Login/Pecah Jawaban dari hotfix ke v3 (experimental)
```

**Terdeploy atau tidak? Tidak.** Diuji dengan route yang hanya ada di `v3`:

```
/api/analytics/opd/dinas-pendidikan → 404    # route baru, hanya ada di v3
/api/ews                            → 404    # .bak di-restore hanya di v3
/api/datasets                       → 404    # .bak di-restore hanya di v3
/api/health                         → 200    # pembanding
/api/dtsen/breakdown?scope=individu → 401    # pembanding
```

→ **Produksi masih `main` @ `e07edae`.** Semua temuan bagian 0 tentang live tetap berlaku apa adanya.

### 00.2 🔴 Kebocoran password + NIK: MASIH ADA, dan kini ada di dua branch

```
$ git show origin/feat/ai-executive-answer-v3:docs/ai/SESI-2026-08-29-dtsen-root-bnba.md \
    | grep -nE "cPtnkHE7NYD3Gg_s|3216022603070011"
28:- Verifikasi live: `dtsen_root` → "AL HAFIZH RAIHAN ARIGADIEI · 3216022603070011" ✅; …
52:- `dtsen_root` / `cPtnkHE7NYD3Gg_s` (DTSEN_ROOT — ganti password segera)
```

Berkas yang sama, baris yang sama, kini ada di `main` **dan** di `v3`. `scripts/pii-gate.sh`
**tidak disentuh** (`git diff origin/main origin/feat/ai-executive-answer-v3 -- scripts/pii-gate.sh`
→ kosong). `dtsen-import.ts` juga **tidak disentuh** → bug `jiwa == keluarga` ikut terbawa ke `v3`.

### 00.3 Yang dikerjakan di `v3`: lapisan presentasi, bukan lapisan statistik

`git diff --stat origin/main origin/feat/ai-executive-answer-v3` → **65 berkas, +4.161/−358**.
Isi barunya:

| Berkas baru | Isi | Apakah menambah kemampuan statistik? |
|---|---|---|
| `src/services/executive-presentation.ts` (387 baris) | Adaptor `HybridResponse` → model presentasi. Baris 3 berkas itu sendiri: *"Tidak melakukan fetch, LLM, Prisma, atau **mengubah angka**."* | **Tidak** |
| `src/services/opd-drilldown.ts` (127 baris) | Drill-down analitik per OPD, *"tanpa fetch/DB/Next"* | Sebagian: menyusun deret tahunan, tapi **tidak menghitung apa pun** |
| `src/components/ExecutiveAnswerRenderer.tsx` (343), `OpdDrilldown.tsx` (206), `TopOpdWidget.tsx` (107) | UI | Tidak |
| `src/app/api/analytics/opd/[slug]/route.ts` (60) | Endpoint drill-down | Tidak |
| `prototype/` (3 berkas, 1.037 baris) | Prototipe HTML + rencana | Tidak |
| `docs/ai/INSTRUKSI_PENERAPAN_EXECUTIVE_AI.md` (636), `RENCANA_V3.md` (63), `CHECKLIST_PASCA_DEPLOY.md` (42), `BACKLOG.md` (77), `REVIEW_EXECUTIVE_UI.md` (303) | Dokumentasi | Tidak |
| `scripts/seed.ts` (72) | Seed | Tidak |

**Bukti langsung bahwa diagnosis inti tetap berlaku di `v3`:**

```
$ git ls-tree -r --name-only origin/feat/ai-executive-answer-v3 | grep -i statistic
(kosong)                                        # tidak ada direktori statistik

$ for f in persentase percentRate shareOf growthRate zScore correlation; do …
persentase  3   ← semuanya cuma string/pola regex, bukan hitungan
percentRate 0 · shareOf 0 · growthRate 0 · zScore 0 · correlation 0
```

Lebih telanjang lagi — `buildInsights()` di `executive-presentation.ts:233–258` menghasilkan
maksimum 3 insight dari **template kalimat tetap**:

```ts
insights.push({ tone: 'ok',   label: 'Terjawab',      text: 'Jawaban dirakit dari evidence yang terstruktur, bukan dari angka bebas.' });
insights.push({ tone: 'info', label: 'Bentuk analisis', text: 'Data disajikan sebagai perubahan antar-periode; periksa kesamaan indikator dan satuan.' });
insights.push({ tone: 'info', label: 'Bentuk analisis', text: 'Data dikelompokkan sebagai distribusi, bukan peringkat kinerja.' });
return insights.slice(0, 3);
```

Tidak ada satu angka pun di dalamnya. Ini persis cacat *"rekomendasi boilerplate"* yang sudah
saya laporkan — kini diproduksi di lapisan baru, dengan label baru ("Insight"), tetap tanpa isi.
Bahkan teksnya memuat kata **`evidence`**, istilah internal yang bocornya saya catat di Q6/Q14.

### 00.4 Parser angka yang BENAR baru saja ditulis — tapi yang RUSAK yang dipakai agregasi

Ini temuan paling menentukan untuk WP1/WP7:

```
# v3: src/services/opd-drilldown.ts:35–41  ← BENAR
export function parseNumericId(value: string): number | null {
  const cleaned = value.replace(/\s/g, '').replace(/\./g, '').replace(/,/g, '.');
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;      // menolak "11.503.360.000.000" → null, TIDAK mengarang
}

# v3: src/lib/sapa-client.ts:433  ← MASIH RUSAK, dan INI yang memberi makan agregasi
const nilaiNumber = Number(String(r.variabel).replace(/[^\d.-]/g, ''));
```

`git diff origin/main origin/feat/ai-executive-answer-v3 -- src/lib/sapa-client.ts` → **kosong**:
parser rusak itu identik di `main` dan `v3`, masih di baris **433**. Jadi kini ada **dua** parser
angka di basis kode: yang benar dipakai satu fitur drill-down, yang rusak dipakai jalur agregasi
utama. Aturan A7 (*"satu konsep, satu fungsi"*) sekarang dilanggar secara nyata, dan perbaikannya
murah — `parseNumericId` sudah ditulis dan sudah diuji di `opd-drilldown.test.ts`.

### 00.5 Yang membaik di `v3` (jangan diregresi saat merge)

| Item | Bukti |
|---|---|
| **Berkas `.bak` habis** | `git ls-tree -r --name-only origin/feat/ai-executive-answer-v3 \| grep '\.bak$'` → **kosong** (dari 3 di `main`). WP0.6 sebagian sudah dikerjakan di `v3`. |
| `/api/ews`, `/api/datasets`, `/api/datasets/[slug]` dihidupkan dari `.bak` | `c2dfe9f` |
| **Test bertambah 18** | `vitest`: `200 → 218` test (`opd-drilldown.test.ts` 123 baris + `executive-presentation.test.ts` 113 baris) |
| Ada jalur rollback UI | `NEXT_PUBLIC_AI_EXECUTIVE_UI=false` → fallback renderer lama (`.env.example:56–58`) |
| `any` dikurangi di `ai-orchestrator.ts` | `metadata: Record<string, any>` → `Record<string, unknown>` |

**Yang belum:** berkas nyasar `~/Desktop/Niumination/…/bapokting-client.ts` **masih** di tree `v3`
(`git ls-tree -r --name-only … | grep '~'` → 1 baris).

### 00.6 Gerbang mutu memburuk di `v3`

Dijalankan di checkout `946e3f3` setelah `npm ci`:

| Gerbang | `main` = `e07edae` | **`v3` = `946e3f3`** |
|---|---|---|
| `npx vitest run` | 5 gagal / 195 lulus (200) | **5 gagal / 213 lulus (218)** — jumlah test naik, **test gagal tidak berkurang** |
| `npx tsc --noEmit` | 26 error | **32 error** 🔻 |
| `npx next build` | ✅ | ✅ (`✓ Compiled successfully in 11.7s`, `exit=0`) |

Kelima test gagal **sama persis** dengan `main` (merge `7cd1d84` membawanya apa adanya):

```
× faseI.dtsen-gate.test.ts  > requiredRolesFor > AGGR: … ; PERSONAL: hanya lookup + superadmin
× faseK.dtsen-planner.test.ts > provenance > label membawa versi + jalur + tanggal rilis
× faseK.dtsen-planner.test.ts > provenance > header narasi persis pola desain §8
× faseK.dtsen-planner.test.ts > buildAgregatAnswer > A1: desil per kecamatan
× faseK.dtsen-planner.test.ts > buildLookupNarasi > B1: ditemukan → terminimasi penuh, TANPA kebocoran
```

Distribusi 32 error `tsc` (dihitung dengan `| grep "error TS" | sed 's/(.*//' | sort | uniq -c`):

```
16  src/services/warehouse-sync.ts          3  scripts/seed.ts                 ← BARU
 4  src/services/data-sync.ts               1  src/services/dtsen-planner.ts   ← BARU
 4  src/services/ai-orchestrator.ts         1  src/app/api/ews/route.ts        ← BARU (dari .bak)
 1  src/services/__tests__/faseK.dtsen-planner.test.ts
 1  src/app/api/datasets/route.ts           ← BARU (dari .bak)
 1  src/app/api/datasets/[slug]/route.ts    ← BARU (dari .bak)
```

`scripts/seed.ts` dan tiga route yang baru di-restore dari `.bak` **membawa 6 error `tsc` baru** —
persis pola yang WP0.5 ingin cegah: `next build` hijau, `tsc` merah, dan keduanya lolos ke branch.

### 00.7 Probe putaran 4 (30 Agu 05:51–05:54 UTC) — dan dua false negative di checker saya sendiri

Produksi belum berubah, jadi 14 pertanyaan ditembakkan ulang untuk memisahkan **cacat yang
persisten** dari **fluktuasi LLM**. Hasil dengan checker yang sudah diperbaiki:

| # | Pertanyaan (ringkas) | CEK putaran 4 |
|---|---|---|
| Q1 | prevalensi stunting + tren 5 th | 14 baris `Satuan` kosong; kecamatan belum dinormalisasi |
| Q2 | tren siswa SD 3 th | rekomendasi boilerplate; permintaan tren tidak disinggung |
| Q3 | bandingkan kemiskinan antar kecamatan | **MENOLAK padahal agregat per-kecamatan ADA di DTSEN** |
| Q4 | hubungan kemiskinan ↔ stunting | 14 baris `Satuan` kosong; kecamatan belum dinormalisasi |
| Q5 | OPD capaian terendah 2025 | `dataSource` kosong; nama sumber kosong; rekomendasi kosong |
| Q6 | jumlah penduduk 2025 | **istilah internal ("evidensi") bocor; menjawab sub-kelompok, bukan total** |
| Q7 | produksi kopi arabika | — ✅ |
| Q8 | tren IPM | rekomendasi kosong |
| Q9 | bandingkan Dinkes vs Disbun | rekomendasi kosong |
| Q10 | % keluarga desil 1 per kecamatan (DTSEN) | **nol persen**; kecamatan belum dinormalisasi; **`jiwa == keluarga`** |
| Q11 | jumlah keluarga Bebesen (DTSEN) | **`jiwa == keluarga`** |
| Q12 | % keluarga desil 1 dari total | **nol persen**; kecamatan belum dinormalisasi; **`jiwa == keluarga`** |
| Q13 | % balita stunting per kecamatan | **nol persen**; 14 baris `Satuan` kosong; kecamatan belum dinormalisasi |
| Q14 | berapa OPD melapor | **istilah internal ("evidence") bocor** |

Ringkas: **persen 0/3 (empat putaran berturut-turut)** · `jiwa == keluarga` 3/3 · `Satuan` kosong
di 4 pertanyaan · istilah internal **2** · **rekomendasi kosong 3 + boilerplate 1** (cacat yang
sebelumnya tampil sebagai "boilerplate" kini kadang tampil sebagai **kosong sama sekali**) ·
`dataSource` kosong 1 · `LUT TAWAR` belum dinormalisasi 5.

**🔻 Koreksi atas checker saya sendiri — ini penting.** Pada putaran 3 saya menulis bahwa
kebocoran istilah internal terjadi di "Q3 + Q14" dan Q3/Q6 saya tandai bersih. Itu **salah**: pola
checker saya hanya `\b(evidence|bukti pelaporan)\b`, sedangkan jawaban live menulis
**"evidensi"** (bentuk Indonesia). Bukti:

```
$ python3 - <<'PY'   # membaca event:result Q6 dari berkas SSE yang tersimpan
nar = "…Data spesifik mengenai total keseluruhan penduduk Aceh Tengah tahun 2025
       tidak tersedia dalam evidensi yang ada."
→ COCOK: evidensi
```

Jadi Q3 dan Q6 **bukan** bersih; checker saya yang buta. Perbaikan yang sudah dikerjakan:

1. Logika cek **dipindah keluar** dari heredoc di dalam `probe-live.sh` menjadi berkas sendiri
   `scripts/cek-jawaban.py` — satu sumber kebenaran, dan bisa dijalankan ulang atas berkas SSE
   tersimpan tanpa menembak situs lagi (hemat kuota 60/jam).
2. Pola diperluas: `evidence|evidensi|bukti pelaporan|grounding|planner|arsitektur|payload|orchestrator`.
3. Dua cek baru ditambahkan, keduanya terpicu pada data nyata:
   * *"MENOLAK padahal agregat per-kecamatan ADA di DTSEN"* → terpicu di **Q3**
   * *"menjawab sub-kelompok, bukan total yang ditanya (penyebut salah)"* → terpicu di **Q6**
4. Diverifikasi dengan menjalankan ulang checker baru atas **14 berkas SSE putaran 4** yang sudah
   tersimpan di `/tmp/probe-0830/` — tanpa permintaan live baru. Tabel di atas adalah keluarannya.

**Catatan metodologis:** sebagian variasi antar-putaran (Q3/Q6 kadang lolos, rekomendasi kadang
kosong kadang boilerplate) adalah **non-determinisme LLM**, bukan perbaikan. Contoh paling telanjang
saya dapatkan saat menguji integrasi `probe-live.sh` → `cek-jawaban.py` (`ONLY=Q14`, 30 Agu
06:2x UTC) — pertanyaan yang **sama** dijawab berbeda dalam hitungan menit:

```
05:54 UTC → "terdapat total 38 OPD yang melaporkan data. Dari 19 evidence yang tersedia…"
06:2x UTC → "terdapat 5 OPD yang melaporkan data terkait pertanyaan ini… ada 19 evidence
             terkait yang bersumber dari 38 OPD dengan total 2032 data indikator"
```

Dua jawaban untuk satu pertanyaan: **38 OPD** lalu **5 OPD**, keduanya percaya diri, keduanya
memuat angka yang sama (19, 38, 2032) dengan peran yang tertukar. Dan angka acuannya sendiri
bertentangan antar-endpoint — diambil pada saat yang hampir bersamaan:

```
$ curl -s $BASE/api/stats  | jq .overview
{"totalRecords":2032,"totalOpd":38,"totalIndicators":1793,"latestUpdate":"Triwulan IV",
 "lastFetched":"2026-08-30T06:04:08.558Z"}

$ curl -s $BASE/api/report | jq -r '.report.ringkasan.narasi'
"Portal SAPA Kabupaten Aceh Tengah saat ini memuat 2.032 record dari 38 OPD dengan
 1.805 indikator unik. Cakupan data bertahun valid 59.8% …; 816 record (40.2%) belum …"
```

`1793` vs `1805` indikator unik untuk snapshot yang sama. Ini bukan masalah gaya bahasa; ini **tidak ada penentu (deterministic
resolver)** untuk pertanyaan meta seperti "berapa OPD yang melapor", sehingga LLM mengarang
pembingkaiannya setiap kali. Termasuk dalam scope WP2 (router) dan WP3 (mesin statistik). Karena itu yang
dipegang sebagai fakta adalah cacat yang muncul di **semua** putaran: nol persen, `jiwa == keluarga`,
`Satuan` kosong, `dataSource` kosong, `LUT TAWAR`, dan penolakan Q3.

### 00.8 Kondisi live yang diverifikasi ulang pada 30 Agu (tidak berubah)

```
/api/health                              200
/api/dtsen/breakdown?scope=kecamatan     200   total 222643 · 14/14 jiwa==keluarga
                                               publishedAt 2026-08-29T08:57:31Z
/api/dtsen/breakdown?scope=individu      401 ✅
/api/dtsen/breakdown?scope=xxx           400 ✅
/api/dtsen/breakdown?scope=kecamatan&program=pbi  200  (masih publik)
/api/dtsen/status                        401
/dashboard/akun                          200  ❌ (masih tanpa login)
docs/ai/SESI-…-dtsen-root-bnba.md (raw)  200  ❌ (password + NIK masih terbaca publik)
```

---

## 0. Delta 29 Agu 07:49 → 15:17 UTC *(digantikan bagian 00)*

Repo berubah **struktural**, bukan hanya bertambah commit.

### 0.1 `main` disinkronkan ke branch live, dan riwayatnya ditulis ulang

```
$ git fetch origin
 + 0f30398...e07edae main   -> origin/main   (forced update)
 - [deleted]  origin/hotfix/llm-reliability
 - [deleted]  origin/pabrik-aplikasi

$ git log --oneline -1 origin/main                 → e07edae
$ git log --oneline -1 origin/hotfix/meeting-ready → e07edae      # IDENTIK
$ git rev-list --count origin/main                 → 13           # sebelumnya puluhan
$ git merge-base --is-ancestor 0f30398 origin/main → BUKAN nenek moyang
```

| Fakta | Nilai |
|---|---|
| `main` == branch live | ✅ **`e07edae`** — temuan lama "yang live bukan `main`" **selesai** |
| Total commit di `main` | **13** — riwayat sebelum `2a47a50` (29 Agu 00:33) **hilang** akibat force-push |
| Commit yang kini yatim | `016818e`, `f6d7cb2`, `1c5809d` ada di object store tapi **bukan** nenek moyang `main` |
| Ukuran repo (GitHub API) | **32.261 KB → 1.291 KB** |
| Jumlah branch | **8 → 6** (`hotfix/llm-reliability`, `pabrik-aplikasi` dihapus) |
| Commit baru sejak `7cc9a76` | `34f6980`, `bd26098` (feat) + `9004364`, `5dd47d7`, `e07edae` (docs) |

**Konsekuensi, diukur (bukan perkiraan):**

```
$ git grep -ohE "\b[0-9a-f]{7}\b" -- 'docs/*.md' 'AGENTS.md' | sort -u | wc -l
29                                  # hash unik yang dirujuk dokumentasi
$ for c in $(…); do git cat-file -e "$c^{commit}" && git merge-base --is-ancestor "$c" origin/main; done
masih ada sebagai objek commit : 26
di antaranya BUKAN leluhur main: 22   ← yatim
sudah hilang total dari repo   : 3
```

Hash paling sering dirujuk: `794b80a` **36×**, `5faa080` 13×, `d1228c6` **11×**, `4b9da20` 8×,
`41d7386` 8×, `7cb1d0e` 7×, `2c8ad16` 7×, `2257349` 4×. Termasuk `794b80a`, `d1228c6`, `41d7386`,
`2132855`, `a7c2281`, `7c342e7`, `dab2da1`, `5581bf7`, `a8a6dc4`, `916cb9a`, `2257349` (matriks
R1–R12 di `docs/ai/AGENT_BRIEF_PR_AI_SOT.md` dan seluruh catatan sesi) — **tidak lagi dapat
ditelusuri** dari `main`. Baseline regresi tidak bisa direproduksi dari riwayat; `git blame`
terpotong di `2a47a50`.

**`docs/LAPORAN-BRANCH-2026-08-29.md` sudah basi terhadap dirinya sendiri:** header menulis `@ 5dd47d7` (sebenarnya `e07edae`), lalu di bagian detail menulis `main HEAD: 016818e (26-Agu) — tertinggal 60 commit` dan *"main tinggal fast-forward"* — padahal force-push sudah terjadi dan `016818e` bukan lagi nenek moyang.

**`AGENTS.md` masih salah, dan kini salahnya berbeda:** `Last update` sudah diperbarui ke DTSEN_ROOT ✅, tetapi baris `Deploy state` di bawahnya **tidak disentuh** — masih `PROD = 4f95617`, `"main tertinggal 44+ commit"`, `"Semua 8 branch sudah di-push"`. Ketiganya salah: PROD = `e07edae`, main **sinkron**, branch tinggal **6**.

### 0.2 🔴 KRITIS — password live dan NIK asli ter-commit ke repo

`docs/ai/SESI-2026-08-29-dtsen-root-bnba.md` (ter-commit di `origin/main`, dapat dibaca publik):

```
baris 28: - Verifikasi live: `dtsen_root` → "AL HAFIZH RAIHAN ARIGADIEI · 3216022603070011" ✅; …
baris 52: - `dtsen_root` / `cPtnkHE7NYD3Gg_s` (DTSEN_ROOT — ganti password segera)
```

Terverifikasi **dua cara**, keduanya dijalankan ulang pada pemeriksaan ini:

1. `git grep` terhadap tree `origin/main` — bukan di history lama saja, tapi di **HEAD**.
2. **Diambil langsung lewat URL mentah publik, tanpa autentikasi apa pun:**

```
$ curl -s -o /dev/null -w "%{http_code}\n" \
    https://raw.githubusercontent.com/niumination/cc-acehtengah/main/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md
200
$ curl -s <URL sama> | grep -nE "cPtnkHE7NYD3Gg_s|3216022603070011"
28:- Verifikasi live: `dtsen_root` → "AL HAFIZH RAIHAN ARIGADIEI · 3216022603070011" ✅; `master_admin` → termask ✅
52:- `dtsen_root` / `cPtnkHE7NYD3Gg_s` (DTSEN_ROOT — ganti password segera)
```

Siapa pun yang tahu URL berkas itu dapat membaca passwordnya hari ini. Perhatikan bahwa baris 52
**sudah menulis *"ganti password segera"*** — tim menyadari risikonya, tetapi sampai pemeriksaan
ini passwordnya belum diganti dan riwayatnya belum dibersihkan. Itu sebabnya WP0.00 harus berupa
tindakan (cabut + bersihkan riwayat), bukan sekadar catatan tambahan.

| Yang bocor | Mengapa kritis |
|---|---|
| **Password akun `DTSEN_ROOT`** | Role ini satu-satunya yang bisa mendekripsi **nama asli + NIK lengkap 235.011 orang**. Repo bersifat publik. Password = kunci ke seluruh BNBA. |
| **Nama lengkap + NIK 16 digit satu orang sungguhan** | Data pribadi warga. Melanggar UU 27/2022 **dan** aturan repo sendiri (`scripts/pii-gate.sh`, baris *"Flag nama per-orang nyata"*). |
| **Gerbang PII tidak menangkapnya** | `scripts/pii-gate.sh` hanya `os.walk('src/data/excel')` — **tidak memindai `docs/`**. Jadi gerbangnya hijau padahal ada kebocoran. |

Ini temuan dengan prioritas tertinggi di seluruh audit — di atas bug data mana pun.

### 0.3 Role & BNBA: yang dikerjakan, dan yang belum

**Dikerjakan (`34f6980` + `bd26098`):**

| Item | Status verifikasi saya |
|---|---|
| `scope=individu` di `/api/dtsen/breakdown` **digembok** | ✅ `curl` tanpa cookie → **HTTP 401** `"Daftar per-orang adalah data terbatas DTSEN…"` |
| Audit trail `BREAKDOWN_INDIVIDU` | ✅ ada di kode (`buildAuditEntry` + `dataAccessAudit.create`) |
| Enkripsi AES-256-GCM untuk `namaAsliEnc`/`nikEnc` | ✅ `src/lib/dtsen-crypto.ts`, format `iv(12)\|\|tag(16)\|\|ct`, key `DTSEN_DATA_KEY` base64url ≥32B |
| Role baru `DTSEN_ROOT` | ✅ enum Prisma + `CREATE TYPE` fallback di `setup/admin` + `ROLES_AGGR`/`ROLES_PERSONAL` |
| Tombol 🔐 Login di blocker BNBA + di header publik | ✅ `BreakdownExplorer.tsx`, `dashboard/layout.tsx` |
| Logout → `/dashboard` (bukan `/login`) | ✅ |
| NIK di `/api/query` publik tetap didefleksi | ✅ diuji: *"Jalur publik ini tidak pernah memproses data per-orang…"* |

**Belum — dan ini yang perlu disempurnakan:**

| # | Masalah | Bukti |
|---|---|---|
| 🔴 B1 | **Password + NIK ter-commit** (lihat §0.2) | `git grep` di `origin/main` |
| 🔴 B2 | **`scope=individu` tidak punya batas laju.** `take: 200` per panggilan, tanpa rate limit. 295 desa × ~7 desil ≈ **1.175 permintaan** untuk menyeret seluruh 235.011 nama. Audit mencatat, tapi tidak mencegah. | `breakdown/route.ts` |
| 🔴 B3 | **Audit gagal tidak menghentikan akses.** `await prisma.dataAccessAudit.create(...).catch(e => console.error(...))` — bila INSERT gagal, data tetap dikembalikan. Melanggar prinsip repo sendiri: *"Setiap akses restricted (izinkan atau tolak) diaudit."* | `breakdown/route.ts` |
| 🟠 B4 | **Breakdown agregat masih publik tanpa auth.** `scope=kecamatan` → **200**, `scope=kecamatan&program=pbi` → **200** (`total: 169891`). Sudah saya laporkan kemarin sebagai WP0.8, belum ditangani. Jalan `program=*` menghitung langsung dari `DtsenIndividu` saat query, bukan dari agregat tersensor `k≥5` hasil publish. | `curl` |
| 🟠 B5 | **`DTSEN_ROOT` = satu akun melihat 235.011 NIK tanpa dasar hukum tertulis.** Tidak ada dokumen dasar hukum, tidak ada masa berlaku, tidak ada tinjauan berkala. Catatan sesi hanya menulis *"ganti password segera"*. | `SESI-…-dtsen-root-bnba.md` |
| 🟠 B6 | **Pesan gate tidak ikut diperbarui.** 401 menulis *"login dengan akun berrole DTSEN_LOOKUP/SUPERADMIN"* — `DTSEN_ROOT` tidak disebut, padahal justru role tertinggi. | respons 401 live |
| 🟠 B7 | **Test gerbang role tidak diperbarui → regresi.** `faseI.dtsen-gate.test.ts` gagal: mengharapkan `['DTSEN_LOOKUP','SUPERADMIN']`, dapat `['DTSEN_LOOKUP','SUPERADMIN','DTSEN_ROOT']`. `vitest` memburuk **4 → 5 gagal**. | `npx vitest run` |
| 🟡 B8 | **Istilah teknis salah di narasi publik:** *"data by-name tersimpan terpisah, **terenkripsi HMAC**"*. HMAC itu *hash* satu arah, bukan enkripsi. Sekarang justru ada enkripsi sesungguhnya (`nikEnc`) — kalimatnya malah jadi semakin tidak tepat. | respons defleksi NIK |
| 🟡 B9 | **`/dashboard/akun` masih 200 tanpa login** (WP0.9 kemarin, belum ditangani). | `curl` |

### 0.4 Bug data `jiwa == keluarga` MASIH ADA setelah re-import

Rilis di-republish (`publishedAt: 2026-08-29T08:57:31Z`) dengan 235.011 individu ber-`namaAsliEnc`/`nikEnc`, **tetapi `no_kk` tetap tidak dipakai**:

```
$ curl ".../api/dtsen/breakdown?scope=kecamatan"
total: 222643
[{"nama":"BEBESEN","jiwa":39449,"keluarga":39449}, … 14/14 identik]
```

Narasi live Q10/Q11/Q12 tetap menulis *"33.693 jiwa dalam 33.693 keluarga"*. Jadi re-import v3 menambah enkripsi identitas **tanpa** memperbaiki cacat agregasi yang sudah saya laporkan.

### 0.5 Pipeline AI: tidak berubah sama sekali

Putaran uji ke-3 (14 pertanyaan, 15:15 UTC) — hasil **identik** dengan dua putaran sebelumnya:

| Cacat | Putaran 1 (28 Agu) | Putaran 2 (29 Agu 07:51) | Putaran 3 (29 Agu 15:15) |
|---|---|---|---|
| 3 pertanyaan "persen" → 0 angka persen | ❌ | ❌ | ❌ |
| 5 pertanyaan analisis dibajak Dokumen | ❌ | ❌ | ❌ |
| 14 baris tabel fusi berkolom `Satuan` kosong | ❌ | ❌ | ❌ |
| Konflik stunting 654/730/4,9%/31,4% tanpa rekonsiliasi | ❌ | ❌ | ❌ |
| `730` dobel (Q13) · `LUT TAWAR` belum dinormalisasi | ❌ | ❌ | ❌ |
| Q5 `dataSource` kosong | ❌ | ❌ | ❌ |
| Q9 rupiah vs hektare disandingkan | ❌ | ❌ | ❌ |
| `jiwa == keluarga` | — | ❌ | ❌ |
| Q7 menggantung >175 dtk | ❌ | ✅ 5 dtk | ✅ 15 dtk |
| Istilah internal bocor ke narasi | — | ❌ Q14 | ❌ **Q3 + Q14** |

Q3 kini **jujur lagi** (*"Data spesifik perbandingan angka kemiskinan antar kecamatan … tidak tersedia dalam SAPA"*) — membaik dari template kemarin — **tetapi** (a) membocorkan kata *"Evidence"* ke pengguna, dan (b) klaim *"tidak tersedia"* itu **menyesatkan**: data kemiskinan per kecamatan **ADA** di DTSEN (`per_kecamatan_desil`), hanya tidak dicari karena pertanyaan tidak memuat kata "DTSEN".

Q6 berayun kembali ke *"jumlah penduduk kelas menengah 94.754 jiwa"* — jawaban berbeda untuk pertanyaan identik dalam satu hari, bukti tidak ada determinisme.

### 0.6 Gerbang mutu (di `main` baru = `e07edae`)

| Gerbang | `7cc9a76` (pagi) | `e07edae` (sore) |
|---|---|---|
| `npx vitest run` | 4 gagal / 196 lulus | **5 gagal / 195 lulus** 🔻 |
| `npx tsc --noEmit` | 26 error | **26 error** (tetap) |
| `npx next build` | ✅ | ✅ |
| `bash scripts/pii-gate.sh .` | ✅ (tidak memindai `docs/`) | ✅ — **padahal ada NIK di `docs/`** |

Distribusi 26 error `tsc` tidak berubah (dihitung ulang dengan `| grep "error TS" | sed 's/(.*//' | sort | uniq -c`):

```
16  src/services/warehouse-sync.ts
 4  src/services/data-sync.ts
 4  src/services/ai-orchestrator.ts
 1  src/services/__tests__/faseK.dtsen-planner.test.ts
 1  src/services/__tests__/faseA.kontrak.test.ts
```

Nama kelima test yang gagal (dijalankan ulang 15:33 UTC, `Test Files 2 failed | 9 passed`,
`Tests 5 failed | 195 passed`):

```
× faseI.dtsen-gate.test.ts  > requiredRolesFor > AGGR: analis + lookup + superadmin;
                              PERSONAL: hanya lookup + superadmin          ← BARU, akibat DTSEN_ROOT
× faseK.dtsen-planner.test.ts > provenance > label membawa versi + jalur + tanggal rilis
× faseK.dtsen-planner.test.ts > provenance > header narasi persis pola desain §8
× faseK.dtsen-planner.test.ts > buildAgregatAnswer > A1: desil per kecamatan
× faseK.dtsen-planner.test.ts > buildLookupNarasi > B1: ditemukan → terminimasi penuh, TANPA kebocoran
```

Test ke-5 adalah bukti konkret aturan A6: menambah role baru tanpa memperbarui test gerbang
menghasilkan regresi yang **lolos ke `main`** karena `vitest` tidak dipanggil di pre-commit.

---

## 1. Perubahan antara 28 Agu 19:09 UTC dan 29 Agu 07:49 UTC

Branch live `hotfix/meeting-ready` bergerak **3 commit** dalam ~12 jam:

```
7cc9a76  29 Agu 14:48 +0700  feat: tombol 'Pecah Jawaban' di output AI — breakdown deterministik tanpa LLM
64ada17  29 Agu 03:25 +0700  feat: halaman status sumber mandiri + diagram relasi + role clarity + format angka + hapus demo
f71fe50  29 Agu 02:39 +0700  feat(dtsen): halaman status sumber & rilis + fix case-insensitive kecamatan + DB prioritas
b519894  ← posisi saat pemeriksaan pertama
```

`main` **tidak bergerak**: masih `0f303980`. Jarak `main` → live melebar dari **5 menjadi 8 commit**.

### 1.1 Yang membaik (terverifikasi)

| # | Perbaikan | Bukti |
|---|---|---|
| ✅ 1 | **Data demo DTSEN dihapus total.** `fetchDtsenDemoData` + `DemoFilter` + label `'DTSEN Demo'` tidak ada lagi di `src/`. | `grep -rn "fetchDtsenDemoData\|DemoFilter\|DTSEN Demo" src/` → hanya sisa satu cabang label mati di `sapa-client.ts:103` |
| ✅ 2 | **Format ribuan id-ID aktif di narasi.** | Q7: `"29.019 Ton/Tahun … 50.162 Ha … 38.294 KK"`. Kemarin Q4 menulis `"189759 Orang"`; hari ini `"189.759 Orang"` |
| ✅ 3 | **Q7 tidak lagi menggantung.** Kemarin >175 dtk tanpa `event: result`; hari ini **5 detik** dengan jawaban benar dan rekomendasi substantif | `/tmp/probe-0829/Q7.sse` |
| ✅ 4 | **Filter kecamatan case-insensitive** (`mode: 'insensitive'`) — kasus "Linge kosong" diperbaiki | `f71fe50`, terkonfirmasi di `dtsen/breakdown/route.ts` |
| ✅ 5 | **DB diprioritaskan di atas JSON offline** (SPLP → DB rilis PUBLISHED → BAPPEDA JSON) | `f71fe50` |
| ✅ 6 | **Endpoint breakdown deterministik tanpa LLM** + UI eksplorasi: `GET /api/dtsen/breakdown?scope=kecamatan\|desa\|desil` dan `src/components/BreakdownExplorer.tsx` | HTTP 200; `total: 222643`, 14 baris |
| ✅ 7 | **Halaman transparansi sumber**: `/dashboard/status` (200) + `/api/dtsen/status` (401 tanpa role DTSEN — benar) | HTTP 200 / 401 |
| ✅ 8 | **Seluruh 5 route DTSEN hidup kembali**; `.bak` tersisa **3** (dari 8 di `main`): `datasets/route.ts.bak`, `datasets/[slug]/route.ts.bak`, `ews/route.ts.bak` | `git ls-tree -r --name-only origin/hotfix/meeting-ready \| grep '\.bak$'` |

### 1.2 Yang memburuk (regresi)

| # | Regresi | Kemarin | Hari ini |
|---|---|---|---|
| 🔻 1 | **Q3 "Bandingkan angka kemiskinan antar kecamatan"** | Menjawab **jujur**: *"belum tersedia pemecahan angka kemiskinan per kecamatan… data bersifat agregat kabupaten"* + rekomendasi meminta OPD menyusun data per kecamatan | **Template fallback**: *"ditemukan 17 indikator terkait: Jumlah Total Nilai Bantuan Sosial Sembako 9.980.400.000 Rupiah…"* — daftar indikator rupiah kabupaten, **tidak menyebut** bahwa permintaan per-kecamatan tidak terjawab. `grounding` kemungkinan besar mengganti narasi LLM yang jujur itu |
| 🔻 2 | **Q6 "Berapa jumlah penduduk 2025"** | Salah tapi relevan: *"jumlah penduduk **kelas menengah** 94.754 jiwa"* | **Lebih tidak relevan**: 8 indikator *"Persentase penduduk penerima pemeriksaan kesehatan gratis kelompok usia dewasa 60,5 Persen"*, *"Proporsi penduduk dengan aktivitas fisik cukup 21,4 persen"* — tidak satu pun angka penduduk |
| 🔻 3 | **Q14 "Berapa OPD yang melaporkan data?"** | Gagal total: *"Maaf, layanan AI sedang sibuk"* | LLM menyebut angka benar (38 OPD, 2.032 data) **tetapi** lewat kalimat *"tersedia **19 bukti pelaporan data** dari **5 OPD** berbeda"* — istilah internal `evidence` bocor ke bahasa pengguna dan menyesatkan |
| 🔻 4 | **`tsc --noEmit`** | 29 error di `main` | **26 error di branch live** — membaik 3, tetap merah |

### 1.3 Bug BARU yang muncul (paling serius dari pemeriksaan ulang)

**`jiwa` == `keluarga` di seluruh rilis DTSEN.**

```
$ curl "https://cc-acehtengah.vercel.app/api/dtsen/breakdown?scope=kecamatan"
total: 222643
[{"nama":"BEBESEN","jiwa":39449,"keluarga":39449},
 {"nama":"SILIH NARA","jiwa":25908,"keluarga":25908},
 {"nama":"PEGASING","jiwa":24249,"keluarga":24249}, … 14/14 identik]
```

Narasi live Q11: *"Pada scope Kecamatan Bebesen tercatat **39.449 jiwa dalam 39.449 keluarga**… desil 1: **2.993 jiwa (2.993 keluarga)**; desil 2: **3.284 jiwa (3.284 keluarga)**…"* — identik di **setiap** desil dan **setiap** kecamatan.

Akar masalah, ditelusuri di kode:

```ts
// src/services/dtsen-import.ts:205
keluargaId: /^\d{16}$/.test(noKk) ? `kk:${hmac(noKk, secret)}` : `individu:${nikHash}`
// :239-240
g.jiwa++;
if (r.keluargaId) g.keluarga.add(r.keluargaId);
```

`no_kk` **opsional** di validasi (`TEMPLATE_HEADER.filter(h => h !== 'no_kk')`), jadi ekspor BAPPEDA tanpa kolom `no_kk` lolos. Fallback-nya menjadikan **setiap individu satu "keluarga"** → `jumlahKeluarga === jumlahJiwa`.

Angka yang benar ada di sumber yang sama: `dtsen-agregat-bappeda.json` → **71.370 keluarga / 234.740 jiwa** (rasio 3,29 jiwa/KK). DB sekarang melaporkan **222.643 "keluarga"** — menggelembung **3,1×**.

Konsekuensi: **semua** jawaban berbasis keluarga dari jalur DTSEN salah, dan `f71fe50` baru saja menjadikan DB sebagai sumber prioritas.

**Konflik PBI antar sumber:**

| Sumber | Total PBI (jiwa) | % dari populasi |
|---|---|---|
| `/api/dtsen/breakdown?program=pbi` (DB) | **169.891** | 76,3% dari 222.643 |
| `dtsen-agregat-bappeda.json` `bansos_per_kecamatan` | **216.322** | 92,2% dari 234.740 |
| Selisih | **46.431 (21,5%)** | tidak direkonsiliasi di mana pun |

Perkiraan saya kemarin bahwa JSON mendobel-hitung `pbi_nas` + `pbi_pemda` **terdukung** oleh angka DB yang lebih rendah — tetapi keduanya tetap tidak masuk akal (76% maupun 92%) dan tidak ada satu pun peringatan di output.

### 1.4 Yang tetap tidak berubah

| Temuan | Status |
|---|---|
| Bug parser angka `sapa-client.ts` | **TETAP ADA**, kini baris **433**: `Number(String(r.variabel).replace(/[^\d.-]/g,''))` |
| Urutan routing | **TETAP**: meta → defleksi → `detectExcelDocQuery` → `buildContext` → fusi/dokumen **RETURN** → tren/perbandingan → LLM |
| 5 pertanyaan dibajak Dokumen | **TETAP** (diuji ulang via `tsx` di branch live — hasil identik) |
| 3 pertanyaan "persen" → 0 angka persen | **TETAP** (Q10, Q12, Q13) |
| Kolom `Satuan` kosong di 14 baris tabel fusi | **TETAP** (Q1, Q4, Q13) |
| Konflik stunting 654 / 730 / 4,9% / 31,4% | **TETAP**, tanpa rekonsiliasi |
| `730` muncul dua kali (Q13) | **TETAP** |
| Nama kecamatan `LUT TAWAR` | **TETAP** belum dinormalisasi |
| Q5 `dataSource` kosong | **TETAP** |
| Q8 tren IPM tanpa alternatif | **TETAP** |
| Q9 membandingkan rupiah vs hektare | **TETAP** |
| `/api/ews` 404 + `EwsPanel` diam | **TETAP** |
| Berkas nyasar `~/Desktop/Niumination/…/bapokting-client.ts` | **TETAP** ter-commit |
| `vitest` 4 gagal / 196 lulus | **TETAP**, di `main` **maupun** branch live |
| SAPA: 2.032 record / 38 OPD / 1.793 indikator; 40,2% tanpa tahun; 32 indikator multi-tahun; 148 nilai nol; warehouse kosong | **TETAP** identik |
| `AI_MODEL=auto`, base `api.hcnsec.cn` | **TETAP** |
| AGENTS.md salah | **MASIH**, dan kini dobel: klaim `PROD = 4f95617` (sebenarnya `7cc9a76`) dan `"main tertinggal 44+ commit"` (sebenarnya 8) |

### 1.5 Temuan kecil baru

- **Label sumber tidak lagi jujur — pola yang sama dengan bug demo yang baru saja diperbaiki.** Q10/Q11 berlabel `dataSource: "SAPA Aceh Tengah + DTSEN (BAPPEDA Des 2025 — offline)"` dan narasi menulis *"jalur impor manual"*, padahal `f71fe50` menjadikan **DB** sumber prioritas. Bukti angkanya dari DB, bukan JSON offline: Bebesen **39.449 jiwa / 196 kelompok** (DB) vs **43.070 jiwa / 98 kelompok** (JSON `per_kecamatan_desil`), dan desil-1 kabupaten **33.693 / 295 kelompok** (DB) vs **33.996 / 98** (JSON). Label `"…— offline"` hanya didefinisikan di satu tempat: `src/data/dtsenBappedaSource.ts:24` (`const LABEL`), sedangkan `releaseNumber` `'BAPPEDA-DES-2025'` dipakai bersama oleh DB dan JSON — jadi label tidak bisa lagi membedakan sumber.
- `formatAngka` id-ID diterapkan di narasi **tetapi tidak di sel tabel visualisasi**: Q10 narasi menulis `33.693`, tabelnya menulis `"33693"`.
- `/dashboard/akun` balas **200** tanpa login, sementara `/dashboard/laporan` dan `/dashboard/admin/dtsen` benar **307 → /login**.
- `/api/dtsen/breakdown` **tanpa pemeriksaan auth** (dipanggil publik, HTTP 200) sementara `/api/dtsen/status` **401**. Untuk `scope=desa&kecamatan=CELALA` sel terkecil **309 jiwa** — tidak ada pelanggaran k≥5 hari ini — tetapi jalur `program=*` menghitung langsung dari `DtsenIndividu` saat query, bukan dari agregat tersensor saat publish. Perlu ditegaskan apakah ini disengaja.

---

## 2. Temuan paling penting: yang live BUKAN `main`

| Fakta | Nilai terverifikasi 29 Agu 07:49 UTC |
|---|---|
| Branch yang live di Vercel | `hotfix/meeting-ready` @ **`7cc9a76`** |
| `main` | `0f303980` (27 Agu 2026) — tidak bergerak |
| Jarak | **8 commit**, `git rev-list --count origin/main..origin/hotfix/meeting-ready` |
| Total branch | 8: `main`, `hotfix/meeting-ready`, `hotfix/llm-reliability`, `feat/ai-executive-answer-v1`, `-v2-live`, `-v3`, `backup/feat-v3-saved`, `pabrik-aplikasi` |
| Klaim AGENTS.md (branch live) | `PROD = 4f95617` dan `"main tertinggal 44+ commit"` — **keduanya salah** |
| Berkas nyasar ter-commit | `~/Desktop/Niumination/services/cc-acehtengah/src/lib/bapokting-client.ts` |
| `AGENTS.md` di `main` menyebut | `AI_MODEL=nemotron-3-ultra-free`, base `opencode.ai/zen/v1` |
| Yang benar-benar jalan | `AI_BASE_URL=https://api.hcnsec.cn/v1`, `AI_MODEL=auto` — dari `curl /api/health` |

**Implikasi:** siapa pun yang memperbaiki `main` tidak memperbaiki yang dilihat pengguna. Perkembangan tercepat justru terjadi di branch yang tidak tercatat sebagai produksi di dokumentasinya sendiri.

---

## 3. Kondisi gerbang mutu

| Gerbang | `main` (`0f303980`) | branch live (`7cc9a76`) |
|---|---|---|
| `npm ci` | ✅ | ✅ |
| `npx next build` | ✅ | ✅ |
| `npx vitest run` | ❌ **4 gagal / 196 lulus (200)** | ❌ **4 gagal / 196 lulus (200)** |
| `npx tsc --noEmit` | ❌ **29 error** | ❌ **26 error** |

**Distribusi 26 error di branch live:**

| Berkas | Error |
|---|---|
| `src/services/warehouse-sync.ts` | 16 |
| `src/services/data-sync.ts` | 4 |
| `src/services/ai-orchestrator.ts` | 4 |
| `src/services/__tests__/faseK.dtsen-planner.test.ts` | 1 |
| `src/services/__tests__/faseA.kontrak.test.ts` | 1 |

**Akar 4 test gagal:** fixture memakai bentuk lama, kode memakai bentuk baru.

```ts
// src/services/__tests__/faseK.dtsen-planner.test.ts:44
const RELEASE: ReleaseRef = { versi: 'v2.0-2026-08', jalur: 'MANUAL', publishedAt: ... };

// src/services/dtsen-planner.ts
export interface ReleaseRef { releaseNumber: string; status: string; publishedAt: ... }
```

Runtime: `buildProvenanceLabel()` menghasilkan **`"DTSEN rilis undefined — jalur impor manual — …"`**. Jadi label provenance DTSEN memang rusak, bukan sekadar test basi.

**Akar 20 error warehouse/data-sync:** model Prisma `SapaSnapshot`, `SapaIndicatorValue`, `Dataset`, `Skpd`, `Indicator` **tidak ada di `prisma/schema.prisma`**. Artinya jalur warehouse/EWS **tidak lolos kompilasi** — `next build` tetap sukses karena `tsc` bukan bagian dari build di konfigurasi ini.

---

## 4. Kondisi runtime live (29 Agu 2026)

```json
GET /api/health
{"status":"healthy","services":{"sapa":"ok","ai":"ok","qdrant":"skip"},
 "config":{"ai":"https://api.hcnsec.cn/v1","aiModel":"auto","qdrant":"(not configured)"}}
```

| Endpoint | Status |
|---|---|
| `/api/health`, `/api/stats`, `/api/kpi`, `/api/report`, `/api/geodata` | 200 |
| `/api/ews` | **404** — `route.ts.bak`, padahal `EwsPanel.tsx:18` masih `fetch('/api/ews')` dan `catch`-nya menelan error → panel selalu tampak "tidak ada alert" |
| `/api/dtsen/status` | 401 (butuh role DTSEN — benar) |
| `/api/dtsen/breakdown` | **200 tanpa auth** |
| `/dashboard`, `/dashboard/analytics`, `/dashboard/gis`, `/dashboard/status`, `/dashboard/akun` | 200 |
| `/dashboard/laporan`, `/dashboard/admin/dtsen` | 307 → `/login` (benar) |

`GET /api/report` → `kualitasData` (tidak berubah sejak kemarin):
- cakupan tahun valid **59,8%**; **816 record (40,2%) tanpa tahun**
- **hanya 32 indikator multi-tahun**
- 9 OPD tanpa satu pun record bertahun
- **148 record bernilai tepat 0**
- `perubahan.tersedia: false` — *"warehouse snapshot belum dibuat"*
- `ringkasan` menyebut **1.805 indikator unik** padahal `/api/stats` menyebut **1.793** — dua cara menghitung, dua angka, tidak direkonsiliasi

**KPI live (tidak berubah):**

| id | nilai | satuan | tahun | OPD |
|---|---|---|---|---|
| stunting | 31,4 | Persen | 2025 | BAPPEDA |
| ipm | 78,09 | Indeks | 2025 | BAPPEDA |
| asn | 9610 | pegawai | 2026 | BKPSDM |
| kemiskinan | 12,29 | Persen | 2025 | BAPPEDA |
| kopi | 29.019 | Ton/Tahun | *null* | Perkebunan |
| **pdrb** | **11.503.360.000.000** | **Milyar** | *null* | Transmigrasi & Naker |
| jalan | 2.156,28 | Km | 2025 | Perumahan & Permukiman |
| putus-sekolah | 20 | orang | 2026 | Sekretariat Baitul Mal |

`pdrb` = **11,5 kuadriliun "Milyar"**. Nilainya rupiah; satuannya salah **10⁶×**. `putus-sekolah` dinisbatkan ke *Sekretariat Baitul Mal* — pemilik indikator yang janggal.

---

## 5. Katalog cacat statistik pada data yang sudah ter-commit

`src/data/dtsen-agregat-bappeda.json` (2.636 baris) diuji konsistensi internalnya:

| Tabel | Σ keluarga | Σ jiwa |
|---|---|---|
| `total` (deklaratif) | 71.370 | 234.740 |
| `per_kecamatan` (14 baris) | **71.370** | **234.740** |
| `per_desa` (295 baris) | **71.370** | **234.740** |
| `per_kecamatan_desil` (98 baris) | **67.702** ❌ | **227.385** ❌ |
| `per_desil` (7 baris) | **67.702** ❌ | **227.385** ❌ |

- **3.668 keluarga / 7.355 jiwa hilang** pada tabel berbasis desil → agregasi desil under-count **5,1%**, tanpa peringatan.
- Selisih terjadi di **semua 14 kecamatan**; terbesar Bebesen (−1.050 KK / −2.488 jiwa), Laut Tawar (−497 / −1.043), Kebayakan (−368 / −783).
- **Desil hanya 1–7**, padahal definisi desil = 10 kelompok. Narasi live menulis "Rincian per desil" seolah lengkap.
- `bansos_per_kecamatan` total PBI **216.322 jiwa = 92,2%** populasi; Bebesen **32.648 dari 43.070 (75,8%)**.

**Dan sekarang (lihat §1.3) DB yang dijadikan sumber prioritas melaporkan `jiwa == keluarga` dengan total 222.643** — jadi ada **tiga** angka populasi/keluarga yang saling bertentangan di satu sistem, tanpa rekonsiliasi.

---

## 6. Bug parser angka — terkonfirmasi, deterministik

`src/lib/sapa-client.ts:433` (branch live; baris 428 di `main`):

```ts
const nilaiNumber = Number(String(r.variabel).replace(/[^\d.-]/g, ''));
```

Dijalankan apa adanya via `tsx`:

| Input `variabel` | `nilaiNumber` hasil | Seharusnya | Akibat |
|---|---|---|---|
| `"2.156,28"` | **2.15628** | 2156.28 | salah 1.000× |
| `"11.503.360.000.000"` | **DROPPED** | 11503360000000 | PDRB hilang dari agregasi/evidence |
| `"31,4"` | **314** | 31.4 | persen jadi 10× |
| `"29.019"` | **29.019** | 29019 | salah 1.000× |
| `"Rp 1.250.000"` | **DROPPED** | 1250000 | indikator rupiah hilang |
| `"-1.234,5"` | **-1.2345** | -1234.5 | salah 1.000× |

`nilaiNumber` dipakai untuk: `aggregateByIndicator().sort()` (urutan evidence), `buildTrendResponse` (arah & % tren), `buildOpdComparisonRows` (pemilihan "nilai teratas"). Jadi **urutan bukti, arah tren, dan angka unggulan dihitung dari angka yang salah**, sementara teks ke pengguna memakai string mentah yang benar.

Ada **tiga parser berbeda** untuk tugas yang sama: `sapa-client.ts:433` (rusak), `trend-analysis.ts:26` dan `kpi.ts:78` (benar: `.replace(/\.(?=\d{3}\b)/g,'').replace(',','.')`).

---

## 7. Routing: terkonfirmasi ulang di branch live (29 Agu)

Urutan di `src/services/ai-orchestrator.ts`, `processAIQuery`:

```
1. tryMetaQuery
2. tryDtsenDeflection
3. detectExcelDocQuery            ← keyword Dokumen A/B/C
4. buildContext
5. buildFusedMultiSourceResponse / buildExcelDocResponse   ← RETURN di sini
6. tryDeterministicDomainQuery    (tren & perbandingan)    ← tak tercapai bila 3 cocok
7. evidence kosong → "tidak ditemukan"
8. LLM
```

Dijalankan ulang via `tsx` di branch live — hasil **identik** dengan kemarin:

| Query | `detectExcelDocQuery` | `detectIntent` | `isTrendQuery` | `isComparisonQuery` |
|---|---|---|---|---|
| "Berapa prevalensi stunting … trennya 5 tahun terakhir?" | **Dokumen B** | `tren` | true | false |
| "Bagaimana tren jumlah siswa SD 3 tahun terakhir?" | **Dokumen A** | `tren` | true | false |
| "Apa hubungan antara kemiskinan dan stunting?" | **Dokumen B** | `perbandingan` | false | true |
| "Kecamatan mana dengan stunting tertinggi?" | **Dokumen B** | `perbandingan` | false | true |
| "Bandingkan Dinas Kesehatan dan Dinas Pendidikan" | **Dokumen A** | `perbandingan` | false | true |
| "Berapa OPD yang melaporkan data?" | null | `nilai_saat_ini` | false | false |

Akar di `src/data/excelSources.ts` `KEYWORD_MAP`: `'pencapaian'`, `'stunting'`, `'penerima bantuan sosial'`, `'kuliah'`, `'mahasiswa'` diberi bobot `1000 + panjang kata`, dan `matchExcelDoc` memakai `q.includes(k)` (substring, tanpa batas kata).

Akar di `src/services/intent-detector.ts`:
- `detectIntentCategory` = 4 regex, **first-match** mengikuti urutan kunci objek — bukan skor.
- `intent.kategori` **tidak pernah dipakai memilih jalur**; hanya ditulis ke log.
- `OPD_KEYWORDS` memetakan ke nama yang tidak ada di data (`'Dinas Pendidikan'` vs `Dinas Pendidikan dan Kebudayaan`; `'Pekerjaan Umum'` vs `Dinas Pekerjaan Umum dan Penataan Ruang`). `filterByOpd` memakai `tokens.every(t => name.includes(t))`, jadi `'pendidikan'` sekaligus menyapu `Dinas Pendidikan Dayah` dan `Sekretariat Majelis Pendidikan Daerah`.
- Dari 38 OPD nyata, **20 tidak terjangkau satu pun kata kunci**: KB PPPA, Pemuda & Olahraga, BAPPEDA, Perikanan, Perumahan & Permukiman, Transmigrasi & Naker, Perdagangan, Kesbangpol, Inspektorat, Pemberdayaan Masyarakat & Kampung, Kominfo, Set. DPRK, Set. Majelis Pendidikan Daerah, Perhubungan, Pangan, Set. Majelis Adat Gayo, Pertanahan, Satpol PP & WH, Kependudukan & Capil, Set. MPU.

Akar di `src/services/meta-query.ts`: `detectMetaQuery` memakai gerbang negatif — **satu** kata di luar `META_STOPWORDS` mematikan seluruh jalur meta. `"Berapa OPD yang melaporkan data?"` gagal karena kata `melaporkan`.

---

## 8. Tidak ada lapisan statistik sama sekali

Diperiksa di branch live: `src/types/index.ts`, `grounding.ts`, `trend-analysis.ts`, `kpi.ts`, `dtsen-planner.ts`, `excel-doc-query.ts`, `dtsen/breakdown/route.ts`.

- `EvidenceItem` = `{ opd, indikator, nilai: string, satuan: string, tahun: string|null, id }`. **Tidak ada** tipe ukuran, penyebut, periode berstruktur, dimensi geografis.
- `satuan` **teks bebas**: `/api/analytics` → `satuanDistribusi` memuat `"Orang": 309` **dan** `"orang": 210` sebagai dua satuan.
- **Tidak ada satu pun fungsi rate/ratio/share.** Endpoint `breakdown` baru pun hanya `groupBy` + `sum` — tidak ada pembagian.
- Tidak ada geografi bersama: SAPA hanya kabupaten; data kecamatan ada di Dokumen B, Dokumen C, dan DTSEN — tiga skema, tanpa kunci wilayah bersama. `LUT TAWAR` (Dokumen B) ≠ `Laut Tawar` (`/api/geodata`).
- Tren hanya dibaca dari `ctx.filteredData` (satu snapshot). `SapaSnapshot`/`SapaIndicatorValue` **tidak pernah dibaca `trend-analysis.ts`**, dan warehouse-nya sendiri belum pernah terisi.

---

## 9. Bukti live — 14 pertanyaan, 29 Agu 2026

Semua via `POST https://cc-acehtengah.vercel.app/api/query`. Kolom **Δ** membandingkan dengan 28 Agu.

> **Putaran 4 (30 Agu 05:51 UTC) ada di bagian 00.7** — termasuk koreksi atas dua *false negative*
> di checker saya sendiri. Bagian 9 ini tetap keluaran mentah putaran 2, dipertahankan apa adanya.

**Q1 — "Berapa prevalensi stunting … trennya 5 tahun terakhir?"** (5 dtk) — **Δ tetap**
```
narasi: "…1) Dokumen B (STUNTING BY NIK.xlsx): total balita stunting 654. …
         2) Sumber lain (SAPA): Prevalensi Stunting (Pendek dam Sangat Pendek) 4,9 Persen."
viz   : table 15 baris, columns ["Indikator / Area","Nilai","Satuan","Sumber"]
        — 14 baris dokumen berkolom Satuan KOSONG
```
→ tren hilang tanpa penjelasan; cacahan + persen dalam satu kolom `Nilai`; 654 vs 730 vs 4,9% vs KPI 31,4% tidak direkonsiliasi; typo `"Pendek dam Sangat Pendek"` diteruskan.

**Q2 — "Bagaimana tren jumlah siswa SD 3 tahun terakhir?"** (1 dtk) — **Δ tetap**
```
narasi: "Berdasarkan Dokumen A — Dinas Pendidikan (2025 MISKIN PENDIDIKAN.xlsx (sheet PENCAPAIAN)):
         Tabel di bawah menampilkan agregat pemberdayaan menurut format sumber."
viz   : [["SD",300,212,88,150000000,106000000,44000000], ["SMP",…], ["SMA",…], ["TOTAL",…]]
```
→ topik salah total; narasi boilerplate; angka mentah tanpa pemisah di sel tabel; tidak ada deret waktu.

**Q3 — "Bandingkan angka kemiskinan antar kecamatan"** (5 dtk) — **🔻 MEMBURUK**
```
narasi: "Berdasarkan data SAPA untuk "Bandingkan angka kemiskinan antar kecamatan di Aceh Tengah",
         ditemukan 17 indikator terkait: Jumlah Total Nilai Bantuan Sosial Sembako (Berhasil Salur)
         9.980.400.000 Rupiah (Dinas Sosial, 2026); …"
```
→ kemarin menjawab jujur *"belum tersedia pemecahan per kecamatan"*; sekarang template daftar indikator rupiah kabupaten tanpa mengakui permintaan tak terjawab. Data per kecamatan **ADA** di DTSEN dan tidak dicari.

**Q4 — "Apa hubungan antara kemiskinan dan stunting?"** (1 dtk) — **Δ tetap** (format ribuan membaik)
```
narasi: "…2) Sumber lain (SAPA): Peserta Jaminan Kesehatan Yang Berobat Di Puskesmas 189.759 Orang;
         Jumlah Penduduk Usia 18+ Yang Dilakukan Pemeriksaan Iindeks Massa Tubuh 84.504 Orang; …"
```
→ bukti tidak relevan; pertanyaan korelasi dijawab daftar indikator; typo sumber `"Iindeks"` diteruskan.

**Q5 — "OPD mana dengan capaian terendah tahun 2025?"** (1 dtk) — **Δ tetap**
```
narasi: "Data untuk pertanyaan ini tidak ditemukan di  untuk tahun 2025."
viz   : none    rekomendasi: []    dataSource: ""
```

**Q6 — "Berapa jumlah penduduk Aceh Tengah tahun 2025?"** (3 dtk) — **🔻 MEMBURUK**
```
narasi: "…ditemukan 8 indikator terkait: Persentase penduduk penerima pemeriksaan kesehatan gratis
         kelompok usia dewasa 60,5 Persen (Dinas Kesehatan, 2025); Proporsi penduduk dengan
         aktivitas fisik cukup 21,4 persen (Dinas Kesehatan, 2025); …"
```
→ tidak satu pun angka penduduk; kemarin setidaknya menyebut segmen penduduk.

**Q7 — "berapa produksi kopi arabika"** (5 dtk) — **✅ MEMBAIK**
```
narasi: "Berdasarkan data dari Dinas Perkebunan, produksi komoditas perkebunan Kopi Arabika di Aceh
         Tengah mencapai 29.019 Ton/Tahun. Luas areal penanaman kopi arabika tercatat seluas
         50.162 Ha dengan jumlah petani sebanyak 38.294 KK."
rekom : ["Verifikasi kelengkapan data capaian indikator produksi …", "Evaluasi kesesuaian antara
         luas areal, jumlah petani, dan realisasi produksi …"]
```
→ kemarin menggantung >175 dtk tanpa hasil. Satu-satunya perbaikan kualitas jawaban yang nyata.

**Q8 — "Bagaimana tren Indeks Pembangunan Manusia?"** (2 dtk) — **Δ tetap**
```
narasi: "Tren historis … belum bisa dihitung: portal SAPA hanya memuat 1 titik tahun (2025) …
         Nilai terakhir: 78,09 Indeks (2025). Dilaporkan apa adanya … tanpa tafsiran tren oleh AI."
rekom : []
```
→ jujur, tapi tanpa alternatif, tanpa warehouse, rekomendasi kosong.

**Q9 — "Bandingkan Dinas Kesehatan dan Dinas Perkebunan"** (2 dtk) — **Δ tetap**
```
narasi: "…Dinas Kesehatan: 294 data indikator (294 jenis); Dinas Perkebunan: 79 data indikator
         (73 jenis). … nilai teratas di Dinas Kesehatan: Jumlah pengeluaran kesehatan sektor publik
         tahun sebelumnya = 168.211.121.631 Rupiah (2025); … Dinas Perkebunan: Luas areal komoditas
         perkebunan Kopi Arabika = 50.162 Ha …"
```
→ "perbandingan" = jumlah indikator; rupiah vs hektare disandingkan; rekomendasi `[]`.

**Q10 — "Seberapa besar persentase keluarga desil 1 di tiap kecamatan menurut DTSEN?"** (3 dtk) — **Δ tetap + bug baru**
```
narasi: "…Pada scope desil 1 tercatat 33.693 jiwa dalam 33.693 keluarga (agregat siap-saji k≥5;
         hitungan dari 295 kelompok wilayah·desil). … Per kecamatan — PEGASING: 4.605 jiwa; …"
viz   : table 10 baris, columns ["Indikator","Nilai","Satuan"] — nilai "33693" tanpa pemisah
```
→ **diminta persen, diberi cacahan**; **`jiwa == keluarga`**; 8 dari 14 kecamatan tanpa keterangan; narasi berformat id-ID tapi sel tabel tidak.

**Q11 — "Berapa jumlah keluarga di Kecamatan Bebesen menurut DTSEN?"** (4 dtk) — **Δ berubah + bug baru**
```
narasi: "…Pada scope Kecamatan Bebesen tercatat 39.449 jiwa dalam 39.449 keluarga …
         Rincian per desil — desil 1: 2.993 jiwa (2.993 keluarga); desil 2: 3.284 jiwa
         (3.284 keluarga); … desil 7: 15.187 jiwa (15.187 keluarga).
         Per desa — KEMILI (BEBESEN): 4.490 jiwa; BLANG KOLAK II (BEBESEN): 3.795 jiwa; …"
```
→ label desa kosong **sudah diperbaiki** ✅; tetapi **`jiwa == keluarga` di setiap desil**; `196 kelompok wilayah·desil`; desil hanya 1–7 tanpa keterangan; angka Bebesen (39.449) berbeda dari JSON (43.070) tanpa rekonsiliasi.

**Q12 — "Berapa persen keluarga di desil 1 dari total keluarga?"** (4 dtk) — **Δ tetap**
→ jawaban **identik kata per kata** dengan Q10. Persen tidak dihitung.

**Q13 — "Berapa persentase balita stunting per kecamatan?"** (1 dtk) — **Δ tetap**
```
narasi: "…1) Dokumen B: total balita stunting 654. …
         2) Sumber lain (SAPA): Jumlah anak balita yang mengalami stunting (JAB(5) P stunting)
         730 Orang (2025); Jumlah Balita Stunting 730 Orang."
viz   : 16 baris — 14 dokumen berkolom Satuan kosong
```
→ persen tidak dihitung; `730` dobel; `LUT TAWAR` belum dinormalisasi.

**Q14 — "Berapa OPD yang melaporkan data?"** (5 dtk) — **🔻 berubah bentuk, masih salah**
```
narasi: "Berdasarkan data SAPA, tersedia 19 bukti pelaporan data dari 5 OPD berbeda, yaitu Dinas
         Komunikasi dan Informatika, Dinas Keluarga Berencana PPPA, Dinas Kesehatan, … Secara
         keseluruhan, dari 38 OPD di Kabupaten Aceh Tengah, terdapat 2.032 data indikator yang
         tersebar dalam 1.793 jenis indikator."
```
→ angka benar (38 OPD) akhirnya muncul, tetapi kalimat pembuka memakai istilah internal `evidence` ("19 bukti pelaporan data dari 5 OPD") yang **menyesatkan** — 19 dan 5 adalah ukuran evidence, bukan fakta tentang OPD. Kemarin gagal total dengan "AI sibuk".

---

## 10. Ringkasan akar masalah

| # | Lapis | Akar masalah | Status 29 Agu |
|---|---|---|---|
| 1 | **Routing** | Rantai pendek-sirkuit berbasis substring; jalur analisis mati struktural | 🔴 tetap |
| 2 | **Intent** | `intent.kategori` dideteksi lalu dibuang | 🔴 tetap |
| 3 | **Semantik ukuran** | Tidak ada `MeasureType`/satuan kanonik/penyebut/periode/geografi | 🔴 tetap |
| 4 | **Parser** | Tiga parser angka, satu merusak nilai & membuang PDRB/Rp | 🔴 tetap (`sapa-client.ts:433`) |
| 5 | **Rekonsiliasi** | Sumber ditumpuk, tidak didamaikan (654/730/4,9%/31,4%; 39.449/43.070; 169.891/216.322) | 🔴 makin parah (3 sumber kini) |
| 6 | **Mesin statistik** | Nol fungsi rate/ratio/share/rank/z/correlation; `breakdown` baru pun hanya `sum` | 🔴 tetap |
| 7 | **Narasi** | Template gabungan sumber, bukan temuan; istilah internal bocor (Q14) | 🔴 tetap |
| 8 | **Kualitas data** | 40,2% tanpa tahun; 32 indikator multi-tahun; 148 nilai nol; desil 1–7; under-count 5,1%; **`jiwa == keluarga`** | 🔴 memburuk |
| 9 | **Evaluasi** | 200 unit test fungsi, **nol** test kualitas/routing jawaban; `tsc` tidak di gerbang | 🔴 tetap |
| 10 | **Operasional** | Live ≠ `main` (8 commit); berkas nyasar; 3 `.bak`; `AI_MODEL=auto`; AGENTS.md salah dobel | 🟡 sebagian membaik |
| 11 | **Kejujuran sumber** | Data demo | 🟢 **selesai** (dihapus total) |

---

## 11. Perintah reproduksi

Perintah di bawah menghasilkan angka-angka di bagian 00 (30 Agu). Nilai harapan ditulis sebagai
komentar; bila berbeda, repo sudah bergerak lagi — **perbarui brief, jangan asumsikan**.

```bash
# ── 1. Posisi repo ──
git clone https://github.com/niumination/cc-acehtengah && cd cc-acehtengah
git fetch origin --prune
git rev-parse --short origin/main origin/hotfix/meeting-ready      # e07edae / e07edae
git rev-list --count origin/main                                    # 13
git rev-parse --short origin/feat/ai-executive-answer-v3            # 946e3f3
git rev-list --count origin/main..origin/feat/ai-executive-answer-v3   # 10
git rev-list --count origin/feat/ai-executive-answer-v3..origin/main   # 0

# ── 2. Kebocoran (WP0.00) ──
git show origin/main:docs/ai/SESI-2026-08-29-dtsen-root-bnba.md | grep -nE "cPtnkHE7NYD3Gg_s|3216022603070011"
git show origin/feat/ai-executive-answer-v3:docs/ai/SESI-2026-08-29-dtsen-root-bnba.md | grep -nE "cPtnkHE7NYD3Gg_s|3216022603070011"
curl -s -o /dev/null -w '%{http_code}\n' https://raw.githubusercontent.com/niumination/cc-acehtengah/main/docs/ai/SESI-2026-08-29-dtsen-root-bnba.md   # 200 = masih bocor
git grep -n "cPtnkHE7NYD3Gg_s" $(git rev-list --all) | head          # riwayat
sed -n '14p' scripts/pii-gate.sh                                     # hanya os.walk('src/data/excel')

# ── 3. Gerbang mutu di KEDUA branch ──
npm ci
git checkout -B live-audit3 origin/feat/ai-executive-answer-v3
npx vitest run     # v3: 5 failed | 213 passed (218)   · main: 5 failed | 195 passed (200)
npx tsc --noEmit 2>&1 | grep "error TS" | sed 's/(.*//' | sort | uniq -c | sort -rn   # v3: 32 total
npx next build     # ✓ Compiled successfully (exit=0)
bash scripts/pii-gate.sh .    # LEAK_COUNT 0 — hijau padahal ada NIK di docs/

# ── 4. Tidak ada lapisan statistik (juga di v3) ──
git ls-tree -r --name-only origin/feat/ai-executive-answer-v3 | grep -i statistic      # kosong
git grep -c "zScore\|growthRate\|shareOf\|percentRate" origin/feat/ai-executive-answer-v3 -- 'src/**'   # 0

# ── 5. Dua parser angka ──
git show origin/feat/ai-executive-answer-v3:src/services/opd-drilldown.ts | sed -n '35,41p'   # BENAR
git show origin/feat/ai-executive-answer-v3:src/lib/sapa-client.ts | sed -n '433p'            # RUSAK

# ── 6. Insight boilerplate di lapisan baru ──
git show origin/feat/ai-executive-answer-v3:src/services/executive-presentation.ts | sed -n '233,258p'

# ── 7. Berkas nyasar & .bak ──
git ls-tree -r --name-only origin/main | grep -c '\.bak$'                            # 3
git ls-tree -r --name-only origin/feat/ai-executive-answer-v3 | grep -c '\.bak$'      # 0
git ls-tree -r --name-only origin/feat/ai-executive-answer-v3 | grep '~'               # masih 1

# ── 8. Endpoint live + apa yang terdeploy ──
B=https://cc-acehtengah.vercel.app
for p in /api/health /api/ews /api/datasets /api/analytics/opd/dinas-pendidikan /dashboard/akun /api/dtsen/status; do
  printf "%-38s %s\n" "$p" "$(curl -s -o /dev/null -w '%{http_code}' "$B$p")"; done
curl -s "$B/api/dtsen/breakdown?scope=kecamatan" | jq '.total,(.rows[0])'
curl -s -o /dev/null -w '%{http_code}\n' "$B/api/dtsen/breakdown?scope=individu&kecamatan=BEBESEN&desa=KEMILI&desil=1"

# ── 9. 14 pertanyaan audit (~3 menit; hormati rate limit 10/menit & 60/jam) ──
OUT=/tmp/probe-0830 JEDA=8 bash hermes-brief/scripts/probe-live.sh

# ── 10. Ulangi pemeriksaan TANPA menembak situs lagi (pakai SSE tersimpan) ──
for i in $(seq 1 14); do
  python3 hermes-brief/scripts/cek-jawaban.py /tmp/probe-0830/Q$i.sse "?" "<pertanyaan ke-$i>"
done
```

**Berkas paket ini**

| Berkas | Peran |
|---|---|
| `scripts/probe-live.sh` | menembak 14 pertanyaan ke situs live (butuh kuota) |
| `scripts/cek-jawaban.py` | **sumber kebenaran cek cacat**; bisa dijalankan ulang atas `.sse` tersimpan |
| `data/golden-queries.json` | 84 entri kriteria kelulusan (75 arketipe + 9 kasus `gate`) |
| `HERMES-INSTRUCTION.md` | instruksi kerja |
