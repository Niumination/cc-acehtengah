'use client';

// ─── Pengalih tema terang/gelap ───
//
// Dibutuhkan ruang kendali/videotron yang minim cahaya (§7.2 #8).
// Preferensi disimpan di localStorage; bila belum pernah dipilih, mengikuti
// setelan sistem (prefers-color-scheme).

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
export const THEME_STORAGE_KEY = 'cc-theme';

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Baca tema yang sudah dipasang skrip anti-kedip di <head>.
  // Dijadwalkan lewat timer agar setState tidak sinkron di body effect
  // (react-hooks/set-state-in-effect).
  useEffect(() => {
    const id = setTimeout(() => {
      setTheme((document.documentElement.dataset.theme as Theme | undefined) ?? 'light');
    }, 0);
    return () => clearTimeout(id);
  }, []);

  const toggle = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Mode privat / storage diblokir — tema tetap berlaku untuk sesi ini.
    }
  };

  // Sebelum mount, jangan render label agar tidak terjadi ketidakcocokan hidrasi.
  const gelap = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={gelap ? 'Beralih ke tema terang' : 'Beralih ke tema gelap'}
      aria-pressed={gelap}
      title={gelap ? 'Tema terang' : 'Tema gelap'}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--brand-soft)] text-[var(--on-brand-muted)] transition-colors hover:bg-[var(--brand)]"
    >
      <span aria-hidden="true" className="text-sm">
        {theme === null ? '◐' : gelap ? '☀' : '☾'}
      </span>
    </button>
  );
}
