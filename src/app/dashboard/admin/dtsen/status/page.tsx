'use client';

import { useState, useEffect, useCallback } from 'react';

interface RilisInfo {
  id: string;
  releaseNumber: string;
  status: string;
  versi: string;
  jalur: string;
  sourceSlug?: string;
  totalBaris: number;
  ditolak: number;
  uploadedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
  individu?: number;
  agregat?: number;
}

interface SumberInfo {
  slug: string;
  nama: string;
  sensitivity: string;
  provenanceLabel: string | null;
  ownerInstansi: string | null;
  rilis: RilisInfo[];
}

const STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  PUBLISHED: { bg: '#DCE8DE', color: '#1B4332', label: '● Aktif' },
  STAGING: { bg: '#FFF4D6', color: '#8A6E1D', label: '◐ Staging' },
  SUPERSEDED: { bg: '#E9E6DA', color: '#767D6F', label: '○ Digantikan' },
};

const SENS_LABEL: Record<string, string> = {
  PUBLIC: 'Publik',
  RESTRICTED_AGGR: 'Terbatas (agregat)',
  RESTRICTED_PERSONAL: 'Terbatas (personal)',
};

export default function StatusSumberPage() {
  const [data, setData] = useState<{ ringkasan: any; sumber: SumberInfo[]; rilis: RilisInfo[] } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(true);

  const fetchStatus = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/dtsen/status');
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Gagal memuat status');
      setData(d);
    } catch (e: any) {
      setError(e.message ?? 'Gagal memuat status sumber.');
      if (String(e.message).includes('login')) window.location.href = '/login';
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#8A6E1D', marginBottom: '4px' }}>
            🗂️ Status Sumber Data
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1E2420', margin: '0 0 6px' }}>Sumber & Rilis Tersimpan</h1>
          <p style={{ color: '#767D6F', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Registry seluruh sumber data (SAPA, DTSEN, Bapokting, Dokumen) + rilis yang tersimpan di warehouse.
          </p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={busy}
          style={{ padding: '8px 16px', borderRadius: '8px', background: '#1B4332', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', opacity: busy ? 0.6 : 1 }}
        >
          🔄 Segarkan
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '10px', background: '#FDE8E8', color: '#B3261E', border: '1px solid #B3261E', marginBottom: '16px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* Ringkasan */}
      {data?.ringkasan && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total Sumber', value: data.ringkasan.totalSumber, icon: '🗃️' },
            { label: 'Total Rilis', value: data.ringkasan.totalRilis, icon: '📦' },
            { label: 'Rilis Aktif', value: data.ringkasan.rilisAktif, icon: '🟢' },
            { label: 'Individu Tersimpan', value: data.ringkasan.totalIndividu.toLocaleString('id-ID'), icon: '👥' },
            { label: 'Kelompok Agregat', value: data.ringkasan.totalAgregat.toLocaleString('id-ID'), icon: '📊' },
          ].map((k) => (
            <div key={k.label} style={{ background: '#FFFFFF', border: '1px solid #C6C3B4', borderRadius: '14px', padding: '14px 16px' }}>
              <div style={{ fontSize: '1.3rem' }}>{k.icon}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1B4332' }}>{k.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#767D6F', fontWeight: 600 }}>{k.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Per Sumber */}
      {data?.sumber.map((s) => (
        <div key={s.slug} style={{ background: '#FFFFFF', border: '1px solid #C6C3B4', borderRadius: '16px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#1E2420', margin: 0 }}>
                {s.nama}
                <span style={{ marginLeft: '8px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#E9E6DA', color: '#4B5249', verticalAlign: 'middle' }}>
                  {s.slug}
                </span>
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#767D6F' }}>
                {SENS_LABEL[s.sensitivity] ?? s.sensitivity} · {s.ownerInstansi ?? '-'}
              </p>
              {s.provenanceLabel && (
                <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#8A6E1D', fontStyle: 'italic' }}>{s.provenanceLabel}</p>
              )}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#767D6F', fontWeight: 600 }}>
              {s.rilis.length} rilis
            </div>
          </div>

          {s.rilis.length === 0 ? (
            <p style={{ fontSize: '0.82rem', color: '#767D6F', fontStyle: 'italic' }}>Belum ada rilis tersimpan untuk sumber ini.</p>
          ) : (
            <table className="w-full text-xs" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #C6C3B4', textAlign: 'left', color: '#767D6F' }}>
                  <th style={{ padding: '8px', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '8px', fontWeight: 700 }}>Release</th>
                  <th style={{ padding: '8px', fontWeight: 700 }}>Versi</th>
                  <th style={{ padding: '8px', fontWeight: 700 }}>Baris</th>
                  <th style={{ padding: '8px', fontWeight: 700 }}>Individu</th>
                  <th style={{ padding: '8px', fontWeight: 700 }}>Agregat</th>
                  <th style={{ padding: '8px', fontWeight: 700 }}>Diunggah</th>
                  <th style={{ padding: '8px', fontWeight: 700 }}>Dipublish</th>
                </tr>
              </thead>
              <tbody>
                {s.rilis.map((r) => {
                  const st = STATUS_STYLE[r.status] ?? { bg: '#E9E6DA', color: '#767D6F', label: r.status };
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #E9E6DA' }}>
                      <td style={{ padding: '8px' }}>
                        <span style={{ background: st.bg, color: st.color, padding: '2px 10px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: 600, color: '#1E2420' }}>{r.releaseNumber}</td>
                      <td style={{ padding: '8px', color: '#4B5249' }}>{r.versi}</td>
                      <td style={{ padding: '8px', color: '#4B5249' }}>{r.totalBaris.toLocaleString('id-ID')}</td>
                      <td style={{ padding: '8px', color: '#4B5249' }}>{(r.individu ?? 0).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '8px', color: '#4B5249' }}>{(r.agregat ?? 0).toLocaleString('id-ID')}</td>
                      <td style={{ padding: '8px', color: '#767D6F' }}>{r.uploadedBy ?? '-'}</td>
                      <td style={{ padding: '8px', color: '#767D6F' }}>{fmt(r.publishedAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Legenda SUPERSEDED */}
      <div style={{ background: '#F5F3EC', border: '1px dashed #C6C3B4', borderRadius: '12px', padding: '14px 18px', fontSize: '0.8rem', color: '#4B5249', lineHeight: 1.6 }}>
        <strong style={{ color: '#1B4332' }}>📌 Apa itu status rilis?</strong>
        <ul style={{ margin: '8px 0 0', paddingLeft: '20px' }}>
          <li><strong>● Aktif (PUBLISHED)</strong> — rilis yang sedang dipakai untuk menjawab query. Hanya satu rilis per sumber yang aktif secara logika.</li>
          <li><strong>◐ Staging (STAGING)</strong> — hasil impor yang belum dipublish; menunggu tinjauan.</li>
          <li><strong>○ Digantikan (SUPERSEDED)</strong> — rilis lama yang otomatis diganti saat rilis baru dipublish. Ini <em>bukan</em> penghapusan: datanya tetap tersimpan untuk audit, tapi query memakai rilis terbaru (data lebih lengkap/terbaru).</li>
        </ul>
        <p style={{ margin: '8px 0 0' }}>💡 Rilis dari <strong>sumber berbeda</strong> (mis. DTSEN BAPPEDA + DTSEN SPLP API) tetap bisa hadir bersamaan di pipeline AI — penggabungan lintas sumber terjadi di lapisan query, bukan dengan mem-publish dua rilis dari sumber yang sama.</p>
      </div>
    </div>
  );
}
