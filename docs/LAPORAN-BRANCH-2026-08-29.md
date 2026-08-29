# Laporan Lengkap Branch — cc-acehtengah (29 Agu 2026)

> **Repo:** `github.com/Niumination/cc-acehtengah` · **PROD live:** `https://cc-acehtengah.vercel.app`
> **Branch produksi:** `hotfix/meeting-ready` @ `9004364`

## Ringkasan Eksekutif

| Branch | Status | vs main | vs remote | Peran |
|---|---|---|---|---|
| **`hotfix/meeting-ready`** | 🟢 **PRODUKSI (live)** | **+60 / −0** | sinkron ✅ | Semua fitur terbaru (DTSEN, BNBA, Pecah Jawaban) |
| `main` | 🟡 Baseline | — | sinkron ✅ | Kode dasar — **60 commit di belakang hotfix** |
| `feat/ai-executive-answer-v1` | 🔵 Eksperimen lama | +3 / −7 | sinkron ✅ | Iterasi v1 — **sudah usang** |
| `feat/ai-executive-answer-v2-live` | 🔵 Eksperimen lama | +12 / −7 | sinkron ✅ | Iterasi v2 — **sudah usang** |
| `feat/ai-executive-answer-v3` | 🔵 Eksperimen lama | +27 / −7 | sinkron ✅ | Iterasi v3 — **sudah usang** |
| `backup/feat-v3-saved` | 📦 Backup | +27 / −7 | sinkron ✅ | Snapshot v3 sebelum lanjut |
| `hotfix/llm-reliability` | 🔵 Lama | +0 / −0 | sinkron ✅ | Sama dengan main (tidak ada commit unik) |
| `origin/pabrik-aplikasi` | ⚪ Remote-only | +179 | sinkron ✅ | **Proyek lain** (GAS) — nyasar di repo ini |

## Detail Per Branch

### 🟢 `hotfix/meeting-ready` — PRODUKSI LIVE
- **HEAD:** `9004364` (29-Agu) — docs: catatan sesi DTSEN_ROOT
- **Isi:** 60 commit di atas main — seluruh fitur meeting 27–29 Agu:
  - Model AI `huancheng auto` (agnes-2.5-flash) + fallback chain
  - **Fusi multi-sumber** (SAPA + DTSEN + Dokumen A/B/C + Bapokting)
  - **Sumber DTSEN BAPPEDA** (235.011 individu terenkripsi AES-256-GCM)
  - **Routes DTSEN restored** (import/query/releases/publish/breakdown)
  - **Role hierarchy**: DTSEN_ROOT (identitas lengkap) > SUPERADMIN > DTSEN_LOOKUP > DTSEN_ANALYST > ADMIN
  - **Pecah Jawaban** (mindmap deterministik tanpa LLM) sampai BNBA
  - Halaman `/dashboard/status` + diagram relasi sumber
  - Format angka id-ID, chip DTSEN, tombol Login/Logout, halaman Akun
- **Hubungan dengan main:** mengandung SEMUA commit main (main..hotfix = 60, hotfix..main = 0) → **main tinggal fast-forward**

### 🟡 `main`
- **HEAD:** `016818e` (26-Agu) — format ribuan angka
- **Tertinggal 60 commit** dari hotfix. Tidak ada commit yang tidak ada di hotfix (0).

### 🔵 Cabang eksperimen v1/v2/v3 (semua dari merge-base `f6d7cb2` 24-Agu)
Ketiganya bercabang dari titik yang sama (24 Agu) dan membawa iterasi "AI Executive Answer" secara paralel. **Semua fiturnya sudah di-cover ulang di hotfix** dengan pendekatan lebih matang (120 file berbeda, +4.587/−8.048 vs v3):

| Cabang | Commit unik (tidak di hotfix) | Isi |
|---|---|---|
| v1 | 3 | Integrasi DTSEN multi-source dasar |
| v2-live | 12 | Executive answer v2 (tabel/visualisasi) |
| v3 | 27 | Executive answer v3 + checklist deploy |

**Rekomendasi:** jangan di-merge — fitur sudah hidup di hotfix dengan desain lebih baik (k-anonymity, audit trail, enkripsi). Cukup diarsipkan sebagai referensi.

### 📦 `backup/feat-v3-saved`
- Snapshot v3 persis (e028d84) — aman dipertahankan sebagai cadangan.

### 🔵 `hotfix/llm-reliability`
- **Tidak punya commit unik** (sama dengan main `016818e`) — bisa dihapus.

### ⚪ `origin/pabrik-aplikasi` (remote-only)
- Branch proyek **pabrik-aplikasi-gas** (GAS) yang ter-push nyasar ke repo cc-acehtengah (179 commit). **Bisa dihapus** dari remote — bukan bagian cc-acehtengah.

## Rekomendasi Tindakan

1. **Segera:** `git checkout main && git merge --ff-only hotfix/meeting-ready && git push` — sinkronkan main ke produksi
2. **Arsip:** hapus `hotfix/llm-reliability` (tanpa isi unik) & `origin/pabrik-aplikasi` (proyek lain)
3. **Pertahankan:** `backup/feat-v3-saved` sebagai cadangan; v1/v2/v3 biarkan sebagai referensi historis
4. **Jangan delete** `hotfix/meeting-ready` — ini branch produksi yang live

## Commit Terakhir per Branch

```
9004364 (hotfix/meeting-ready) docs: catatan sesi 29-Agu — DTSEN_ROOT, Pecah Jawaban
016818e (main)                 feat(presentasi): format ribuan angka besar
1dc36e5 (v1)                   fix(dev): kunci turbopack root
225cb36 (v2-live)              docs: laporan akhir format §12
e028d84 (v3)                   docs(review): §12 checklist pasca-deploy
38f8c29 (pabrik-aplikasi)      fix(gas): serialisasi Date → string
```
