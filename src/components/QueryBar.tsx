'use client';

import { useState } from 'react';

interface QueryBarProps {
  onQuery: (query: string) => void;
  isLoading: boolean;
  onReset: () => void;
  isDefaultMode: boolean;
}

const KEYWORD_CHIPS = [
  { label: '🏛️ Jumlah ASN', query: 'berapa jumlah ASN di aceh tengah' },
  { label: '👶 Stunting', query: 'berapa jumlah balita stunting di aceh tengah' },
  { label: '🌾 Pertanian', query: 'bagaimana data pertanian di aceh tengah' },
  { label: '📚 Pendidikan', query: 'bagaimana data pendidikan di aceh tengah' },
  { label: '🏥 Kesehatan', query: 'bagaimana data kesehatan di aceh tengah' },
  { label: '💼 Tenaga Kerja', query: 'berapa jumlah tenaga kerja di aceh tengah' },
  { label: '📊 Semua OPD', query: 'apa saja OPD yang ada di aceh tengah' },
  { label: '📈 Tren Data', query: 'bagaimana tren data sapa di aceh tengah' },
];

export default function QueryBar({ onQuery, isLoading, onReset, isDefaultMode }: QueryBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onQuery(input.trim());
      setInput('');
    }
  };

  const handleChipClick = (query: string) => {
    if (!isLoading) {
      onQuery(query);
    }
  };

  return (
    <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--brand)] to-[var(--brand-soft)] flex items-center justify-center text-xs shadow-lg">
            🤖
          </div>
          <span className="text-xs font-bold text-[var(--brand)]">AI Command Center</span>
          <span className="text-[11px] text-[var(--text-muted)]">·</span>
          <span className="text-[11px] text-[var(--text-muted)]">Tanya data SAPA Aceh Tengah</span>
        </div>
        {!isDefaultMode && (
          <button
            onClick={onReset}
            className="text-[11px] text-[var(--brand)] hover:text-[var(--brand-soft)] transition-colors flex items-center gap-1"
          >
            <span>←</span>
            <span>Kembali ke Beranda</span>
          </button>
        )}
      </div>

      {/* Keyword Chips */}
      <div className="px-5 py-3 border-b border-[var(--border)]">
        <div className="flex flex-wrap gap-2">
          {KEYWORD_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip.query)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[var(--surface-muted)] text-[11px] text-[var(--text-body)] hover:bg-[var(--brand-tint)] hover:text-[var(--brand)] border border-[var(--border)] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <form onSubmit={handleSubmit} className="px-5 py-3 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pertanyaan tentang data Aceh Tengah..."
          className="flex-1 px-4 py-2 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-sm text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/30 focus:border-[var(--brand)]/30 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-2 bg-[var(--brand)] text-[var(--on-brand)] rounded-xl text-sm font-medium hover:bg-[var(--brand-soft)] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[var(--brand)]/20 flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Memproses</span>
            </>
          ) : (
            <>
              <span>Tanya</span>
              <span>→</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
