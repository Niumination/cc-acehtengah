// ─── Transformasi SapaRecord → bentuk gudang data (R1) ───
//
// Modul murni: tidak menyentuh database maupun jaringan, sehingga seluruh
// aturan penguraian dapat diuji sebagai unit.
// Lihat LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-10

import type { SapaRecord } from '@/lib/sapa-client';

export interface OpdRow {
  id: number;
  nama: string;
}

export interface IndicatorRow {
  id: number;
  kode: string | null;
  nama: string;
  satuan: string | null;
}

export interface ObservationRow {
  indicatorId: number;
  opdId: number;
  /** null berarti SAPA tidak mencantumkan tahun. */
  tahun: string | null;
  nilaiTeks: string;
  nilaiNumerik: number | null;
  satuan: string | null;
  jadwal: string | null;
}

export interface TransformResult {
  opds: OpdRow[];
  indicators: IndicatorRow[];
  observations: ObservationRow[];
  /** Baris yang dibuang beserta alasannya — ditampilkan di log sinkronisasi. */
  skipped: { alasan: string; jumlah: number }[];
}

/**
 * Uraikan nilai indikator menjadi angka.
 *
 * ASUMSI YANG DIDOKUMENTASIKAN (bukan tebakan diam-diam):
 * SAPA mengirim `variabel` sebagai teks bebas. Format angka Indonesia memakai
 * titik sebagai pemisah ribuan dan koma sebagai desimal ("1.234,56"), sedangkan
 * format internasional sebaliknya ("1,234.56"). Aturan yang dipakai:
 *
 *   1. Ada koma  → diperlakukan sebagai format Indonesia:
 *                  titik dibuang, koma menjadi titik desimal.
 *   2. Tanpa koma, titik tunggal, dan bagian setelah titik TEPAT 3 digit
 *      (mis. "1.245") → ambigu. Diperlakukan sebagai PEMISAH RIBUAN, karena
 *      SAPA mayoritas berisi cacah bulat (jumlah orang, unit, hektar).
 *   3. Tanpa koma dan titik desimal jelas (mis. "21.3", "0.64") → desimal.
 *   4. Selain itu → null (tidak dapat diangkakan), nilai teks tetap disimpan.
 *
 * Nilai mentah SELALU ikut disimpan di `nilaiTeks`, sehingga keputusan ini
 * dapat ditinjau ulang tanpa kehilangan data asli.
 */
export function parseNilaiNumerik(raw: string | null | undefined): number | null {
  if (raw == null) return null;

  const teks = String(raw).trim();
  if (teks === '') return null;

  // Buang segala selain digit, titik, koma, dan tanda minus di depan.
  const negatif = /^-/.test(teks);
  const bersih = teks.replace(/[^\d.,]/g, '');
  if (bersih === '') return null;

  let normal: string;

  if (bersih.includes(',')) {
    // Aturan 1 — format Indonesia.
    normal = bersih.replace(/\./g, '').replace(',', '.');
  } else {
    const bagian = bersih.split('.');
    if (bagian.length === 1) {
      normal = bagian[0];
    } else if (bagian.length > 2 || bagian[bagian.length - 1].length === 3) {
      // Aturan 2 — beberapa titik, atau tepat 3 digit di akhir: pemisah ribuan.
      normal = bagian.join('');
    } else {
      // Aturan 3 — desimal.
      normal = bersih;
    }
  }

  const angka = Number(normal);
  if (!Number.isFinite(angka)) return null;
  return negatif ? -angka : angka;
}

/** Normalkan tahun: string kosong / 'None' / '-' dianggap tidak ada. */
export function normalizeTahun(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  const t = raw.trim();
  if (t === '' || /^(none|null|-|n\/a)$/i.test(t)) return null;
  return t;
}

/** Ubah respons mentah SAPA menjadi baris-baris siap simpan. */
export function transformSapaRecords(records: SapaRecord[]): TransformResult {
  const opds = new Map<number, OpdRow>();
  const indicators = new Map<number, IndicatorRow>();
  const observations = new Map<string, ObservationRow>();

  let tanpaIndikator = 0;
  let tanpaOpd = 0;
  let duplikat = 0;

  for (const r of records) {
    const indicatorId = Number(r.id_kode_indikator);
    const opdId = Number(r.id_opds);
    const namaIndikator = r.kode_indikator_nama_indikator?.trim();
    const namaOpd = r.opds_nama_opd?.trim();

    if (!Number.isInteger(indicatorId) || !namaIndikator) {
      tanpaIndikator += 1;
      continue;
    }
    if (!Number.isInteger(opdId) || !namaOpd) {
      tanpaOpd += 1;
      continue;
    }

    if (!opds.has(opdId)) opds.set(opdId, { id: opdId, nama: namaOpd });

    const satuan = r.satuan?.trim() || null;
    if (!indicators.has(indicatorId)) {
      indicators.set(indicatorId, {
        id: indicatorId,
        kode: r.kode_indikator_kode_indikator?.trim() || null,
        nama: namaIndikator,
        satuan,
      });
    }

    const tahun = normalizeTahun(r.tahun);
    // Kunci harus sama persis dengan UNIQUE di basis data.
    const kunci = `${indicatorId}|${opdId}|${tahun ?? '\u0000'}`;
    if (observations.has(kunci)) duplikat += 1;

    // Baris terakhir menang — konsisten dengan perilaku upsert.
    observations.set(kunci, {
      indicatorId,
      opdId,
      tahun,
      nilaiTeks: String(r.variabel ?? ''),
      nilaiNumerik: parseNilaiNumerik(r.variabel),
      satuan,
      jadwal: r.jadwal_pemutakhiran?.trim() || null,
    });
  }

  const skipped: TransformResult['skipped'] = [];
  if (tanpaIndikator > 0) skipped.push({ alasan: 'indikator tidak valid', jumlah: tanpaIndikator });
  if (tanpaOpd > 0) skipped.push({ alasan: 'OPD tidak valid', jumlah: tanpaOpd });
  if (duplikat > 0)
    skipped.push({ alasan: 'duplikat (indikator, OPD, tahun) — nilai terakhir dipakai', jumlah: duplikat });

  return {
    opds: [...opds.values()],
    indicators: [...indicators.values()],
    observations: [...observations.values()],
    skipped,
  };
}
