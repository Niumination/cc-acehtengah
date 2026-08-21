'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: '📊', desc: 'Overview SAPA' },
  { href: '/dashboard/analytics', label: 'Analitik', icon: '📈', desc: 'Tren & Analitik' },
  { href: '/dashboard/gis', label: 'Peta GIS', icon: '🗺️', desc: 'Peta Interaktif' },
  { href: '/dashboard/laporan', label: 'Laporan AI', icon: '📋', desc: 'Riwayat Query AI' },
];

const SECONDARY_ITEMS = [
  { href: '#ai', label: 'AI Asisten', icon: '🤖', desc: 'Tanya Data' },
  { href: '#ews', label: 'EWS', icon: '⚠️', desc: 'Early Warning' },
];

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col h-full border-r border-[#C6C3B4] bg-[#FFFFFF] transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px]' : 'w-56'
      }`}
    >
      {/* Header — Hamburger + Logo */}
      <div className={`border-b border-[#C6C3B4] ${collapsed ? 'px-2 py-3' : 'px-4 py-4'} bg-[#0F2A1E]`}>
        <div className="flex items-center gap-2.5">
          {/* Hamburger Button */}
          <button
            onClick={onToggle}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 bg-[#1B4332] hover:bg-[#2D6A4F] text-[#C6C3B4] hover:text-white border border-[#2D6A4F]"
            title={collapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
              <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
              <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
            </svg>
          </button>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">Aceh Tengah</h1>
              <p className="text-[10px] text-[#C6C3B4] font-medium">Command Center</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        <p className={`text-[9px] font-bold text-[#767D6F] uppercase tracking-widest mb-2 ${collapsed ? 'text-center px-0' : 'px-3'}`}>
          {collapsed ? '•' : 'Navigasi'}
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm transition-all duration-200 ${
                collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
              } ${
                isActive
                  ? 'bg-[#DCE8DE] text-[#1B4332] border border-[#2D6A4F]/20'
                  : 'text-[#4B5249] hover:bg-[#E9E6DA] hover:text-[#1B4332] border border-transparent'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-[#1B4332]' : 'text-[#4B5249]'}`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-[#767D6F] truncate">{item.desc}</p>
                </div>
              )}
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-[#C6C3B4]">
          <p className={`text-[9px] font-bold text-[#767D6F] uppercase tracking-widest mb-2 ${collapsed ? 'text-center px-0' : 'px-3'}`}>
            {collapsed ? '•' : 'Tools'}
          </p>
          {SECONDARY_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm text-[#4B5249] hover:bg-[#E9E6DA] hover:text-[#1B4332] transition-all duration-200 border border-transparent ${
                collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#4B5249] truncate">{item.label}</p>
                  <p className="text-[10px] text-[#767D6F] truncate">{item.desc}</p>
                </div>
              )}
            </a>
          ))}
        </div>
      </nav>

      {/* System Status */}
      <div className={`border-t border-[#C6C3B4] ${collapsed ? 'px-2 py-3' : 'px-4 py-4 space-y-2'}`}>
        {!collapsed && <p className="text-[9px] font-bold text-[#767D6F] uppercase tracking-widest">Sistem</p>}
        <div className="space-y-1.5">
          <StatusRow label="SAPA" status="●" color="text-[#2D6A4F]" collapsed={collapsed} />
          <StatusRow label="AI" status="●" color="text-[#1B4332]" collapsed={collapsed} />
        </div>
        {!collapsed && <p className="text-[10px] text-[#767D6F] pt-2">Diskominfo Aceh Tengah</p>}
      </div>
    </aside>
  );
}

function StatusRow({ label, status, color, collapsed }: { label: string; status: string; color: string; collapsed: boolean }) {
  if (collapsed) {
    return (
      <div className="flex justify-center" title={`${label}: Active`}>
        <span className={`w-2 h-2 rounded-full ${color.replace('text-', 'bg-')}`} />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-[#767D6F]">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
        <span className={`font-medium ${color}`}>Active</span>
      </div>
    </div>
  );
}
