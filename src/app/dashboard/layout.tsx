'use client';

import Sidebar from '@/components/Sidebar';
import { LogoMark } from '@/components/brand/Logo';
import React, { useEffect, useState } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--surface)] text-[var(--text)]">
      <div className="hidden h-full flex-shrink-0 md:block print:hidden">
        <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((collapsed) => !collapsed)} />
      </div>

      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Executive shell header: light canvas, dark brand retained as an accent. */}
        <header className="z-20 flex h-[68px] flex-shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface-card)]/95 px-4 backdrop-blur-md md:px-7 print:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <div className="md:hidden"><LogoMark size={34} className="rounded-xl" /></div>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-black tracking-tight text-[var(--brand-deep)]">SAPA Smart AI</h1>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.13em] text-[var(--text-muted)]">Ruang kendali data Kabupaten Aceh Tengah</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden text-right sm:block"><p className="font-mono text-[11px] font-bold text-[var(--brand)]">{currentTime || '--:--:--'}</p><p className="text-[9px] text-[var(--text-muted)]">{currentDate || 'Memuat waktu'}</p></div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-[#D4E6D6] bg-[var(--brand-tint)] px-2.5 py-1.5 text-[10px] font-bold text-[var(--brand)]"><span className="relative flex h-1.5 w-1.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--brand-soft)] opacity-70" /><span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--brand-soft)]" /></span>Online</div>
            <div className="hidden rounded-full border border-[#E8DDBD] bg-[#FCF7E6] px-2.5 py-1.5 text-[10px] font-bold text-[#8A6E1D] sm:block">SAPA Connected</div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto bg-[var(--surface)] px-3 py-4 sm:px-5 md:px-7 md:py-6">
          <div className="mx-auto w-full max-w-[1580px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
