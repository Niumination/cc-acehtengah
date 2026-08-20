import type { NextConfig } from 'next';
import { buildSecurityHeaders } from './src/lib/security-headers';

// Kebijakan header keamanan didefinisikan di src/lib/security-headers.ts
// agar dapat diuji sebagai unit (tests/security-headers.test.ts).
const securityHeaders = buildSecurityHeaders(process.env.NODE_ENV === 'development');

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
        // Respons API tidak boleh disimpan cache oleh CDN/proxy perantara.
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
