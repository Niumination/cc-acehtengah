'use client';

import { useState, useRef, useEffect } from 'react';
import { HybridResponse } from '@/types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  response?: HybridResponse;
  timestamp: string;
}

const SUGGESTIONS = [
  'Apa saja OPD yang ada di Aceh Tengah?',
  'Berapa total data indikator di SAPA?',
  'Bagaimana distribusi indikator per tahun?',
  'OPD mana yang paling banyak indikatornya?',
];

export default function AiChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (query: string) => {
    if (!query.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      content: query.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
        signal: AbortSignal.timeout(120000), // 120s for AI reasoning
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: HybridResponse = await res.json();

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: data.narasi || 'Tidak ada jawaban dari AI.',
        response: data,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg = err.name === 'TimeoutError'
        ? 'Maaf, AI membutuhkan waktu terlalu lama. Coba pertanyaan yang lebih singkat.'
        : `Maaf, terjadi kesalahan: ${err.message || 'Unknown error'}. Silakan coba lagi.`;
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: errMsg,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  /** Render table visualization — supports both array rows and object rows */
  const renderTable = (config: any) => {
    const columns: string[] = config.columns ?? [];
    const rawRows: any[] = config.rows ?? [];

    if (columns.length === 0 || rawRows.length === 0) return null;

    return (
      <div className="overflow-x-auto max-h-[300px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[#E9E6DA]">
            <tr className="border-b border-[#C6C3B4]">
              {columns.map((col: string) => (
                <th key={col} className="text-left py-1.5 px-2 font-medium text-[#767D6F] whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rawRows.slice(0, 20).map((row: any, i: number) => (
              <tr key={i} className="border-b border-[#C6C3B4]">
                {columns.map((col: string, ci: number) => (
                  <td key={col} className="py-1.5 px-2">
                    {/* Support both array rows and object rows */}
                    {Array.isArray(row) ? (row[ci] ?? '-') : (row[col] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div id="ai" className="bg-[#FFFFFF] border border-[#C6C3B4] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#C6C3B4] flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0F2A1E] to-[#2D6A4F] flex items-center justify-center text-sm shadow-lg shadow-[#1B4332]/10">
          🤖
        </div>
        <div>
          <h2 className="text-sm font-bold text-[#1B4332]">AI Asisten SAPA</h2>
          <p className="text-[11px] text-[#767D6F]">
            Tanya data pembangunan Aceh Tengah secara natural
          </p>
        </div>
        {isLoading && (
          <div className="ml-auto flex items-center gap-2 text-[#1B4332] text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Memproses...
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="h-[400px] overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#E9E6DA] flex items-center justify-center text-3xl mb-4">
              💬
            </div>
            <h3 className="text-sm font-semibold text-[#4B5249] mb-1">
              Mulai Percakapan
            </h3>
            <p className="text-xs text-[#767D6F] max-w-md mb-6">
              Tanyakan apa saja tentang data pembangunan Kabupaten Aceh Tengah.
              AI akan menjawab berdasarkan data SAPA real-time.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs px-3 py-2.5 rounded-xl bg-[#E9E6DA] text-[#767D6F] hover:bg-[#C6C3B4] hover:text-[#1E2420] border border-[#C6C3B4] transition-all duration-200"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-[#1B4332] text-white'
                  : 'bg-[#FFFFFF] text-[#1E2420] border border-[#C6C3B4]'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

              {/* Visualisasi from AI */}
              {msg.response?.visualisasi &&
                msg.response.visualisasi.tipe !== 'none' && (
                  <div className="mt-3 pt-3 border-t border-[#C6C3B4]">
                    {msg.response.visualisasi.tipe === 'table' && (
                      renderTable(msg.response.visualisasi.konfigurasi)
                    )}
                    {msg.response.visualisasi.tipe === 'metric' && (
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          msg.response.visualisasi.konfigurasi.metrics ?? []
                        ).map((m: any) => (
                          <div
                            key={m.label}
                            className="bg-[#C6C3B4]/30 rounded-lg p-2 text-center"
                          >
                            <p className="text-[10px] text-[#767D6F]">
                              {m.label}
                            </p>
                            <p className="text-sm font-bold text-[#1B4332]">
                              {m.value}
                            </p>
                            {m.unit && (
                              <p className="text-[10px] text-[#767D6F]">
                                {m.unit}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              {/* Rekomendasi */}
              {msg.response?.rekomendasi &&
                msg.response.rekomendasi.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#C6C3B4]">
                    <p className="text-[10px] font-semibold text-[#1B4332] uppercase tracking-wider mb-1.5">
                      💡 Rekomendasi
                    </p>
                    <ul className="space-y-1">
                      {msg.response.rekomendasi.map((r, i) => (
                        <li
                          key={i}
                          className="text-xs text-[#767D6F] flex gap-1.5"
                        >
                          <span className="text-[#4B5249]">{i + 1}.</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              <p className="text-[10px] text-[#4B5249] mt-2">
                {msg.response?.dataSource
                  ? `Sumber: ${msg.response.dataSource}`
                  : new Date(msg.timestamp).toLocaleTimeString('id-ID')}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-[#FFFFFF] border border-[#C6C3B4] rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-[#767D6F]">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5F3EC]0 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5F3EC]0 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F5F3EC]0 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="text-xs">Menganalisis data SAPA...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-[#C6C3B4] bg-[#0F2A1E]/70">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend(input);
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tanya tentang data Aceh Tengah..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#F5F3EC] border border-[#C6C3B4] text-sm text-[#1E2420] placeholder-[#767D6F] focus:outline-none focus:ring-2 focus:ring-[#1B4332]/30 focus:border-[#1B4332]/30 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 bg-[#1B4332] text-white rounded-xl text-sm font-medium hover:bg-[#2D6A4F] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#1B4332]/20"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </form>
        <p className="text-[10px] text-[#4B5249] mt-2 text-center">
          Didukung oleh SAPA Kabupaten Aceh Tengah & OpenCode Zen AI
        </p>
      </div>
    </div>
  );
}
