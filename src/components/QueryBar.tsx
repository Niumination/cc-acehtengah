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
    <div className="bg-[#FFFFFF] border border-[#C6C3B4] rounded-2xl overflow-hidden">
      {/* Header — centered, judul + subtext bertumpuk */}
      <div className="px-5 pt-5 pb-3 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] flex items-center justify-center text-sm shadow-lg">
            🤖
          </div>
          <span className="text-base font-bold text-[#1B4332]">SAPA Smart AI</span>
        </div>
        <span className="text-xs text-[#767D6F]">Tanya data SAPA Aceh Tengah</span>
        {!isDefaultMode && (
          <button
            onClick={onReset}
            className="absolute right-5 top-5 text-[10px] text-[#1B4332] hover:text-[#2D6A4F] transition-colors flex items-center gap-1"
          >
            <span>←</span>
            <span>Kembali ke Beranda</span>
          </button>
        )}
      </div>

      {/* Keyword Chips — centered */}
      <div className="px-5 py-3">
        <div className="flex flex-wrap gap-2 justify-center">
          {KEYWORD_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip.query)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-lg bg-[#E9E6DA] text-[11px] text-[#4B5249] hover:bg-[#DCE8DE] hover:text-[#1B4332] border border-[#C6C3B4] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input + Button — centered, button di bawah */}
      <form onSubmit={handleSubmit} className="px-5 pb-5 pt-1 flex flex-col items-center gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ketik pertanyaan tentang data Aceh Tengah..."
          className="w-full max-w-2xl px-5 py-3 rounded-xl bg-[#F5F3EC] border border-[#C6C3B4] text-base text-[#1E2420] placeholder-[#767D6F] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30 focus:border-[#1B4332]/30 transition-all"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="w-full max-w-2xl px-5 py-3 bg-[#1B4332] text-white rounded-xl text-base font-semibold hover:bg-[#2D6A4F] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#1B4332]/20 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
