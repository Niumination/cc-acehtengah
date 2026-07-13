import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const dataset = await prisma.dataset.findUnique({
      where: { slug: params.slug },
      include: {
        records: { orderBy: { fetchedAt: 'desc' }, take: 1 },
        indicators: true,
        skpd: { select: { nama: true, kode: true } },
      },
    });

    if (!dataset) {
      return NextResponse.json({ error: 'Dataset not found' }, { status: 404 });
    }

    return NextResponse.json({
      nama: dataset.nama,
      deskripsi: dataset.deskripsi,
      skpd: dataset.skpd,
      lastSync: dataset.lastSync,
      data: dataset.records[0]?.data ?? null,
      periode: dataset.records[0]?.periode ?? null,
      indicators: dataset.indicators,
    });
  } catch (err) {
    console.error('Failed to fetch dataset:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
