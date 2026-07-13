import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const alerts = await prisma.ewsAlert.findMany({
      where: { resolvedAt: null },
      include: {
        indicator: {
          select: { nama: true, satuan: true, dataset: { select: { slug: true, nama: true } } },
        },
      },
      orderBy: [
        { severity: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ alerts });
  } catch (err) {
    console.error('Failed to fetch EWS alerts:', err);
    return NextResponse.json({ alerts: [] });
  }
}
