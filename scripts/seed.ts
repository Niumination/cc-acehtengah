// ─── Seed ambang batas Early Warning System (R2) ───
//
// Jalankan SETELAH sinkronisasi pertama, karena ambang merujuk indikator yang
// baru ada di gudang data setelah sync:
//
//   1. curl -X POST "$BASE/api/cron/sync-sapa" -H "Authorization: Bearer $CRON_SECRET"
//   2. node --import ./scripts/ts-alias-loader.mjs \
//        --experimental-strip-types scripts/seed.ts
//
// Skrip ini idempoten: dijalankan berulang tidak menduplikasi ambang.
//
// CATATAN PENTING soal angka ambang di bawah:
// Nilai-nilai ini adalah TITIK AWAL yang harus divalidasi Diskominfo bersama
// OPD terkait dan disesuaikan dengan target RPJMD/RKPD Kabupaten Aceh Tengah.
// Angka ini SENGAJA tidak diklaim sebagai target resmi.
//
// Skrip lama men-seed Skpd/Dataset dengan nama OPD karangan (BPKD, DINPU,
// Bappeda) yang tidak pernah cocok dengan nama OPD di SAPA — lihat
// LAPORAN_AUDIT_PRODUCTION_READINESS.md §P3-09. Model-model itu sudah dihapus.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Operator = 'GT' | 'GTE' | 'LT' | 'LTE';
type Severity = 'INFO' | 'WARNING' | 'CRITICAL';

interface AmbangUsulan {
  /** Dicocokkan case-insensitive terhadap nama indikator di gudang data. */
  cocokNama: string;
  operator: Operator;
  nilai: number;
  severity: Severity;
  pesan?: string;
  catatan: string;
}

const USULAN: AmbangUsulan[] = [
  {
    cocokNama: 'prevalensi stunting',
    operator: 'GT',
    nilai: 14,
    severity: 'CRITICAL',
    pesan: 'Prevalensi stunting melampaui target nasional 14%.',
    catatan: 'Target RPJMN 2024: 14%. Sesuaikan bila RPJMD menetapkan angka lain.',
  },
  {
    cocokNama: 'persentase penduduk miskin',
    operator: 'GT',
    nilai: 14,
    severity: 'WARNING',
    catatan: 'Perlu disepakati dengan Bappeda mengacu target penurunan kemiskinan daerah.',
  },
  {
    cocokNama: 'cakupan imunisasi',
    operator: 'LT',
    nilai: 95,
    severity: 'WARNING',
    pesan: 'Cakupan imunisasi dasar lengkap di bawah target 95%.',
    catatan: 'Standar Pelayanan Minimal bidang kesehatan.',
  },
  {
    cocokNama: 'angka kematian ibu',
    operator: 'GT',
    nilai: 0,
    severity: 'CRITICAL',
    pesan: 'Terdapat kasus kematian ibu — perlu penelusuran segera.',
    catatan: 'Ambang nol: setiap kasus wajib ditindaklanjuti.',
  },
  {
    cocokNama: 'persentase serapan anggaran',
    operator: 'LT',
    nilai: 85,
    severity: 'WARNING',
    pesan: 'Serapan anggaran di bawah 85% — risiko SILPA tinggi.',
    catatan: 'Sesuaikan ambang menurut triwulan berjalan.',
  },
  {
    cocokNama: 'angka partisipasi murni smp',
    operator: 'LT',
    nilai: 90,
    severity: 'WARNING',
    catatan: 'Indikator akses pendidikan dasar.',
  },
];

async function main() {
  console.log('🌱 Menyemai ambang batas EWS…\n');

  const indikator = await prisma.sapaIndicator.findMany({
    select: { id: true, nama: true, satuan: true },
  });

  if (indikator.length === 0) {
    console.error('❌ Gudang data kosong. Jalankan sinkronisasi SAPA lebih dulu:');
    console.error('   curl -X POST "$BASE/api/cron/sync-sapa" -H "Authorization: Bearer $CRON_SECRET"');
    process.exitCode = 1;
    return;
  }

  let dibuat = 0;
  let diperbarui = 0;
  const tidakCocok: string[] = [];

  for (const u of USULAN) {
    const target = indikator.filter((i) => i.nama.toLowerCase().includes(u.cocokNama));

    if (target.length === 0) {
      tidakCocok.push(u.cocokNama);
      continue;
    }

    for (const ind of target) {
      const existing = await prisma.indicatorThreshold.findFirst({
        where: { indicatorId: ind.id, operator: u.operator, nilai: u.nilai },
        select: { id: true },
      });

      if (existing) {
        await prisma.indicatorThreshold.update({
          where: { id: existing.id },
          data: { severity: u.severity, pesan: u.pesan ?? null, isActive: true },
        });
        diperbarui += 1;
        console.log(`  ~ diperbarui  [${ind.id}] ${ind.nama} ${u.operator} ${u.nilai}`);
      } else {
        await prisma.indicatorThreshold.create({
          data: {
            indicatorId: ind.id,
            operator: u.operator,
            nilai: u.nilai,
            severity: u.severity,
            pesan: u.pesan ?? null,
          },
        });
        dibuat += 1;
        console.log(`  + dibuat      [${ind.id}] ${ind.nama} ${u.operator} ${u.nilai} (${u.severity})`);
      }
    }
  }

  console.log(`\n✅ Selesai: ${dibuat} ambang dibuat, ${diperbarui} diperbarui.`);

  if (tidakCocok.length > 0) {
    console.log('\n⚠️  Tidak ada indikator yang cocok untuk pola berikut:');
    for (const p of tidakCocok) console.log(`   - "${p}"`);
    console.log('   Nama indikator SAPA mungkin berbeda. Periksa lewat:');
    console.log('   GET /api/datasets?search=<kata kunci>');
  }

  console.log('\n📌 Angka ambang di atas adalah TITIK AWAL. Validasikan bersama OPD');
  console.log('   terkait dan selaraskan dengan target RPJMD/RKPD sebelum dipakai resmi.');
}

main()
  .catch((e) => {
    console.error('❌ Gagal menyemai:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
