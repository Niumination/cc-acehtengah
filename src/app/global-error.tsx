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
          background: '#F5F3EC',
          color: '#1E2420',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ maxWidth: 420, padding: 32, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.125rem', margin: 0 }}>Aplikasi gagal dimuat</h1>
          <p style={{ fontSize: '0.875rem', color: '#4B5249' }}>
            Silakan muat ulang halaman. Jika masalah berlanjut, hubungi Diskominfo Aceh Tengah.
          </p>
          {error.digest && (
            <p style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#4B5249' }}>
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
              background: '#1B4332',
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
