// ─── DTSEN Multi-Source Parser (PR-4c / Lapis 4 — multi-sumber) ───
// Mendukung import data dari berbagai format:
//   1. Format DTSEN standar (CSV: nik, nama, no_kk, kecamatan, desa, desil, pkh, bpnt, pbi_jk)
//   2. Format stunting (Excel: NIK, Nama, JK, Kec, Desa/Kel, Posyandu, dll)
//   3. Format kominfo (Excel: NIK, NAMA, KETERANGAN DESIL, NIK, KK, DESA, KECAMATAN, KRITERIA PPKS, dll)
//
// Semua format diproses menjadi ValidDtsenRow yang sama (HMAC NIK, nama masked, desil, bansos).
// Stunting dan kominfo tidak memiliki kolom bansos secara langsung — status bansos di-set false.
// Desil: diambil langsung dari kolom "desil" (format standar) atau "KETERANGAN DESIL" (kominfo).

import { KECAMATAN_ACEH_TENGAH, maskNama, hmac, K_MIN } from '@/services/dtsen-import';
import type { ValidDtsenRow, RejectedRow, ValidateOptions } from '@/services/dtsen-import';

// ─── Tipe ekstra untuk multi-source ───

export type DtsenSourceFormat = 'DTSEN_CSV' | 'STUNTING_XLSX' | 'KOMINFO_XLSX';

export interface ParseWarnings {
  warnings: string[];
}

export interface MultisourceImportResult {
  valid: ValidDtsenRow[];
  rejected: RejectedRow[];
  totalDataLines: number;
  warnings: string[];
}

// ─── Helper: normalisasi teks (case-insensitive, spacing-normalized) ───
function normText(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// ─── Helper: lookup kecamatan (case-insensitive, spacing-normalized) ───
function kecLookup(raw: string): string | null {
  if (!raw || raw.trim() === '') return null;
  const n = normText(raw);
  for (const kec of KECAMATAN_ACEH_TENGAH) {
    if (normText(kec) === n) return kec;
  }
  return null;
}

// ─── Parser stunting (format Excel) ───
// Kolom: No, NIK, Nama, JK, Tgl Lahir, BB Lahir, TB Lahir, Nama Ortu, Prov, Kab/Kota,
//        Kec, Pukesmas, Desa/Kel, Posyandu, RT, RW, Alamat, Usia Saat Ukur,
//        Tanggal Pengukuran, Berat, Tinggi, Cara Ukur, LiLA, BB/U, ZS BB/U,
//        TB/U, ZS TB/U, BB/TB, ZS BB/TB, Naik Berat Badan, Jml Vit A, KPSP, KIA,
//        Kelas Ibu Balita, MBG, Detail

/**
 * Parse stunting Excel data ke format DTSEN.
 * Data stunting fokus pada anak balita — tidak memiliki info bansos.
 * Desil diambil dari data DTSEN external (bukan dari file ini).
 */
export function parseStuntingXlsx(
  rows: Record<string, unknown>[],
  secret: string,
  opts: ValidateOptions = {},
): MultisourceImportResult {
  const valid: ValidDtsenRow[] = [];
  const rejected: RejectedRow[] = [];
  const warnings: string[] = [
    'Data stunting tidak mengandung info bansos (PKH/BPNT/PBI) — semua di-set false.',
    'Data stunting tidak memiliki kolom desil — di-set ke 1 (tertinggi prioritas) secara default.',
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const line = i + 2; // +1 untuk 0-based, +1 lagi untuk header
    const nik = String(row['NIK'] ?? row['nik'] ?? '').trim();
    const nikAwal = /^\d{4}/.test(nik) ? nik.slice(0, 4) : undefined;

    const fail = (reason: string) => {
      rejected.push({ line, reason, nikAwal });
      return undefined;
    };

    if (!/^\d{16}$/.test(nik)) {
      fail(`NIK harus 16 digit angka (diterima: "${nik ? nik.slice(0, 4) + '…' : 'kosong'}")`);
      continue;
    }

    const nama = String(row['Nama'] ?? row['nama'] ?? '').trim();
    if (nama.length < 2) {
      fail('Nama kosong/terlalu pendek (< 2 karakter)');
      continue;
    }

    const kecRaw = String(row['Kec'] ?? row['kecamatan'] ?? row['KECAMATAN'] ?? '').trim();
    const kecamatan = kecLookup(kecRaw);
    if (!kecamatan) {
      fail(`Kecamatan "${kecRaw || 'kosong'}" tidak dikenal`);
      continue;
    }

    const desa = String(row['Desa/Kel'] ?? row['DESA'] ?? row['desa'] ?? '').replace(/\s+/g, ' ').trim();
    if (desa.length < 3) {
      fail('Desa kosong');
      continue;
    }

    // Stunting tidak punya kolom desil — set default 1 (tertinggi prioritas)
    // Di produksi, desil akan di-join dengan data DTSEN eksternal
    const desil = 1;

    valid.push({
      nikHash: hmac(nik, secret),
      namaMasked: maskNama(nama),
      keluargaId: `individu:${hmac(nik, secret)}`, // tidak ada no_kk di stunting
      kecamatan,
      desa,
      desil,
      statusBansos: { pkh: false, bpnt: false, pbi: false }, // tidak ada info bansos di stunting
    });
  }

  return { valid, rejected, totalDataLines: rows.length, warnings };
}

// ─── Parser kominfo (format Excel) ───
// Kolom: NO, NAMA, KETERANGAN DESIL, NIK, KK, TEMPAT TGL LAHIR, PEKERJAAN,
//        JENIS KELAMIN, DESA, KECAMATAN, KRITERIA PPKS, NAMA ALAT BANTU,
//        MERK, SATUAN, ASESMEN, TANGGAL DISERAHKAN

/**
 * Parse data kominfo ke format DTSEN.
 * Data kominfo mengandung kolom "KETERANGAN DESIL" yang bisa langsung dipakai.
 * Kolom "KRITERIA PPKS" menunjukkan kategori — tidak langsung bansos, tapi
 * dapat diekstrak ke status bansos (mis. disabilitas, lanjut usia).
 */
export function parseKominfoXlsx(
  rows: Record<string, unknown>[],
  secret: string,
  opts: ValidateOptions = {},
): MultisourceImportResult {
  const valid: ValidDtsenRow[] = [];
  const rejected: RejectedRow[] = [];
  const warnings: string[] = [
    'Data kominfo tidak memiliki kolom bansos (PKH/BPNT/PBI) — semua di-set false.',
    'Kolom "KRITERIA PPKS" tidak langsung mapped ke bansos (perlu aturan bisnis tambahan).',
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    const line = i + 2;
    const nik = String(row['NIK'] ?? row['nik'] ?? '').trim();
    const nikAwal = /^\d{4}/.test(nik) ? nik.slice(0, 4) : undefined;

    const fail = (reason: string) => {
      rejected.push({ line, reason, nikAwal });
      return undefined;
    };

    if (!/^\d{16}$/.test(nik)) {
      fail(`NIK harus 16 digit angka (diterima: "${nik ? nik.slice(0, 4) + '…' : 'kosong'}")`);
      continue;
    }

    const nama = String(row['NAMA'] ?? row['nama'] ?? '').trim();
    if (nama.length < 2) {
      fail('Nama kosong/terlalu pendek (< 2 karakter)');
      continue;
    }

    const kecRaw = String(row['KECAMATAN'] ?? row['kecamatan'] ?? '').trim();
    const kecamatan = kecLookup(kecRaw);
    if (!kecamatan) {
      fail(`Kecamatan "${kecRaw || 'kosong'}" tidak dikenal`);
      continue;
    }

    const desa = String(row['DESA'] ?? row['desa'] ?? '').replace(/\s+/g, ' ').trim();
    if (desa.length < 3) {
      fail('Desa kosong');
      continue;
    }

    // KETERANGAN DESIL — angka 1-10
    const desilRaw = String(row['KETERANGAN DESIL'] ?? row['desil'] ?? row['Desil'] ?? '').trim();
    const desil = Number(desilRaw);
    if (!Number.isInteger(desil) || desil < 1 || desil > 10) {
      fail(`Desil harus bilangan bulat 1-10 (diterima: "${desilRaw || 'kosong'}")`);
      continue;
    }

    const noKk = String(row['KK'] ?? row['no_kk'] ?? '').trim();

    valid.push({
      nikHash: hmac(nik, secret),
      namaMasked: maskNama(nama),
      keluargaId: /^\d{16}$/.test(noKk) ? `kk:${hmac(noKk, secret)}` : `individu:${hmac(nik, secret)}`,
      kecamatan,
      desa,
      desil,
      statusBansos: { pkh: false, bpnt: false, pbi: false }, // kominfo tidak punya kolom bansos
    });
  }

  return { valid, rejected, totalDataLines: rows.length, warnings };
}

// ─── Re-export untuk konsumsi eksternal ───
export { K_MIN };