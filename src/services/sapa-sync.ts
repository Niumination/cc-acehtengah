// ─── Sinkronisasi SAPA → gudang data (R1) ───
//
// Menggantikan `data-sync.ts` lama yang menyimpan SELURUH larik SAPA sebagai
// satu blob JSON di DatasetRecord — tidak bisa di-query, tidak bisa di-index,
// dan membengkak setiap sinkronisasi.
// Lihat LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-10
//
// Seluruh aturan penguraian ada di `src/lib/sapa-transform.ts` (murni & teruji);
// berkas ini hanya lapisan penulisan ke database.

import { prisma } from '@/lib/prisma';
import { getSapaRecords } from '@/lib/data-source';
import { transformSapaRecords } from '@/lib/sapa-transform';
import { evaluateAndPersistAlerts } from '@/services/ews';

/** Jumlah baris per operasi tulis — menjaga ukuran transaksi tetap wajar. */
const BATCH_SIZE = 200;

/**
 * Jumlah query Prisma serentak. Supabase pooler (pgbouncer transaction mode)
 * membatasi koneksi; membuka 200 query serentak lewat Promise.all membuat
 * Prisma kehabisan slot pool (`Timed out fetching a new connection`).
 * Concurrency kecil menjaga throughput tanpa membebani pool.
 */
const WRITE_CONCURRENCY = 5;

export interface SyncSummary {
  runId: string;
  recordCount: number;
  opdCount: number;
  indicatorCount: number;
  alertsCreated: number;
  alertsResolved: number;
  durationMs: number;
  skipped: { alasan: string; jumlah: number }[];
}

function chunk<T>(items: T[], size: number): T[][] {
  const hasil: T[][] = [];
  for (let i = 0; i < items.length; i += size) hasil.push(items.slice(i, i + size));
  return hasil;
}

/**
 * Jalankan `fn` atas semua `items` dengan maksimal `limit` pekerjaan serentak.
 * Pengganti `Promise.all(items.map(fn))` untuk lingkungan pooler yang membatasi
 * koneksi. Urutan hasil tidak dijamin — aman untuk upsert independen.
 */
async function mapLimit<T>(items: T[], limit: number, fn: (item: T) => Promise<unknown>): Promise<void> {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length > 0) {
      const item = queue.shift() as T;
      await fn(item);
    }
  });
  await Promise.all(workers);
}

/**
 * Tarik data SAPA, simpan ke gudang data, lalu jalankan evaluasi EWS.
 *
 * Sifat penting:
 *   • Upsert, bukan insert — dijalankan berulang tidak menduplikasi data.
 *   • Setiap eksekusi tercatat di SapaSyncRun (audit & pemantauan).
 *   • Kegagalan dicatat pada baris run yang sama, lalu dilempar ulang agar
 *     pemanggil (cron) menerima status non-2xx.
 */
export async function syncSapaToWarehouse(): Promise<SyncSummary> {
  const mulai = Date.now();

  const run = await prisma.sapaSyncRun.create({
    data: { status: 'RUNNING' },
    select: { id: true },
  });

  try {
    const records = await getSapaRecords();
    const { opds, indicators, observations, skipped } = transformSapaRecords(records);

    // 1. OPD dan indikator lebih dulu — observasi merujuk keduanya.
    for (const batch of chunk(opds, BATCH_SIZE)) {
      await mapLimit(batch, WRITE_CONCURRENCY, (o) =>
        prisma.sapaOpd.upsert({
          where: { id: o.id },
          create: { id: o.id, nama: o.nama },
          update: { nama: o.nama },
        }),
      );
    }

    for (const batch of chunk(indicators, BATCH_SIZE)) {
      await mapLimit(batch, WRITE_CONCURRENCY, (i) =>
        prisma.sapaIndicator.upsert({
          where: { id: i.id },
          create: { id: i.id, kode: i.kode, nama: i.nama, satuan: i.satuan },
          update: { kode: i.kode, nama: i.nama, satuan: i.satuan },
        }),
      );
    }

    // 2. Observasi — kunci upsert (indicatorId, opdId, tahun).
    for (const batch of chunk(observations, BATCH_SIZE)) {
      await mapLimit(batch, WRITE_CONCURRENCY, (o) =>
        prisma.sapaObservation.upsert({
          where: {
            indicatorId_opdId_tahun: {
              indicatorId: o.indicatorId,
              opdId: o.opdId,
              // DB memakai NULLS NOT DISTINCT (migrasi 003) sehingga NULL sah
              // dalam kunci unik (indicatorId, opdId, tahun). Prisma 6.19.3
              // belum mendukung NULLS NOT DISTINCT, jadi tipe compound-unique
              // digenerasikan sebagai `tahun: string` (non-null). Runtime aman:
              // upsert menghasilkan ON CONFLICT yang menghormati NULLS NOT
              // DISTINCT di level DB. Cast hanya untuk lolos typecheck.
              tahun: o.tahun as string,
            },
          },
          create: o,
          update: {
            nilaiTeks: o.nilaiTeks,
            nilaiNumerik: o.nilaiNumerik,
            satuan: o.satuan,
            jadwal: o.jadwal,
          },
        }),
      );
    }

    // 3. Evaluasi EWS memakai data yang baru saja disimpan.
    const ews = await evaluateAndPersistAlerts();

    const durationMs = Date.now() - mulai;

    await prisma.sapaSyncRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        finishedAt: new Date(),
        recordCount: observations.length,
        opdCount: opds.length,
        indicatorCount: indicators.length,
        alertsCreated: ews.created,
        durationMs,
      },
    });

    if (skipped.length > 0) {
      console.warn('[sync] Baris dilewati:', skipped);
    }

    return {
      runId: run.id,
      recordCount: observations.length,
      opdCount: opds.length,
      indicatorCount: indicators.length,
      alertsCreated: ews.created,
      alertsResolved: ews.resolved,
      durationMs,
      skipped,
    };
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    await prisma.sapaSyncRun
      .update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          durationMs: Date.now() - mulai,
          error: pesan.slice(0, 500),
        },
      })
      .catch(() => {
        // Basis data mungkin memang sedang tidak terjangkau — jangan menutupi
        // error aslinya dengan error sekunder.
      });
    throw err;
  }
}
