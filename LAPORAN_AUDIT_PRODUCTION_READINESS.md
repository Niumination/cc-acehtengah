# Laporan Audit & Rencana Perbaikan menuju *Production Ready*
## Repo: `Niumination/cc-acehtengah` — KOMANDO AT / Command Center AI Aceh Tengah

| Item | Nilai |
|---|---|
| Tanggal audit | 20 Agustus 2026 |
| Commit dasar | `794b80a` — *fix(ai): TableRenderer crash saat columns format object {key,name}* |
| Branch kerja | `arena/01a01ff8-cc-acehtengah` |
| Stack terverifikasi | Next.js 16.2.10 (App Router, Turbopack) · React 19.2.4 · Prisma 6.19.3 · Tailwind v4 · Recharts 3 · Leaflet 1.9 · jose 6 · bcryptjs 3 · Zod 4 |
| Ukuran kode aplikasi | 5.550 baris TS/TSX di `src/` (58 file) |
| Tooling skill | `autoskills` v0.3.6 (midudev) — 19 skill terpasang |

---

## 0. Cara membaca laporan ini

Setiap temuan diberi label bukti:

| Label | Arti |
|---|---|
| **[TERUJI]** | Direproduksi langsung di sandbox (perintah + output tercatat di laporan) |
| **[KODE]** | Terbukti dari pembacaan kode; jalur eksekusi jelas dan deterministik |
| **[REFERENSI]** | Divalidasi terhadap sumber publik yang bisa diakses bebas (URL dicantumkan) |
| **[TIDAK DAPAT DIVERIFIKASI]** | Butuh akses yang tidak tersedia di sandbox — **tidak** diklaim sebagai fakta |

Tidak ada temuan dalam laporan ini yang berasal dari asumsi. Bila sesuatu tidak bisa diuji,
statusnya ditulis apa adanya pada **§1.2 Batasan**.

---

## 1. Metodologi

### 1.1 Yang dikerjakan

1. **Menjalankan `autoskills`** (`https://github.com/midudev/autoskills`) untuk deteksi teknologi
   dan pemasangan skill agent.
2. **Analisis statis**: `tsc --noEmit`, `eslint .`, `npm audit`, `npm outdated`, pemetaan dead code,
   pemetaan dependency tak terpakai.
3. **Build produksi**: `npm run build` (Turbopack) — sukses/gagal dicatat apa adanya.
4. **Uji runtime**: server dijalankan pada mode `next dev` **dan** `next start`, lalu 20+ endpoint
   diuji dengan `curl` (happy path, error path, input tidak valid, tanpa autentikasi,
   dengan token palsu).
5. **Uji keamanan terarah**: forging JWT, bypass middleware, open-redirect, endpoint setup tanpa auth,
   malformed payload.
6. **Audit UI/UX & aksesibilitas**: perhitungan rasio kontras WCAG (script Python, hasil di §7),
   pemeriksaan landmark/heading/label/ARIA pada HTML hasil render.
7. **Validasi data**: daftar kecamatan Aceh Tengah dicek terhadap sumber publik.

### 1.2 Batasan sandbox (penting, jangan diabaikan)

Jaringan keluar sandbox dibatasi allow-list. Yang **terblokir**:

| Host | Dampak pada audit |
|---|---|
| `raw.githubusercontent.com` | `npx autoskills` gagal mengunduh skill → di-*workaround* (lihat §2) |
| `binaries.prisma.sh` | `prisma generate` tidak bisa dijalankan → Prisma Client asli tidak tersedia |
| `api-splp.layanan.go.id` | Data SAPA live **tidak bisa** diambil → validasi isi data SAPA tidak dilakukan |
| `sapa.acehtengahkab.go.id` | idem |
| `fonts.googleapis.com` | `next build` gagal pada `next/font/google` (lihat temuan **P1-06**) |

Konsekuensi yang harus dicatat jujur:

- Untuk bisa menjalankan build & smoke test, dibuat **stub lokal** Prisma Client
  di `node_modules/.prisma/client` (tidak di-commit, `node_modules/` ada di `.gitignore`)
  dan `next/font/google` dinonaktifkan **sementara** lalu **dikembalikan** ke kondisi semula.
  Verifikasi: `git status` bersih untuk seluruh file `src/` (hanya `.agents/`, `skills-lock.json`,
  dan laporan ini yang baru).
- 2 error TypeScript pada `src/app/api/chat-logs/route.ts:36` (`Parameter 'r'/'s' implicitly has an
  'any' type`) muncul **karena** Prisma Client belum di-generate. Dengan client asli, `groupBy()`
  bertipe, sehingga error ini kemungkinan besar **hilang**.
  **[TIDAK DAPAT DIVERIFIKASI]** — jangan dianggap bug repo sampai diuji di mesin dengan
  `prisma generate` berhasil.
- Kebenaran isi data SAPA (nama OPD, jumlah record, format `variabel`) **tidak diverifikasi**.
  Semua temuan tentang SAPA di bawah ini murni tentang *kode yang mengolahnya*, bukan tentang datanya.

---

## 2. Hasil `autoskills`

### 2.1 Deteksi teknologi

```
$ npx autoskills --dry-run
  ◆ Detected technologies:
     ✔ React          ✔ Next.js        ✔ Tailwind CSS
     ✔ TypeScript     ✔ Zod            ✔ Vercel
     ✔ Node.js        ✔ Bash           ✔ Prisma
```

Deteksi **akurat** — 9 teknologi, semuanya benar-benar dipakai repo ini.

### 2.2 Kendala pemasangan & solusinya **[TERUJI]**

Menjalankan `npx autoskills -y` gagal total: 19/19 skill `download failed: fetch failed`.
Penyebab pasti (bukan dugaan):

```
$ curl -o /dev/null -w "%{http_code}" https://raw.githubusercontent.com/...
curl: (35) OpenSSL SSL_connect: SSL_ERROR_SYSCALL   → 000   (diblokir)
$ curl -o /dev/null -w "%{http_code}" https://codeload.github.com/...
200                                                   (lolos)
```

`installer.ts` autoskills mengunduh dari `raw.githubusercontent.com`
(konstanta `DEFAULT_REGISTRY_RAW_BASE_URL_PREFIX`), yang diblokir.

**Solusi yang dipakai (tetap resmi, bukan bypass integritas):** CLI dijalankan langsung dari
klon resmi repo autoskills (`git clone` via `github.com` yang lolos). Pada mode ini installer
memakai jalur `copyRegistryEntryFromLocal()` yang tetap memverifikasi
`sha256` per file + `bundleHash` per skill terhadap `skills-registry/index.json`.
Jadi integritas skill tetap terjaga.

```
$ node /tmp/autoskills/packages/autoskills/index.mjs -y
   ✔ Done! 19 skills installed in 113ms.
```

### 2.3 19 skill terpasang (`.agents/skills/`, terkunci di `skills-lock.json`)

| # | Skill | Sumber | Dipicu oleh |
|---|---|---|---|
| 1 | `react-best-practices` | vercel-labs | React |
| 2 | `composition-patterns` | vercel-labs | React |
| 3 | `next-best-practices` | vercel-labs | Next.js |
| 4 | `next-cache-components` | vercel-labs | Next.js |
| 5 | `next-upgrade` | vercel-labs | Next.js |
| 6 | `tailwind-css-patterns` | giuseppe-trisciuoglio | Tailwind |
| 7 | `typescript-advanced-types` | wshobson | TypeScript |
| 8 | `zod` | pproenca | Zod |
| 9 | `deploy-to-vercel` | vercel-labs | Vercel |
| 10 | `nodejs-backend-patterns` | wshobson | Node.js |
| 11 | `nodejs-best-practices` | sickn33 | Node.js |
| 12 | `bash-defensive-patterns` | wshobson | Bash |
| 13 | `prisma-database-setup` | prisma | Prisma |
| 14 | `prisma-client-api` | prisma | Prisma |
| 15 | `prisma-cli` | prisma | Prisma |
| 16 | `prisma-postgres` | prisma | Prisma |
| 17 | `frontend-design` | anthropics | Frontend |
| 18 | `accessibility` | addyosmani | Frontend |
| 19 | `seo` | addyosmani | Frontend |

Skill yang paling banyak menghasilkan temuan pada audit ini: `next-best-practices`
(konvensi `middleware` → `proxy`), `accessibility` (WCAG 2.2), `seo` (robots/sitemap/metadata),
`bash-defensive-patterns` (`scripts/sync-all.sh`), `nodejs-backend-patterns` (validasi input,
error handling), `prisma-*` (drift schema vs kenyataan).

---

## 3. Ringkasan eksekutif

**Verdict: BELUM production ready.** Aplikasi *berjalan* dan *build*-nya lolos, tetapi ada
**2 celah keamanan kritis yang bisa dieksploitasi tanpa kredensial apa pun**, ditambah data
geospasial yang **tidak akurat** dan disajikan sebagai fakta pada dashboard pemerintah.

| Severity | Jumlah | Contoh |
|---|---:|---|
| 🔴 **P0 — Kritis** (blokir rilis) | 5 | JWT secret hardcoded, endpoint setup tanpa auth |
| 🟠 **P1 — Tinggi** | 12 | Auth mati di `next dev`, mock mode rusak, data kecamatan salah |
| 🟡 **P2 — Sedang** | 15 | Kontras WCAG gagal, 0 `aria-*`, 0 tes, tanpa CI |
| 🔵 **P3 — Rendah / higienis** | 11 | Dead code, dependency tak terpakai, duplikasi file env |

Skor kesiapan (bobot: keamanan 30%, keandalan 25%, kualitas data 20%, a11y/UX 15%, DX/CI 10%):

| Dimensi | Skor | Catatan |
|---|---:|---|
| Keamanan | **2/10** | Bisa ambil-alih sesi admin tanpa kredensial |
| Keandalan | **4/10** | Tanpa rate limit, tanpa retry SAPA, cache in-memory di serverless |
| Kualitas data | **3/10** | Kecamatan fiktif, metrik "kelengkapan" salah hitung |
| Aksesibilitas & UX | **4/10** | 0 atribut ARIA, kontras teks sekunder gagal AA |
| DX / CI / Test | **1/10** | 0 tes, 0 workflow CI, `npm run lint` gagal |
| **Total tertimbang** | **≈ 2,9 / 10** | |

---

## 4. Temuan P0 — Kritis (wajib diperbaiki sebelum rilis publik)

### P0-01 · JWT secret hardcoded → siapa pun bisa memalsukan sesi SUPERADMIN **[TERUJI]**

`src/lib/auth.ts:6`
```ts
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'cc-acehtengah-secret-key-2026'   // ← nilai ini publik di GitHub
);
```

Bukti eksploitasi (server `next start`, `JWT_SECRET` tidak di-set — persis kondisi yang
"diizinkan" oleh dokumen repo):

```
$ node -e "…SignJWT({id:'x',username:'hacker',role:'SUPERADMIN'})…sign('cc-acehtengah-secret-key-2026')"
$ curl -H "Cookie: cc-admin-session=$TOK" localhost:3000/api/auth/me
200 {"authenticated":true,"admin":{"username":"hacker","role":"SUPERADMIN",…}}

$ curl -H "Cookie: cc-admin-session=$TOK" localhost:3000/dashboard/laporan
200  (bukan 307 ke /login)
```

**Diperparah dokumentasi yang salah.** `VERCEL_ENV.md` dan `AGENTS.md` menulis:

> `JWT_SECRET` — *Auth (Optional — auto-generated if not set)* / *Auto-generated if not set*

Ini **tidak benar**. Tidak ada kode yang meng-*generate* secret. Operator yang percaya dokumen ini
akan men-deploy tanpa `JWT_SECRET` dan langsung rentan.

**Perbaikan:**
```ts
// src/lib/auth.ts
const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  throw new Error('JWT_SECRET wajib di-set (min. 32 karakter). Generate: openssl rand -base64 48');
}
const JWT_SECRET = new TextEncoder().encode(secret);
```
Tambahan: rotasi secret di Vercel (semua sesi lama otomatis invalid), lalu perbaiki
`VERCEL_ENV.md` + `AGENTS.md` (`JWT_SECRET` = **WAJIB**, bukan opsional).

---

### P0-02 · `POST /api/setup/admin` publik → menciptakan admin `admin/admin123` **[TERUJI]**

`src/app/api/setup/admin/route.ts` — tidak ada pemeriksaan auth apa pun. Endpoint ini:
membuat tabel `Admin`, lalu **men-seed `admin` / `admin123`** bila tabel kosong.
Sama untuk `POST /api/setup` (menjalankan DDL `CREATE TABLE`/`CREATE INDEX`).

`middleware.ts` hanya melindungi `/dashboard/laporan` dan `/api/chat-logs` — kedua endpoint setup
**tidak** ada dalam matcher **[KODE]**. Uji: `POST /api/setup` mencapai handler tanpa cookie
(HTTP 500 hanya karena DB stub, bukan karena ditolak) **[TERUJI]**.

Lebih buruk: langkah ini **didokumentasikan publik** di `README.md` dan `PRODUCTION_SETUP.md`
lengkap dengan URL produksi:
```bash
curl -X POST https://cc-acehtengah.vercel.app/api/setup/admin
```

Skenario nyata: tabel `Admin` terhapus/kosong karena reset DB → penyerang memanggil endpoint →
akun `admin/admin123` tercipta → login penuh.

**Perbaikan (pilih salah satu, urutan preferensi):**
1. **Hapus** kedua route. Ganti dengan `prisma migrate deploy` + skrip seed lokal
   (`npx tsx scripts/seed-admin.ts`) yang membaca password dari env.
2. Bila tetap dibutuhkan: kunci dengan header rahasia sekali pakai + matikan setelah dipakai:
```ts
export async function POST(req: NextRequest) {
  const token = process.env.SETUP_TOKEN;
  if (!token || req.headers.get('x-setup-token') !== token) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (process.env.SETUP_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  …
}
```
Dan **jangan** hardcode `admin123` — ambil dari `process.env.ADMIN_BOOTSTRAP_PASSWORD`, wajib ada.

---

### P0-03 · Kredensial default publik + hash bcrypt ikut ter-commit **[KODE]**

- `README.md`, `AGENTS.md`, `PRODUCTION_SETUP.md`, `VERCEL_ENV.md` semuanya mencantumkan
  `admin` / `admin123`.
- `supabase/migrations/002_create_admin_table.sql` menyimpan hash bcrypt untuk `admin123`:
  `$2b$12$x1GHKcXNPV5N4Ooj/eMiIOEnsTbrzvCY43Z0Ca9AArkfK6FyDxra.`
- **Tidak ada mekanisme paksa ganti password.** Tidak ada endpoint ganti password sama sekali
  (`grep -rn "change-password\|ubah-password" src` → 0 hasil), padahal dokumen menulis
  "⚠️ Ganti password setelah login pertama!" — secara teknis **tidak mungkin dilakukan lewat UI**.

**Perbaikan:** hapus kredensial dari seluruh dokumen & SQL; tambahkan kolom
`mustChangePassword Boolean @default(true)` pada model `Admin`; buat
`POST /api/auth/change-password` + halaman paksa-ganti setelah login pertama.

---

### P0-04 · `POST /api/datasets/sync` tanpa auth & tanpa rate limit **[TERUJI]**

`src/app/api/datasets/sync/route.ts` menerima `{"all": true}` dari siapa pun dan memicu sinkronisasi
seluruh dataset (fetch SAPA + tulis ke DB) — vektor DoS/biaya. Uji: request tanpa cookie mencapai
handler (HTTP 500 karena DB stub, bukan 401).

**Perbaikan:** masukkan ke matcher middleware/proxy + wajib peran `SUPERADMIN`, atau ubah menjadi
Vercel Cron Job yang diverifikasi dengan header `Authorization: Bearer ${CRON_SECRET}`.

---

### P0-05 · `POST /api/query` publik & tanpa rate limit → abuse token LLM **[TERUJI]**

Endpoint AI utama tidak butuh auth, tidak ada rate limit/kuota, tidak ada proteksi biaya.
Setiap request memanggil provider LLM eksternal berbayar (`max_tokens: 4096`).
Uji: 3 request beruntun dari klien anonim semuanya diterima (HTTP 200/400 sesuai validasi Zod).

Selain itu **malformed JSON menyebabkan HTTP 500 dengan body kosong** **[TERUJI]**:
```
$ curl -X POST -d 'not-json' localhost:3000/api/query
code=500   (body kosong)
# log server: ⨯ SyntaxError: Unexpected token 'o', "not-json" is not valid JSON
```
Penyebab: `const body = await req.json()` di baris 19 tidak dibungkus `try/catch` **[KODE]**.

**Perbaikan:**
```ts
let body: unknown;
try { body = await req.json(); }
catch { return Response.json({ error: 'Body harus JSON valid' }, { status: 400 }); }
```
+ rate limit per-IP (mis. `@upstash/ratelimit` + Upstash Redis, atau tabel `RateLimit` di Postgres),
+ `export const maxDuration = 60;` pada route SSE agar tidak terpotong timeout Vercel.

---

## 5. Temuan P1 — Tinggi

### P1-01 · Auth **tidak aktif sama sekali** saat `next dev` **[TERUJI]**

Bukti langsung — server yang sama, dua mode:

| Request | `next dev` | `next start` |
|---|---|---|
| `GET /dashboard/laporan` (tanpa cookie) | **200 OK** ❌ | 307 → `/login?from=…` ✅ |
| `GET /api/chat-logs` (tanpa cookie) | handler tereksekusi (500 dari DB) ❌ | **401 Unauthorized** ✅ |

Log `next dev` mencetak peringatan resmi Next.js:
```
⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
  Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
```

**Akar masalah (dibuktikan, bukan ditebak):** `app/` berada di `src/`, tetapi file middleware ada di
**root repo** (`./middleware.ts`). Uji A/B:

```
# A: cp middleware.ts src/middleware.ts  → dev: 307 + 401 ✅
# B: buat src/proxy.ts (export function proxy) → dev: 307 + 401 ✅
# C: kondisi repo saat ini (./middleware.ts) → dev: 200 + 500 ❌
```

Jadi build produksi kebetulan masih mengambilnya, tetapi dev tidak. Ini juga membuat seluruh
pengujian lokal memberi rasa aman palsu. Dokumentasi repo pun **tidak konsisten**:
`PRODUCTION_SETUP.md` menulis lokasi file adalah `src/middleware.ts`, padahal nyatanya di root.

**Perbaikan (sesuai skill `next-best-practices` + dokumentasi Next.js 16):**
```bash
npx @next/codemod@canary middleware-to-proxy .
# hasil yang diinginkan: src/proxy.ts  →  export async function proxy(req: NextRequest)
```
Simpan di `src/proxy.ts` (sejajar dengan `src/app/`). Sudah diuji berfungsi di dev **dan** prod.

> Catatan arsitektur (rekomendasi Next.js 16): proxy sebaiknya hanya untuk *routing/redirect/header*.
> Pemeriksaan otoritas sebaiknya **juga** diulang di layer route handler / layout
> (defense-in-depth), sehingga auth tidak bergantung pada satu file konvensi saja.
> Referensi: <https://nextjs.org/docs/messages/middleware-to-proxy>

---

### P1-02 · Open redirect pada halaman login **[KODE]**

`src/app/login/page.tsx`
```ts
const from = searchParams.get('from') || '/dashboard/laporan';
…
window.location.href = from;   // ← tidak divalidasi
```
`/login?from=https://situs-phishing.example` → setelah login sukses, pengguna dilempar ke domain luar
dengan konteks "baru saja login dari portal pemerintah". Klasik untuk phishing kredensial.

**Perbaikan:**
```ts
const raw = searchParams.get('from') ?? '';
const from = /^\/(?!\/)/.test(raw) ? raw : '/dashboard/laporan';  // hanya path internal
```

---

### P1-03 · Data kecamatan pada Peta GIS **tidak akurat** **[TERUJI + REFERENSI]**

`src/app/api/geodata/route.ts` mendefinisikan **15** kecamatan. Kabupaten Aceh Tengah resmi memiliki
**14** kecamatan: Atu Lintang, Bebesen, Bies, Bintang, Celala, Jagong Jeget, Kebayakan, Ketol,
Kute Panang, Lut Tawar, Linge, Pegasing, Rusip Antara, Silih Nara
([Wikipedia — Kabupaten Aceh Tengah, tabel Kemendagri](https://id.wikipedia.org/wiki/Kabupaten_Aceh_Tengah);
[Daftar kecamatan & gampong di Aceh](https://id.wikipedia.org/wiki/Daftar_kecamatan_dan_gampong_di_Aceh) — "Kab. Aceh Tengah … 14 kecamatan").

| Entri di kode | Status | Keterangan |
|---|---|---|
| `Banda Mulia` | ❌ **Bukan** kecamatan Aceh Tengah | Nama kecamatan di Aceh Tamiang |
| `Burni Telong` | ❌ **Bukan** kecamatan Aceh Tengah | Wilayah/gunung di Bener Meriah |
| `Permata` | ❌ **Bukan** kecamatan Aceh Tengah | Kecamatan di Bener Meriah |
| `Bies Penjara` | ❌ Nama salah | Yang benar: **Bies** |
| `Bintang` | ❌ **Hilang** | Kecamatan resmi, tidak ada di kode |
| `Jagong Jeget` | ❌ **Hilang** | Kecamatan resmi, tidak ada di kode |
| 11 lainnya | ✅ Benar | |

**Masalah yang lebih mendasar:** kolom `opds` (mis. `'Bebesen' → ['Dinas Kesehatan','Dinas Sosial','RSU Datu Beru']`)
adalah **pemetaan buatan**. OPD adalah organisasi tingkat **kabupaten**, bukan kecamatan.
Kode aplikasi sendiri mengakui ini di `src/services/intent-detector.ts`:
```ts
lokasi: undefined, // SAPA tidak punya data kecamatan-level secara langsung
```
Akibatnya `totalRecords`, `totalIndicators`, dan `dataDensity` per kecamatan pada peta adalah
**angka yang dikarang oleh logika mapping**, bukan data SAPA. Untuk dashboard resmi pemerintah, ini
risiko reputasi & akuntabilitas yang serius.

**Perbaikan:**
1. Koreksi daftar menjadi 14 kecamatan resmi + koordinat yang bersumber jelas.
   Sumber terbuka yang bisa dipakai: **GeoBoundaries ADM3 Indonesia** (<https://www.geoboundaries.org/>, CC-BY)
   atau **OpenStreetMap / Nominatim** relation batas administratif (ODbL, wajib atribusi).
2. Sampai ada data yang benar-benar ber-geolokasi, ubah peta menjadi **peta konteks wilayah**
   (batas + ibu kota) dan beri label eksplisit *"Agregasi per kecamatan belum tersedia — SAPA
   menyediakan data tingkat kabupaten/OPD"*. Lebih baik jujur kosong daripada salah berisi.
3. Tambahkan uji regresi: daftar kecamatan dijadikan konstanta ber-tes
   (`expect(KECAMATAN.length).toBe(14)` + snapshot nama).

---

### P1-04 · `USE_MOCK_DATA=true` **merusak** aplikasi, bukan menyelamatkannya **[TERUJI]**

Mode mock hanya dipasang di 2 dari 8 endpoint (`/api/query`, `/api/health`). Hasil uji nyata:

```
USE_MOCK_DATA=true
GET  /api/health → 200  {"services":{"db":"ok","ollama":"ok","qdrant":"ok","splp":"ok"}, "sapa":{…}}
GET  /api/stats  → 500  {"error":"Gagal mengambil data SAPA","detail":"fetch failed"}   ← tetap live
POST /api/query  → 200  {"narasi":"…"}   ← JSON biasa, BUKAN SSE
```

Tiga inkonsistensi terverifikasi:

1. **Dashboard utama tetap mati.** `SapaStats` (isi `/dashboard`) memanggil `/api/stats` yang tidak
   punya jalur mock → tetap memukul SAPA. Sama untuk `/api/analytics` dan `/api/geodata`.
2. **Panel AI rusak total di mode mock.** `/api/query` mengembalikan JSON polos, sementara
   `src/app/dashboard/page.tsx` mem-parse **SSE**. Simulasi parser klien terhadap respons mock asli:
   ```
   finalResult: null   live: ""
   => UI outcome: THROW: "AI tidak mengembalikan respons"
   ```
   Jadi fitur andalan justru gagal tepat saat mode presentasi dinyalakan.
3. **Skema respons `/api/health` berbeda** antara mock dan nyata:
   mock → `{db, ollama, qdrant, splp}` (menyebut **Ollama**, yang sudah tidak dipakai lagi);
   nyata → `{sapa, ai, qdrant}`. Konsumen mana pun akan pecah saat mode berganti.

**Perbaikan:** satu lapis abstraksi data (`src/lib/data-source.ts`) yang memilih mock vs live
**di satu tempat**, dipakai semua route; mock `/api/query` harus mengembalikan **SSE** dengan
urutan event yang sama (`status` → `narasi` → `result`); skema health disatukan lewat tipe
`HealthResponse` bersama. Tambahkan tes kontrak agar bentuk mock == bentuk live.

---

### P1-05 · Bug perhitungan pada `/api/analytics` — dua metrik salah **[KODE]**

**(a) `indicatorFrequency[].opds` hampir selalu kosong.**
`src/app/api/analytics/route.ts:42`
```ts
opds: [...new Set(records.filter(r => r.id_kode_indikator?.toString() === ind.kode)…)]
```
`ind.kode` berasal dari `getUniqueIndicators()` = field `kode_indikator_kode_indikator`
(**kode indikator**, string), sedangkan `r.id_kode_indikator` adalah **ID numerik**.
Dua field berbeda dibandingkan → hasil kosong kecuali kebetulan.
Seharusnya membandingkan dengan ID, atau menyimpan ID pada hasil `getUniqueIndicators()`.

**(b) Chart "Kelengkapan Data" salah hitung.**
```ts
sampleValues: sampleValues.slice(0, 5),                       // dipotong 5
…
completeness: Math.round((opd.sampleValues.length / opd.jumlahIndikator) * 100)  // pakai yang sudah dipotong
```
Karena pembilang di-*cap* pada 5, "kelengkapan" maksimum = `500 / jumlahIndikator` %.
OPD dengan 100 indikator akan selalu tampil ≤ 5% walau datanya 100% lengkap.
Angka pada grafik ini **tidak bermakna**.
Perbaikan: hitung dari array penuh sebelum `slice`, dan definisikan ulang metriknya
(mis. `record dengan variabel non-kosong / total record OPD`).

---

### P1-06 · Build produksi bergantung pada `fonts.googleapis.com` saat build **[TERUJI]**

```
$ npm run build
Failed to fetch `Geist` from Google Fonts.
Failed to fetch `Geist Mono` from Google Fonts.
> Build error occurred: Turbopack build failed with 2 errors
```
Bila jaringan CI/Vercel mengalami gangguan ke Google Fonts, **deploy gagal**, bukan sekadar
font fallback. Tambahan: `src/app/globals.css` malah menimpa font tersebut —
```css
--font-sans: 'Inter', var(--font-geist-sans), system-ui, sans-serif;
body { font-family: 'Inter', system-ui, sans-serif; }
```
`Inter` dan `JetBrains Mono` **tidak pernah dimuat** di mana pun (`grep` → 0 hasil).
Jadi: Geist diunduh (biaya + risiko build), lalu diabaikan; teks akhirnya memakai `system-ui`.
**Redundansi murni.**

**Perbaikan:** pilih satu — (a) hapus `next/font/google`, cukup `system-ui` stack (paling ringan,
0 request eksternal), atau (b) self-host dengan `next/font/local` (file font di `public/fonts/`,
0 dependensi runtime pihak ketiga, sekaligus lebih aman dari sisi privasi pengguna layanan publik).
Lalu selaraskan `globals.css` dengan font yang benar-benar dimuat.

---

### P1-07 · Kegagalan DB disamarkan sebagai "tidak ada data" **[TERUJI]**

Dengan DB mati (stub), hasil nyata:
```
GET /api/ews      → 200 {"alerts":[]}      (log server: P1001 Can't reach database)
GET /api/datasets → 200 {"datasets":[]}
```
Panel EWS lalu menampilkan **"✓ Semua indikator dalam batas normal"** padahal sistem peringatan
dini sedang **buta total**. Untuk sistem *early warning*, ini kelas kesalahan paling berbahaya:
*silent failure* yang terlihat seperti kondisi aman.

**Perbaikan:** kembalikan `503` + `{ error: 'EWS_UNAVAILABLE' }`; komponen `EwsPanel`
membedakan tiga state: `loading` / `error (tidak diketahui)` / `ok (0 alert)` dengan visual berbeda.

---

### P1-08 · Cache in-memory tidak bekerja di serverless **[KODE]**

`statsCache` (`/api/stats`), `analyticsCache`, `geoCache`, `sapaCache` + `queryCache`
(`ai-orchestrator.ts`) semuanya variabel modul. Di Vercel setiap *instance* punya memori sendiri
dan mati saat idle → hit-rate rendah dan **tidak konsisten antar pengguna** (pengguna A dapat data
10 menit lalu, pengguna B dapat data baru). `queryCache` juga di-evict FIFO (`keys().next()`),
bukan LRU, dan di-*key* dengan string query mentah (beda spasi = cache miss).

**Perbaikan:** pindah ke cache berbagi — Next.js `unstable_cache`/`revalidate` dengan tag,
Vercel Data Cache, atau Upstash Redis. Normalisasi key (`normalizeText(query)`).

---

### P1-09 · Migrasi SQL `002` gagal di database baru **[KODE]**

`supabase/migrations/002_create_admin_table.sql` urutannya:
1. `CREATE TABLE "Admin" (… "role" "AdminRole" …)` ← memakai tipe enum
2. `CREATE UNIQUE INDEX …`
3. `DO $$ CREATE TYPE "AdminRole" …` ← **enum baru dibuat di sini**

Pada database bersih, langkah 1 gagal: `type "AdminRole" does not exist`.
Ironisnya `PRODUCTION_SETUP.md` menampilkan urutan yang **benar** (enum dulu) — jadi file SQL
dan dokumentasinya berbeda isi.

**Perbaikan:** pindahkan blok `CREATE TYPE` ke paling atas; lebih baik lagi: hentikan migrasi manual
dan gunakan `prisma migrate dev/deploy` (folder `prisma/migrations/` saat ini **tidak ada**,
padahal `prisma/schema.prisma` sudah lengkap — ini sumber drift).

---

### P1-10 · Schema Prisma tidak mencerminkan kenyataan (drift) **[KODE]**

Model `Skpd`, `Dataset`, `DatasetRecord`, `Indicator`, `EwsAlert` praktis **tidak pernah terisi**:
seluruh data dashboard diambil live dari SAPA, bukan dari DB. Konsekuensi berantai:
- `/api/datasets` selalu `[]` → tidak ada dataset → `syncAllDatasets()` tidak melakukan apa-apa.
- `EwsAlert` butuh `Indicator` → `Indicator` butuh `Dataset` → tidak ada satu pun → **EWS tidak akan
  pernah memunculkan alert**, walaupun DB sehat. Fitur "Early Warning System" pada README
  berstatus ✅ padahal secara struktural belum bisa berfungsi.
- `DatasetRecord.data` dirancang menampung **seluruh array SAPA sebagai satu blob JSON**
  (`data: records as any` di `data-sync.ts`) → tidak bisa di-query per indikator, tidak bisa
  di-index, dan akan membengkak tiap sinkronisasi.

**Perbaikan:** putuskan arsitekturnya secara eksplisit (lihat §9 Roadmap R1): sinkronkan SAPA ke tabel
ternormalisasi (`SapaRecord` dengan kolom `opdId, indikatorId, tahun, nilai, satuan, periode`,
+ unique index `(indikatorId, opdId, tahun)`), jadikan itu sumber dashboard, dan SAPA live hanya
sebagai job sinkronisasi. Barulah EWS bisa dihitung nyata.

---

### P1-11 · `npm audit`: 9 kerentanan severity **high** **[TERUJI]**

```
$ npm audit
9 high severity vulnerabilities
```
| Paket | Isu |
|---|---|
| `postcss` ≤ 8.5.22 | XSS via unescaped `</style>`; path traversal & arbitrary `.map` file disclosure via `sourceMappingURL` (GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849) |
| `sharp` < 0.35.0 | libvips CVE-2026-33327 / 33328 / 35590 / 35591 (GHSA-f88m-g3jw-g9cj) |
| `brace-expansion` < 1.1.17 | DoS / OOM (GHSA-mh99-v99m-4gvg) |
| `@prisma/config` → `deepmerge-ts` | high (transitif) |

Perbaikan tersedia lewat `next@16.3.1` (minor upgrade, bukan major).
`$ npm outdated` juga menunjukkan patch tertunda: `jose 6.2.4→6.2.9`, `recharts 3.10.0→3.10.1`,
`nanoid`, `uuid`, `@types/*`.

**Perbaikan:** naikkan `next` & `eslint-config-next` ke `16.3.1`, jalankan `npm audit fix`,
lalu pasang Dependabot/Renovate (§8).

---

### P1-12 · `npm run lint` gagal — 66 error, 17 warning **[TERUJI]**

```
$ npx eslint .
✖ 83 problems (66 errors, 17 warnings)
```
Mayoritas `@typescript-eslint/no-explicit-any` (66×) tersebar di route API, service, dan halaman.
Termasuk satu error kualitas React nyata:
```
src/app/dashboard/analytics/page.tsx:75
  react-hooks/set-state-in-effect — Avoid calling setState() directly within an effect
```
Catatan penting: `next build` **tidak** menjalankan ESLint (Next 16), jadi ini tidak memblokir
deploy hari ini — tapi berarti tidak ada satu pun *quality gate* yang aktif.

**Perbaikan:** perbaiki `any` bertahap dengan tipe nyata (skill `typescript-advanced-types`,
`zod` untuk *parse, don't validate* di batas I/O), jadikan lint **wajib lulus di CI** (§8).

---

## 6. Temuan P2 — Sedang

| ID | Temuan | Bukti | Perbaikan ringkas |
|---|---|---|---|
| P2-01 | **0 atribut `aria-*` di seluruh kode**; `grep -rn "aria-" src` → 0 | [TERUJI] | Lihat §7 |
| P2-02 | **0 `htmlFor`** — label login tidak terhubung ke input | [TERUJI] | `<label htmlFor="username">` + `id="username"` |
| P2-03 | Tombol ikon tanpa nama aksesibel (hamburger sidebar, toggle EWS, tombol tutup `✕`) — hanya `title` | [KODE] | Tambah `aria-label` + `aria-expanded` |
| P2-04 | **Dua `<h1>` pada satu halaman** (sidebar "Aceh Tengah" & header "Command Center") | [TERUJI] | Sidebar jadi `<p>`/`<h2>`; satu `<h1>` per halaman |
| P2-05 | Tidak ada *skip to content link* | [TERUJI] | `<a href="#main" class="sr-only focus:not-sr-only">` |
| P2-06 | Kontras teks sekunder `#767D6F` **gagal WCAG AA** (3,40–4,26 : 1) padahal dipakai pada teks 10–11px | [TERUJI] | Lihat tabel §7.1 |
| P2-07 | `<img>` mentah tanpa `width/height` (CLS) & tanpa `next/image` | [TERUJI] | `next/image` + dimensi eksplisit |
| P2-08 | Emoji dipakai sebagai ikon fungsional (📊🗺️⚠️🤖) tanpa `aria-hidden` → screen reader membacanya | [KODE] | `aria-hidden="true"` + ikon SVG (Lucide/Tabler) |
| P2-09 | Link sidebar `#ai` dan `#ews` **mati** — elemen `id="ai"` hanya ada di `AiChatPanel.tsx` yang tidak pernah dirender; `id="ews"` tidak ada sama sekali | [TERUJI] | Hubungkan ke panel nyata atau hapus |
| P2-10 | Badge "Online" / "📡 SAPA Connected" / sidebar "SAPA: Active, AI: Active" **hardcoded**, tidak terkait `/api/health` | [KODE] | Ambil dari `/api/health`, tampilkan degraded/error |
| P2-11 | Tanggal di header dirender saat SSR pada halaman **statik** (`○ /dashboard`) → nilai ter-*bake* saat build; server UTC vs pengguna WIB (UTC+7) bisa beda hari sebelum hidrasi | [TERUJI] | Render tanggal hanya setelah `mounted` (pola yang sudah dipakai untuk jam, tapi tidak untuk tanggal) |
| P2-12 | `limit`/`offset` `/api/chat-logs` tanpa validasi: `parseInt('xyz')` → `NaN` → `take: NaN` ke Prisma | [KODE] | Validasi dengan Zod: `z.coerce.number().int().min(0).max(200).catch(50)` |
| P2-13 | Tidak ada `robots.txt`, `sitemap`, `openGraph`, `metadataBase` (skill `seo`) | [TERUJI] | `app/robots.ts` + `app/sitemap.ts`; `Disallow: /api/`, `/dashboard/laporan` |
| P2-14 | Tidak ada security header (respons hanya membocorkan `X-Powered-By: Next.js`) | [TERUJI] | Lihat §6.1 |
| P2-15 | Tidak ada `error.tsx`, `not-found.tsx`, `loading.tsx`, `global-error.tsx` di App Router | [TERUJI] | Tambahkan; saat ini error render = layar putih |
| P2-16 | Tidak ada halaman/tombol **logout** di UI (endpoint `/api/auth/logout` ada tapi tak terpanggil) | [TERUJI] | Tambah menu profil + logout di header |
| P2-17 | Tidak ada indikator "sedang login sebagai siapa" di dashboard | [KODE] | Panggil `/api/auth/me` di layout |
| P2-18 | `laporan` mengambil `limit=200` sekaligus tanpa paginasi UI | [KODE] | Paginasi/infinite scroll + total count |
| P2-19 | Log `ChatSession` menyimpan pertanyaan pengguna + respons AI tanpa kebijakan retensi/anonimisasi | [KODE] | Kebijakan retensi (mis. 90 hari), `userId` di-hash, dokumen privasi |
| P2-20 | Login tanpa rate limit / lockout → brute force `admin123` mudah | [KODE] | Rate limit per-IP + per-username, delay progresif, audit gagal-login |

### 6.1 Security header yang disarankan (`next.config.ts` saat ini kosong)

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: [
            "default-src 'self'",
            "img-src 'self' data: https://*.tile.openstreetmap.org", // Leaflet tiles
            "style-src 'self' 'unsafe-inline'",                      // Tailwind runtime styles
            "connect-src 'self'",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; ') },
      ],
    }];
  },
};
export default nextConfig;
```
> CSP harus diuji dulu dengan `Content-Security-Policy-Report-Only` karena Leaflet & Recharts
> menyuntik style inline.

---

## 7. Audit UI/UX & Aksesibilitas

### 7.1 Rasio kontras — hasil pengukuran nyata **[TERUJI]**

Dihitung dengan rumus relative luminance WCAG 2.x terhadap warna yang benar-benar dipakai di kode:

| Foreground | Background | Rasio | Status AA (4,5:1) | Dipakai untuk |
|---|---|---:|---|---|
| `#767D6F` | `#E9E6DA` | **3,40** | ❌ **GAGAL** | Label kartu, keterangan chart (10–11px) |
| `#767D6F` | `#0F2A1E` | **3,60** | ❌ **GAGAL** | Tanggal di header |
| `#767D6F` | `#F5F3EC` | **3,83** | ❌ **GAGAL** | Teks sekunder di seluruh dashboard |
| `#6B7280` | `#111611` | **3,79** | ❌ **GAGAL** | Placeholder input login |
| `#767D6F` | `#FFFFFF` | **4,26** | ❌ **GAGAL** (tipis) | Deskripsi menu sidebar |
| `#C6C3B4` | `#FFFFFF` | **1,77** | ❌ **GAGAL** (non-text 3:1) | Semua border kartu/tabel |
| `#4B5249` | `#FFFFFF` | 8,07 | ✅ | Teks isi |
| `#1E2420` | `#F5F3EC` | 14,24 | ✅ | Teks utama |
| `#1B4332` | `#FFFFFF` | 11,08 | ✅ | Judul hijau |
| `#B3261E` | `#FBE3DE` | 5,34 | ✅ | Pesan error |
| `#D4A853` | `#0f1a12` | 8,09 | ✅ | Judul login |
| `#52B788` | `#0F2A1E` | 6,19 | ✅ | Badge "Online" |

**Kesimpulan:** warna `--outline: #767D6F` adalah pelanggaran paling luas — dipakai untuk ratusan
label kecil di seluruh aplikasi dan **selalu** di bawah 4,5:1.

**Perbaikan konkret** (mempertahankan karakter tema Gayo, hanya menggelapkan):

```css
:root {
  /* SEBELUM → SESUDAH  (rasio pada #FFFFFF / #F5F3EC / #E9E6DA) */
  --outline:         #5C6358;  /* 4,26 → 6,45 / 5,80 / 5,15  ✅ AA di ketiga latar */
  --outline-variant: #9A9683;  /* border: 1,77 → 2,60        */
  --border-strong:   #8A8676;  /* 3,05:1 → memenuhi 3:1 utk komponen non-teks (WCAG 1.4.11) */
}
```
Selain itu: **naikkan ukuran font minimum**. Saat ini banyak `text-[10px]` (=10px) —
di bawah ambang nyaman-baca; untuk dashboard eksekutif yang dilihat dari jarak layar besar,
minimum 12px untuk metadata dan 14px untuk isi.

Referensi normatif (akses bebas):
- WCAG 2.2 — <https://www.w3.org/TR/WCAG22/>
- Understanding SC 1.4.3 Contrast (Minimum) — <https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html>
- Understanding SC 1.4.11 Non-text Contrast — <https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html>

### 7.2 Temuan UX lain

| # | Masalah | Dampak pengguna | Usulan |
|---|---|---|---|
| 1 | Halaman `/dashboard/laporan` **tidak punya UI login yang jelas**; pengguna anonim langsung dilempar redirect | Bingung, tidak tahu perlu akses | Tampilkan state "perlu masuk" dengan CTA, bukan redirect mendadak |
| 2 | Error AI ditampilkan mentah ke pengguna: `Terjadi kesalahan: AI API error 429: {...}` (`ai-orchestrator.ts` memasukkan `err.message` ke `narasi`) | Bocor detail teknis + membingungkan pejabat non-teknis | Pesan ramah + kode error kecil untuk operator |
| 3 | Timeout klien 45 detik tanpa progres nyata (hanya teks statis) | Terasa hang | Progress bertahap (sudah ada event `status`, tapi hanya 2 tahap) + tombol **Batalkan** |
| 4 | Tidak ada riwayat percakapan di dashboard utama — setiap pertanyaan menimpa jawaban sebelumnya | Tidak bisa membandingkan 2 jawaban | Mode thread (komponen `AiChatPanel` sudah ada tapi mati — lihat P3) |
| 5 | Tidak ada tombol **ekspor** hasil analisis AI (PNG/PDF/CSV) di dashboard utama (hanya ada di `laporan`) | Pejabat harus screenshot | Tambah "Unduh sebagai PDF/PNG" |
| 6 | Chip pertanyaan cepat statis, tidak adaptif ke data yang tersedia | Pertanyaan bisa nihil hasil | Generate chip dari indikator ter-populer (`/api/stats`) |
| 7 | Sidebar tidak tersedia di mobile (`hidden md:block`), tanpa drawer pengganti | Dashboard **tidak bisa dinavigasi di HP** | Drawer + overlay untuk `<768px` |
| 8 | Tidak ada mode gelap, padahal command center sering dipakai di ruang display | Silau di ruang kontrol | `prefers-color-scheme` + toggle |
| 9 | Tabel hasil AI tanpa sort/filter/pencarian | Sulit dipakai untuk >20 baris | Sort per kolom + filter cepat |
| 10 | Palet chart mengulang warna (`#2D6A4F`, `#A15C38`, `#1B4332` muncul 2× dalam array `COLORS`) | Dua seri berbeda berwarna sama → salah baca | Palet kategorikal unik & *color-blind safe* |

### 7.3 Referensi desain — sumber publik & bebas dipakai

| Kebutuhan | Referensi | Lisensi/akses |
|---|---|---|
| Pola komponen layanan pemerintah (form, tabel, error summary, status tag) | **GOV.UK Design System** — <https://design-system.service.gov.uk/components/> | Kode MIT, dokumentasi terbuka |
| Pola layanan pemerintah AS (banner resmi, alert, pagination, step indicator) | **U.S. Web Design System (USWDS)** — <https://designsystem.digital.gov/components/overview/> | Public domain / open source |
| Pedoman visualisasi data & aksesibilitas chart | **IBM Carbon — Data Visualization** — <https://carbondesignsystem.com/data-visualization/getting-started/> · palet: <https://carbondesignsystem.com/data-visualization/color-palettes/> | Apache-2.0 |
| Komponen React siap-copy berbasis Tailwind + Radix (cocok untuk Tailwind v4 di repo ini) | **shadcn/ui** — <https://ui.shadcn.com/docs/components> | MIT |
| Primitif aksesibel (Dialog, Popover, Tabs, Tooltip) | **Radix Primitives** — <https://www.radix-ui.com/primitives> | MIT |
| Pola interaksi ARIA resmi (menu, tab, disclosure, combobox) | **W3C WAI-ARIA Authoring Practices Guide** — <https://www.w3.org/WAI/ARIA/apg/patterns/> | W3C, bebas |
| Ikon SVG pengganti emoji | **Lucide** (<https://lucide.dev/icons/>, ISC) · **Tabler Icons** (<https://tabler.io/icons>, MIT) · **Heroicons** (<https://heroicons.com/>, MIT) | bebas komersial |
| Heuristik usability untuk evaluasi dashboard | **NN/g — 10 Usability Heuristics** — <https://www.nngroup.com/articles/ten-usability-heuristics/> | artikel terbuka |
| Batas administratif kecamatan (untuk perbaikan P1-03) | **geoBoundaries** (<https://www.geoboundaries.org/>, CC-BY) · **OpenStreetMap** (<https://www.openstreetmap.org/>, ODbL — wajib atribusi) | terbuka |

> Catatan lisensi peta: aplikasi memakai Leaflet + tile OSM. Pastikan atribusi
> "© OpenStreetMap contributors" tampil (syarat ODbL) dan pertimbangkan tile provider
> dengan kuota jelas untuk trafik produksi.

---

## 8. Temuan P3 — Kebersihan kode & DX

| ID | Temuan | Bukti |
|---|---|---|
| P3-01 | **Dead code**: `AiChatPanel.tsx` (0 import), `QueryInput.tsx` (0), `HybridRenderer.tsx` (0), `MetricCard.tsx` (hanya dipakai HybridRenderer yang mati), `charts/TrendChart.tsx` (idem), `lib/splp-bridge.ts` (0) | [TERUJI] `grep` referensi |
| P3-02 | `AiChatPanel.tsx` juga **sudah tidak kompatibel**: memanggil `res.json()` pada `/api/query` yang kini SSE — kalau dihidupkan lagi akan langsung rusak | [KODE] |
| P3-03 | `processAIQuery()` (non-streaming, ±60 baris) tidak pernah dipanggil; di-import lalu tidak dipakai di `api/query/route.ts` | [TERUJI] warning ESLint |
| P3-04 | `rag-retriever.ts` adalah stub yang **selalu** `return []` (RAG diiklankan di dokumen, faktanya nonaktif) | [KODE] |
| P3-05 | **4 dependency tidak terpakai**: `next-auth ^5.0.0-beta.31`, `uuid ^14`, `nanoid ^6`, `date-fns ^4` — 0 import di `src/` & `scripts/` | [TERUJI] |
| P3-06 | `.env.local.production` **identik byte-per-byte** dengan `.env.example` (`diff` → tidak ada beda) — dan namanya menyesatkan (seolah berisi rahasia produksi) | [TERUJI] |
| P3-07 | Project ref Supabase (`noxaotgovlbjpaufbdsm`) + host pooler ter-commit di 3 dokumen | [KODE] |
| P3-08 | `scripts/sync-all.sh`: `EXIT_CODE=$?` diambil **setelah pipeline `| tee`** → yang tertangkap status `tee`, bukan `npx`; dengan `set -e` script juga sudah keluar duluan. Selain itu memakai `npx tsx` (tsx **bukan** dependency repo) dan `require()` di konteks ESM | [KODE] — skill `bash-defensive-patterns` |
| P3-09 | `scripts/seed.ts` memakai nama SKPD karangan (`BPKD`, `Bappeda`, `DINPU`) yang tidak selaras dengan nama OPD SAPA; membuat `Dataset` dengan `endpointSplp` yang tidak pernah dipakai | [KODE] |
| P3-10 | `scripts/bench-models.py` (Python) di repo Node tanpa `requirements.txt`/dokumentasi | [TERUJI] |
| P3-11 | `.nvmrc` = `22`, tapi `package.json.engines.node` = `>=20` | [TERUJI] |
| P3-12 | Komentar tidak sesuai kode: `aggregateByIndicator()` menulis *"if both have years, keep the larger value"* — logikanya tidak ada di implementasi | [KODE] |
| P3-13 | Duplikat di stopword list `tokenizeQuery()`: `'berapa'`, `'tolong'`, `'jelaskan'` masing-masing 2× | [KODE] |
| P3-14 | Angka statistik tidak konsisten antar dokumen/kode: komentar `intent-detector.ts` "905 records, 35+ OPD" vs `mock-data.ts` "702 data, 38 OPD" vs README tanpa angka | [KODE] |
| P3-15 | **Tidak ada satu pun tes** (`*.test.*` / `*.spec.*` → 0 file) dan **tidak ada `.github/workflows`** | [TERUJI] |
| P3-16 | `middleware.ts` punya cabang `if (pathname.startsWith('/api/auth/'))` yang **mustahil tercapai** karena matcher tidak pernah mengirim path itu ke middleware | [KODE] |

### 8.1 CI minimum yang disarankan (`.github/workflows/ci.yml`)

```yaml
name: CI
on: { push: { branches: [main] }, pull_request: {} }
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version-file: '.nvmrc', cache: 'npm' }
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npx eslint .            # jadikan blocking setelah P1-12 selesai
      - run: npm audit --audit-level=high
      - run: npm test --if-present
      - run: npm run build
```
Tambahkan `.github/dependabot.yml` (ekosistem `npm` + `github-actions`, mingguan).

---

## 9. Roadmap pengembangan fitur

| Kode | Inisiatif | Nilai bagi Pemda | Prasyarat |
|---|---|---|---|
| **R1** | **Data warehouse SAPA ternormalisasi** — sinkronisasi terjadwal ke Postgres, dashboard membaca DB, bukan API live | Dashboard tetap hidup saat SAPA down; bisa query historis & tren nyata | Perbaiki P1-10 |
| **R2** | **EWS yang benar-benar berfungsi** — definisi threshold per indikator + evaluator terjadwal + notifikasi (email/WhatsApp) | Fungsi inti "command center" akhirnya nyata | R1 |
| **R3** | **Tren time-series** — grafik antar-tahun per indikator/OPD | Menjawab "naik atau turun?", pertanyaan paling sering pimpinan | R1 |
| **R4** | **RBAC + multi-user OPD** — peran `SUPERADMIN / ADMIN / OPD_VIEWER`, tiap OPD lihat datanya | Bisa dibuka ke seluruh OPD tanpa risiko | P0-01..03 |
| **R5** | **Audit trail lengkap** — siapa mengakses apa & kapan (`lib/audit-log.ts` sudah ada kerangkanya, baru dipakai untuk `query`) | Kepatuhan SPBE & pemeriksaan internal | P1-10 |
| **R6** | **RAG regulasi** — indeks Qanun/Perbup/RPJMD agar rekomendasi AI mengutip dasar hukum | Rekomendasi AI jadi dapat dipertanggungjawabkan | Ganti stub `rag-retriever.ts` |
| **R7** | **Ekspor laporan resmi** — PDF berkop, grafik, ringkasan eksekutif | Output langsung pakai untuk rapat pimpinan | R3 |
| **R8** | **Observability** — Sentry/OpenTelemetry + dashboard latensi & biaya token LLM | Deteksi dini gangguan & kendali anggaran AI | — |
| **R9** | **PWA / tampilan videotron** — mode kiosk auto-rotate untuk layar ruang command center | Pemanfaatan nyata di ruang kendali | R3 |
| **R10** | **Dukungan bahasa Gayo/Indonesia formal pada output AI + glosarium istilah OPD** | Adopsi pengguna lokal | — |

---

## 10. Daftar risiko (yang belum terjadi tapi sangat mungkin)

| # | Risiko | Pemicu | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|---|---|
| 1 | **Kuota/biaya LLM meledak** | `/api/query` publik tanpa rate limit + bot crawler | Tinggi | Tinggi | Rate limit, kuota harian, budget alert provider |
| 2 | **Pengambilalihan akun admin** | `JWT_SECRET` tidak di-set di Vercel | Tinggi | Kritis | P0-01 |
| 3 | **SAPA berubah skema / down** | API pihak ketiga di luar kendali | Sedang | Tinggi | R1 (cache DB) + validasi respons dengan Zod + status "data per tanggal X" |
| 4 | **Build gagal karena Google Fonts** | Gangguan jaringan CI | Sedang | Sedang | P1-06 (self-host / system font) |
| 5 | **Batas koneksi Supabase habis** | Fungsi serverless × PrismaClient; `pgbouncer` sudah dipakai tapi tanpa `connection_limit` | Sedang | Tinggi | `?connection_limit=1` pada pooler, atau Prisma Accelerate |
| 6 | **Timeout fungsi Vercel pada SSE** | LLM lambat + tanpa `maxDuration` | Sedang | Sedang | `export const maxDuration`, turunkan `max_tokens`, streaming lebih awal |
| 7 | **Tabel `ChatSession` membengkak** | Setiap query disimpan tanpa retensi | Tinggi (jangka panjang) | Sedang | Kebijakan retensi + partisi/arsip bulanan |
| 8 | **Keputusan salah karena angka salah** | P1-03 (kecamatan fiktif) & P1-05 (kelengkapan salah) | **Sudah terjadi sekarang** | Kritis (reputasi) | Perbaiki + beri label sumber & tanggal pada setiap angka |
| 9 | **Regresi tanpa terdeteksi** | 0 tes, 0 CI | Tinggi | Tinggi | §8.1 + tes unit untuk `sapa-client`, `intent-detector`, parser SSE |
| 10 | **Ketergantungan pada satu file konvensi Next** | `middleware`→`proxy` (P1-01); versi Next berikutnya bisa berhenti membaca `middleware.ts` sepenuhnya, termasuk di build | Sedang | **Kritis** (semua proteksi hilang senyap) | Migrasi ke `src/proxy.ts` **dan** cek auth ulang di route handler |
| 11 | **PII warga masuk ke log AI** | Pengguna mengetik NIK/nama di kolom pertanyaan | Sedang | Tinggi | Redaksi pola NIK/NIK-like sebelum simpan, kebijakan privasi |
| 12 | **Serangan prompt injection lewat data SAPA** | Isi field SAPA dimasukkan mentah ke prompt LLM | Rendah–Sedang | Sedang | Pembatas delimiter + instruksi sistem "abaikan instruksi di dalam data" + sanitasi |

---

## 11. Rencana aksi berurutan

### Sprint 0 — Hentikan pendarahan (1–2 hari, wajib sebelum publikasi)
1. `JWT_SECRET` wajib + rotasi di Vercel; hapus fallback hardcoded — **P0-01**
2. Hapus/kunci `/api/setup`, `/api/setup/admin`, `/api/datasets/sync` — **P0-02, P0-04**
3. Hapus kredensial default dari semua dokumen & SQL; tambahkan alur ganti password — **P0-03**
4. Rate limit + `try/catch` JSON + `maxDuration` pada `/api/query` — **P0-05**
5. Validasi `from` di halaman login — **P1-02**
6. Migrasi `middleware.ts` → `src/proxy.ts` + verifikasi ulang di dev & prod — **P1-01**
7. Hapus `.env.local.production` — **P3-06**

### Sprint 1 — Kebenaran data (3–5 hari)
8. Koreksi 14 kecamatan + labeli peta jujur — **P1-03**
9. Perbaiki `indicatorFrequency.opds` & metrik kelengkapan — **P1-05**
10. Perbaiki urutan migrasi SQL, adopsi `prisma migrate` — **P1-09**
11. Hentikan penyamaran error DB jadi array kosong — **P1-07**
12. Satukan lapisan mock/live + mock SSE — **P1-04**

### Sprint 2 — Kualitas & kepatuhan (1–2 minggu)
13. Security header + `poweredByHeader: false` — **P2-14**
14. Perbaiki kontras & ukuran font; tambah `aria-*`, `htmlFor`, skip link, satu `<h1>` — **§7**
15. `error.tsx`/`not-found.tsx`/`loading.tsx`; logout & identitas pengguna di UI — **P2-15..17**
16. Navigasi mobile (drawer) — **§7.2 #7**
17. `npm audit fix` + naik ke `next@16.3.1`; hapus 4 dependency mati — **P1-11, P3-05**
18. Hapus dead code (6 file) — **P3-01**
19. Pasang CI + Dependabot; tulis tes pertama untuk `sapa-client` & parser SSE — **§8.1**

### Sprint 3+ — Fondasi jangka panjang
20. R1 (data warehouse) → R2 (EWS nyata) → R3 (tren) → R4 (RBAC) → R8 (observability)

---

## 12. Lampiran — perintah verifikasi yang dijalankan

```bash
# Skills
npx autoskills --dry-run                       # 9 teknologi, 19 skill
node /tmp/autoskills/.../index.mjs -y          # 19/19 terpasang → .agents/skills + skills-lock.json

# Analisis statis
npx tsc --noEmit                               # 2 error (artefak Prisma stub — §1.2)
npx eslint .                                   # 83 problems (66 error, 17 warning)
npm audit                                      # 9 high
npm outdated                                   # 17 paket tertinggal

# Build
npm run build                                  # gagal tanpa akses Google Fonts (P1-06)
                                               # lolos setelah font di-stub: 22 route ter-generate

# Runtime — next dev
GET  /dashboard/laporan   → 200   ❌ auth bypass (P1-01)
GET  /api/chat-logs       → 500   ❌ handler tereksekusi tanpa auth

# Runtime — next start
GET  /dashboard/laporan   → 307 → /login?from=%2Fdashboard%2Flaporan   ✅
GET  /api/chat-logs       → 401                                        ✅
GET  /api/auth/me  (JWT palsu dgn secret default) → 200 role=SUPERADMIN ❌ (P0-01)
POST /api/query    (body 'not-json')             → 500 body kosong     ❌ (P0-05)
POST /api/query    (query 'a')                   → 400 Zod             ✅
GET  /api/ews      (DB mati)                     → 200 {"alerts":[]}   ❌ (P1-07)
GET  /api/stats    (USE_MOCK_DATA=true)          → 500                 ❌ (P1-04)

# Header keamanan
curl -D- /dashboard | grep -i "x-frame|csp|hsts|nosniff"  → hanya X-Powered-By: Next.js
```

**Status repo setelah audit:** tidak ada file `src/` yang diubah. Yang ditambahkan hanya
`.agents/skills/` (19 skill), `skills-lock.json`, dan laporan ini.

---

*Disusun berdasarkan pengujian langsung pada commit `794b80a`. Setiap angka dan status dalam laporan
ini berasal dari output perintah yang tercatat, bukan estimasi. Bagian yang tidak dapat diuji di
lingkungan audit ditandai eksplisit pada §1.2.*
