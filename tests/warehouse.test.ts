// Tes untuk gudang data SAPA (R1) dan evaluator EWS (R2).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  parseNilaiNumerik,
  normalizeTahun,
  transformSapaRecords,
} from '../src/lib/sapa-transform.ts';
import {
  isBreached,
  buildPesan,
  evaluateThresholds,
  type ThresholdInput,
} from '../src/lib/ews-evaluator.ts';
import { buildMockSapaRecords } from '../src/lib/data-source.ts';

// ─── R1: penguraian nilai ───

test('parseNilaiNumerik: desimal internasional', () => {
  assert.equal(parseNilaiNumerik('21.3'), 21.3);
  assert.equal(parseNilaiNumerik('0.64'), 0.64);
  assert.equal(parseNilaiNumerik('88.45'), 88.45);
});

test('parseNilaiNumerik: format Indonesia (koma desimal)', () => {
  assert.equal(parseNilaiNumerik('1.234,56'), 1234.56);
  assert.equal(parseNilaiNumerik('21,3'), 21.3);
  assert.equal(parseNilaiNumerik('1.000.000,5'), 1000000.5);
});

test('parseNilaiNumerik: titik dengan tepat 3 digit dianggap pemisah ribuan', () => {
  // Asumsi terdokumentasi: SAPA mayoritas berisi cacah bulat.
  assert.equal(parseNilaiNumerik('1.245'), 1245);
  assert.equal(parseNilaiNumerik('48.750'), 48750);
  assert.equal(parseNilaiNumerik('1.234.567'), 1234567);
});

test('parseNilaiNumerik: bilangan bulat & satuan menempel', () => {
  assert.equal(parseNilaiNumerik('892'), 892);
  assert.equal(parseNilaiNumerik('Rp 16.600'), 16600);
  assert.equal(parseNilaiNumerik('78,4 %'), 78.4);
});

test('parseNilaiNumerik: nilai yang tidak dapat diangkakan → null', () => {
  for (const v of [null, undefined, '', '   ', 'tidak ada data', '-', 'N/A']) {
    assert.equal(parseNilaiNumerik(v), null, `input: ${JSON.stringify(v)}`);
  }
});

test('parseNilaiNumerik: negatif dipertahankan', () => {
  assert.equal(parseNilaiNumerik('-12,5'), -12.5);
  assert.equal(parseNilaiNumerik('-3'), -3);
});

test('normalizeTahun: penanda kosong dianggap tidak ada tahun', () => {
  for (const v of ['', '  ', 'None', 'null', '-', 'N/A', null, undefined]) {
    assert.equal(normalizeTahun(v), null, `input: ${JSON.stringify(v)}`);
  }
  assert.equal(normalizeTahun(' 2025 '), '2025');
});

// ─── R1: transformasi ───

test('transformSapaRecords: menghasilkan OPD, indikator, dan observasi unik', () => {
  const hasil = transformSapaRecords(buildMockSapaRecords());
  assert.ok(hasil.opds.length >= 10);
  assert.ok(hasil.indicators.length >= 30);
  assert.equal(hasil.observations.length, hasil.indicators.length);

  const idOpd = new Set(hasil.opds.map((o) => o.id));
  assert.equal(idOpd.size, hasil.opds.length, 'id OPD harus unik');
});

test('transformSapaRecords: kunci unik (indikator, OPD, tahun) tidak duplikat', () => {
  const hasil = transformSapaRecords(buildMockSapaRecords());
  const kunci = hasil.observations.map((o) => `${o.indicatorId}|${o.opdId}|${o.tahun}`);
  assert.equal(new Set(kunci).size, kunci.length);
});

test('transformSapaRecords: baris cacat dibuang dan dilaporkan', () => {
  const rusak = [
    { id: 1, id_kode_indikator: 1, kode_indikator_kode_indikator: 'A', kode_indikator_nama_indikator: null,
      id_opds: 1, opds_nama_opd: 'Dinas X', jadwal_pemutakhiran: 'Tahunan', satuan: 'Unit', tahun: '2025', variabel: '5' },
    { id: 2, id_kode_indikator: 2, kode_indikator_kode_indikator: 'B', kode_indikator_nama_indikator: 'Indikator B',
      id_opds: Number.NaN, opds_nama_opd: '', jadwal_pemutakhiran: 'Tahunan', satuan: 'Unit', tahun: '2025', variabel: '7' },
  ] as unknown as Parameters<typeof transformSapaRecords>[0];

  const hasil = transformSapaRecords(rusak);
  assert.equal(hasil.observations.length, 0);
  assert.equal(hasil.skipped.length, 2);
});

test('transformSapaRecords: duplikat dicatat, nilai terakhir menang', () => {
  const base = {
    id_kode_indikator: 10, kode_indikator_kode_indikator: 'X', kode_indikator_nama_indikator: 'Indikator X',
    id_opds: 5, opds_nama_opd: 'Dinas Y', jadwal_pemutakhiran: 'Tahunan', satuan: 'Unit', tahun: '2025',
  };
  const rec = [
    { ...base, id: 1, variabel: '100' },
    { ...base, id: 2, variabel: '200' },
  ] as unknown as Parameters<typeof transformSapaRecords>[0];

  const hasil = transformSapaRecords(rec);
  assert.equal(hasil.observations.length, 1);
  assert.equal(hasil.observations[0].nilaiNumerik, 200);
  assert.ok(hasil.skipped.some((s) => s.alasan.includes('duplikat')));
});

// ─── R2: evaluator EWS ───

test('isBreached: keempat operator', () => {
  assert.equal(isBreached(10, 'GT', 5), true);
  assert.equal(isBreached(5, 'GT', 5), false);
  assert.equal(isBreached(5, 'GTE', 5), true);
  assert.equal(isBreached(3, 'LT', 5), true);
  assert.equal(isBreached(5, 'LT', 5), false);
  assert.equal(isBreached(5, 'LTE', 5), true);
});

const ambang = (over: Partial<ThresholdInput> = {}): ThresholdInput => ({
  id: 't1',
  indicatorId: 1,
  indicatorNama: 'Prevalensi Stunting',
  satuan: 'Persen',
  operator: 'GT',
  nilai: 20,
  severity: 'CRITICAL',
  pesan: null,
  isActive: true,
  ...over,
});

test('EWS: pelanggaran menghasilkan alert dengan pesan otomatis', () => {
  const r = evaluateThresholds(
    [ambang()],
    [{ indicatorId: 1, tahun: '2025', nilaiNumerik: 21.3 }],
    [],
  );
  assert.equal(r.toCreate.length, 1);
  assert.equal(r.toCreate[0].severity, 'CRITICAL');
  assert.equal(r.toCreate[0].nilaiAktual, 21.3);
  assert.match(r.toCreate[0].pesan, /Prevalensi Stunting \(2025\) melampaui/);
  assert.match(r.toCreate[0].pesan, /21,3 Persen/);
});

test('EWS: pesan kustom mengalahkan pesan otomatis', () => {
  const r = evaluateThresholds(
    [ambang({ pesan: 'Stunting di atas target RPJMD' })],
    [{ indicatorId: 1, tahun: '2025', nilaiNumerik: 25 }],
    [],
  );
  assert.equal(r.toCreate[0].pesan, 'Stunting di atas target RPJMD');
});

test('EWS: nilai di bawah ambang tidak menghasilkan alert', () => {
  const r = evaluateThresholds([ambang()], [{ indicatorId: 1, tahun: '2025', nilaiNumerik: 18 }], []);
  assert.deepEqual(r.toCreate, []);
});

test('EWS: observasi tanpa nilai numerik diabaikan', () => {
  const r = evaluateThresholds([ambang()], [{ indicatorId: 1, tahun: '2025', nilaiNumerik: null }], []);
  assert.deepEqual(r.toCreate, []);
});

test('EWS: tidak membanjiri — alert aktif yang sama tidak dibuat ulang', () => {
  const r = evaluateThresholds(
    [ambang()],
    [{ indicatorId: 1, tahun: '2025', nilaiNumerik: 25 }],
    [{ id: 'a1', thresholdId: 't1', tahun: '2025' }],
  );
  assert.deepEqual(r.toCreate, [], 'tidak boleh membuat alert duplikat');
  assert.deepEqual(r.toResolve, [], 'alert masih relevan, jangan diselesaikan');
});

test('EWS: alert diselesaikan saat kondisi membaik', () => {
  const r = evaluateThresholds(
    [ambang()],
    [{ indicatorId: 1, tahun: '2025', nilaiNumerik: 15 }],
    [{ id: 'a1', thresholdId: 't1', tahun: '2025' }],
  );
  assert.deepEqual(r.toCreate, []);
  assert.deepEqual(r.toResolve, ['a1']);
});

test('EWS: menonaktifkan ambang ikut menyelesaikan alertnya', () => {
  const r = evaluateThresholds(
    [ambang({ isActive: false })],
    [{ indicatorId: 1, tahun: '2025', nilaiNumerik: 99 }],
    [{ id: 'a1', thresholdId: 't1', tahun: '2025' }],
  );
  assert.deepEqual(r.toCreate, []);
  assert.deepEqual(r.toResolve, ['a1']);
});

test('EWS: tahun berbeda ditangani sebagai alert terpisah', () => {
  const r = evaluateThresholds(
    [ambang()],
    [
      { indicatorId: 1, tahun: '2024', nilaiNumerik: 24 },
      { indicatorId: 1, tahun: '2025', nilaiNumerik: 25 },
    ],
    [{ id: 'a1', thresholdId: 't1', tahun: '2024' }],
  );
  assert.equal(r.toCreate.length, 1);
  assert.equal(r.toCreate[0].tahun, '2025');
  assert.deepEqual(r.toResolve, []);
});

test('EWS: observasi tanpa tahun (null) tetap tertangani', () => {
  const r = evaluateThresholds([ambang()], [{ indicatorId: 1, tahun: null, nilaiNumerik: 30 }], []);
  assert.equal(r.toCreate.length, 1);
  assert.equal(r.toCreate[0].tahun, null);
  assert.ok(!r.toCreate[0].pesan.includes('()'), 'pesan tidak boleh memuat tanda kurung kosong');
});

test('EWS: ambang LT untuk indikator yang buruk bila turun', () => {
  const r = evaluateThresholds(
    [ambang({ id: 't2', indicatorNama: 'Cakupan Imunisasi', operator: 'LT', nilai: 90, severity: 'WARNING' })],
    [{ indicatorId: 1, tahun: '2024', nilaiNumerik: 88.4 }],
    [],
  );
  assert.equal(r.toCreate.length, 1);
  assert.match(r.toCreate[0].pesan, /turun di bawah/);
});

test('buildPesan: tanpa satuan tidak meninggalkan spasi ganda', () => {
  const p = buildPesan(ambang({ satuan: null }), 25, null);
  assert.ok(!p.includes('  '), `pesan mengandung spasi ganda: ${p}`);
});
