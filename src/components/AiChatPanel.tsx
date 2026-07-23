'use client';

import { useState, useRef, useEffect } from 'react';
import { HybridResponse } from '@/types';
import MetricCard from './MetricCard';

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
      });
      const data: HybridResponse = await res.json();

      const aiMsg: ChatMessage = {
        role: 'assistant',
        content: data.narasi,
        response: data,
        timestamp: data.timestamp,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Maaf, terjadi kesalahan. Silakan coba lagi.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai" className="bg-slate-900/80 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-700/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm shadow-lg shadow-blue-500/20">
          🤖
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">AI Asisten SAPA</h2>
          <p className="text-[11px] text-slate-500">
            Tanya data pembangunan Aceh Tengah secara natural
          </p>
        </div>
        {isLoading && (
          <div className="ml-auto flex items-center gap-2 text-blue-400 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            Memproses...
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="h-[400px] overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl mb-4">
              💬
            </div>
            <h3 className="text-sm font-semibold text-slate-300 mb-1">
              Mulai Percakapan
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-6">
              Tanyakan apa saja tentang data pembangunan Kabupaten Aceh Tengah.
              AI akan menjawab berdasarkan data SAPA real-time.
            </p>
            <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-left text-xs px-3 py-2.5 rounded-xl bg-slate-800/80 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700/50 transition-all duration-200"
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
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-200 border border-slate-700/50'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>

              {/* Visualisasi from AI */}
              {msg.response?.visualisasi &&
                msg.response.visualisasi.tipe !== 'none' && (
                  <div className="mt-3 pt-3 border-t border-slate-700/30">
                    {msg.response.visualisasi.tipe === 'table' && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-700/50">
                              {(
                                msg.response.visualisasi.konfigurasi.columns ?? []
                              ).map((col: string) => (
                                <th
                                  key={col}
                                  className="text-left py-1.5 px-2 font-medium text-slate-400"
                                >
                                  {col}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {(
                              msg.response.visualisasi.konfigurasi.rows ?? []
                            ).slice(0, 10).map((row: Record<string, string>, i: number) => (
                              <tr
                                key={i}
                                className="border-b border-slate-700/30"
                              >
                                {(
                                  msg.response!.visualisasi.konfigurasi.columns ?? []
                                ).map((col: string) => (
                                  <td key={col} className="py-1.5 px-2">
                                    {row[col] ?? '-'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {msg.response.visualisasi.tipe === 'metric' && (
                      <div className="grid grid-cols-2 gap-2">
                        {(
                          msg.response.visualisasi.konfigurasi.metrics ?? []
                        ).map((m: any) => (
                          <div
                            key={m.label}
                            className="bg-slate-700/30 rounded-lg p-2 text-center"
                          >
                            <p className="text-[10px] text-slate-400">
                              {m.label}
                            </p>
                            <p className="text-sm font-bold text-white">
                              {m.value}
                            </p>
                            {m.unit && (
                              <p className="text-[10px] text-slate-500">
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
                  <div className="mt-3 pt-3 border-t border-slate-700/30">
                    <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-1.5">
                      💡 Rekomendasi
                    </p>
                    <ul className="space-y-1">
                      {msg.response.rekomendasi.map((r, i) => (
                        <li
                          key={i}
                          className="text-xs text-slate-400 flex gap-1.5"
                        >
                          <span className="text-slate-600">{i + 1}.</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              <p className="text-[10px] text-slate-600 mt-2">
                {msg.response?.dataSource
                  ? `Sumber: ${msg.response.dataSource}`
                  : new Date(msg.timestamp).toLocaleTimeString('id-ID')}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-800 border border-slate-700/50 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span className="text-xs">Menganalisis data SAPA...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-900/50">
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
            className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700/50 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-600/20"
          >
            {isLoading ? '⏳' : '➤'}
          </button>
        </form>
        <p className="text-[10px] text-slate-600 mt-2 text-center">
          Didukung oleh SAPA Kabupaten Aceh Tengah & OpenCode Zen AI
        </p>
      </div>
    </div>
  );
}
