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
    'w-full rounded-lg border border-[#8A8676] bg-white px-4 py-2.5 text-sm text-[#1E2420] ' +
    'placeholder-[#5C6358] focus:border-[#1B4332] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-[#8A6E1D]">Pengaturan</p>
        <h1 className="mt-1 text-2xl font-bold text-[#1E2420]">Akun Saya</h1>
      </header>

      {/* Profil */}
      <section className="rounded-2xl border border-[#9A9683] bg-white p-6">
        <h2 className="mb-4 text-sm font-bold text-[#1B4332]">Informasi Akun</h2>
        {loadingProfile ? (
          <p className="text-sm text-[#5C6358]">Memuat…</p>
        ) : admin ? (
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5C6358]">Nama</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#1E2420]">{admin.nama}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5C6358]">Username</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#1E2420]">{admin.username}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#5C6358]">Peran</dt>
              <dd className="mt-0.5 text-sm font-semibold text-[#1E2420]">{admin.role}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-[#B3261E]">Sesi tidak terbaca.</p>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="mt-5 rounded-lg border border-[#9A9683] px-4 py-2 text-sm font-medium text-[#1B4332] transition-colors hover:bg-[#E9E6DA]"
        >
          Keluar
        </button>
      </section>

      {/* Ganti password */}
      <section className="rounded-2xl border border-[#9A9683] bg-white p-6">
        <h2 className="text-sm font-bold text-[#1B4332]">Ganti Password</h2>
        <p className="mt-1 text-sm text-[#5C6358]">
          Minimal {MIN_PASSWORD_LENGTH} karakter. Setelah diganti, Anda perlu masuk kembali.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-[#B3261E]/30 bg-[#FBE3DE] px-4 py-3 text-sm text-[#B3261E]"
          >
            {error}
          </p>
        )}
        {success && (
          <p
            role="status"
            className="mt-4 rounded-lg border border-[#2D6A4F]/30 bg-[#DCE8DE] px-4 py-3 text-sm text-[#1B4332]"
          >
            {success}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm text-[#4B5249]">
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
            <label htmlFor="newPassword" className="mb-1.5 block text-sm text-[#4B5249]">
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
            <p id="newPasswordHelp" className="mt-1 text-xs text-[#5C6358]">
              Gunakan kombinasi huruf, angka, dan simbol.
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="mb-1.5 block text-sm text-[#4B5249]">
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
            className="rounded-lg bg-[#1B4332] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#2D6A4F] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? 'Menyimpan…' : 'Simpan Password Baru'}
          </button>
        </form>
      </section>
    </div>
  );
}
