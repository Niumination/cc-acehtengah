'use client';

import { useState, useCallback } from 'react';
import QueryBar from '@/components/QueryBar';
import DefaultDashboard from '@/components/SapaStats';
import AIResponseRenderer from '@/components/AIResponseRenderer';
import { HybridResponse } from '@/types';

type DashboardMode = 'default' | 'ai-response';

export default function DashboardPage() {
  const [mode, setMode] = useState<DashboardMode>('default');
  const [isLoading, setIsLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<HybridResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleQuery = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(120000),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: HybridResponse = await res.json();
      setAiResponse(data);
      setMode('ai-response');
    } catch (err: any) {
      const errMsg = err.name === 'TimeoutError'
        ? 'AI membutuhkan waktu terlalu lama. Coba pertanyaan yang lebih singkat.'
        : `Terjadi kesalahan: ${err.message}`;
      setError(errMsg);
      setMode('ai-response');
      setAiResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setMode('default');
    setAiResponse(null);
    setError(null);
  }, []);

  return (
    <div className="space-y-5">
      {/* Query Bar — ALWAYS visible */}
      <QueryBar
        onQuery={handleQuery}
        isLoading={isLoading}
        onReset={handleReset}
        isDefaultMode={mode === 'default'}
      />

      {/* Content Area — switches between default and AI response */}
      {mode === 'default' && <DefaultDashboard />}

      {mode === 'ai-response' && !isLoading && error && (
        <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-red-400 mb-4">{error}</p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500"
          >
            Kembali ke Beranda
          </button>
        </div>
      )}

      {mode === 'ai-response' && !isLoading && aiResponse && (
        <AIResponseRenderer response={aiResponse} />
      )}

      {mode === 'ai-response' && isLoading && (
        <div className="bg-slate-900/80 border border-slate-700/50 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400">AI sedang menganalisis data SAPA...</p>
          <p className="text-[10px] text-slate-600 mt-1">Memproses permintaan Anda</p>
        </div>
      )}
    </div>
  );
}
