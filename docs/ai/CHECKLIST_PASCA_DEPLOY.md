# Checklist Verifikasi Pasca-Deploy — Executive Answer UI

> Eksekusi berurutan SETELAH merge ke main + deploy Vercel disetujui.
> Centang tiap langkah; hentikan dan laporkan bila ada yang gagal.
> Rollback darurat kapan saja: env `NEXT_PUBLIC_AI_EXECUTIVE_UI=false` di Vercel
> → **redeploy** (env di-inline saat build; restart saja tidak cukup).

## 1. Health & dasar

- [ ] `GET https://cc-acehtengah.vercel.app/api/health` → `"status":"healthy"`,
      `services.sapa=ok`, `services.ai=ok`
- [ ] `/dashboard` terbuka tanpa error console
- [ ] Badge header: "Online" + "SAPA Connected", jam live jalan

## 2. Data live

- [ ] Stats SAPA tampil (~2.032 record, 38 OPD)
- [ ] KPI panel + EWS panel render (EWS boleh "belum tersedia" jika cron belum isi)

## 3. Executive Answer (flag default aktif)

- [ ] Klik chip "OPD Teratas" → SSE urut status → narasi → result
- [ ] Executive Answer utuh: headline, ranking OPD, insight cards,
      panel keputusan, provenance ("SAPA Aceh Tengah · …"), follow-up chips
- [ ] Tidak ada raw JSON, tidak ada thinking bocor, tidak ada angka di luar evidence
- [ ] Query substantif (mis. "Stunting") → narasi menyebut sumber dengan benar

## 4. Rollback sekali-jalan (validasi jalur darurat)

- [ ] Set env `NEXT_PUBLIC_AI_EXECUTIVE_UI=false` di Vercel → redeploy
- [ ] Query chip yang sama → renderer legacy ("Hasil Analisis AI") muncul
- [ ] Balikkan env (hapus / set selain "false") → redeploy → Executive Answer kembali

## 5. Build CI/Vercel

- [ ] Log build Vercel pertama pasca-merge: tidak ada error turbopack root
      (fix `next.config.ts` divalidasi lokal, CI perlu diamati sekali)

## 6. Lulusan

- [ ] Semua centang → catat tanggal + hasil di `REVIEW_EXECUTIVE_UI.md`
- [ ] Ada gagal → status **BLOCKED**, jangan lanjut ke penggunaan normal
