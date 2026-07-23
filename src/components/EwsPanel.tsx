'use client';

import { useEffect, useState } from 'react';
import { EwsAlertData } from '@/types';

const SEVERITY_STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  CRITICAL: { bg: 'bg-red-900/30 border-red-800/50', dot: 'bg-red-500', text: 'text-red-400' },
  WARNING: { bg: 'bg-amber-900/30 border-amber-800/50', dot: 'bg-amber-500', text: 'text-amber-400' },
  INFO: { bg: 'bg-blue-900/30 border-blue-800/50', dot: 'bg-blue-500', text: 'text-blue-400' },
};

export default function EwsPanel() {
  const [alerts, setAlerts] = useState<EwsAlertData[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      const res = await fetch('/api/ews');
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-xs text-slate-600 p-3 text-center animate-pulse">
        Memuat alert...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          ⚠️ EWS
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 border border-slate-700">
          {alerts.length} aktif
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center mx-auto mb-2">
            <span className="text-green-500 text-lg">✓</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Semua indikator dalam batas normal
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.INFO;
            return (
              <div
                key={alert.id}
                className={`rounded-xl border p-3 ${style.bg} transition-all duration-200 hover:scale-[1.02]`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-2 h-2 rounded-full ${style.dot} ${alert.severity === 'CRITICAL' ? 'animate-pulse' : ''}`} />
                  <span className={`text-[10px] font-bold ${style.text} uppercase tracking-wider`}>
                    {alert.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {alert.pesan}
                </p>
                <p className="text-[10px] text-slate-600 mt-1.5">
                  {alert.indicator.nama} — {alert.indicator.dataset.nama}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
