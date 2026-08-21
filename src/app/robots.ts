import type { MetadataRoute } from 'next';

// Halaman administratif dan seluruh API tidak boleh diindeks mesin pencari.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cc-acehtengah.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/login', '/dashboard/laporan', '/dashboard/akun'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
