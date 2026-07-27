'use client';

import Sidebar from '@/components/Sidebar';
import EwsPanel from '@/components/EwsPanel';
import React, { useState, useEffect, useCallback } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState('');
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [ewsOpen, setEwsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F3EC] text-[#1E2420]">
      {/* Sidebar */}
      <div className="hidden md:block h-full flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {/* Header — dark forest, matches cc.acehtengahkab.go.id */}
        <header className="bg-[#0F2A1E] border-b border-[#1B4332] px-4 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 bg-[#1B4332] hover:bg-[#2D6A4F] text-[#C6C3B4] hover:text-white border border-[#2D6A4F]"
              title={sidebarCollapsed ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                {sidebarCollapsed ? (
                  <>
                    <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
                    <rect x="2" y="7" width="8" height="2" rx="1" fill="currentColor" />
                    <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
                  </>
                ) : (
                  <>
                    <rect x="2" y="3" width="12" height="2" rx="1" fill="currentColor" />
                    <rect x="2" y="7" width="12" height="2" rx="1" fill="currentColor" />
                    <rect x="2" y="11" width="12" height="2" rx="1" fill="currentColor" />
                  </>
                )}
              </svg>
            </button>

            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-lg flex-shrink-0 bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] shadow-[#1B4332]/20 text-white">
              🏛️
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-white">
                Aceh Tengah Command Center
              </h1>
              <p className="text-[10px] uppercase tracking-widest text-[#C6C3B4]">
                Diskominfo · AI-Powered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {/* Live Clock */}
            <div className="text-right">
              <p className="font-mono text-xs text-[#C6C3B4]">
                {mounted ? currentTime : '--:--:--'}
              </p>
              <p className="text-[10px] text-[#767D6F]">
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#2D6A4F]/30 border border-[#2D6A4F]/50">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52B788] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#52B788]" />
              </span>
              <span className="text-[11px] font-medium text-[#52B788]">Online</span>
            </div>

            {/* SAPA Badge */}
            <div className="px-3 py-1.5 rounded-full bg-[#D9C284]/15 border border-[#D9C284]/30">
              <span className="text-[11px] font-medium text-[#D9C284]">
                📡 SAPA Connected
              </span>
            </div>
          </div>
        </header>

        {/* Content — light background */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#F5F3EC]">
          {children}
        </main>

        {/* EWS Toggle Button */}
        <button
          onClick={() => setEwsOpen((o) => !o)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 w-6 h-14 rounded-l-lg flex items-center justify-center transition-all duration-200 shadow-lg ${
            ewsOpen
              ? 'hidden'
              : 'bg-[#FFFFFF] hover:bg-[#E9E6DA] text-[#767D6F] hover:text-[#1B4332] border border-r-0 border-[#C6C3B4]'
          }`}
          title="Tampilkan panel EWS"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 3 4 6 9 9" />
          </svg>
        </button>
      </div>

      {/* EWS Panel — slide in/out */}
      <div
        className={`h-full flex-shrink-0 overflow-hidden transition-all duration-300 ease-in-out ${
          ewsOpen ? 'w-72' : 'w-0'
        }`}
      >
        <div className="w-72 h-full border-l border-[#C6C3B4] p-4 overflow-y-auto bg-[#FFFFFF]">
          <div className="flex items-center justify-between mb-3">
            <EwsPanel />
            <button
              onClick={() => setEwsOpen(false)}
              className="ml-2 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors bg-[#E9E6DA] hover:bg-[#C6C3B4] text-[#767D6F] hover:text-[#1B4332]"
              title="Tutup panel EWS"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
