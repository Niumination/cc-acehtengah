// Tes regresi untuk data wilayah + agregasi SAPA.
// Jalankan: npm test   (node --test, tanpa dependency tambahan)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  KECAMATAN_ACEH_TENGAH,
  JUMLAH_KECAMATAN,
} from '../src/lib/aceh-tengah.ts';
import { buildMockSapaRecords } from '../src/lib/data-source.ts';
import {
  getUniqueOpd,
  getUniqueIndicators,
  aggregateByIndicator,
  normalizeText,
  tokenizeQuery,
  filterByOpd,
} from '../src/lib/sapa-client.ts';

// ─── Data wilayah (§P1-03) ───

test('jumlah kecamatan tepat 14', () => {
  assert.equal(KECAMATAN_ACEH_TENGAH.length, JUMLAH_KECAMATAN);
});

test('nama kecamatan sesuai daftar resmi Kabupaten Aceh Tengah', () => {
  const resmi = [
    'Atu Lintang', 'Bebesen', 'Bies', 'Bintang', 'Celala', 'Jagong Jeget',
    'Kebayakan', 'Ketol', 'Kute Panang', 'Laut Tawar', 'Linge', 'Pegasing',
    'Rusip Antara', 'Silih Nara',
  ];
  assert.deepEqual([...KECAMATAN_ACEH_TENGAH.map((k) => k.nama)].sort(), [...resmi].sort());
});

test('tidak memuat wilayah kabupaten lain yang pernah salah masuk', () => {
  const bukanAcehTengah = ['Banda Mulia', 'Burni Telong', 'Permata', 'Bies Penjara'];
  const nama = new Set(KECAMATAN_ACEH_TENGAH.map((k) => k.nama));
  for (const salah of bukanAcehTengah) {
    assert.equal(nama.has(salah), false, `${salah} bukan kecamatan Aceh Tengah`);
  }
});

test('koordinat berada dalam bounding box Kabupaten Aceh Tengah', () => {
  for (const k of KECAMATAN_ACEH_TENGAH) {
    assert.ok(k.lat > 4.2 && k.lat < 5.0, `lat ${k.nama} di luar wilayah: ${k.lat}`);
    assert.ok(k.lng > 96.3 && k.lng < 97.4, `lng ${k.nama} di luar wilayah: ${k.lng}`);
  }
});

test('setiap kecamatan punya rujukan sumber (Wikidata QID)', () => {
  for (const k of KECAMATAN_ACEH_TENGAH) {
    assert.match(k.wikidataId, /^Q\d+$/, `QID tidak valid untuk ${k.nama}`);
  }
});

// ─── Kontrak mock ⇄ live (§P1-04) ───

test('mock SapaRecord memiliki seluruh field yang dipakai agregasi', () => {
  const records = buildMockSapaRecords();
  assert.ok(records.length > 0);
  for (const r of records) {
    assert.equal(typeof r.id, 'number');
    assert.equal(typeof r.id_kode_indikator, 'number');
    assert.equal(typeof r.id_opds, 'number');
    assert.equal(typeof r.opds_nama_opd, 'string');
    assert.equal(typeof r.satuan, 'string');
    assert.equal(typeof r.variabel, 'string');
    assert.equal(typeof r.jadwal_pemutakhiran, 'string');
    assert.ok(r.tahun === null || typeof r.tahun === 'string');
  }
});

test('agregasi berjalan atas data mock tanpa cabang khusus', () => {
  const records = buildMockSapaRecords();
  assert.ok(getUniqueOpd(records).length >= 10);
  assert.ok(getUniqueIndicators(records).length >= 30);
  assert.ok(aggregateByIndicator(records).length > 0);
});

test('id indikator unik dan terekspos untuk join (§P1-05a)', () => {
  const indicators = getUniqueIndicators(buildMockSapaRecords());
  const ids = indicators.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length, 'id indikator harus unik');
  assert.ok(ids.every((id) => typeof id === 'number'));
});

// ─── Helper pencarian ───

test('normalizeText membersihkan tanda baca dan spasi ganda', () => {
  assert.equal(normalizeText('  Dinas   Kesehatan, (Aceh)  '), 'dinas kesehatan aceh');
  assert.equal(normalizeText(null), '');
});

test('tokenizeQuery membuang stopword dan token pendek', () => {
  const tokens = tokenizeQuery('berapa jumlah balita stunting di aceh tengah');
  assert.ok(tokens.includes('balita'));
  assert.ok(tokens.includes('stunting'));
  assert.ok(!tokens.includes('berapa'));
  assert.ok(!tokens.includes('di'));
});

test('filterByOpd mencocokkan seluruh token nama OPD', () => {
  const records = buildMockSapaRecords();
  const hasil = filterByOpd(records, 'Dinas Kesehatan');
  assert.ok(hasil.length > 0);
  assert.ok(hasil.every((r) => r.opds_nama_opd === 'Dinas Kesehatan'));
});
