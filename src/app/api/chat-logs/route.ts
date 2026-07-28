// ─── GET /api/chat-logs — Riwayat AI Query — ───

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 200);
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const intent = url.searchParams.get('intent');
    const search = url.searchParams.get('search');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    const where: any = {};
    if (intent && intent !== 'all') where.intent = intent;
    if (search) where.query = { contains: search, mode: 'insensitive' };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    // Try querying directly — table should exist after manual SQL
    let logs: any[] = [];
    let total = 0;
    let stats: any[] = [];

    try {
      [logs, total] = await Promise.all([
        prisma.chatSession.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.chatSession.count({ where }),
      ]);
      stats = await prisma.chatSession.groupBy({ by: ['intent'], _count: true })
        .then((r) => r.map((s) => ({ intent: s.intent, count: s._count })));
    } catch (dbErr: any) {
      const msg = dbErr?.message || '';
      // If table doesn't exist, return empty gracefully
      if (msg.includes('does not exist') || msg.includes('ChatSession') || msg.includes('relation')) {
        return NextResponse.json({
          logs: [], total: 0, limit, offset, stats: [],
          _note: 'ChatSession table not found — run SQL migration in Supabase',
        });
      }
      throw dbErr;
    }

    return NextResponse.json({ logs, total, limit, offset, stats });
  } catch (err: any) {
    // Return detailed error for debugging
    const detail = { error: err?.message || 'Unknown', code: err?.code, stack: err?.stack?.split('\n').slice(0, 3) };
    console.error('[chat-logs] Error:', err);
    return NextResponse.json(detail, { status: 500 });
  }
}
// redeploy trigger
