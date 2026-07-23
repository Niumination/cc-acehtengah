'use client';

import Sidebar from '@/components/Sidebar';
import EwsPanel from '@/components/EwsPanel';
import React, { useState, useEffect } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="hidden md:block h-full flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-blue-900/30 border-b border-slate-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-xs font-black shadow-lg shadow-blue-500/20">
              🏛️
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">
                KOMANDO ACEH TENGAH
              </h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                Command Center AI · Diskominfo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 text-sm">
            {/* Live Clock */}
            <div className="text-right">
              <p className="font-mono text-xs text-slate-300">
                {mounted ? currentTime : '--:--:--'}
              </p>
              <p className="text-[10px] text-slate-600">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/30 border border-green-800/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-[11px] text-green-400 font-medium">Online</span>
            </div>

            {/* SAPA Badge */}
            <div className="px-3 py-1.5 rounded-full bg-blue-900/30 border border-blue-800/50">
              <span className="text-[11px] text-blue-400 font-medium">
                📡 SAPA Connected
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>

      {/* EWS Panel */}
      <div className="hidden xl:block w-72 bg-slate-900/80 border-l border-slate-800 p-4 overflow-y-auto flex-shrink-0">
        <EwsPanel />
      </div>
    </div>
  );
}
