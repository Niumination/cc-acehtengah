'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function safeRedirectTarget(raw: string | null): string {
  const fallback = '/dashboard/laporan';
  if (!raw) return fallback;
  if (!/^\/(?![/\\])/.test(raw)) return fallback;
  return raw;
}

function LoginForm() {
  const searchParams = useSearchParams();
  const from = safeRedirectTarget(searchParams.get('from'));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login gagal');
        setLoading(false);
        return;
      }

      window.location.href = from;
    } catch {
      setError('Gagal menghubungi server');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{
        background: 'linear-gradient(135deg, var(--surface) 0%, var(--brand-tint) 100%)',
      }}>

      <div className="relative w-full max-w-md px-6">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">☕</div>
          <h1 className="text-2xl font-bold text-[var(--accent)] tracking-wide">
            KOMANDO AT
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">
            Command Center AI Aceh Tengah
          </p>
          <div className="w-16 h-0.5 bg-[var(--accent)]/30 mx-auto mt-4" />
        </div>

        {/* Login Card */}
        <div className="bg-[var(--surface-card)] rounded-2xl border border-[var(--border-strong)] p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-1">
            🔒 Akses Terbatas
          </h2>
          <p className="text-[var(--text-muted)] text-sm mb-6">
            Masuk untuk melihat laporan AI
          </p>

          {error && (
            <div role="alert" className="bg-[var(--danger-tint)] border border-[var(--danger)]/30 rounded-lg px-4 py-3 mb-4 text-[var(--danger)] text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-[var(--text-muted)] text-sm mb-1.5">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 transition-colors"
                placeholder="Masukkan username"
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[var(--text-muted)] text-sm mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[var(--surface-muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/50 transition-colors"
                placeholder="Masukkan password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-[var(--on-brand)] font-semibold py-3 rounded-lg transition-all duration-200 shadow-lg shadow-[var(--accent)]/20 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Memverifikasi...
                </span>
              ) : 'Masuk'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[var(--text-muted)] text-xs mt-6">
          © 2026 Diskominfo Aceh Tengah
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface)' }}>
        <div className="text-[var(--accent)] text-lg">Memuat...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
