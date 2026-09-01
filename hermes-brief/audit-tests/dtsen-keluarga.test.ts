/**
 * AUDIT — reproduksi deterministik bug P0 `jiwa == keluarga`.
 * Menjalankan fungsi PRODUKSI yang sebenarnya, bukan tiruan.
 * Tidak di-commit ke repo; hanya untuk audit.
 */
import { describe, it, expect } from 'vitest';
import {
  parseAndValidateDtsenCsv,
  buildAgregatWilayah,
  TEMPLATE_HEADER,
} from '@/services/dtsen-import';

const SECRET = 'secret-audit';

/** 5 orang, 2 keluarga nyata (KK-A 3 orang, KK-B 2 orang), satu desa, satu desil. */
const DATA = [
  ['3216022603070001', 'ALPHA SATU', '3216022603070091', 'BEBESEN', 'KEMILI', '1', '1', '0', '1'],
  ['3216022603070002', 'BRAVO DUA', '3216022603070091', 'BEBESEN', 'KEMILI', '1', '0', '1', '0'],
  ['3216022603070003', 'CHARLIE TIGA', '3216022603070091', 'BEBESEN', 'KEMILI', '1', '0', '0', '1'],
  ['3216022603070004', 'DELTA EMPAT', '3216022603070092', 'BEBESEN', 'KEMILI', '1', '1', '1', '0'],
  ['3216022603070005', 'ECHO LIMA', '3216022603070092', 'BEBESEN', 'KEMILI', '1', '0', '1', '1'],
];

const csvDenganKK =
  [TEMPLATE_HEADER.join(','), ...DATA.map((r) => r.join(','))].join('\n');

// Berkas yang SAMA tetapi kolom no_kk dibuang — inilah yang terjadi pada impor 235.011 baris
const csvTanpaKK = [
  TEMPLATE_HEADER.filter((h) => h !== 'no_kk').join(','),
  ...DATA.map((r) => r.filter((_, i) => TEMPLATE_HEADER[i] !== 'no_kk').join(',')),
].join('\n');

// no_kk ada sebagai kolom tetapi isinya kosong
const csvKKKosong = [
  TEMPLATE_HEADER.join(','),
  ...DATA.map((r) => r.map((v, i) => (TEMPLATE_HEADER[i] === 'no_kk' ? '' : v)).join(',')),
].join('\n');

describe('J1 — bug P0: tanpa no_kk, setiap orang dihitung sebagai satu keluarga', () => {
  it('no_kk LENGKAP -> 5 jiwa / 2 keluarga (BENAR)', () => {
    const { valid, rejected } = parseAndValidateDtsenCsv(csvDenganKK, SECRET);
    expect(rejected).toHaveLength(0);
    expect(valid).toHaveLength(5);
    const agg = buildAgregatWilayah(valid, 1);
    console.log('  [dengan no_kk]  ', JSON.stringify(agg.rows));
    expect(agg.rows[0]!.jumlahJiwa).toBe(5);
    expect(agg.rows[0]!.jumlahKeluarga).toBe(2);   // benar: 2 KK
  });

  it('no_kk HILANG dari header -> 5 jiwa / 5 "keluarga" (BUG — direproduksi)', () => {
    const { valid, rejected } = parseAndValidateDtsenCsv(csvTanpaKK, SECRET);
    // Header tidak ditolak, karena baris 153 mengecualikan 'no_kk' dari kolom wajib:
    expect(rejected).toHaveLength(0);
    expect(valid).toHaveLength(5);
    const agg = buildAgregatWilayah(valid, 1);
    console.log('  [tanpa no_kk]   ', JSON.stringify(agg.rows));
    expect(agg.rows[0]!.jumlahJiwa).toBe(5);
    expect(agg.rows[0]!.jumlahKeluarga).toBe(5);   // BUG: 5 "keluarga"
    // Inilah persis gejala yang tayang di produksi (222.643 = 222.643)
  });

  it('no_kk ADA tapi KOSONG -> sama saja, 5 jiwa / 5 "keluarga" (BUG)', () => {
    const { valid } = parseAndValidateDtsenCsv(csvKKKosong, SECRET);
    const agg = buildAgregatWilayah(valid, 1);
    console.log('  [no_kk kosong]  ', JSON.stringify(agg.rows));
    expect(agg.rows[0]!.jumlahKeluarga).toBe(5);   // BUG
  });

  it('no_kk cacat (15 digit) -> juga jatuh ke proxy individu (BUG)', () => {
    const csv = [
      TEMPLATE_HEADER.join(','),
      ...DATA.map((r) => r.map((v, i) => (TEMPLATE_HEADER[i] === 'no_kk' ? '321602260307009' : v)).join(',')),
    ].join('\n');
    const { valid } = parseAndValidateDtsenCsv(csv, SECRET);
    const agg = buildAgregatWilayah(valid, 1);
    expect(agg.rows[0]!.jumlahKeluarga).toBe(5);   // BUG: /^\d{16}$/ gagal -> proxy individu
  });

  it('tidak ada satu pun peringatan bahwa keluarga adalah angka proxy', () => {
    const { valid } = parseAndValidateDtsenCsv(csvTanpaKK, SECRET);
    const agg = buildAgregatWilayah(valid, 1);
    const r = agg.rows[0]!;
    // Objek hasil tidak membawa tanda apa pun bahwa jumlahKeluarga tidak dapat dipercaya
    expect(Object.keys(r).sort()).toEqual(
      ['desa', 'desil', 'jumlahJiwa', 'jumlahKeluarga', 'kecamatan'].sort(),
    );
    expect((agg as Record<string, unknown>).peringatan).toBeUndefined();
    expect((agg as Record<string, unknown>).keluargaProksi).toBeUndefined();
  });
});

describe('J2 — skala: rasio jiwa/keluarga Aceh Tengah', () => {
  it('angka produksi 222.643 jiwa / 222.643 "keluarga" = 1,00 jiwa per keluarga (mustahil)', () => {
    const jiwa = 222643, keluarga = 222643;
    expect(jiwa / keluarga).toBe(1);
  });
  it('kebenaran dari sumber yang sama: 234.740 jiwa / 71.370 KK = 3,29 jiwa per keluarga', () => {
    expect(234740 / 71370).toBeCloseTo(3.2891, 3);
  });
  it('jadi DB menggelembungkan jumlah keluarga 3,12×', () => {
    expect(222643 / 71370).toBeCloseTo(3.1196, 3);
  });
});

describe('J3 — k-anonimitas k>=5 (mekanisme yang HARUS dipertahankan)', () => {
  it('kelompok < 5 dibuang dari agregat dan dihitung di jiwaTerSensor', () => {
    const { valid } = parseAndValidateDtsenCsv(csvDenganKK, SECRET);
    const agg = buildAgregatWilayah(valid, 5);   // 5 jiwa, tepat di ambang
    expect(agg.rows).toHaveLength(1);
    expect(agg.jiwaTerSensor).toBe(0);

    const agg2 = buildAgregatWilayah(valid, 6);  // ambang 6 > 5 jiwa
    expect(agg2.rows).toHaveLength(0);
    expect(agg2.jiwaTerSensor).toBe(5);
    expect(agg2.kelompokTerSensor).toBe(1);
  });
});
