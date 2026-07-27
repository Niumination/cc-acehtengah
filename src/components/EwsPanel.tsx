'use client';

import { useEffect, useState } from 'react';
import { EwsAlertData } from '@/types';

const SEVERITY_STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  CRITICAL: { bg: 'bg-[#E07A5F]/15 border-[#E07A5F]/30', dot: 'bg-red-500', text: 'text-[#E07A5F]' },
  WARNING: { bg: 'bg-[#C97A4A]/15 border-[#C97A4A]/30', dot: 'bg-amber-500', text: 'text-[#D9C284]' },
  INFO: { bg: 'bg-[#D9C284]/10 border-[#D9C284]/30', dot: 'bg-blue-500', text: 'text-[#D9C284]' },
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
      <div className="text-xs text-[#52796F] p-3 text-center animate-pulse">
        Memuat alert...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#8FBC8F] uppercase tracking-wider">
          ⚠️ EWS
        </h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2D6A4F] text-[#6B8F71] border border-[#40916C]">
          {alerts.length} aktif
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-10 h-10 rounded-full bg-[#52B788]/15 flex items-center justify-center mx-auto mb-2">
            <span className="text-[#52B788] text-lg">✓</span>
          </div>
          <p className="text-[11px] text-[#6B8F71]">
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
                <p className="text-[11px] text-[#A7C4A0] leading-relaxed">
                  {alert.pesan}
                </p>
                <p className="text-[10px] text-[#52796F] mt-1.5">
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
