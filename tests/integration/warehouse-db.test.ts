// ─── Uji integrasi gudang data + EWS terhadap PostgreSQL sungguhan ───
//
// Menjalankan migrasi 003 pada instans PostgreSQL asli (PGlite, WASM) lalu
// memverifikasi perilaku yang TIDAK dapat dibuktikan oleh tes fungsi murni:
// batasan UNIQUE, indeks unik parsial, kunci asing, dan sifat idempoten upsert.
//
// PGlite tidak dijadikan dependency tetap karena berukuran besar. Pasang
// sesuai kebutuhan:
//
//   npm i -D @electric-sql/pglite
//   npm run test:db
//
// Tanpa PGlite terpasang, seluruh tes di berkas ini dilewati (skip), bukan gagal.

import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { transformSapaRecords } from '../../src/lib/sapa-transform.ts';
import { evaluateThresholds } from '../../src/lib/ews-evaluator.ts';
import { buildMockSapaRecords } from '../../src/lib/data-source.ts';

const MIGRATION = 'supabase/migrations/003_sapa_warehouse_ews.sql';

let PGlite: typeof import('@electric-sql/pglite').PGlite | null = null;
try {
  ({ PGlite } = await import('@electric-sql/pglite'));
} catch {
  // Tidak terpasang — tes dilewati.
}

describe('integrasi gudang data & EWS (PostgreSQL nyata)', { skip: !PGlite }, () => {
  let db: InstanceType<NonNullable<typeof PGlite>>;

  before(async () => {
    db = await new PGlite!();
    // ChatSession dibuat migrasi 001 pada basis data nyata.
    await db.exec(`
      CREATE TABLE IF NOT EXISTS "ChatSession" (
        "id" TEXT PRIMARY KEY,
        "query" TEXT NOT NULL,
        "intent" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await db.exec(readFileSync(MIGRATION, 'utf8'));
  });

  after(async () => {
    await db?.close();
  });

  test('migrasi membuat seluruh tabel gudang data', async () => {
    const r = await db.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema='public'`,
    );
    const tabel = r.rows.map((x) => x.table_name);
    for (const t of [
      'SapaOpd',
      'SapaIndicator',
      'SapaObservation',
      'SapaSyncRun',
      'IndicatorThreshold',
      'EwsAlert',
    ]) {
      assert.ok(tabel.includes(t), `tabel hilang: ${t}`);
    }
  });

  test('data mock SAPA masuk ke gudang data', async () => {
    const { opds, indicators, observations } = transformSapaRecords(buildMockSapaRecords());

    for (const o of opds) {
      await db.query(
        `INSERT INTO "SapaOpd"(id,nama) VALUES ($1,$2)
         ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama`,
        [o.id, o.nama],
      );
    }
    for (const i of indicators) {
      await db.query(
        `INSERT INTO "SapaIndicator"(id,kode,nama,satuan) VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET nama = EXCLUDED.nama, satuan = EXCLUDED.satuan`,
        [i.id, i.kode, i.nama, i.satuan],
      );
    }
    for (const [n, o] of observations.entries()) {
      await db.query(
        `INSERT INTO "SapaObservation"(id,"indicatorId","opdId",tahun,"nilaiTeks","nilaiNumerik",satuan,jadwal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT ("indicatorId","opdId",tahun)
         DO UPDATE SET "nilaiTeks" = EXCLUDED."nilaiTeks", "nilaiNumerik" = EXCLUDED."nilaiNumerik"`,
        [`obs-${n}`, o.indicatorId, o.opdId, o.tahun, o.nilaiTeks, o.nilaiNumerik, o.satuan, o.jadwal],
      );
    }

    const c = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "SapaObservation"`);
    assert.equal(c.rows[0].n, observations.length);
  });

  test('upsert bersifat idempoten — sinkronisasi ulang tidak menduplikasi', async () => {
    const sebelum = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "SapaObservation"`);
    const { observations } = transformSapaRecords(buildMockSapaRecords());

    for (const [n, o] of observations.entries()) {
      await db.query(
        `INSERT INTO "SapaObservation"(id,"indicatorId","opdId",tahun,"nilaiTeks","nilaiNumerik",satuan,jadwal)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT ("indicatorId","opdId",tahun)
         DO UPDATE SET "nilaiTeks" = EXCLUDED."nilaiTeks"`,
        [`obs-ulang-${n}`, o.indicatorId, o.opdId, o.tahun, o.nilaiTeks, o.nilaiNumerik, o.satuan, o.jadwal],
      );
    }

    const sesudah = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM "SapaObservation"`);
    assert.equal(sesudah.rows[0].n, sebelum.rows[0].n, 'jumlah baris tidak boleh bertambah');
  });

  test('tahun NULL tidak menghasilkan baris ganda (NULLS NOT DISTINCT)', async () => {
    const ind = await db.query<{ id: number }>(`SELECT id FROM "SapaIndicator" LIMIT 1`);
    const opd = await db.query<{ id: number }>(`SELECT id FROM "SapaOpd" LIMIT 1`);
    const args = [ind.rows[0].id, opd.rows[0].id];

    for (const id of ['null-a', 'null-b', 'null-c']) {
      await db.query(
        `INSERT INTO "SapaObservation"(id,"indicatorId","opdId",tahun,"nilaiTeks")
         VALUES ($1,$2,$3,NULL,'x')
         ON CONFLICT ("indicatorId","opdId",tahun) DO UPDATE SET "nilaiTeks" = EXCLUDED."nilaiTeks"`,
        [id, ...args],
      );
    }

    const c = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "SapaObservation"
       WHERE "indicatorId"=$1 AND "opdId"=$2 AND tahun IS NULL`,
      args,
    );
    assert.equal(c.rows[0].n, 1, 'UNIQUE biasa akan menghasilkan 3 baris — NULLS NOT DISTINCT wajib');
  });

  test('kunci asing menolak observasi untuk indikator yang tidak ada', async () => {
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO "SapaObservation"(id,"indicatorId","opdId","nilaiTeks")
           VALUES ('yatim', 999999, 1, '1')`,
        ),
      /foreign key|violates/i,
    );
  });

  test('pipeline EWS menghasilkan alert dari data nyata di basis data', async () => {
    const ind = await db.query<{ id: number; nama: string; satuan: string | null }>(
      `SELECT id,nama,satuan FROM "SapaIndicator" WHERE nama ILIKE '%Prevalensi Stunting%' LIMIT 1`,
    );
    assert.equal(ind.rows.length, 1, 'indikator uji harus ada di data mock');
    const indicator = ind.rows[0];

    await db.query(
      `INSERT INTO "IndicatorThreshold"(id,"indicatorId",operator,nilai,severity)
       VALUES ('th-1',$1,'GT',14,'CRITICAL')`,
      [indicator.id],
    );

    const obs = await db.query<{ indicatorId: number; tahun: string | null; nilaiNumerik: number | null }>(
      `SELECT "indicatorId","tahun","nilaiNumerik" FROM "SapaObservation" WHERE "indicatorId"=$1`,
      [indicator.id],
    );

    const { toCreate } = evaluateThresholds(
      [
        {
          id: 'th-1',
          indicatorId: indicator.id,
          indicatorNama: indicator.nama,
          satuan: indicator.satuan,
          operator: 'GT',
          nilai: 14,
          severity: 'CRITICAL',
          pesan: null,
          isActive: true,
        },
      ],
      obs.rows,
      [],
    );

    assert.equal(toCreate.length, 1, 'stunting 21,3% harus melanggar ambang 14%');

    for (const [n, a] of toCreate.entries()) {
      await db.query(
        `INSERT INTO "EwsAlert"(id,"thresholdId","indicatorId","nilaiAktual",batas,pesan,severity,tahun)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [`al-${n}`, a.thresholdId, a.indicatorId, a.nilaiAktual, a.batas, a.pesan, a.severity, a.tahun],
      );
    }

    const aktif = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "EwsAlert" WHERE "resolvedAt" IS NULL`,
    );
    assert.equal(aktif.rows[0].n, 1);
  });

  test('indeks unik parsial mencegah alert aktif ganda', async () => {
    await assert.rejects(
      () =>
        db.query(
          `INSERT INTO "EwsAlert"(id,"thresholdId","indicatorId","nilaiAktual",batas,pesan,severity,tahun)
           SELECT 'al-dup',"thresholdId","indicatorId","nilaiAktual",batas,pesan,severity,tahun
           FROM "EwsAlert" WHERE id='al-0'`,
        ),
      /duplicate key|unique/i,
      'alert aktif kedua untuk (ambang, tahun) yang sama harus ditolak',
    );
  });

  test('setelah alert diselesaikan, alert baru boleh dibuat lagi', async () => {
    await db.query(`UPDATE "EwsAlert" SET "resolvedAt" = now() WHERE id='al-0'`);
    await db.query(
      `INSERT INTO "EwsAlert"(id,"thresholdId","indicatorId","nilaiAktual",batas,pesan,severity,tahun)
       SELECT 'al-baru',"thresholdId","indicatorId","nilaiAktual",batas,pesan,severity,tahun
       FROM "EwsAlert" WHERE id='al-0'`,
    );
    const c = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM "EwsAlert" WHERE "resolvedAt" IS NULL`,
    );
    assert.equal(c.rows[0].n, 1);
  });

  test('menghapus indikator ikut menghapus observasi, ambang, dan alert (CASCADE)', async () => {
    const ind = await db.query<{ id: number }>(
      `SELECT id FROM "SapaIndicator" WHERE nama ILIKE '%Prevalensi Stunting%' LIMIT 1`,
    );
    await db.query(`DELETE FROM "SapaIndicator" WHERE id=$1`, [ind.rows[0].id]);

    for (const [tabel, kolom] of [
      ['SapaObservation', 'indicatorId'],
      ['IndicatorThreshold', 'indicatorId'],
      ['EwsAlert', 'indicatorId'],
    ] as const) {
      const c = await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM "${tabel}" WHERE "${kolom}"=$1`,
        [ind.rows[0].id],
      );
      assert.equal(c.rows[0].n, 0, `${tabel} harus ikut terhapus`);
    }
  });
});
