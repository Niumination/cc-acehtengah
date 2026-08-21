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
      <div className="w-full max-w-md rounded-2xl border border-[var(--danger)]/30 bg-[var(--surface-card)] p-8 text-center">
        <h1 className="text-lg font-bold text-[var(--text)]">Terjadi kesalahan</h1>
        <p className="mt-2 text-sm text-[var(--text-body)]">
          Halaman ini gagal dimuat. Tim teknis sudah dapat menelusuri masalahnya lewat kode
          referensi di bawah.
        </p>
        {error.digest && (
          <p className="mt-3 rounded-lg bg-[var(--surface-muted)] px-3 py-2 font-mono text-xs text-[var(--text-body)]">
            Ref: {error.digest}
          </p>
        )}
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-[var(--on-brand)] hover:bg-[var(--brand-soft)]"
          >
            Coba lagi
          </button>
          <a
            href="/dashboard"
            className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--brand)] hover:bg-[var(--surface-muted)]"
          >
            Kembali ke beranda
          </a>
        </div>
      </div>
    </div>
  );
}
