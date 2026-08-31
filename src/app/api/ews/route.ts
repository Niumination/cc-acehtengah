import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const [alerts, snapshotCount] = await Promise.all([
      prisma.ewsAlert.findMany({
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
        take: 100,
      }),
      prisma.sapaSnapshot.count(),
    ]);

    return NextResponse.json({ alerts, ready: snapshotCount > 0 });
  } catch (err) {
    console.error('Failed to fetch EWS alerts:', err);
    // WP0.6: jangan bohong "semua normal" — beri tahu klien warehouse belum siap.
    return NextResponse.json({ alerts: [], ready: false });
  }
}