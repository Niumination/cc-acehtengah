import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  // Bila Google Fonts tidak dapat dihubungi saat build, gunakan fallback
  // sistem alih-alih menggagalkan build (§P1-06).
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-monospace", "Courier New", "monospace"],
});

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
  themeColor: "#0F2A1E",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#F5F3EC] text-[#1E2420]">{children}</body>
    </html>
  );
}
