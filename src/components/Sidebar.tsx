'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoMark } from '@/components/brand/Logo';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: '📊', desc: 'Overview SAPA' },
  { href: '/dashboard/analytics', label: 'Analitik', icon: '📈', desc: 'Tren & analitik' },
  { href: '/dashboard/gis', label: 'Peta GIS', icon: '🗺️', desc: 'Peta interaktif' },
  { href: '/dashboard/laporan', label: 'Laporan AI', icon: '📋', desc: 'Brief & riwayat' },
  { href: '/dashboard/admin/dtsen', label: 'Admin DTSEN', icon: '🔐', desc: 'Rilis data terbatas' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navigasi utama"
      className={`relative flex h-full flex-col overflow-hidden bg-[var(--brand-deep)] text-[var(--on-brand-muted)] transition-all duration-300 ease-in-out ${collapsed ? 'w-[68px]' : 'w-[250px]'}`}
    >
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-56 w-56 rounded-full bg-[var(--brand-soft)]/10" />

      {/* Brand + collapse */}
      <div className={`relative z-[1] flex h-[68px] items-center border-b border-white/10 ${collapsed ? 'justify-center px-2' : 'gap-3 px-4'}`}>
        <button
          type="button"
          onClick={onToggle}
          aria-label={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
          title={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl border border-[var(--brand-soft)] bg-[var(--brand)] text-[var(--on-brand-muted)] transition hover:bg-[var(--brand-soft)] hover:text-white"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
            <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
          </svg>
        </button>
        {!collapsed && (
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark size={32} className="flex-shrink-0 rounded-lg" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-white">SAPA Smart AI</h1>
              <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-[#AEBEB2]">Aceh Tengah · Data hub</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`relative z-[1] flex-1 space-y-1 py-5 ${collapsed ? 'px-2' : 'px-3'}`}>
        <p className={`mb-3 text-[9px] font-black uppercase tracking-[0.16em] text-[#809286] ${collapsed ? 'text-center' : 'px-3'}`}>
          {collapsed ? '•' : 'Ruang kendali'}
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={`group relative flex items-center rounded-xl border text-sm transition-all duration-200 ${collapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3 py-3'} ${isActive ? 'border-[var(--brand-soft)]/40 bg-[var(--brand-soft)]/20 text-white shadow-inner' : 'border-transparent text-[#BFCDC1] hover:border-white/10 hover:bg-white/[0.06] hover:text-white'}`}
            >
              {isActive && <span className="absolute left-0 top-2.5 bottom-2.5 w-[3px] rounded-r-full bg-[var(--accent)]" />}
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-base" aria-hidden="true">{item.icon}</span>
              {!collapsed && (
                <span className="min-w-0">
                  <span className={`block truncate text-xs font-bold ${isActive ? 'text-white' : 'text-[#E0E9E1]'}`}>{item.label}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#8FA296]">{item.desc}</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* System status */}
      <div className={`relative z-[1] border-t border-white/10 ${collapsed ? 'px-2 py-4' : 'space-y-2 px-4 py-4'}`}>
        {!collapsed && <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#809286]">Status sistem</p>}
        <StatusRow label="SAPA" collapsed={collapsed} />
        <StatusRow label="AI" collapsed={collapsed} />
        {!collapsed && <p className="pt-2 text-[9px] leading-relaxed text-[#718378]">Diskominfo Kabupaten Aceh Tengah<br />Executive data workspace</p>}
      </div>
    </aside>
  );
}

function StatusRow({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="flex justify-center py-1" title={`${label}: aktif`}><span className="h-2 w-2 rounded-full bg-[var(--brand-soft)] shadow-[0_0_0_4px_rgba(82,183,136,.12)]" /></div>;
  }
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-[#8FA296]">{label}</span>
      <span className="inline-flex items-center gap-1.5 font-bold text-[var(--brand-soft)]"><span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-soft)]" />Aktif</span>
    </div>
  );
}
