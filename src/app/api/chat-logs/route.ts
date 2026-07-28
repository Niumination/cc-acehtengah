// ─── GET /api/chat-logs — Riwayat AI Query — ───

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const intent = url.searchParams.get('intent'); // filter by intent category
    const search = url.searchParams.get('search'); // search query text
    const from = url.searchParams.get('from');     // ISO date filter
    const to = url.searchParams.get('to');

    // Build where clause
    const where: any = {};

    if (intent && intent !== 'all') {
      where.intent = intent;
    }

    if (search) {
      where.query = { contains: search, mode: 'insensitive' };
    }

    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [logs, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.chatSession.count({ where }),
    ]);

    // Hitung statistik ringkasan
    const stats = await prisma.chatSession.groupBy({
      by: ['intent'],
      _count: true,
    });

    return NextResponse.json({
      logs,
      total,
      limit,
      offset,
      stats: stats.map((s) => ({ intent: s.intent, count: s._count })),
    });
  } catch (err) {
    console.error('[chat-logs] Error:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil riwayat query' },
      { status: 500 },
    );
  }
}
