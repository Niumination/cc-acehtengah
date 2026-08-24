# INSTRUKSI UNTUK JCODE / HERMES AGENT
## Finalisasi dan Penerapan SAPA Smart AI — Executive Answer UI

> Dokumen ini adalah instruksi kerja. Baca sampai selesai sebelum mengubah file apa pun.
> Tujuan utama: menerapkan desain prototype Executive Answer ke repo SAPA Smart AI dengan aman, mengikuti commit terbaru, tidak membuang pekerjaan agent lain, tidak merusak API/database/auth/DTSEN, dan tidak melakukan deploy tanpa persetujuan eksplisit.

---

## 1. Konteks pekerjaan

Repository:

```text
https://github.com/niumination/cc-acehtengah
```

Live site:

```text
https://cc-acehtengah.vercel.app
```

Commit terakhir yang diketahui pada saat instruksi ini dibuat:

```text
f6d7cb2b590c9c97703b839db9f2b9b25e6efc50
feat: integrate DTSEN multi-source agregat into AI Smart Query
```

**Wajib verifikasi ulang** ke GitHub saat mulai bekerja. Jika `main` sudah memiliki commit yang lebih baru dari `f6d7cb2`, jangan menganggap `f6d7cb2` masih menjadi base final. Ikuti prosedur rebase/cherry-pick pada §5.

Workspace yang mungkin tersedia:

```text
/home/user/cc-acehtengah
/home/user/cc-acehtengah-latest
/home/user/INSTRUKSI_JCODE_HERMES_PENERAPAN_EXECUTIVE_AI.md
```

`/home/user/cc-acehtengah-latest` sebelumnya dibuat sebagai checkout bersih dari commit `f6d7cb2`. Di dalamnya terdapat branch dan commit lokal hasil penerapan prototype:

```text
branch: feat/ai-executive-answer-v1
commit: ed323ab
message: feat(ui): add executive AI answer presentation
```

Commit `ed323ab` **belum tentu ada di remote GitHub** dan **belum boleh dianggap sudah masuk ke `main`**.

`/home/user/cc-acehtengah` dapat berisi working tree lama, perubahan mode file, prototype, atau pekerjaan agent lain. Jangan melakukan `reset --hard`, `clean -fd`, `checkout -- .`, atau menimpa folder tersebut sebelum audit.

---

## 2. Hasil yang ingin dicapai

Terapkan pola prototype Executive Answer ke repo asli:

- Headline jawaban pimpinan.
- Metric utama, satuan, tahun, dan produsen data.
- Narasi eksekutif yang ringkas dan jelas.
- Visual otomatis mengikuti bentuk data.
- Insight cards.
- Quick win dengan aksi, pemilik, dan horizon.
- Data quality flag.
- Evidence dan provenance.
- Follow-up query.
- Salin ringkasan dan ekspor brief.
- Guardrail “belum tersedia” ketika evidence tidak cukup.
- Shell dashboard global: sidebar, header, query bar, warna, spacing, dan accessibility mengikuti prototype.

Penerapan harus **backward-compatible**. UI baru boleh menggantikan penyajian, tetapi tidak boleh merusak jalur data yang sudah ada.

---

## 3. Aturan mutlak — jangan dilanggar

### 3.1 Jangan membuang pekerjaan agent lain

- Jangan menghapus atau menimpa perubahan yang tidak dibuat oleh pekerjaan Executive Answer.
- Jangan memakai `git reset --hard` pada working tree yang memiliki perubahan.
- Jangan memakai `git clean -fd` pada workspace bersama.
- Jangan melakukan `git add .` secara membabi buta.
- Jangan mengubah commit orang lain hanya untuk merapikan sejarah.
- Jika ada perubahan lokal yang tidak jelas pemiliknya, buat clone/worktree baru dan berhenti menulis ke target tersebut.

### 3.2 Jangan mengubah fondasi keamanan/data

Jangan mengubah perilaku berikut:

- Auth JWT fail-closed.
- `ADMIN_SETUP_TOKEN`.
- `CRON_SECRET`.
- `DTSEN_NIK_KEY`.
- Data gate DTSEN.
- Audit akses DTSEN.
- K-anonymity DTSEN.
- Defleksi query NIK/per-orang.
- NIK mentah tidak pernah boleh masuk response/UI/log.
- API key AI atau secret environment.
- Database schema/migration pada pekerjaan ini.
- Route GIS, EWS, laporan, setup, login, dan admin DTSEN kecuali hanya terdampak layout global dan terbukti tidak crash.

### 3.3 Jangan mengubah kontrak API secara destruktif

Field lama `HybridResponse` harus tetap ada:

```ts
narasi
visualisasi
rekomendasi
dataSource
timestamp
```

Field baru seperti `presentation` harus optional. Jangan membuat client lama wajib membaca field baru.

Pertahankan kontrak SSE:

```text
event: status
event: narasi
event: result
event: error
```

Jangan mengganti nama event, mengubah Content-Type, atau membuat client lama gagal parse.

### 3.4 Jangan menambah LLM kedua

- Jangan menambah panggilan LLM untuk quick win.
- Jangan menambah panggilan LLM untuk visual.
- Jangan menghidupkan RAG sebagai source angka.
- Quick win/quality flag/follow-up harus deterministik dari evidence dan metadata.

### 3.5 Jangan mengarang angka

- Angka hanya boleh berasal dari evidence/aggregate SAPA atau agregat DTSEN publik yang sah.
- Jangan mencampur indikator berbeda producer, satuan, definisi, atau tahun tanpa quality warning.
- Tahun kosong tetap kosong/null/“tahun tidak tercantum”; jangan diubah menjadi “terbaru”.
- “Tidak tersedia” adalah jawaban yang valid.
- Volume indikator OPD bukan ukuran kualitas kinerja OPD.
- Data mock harus diberi label `DATA CONTOH`; jangan disebut data live.

---

## 4. Audit awal — wajib sebelum coding

Jalankan dari root workspace dan catat hasilnya:

```bash
pwd
find /home/user -maxdepth 2 -type d -name 'cc-acehtengah*' -print
git -C /home/user/cc-acehtengah status --short --untracked-files=all || true
git -C /home/user/cc-acehtengah-latest status --short --untracked-files=all || true
git -C /home/user/cc-acehtengah-latest log --oneline --decorate -5 || true
```

Verifikasi remote:

```bash
git ls-remote https://github.com/niumination/cc-acehtengah.git refs/heads/main
```

Verifikasi commit lokal feature:

```bash
git -C /home/user/cc-acehtengah-latest show --stat --oneline ed323ab
git -C /home/user/cc-acehtengah-latest merge-base --is-ancestor f6d7cb2 ed323ab
```

Nilai akhir perintah ancestry harus `0`.

Audit file feature:

```bash
git -C /home/user/cc-acehtengah-latest diff --name-status f6d7cb2..ed323ab
git -C /home/user/cc-acehtengah-latest diff --check f6d7cb2..ed323ab
```

Baca minimal file berikut sebelum porting/merge:

```text
prototype/index.html
prototype/README.md
prototype/IMPLEMENTATION_PLAN.md
src/components/ExecutiveAnswerRenderer.tsx
src/services/executive-presentation.ts
src/services/__tests__/executive-presentation.test.ts
src/components/AIResponseRenderer.tsx
src/app/dashboard/page.tsx
src/app/dashboard/layout.tsx
src/components/Sidebar.tsx
src/components/QueryBar.tsx
src/app/globals.css
src/services/meta-query.ts
src/app/api/query/route.ts
src/types/index.ts
```

Baca juga perubahan setelah base terbaru pada:

```text
src/services/ai-orchestrator.ts
src/services/dtsen-planner.ts
src/services/dtsen-multisource.ts
src/lib/data-gate.ts
src/prisma/schema.prisma
src/components/KpiPanel.tsx
src/components/ExecutiveReport.tsx
src/components/brand/Logo.tsx
```

Tujuannya bukan menyalin prototype secara buta. Pahami kontrak terbaru, terutama integrasi DTSEN, warehouse, KPI, EWS, dan brand asset yang sudah masuk pada commit `f6d7cb2`.

---

## 5. Jika agent sudah membuat commit baru

### Kondisi A — remote masih `f6d7cb2`

Gunakan `/home/user/cc-acehtengah-latest` sebagai referensi feature. Jika target repo bersih dan base sama, port dengan cherry-pick atau patch selektif.

### Kondisi B — remote lebih baru dari `f6d7cb2`

Jangan langsung cherry-pick tanpa membaca konflik. Buat worktree/clone baru dari remote terbaru:

```bash
git clone https://github.com/niumination/cc-acehtengah.git /home/user/cc-acehtengah-final
cd /home/user/cc-acehtengah-final
git switch -c feat/ai-executive-answer-v1
```

Port commit feature:

```bash
git cherry-pick ed323ab
```

Jika konflik hanya pada file visual yang jelas, selesaikan manual berdasarkan kode terbaru. Jika konflik menyentuh salah satu file berikut, **jangan force-resolve tanpa audit**:

```text
src/services/ai-orchestrator.ts
src/services/dtsen-planner.ts
src/services/dtsen-multisource.ts
src/lib/data-gate.ts
prisma/schema.prisma
middleware.ts
src/app/api/query/route.ts
src/types/index.ts
```

Untuk konflik pada pipeline AI/DTSEN/API, simpan conflict report dan minta keputusan manusia. Jangan menghapus fitur terbaru demi mempertahankan prototype.

### Kondisi C — target memiliki perubahan lokal

Jika `git status` tidak bersih:

1. Jangan reset.
2. Jangan checkout file yang berubah.
3. Simpan patch untuk audit:

```bash
git diff --binary > /tmp/target-working-tree.patch
git status --short --untracked-files=all > /tmp/target-working-tree.status
```

4. Gunakan clone/worktree baru dari commit remote terbaru.
5. Port feature secara selektif.
6. Laporkan bahwa target lama tidak disentuh.

---

## 6. File feature yang diharapkan

Perubahan pada `ed323ab` pada dasarnya terdiri dari komponen berikut.

### Adapter dan tipe

```text
src/types/index.ts
src/services/executive-presentation.ts
src/services/__tests__/executive-presentation.test.ts
```

`executive-presentation.ts` harus tetap pure:

- tidak fetch;
- tidak memanggil LLM;
- tidak memakai Prisma;
- tidak mengubah angka;
- menerima response legacy;
- menghasilkan model presentasi yang aman;
- fallback jika `presentation` malformed.

### Renderer

```text
src/components/ExecutiveAnswerRenderer.tsx
src/components/AIResponseRenderer.tsx
src/app/dashboard/page.tsx
```

Pastikan:

- renderer lama tetap tersedia;
- `NEXT_PUBLIC_AI_EXECUTIVE_UI=false` mengembalikan UI legacy;
- response metric/table/chart/map/none tidak crash;
- table columns string dan object tetap aman;
- chart series string dan object tetap aman;
- response malformed tidak menampilkan raw JSON;
- NIK atau data restricted tidak dibuat lebih terbuka oleh renderer.

### Global design

```text
src/app/dashboard/layout.tsx
src/components/Sidebar.tsx
src/components/QueryBar.tsx
src/app/globals.css
```

Perubahan ini boleh mengubah tampilan shell dashboard secara global, tetapi harus diuji pada:

```text
/dashboard
/dashboard/analytics
/dashboard/gis
/dashboard/laporan
/dashboard/admin/dtsen
/login
```

Jangan menggunakan selector CSS global yang merusak table/form/map. Pertahankan semantic token yang sudah ada.

### Meta-query

```text
src/services/meta-query.ts
src/app/api/query/route.ts
src/services/__tests__/faseF.retrieval-v2.test.ts
```

Query berikut harus masuk jalur deterministik portal:

```text
apa saja OPD yang ada di Aceh Tengah
OPD mana yang memiliki indikator paling banyak di Aceh Tengah
OPD dengan indikator terbanyak
bagaimana sebaran data SAPA per tahun
```

Query substantif berikut tidak boleh salah diklasifikasikan sebagai meta-query:

```text
berapa jumlah ASN di Aceh Tengah
berapa jumlah balita stunting
berapa jumlah tenaga kerja
```

Pada `USE_MOCK_DATA=true`, meta-query tetap harus menggunakan SSE dan diberi label data contoh.

### Dokumentasi dan fixture

```text
prototype/index.html
prototype/README.md
prototype/IMPLEMENTATION_PLAN.md
.env.example
README.md
```

Jangan memasukkan secret nyata. Jangan commit `node_modules`, `.next`, `.env.local`, atau file credential.

---

## 7. Cara penerapan yang disarankan

1. Gunakan base commit remote terbaru.
2. Buat branch feature.
3. Port/checkout hanya file feature yang relevan.
4. Jangan mengubah Prisma schema.
5. Jangan menambah dependency baru.
6. Jalankan typecheck setelah tipe/adapter masuk.
7. Jalankan unit test setelah meta-query dan adapter masuk.
8. Jalankan build setelah renderer/layout masuk.
9. Gunakan `USE_MOCK_DATA=true` untuk preview lokal.
10. Uji feature flag legacy.
11. Review diff lengkap.
12. Commit perubahan dalam satu atau beberapa commit yang jelas.
13. Jangan push dan jangan deploy sebelum ada persetujuan.

Feature flag:

```env
NEXT_PUBLIC_AI_EXECUTIVE_UI=true
```

Rollback visual:

```env
NEXT_PUBLIC_AI_EXECUTIVE_UI=false
```

Rollback tidak boleh memerlukan migration database.

---

## 8. Quality gate wajib

Gunakan versi Node sesuai `.nvmrc`. Instalasi bersih:

```bash
npm ci
```

Jalankan:

```bash
npm test
npx tsc --noEmit
npm run build
git diff --check
```

Lint target:

```bash
npx eslint \
  src/components/ExecutiveAnswerRenderer.tsx \
  src/services/executive-presentation.ts \
  src/services/__tests__/executive-presentation.test.ts \
  src/components/AIResponseRenderer.tsx \
  src/components/Sidebar.tsx \
  src/components/QueryBar.tsx \
  src/app/dashboard/layout.tsx \
  src/app/dashboard/page.tsx \
  src/app/api/query/route.ts \
  src/services/meta-query.ts \
  src/types/index.ts
```

Pada base `f6d7cb2` pernah terdapat error lint bawaan di sejumlah file lama. Jangan mengklaim full lint hijau jika masih gagal. Bedakan:

- error pre-existing pada file yang tidak disentuh;
- error baru akibat feature;
- warning yang tidak fatal.

File yang diubah oleh feature harus tidak menambah error baru. Jika ingin memperbaiki lint lama, lakukan pada commit terpisah dan jangan mencampurnya dengan penerapan UI.

Ekspektasi baseline feature sebelumnya:

```text
npm test: 207 tests passing
npx tsc --noEmit: pass
npm run build: pass
lint target feature: pass
```

Jika jumlah test berubah karena commit baru, catat angka aktual, jangan memaksakan angka baseline.

---

## 9. Uji manual wajib

### Response/UI

Uji melalui preview lokal, bukan live production:

```bash
USE_MOCK_DATA=true npm run dev -- --hostname 0.0.0.0 --port 3001
```

Uji minimal:

1. `berapa jumlah ASN di Aceh Tengah`
2. `berapa jumlah balita stunting di Aceh Tengah`
3. `OPD mana yang memiliki indikator paling banyak di Aceh Tengah`
4. `bagaimana sebaran data SAPA per tahun`
5. `bagaimana tren stunting 3 tahun terakhir`
6. query acak tanpa match
7. query DTSEN agregat publik
8. query NIK/per-orang — harus tetap mengikuti defleksi/gate, tanpa kebocoran NIK

Periksa:

- tidak ada crash React;
- tidak ada raw JSON di UI;
- tidak ada thinking/reasoning yang bocor;
- tidak ada visual pada data yang tidak cukup;
- source Direct/SPLP/DTSEN terlihat benar;
- mock diberi disclaimer;
- table object columns aman;
- chart line/bar/area aman;
- quick win tidak mengarang angka;
- follow-up dapat mengisi query bar;
- tombol salin dan ekspor tidak merusak halaman.

### Shell global

Uji:

- sidebar expanded/collapsed;
- header desktop/mobile;
- query bar desktop/mobile;
- halaman analytics;
- halaman GIS;
- halaman laporan;
- halaman admin DTSEN;
- login;
- browser keyboard focus;
- `prefers-reduced-motion`;
- responsive mobile.

### Fallback legacy

Bangun/dev dengan:

```env
NEXT_PUBLIC_AI_EXECUTIVE_UI=false
```

Pastikan response lama tetap tampil seperti sebelumnya. Setelah itu aktifkan kembali UI baru.

### Health dan route

```bash
curl -fsS http://localhost:3001/api/health
curl -fsS http://localhost:3001/dashboard
```

Jangan menjalankan banyak query berulang ke live site karena rate limit dan biaya. Untuk integrasi gunakan preview/mock.

---

## 10. Pemeriksaan keamanan khusus DTSEN

Sebelum menyatakan selesai, pastikan feature tidak menyentuh jalur restricted secara tidak sengaja:

- `/api/dtsen/query` tetap terpisah dari pipeline publik.
- Tanpa sesi: tetap 401.
- Role tidak cukup: tetap 403.
- Query personal/NIK tetap defleksi atau mengikuti gate yang ada.
- NIK mentah tidak ada di HTML, response, narasi, log, maupun provenance.
- `dataSource` tidak menyamarkan DTSEN restricted sebagai SAPA public.
- K-anonymity tidak diubah.
- Audit access tidak dilewati.

Jika ada indikasi kebocoran, hentikan pekerjaan dan jangan melakukan workaround.

---

## 11. Acceptance criteria

Pekerjaan hanya dianggap selesai jika:

- Base commit terbaru sudah diverifikasi.
- Tidak ada pekerjaan agent lain yang dihapus.
- Executive Answer aktif melalui renderer baru.
- Renderer legacy masih dapat diaktifkan dengan feature flag.
- `HybridResponse` legacy tetap kompatibel.
- SSE tetap kompatibel.
- Tidak ada database migration.
- Tidak ada LLM kedua.
- Tidak ada angka baru di luar evidence.
- OPD ranking dan sebaran tahun deterministik.
- Tren tanpa deret waktu tidak dipaksakan.
- DTSEN/privacy tetap fail-closed.
- `npm test` lulus.
- `npx tsc --noEmit` lulus.
- `npm run build` lulus.
- Lint target feature lulus.
- Full lint baseline dicatat secara jujur jika masih memiliki error lama.
- Preview lokal dapat dibuka.
- `git diff --check` lulus.
- Tidak ada push ke `main`.
- Tidak ada deploy ke Vercel tanpa persetujuan.

---

## 12. Format laporan akhir untuk pemilik repo

Berikan laporan dengan format berikut:

```text
BASE REMOTE:
- URL:
- commit main terbaru:
- tanggal/waktu verifikasi:

FEATURE:
- branch:
- commit feature:
- base feature:
- apakah ed323ab dapat di-cherry-pick langsung: ya/tidak

FILE DIUBAH:
- daftar file
- file yang tidak disentuh karena konflik/pekerjaan agent lain

KEAMANAN PERUBAHAN:
- HybridResponse legacy dipertahankan: ya/tidak
- SSE dipertahankan: ya/tidak
- DB/schema berubah: ya/tidak
- LLM tambahan: ya/tidak
- DTSEN/auth disentuh: ya/tidak
- feature flag rollback: ya/tidak

VALIDASI:
- npm test: hasil aktual
- tsc: hasil aktual
- build: hasil aktual
- lint target: hasil aktual
- full lint: hasil aktual + pemisahan baseline/new
- manual query: hasil per query
- preview URL/port:

DEPLOY:
- push GitHub: tidak dilakukan / dilakukan dengan persetujuan
- deploy Vercel: tidak dilakukan / dilakukan dengan persetujuan

RISIKO TERSISA:
- daftar risiko yang benar-benar ada
- tidak boleh menulis “aman” tanpa menyebut caveat
```

Jika ada konflik kritis, test gagal, build gagal, schema berubah, atau provenance/privacy meragukan, status harus **BLOCKED**, bukan “selesai”.

---

## 13. Prinsip terakhir

> Jangan mengejar tampilan bagus dengan mengorbankan source-of-truth.
> Jangan mengejar merge cepat dengan mengorbankan pekerjaan agent lain.
> Jangan mengejar “jawaban lengkap” dengan mengarang angka.
> Jangan menganggap live site sama dengan commit GitHub terbaru.
> Prototype boleh terlihat powerful; penerapan harus tetap reversible, auditable, dan grounded.
