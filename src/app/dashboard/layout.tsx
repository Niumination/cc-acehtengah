'use client';

import Sidebar from '@/components/Sidebar';
import { LogoMark } from '@/components/brand/Logo';
import React, { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    // @hotfix 29-Agu-2026: tombol Akun/Logout hanya tampil saat SESI AKTIF.
    // Sebelumnya tombol selalu render → setelah logout (client-side redirect)
    // tombol masih terlihat sebentar/setelah navigasi. Cek /api/auth/me di mount.
    fetch('/api/auth/me')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.authenticated && d?.admin) {
          setIsAuthed(true);
          setAdminName(d.admin.username ?? null);
        }
      })
      .catch(() => {});
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface)] text-[var(--text)]">
      <div className="hidden h-full flex-shrink-0 md:block print:hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Executive shell header: light canvas, dark brand retained as an accent. */}
        <header className="z-20 flex h-[68px] flex-shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-card)] px-4 md:px-7 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden"><LogoMark size={34} className="rounded-xl" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-[var(--brand-deep)]">SAPA Smart AI</h1>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--text-muted)]">Ruang kendali data Kabupaten Aceh Tengah</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {/* Live Clock */}
            <div className="text-right">
              <p className="font-mono text-xs text-[#C6C3B4]">
                {mounted ? currentTime : '--:--:--'}
              </p>
              <p className="text-[10px] text-[#767D6F]">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--brand-tint)] border border-[var(--border)]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-soft)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-soft)]" />
              </span>
              <span className="text-[11px] font-medium text-[var(--brand)]">Online</span>
            </div>

            {/* SAPA Badge */}
            <div className="px-3 py-1.5 rounded-full bg-[var(--accent-tint)] border border-[var(--accent)]">
              <span className="text-[11px] font-medium text-[var(--accent)]">
                📡 SAPA Connected
              </span>
            </div>

            {/* Akun & Logout — @hotfix 29-Agu: hanya tampil saat SESI AKTIF.
                Publik (belum login) melihat tombol LOGIN sebagai gantinya. */}
            {isAuthed ? (
              <div className="flex items-center gap-2 border-l border-[var(--border)] pl-3">
                {adminName && (
                  <span className="hidden lg:inline text-[11px] font-medium text-[#C6C3B4] max-w-[110px] truncate" title={adminName}>
                    👤 {adminName}
                  </span>
                )}
                <a
                  href="/dashboard/akun"
                  title="Pengaturan akun"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--brand-tint)] hover:brightness-95 border border-[var(--border)] transition-colors"
                >
                  <span className="text-sm">👤</span>
                  <span className="text-[11px] font-medium text-[var(--brand)]">Akun</span>
                </a>
                <button
                  onClick={async () => {
                    await fetch('/api/auth/logout', { method: 'POST' });
                    // @hotfix 29-Agu: setelah logout → kembali ke DASHBOARD (publik),
                    // bukan ke halaman login.
                    window.location.href = '/dashboard';
                  }}
                  title="Keluar"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--danger-tint)] hover:brightness-95 border border-[var(--danger)] transition-colors"
                >
                  <span className="text-sm">🚪</span>
                  <span className="text-[11px] font-medium text-[var(--danger)]">Logout</span>
                </button>
              </div>
            ) : (
              <a
                href="/login"
                title="Masuk sebagai admin"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--brand-tint)] hover:brightness-95 border border-[var(--border)] transition-colors"
                >
                  <span className="text-sm">🔐</span>
                <span className="text-[11px] font-medium text-[var(--brand)]">Login</span>
              </a>
            )}
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)] px-3 py-4 sm:px-5 md:px-7 md:py-6">
          <div className="mx-auto w-full max-w-[1580px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
