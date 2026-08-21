// ─── GET /api/chat-logs — Riwayat kueri AI (butuh sesi admin) ───
//
// Perbaikan Sprint 2 (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P2-12, §P1-12):
//   • `parseInt('xyz')` menghasilkan NaN yang diteruskan sebagai `take`/`skip`
//     ke Prisma → error validasi. Kini seluruh query string divalidasi Zod.
//   • Tanggal tidak valid (`new Date('bukan-tanggal')`) juga ditolak lebih awal.
//   • Tipe `any` pada klausa `where` diganti tipe eksplisit.
//   • Verifikasi sesi diulang di route (defense in depth), tidak hanya di proxy.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_LIMIT = 200;

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).catch(50),
  offset: z.coerce.number().int().min(0).max(100_000).catch(0),
  intent: z.string().trim().max(50).optional(),
  search: z.string().trim().max(200).optional(),
  from: z.coerce.date().optional().catch(undefined),
  to: z.coerce.date().optional().catch(undefined),
});

interface ChatLogWhere {
  intent?: string;
  query?: { contains: string; mode: 'insensitive' };
  createdAt?: { gte?: Date; lte?: Date };
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const session = token ? await verifyToken(token) : null;
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const parsed = QuerySchema.parse({
    limit: url.searchParams.get('limit') ?? undefined,
    offset: url.searchParams.get('offset') ?? undefined,
    intent: url.searchParams.get('intent') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    from: url.searchParams.get('from') ?? undefined,
    to: url.searchParams.get('to') ?? undefined,
  });

  const where: ChatLogWhere = {};
  if (parsed.intent && parsed.intent !== 'all') where.intent = parsed.intent;
  if (parsed.search) where.query = { contains: parsed.search, mode: 'insensitive' };
  if (parsed.from || parsed.to) {
    where.createdAt = {};
    if (parsed.from) where.createdAt.gte = parsed.from;
    if (parsed.to) where.createdAt.lte = parsed.to;
  }

  try {
    const [logs, total, grouped] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parsed.limit,
        skip: parsed.offset,
      }),
      prisma.chatSession.count({ where }),
      prisma.chatSession.groupBy({ by: ['intent'], _count: true }),
    ]);

    const stats = (grouped as { intent: string | null; _count: number }[]).map((row) => ({
      intent: row.intent,
      count: row._count,
    }));

    return NextResponse.json({
      logs,
      total,
      limit: parsed.limit,
      offset: parsed.offset,
      stats,
    });
  } catch (err) {
    console.error('[chat-logs] Error:', err);
    return NextResponse.json(
      { error: 'Gagal mengambil riwayat kueri', errorCode: 'DB_UNAVAILABLE' },
      { status: 503 },
    );
  }
}
