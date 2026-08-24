# SAPA Smart AI — Prototype Executive Answer

Prototype interaktif untuk tahap awal desain **output AI yang lebih eksekutif, visual, grounded, dan actionable**. Prototype tetap tersedia sebagai demo terpisah. Penerapan ke source dilakukan di branch `feat/ai-executive-answer-v1` secara additive; kontrak legacy, API, database, dan renderer lama tetap dipertahankan sebagai fallback.

## Cara menjalankan

Dari root repo:

```bash
python3 -m http.server 4173 --bind 0.0.0.0 --directory prototype
```

Buka `http://localhost:4173` atau gunakan live preview dari Agent Mode.

## Skenario yang tersedia

| Skenario | Bentuk visual | Fokus yang didemokan |
|---|---|---|
| Jumlah ASN | Metric + bar per indikator | Headline pimpinan, konteks tanpa menjumlahkan indikator berbeda |
| Stunting | Dual metric + quality callout | Tidak mencampur satuan/tahun/producer; tidak membuat tren tanpa deret waktu |
| OPD dengan indikator terbanyak | Ranking bar | Membedakan volume registry dari kualitas kinerja |
| Distribusi data per tahun | Distribution bar | Menjadikan metadata tahun kosong sebagai insight kualitas data |
| Tren stunting | Guardrail / not available | Menahan visual yang berpotensi menyesatkan ketika evidence belum cukup |

Klik chip pertanyaan atau ketik pertanyaan yang mengandung kata kunci terkait. Tombol **Ringkas pimpinan / Catatan teknis** mengubah gaya narasi tanpa mengubah evidence.

## Data yang dipakai dalam fixture demo

Nilai fixture diambil dari observasi repo dan live site pada **24 Agustus 2026**:

- 2.032 total records, 38 OPD, 1.793 indikator unik, pemutakhiran Triwulan IV.
- Distribusi tahun: 2022 = 1, 2023 = 3, 2024 = 27, 2025 = 733, 2026 = 452, tidak tercantum = 816.
- ASN: 9.610 pegawai pada 2026; indikator terkait yang tampil terpisah: PNS 4.286, PPPK Paruh Waktu 3.325, PPPK penuh Waktu 2.083.
- Stunting: 730 orang pada 2025 dan prevalensi 4,9 persen pada record yang tahunnya belum tercantum.
- Top volume indikator: Dinas Kesehatan 294, Dinas Keluarga Berencana PPPA 192, Dinas Pekerjaan Umum dan Penataan Ruang 172, Dinas Pemuda dan Olahraga 164.

Prototype tidak memanggil API; label **data contoh terverifikasi** berarti fixture bersumber dari respons/endpoint yang diperiksa, bukan query live saat halaman dibuka.

## Prinsip desain output

1. **Headline dulu** — satu jawaban utama, satuan, tahun, dan produsen data terlihat sebelum detail.
2. **Visual mengikuti bentuk data** — metric untuk satu nilai, bar untuk perbandingan, distribution untuk sebaran, guardrail jika tren belum tersedia.
3. **Narrative menjelaskan makna, bukan membaca tabel ulang.**
4. **Quick win selalu mempunyai aksi, pemilik, dan horizon.** Rekomendasi tidak menambah angka di luar evidence.
5. **Audit trail selalu terlihat** — sumber, waktu akses, mode Direct API/fallback SPLP, dan batas interpretasi.
6. **Tidak tersedia adalah jawaban yang valid** jika evidence belum memadai.

## Berkas

- `index.html` — prototype single-file, inline CSS/JS, tanpa dependensi eksternal.
- `IMPLEMENTATION_PLAN.md` — rencana penerapan bertahap agar tidak merusak sistem produksi.
