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
        <div className="bg-[#FFFFFF] border border-[#C6C3B4] rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-[#B3261E] mb-4">{error}</p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-[#1B4332] text-white text-sm rounded-lg hover:bg-[#2D6A4F]"
          >
            Kembali ke Beranda
          </button>
        </div>
      )}

      {mode === 'ai-response' && !isLoading && aiResponse && (
        <AIResponseRenderer response={aiResponse} />
      )}

      {mode === 'ai-response' && isLoading && (
        <div className="bg-[#E9E6DA] border border-[#C6C3B4] rounded-2xl p-12 text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-[#767D6F]">AI sedang menganalisis data SAPA...</p>
          <p className="text-[10px] text-[#4B5249] mt-1">Memproses permintaan Anda</p>
        </div>
      )}
    </div>
  );
}
