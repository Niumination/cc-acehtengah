import type { Metadata, Viewport } from "next";
// Font di-SELF-HOST lewat paket resmi `geist` (Vercel), bukan next/font/google.
// Alasan (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-06): next/font/google
// mengunduh font saat BUILD. Bila fonts.googleapis.com tidak terjangkau —
// gangguan jaringan CI, kebijakan egress, atau blokir — `next build` GAGAL
// TOTAL, bukan sekadar memakai fallback. Paket `geist` menyertakan berkas
// .woff2 di node_modules sehingga build tidak menyentuh jaringan sama sekali.
// Bonus: tidak ada permintaan pihak ketiga dari peramban warga (privasi).
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cc-acehtengah.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Command Center AI Aceh Tengah",
    template: "%s — Command Center Aceh Tengah",
  },
  description:
    "Dashboard Command Center Pemerintah Kabupaten Aceh Tengah. Visualisasi data SAPA, analitik indikator per OPD, dan asisten AI untuk mendukung pengambilan keputusan.",
  applicationName: "Command Center Aceh Tengah",
  authors: [{ name: "Diskominfo Kabupaten Aceh Tengah" }],
  keywords: ["Aceh Tengah", "Command Center", "SAPA", "data terbuka", "Diskominfo", "Takengon"],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "Command Center Aceh Tengah",
    title: "Command Center AI Aceh Tengah",
    description:
      "Visualisasi data SAPA dan asisten AI untuk Pemerintah Kabupaten Aceh Tengah.",
    url: siteUrl,
  },
  twitter: {
    card: "summary",
    title: "Command Center AI Aceh Tengah",
    description: "Visualisasi data SAPA Pemerintah Kabupaten Aceh Tengah.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "var(--brand-deep)",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      data-theme="light"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
    >
      <head>
        {/*
          Terapkan tema SEBELUM cat pertama agar tidak ada kedipan putih di
          ruang kendali yang gelap. Skrip ini sengaja inline dan sinkron;
          CSP mengizinkannya (lihat src/lib/security-headers.ts).
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cc-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-[var(--surface)] text-[var(--text)]">{children}</body>
    </html>
  );
}
