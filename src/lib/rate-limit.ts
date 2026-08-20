// ─── Rate Limiter (fixed window, in-memory) ───
//
// KETERBATASAN YANG HARUS DIPAHAMI:
// Penyimpanan ada di memori proses. Di Vercel/serverless setiap instance punya
// memori sendiri, sehingga batas efektif = limit × jumlah instance aktif.
// Ini adalah mitigasi *best effort* untuk menahan abuse kasar (bot, script
// berulang), BUKAN pengganti rate limiter terdistribusi.
//
// Untuk produksi dengan trafik nyata, ganti implementasi ini dengan store
// bersama (Upstash Redis / Vercel KV) tanpa mengubah call site — signature
// `checkRateLimit()` sengaja dibuat sinkron-sederhana agar mudah ditukar.
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-05 dan §P1-08

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Batas jumlah key yang disimpan, mencegah memory leak dari IP acak. */
const MAX_BUCKETS = 10_000;

function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  /** Detik sampai window direset — dipakai untuk header Retry-After. */
  retryAfterSeconds: number;
}

export interface RateLimitOptions {
  /** Identitas pemanggil, mis. `query:203.0.113.9`. */
  key: string;
  /** Jumlah request maksimum dalam satu window. */
  limit: number;
  /** Panjang window dalam milidetik. */
  windowMs: number;
}

export function checkRateLimit({ key, limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();

  if (buckets.size > MAX_BUCKETS) sweepExpired(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return {
      ok: true,
      limit,
      remaining: limit - 1,
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));

  return {
    ok: existing.count <= limit,
    limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSeconds,
  };
}

/** Reset satu key — dipakai setelah login sukses agar percobaan gagal tidak menumpuk. */
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

/**
 * Ambil IP klien dari header proxy.
 * Di Vercel `x-forwarded-for` di-set oleh platform dan tidak bisa di-spoof klien;
 * di self-host pastikan reverse proxy menimpa header ini.
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
