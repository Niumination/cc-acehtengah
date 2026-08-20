// Halaman 404 kustom (§P2-15).

import Link from 'next/link';

export const metadata = { title: 'Halaman tidak ditemukan' };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F5F3EC] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#8A8676] bg-white p-8 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-[#8A6E1D]">404</p>
        <h1 className="mt-1 text-lg font-bold text-[#1E2420]">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-[#4B5249]">
          Alamat yang Anda buka tidak tersedia atau sudah dipindahkan.
        </p>
        <Link
          href="/dashboard"
          className="mt-5 inline-block rounded-lg bg-[#1B4332] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2D6A4F]"
        >
          Kembali ke beranda
        </Link>
      </div>
    </div>
  );
}
