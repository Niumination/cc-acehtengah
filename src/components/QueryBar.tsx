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
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-5 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs shadow-lg shadow-blue-500/20">
            🤖
          </div>
          <span className="text-xs font-bold text-white">AI Command Center</span>
          <span className="text-[10px] text-slate-500">·</span>
          <span className="text-[10px] text-slate-500">Tanya data SAPA Aceh Tengah</span>
        </div>
        {!isDefaultMode && (
          <button
            onClick={onReset}
            className="text-[10px] text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
          >
            <span>←</span>
            <span>Kembali ke Beranda</span>
          </button>
        )}
      </div>

      {/* Keyword Chips */}
      <div className="px-5 py-3 border-b border-slate-700/30">
        <div className="flex flex-wrap gap-2">
          {KEYWORD_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip.query)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800/80 text-[11px] text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
          className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-600/20 flex items-center gap-2"
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
