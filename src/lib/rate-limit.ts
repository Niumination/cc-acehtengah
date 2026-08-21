// ─── Rate limiter (P0-05, diperkuat oleh P1-08) ───
//
// Kini bersandar pada `src/lib/store.ts` yang memakai Upstash Redis bila
// dikonfigurasi, dan otomatis jatuh ke memori proses bila tidak.
//
// Perbedaan penting dari versi sebelumnya: dengan Redis, batas berlaku LINTAS
// instance serverless. Tanpa Redis, batas efektif = limit × jumlah instance —
// keterbatasan ini dilaporkan lewat `backend` pada hasil agar dapat dipantau.

import { incrementCounter, resetCounter, activeBackend, type StoreBackend } from '@/lib/store';

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Detik sampai window direset — dipakai header Retry-After. */
  retryAfterSeconds: number;
  backend: StoreBackend;
}

export interface RateLimitOptions {
  /** Identitas pemanggil, mis. `query:m:203.0.113.9`. */
  key: string;
  /** Jumlah permintaan maksimum dalam satu window. */
  limit: number;
  /** Panjang window dalam milidetik. */
  windowMs: number;
}

export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  const { count, resetAt, backend } = await incrementCounter(`rl:${key}`, windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return {
    ok: count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
    backend,
  };
}

/** Reset satu kunci — dipakai setelah login berhasil agar percobaan gagal tidak menumpuk. */
export async function resetRateLimit(key: string): Promise<void> {
  await resetCounter(`rl:${key}`);
}

/**
 * Ambil IP klien dari header proxy.
 * Di Vercel `x-forwarded-for` di-set platform dan tidak dapat dipalsukan klien;
 * pada self-host pastikan reverse proxy menimpa header ini.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}

/** Header standar untuk respons 429. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'Retry-After': String(result.retryAfterSeconds),
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
  };
}

export { activeBackend };
