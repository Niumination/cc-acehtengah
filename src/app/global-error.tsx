'use client';

// Penangkap error terakhir bila root layout sendiri gagal (§P2-15).
// Wajib merender <html> dan <body> sendiri.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="id">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--surface)',
          color: 'var(--text)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.125rem', margin: 0 }}>Aplikasi gagal dimuat</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-body)' }}>
            Silakan muat ulang halaman. Jika masalah berlanjut, hubungi Diskominfo Aceh Tengah.
          </p>
          {error.digest && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-body)' }}>
              Ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: 'var(--brand)',
              color: '#fff',
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}
