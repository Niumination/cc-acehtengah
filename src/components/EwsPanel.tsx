'use client';

import { useEffect, useState } from 'react';
import { EwsAlertData } from '@/types';

const SEVERITY_STYLES: Record<string, { bg: string; dot: string }> = {
  CRITICAL: { bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  WARNING: { bg: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  INFO: { bg: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
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
    const interval = setInterval(fetchAlerts, 60000); // refresh tiap 1 menit
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="text-xs text-gray-400 p-3 text-center">Memuat alert...</div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-600">⚠️ EWS Alerts</h3>
        <span className="text-xs text-gray-400">{alerts.length} aktif</span>
      </div>

      {alerts.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-4">
          ✅ Semua indikator dalam batas normal
        </p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.INFO;
            return (
              <div
                key={alert.id}
                className={`rounded-lg border p-3 text-xs ${style.bg}`}
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                  <span className="font-semibold">{alert.severity}</span>
                </div>
                <p className="mt-1 text-gray-700">{alert.pesan}</p>
                <p className="mt-1 text-gray-400">
                  {alert.indicator.nama} ({alert.indicator.dataset.nama})
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
