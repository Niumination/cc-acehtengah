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
        { severity: 'asc' }, // CRITICAL first (A→Z sort on enum name)
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ alerts });
  } catch (err) {
    console.error('Failed to fetch EWS alerts:', err);
    return NextResponse.json({ alerts: [] });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  // Resolve alert
  try {
    await prisma.ewsAlert.update({
      where: { id: params.id },
      data: { resolvedAt: new Date() },
    });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }
}
