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
}

export default function Sidebar({ collapsed = false, onToggle, onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={`flex h-full flex-col border-r border-[#8A8676] bg-white transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-56'
      }`}
    >
      <div className={`bg-[#0F2A1E] ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        <div className="flex items-center gap-2.5">
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
              aria-expanded={!collapsed}
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#2D6A4F] bg-[#1B4332] text-[#E3E0D2] transition-all duration-200 hover:bg-[#2D6A4F] hover:text-white"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
                <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
                <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
              </svg>
            </button>
          )}
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold tracking-tight text-white">Aceh Tengah</p>
              <p className="text-[11px] font-medium text-[#C6C3B4]">Command Center</p>
            </div>
          )}
        </div>
      </div>

      <nav
        aria-label="Navigasi utama"
        className={`flex-1 space-y-1 py-4 ${collapsed ? 'px-2' : 'px-3'}`}
      >
        <p
          className={`mb-2 text-[11px] font-bold uppercase tracking-widest text-[#5C6358] ${
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
                      ? 'border border-[#2D6A4F]/40 bg-[#DCE8DE] text-[#1B4332]'
                      : 'border border-transparent text-[#4B5249] hover:bg-[#E9E6DA] hover:text-[#1B4332]'
                  }`}
                >
                  <span aria-hidden="true" className="flex-shrink-0 text-base">
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span className="min-w-0">
                      <span
                        className={`block truncate text-xs font-semibold ${
                          isActive ? 'text-[#1B4332]' : 'text-[#4B5249]'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="block truncate text-[11px] text-[#5C6358]">{item.desc}</span>
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`border-t border-[#9A9683] ${collapsed ? 'px-2 py-3' : 'px-4 py-4'}`}>
        {!collapsed && <p className="text-[11px] text-[#5C6358]">Diskominfo Aceh Tengah</p>}
      </div>
    </div>
  );
}
