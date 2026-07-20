import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { processAIQuery } from '@/services/ai-orchestrator';
import { getMockQueryResponse } from '@/lib/mock-data';

const QuerySchema = z.object({
  query: z.string().min(3).max(2000),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = QuerySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Query tidak valid', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    if (process.env.USE_MOCK_DATA === 'true') {
      return NextResponse.json(getMockQueryResponse(parsed.data.query));
    }
    const result = await processAIQuery(parsed.data.query);
    return NextResponse.json(result);
  } catch (err) {
    console.error('AI Query failed:', err);
    return NextResponse.json(
      { error: 'Gagal memproses pertanyaan. Coba lagi.' },
      { status: 500 },
    );
  }
}
