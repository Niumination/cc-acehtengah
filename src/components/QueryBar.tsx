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
    <div className="bg-[#FFFFFF] border border-[#9A9683] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-[#9A9683] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center text-xs shadow-lg">
            🤖
          </div>
          <span className="text-xs font-bold text-[#1B4332]">AI Command Center</span>
          <span className="text-[11px] text-[#5C6358]">·</span>
          <span className="text-[11px] text-[#5C6358]">Tanya data SAPA Aceh Tengah</span>
        </div>
        {!isDefaultMode && (
          <button
            onClick={onReset}
            className="text-[11px] text-[#1B4332] hover:text-[#2D6A4F] transition-colors flex items-center gap-1"
          >
            <span>←</span>
            <span>Kembali ke Beranda</span>
          </button>
        )}
      </div>

      {/* Keyword Chips */}
      <div className="px-5 py-3 border-b border-[#9A9683]">
        <div className="flex flex-wrap gap-2">
          {KEYWORD_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip.query)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#E9E6DA] text-[11px] text-[#4B5249] hover:bg-[#DCE8DE] hover:text-[#1B4332] border border-[#9A9683] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
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
          className="flex-1 px-4 py-2 rounded-xl bg-[#F5F3EC] border border-[#9A9683] text-sm text-[#1E2420] placeholder-[#5C6358] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30 focus:border-[#1B4332]/30 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-5 py-2 bg-[#1B4332] text-white rounded-xl text-sm font-medium hover:bg-[#2D6A4F] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#1B4332]/20 flex items-center gap-2"
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
