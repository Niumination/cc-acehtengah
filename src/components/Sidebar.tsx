'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda', icon: '📊', desc: 'Overview SAPA' },
  { href: '/dashboard#opd', label: 'Data SAPA', icon: '🏛️', desc: 'OPD & Indikator' },
  { href: '/dashboard#indikator', label: 'Indikator', icon: '📈', desc: 'Tren & Analitik' },
  { href: '/dashboard#ai', label: 'AI Asisten', icon: '🤖', desc: 'Tanya Data' },
  { href: '/dashboard#ews', label: 'EWS', icon: '⚠️', desc: 'Early Warning' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 text-white flex flex-col h-full border-r border-slate-800">
      {/* Branding */}
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-sm font-black shadow-lg shadow-blue-500/20">
            CC
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">KOMANDO AT</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Command Center AI</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 pt-2 pb-1 font-semibold">
          Navigasi
        </p>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200 border border-transparent'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <span className="block font-medium text-xs">{item.label}</span>
                <span className="block text-[10px] text-slate-600">{item.desc}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-green-400 font-medium">Sistem Aktif</span>
        </div>
        <div className="space-y-1 text-[10px] text-slate-600">
          <div className="flex justify-between">
            <span>SAPA API</span>
            <span className="text-green-500">● Connected</span>
          </div>
          <div className="flex justify-between">
            <span>AI Engine</span>
            <span className="text-green-500">● Active</span>
          </div>
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-slate-500">v1.0.0</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-700 mt-2">Diskominfo Aceh Tengah</p>
      </div>
    </aside>
  );
}
