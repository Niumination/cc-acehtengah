import { NextRequest } from 'next/server';
import { z } from 'zod';
import { processAIQueryStreaming } from '@/services/ai-orchestrator';
import { getMockQueryResponse } from '@/lib/mock-data';
import { checkRateLimit, getClientIp, rateLimitHeaders } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Panggilan LLM streaming bisa berjalan lama; tanpa ini fungsi bisa terpotong
// timeout default platform di tengah stream.
export const maxDuration = 60;

// Endpoint ini memanggil provider LLM berbayar dan terbuka untuk publik,
// jadi wajib dibatasi. Lihat LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-05.
const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_PER_HOUR = 60;

const QuerySchema = z.object({
  query: z.string().trim().min(3).max(2000),
  sessionId: z.string().max(100).optional(),
});

function sse(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  const perMinute = checkRateLimit({
    key: `query:m:${ip}`,
    limit: RATE_LIMIT_PER_MINUTE,
    windowMs: 60 * 1000,
  });
  if (!perMinute.ok) {
    return Response.json(
      { error: 'Terlalu banyak pertanyaan. Tunggu sebentar lalu coba lagi.' },
      { status: 429, headers: rateLimitHeaders(perMinute) },
    );
  }

  const perHour = checkRateLimit({
    key: `query:h:${ip}`,
    limit: RATE_LIMIT_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (!perHour.ok) {
    return Response.json(
      { error: 'Kuota pertanyaan per jam tercapai. Silakan coba lagi nanti.' },
      { status: 429, headers: rateLimitHeaders(perHour) },
    );
  }

  // Body non-JSON sebelumnya melempar exception tak tertangkap → HTTP 500 body kosong.
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Body harus JSON yang valid.' }, { status: 400 });
  }

  const parsed = QuerySchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      { error: 'Query tidak valid', detail: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Mock mode — tetap response JSON biasa
  if (process.env.USE_MOCK_DATA === 'true') {
    return Response.json(getMockQueryResponse(parsed.data.query));
  }

  const { query } = parsed.data;

  // SSE streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sse(event, data)));
        } catch {
          // Client disconnected
        }
      };

      try {
        let narasiBuffer = '';
        const result = await processAIQueryStreaming(
          query,
          (status) => send('status', { status }),
          (delta) => {
            narasiBuffer += delta;
            // Kirim narasi progresif (parse dari partial JSON)
            const partial = extractNarasiPartialSafe(narasiBuffer);
            if (partial) send('narasi', { text: partial });
          },
        );
        send('result', result);
      } catch (err) {
        console.error('AI Query streaming failed:', err);
        send('error', {
          error: 'Gagal memproses pertanyaan. Coba lagi.',
          detail: err instanceof Error ? err.message : String(err),
        });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// Small local helper to avoid importing from services in route (keeps bundle lean)
function extractNarasiPartialSafe(raw: string): string {
  const match = raw.match(/"narasi"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!match) return '';
  return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}
