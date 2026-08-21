'use client';

// ─── Sidebar navigasi ───
//
// Perbaikan Sprint 2 (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P2-04, §P2-08, §P2-09):
//   • Judul sidebar dulu <h1>, padahal header juga <h1> → dua <h1> per halaman.
//     Sekarang memakai <p> dan navigasi dibungkus <nav aria-label>.
//   • Link "#ai" dan "#ews" MATI: elemen id="ai" hanya ada di AiChatPanel yang
//     tidak pernah dirender, dan id="ews" tidak ada sama sekali. Dihapus.
//   • Emoji ikon diberi aria-hidden agar tidak dibacakan pembaca layar.
//   • Halaman aktif ditandai aria-current="page", bukan hanya warna.
//   • Indikator status statis "Active" dihapus — status nyata ada di header.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  desc: string;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Beranda', icon: '📊', desc: 'Ringkasan SAPA' },
  { href: '/dashboard/analytics', label: 'Analitik', icon: '📈', desc: 'Tren & analitik' },
  { href: '/dashboard/gis', label: 'Peta Wilayah', icon: '🗺️', desc: 'Peta kecamatan' },
  { href: '/dashboard/laporan', label: 'Laporan AI', icon: '📋', desc: 'Riwayat kueri AI' },
  { href: '/dashboard/akun', label: 'Akun', icon: '👤', desc: 'Profil & password' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  /** Dipanggil setelah menu diklik — dipakai drawer mobile untuk menutup diri. */
  onNavigate?: () => void;
  /** Bila diisi, tampilkan tombol tutup eksplisit (dipakai drawer mobile). */
  onClose?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle, onNavigate, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={`flex h-full flex-col border-r border-[var(--border-strong)] bg-[var(--surface-card)] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-56'
      }`}
    >
      <div className={`bg-[var(--brand-deep)] flex h-[61px] items-center ${collapsed ? 'px-2' : 'px-4'}`}>
        <div className="flex items-center gap-2.5">
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
              aria-expanded={!collapsed}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--brand-soft)] bg-[var(--brand)] text-[var(--on-brand-muted)] transition-all duration-200 hover:bg-[var(--brand-soft)] hover:text-[var(--on-brand)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
                <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
                <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>
          )}
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold tracking-tight text-white">Aceh Tengah</p>
              <p className="text-[11px] font-medium text-[var(--text-muted)]">Command Center</p>
            </div>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup menu navigasi"
              autoFocus
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[var(--brand-soft)] bg-[var(--brand)] text-[var(--on-brand-muted)] hover:bg-[var(--brand-soft)] hover:text-[var(--on-brand)]"
            >
              <span aria-hidden="true">✕</span>
            </button>
          )}
        </div>
      </div>

      <nav
        aria-label="Navigasi utama"
        className={`flex-1 space-y-1 py-4 ${collapsed ? 'px-2' : 'px-3'}`}
      >
        <p
          className={`mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)] ${
            collapsed ? 'px-0 text-center' : 'px-3'
          }`}
        >
          {collapsed ? '•' : 'Navigasi'}
        </p>

        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={isActive ? 'page' : undefined}
                  title={collapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-xl text-sm transition-all duration-200 ${
                    collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
                  } ${
                    isActive
                      ? 'border border-[var(--brand-soft)]/40 bg-[var(--brand-tint)] text-[var(--brand)]'
                      : 'border border-transparent text-[var(--text-body)] hover:bg-[var(--surface-muted)] hover:text-[var(--brand)]'
                  }`}
                >
                  <span aria-hidden="true" className="flex-shrink-0 text-base">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-xs font-semibold ${
                          isActive ? 'text-[var(--brand)]' : 'text-[var(--text-body)]'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--text-muted)]">{item.desc}</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`border-t border-[var(--border)] ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        {!collapsed && <p className="text-[11px] text-[var(--text-muted)]">Diskominfo Aceh Tengah</p>}
      </div>
    </div>
  );
}
