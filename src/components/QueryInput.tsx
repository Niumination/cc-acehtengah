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
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tanya data daerah... (contoh: bagaimana tren stunting?)"
          className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || text.trim().length < 3}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '⏳...' : '🔍 Tanya'}
        </button>
      </form>

      {/* Contoh Query */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-gray-400 self-center">Contoh:</span>
        {QUERY_EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => setText(q)}
            className="text-xs px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
