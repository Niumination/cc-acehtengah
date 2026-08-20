'use client';

// Batas error untuk seluruh segmen app. Sebelumnya tidak ada: kegagalan render
// menghasilkan layar putih tanpa penjelasan (§P2-15).

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Di produksi, kirim ke layanan pemantauan (Sentry/OTel) — lihat roadmap R8.
    console.error('[app] Render error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#B3261E]/30 bg-white p-8 text-center">
        <h1 className="text-lg font-bold text-[#1E2420]">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-[#4B5249]">
          Halaman ini gagal dimuat. Tim teknis sudah dapat menelusuri masalahnya lewat kode
          referensi di bawah.
        </p>
        {error.digest && (
          <p className="mt-3 rounded-lg bg-[#E9E6DA] px-3 py-2 font-mono text-xs text-[#4B5249]">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[#1B4332] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2D6A4F]"
          >
            Coba lagi
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-[#8A8676] px-4 py-2 text-sm font-medium text-[#1B4332] hover:bg-[#E9E6DA]"
          >
            Kembali ke beranda
          </a>
        </div>
      </div>
    </div>
  );
}
