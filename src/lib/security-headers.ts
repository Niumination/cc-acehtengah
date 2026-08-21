// ─── Kebijakan header keamanan ───
//
// Dipisah dari next.config.ts agar bisa diuji sebagai unit.
// Lihat tests/security-headers.test.ts.
//
// LATAR BELAKANG `script-src` (hasil pengujian, bukan asumsi):
//
// Next.js App Router menyisipkan payload RSC sebagai INLINE script
// (`<script id="_R_">self.__next_f.push(...)</script>`) di setiap halaman.
// Kebijakan `script-src 'self'` saja MEMBLOKIR script itu sehingga aplikasi
// tidak terhidrasi sama sekali di produksi.
//
// Alternatif ideal — nonce per-request lewat `src/proxy.ts` — sudah dicoba dan
// TIDAK dapat dipakai pada proyek ini:
//   • `next dev`   → nonce tersuntik ke seluruh tag script dan cocok dengan
//                    header  ✓
//   • `next start` → seluruh halaman berstatus ○ (Static, dipra-render saat
//                    build) sehingga HTML-nya tidak memuat nonce, sementara
//                    header membawa nonce baru tiap request. Dengan
//                    'strict-dynamic', sumber 'self' diabaikan browser dan
//                    inline script tetap terblokir  ✗
// Memakai nonce mengharuskan seluruh halaman dirender dinamis — keputusan
// arsitektur tersendiri, dicatat sebagai tindak lanjut di laporan audit.
//
// Yang tetap diperoleh dari kebijakan ini dan bernilai nyata:
//   • memblokir pemuatan script dari origin luar (vektor utama injeksi)
//   • object-src 'none' dan frame-ancestors 'none' (anti clickjacking)
//   • base-uri 'self' dan form-action 'self' (anti base-tag & form hijacking)
// Risiko sisa dapat diterima karena tidak ada `dangerouslySetInnerHTML`
// di basis kode, sehingga tidak ada jalur penyisipan HTML mentah dari data
// SAPA maupun keluaran LLM.

export interface SecurityHeader {
  key: string;
  value: string;
}

/**
 * Susun nilai header Content-Security-Policy.
 * @param isDevelopment  'unsafe-eval' hanya dibutuhkan HMR Turbopack saat dev.
 */
export function buildContentSecurityPolicy(isDevelopment: boolean): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
    // Leaflet & Recharts menyuntikkan style inline saat runtime.
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    `script-src 'self' 'unsafe-inline'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    "connect-src 'self'",
    "worker-src 'self' blob:",
    'upgrade-insecure-requests',
  ].join('; ');
}

/** Header keamanan yang dikirim pada setiap respons. */
export function buildSecurityHeaders(isDevelopment: boolean): SecurityHeader[] {
  return [
    { key: 'Content-Security-Policy', value: buildContentSecurityPolicy(isDevelopment) },
    { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ];
}

/** Uraikan string CSP menjadi peta direktif → daftar sumber (dipakai tes). */
export function parseCsp(policy: string): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    result[tokens[0]] = tokens.slice(1);
  }
  return result;
}
