import { describe, expect, it } from 'vitest';
import {
  buildOpdDetail,
  parseNumericId,
  resolveExactOpdName,
} from '@/services/opd-drilldown';
import type { SapaRecord } from '@/lib/sapa-client';

function record(overrides: Partial<SapaRecord> = {}): SapaRecord {
  return {
    id: 1,
    id_kode_indikator: 100,
    kode_indikator_kode_indikator: 'IND-001',
    kode_indikator_nama_indikator: 'Jumlah Contoh',
    id_opds: 7,
    opds_nama_opd: 'Dinas Uji',
    jadwal_pemutakhiran: 'Tahunan',
    satuan: 'Orang',
    tahun: '2025',
    variabel: '1.234',
    ...overrides,
  };
}

describe('parseNumericId', () => {
  it('mem-parsing format ribuan Indonesia', () => {
    expect(parseNumericId('1.234')).toBe(1234);
    expect(parseNumericId('1.234.567')).toBe(1234567);
  });

  it('mem-parsing desimal koma dan spasi', () => {
    expect(parseNumericId('60,5')).toBeCloseTo(60.5);
    expect(parseNumericId('1.234,56')).toBeCloseTo(1234.56);
    expect(parseNumericId(' 9610 ')).toBe(9610);
  });

  it('menolak teks non-numerik tanpa mengarang angka', () => {
    expect(parseNumericId('n/a')).toBeNull();
    expect(parseNumericId('Belum tersedia')).toBeNull();
    expect(parseNumericId('12a')).toBeNull();
    expect(parseNumericId('-5')).toBeNull();
  });
});

describe('resolveExactOpdName', () => {
  const records = [record(), record({ opds_nama_opd: 'Dinas Lain' })];

  it('cocok persis lebih diutamakan', () => {
    expect(resolveExactOpdName(records, 'Dinas Uji')).toBe('Dinas Uji');
  });

  it('fallback case-insensitive', () => {
    expect(resolveExactOpdName(records, 'dinas uji')).toBe('Dinas Uji');
  });

  it('null bila tidak ada', () => {
    expect(resolveExactOpdName(records, 'OPD Fiktif')).toBeNull();
  });
});

describe('buildOpdDetail', () => {
  it('menghitung stat ringkas dan baris indikator nilai terbaru', () => {
    const detail = buildOpdDetail([
      record({ tahun: '2025', variabel: '500' }),
      record({ id: 2, tahun: '2026', variabel: '600' }),
    ], 'Dinas Uji');

    expect(detail.nama).toBe('Dinas Uji');
    expect(detail.totalRecords).toBe(2);
    expect(detail.uniqueIndicators).toBe(1);
    // Nilai terakhir = tahun terbaru.
    expect(detail.topIndicators[0]?.nilai).toBe('600');
    expect(detail.topIndicators[0]?.tahun).toBe('2026');
  });

  it('hanya membentuk tren dari ≥2 titik tahun valid, dedup per tahun', () => {
    const detail = buildOpdDetail([
      record({ id: 1, tahun: '2024', variabel: '10' }),
      record({ id: 2, tahun: '2024', variabel: '11' }), // duplikat tahun → diambil pertama
      record({ id: 3, tahun: '2025', variabel: '12' }),
    ], 'Dinas Uji');

    expect(detail.trends).toHaveLength(1);
    expect(detail.trends[0]?.points).toEqual([
      { tahun: 2024, nilai: 10 },
      { tahun: 2025, nilai: 12 },
    ]);
    expect(detail.indicatorsWithoutTrend).toBe(0);
  });

  it('tidak memaksakan tren dari record tanpa tahun / nilai non-numerik', () => {
    const detail = buildOpdDetail([
      record({ id: 1, tahun: null, variabel: '10' }),
      record({ id: 2, tahun: '2025', variabel: 'n/a' }),
      record({ id: 3, tahun: '1999', variabel: '1' }), // tahun < 1900? bukan — 1999 > 1900
      record({ id: 4, tahun: 'Unknown', variabel: '2' }),
    ], 'Dinas Uji');

    expect(detail.trends).toHaveLength(0);
    expect(detail.indicatorsWithoutTrend).toBeGreaterThan(0);
    // Record "Unknown" & null dihitung jujur sebagai tanpa tahun.
    expect(detail.recordsWithoutYear).toBeGreaterThanOrEqual(2);
  });

  it('menyaring tren dengan tahun mustahil (<1900)', () => {
    const detail = buildOpdDetail([
      record({ id: 1, tahun: '1899', variabel: '1' }),
      record({ id: 2, tahun: '1900', variabel: '2' }),
    ], 'Dinas Uji');

    expect(detail.trends).toHaveLength(0);
    expect(detail.recordsWithoutYear).toBe(2); // kedua tahun invalid → dihitung tanpa-tahun
  });

  it('indikator tanpa nama memakai fallback id, satuan kosong jadi strip', () => {
    const detail = buildOpdDetail([
      record({ kode_indikator_nama_indikator: null, satuan: '' }),
    ], 'Dinas Uji');

    expect(detail.topIndicators[0]?.nama).toContain('Indikator #');
    expect(detail.topIndicators[0]?.satuan).toBe('-');
  });
});
