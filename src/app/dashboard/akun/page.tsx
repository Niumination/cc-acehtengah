'use client';

// ─── /dashboard/akun — Profil admin, ganti password, logout ───
// Dilindungi oleh src/proxy.ts (butuh sesi valid).

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Admin {
  username: string;
  nama: string;
  role: string;
}

const MIN_PASSWORD_LENGTH = 12;

export default function AkunPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // setState dilakukan di dalam callback promise (bukan sinkron di body effect)
  // agar tidak memicu cascading render — lihat react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        setAdmin(data?.admin ?? null);
        setLoadingProfile(false);
      })
      .catch(() => {
        // Proxy sudah menjaga halaman ini; kegagalan di sini tidak fatal.
        if (!cancelled) setLoadingProfile(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.replace('/login');
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Gagal mengganti password');
        return;
      }

      setSuccess(`${data.message} Anda akan diarahkan ke halaman masuk…`);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        router.replace('/login');
        router.refresh();
      }, 2500);
    } catch {
      setError('Gagal menghubungi server');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-[var(--border-strong)] bg-white px-4 py-2.5 text-sm text-[var(--text)] ' +
    'placeholder-[var(--text-muted)] focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-[var(--warning)]">Pengaturan</p>
        <h1 className="mt-1 text-2xl font-bold text-[var(--text)]">Akun Saya</h1>
      </header>

      {/* Profil */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <h2 className="mb-4 text-sm font-bold text-[var(--brand)]">Informasi Akun</h2>
        {loadingProfile ? (
          <p className="text-sm text-[var(--text-muted)]">Memuat…</p>
        ) : admin ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Nama</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[var(--text)]">{admin.nama}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Username</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[var(--text)]">{admin.username}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[var(--text-muted)]">Peran</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[var(--text)]">{admin.role}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[var(--danger)]">Sesi tidak terbaca.</p>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="mt-5 rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--brand)] transition-colors hover:bg-[var(--surface-muted)]"
        >
          Keluar
        </button>
      </section>

      {/* Ganti password */}
      <section className="rounded-2xl border border-[var(--border)] bg-white p-6">
        <h2 className="text-sm font-bold text-[var(--brand)]">Ganti Password</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Minimal {MIN_PASSWORD_LENGTH} karakter. Setelah diganti, Anda perlu masuk kembali.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-tint)] px-4 py-3 text-sm text-[var(--danger)]"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-[var(--brand-soft)]/30 bg-[var(--brand-tint)] px-4 py-3 text-sm text-[var(--brand)]"
          >
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm text-[var(--text-body)]">
              Password saat ini
            </label>
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm text-[var(--text-body)]">
              Password baru
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputClass}
              aria-describedby="newPasswordHelp"
            />
            <p id="newPasswordHelp" className="mt-1 text-xs text-[var(--text-muted)]">
              Gunakan kombinasi huruf, angka, dan simbol.
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm text-[var(--text-body)]">
              Ulangi password baru
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-lg bg-[var(--brand)] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Menyimpan…' : 'Simpan Password Baru'}
          </button>
        </form>
      </section>
    </div>
  );
}
