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

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-56 bg-slate-900/90 border-r border-slate-800/80 h-full backdrop-blur-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-black shadow-lg shadow-blue-500/25">
            CC
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">KOMANDO AT</h1>
            <p className="text-[10px] text-slate-500 font-medium">COMMAND CENTER AI</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Navigasi</p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <div className="min-w-0">
                <p className={`text-xs font-semibold truncate ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>
                  {item.label}
                </p>
                <p className="text-[10px] text-slate-600 truncate">{item.desc}</p>
              </div>
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-slate-800/60">
          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest px-3 mb-2">Tools</p>
          {SECONDARY_ITEMS.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 transition-all duration-200 border border-transparent"
            >
              <span className="text-base">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">{item.label}</p>
                <p className="text-[10px] text-slate-600 truncate">{item.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </nav>

      {/* System Status */}
      <div className="px-4 py-4 border-t border-slate-800/60 space-y-2">
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Sistem</p>
        <div className="space-y-1.5">
          <StatusRow label="SAPA API" status="Connected" color="text-emerald-400" />
          <StatusRow label="AI Engine" status="Active" color="text-blue-400" />
          <StatusRow label="Version" status="v1.0.0" color="text-slate-500" />
        </div>
        <p className="text-[10px] text-slate-700 pt-2">Diskominfo Aceh Tengah</p>
      </div>
    </aside>
  );
}

function StatusRow({ label, status, color }: { label: string; status: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-[10px]">
      <span className="text-slate-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${color.replace('text-', 'bg-')}`} />
        <span className={`font-medium ${color}`}>{status}</span>
      </div>
    </div>
  );
}
