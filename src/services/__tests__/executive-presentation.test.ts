import { describe, expect, it } from 'vitest';
import { buildExecutivePresentation, getExecutivePresentation } from '@/services/executive-presentation';
import type { HybridResponse } from '@/types';

function response(overrides: Partial<HybridResponse> = {}): HybridResponse {
  return {
    narasi: 'Ringkasan data SAPA.',
    visualisasi: { tipe: 'none', konfigurasi: {} },
    rekomendasi: [],
    dataSource: 'SAPA Aceh Tengah (sapa.acehtengahkab.go.id)',
    timestamp: '2026-08-24T04:00:00.000Z',
    ...overrides,
  };
}

describe('buildExecutivePresentation', () => {
  it('membuat headline metric dan evidence dari response legacy', () => {
    const result = buildExecutivePresentation(response({
      narasi: 'Jumlah ASN tercatat 9610 pegawai pada tahun 2026.',
      visualisasi: {
        tipe: 'metric',
        konfigurasi: {
          metrics: [{ label: 'Jumlah ASN', value: '9610', unit: 'pegawai' }],
        },
      },
    }));

    expect(result.version).toBe('v1');
    expect(result.answerType).toBe('metric');
    expect(result.title).toBe('Jumlah ASN');
    expect(result.metrics[0]).toMatchObject({ label: 'Jumlah ASN', value: '9610', unit: 'pegawai' });
    expect(result.evidence[0]).toMatchObject({ indikator: 'Jumlah ASN', nilai: '9610', satuan: 'pegawai' });
    expect(result.provenance.origin).toBe('direct');
    expect(result.quickWins).toHaveLength(3);
  });

  it('menormalisasi table columns object dan row object tanpa crash', () => {
    const result = buildExecutivePresentation(response({
      narasi: 'Dua indikator tersedia.',
      visualisasi: {
        tipe: 'table',
        konfigurasi: {
          columns: [
            { key: 'indikator', name: 'Indikator' },
            { key: 'nilai', name: 'Nilai' },
            { key: 'satuan', name: 'Satuan' },
          ],
          rows: [
            { indikator: 'A', nilai: '10', satuan: 'orang' },
            { indikator: 'B', nilai: '20', satuan: 'orang' },
          ],
        },
      },
    }));

    expect(result.answerType).toBe('table');
    expect(result.visual.columns).toEqual([
      { key: 'indikator', name: 'Indikator' },
      { key: 'nilai', name: 'Nilai' },
      { key: 'satuan', name: 'Satuan' },
    ]);
    expect(result.visual.rows[1]).toMatchObject({ indikator: 'B', nilai: '20', satuan: 'orang' });
    expect(result.evidence[1]).toMatchObject({ indikator: 'B', nilai: '20', satuan: 'orang' });
  });

  it('mempertahankan chart line sebagai tipe tren dan menormalkan series object', () => {
    const result = buildExecutivePresentation(response({
      narasi: 'Perubahan indikator antar-periode.',
      visualisasi: {
        tipe: 'chart',
        konfigurasi: {
          type: 'line',
          title: 'Tren indikator',
          xKey: 'periode',
          data: [{ periode: '2025', nilai: 12 }, { periode: '2026', nilai: 10 }],
          lines: [{ key: 'nilai', label: 'Nilai aktual', color: '#123456' }],
        },
      },
    }));

    expect(result.answerType).toBe('trend');
    expect(result.visual.type).toBe('line');
    expect(result.visual.series[0]).toMatchObject({ key: 'nilai', name: 'Nilai aktual', color: '#123456' });
    expect(result.visual.data).toHaveLength(2);
  });

  it('menahan visual saat response menyatakan data belum tersedia', () => {
    const result = buildExecutivePresentation(response({
      narasi: 'Data untuk pertanyaan ini tidak ditemukan di SAPA.',
    }));

    expect(result.answerType).toBe('not_available');
    expect(result.visual.type).toBe('none');
    expect(result.quickWins[0]?.owner).toBe('OPD pengampu');
    expect(result.insights.some((item) => item.tone === 'warn')).toBe(true);
  });

  it('mempertahankan rekomendasi lama tanpa membuat angka baru', () => {
    const result = buildExecutivePresentation(response({
      visualisasi: { tipe: 'metric', konfigurasi: { metrics: [{ label: 'Nilai', value: 10, unit: 'orang' }] } },
      rekomendasi: ['Validasi periode data dengan OPD pengampu'],
    }));

    expect(result.quickWins).toHaveLength(1);
    expect(result.quickWins[0]?.action).toBe('Validasi periode data dengan OPD pengampu');
  });

  it('menolak presentation payload yang tidak lengkap dan kembali ke adapter legacy', () => {
    const result = getExecutivePresentation(response({ presentation: { version: 'v1' } as never }));
    expect(result.version).toBe('v1');
    expect(result.title).toBe('Ringkasan jawaban SAPA');
  });
});
