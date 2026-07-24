'use client';

import Sidebar from '@/components/Sidebar';
import EwsPanel from '@/components/EwsPanel';
import React, { useState, useEffect, useCallback } from 'react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState('');
  const [mounted, setMounted] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [ewsOpen, setEwsOpen] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setMounted(true);
    setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme === 'light');
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const isDark = theme === 'dark';

  return (
    <div className={`flex h-screen overflow-hidden transition-colors duration-300 ${
      isDark ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Sidebar */}
      <div className="hidden md:block h-full flex-shrink-0">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative">
        {/* Header */}
        <header className={`border-b px-4 py-3 flex items-center justify-between flex-shrink-0 transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-r from-slate-900 via-slate-900 to-blue-900/30 border-slate-800'
            : 'bg-gradient-to-r from-white via-white to-blue-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setSidebarCollapsed((c) => !c)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-600 hover:text-slate-900 border border-slate-300'
              }`}
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

            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shadow-lg flex-shrink-0 ${
              isDark
                ? 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/20 text-white'
                : 'bg-gradient-to-br from-blue-500 to-blue-700 shadow-blue-500/20 text-white'
            }`}>
              🏛️
            </div>
            <div>
              <h1 className={`text-sm font-bold tracking-wide ${isDark ? 'text-white' : 'text-slate-900'}`}>
                Aceh Tengah Command Center
              </h1>
              <p className={`text-[10px] uppercase tracking-widest ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
                Diskominfo · AI-Powered
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {/* Live Clock */}
            <div className="text-right">
              <p className={`font-mono text-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {mounted ? currentTime : '--:--:--'}
              </p>
              <p className={`text-[10px] ${isDark ? 'text-slate-600' : 'text-slate-400'}`}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300'
              }`}
              title={isDark ? 'Ganti ke mode terang' : 'Ganti ke mode gelap'}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>

            {/* Connection Status */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              isDark ? 'bg-green-900/30 border border-green-800/50' : 'bg-green-100 border border-green-200'
            }`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className={`text-[11px] font-medium ${isDark ? 'text-green-400' : 'text-green-700'}`}>Online</span>
            </div>

            {/* SAPA Badge */}
            <div className={`px-3 py-1.5 rounded-full ${
              isDark ? 'bg-blue-900/30 border border-blue-800/50' : 'bg-blue-100 border border-blue-200'
            }`}>
              <span className={`text-[11px] font-medium ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                📡 SAPA Connected
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className={`flex-1 overflow-y-auto p-6 transition-colors duration-300 ${
          isDark ? 'bg-slate-950' : 'bg-slate-50'
        }`}>
          {children}
        </main>

        {/* EWS Toggle Button */}
        <button
          onClick={() => setEwsOpen((o) => !o)}
          className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 w-6 h-14 rounded-l-lg flex items-center justify-center transition-all duration-200 shadow-lg ${
            ewsOpen
              ? 'hidden'
              : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-r-0 border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 border border-r-0 border-slate-300'
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
        <div className={`w-72 h-full border-l p-4 overflow-y-auto ${
          isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <EwsPanel />
            <button
              onClick={() => setEwsOpen(false)}
              className={`ml-2 w-6 h-6 rounded flex items-center justify-center flex-shrink-0 transition-colors ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-800'
              }`}
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
