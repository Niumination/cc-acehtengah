'use client';

import { useState, useCallback, useRef } from 'react';
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
  const [statusText, setStatusText] = useState<string | null>(null);
  const [liveNarasi, setLiveNarasi] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveNarasiRef = useRef('');

  const handleQuery = useCallback(async (query: string) => {
    // Abort previous request if any
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    try {
      setIsLoading(true);
      setError(null);
      setAiResponse(null);
      liveNarasiRef.current = '';
      setLiveNarasi('');
      setStatusText('Menganalisis pertanyaan...');
      setMode('ai-response');

      const controller = new AbortController();
      abortRef.current = controller;
      timeoutRef.current = setTimeout(() => controller.abort(), 45000);

      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.error ?? `HTTP ${res.status}`);
      }

      // SSE stream reader
      const reader = res.body?.getReader();
      if (!reader) throw new Error('Streaming tidak tersedia');

      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: HybridResponse | null = null;
      let streamError: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? '';

        for (const eventBlock of events) {
          const eventLines = eventBlock.split('\n');
          let eventName = 'message';
          let eventData = '';

          for (const line of eventLines) {
            if (line.startsWith('event:')) eventName = line.slice(6).trim();
            else if (line.startsWith('data:')) eventData += line.slice(5).trim();
          }

          if (!eventData) continue;

          try {
            const payload = JSON.parse(eventData);
            if (eventName === 'status') {
              setStatusText(payload.status ?? null);
            } else if (eventName === 'narasi') {
              liveNarasiRef.current = payload.text ?? '';
              setLiveNarasi(liveNarasiRef.current);
            } else if (eventName === 'result') {
              finalResult = payload as HybridResponse;
            } else if (eventName === 'error') {
              streamError = payload.error ?? 'Terjadi kesalahan';
            }
          } catch {
            // Skip malformed JSON (partial chunks)
          }
        }
      }

      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      if (streamError) throw new Error(streamError);

      if (finalResult) {
        setAiResponse(finalResult);
      } else if (liveNarasiRef.current) {
        // Fallback: narasi streaming tanpa JSON lengkap — build minimal response
        setAiResponse({
          narasi: liveNarasiRef.current,
          visualisasi: { tipe: 'none', konfigurasi: {} },
          dataSource: 'SAPA Aceh Tengah (api-splp.layanan.go.id)',
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error('AI tidak mengembalikan respons');
      }

      setStatusText(null);
      liveNarasiRef.current = '';
      setLiveNarasi('');
    } catch (err) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      const isAbort = err instanceof Error && err.name === 'AbortError';
      const errMsg = isAbort
        ? 'AI membutuhkan waktu terlalu lama (45 detik). Coba pertanyaan yang lebih singkat.'
        : `Terjadi kesalahan: ${err instanceof Error ? err.message : 'tidak diketahui'}`;
      setError(errMsg);
      setMode('ai-response');
      setAiResponse(null);
      liveNarasiRef.current = '';
      setLiveNarasi('');
      setStatusText(null);
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setMode('default');
    setAiResponse(null);
    setError(null);
    liveNarasiRef.current = '';
    setLiveNarasi('');
    setStatusText(null);
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
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <p className="text-sm text-[var(--danger)] mb-4">{error}</p>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-[var(--brand)] text-[var(--on-brand)] text-sm rounded-lg hover:bg-[var(--brand-soft)]"
          >
            Kembali ke Beranda
          </button>
        </div>
      )}

      {mode === 'ai-response' && !isLoading && aiResponse && (
        <AIResponseRenderer response={aiResponse} />
      )}

      {mode === 'ai-response' && isLoading && (
        <div className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-2xl p-12 text-center">
          <div className="w-12 h-12 border-4 border-[var(--brand)]/20 border-t-[var(--brand)] rounded-full animate-spin mx-auto mb-4" style={{ animation: 'spin 0.8s linear infinite' }} />
          <p className="text-sm text-[var(--text-muted)]">{statusText ?? 'AI sedang menganalisis data SAPA...'}</p>
          {liveNarasi ? (
            <div className="mt-4 max-w-2xl mx-auto text-left">
              <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-xl p-4">
                <p className="text-sm text-[var(--text-body)] leading-relaxed whitespace-pre-wrap">
                  {liveNarasi}
                  <span className="inline-block w-2 h-4 bg-[var(--brand)] ml-0.5 animate-pulse" />
                </p>
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[var(--text-body)] mt-1">Memproses permintaan Anda</p>
          )}
        </div>
      )}
    </div>
  );
}
