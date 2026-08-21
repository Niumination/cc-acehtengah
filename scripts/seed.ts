// ─── Seed Data — SKPD + Dataset awal untuk demo ───

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SKPD_LIST = [
  { kode: 'DINKES', nama: 'Dinas Kesehatan', kategori: 'DINAS' as const },
  { kode: 'DINDIK', nama: 'Dinas Pendidikan', kategori: 'DINAS' as const },
  { kode: 'DINSOS', nama: 'Dinas Sosial', kategori: 'DINAS' as const },
  { kode: 'BAPPEDA', nama: 'Bappeda', kategori: 'BADAN' as const },
  { kode: 'BPKD', nama: 'BPKD', kategori: 'BADAN' as const },
  { kode: 'SETDA', nama: 'Sekretariat Daerah', kategori: 'SEKRETARIAT' as const },
  { kode: 'DINPERTAN', nama: 'Dinas Pertanian', kategori: 'DINAS' as const },
  { kode: 'DINPU', nama: 'Dinas PU', kategori: 'DINAS' as const },
];

const DATASET_LIST = [
  { slug: 'stunting', nama: 'Data Stunting', skpdKode: 'DINKES', endpoint: 'sapa/dataset/stunting' },
  { slug: 'kemiskinan', nama: 'Data Kemiskinan', skpdKode: 'DINSOS', endpoint: 'sapa/dataset/kemiskinan' },
  { slug: 'inflasi', nama: 'Inflasi Pangan', skpdKode: 'DINPERTAN', endpoint: 'sapa/dataset/inflasi-pangan' },
  { slug: 'anggaran', nama: 'Realisasi Anggaran', skpdKode: 'BPKD', endpoint: 'sapa/dataset/realisasi-anggaran' },
  { slug: 'kepegawaian', nama: 'Data Kepegawaian', skpdKode: 'SETDA', endpoint: 'sapa/dataset/kepegawaian' },
  { slug: 'bansos', nama: 'Bantuan Sosial', skpdKode: 'DINSOS', endpoint: 'sapa/dataset/bantuan-sosial' },
  { slug: 'pendidikan', nama: 'Data Pendidikan', skpdKode: 'DINDIK', endpoint: 'sapa/dataset/pendidikan' },
  { slug: 'kesehatan', nama: 'Data Kesehatan', skpdKode: 'DINKES', endpoint: 'sapa/dataset/kesehatan' },
];

async function main() {
  console.log('🌱 Seeding database...');

  // Seed SKPD
  for (const skpd of SKPD_LIST) {
    await prisma.skpd.upsert({
      where: { kode: skpd.kode },
      update: {},
      create: skpd,
    });
  }
  console.log(`✅ ${SKPD_LIST.length} SKPD created`);

  // Seed Dataset
  for (const ds of DATASET_LIST) {
    const skpd = await prisma.skpd.findUnique({ where: { kode: ds.skpdKode } });
    if (!skpd) {
      console.warn(`⚠️ SKPD ${ds.skpdKode} not found, skipping ${ds.slug}`);
      continue;
    }

    await prisma.dataset.upsert({
      where: { slug: ds.slug },
      update: {},
      create: {
        slug: ds.slug,
        nama: ds.nama,
        skpdId: skpd.id,
        endpointSplp: ds.endpoint,
        schema: { type: 'object' },
        isActive: true,
      },
    });
  }
  console.log(`✅ ${DATASET_LIST.length} Dataset created`);
  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
