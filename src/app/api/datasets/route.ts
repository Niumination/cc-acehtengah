import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const datasets = await prisma.dataset.findMany({
      select: {
        slug: true,
        nama: true,
        deskripsi: true,
        isActive: true,
        lastSync: true,
        skpd: { select: { nama: true } },
        _count: { select: { records: true } },
      },
      orderBy: { nama: 'asc' },
    });

    return NextResponse.json({ datasets });
  } catch (err) {
    console.error('Failed to fetch datasets:', err);
    return NextResponse.json({ datasets: [] });
  }
}
