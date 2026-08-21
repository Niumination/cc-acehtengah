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

interface EwsAlertRow {
  id: string;
  pesan: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  nilaiAktual: number;
  batas: number;
  tahun: string | null;
  createdAt: string;
  indicator: { id: number; nama: string; satuan: string | null };
}

type PanelState =
  | { kind: 'loading' }
  | { kind: 'unavailable'; message: string }
  // thresholdCount = 0 berarti BELUM ADA yang dipantau — berbeda maknanya
  // dari "0 alert" yang berarti benar-benar aman. UI membedakan keduanya.
  | { kind: 'ok'; alerts: EwsAlertRow[]; thresholdCount: number };

const SEVERITY_STYLES: Record<string, { bg: string; dot: string; text: string }> = {
  CRITICAL: { bg: 'bg-[var(--danger-tint)] border-[var(--danger)]/20', dot: 'bg-[var(--danger)]', text: 'text-[var(--danger)]' },
  WARNING: { bg: 'bg-[var(--accent-tint)] border-[var(--accent)]/20', dot: 'bg-[var(--accent)]', text: 'text-[var(--warning)]' },
  INFO: { bg: 'bg-[var(--brand-tint)] border-[var(--border)]', dot: 'bg-[var(--brand-soft)]', text: 'text-[var(--brand)]' },
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
          setState({
            kind: 'ok',
            alerts: body.alerts as EwsAlertRow[],
            thresholdCount: Number(body.thresholdCount ?? 0),
          });
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
      ? state.thresholdCount === 0
        ? 'belum dipantau'
        : `${state.alerts.length} aktif`
      : state.kind === 'unavailable'
        ? 'tidak diketahui'
        : 'memuat…';

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
          <span aria-hidden="true">⚠️</span> Peringatan Dini
        </h2>
        <span
          className={`rounded-full border px-2 py-0.5 text-[11px] ${
            state.kind === 'unavailable'
              ? 'border-[var(--danger)]/30 bg-[var(--danger-tint)] text-[var(--danger)]'
              : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-muted)]'
          }`}
        >
          {badge}
        </span>
      </div>

      {state.kind === 'loading' && (
        <p role="status" className="p-3 text-center text-xs text-[var(--text-body)]">
          Memuat peringatan…
        </p>
      )}

      {state.kind === 'unavailable' && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--danger)]/30 bg-[var(--danger-tint)] p-3 text-center"
        >
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--danger)]/10">
            <span aria-hidden="true" className="text-lg text-[var(--danger)]">
              !
            </span>
          </div>
          <p className="text-xs font-semibold text-[var(--danger)]">Status tidak diketahui</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-body)]">{state.message}</p>
        </div>
      )}

      {/* Belum ada ambang batas: "0 alert" TIDAK boleh dibaca sebagai aman. */}
      {state.kind === 'ok' && state.thresholdCount === 0 && (
        <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning-tint)] p-3 text-center">
          <p className="text-xs font-semibold text-[var(--warning)]">Belum ada indikator dipantau</p>
          <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-body)]">
            Tetapkan ambang batas terlebih dahulu agar peringatan dini dapat bekerja.
            Sampai saat itu, layar ini <strong>tidak</strong> berarti kondisi aman.
          </p>
        </div>
      )}

      {state.kind === 'ok' && state.thresholdCount > 0 && state.alerts.length === 0 && (
        <div className="py-6 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--brand-tint)]">
            <span aria-hidden="true" className="text-lg text-[var(--brand-soft)]">
              ✓
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            {state.thresholdCount} indikator dipantau — semuanya dalam batas normal
          </p>
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
                <p className="text-xs leading-relaxed text-[var(--text-body)]">{alert.pesan}</p>
                <p className="mt-1.5 text-[11px] text-[var(--text-muted)]">
                  {alert.indicator.nama}
                  {alert.tahun ? ` · ${alert.tahun}` : ''} · aktual{' '}
                  {alert.nilaiAktual.toLocaleString('id-ID')} vs batas{' '}
                  {alert.batas.toLocaleString('id-ID')}
                  {alert.indicator.satuan ? ` ${alert.indicator.satuan}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
