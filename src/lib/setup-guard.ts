// ─── Guard untuk endpoint bootstrap/setup ───
//
// Endpoint setup menjalankan DDL dan bisa membuat akun admin. Sebelumnya
// endpoint ini terbuka untuk publik dan langsung men-seed kredensial default.
// Lihat: LAPORAN_AUDIT_PRODUCTION_READINESS.md §P0-02
//
// Aturan:
//   1. SETUP_ENABLED harus bernilai "true" (default: mati)
//   2. Header `x-setup-token` harus cocok dengan SETUP_TOKEN (min. 32 karakter)
//   3. Bila salah satu gagal → 404, bukan 401/403, agar keberadaan endpoint
//      tidak terkonfirmasi ke pemindai otomatis.
//
// Modul ini sengaja TIDAK bergantung pada `next/server` supaya bisa diuji
// sebagai unit murni. Route handler yang membentuk NextResponse-nya.

const MIN_TOKEN_LENGTH = 32;

export type SetupDenyReason = 'disabled' | 'misconfigured' | 'bad-token';

export interface SetupDecision {
  allowed: boolean;
  reason?: SetupDenyReason;
}

/** Perbandingan waktu-konstan agar tidak bocor lewat timing attack. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Evaluasi apakah request boleh mengakses endpoint setup. */
export function evaluateSetupAccess(req: {
  headers: { get(name: string): string | null };
}): SetupDecision {
  if (process.env.SETUP_ENABLED !== 'true') {
    return { allowed: false, reason: 'disabled' };
  }

  const expected = process.env.SETUP_TOKEN;
  if (!expected || expected.length < MIN_TOKEN_LENGTH) {
    return { allowed: false, reason: 'misconfigured' };
  }

  const provided = req.headers.get('x-setup-token');
  if (!provided || !timingSafeEqual(provided, expected)) {
    return { allowed: false, reason: 'bad-token' };
  }

  return { allowed: true };
}
