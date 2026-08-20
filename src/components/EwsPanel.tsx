'use client';

// ─── Panel Early Warning System ───
//
// Tiga state dibedakan secara eksplisit (LAPORAN_AUDIT_PRODUCTION_READINESS.md §P1-07):
//   loading     → sedang memuat
//   unavailable → sistem tidak dapat dihubungi, status indikator TIDAK diketahui
//   ok          → data valid (termasuk "0 alert" yang berarti benar-benar aman)
//
// Sebelumnya state `unavailable` tidak ada: kegagalan DB tampil sebagai
// "Semua indikator dalam batas normal" — memberi rasa aman yang palsu.

import { useEffect, useState } from 'react';
import { EwsAlertData } from '@/types';

type PanelState =
  | { kind: 'loading' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'ok'; alerts: EwsAlertData[] };

const SEVERITY_STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  CRITICAL: { bg: 'bg-[#FBE3DE] border-[#B3261E]/20', dot: 'bg-[#B3261E]', text: 'text-[#B3261E]' },
  WARNING: { bg: 'bg-[#F3DCC9] border-[#A15C38]/20', dot: 'bg-[#A15C38]', text: 'text-[#8A6E1D]' },
  INFO: { bg: 'bg-[#DCE8DE] border-[#9A9683]', dot: 'bg-[#2D6A4F]', text: 'text-[#1B4332]' },
};

const REFRESH_MS = 60_000;

export default function EwsPanel() {
  const [state, setState] = useState<PanelState>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch('/api/ews')
        .then(async (res) => ({ ok: res.ok, body: await res.json() }))
        .then(({ ok, body }) => {
          if (cancelled) return;
          if (!ok || body.status === 'unavailable' || !Array.isArray(body.alerts)) {
            setState({
              kind: 'unavailable',
              message: body?.error ?? 'Status indikator tidak diketahui.',
            });
            return;
          }
          setState({ kind: 'ok', alerts: body.alerts as EwsAlertData[] });
        })
        .catch(() => {
          if (cancelled) return;
          setState({ kind: 'unavailable', message: 'Tidak dapat menghubungi server EWS.' });
        });
    };

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const badge =
    state.kind === 'ok'
      ? `${state.alerts.length} aktif`
      : state.kind === 'unavailable'
        ? 'tidak diketahui'
        : 'memuat…';

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#5C6358]">
          <span aria-hidden="true">⚠️</span> Peringatan Dini
        </h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            state.kind === 'unavailable'
              ? 'border-[#B3261E]/30 bg-[#FBE3DE] text-[#B3261E]'
              : 'border-[#9A9683] bg-[#E9E6DA] text-[#5C6358]'
          }`}
        >
          {badge}
        </span>
      </div>

      {state.kind === 'loading' && (
        <p role="status" className="p-3 text-center text-xs text-[#4B5249]">
          Memuat peringatan…
        </p>
      )}

      {state.kind === 'unavailable' && (
        <div
          role="alert"
          className="rounded-xl border border-[#B3261E]/30 bg-[#FBE3DE] p-3 text-center"
        >
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#B3261E]/10">
            <span aria-hidden="true" className="text-lg text-[#B3261E]">
              !
            </span>
          </div>
          <p className="text-xs font-semibold text-[#B3261E]">Status tidak diketahui</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[#4B5249]">{state.message}</p>
        </div>
      )}

      {state.kind === 'ok' && state.alerts.length === 0 && (
        <div className="py-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#DCE8DE]">
            <span aria-hidden="true" className="text-lg text-[#2D6A4F]">
              ✓
            </span>
          </div>
          <p className="text-xs text-[#5C6358]">Semua indikator dalam batas normal</p>
        </div>
      )}

      {state.kind === 'ok' && state.alerts.length > 0 && (
        <ul className="max-h-[500px] space-y-2 overflow-y-auto pr-1">
          {state.alerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.INFO;
            return (
              <li key={alert.id} className={`rounded-xl border p-3 ${style.bg}`}>
                <div className="mb-1 flex items-center gap-2">
                  <span aria-hidden="true" className={`h-2 w-2 rounded-full ${style.dot}`} />
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider ${style.text}`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-[#4B5249]">{alert.pesan}</p>
                <p className="mt-1.5 text-[11px] text-[#5C6358]">
                  {alert.indicator.nama} — {alert.indicator.dataset.nama}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
