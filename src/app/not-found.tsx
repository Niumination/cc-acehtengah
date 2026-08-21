// Halaman 404 kustom (§P2-15).

import Link from 'next/link';

export const metadata = { title: 'Halaman tidak ditemukan' };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface)] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-card)] p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--warning)]">404</p>
        <h1 className="mt-1 text-lg font-bold text-[var(--text)]">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-[var(--text-body)]">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-block rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--on-brand)] hover:bg-[var(--brand-soft)]"
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
