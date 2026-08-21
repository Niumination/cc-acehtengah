'use client';

// ─── Layout dashboard ───
//
// Perbaikan Sprint 2 (LAPORAN_AUDIT_PRODUCTION_READINESS.md §7.2, §P2-04, §P2-10, §P2-11):
//   • Navigasi mobile: sidebar dulu `hidden md:block` tanpa pengganti apa pun,
//     sehingga dashboard tidak bisa dinavigasi sama sekali di layar < 768px.
//     Sekarang ada drawer + overlay + penutupan via tombol Esc.
//   • Satu <h1> per halaman (dulu ada dua: sidebar dan header).
//   • Badge "Online" dan "SAPA Connected" dulu hardcoded. Sekarang membaca
//     /api/health dan menampilkan status sebenarnya, termasuk saat degraded.
//   • Tanggal dulu dirender saat SSR pada halaman statik → nilai ter-bake saat
//     build dan bisa salah hari (server UTC vs pengguna WIB). Kini menunggu mount.
//   • Tombol ikon punya nama aksesibel (aria-label) dan aria-expanded.

import Sidebar from '@/components/Sidebar';
import EwsPanel from '@/components/EwsPanel';
import Image from 'next/image';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';
import React, { useCallback, useEffect, useRef, useState } from 'react';

type HealthState =
  | { kind: 'loading' }
  | { kind: 'error' }
  | { kind: 'ok'; status: 'healthy' | 'degraded'; mode: 'mock' | 'live'; sapa: string };

const CLOCK_FORMAT: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [now, setNow] = useState<Date | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [ewsOpen, setEwsOpen] = useState(false);
  const [health, setHealth] = useState<HealthState>({ kind: 'loading' });
  const mobileNavRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Jam & tanggal hanya dihitung setelah mount → tidak ada nilai ter-bake
  // dari waktu build dan tidak ada mismatch zona waktu saat hidrasi.
  useEffect(() => {
    // setState dijalankan lewat timer (callback), bukan sinkron di body effect,
    // agar tidak memicu cascading render (react-hooks/set-state-in-effect).
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch('/api/health')
        .then(async (res) => res.json())
        .then((body) => {
          if (cancelled) return;
          if (!body?.services) {
            setHealth({ kind: 'error' });
            return;
          }
          setHealth({
            kind: 'ok',
            status: body.status === 'degraded' ? 'degraded' : 'healthy',
            mode: body.mode === 'mock' ? 'mock' : 'live',
            sapa: body.services.sapa,
          });
        })
        .catch(() => {
          if (!cancelled) setHealth({ kind: 'error' });
        });
    };

    load();
    const interval = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Esc menutup drawer & panel EWS.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // Efek samping (focus) TIDAK boleh berada di dalam state updater:
      // React StrictMode memanggil updater dua kali.
      if (mobileNavOpen) {
        setMobileNavOpen(false);
        menuButtonRef.current?.focus();
      }
      setEwsOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  // Cegah halaman di belakang ikut ter-scroll saat drawer terbuka.
  useEffect(() => {
    if (!mobileNavOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileNavOpen]);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
    // Kembalikan fokus ke tombol pemicu (WCAG SC 2.4.3 Focus Order).
    menuButtonRef.current?.focus();
  }, []);

  const statusLabel =
    health.kind === 'loading'
      ? 'Memeriksa…'
      : health.kind === 'error'
        ? 'Status tidak diketahui'
        : health.mode === 'mock'
          ? 'Mode data contoh'
          : health.status === 'healthy'
            ? 'Sistem normal'
            : 'Sebagian layanan terganggu';

  const statusTone =
    health.kind === 'ok' && health.status === 'healthy' && health.mode === 'live'
      ? 'bg-[var(--brand-tint)] border-[var(--brand-soft)]/50 text-[var(--brand)]'
      : health.kind === 'ok' && health.mode === 'mock'
        ? 'bg-[var(--warning-tint)] border-[var(--warning)]/40 text-[var(--warning)]'
        : 'bg-[var(--danger-tint)] border-[var(--danger)]/40 text-[var(--danger)]';

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface)] text-[var(--text)]">
      <a href="#konten-utama" className="skip-link">
        Lompat ke konten utama
      </a>

      {/* Sidebar desktop */}
      <div className="hidden h-full flex-shrink-0 md:block">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
      </div>

      {/* Drawer mobile */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Tutup menu navigasi"
            onClick={closeMobileNav}
            className="absolute inset-0 h-full w-full bg-black/50"
          />
          <div
            ref={mobileNavRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            className="absolute left-0 top-0 h-full shadow-2xl"
          >
            <Sidebar onNavigate={closeMobileNav} onClose={closeMobileNav} />
          </div>
        </div>
      )}

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-[var(--brand)] bg-[var(--brand-deep)] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Buka menu navigasi"
              aria-expanded={mobileNavOpen}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--brand-soft)] bg-[var(--brand)] text-[var(--on-brand-muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--on-brand)] md:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
                <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
                <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>

            <Image
              src="/logo-aceh-tengah.png"
              alt="Lambang Kabupaten Aceh Tengah"
              width={36}
              height={36}
              priority
              className="h-9 w-9 flex-shrink-0 rounded-lg object-contain"
            />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-bold tracking-wide text-white">
                Command Center Aceh Tengah
              </h1>
              <p className="text-[11px] uppercase tracking-widest text-[var(--text-muted)]">Diskominfo</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Waktu — hanya setelah mount */}
            <div className="hidden text-right sm:block">
              <p className="font-mono text-xs text-[var(--on-brand-muted)]">
                {now ? now.toLocaleTimeString('id-ID', CLOCK_FORMAT) : '--:--:--'}
              </p>
              <p className="text-[11px] text-[var(--border)]">
                {now ? now.toLocaleDateString('id-ID', DATE_FORMAT) : '—'}
              </p>
            </div>

            {/* Status sistem — dari /api/health, bukan hardcoded */}
            <p
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium ${statusTone}`}
              role="status"
              aria-live="polite"
            >
              <span aria-hidden="true" className="relative flex h-2 w-2">
                <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
              </span>
              <span>{statusLabel}</span>
            </p>

            <ThemeToggle />

            <Link
              href="/dashboard/akun"
              className="rounded-full border border-[var(--brand-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--on-brand-muted)] hover:bg-[var(--brand)]"
            >
              Akun
            </Link>
          </div>
        </header>

        <main id="konten-utama" tabIndex={-1} className="flex-1 overflow-y-auto bg-[var(--surface)] p-4 sm:p-6">
          {children}
        </main>

        {/* Tombol buka panel EWS */}
        {!ewsOpen && (
          <button
            type="button"
            onClick={() => setEwsOpen(true)}
            aria-label="Tampilkan panel peringatan dini"
            aria-expanded={false}
            className="absolute right-0 top-1/2 z-30 flex h-14 w-6 -translate-y-1/2 items-center justify-center rounded-l-lg border border-r-0 border-[var(--border-strong)] bg-[var(--surface-card)] text-[var(--text-body)] shadow-lg hover:bg-[var(--surface-muted)] hover:text-[var(--brand)]"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="9 3 4 6 9 9" />
            </svg>
          </button>
        )}
      </div>

      {/* Panel EWS */}
      <aside
        aria-label="Peringatan dini"
        className={`h-full flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          ewsOpen ? 'w-72' : 'w-0'
        }`}
      >
        <div className="h-full w-72 overflow-y-auto border-l border-[var(--border-strong)] bg-[var(--surface-card)] p-4">
          <div className="mb-3 flex items-start gap-2">
            <EwsPanel />
            <button
              type="button"
              onClick={() => setEwsOpen(false)}
              aria-label="Tutup panel peringatan dini"
              className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-[var(--surface-muted)] text-[var(--text-body)] transition-colors hover:bg-[var(--border)] hover:text-[var(--brand)]"
            >
              <span aria-hidden="true">✕</span>
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
