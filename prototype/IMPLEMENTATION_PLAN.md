# Rencana Penerapan Bertahap — Executive AI Answer

Dokumen ini menyusun cara menerapkan pola prototype ke SAPA Smart AI **secara additive dan reversible**. Prototype telah diterapkan secara terkontrol di branch `feat/ai-executive-answer-v1` berbasis commit terbaru `f6d7cb2`; belum ada push ke `main` atau deployment ke live site dari branch ini.

## 1. Temuan audit singkat

### Repo

- Stack saat ini: Next.js 16, React 19, Recharts, Leaflet, Prisma 6.
- Alur utama: `QueryBar` → `POST /api/query` → SSE → `processAIQueryStreaming` → `buildContext` → LLM → `parseHybridResponse` → `groundOutput` → `AIResponseRenderer`.
- Source of truth angka sudah diarahkan ke SAPA melalui `src/lib/sapa-client.ts`; Direct API dicoba lebih dulu lalu fallback SPLP.
- `src/services/grounding.ts` sudah memiliki validasi angka/tahun dan fallback narasi deterministik.
- `src/components/AIResponseRenderer.tsx` saat ini sudah mendukung `metric`, `table`, dan `chart`; `AIDataWidget.tsx` menjadi adaptor untuk data tabel.
- `/api/query` sudah memakai streaming, rate limit, validasi body, dan `maxDuration`. Semua ini harus dipertahankan.

### Live site

Snapshot yang terlihat pada 24 Agustus 2026:

- 2.032 records, 38 OPD, 1.793 indikator unik, update Triwulan IV.
- Dashboard sudah memiliki KPI, distribusi tahun, sebaran OPD, GIS, laporan, dan EWS.
- Query ASN mengembalikan evidence ASN dan indikator ketenagaan terkait.
- Query stunting mengembalikan angka 730 orang dan 4,9 persen, tetapi tidak membentuk deret waktu.
- Query `OPD mana yang paling banyak indikatornya` pada live site yang diperiksa belum menghasilkan jawaban registry; prototype menunjukkan bentuk jawaban yang diinginkan untuk gap ini.

### Batas penting

- KPI dashboard `31,4 persen` dari Bappeda tidak boleh dicampur dengan prevalensi `4,9 persen` dari Dinas Kesehatan tanpa penyamaan definisi, producer, satuan, dan tahun.
- Volume indikator per OPD bukan peringkat kinerja OPD.
- Record dengan tahun kosong tidak boleh disebut sebagai tahun terbaru dan tidak boleh masuk grafik tren.

## 2. Kontrak target yang kompatibel

Jangan mengganti `HybridResponse` lama. Tambahkan field opsional agar client lama tetap bekerja:

```ts
interface ExecutivePresentation {
  version: 'v1';
  answerType: 'metric' | 'comparison' | 'distribution' | 'trend' | 'not_available' | 'table';
  title: string;
  lead: string;
  narrative: string;
  metrics: Array<{ label: string; value: string | number; unit?: string; tahun?: string | null }>;
  visual: {
    type: 'metric' | 'bar' | 'line' | 'area' | 'table' | 'none';
    title: string;
    subtitle?: string;
    data: unknown[];
    xKey?: string;
    series?: string[];
  };
  insights: Array<{ tone: 'ok' | 'info' | 'warn'; label: string; text: string }>;
  quickWins: Array<{ title: string; action: string; owner?: string; horizon?: string }>;
  dataQuality: Array<{ label: string; status: 'ok' | 'warn' | 'info'; text: string }>;
  evidence: Array<{ id: number; indikator: string; nilai: string; satuan: string; opd: string; tahun: string | null }>;
  followUps: string[];
  provenance: { source: string; origin: 'direct' | 'splp'; fetchedAt: string; evidenceCount: number };
}

interface HybridResponse {
  // field lama: tetap ada
  narasi: string;
  visualisasi: ExistingVisualization;
  rekomendasi: string[];
  dataSource: string;
  timestamp: string;

  // field baru: opsional, non-breaking
  presentation?: ExecutivePresentation;
}
```

Catatan: nama field final boleh disesuaikan dengan konvensi repo. Yang wajib adalah kompatibilitas, `version`, provenance, evidence, data quality, dan pemisahan quick win dari narasi.

## 3. Prinsip implementasi

### 3.1 Satu panggilan LLM tetap

- Jangan menambah panggilan LLM kedua untuk menyusun quick win atau visual.
- LLM hanya menyusun narasi dari evidence yang sudah dipilih.
- Planner presentasi, pemilihan visual, quality flag, quick win, dan follow-up dibuat deterministik dari evidence/metadata.

### 3.2 Angka tetap grounded

- Semua angka di `narrative`, `metrics`, `visual`, `insights`, dan `evidence` harus berasal dari record/aggregate SAPA yang sudah dipilih.
- Rekomendasi boleh preskriptif, tetapi tidak boleh menambah angka, target, persentase, atau kondisi lapangan yang tidak ada pada evidence.
- Jika angka model tidak cocok dengan evidence, gunakan mekanisme `groundOutput` yang sudah ada dan bentuk `presentation` dari evidence.
- `tahun` kosong tetap `null`/`—`; jangan diubah menjadi `terbaru`.

### 3.3 Visual mengikuti intent dan kualitas evidence

Planner deterministik minimal menangani:

| Kondisi | Output |
|---|---|
| Satu indikator dengan tahun/satuan jelas | Metric card + narrative |
| 2–8 nilai numerik sebanding | Bar/comparison |
| Distribusi kategori/tahun | Distribution bar |
| Record banyak | Tabel dengan top rows + summary |
| Diminta tren tetapi tidak ada deret waktu sebanding | `not_available`, tanpa line chart |
| Query registry OPD | Agregat statistik OPD, bukan filter indikator generik |
| Satuan atau producer berbeda | Pisahkan cards, beri quality callout |

## 4. Tahapan kerja yang aman

### Fase 0 — Baseline dan feature flag

**Tujuan:** tidak menyentuh perilaku default.

- Buat branch kerja khusus; jangan push langsung ke `main`.
- Simpan fixture response produksi yang sudah ada untuk ASN, stunting, tabel, chart, empty evidence, dan stream.
- Tambahkan flag `NEXT_PUBLIC_AI_PRESENTATION_V2=false` atau mekanisme runtime yang setara.
- Catat baseline: `npm test`, `npx tsc --noEmit`, lint, dan uji manual 5 query.

**Allowlist:** file test/fixture baru dan dokumentasi flag. Belum mengubah renderer produksi.

### Fase 1 — Tipe dan planner murni

**Tujuan:** membangun model output tanpa jaringan/Prisma.

File yang boleh disentuh:

- `src/types/index.ts`
- file baru `src/services/executive-presentation.ts`
- file baru `src/services/__tests__/executive-presentation.test.ts`
- fixture baru di `src/services/__fixtures__/`

Fungsi murni yang disarankan:

- `chooseAnswerType(query, evidence, intent)`
- `buildExecutivePresentation(input)`
- `buildQuickWins(answerType, evidence, dataQuality)`
- `buildDataQuality(evidence, origin)`
- `buildFollowUps(answerType, evidence)`
- `buildVisualFromEvidence(evidence, answerType)`

Tidak ada fetch, LLM, Prisma, atau perubahan route pada fase ini.

### Fase 2 — Adapter di orchestrator, tetap backward compatible

**Tujuan:** menyematkan `presentation` setelah grounding.

File:

- `src/services/ai-orchestrator.ts`
- `src/services/executive-presentation.ts`
- test orchestrator/pure functions terkait

Urutan aman:

1. `buildContext` dan `groundOutput` tetap menjadi sumber evidence.
2. Hasil lama (`narasi`, `visualisasi`, `rekomendasi`) dibentuk seperti sekarang.
3. `buildExecutivePresentation` menerima evidence terpilih, hasil ground, origin Direct/SPLP, dan timestamp.
4. Tambahkan `presentation` hanya jika feature flag aktif; jika tidak, response identik dengan baseline.
5. Simpan metadata audit yang ringan; jangan menulis isi evidence besar ke log.

### Fase 3 — Renderer baru sebagai fallback bertingkat

**Tujuan:** mengaktifkan UI baru tanpa menghapus renderer lama.

File:

- file baru `src/components/ExecutiveAnswerRenderer.tsx`
- `src/components/AIResponseRenderer.tsx`
- `src/app/dashboard/page.tsx` bila diperlukan untuk flag/telemetry
- CSS token di `src/app/globals.css` hanya jika token baru diperlukan

Logika:

```tsx
if (response.presentation?.version === 'v1' && featureFlag) {
  return <ExecutiveAnswerRenderer presentation={response.presentation} />;
}
return <LegacyAIResponseRenderer response={response} />;
```

`AIResponseRenderer` legacy tidak dihapus pada fase ini. `AIDataWidget` dan dual-format table columns tetap dipertahankan.

### Fase 4 — Query planner registry dan kondisi tidak tersedia

**Tujuan:** menutup gap yang terlihat di live site.

- Tambahkan intent deterministic untuk pertanyaan registry seperti “OPD dengan indikator terbanyak” dan “distribusi data per tahun”.
- Gunakan aggregate yang sama dengan `/api/stats` atau helper bersama; jangan membuat angka kedua yang berbeda dari dashboard.
- Untuk “tren N bulan/tahun”, verifikasi terlebih dahulu adanya record waktu yang sebanding. Jika tidak ada, kembalikan `not_available` dan quick win untuk meminta snapshot yang tepat.
- Pisahkan indikator yang serupa tetapi berbeda producer/definisi; jangan merge hanya karena keyword sama.

### Fase 5 — Canary dan rilis

1. Deploy preview dengan flag false; pastikan halaman lama identik.
2. Aktifkan flag hanya untuk user internal/admin atau query chip prototype.
3. Monitor error renderer, latency, finish reason, grounding replace, evidence count, origin Direct/SPLP, dan proporsi `not_available`.
4. Jika ada regresi, matikan flag; tidak ada migration database yang harus di-rollback.
5. Setelah stabil, aktifkan bertahap dan pertahankan legacy fallback minimal satu siklus rilis.

## 5. Matriks uji minimum sebelum merge

### Unit / kontrak

- `metric` satu evidence menghasilkan satu nilai, unit, tahun, dan source.
- `comparison` tidak membuat chart bila satuan berbeda.
- `distribution` mempertahankan bucket `Tidak tercantum` sebagai metadata kosong.
- Query tren tanpa deret waktu menghasilkan `not_available`, bukan garis interpolasi.
- Angka model yang tidak ada di evidence memicu template deterministik.
- OPD + keyword memakai irisan/kandidat tersempit, bukan seluruh OPD.
- Tahun numerik maksimum dipilih saat satu indikator mempunyai beberapa tahun.
- Empty evidence tidak memanggil LLM.
- `columns` string dan `{key,name}` tidak crash.

### Integrasi / manual

1. Jumlah ASN.
2. Stunting + Dinas Kesehatan.
3. Tren stunting 3 bulan/tahun.
4. OPD dengan indikator terbanyak.
5. Distribusi record per tahun.
6. Kecamatan yang tidak ada di schema SAPA.
7. Query acak tanpa match.
8. Direct gagal → label dan metadata SPLP.
9. Stream berhenti / JSON rusak → tidak ada raw JSON atau thinking di UI.
10. Mock mode tetap berlabel data contoh.

### Quality gate

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
```

Setiap angka di output tes harus dapat ditunjuk ke field evidence SAPA. Jangan merge jika hanya visualnya yang terlihat bagus tetapi provenance/grounding tidak lulus.

## 6. Risiko dan mitigasi

| Risiko | Mitigasi |
|---|---|
| UI lama rusak karena kontrak berubah | Field `presentation` opsional; flag; legacy fallback |
| Visual tampak presisi padahal data tidak sebanding | Planner cek satuan, tahun, producer sebelum memilih chart |
| Quick win menambah klaim faktual | Template quick win tanpa angka baru; audit test |
| Live API lambat / fallback berubah | Simpan `origin`, `fetchedAt`, cache yang sudah ada; tampilkan freshness |
| Jawaban tren mengarang | Gate `not_available` sebelum LLM/renderer |
| Perubahan global terlalu besar | Satu fase satu allowlist; tidak menyentuh GIS/EWS/auth bersamaan |
| Rollback sulit | Tidak ada schema migration pada fase pertama; flag dapat dimatikan |

## 7. Definition of Done penerapan awal

- Prototype diterima secara visual oleh pemangku kepentingan.
- `presentation` dapat diaktifkan tanpa mengubah hasil legacy saat flag false.
- Semua angka memiliki evidence dan provenance.
- Quick win menyebut aksi/pemilik/horizon tanpa membuat angka baru.
- Trend guardrail, data quality callout, follow-up, salin/export, dan evidence drawer lulus uji aksesibilitas dasar.
- Unit, typecheck, lint, dan build hijau.
- Preview Vercel dapat diuji dengan minimal lima query dan rollback cukup dengan mematikan flag.
