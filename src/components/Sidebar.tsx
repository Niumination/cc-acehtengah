'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: '📊', desc: 'Overview SAPA' },
  { href: '/dashboard/analytics', label: 'Analitik', icon: '📈', desc: 'Tren & Analitik' },
  { href: '/dashboard/gis', label: 'Peta GIS', icon: '🗺️', desc: 'Peta Interaktif' },
];

const SECONDARY_ITEMS = [
  { href: '#ai', label: 'AI Asisten', icon: '🤖', desc: 'Tanya Data' },
  { href: '#ews', label: 'EWS', icon: '⚠️', desc: 'Early Warning' },
];

interface SidebarProps {
  collapsed?: boolean;
}

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`flex flex-col h-full border-r bg-slate-900/90 backdrop-blur-sm transition-all duration-300 ease-in-out ${
        collapsed ? 'w-[68px] border-slate-800/80' : 'w-56 border-slate-800/80'
      }`}
    >
      {/* Logo */}
      <div className={`border-b border-slate-800/60 ${collapsed ? 'px-2 py-4' : 'px-5 py-5'}`}>
        {collapsed ? (
          <div className="flex justify-center">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/25">
              CC
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/25 flex-shrink-0">
              CC
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight truncate">Aceh Tengah</h1>
              <p className="text-[10px] text-slate-500 font-medium">Command Center</p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className={`flex-1 py-4 space-y-1 ${collapsed ? 'px-2' : 'px-3'}`}>
        <p className={`text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2 ${collapsed ? 'text-center px-0' : 'px-3'}`}>
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
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>
                    {item.label}
                  </p>
                  <p className="text-[10px] text-slate-600 truncate">{item.desc}</p>
                </div>
              )}
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-slate-800/60">
          <p className={`text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2 ${collapsed ? 'text-center px-0' : 'px-3'}`}>
            {collapsed ? '•' : 'Tools'}
          </p>
          {SECONDARY_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all duration-200 border border-transparent ${
                collapsed ? 'px-2 py-2.5 justify-center' : 'px-3 py-2.5'
              }`}
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-300 truncate">{item.label}</p>
                  <p className="text-[10px] text-slate-600 truncate">{item.desc}</p>
                </div>
              )}
            </a>
          ))}
        </div>
      </nav>

      {/* System Status */}
      <div className={`border-t border-slate-800/60 ${collapsed ? 'px-2 py-3' : 'px-4 py-4 space-y-2'}`}>
        {!collapsed && <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sistem</p>}
        <div className="space-y-1.5">
          <StatusRow label="SAPA" status="●" color="text-emerald-400" collapsed={collapsed} />
          <StatusRow label="AI" status="●" color="text-blue-400" collapsed={collapsed} />
        </div>
        {!collapsed && <p className="text-[10px] text-slate-700 pt-2">Diskominfo Aceh Tengah</p>}
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
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
        <span className={`font-medium ${color}`}>Active</span>
      </div>
    </div>
  );
}
