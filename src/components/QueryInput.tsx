'use client';

import { useState } from 'react';

interface QueryInputProps {
  onQuery: (query: string) => void;
  isLoading: boolean;
}

const QUERY_EXAMPLES = [
  'Bagaimana tren stunting 3 bulan terakhir?',
  'SKPK mana yang serapan anggarannya masih rendah?',
  'Berapa angka kemiskinan saat ini?',
  'Tampilkan perbandingan realisasi anggaran per SKPK',
];

export default function QueryInput({ onQuery, isLoading }: QueryInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim().length >= 3) {
      onQuery(text.trim());
    }
  };

  return (
    <div className="bg-[#FFFFFF] rounded-xl p-4 shadow-sm border border-[#C6C3B4]">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tanya data daerah... (contoh: bagaimana tren stunting?)"
          className="flex-1 px-4 py-2.5 border border-[#C6C3B4] rounded-lg bg-[#E9E6DA] text-sm text-[#1E2420] placeholder-[#767D6F] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || text.trim().length < 3}
          className="px-5 py-2.5 bg-[#FFFFFF] text-[#1E2420] rounded-lg text-sm font-medium hover:bg-[#E9E6DA] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[#C6C3B4]"
        >
          {isLoading ? '⏳...' : '🔍 Tanya'}
        </button>
      </form>

      {/* Contoh Query */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-[#767D6F] self-center">Contoh:</span>
        {QUERY_EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => setText(q)}
            className="text-xs px-2.5 py-1 rounded-full bg-[#E9E6DA] text-[#767D6F] hover:bg-[#DCE8DE] hover:text-[#1B4332] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
