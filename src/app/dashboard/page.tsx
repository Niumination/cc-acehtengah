'use client';

import { useState, useEffect } from 'react';
import QueryInput from '@/components/QueryInput';
import HybridRenderer from '@/components/HybridRenderer';
import MetricCard from '@/components/MetricCard';
import { HybridResponse } from '@/types';

export default function DashboardPage() {
  const [response, setResponse] = useState<HybridResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState({ datasets: 0, lastSync: '-' });

  useEffect(() => {
    // Fetch dashboard stats
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => {
        setStats({
          datasets: d.services?.db === 'ok' ? 8 : 0,
          lastSync: d.timestamp ? new Date(d.timestamp).toLocaleString('id-ID') : '-',
        });
      })
      .catch(() => {});
  }, []);

  const handleQuery = async (query: string) => {
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      setResponse(data);
    } catch {
      setResponse({
        narasi: 'Maaf, terjadi kesalahan saat memproses pertanyaan. Silakan coba lagi.',
        visualisasi: { tipe: 'none', konfigurasi: {} },
        dataSource: 'offline',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard label="Dataset SAPA" value={stats.datasets} icon="📦" color="blue" />
        <MetricCard label="SKPK Terdaftar" value="8" icon="🏛️" color="green" />
        <MetricCard label="Last Sync" value={stats.lastSync.split(',')[0] ?? '-'} icon="🔄" color="amber" />
        <MetricCard label="Status Sistem" value="🟢 Online" icon="⚡" color="green" />
      </div>

      {/* AI Query */}
      <QueryInput onQuery={handleQuery} isLoading={isLoading} />

      {/* Response */}
      <HybridRenderer response={response} isLoading={isLoading} />
    </div>
  );
}
