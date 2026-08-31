import { describe, it, expect } from 'vitest';
import { buildVizFromEvidence } from '@/services/grounding';
import type { EvidenceItem } from '@/services/grounding';

describe('buildVizFromEvidence Bapokting', () => {
  const bapoktingEvidence: EvidenceItem[] = [
    { opd: 'Bapokting Aceh Tengah (SPLP API)', indikator: 'Harga Beras', nilai: '16000', satuan: 'Rp', tahun: null, id: 'bapokting:beras' },
    { opd: 'Bapokting Aceh Tengah (SPLP API)', indikator: 'Harga Cabai', nilai: '45000', satuan: 'Rp', tahun: null, id: 'bapokting:cabai' },
    { opd: 'Bapokting Aceh Tengah (SPLP API)', indikator: 'Harga Bawang Merah', nilai: '35000', satuan: 'Rp', tahun: null, id: 'bapokting:bawang-merah' },
    { opd: 'Bapokting Aceh Tengah (SPLP API)', indikator: 'Harga Minyak Goreng', nilai: '25000', satuan: 'Rp', tahun: null, id: 'bapokting:minyak' },
  ];

  it('harus mengembalikan tipe chart untuk evidence Bapokting', () => {
    const viz = buildVizFromEvidence(bapoktingEvidence);
    expect(viz).toEqual(expect.objectContaining({ tipe: 'chart' }));
  });

  it('harus memiliki konfigurasi chart bar dengan data harga', () => {
    const viz = buildVizFromEvidence(bapoktingEvidence);
    if (viz.tipe === 'chart') {
      console.log('CONFIG:', JSON.stringify(viz.konfigurasi, null, 2));
      expect(viz.konfigurasi).toHaveProperty('type', 'bar');
      expect(viz.konfigurasi).toHaveProperty('bars');
      expect(viz.konfigurasi.bars).toContain('harga');
      expect(viz.konfigurasi.data).toBeDefined();
      expect(viz.konfigurasi.data.length).toBe(4);
      // Verify data format
      const data = viz.konfigurasi.data as any[];
      const beras = data.find((d) => d.nama?.includes('Beras'));
      console.log('BERAS:', beras);
      expect(beras).toBeDefined();
      expect(beras.harga).toBe(16000);
    } else {
      throw new Error('Expected chart, got ' + viz.tipe);
    }
  });
});
