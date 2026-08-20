import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cc-acehtengah.vercel.app';
  const lastModified = new Date();

  // Hanya halaman publik. Halaman ber-auth sengaja tidak dicantumkan.
  return [
    { url: `${siteUrl}/dashboard`, lastModified, changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/dashboard/analytics`, lastModified, changeFrequency: 'daily', priority: 0.8 },
    { url: `${siteUrl}/dashboard/gis`, lastModified, changeFrequency: 'weekly', priority: 0.6 },
  ];
}
