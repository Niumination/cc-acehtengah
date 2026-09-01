/**
 * VERIFIKASI PASCA-PERBAIKAN — hotfix/meeting-ready @ 9fd04a2 (1 Sep 2026).
 *
 * Kebalikan dari empat berkas audit lain: test di situ meng-assert BUG.
 * Berkas ini meng-assert PERILAKU YANG SUDAH DIPERBAIKI.
 *
 * Cara pakai:
 *   cd cc-acehtengah && git checkout -B verify-hotfix origin/hotfix/meeting-ready && npm ci
 *   mkdir -p src/__audit && cp hermes-brief/audit-tests/verif-post.test.ts src/__audit/
 *   npx vitest run src/__audit/verif-post.test.ts        # → 9 passed
 *
 * Jika ada yang merah, perbaikan itu belum ter-deploy atau sudah ter-regresi.
 * JANGAN di-commit ke repo.
 */
import { describe, it, expect } from 'vitest';
import {
  parseAndValidateDtsenCsv,
  buildAgregatWilayah,
  TEMPLATE_HEADER,
} from '@/services/dtsen-import';
import { hitungStatsBapokting } from '@/lib/bapokting-stats';

const SECRET = 'secret-audit';
const idxKK = TEMPLATE_HEADER.indexOf('no_kk');

/** 5 orang, 2 keluarga nyata (KK-…91 tiga orang, KK-…92 dua orang). */
const DATA = [
  ['3216022603070001', 'ALPHA SATU', '3216022603070091', 'BEBESEN', 'KEMILI', '1', '1', '0', '1'],
  ['3216022603070002', 'BRAVO DUA', '3216022603070091', 'BEBESEN', 'KEMILI', '1', '0', '1', '0'],
  ['3216022603070003', 'CHARLIE TIGA', '3216022603070091', 'BEBESEN', 'KEMILI', '1', '0', '0', '1'],
  ['3216022603070004', 'DELTA EMPAT', '3216022603070092', 'BEBESEN', 'KEMILI', '1', '1', '1', '0'],
  ['3216022603070005', 'ECHO LIMA', '3216022603070092', 'BEBESEN', 'KEMILI', '1', '0', '1', '1'],
];

const buat = (gantiKK?: (v: string, i: number) => string) =>
  [
    TEMPLATE_HEADER.join(','),
    ...DATA.map((r) => (gantiKK ? r.map((v, i) => gantiKK(v, i)) : r).join(',')),
  ].join('\n');

const agregat = (rows: ReturnType<typeof parseAndValidateDtsenCsv>['valid']) => {
  const a = buildAgregatWilayah(rows, 1);
  return {
    jiwa: a.rows.reduce((x, r) => x + r.jumlahJiwa, 0),
    keluarga: a.rows.reduce((x, r) => x + r.jumlahKeluarga, 0),
    keluargaProksi: a.keluargaProksi ?? 0,
  };
};

describe('V1 — WP0.0/WP0.2b: no_kk wajib, proxy keluarga dicabut', () => {
  it('no_kk cacat 15 digit kini DITOLAK dengan alasan jelas', () => {
    const r = parseAndValidateDtsenCsv(buat((v, i) => (i === idxKK ? v.slice(0, 15) : v)), SECRET, { kMin: 1 });
    expect(r.valid).toHaveLength(0);
    expect(r.rejected[0]!.reason).toMatch(/no_kk harus 16 digit/);
  });

  it('no_kk KOSONG kini DITOLAK, bukan jatuh ke proxy individu', () => {
    const r = parseAndValidateDtsenCsv(buat((v, i) => (i === idxKK ? '' : v)), SECRET, { kMin: 1 });
    expect(r.valid).toHaveLength(0);
  });

  it('kolom no_kk HILANG dari header kini DITOLAK di tingkat header', () => {
    const tanpaKolom = [
      TEMPLATE_HEADER.filter((h) => h !== 'no_kk').join(','),
      ...DATA.map((r) => r.filter((_, i) => TEMPLATE_HEADER[i] !== 'no_kk').join(',')),
    ].join('\n');
    const r = parseAndValidateDtsenCsv(tanpaKolom, SECRET, { kMin: 1 });
    expect(r.valid).toHaveLength(0);
    expect(r.rejected[0]!.reason).toMatch(/Kolom wajib hilang: .*no_kk/);
  });

  it('no_kk lengkap -> 5 jiwa / 2 keluarga, tanpa keluargaId "individu:"', () => {
    const r = parseAndValidateDtsenCsv(buat(), SECRET, { kMin: 1 });
    expect(r.valid).toHaveLength(5);
    const a = agregat(r.valid);
    expect(a.jiwa).toBe(5);
    expect(a.keluarga).toBe(2);
    expect(a.keluargaProksi).toBe(0);
    expect(r.valid.every((v) => v.keluargaId.startsWith('kk:'))).toBe(true);
  });
});

describe('V2 — WP0.15: empat cacat statistik Bapokting', () => {
  const deret = (nama: string, n: number, mulai: number, langkah: number) =>
    Array.from({ length: n }, (_, i) => ({
      namaBarang: nama,
      kategori: 'Uji',
      kecamatan: 'Linge',
      satuan: 'Kg',
      harga: mulai + i * langkah,
      tanggal: new Date(2026, 7, 1 + i).toISOString(),
    }));

  it('hargaAvg kategori tertimbang, BUKAN rata-rata dari rata-rata', () => {
    const s = hitungStatsBapokting([...deret('Beras Uji', 14, 10000, 300), ...deret('Gula Uji', 2, 30000, 0)] as never, 7);
    const b = s.komoditas['Beras Uji']!;
    const g = s.komoditas['Gula Uji']!;
    const tertimbang = Math.round(
      (b.hargaAvg * b.hargaHistoris.length + g.hargaAvg * g.hargaHistoris.length) /
        (b.hargaHistoris.length + g.hargaHistoris.length),
    );
    expect(s.kategori['Uji']!.hargaAvg).toBe(tertimbang);
    expect(s.kategori['Uji']!.hargaAvg).not.toBe(20000); // 20000 = hasil bug lama
  });

  it('overallIndex = 0 (bukan NaN) saat data kosong', () => {
    const s = hitungStatsBapokting([] as never, 7);
    expect(Number.isNaN(s.volatility.overallIndex)).toBe(false);
    expect(s.volatility.overallIndex).toBe(0);
  });

  it('satu komoditas tidak lagi disebut "paling fluktuatif" DAN "paling stabil"', () => {
    const s = hitungStatsBapokting(deret('Beras Uji', 14, 10000, 300) as never, 7);
    const gabung = s.rekomendasi.join(' | ');
    expect(/paling fluktuatif/.test(gabung) && /paling stabil/.test(gabung)).toBe(false);
  });

  it('cukupData=false + peringatan saat tren tidak bisa dihitung (13 titik)', () => {
    const s = hitungStatsBapokting(deret('Beras Uji', 13, 10000, 800) as never, 7);
    expect(s.komoditas['Beras Uji']!.cukupData).toBe(false);
    expect(s.peringatan).toMatch(/<14 hari/);
  });

  it('14 titik tetap menghasilkan tren naik (tidak diregresi)', () => {
    const s = hitungStatsBapokting(deret('Beras Uji', 14, 10000, 200) as never, 7);
    expect(s.komoditas['Beras Uji']!.cukupData).toBe(true);
    expect(s.komoditas['Beras Uji']!.trend).toBe('naik');
  });
});
