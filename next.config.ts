import type { NextConfig } from 'next';

// Content-Security-Policy disusun eksplisit agar mudah diaudit.
// Catatan per-direktif:
//   • 'unsafe-inline' pada style-src masih diperlukan: Leaflet dan Recharts
//     menyuntikkan style inline saat runtime.
//   • img-src mengizinkan tile OpenStreetMap (dipakai peta GIS) dan data: URI
//     (ikon marker Leaflet di-encode sebagai data URI).
//   • connect-src 'self' cukup karena seluruh panggilan ke SAPA/LLM dilakukan
//     dari server (route handler), bukan dari browser.
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "script-src 'self'" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval' 'unsafe-inline'" : ''),
  "connect-src 'self'",
  "worker-src 'self' blob:",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: contentSecurityPolicy },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
];

const nextConfig: NextConfig = {
  // Jangan umumkan framework & versinya.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
      {
        // Endpoint API tidak boleh di-cache oleh CDN/proxy perantara.
        source: '/api/:path*',
        headers: [
          ...securityHeaders,
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ];
  },
};

export default nextConfig;
