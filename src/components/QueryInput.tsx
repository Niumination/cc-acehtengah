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
    <div className="bg-[#1B4332] rounded-xl p-4 shadow-sm border border-[#40916C]/50">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tanya data daerah... (contoh: bagaimana tren stunting?)"
          className="flex-1 px-4 py-2.5 border border-[#40916C]/50 rounded-lg bg-[#2D6A4F] text-sm text-[#C8DFC8] placeholder-[#6B8F71] focus:outline-none focus:ring-2 focus:ring-[#D9C284]/50 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || text.trim().length < 3}
          className="px-5 py-2.5 bg-[#1B4332] text-[#C8DFC8] rounded-lg text-sm font-medium hover:bg-[#2D6A4F] disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-[#40916C]/50"
        >
          {isLoading ? '⏳...' : '🔍 Tanya'}
        </button>
      </form>

      {/* Contoh Query */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-[#6B8F71] self-center">Contoh:</span>
        {QUERY_EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => setText(q)}
            className="text-xs px-2.5 py-1 rounded-full bg-[#2D6A4F]/50 text-[#8FBC8F] hover:bg-[#D9C284]/15 hover:text-[#D9C284] transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
