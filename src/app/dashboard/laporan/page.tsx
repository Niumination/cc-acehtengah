'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface LogEntry {
  id: string;
  query: string;
  intent: string | null;
  aiResponse: {
    narasi: string;
    visualisasi?: { tipe: string };
    rekomendasi?: string[];
    dataSource: string;
    timestamp: string;
  } | null;
  metadata: {
    opdFilter?: string;
    totalData?: number;
    filteredCount?: number;
    matchedCount?: number;
    error?: string;
  } | null;
  createdAt: string;
}

interface StatsEntry {
  intent: string;
  count: number;
}

const INTENT_LABELS: Record<string, string> = {
  tren: '📈 Tren',
  perbandingan: '⚖️ Perbandingan',
  nilai_saat_ini: '📊 Nilai Saat Ini',
  rekomendasi: '💡 Rekomendasi',
  ews: '⚠️ EWS',
  umum: '💬 Umum',
  error: '❌ Error',
};

export default function LaporanPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<StatsEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [intentFilter, setIntentFilter] = useState('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Paginasi (§P2-18). Sebelumnya `limit: '200'` dipatok mati tanpa navigasi,
  // sehingga log ke-201 dan seterusnya tidak pernah bisa dilihat sama sekali.
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  // Setiap perubahan filter mengembalikan tampilan ke halaman pertama, agar
  // pengguna tidak terjebak pada offset yang sudah melewati jumlah hasil baru.
  // Dilakukan di handler — BUKAN di useEffect turunan — supaya tidak memicu
  // cascading render (react-hooks/set-state-in-effect).
  const applyFilter = useCallback(<T,>(setter: (value: T) => void) => {
    return (value: T) => {
      setter(value);
      setPage(0);
    };
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (intentFilter !== 'all') params.set('intent', intentFilter);
      if (searchFilter) params.set('search', searchFilter);
      if (dateFrom) params.set('from', new Date(dateFrom).toISOString());
      if (dateTo) params.set('to', new Date(dateTo + 'T23:59:59').toISOString());

      const res = await fetch(`/api/chat-logs?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setStats(data.stats || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }, [intentFilter, searchFilter, dateFrom, dateTo, page]);

  // Dijadwalkan lewat microtask agar setState tidak dipanggil sinkron di body
  // effect (react-hooks/set-state-in-effect).
  useEffect(() => {
    const id = setTimeout(() => { void fetchLogs(); }, 0);
    return () => clearTimeout(id);
  }, [fetchLogs]);

  // Export ke CSV
  const exportCSV = () => {
    const headers = ['Waktu', 'Pertanyaan', 'Kategori', 'Ringkasan Jawaban', 'Sumber', 'Metadata'];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toLocaleString('id-ID'),
      `"${l.query.replace(/"/g, '""')}"`,
      INTENT_LABELS[l.intent || ''] || l.intent || '-',
      `"${(l.aiResponse?.narasi || '').substring(0, 200).replace(/"/g, '""')}"`,
      l.aiResponse?.dataSource || '-',
      `"${JSON.stringify(l.metadata || {})}"`,
    ]);

    // Catatan: mengekspor HALAMAN yang sedang tampil, bukan seluruh riwayat.
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan-ai-hal${page + 1}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getIntentColor = (intent: string | null) => {
    const colors: Record<string, string> = {
      tren: 'var(--brand)', perbandingan: 'var(--brand-soft)', nilai_saat_ini: 'var(--warning)',
      rekomendasi: 'var(--accent)', ews: 'var(--danger)', umum: 'var(--text-muted)', error: 'var(--danger)',
    };
    return colors[intent || ''] || 'var(--text-muted)';
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', animation: 'fadeIn 0.3s ease-out' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--warning)', marginBottom: '4px' }}>
            📋 Laporan & Monitoring
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 6px' }}>
            Riwayat AI Query
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Setiap pertanyaan dan respon AI terekam otomatis. Filter, cari, dan export untuk bahan evaluasi.
          </p>
        </div>
        <button
          onClick={async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.replace('/login');
            router.refresh();
          }}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--danger)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', whiteSpace: 'nowrap', marginTop: '4px' }}
        >
          🚪 Logout
        </button>
      </div>

      {/* Stats bar */}
      {stats.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'var(--brand-soft)', color: '#fff', fontWeight: 700, fontSize: '0.82rem' }}>
            Total: {total.toLocaleString('id-ID')} kueri
          </div>
          {stats.map((s) => (
            <div key={s.intent} style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '0.78rem',
              background: s.intent === 'error' ? 'var(--danger-tint)' : 'var(--surface-muted)',
              color: getIntentColor(s.intent), fontWeight: 600,
              border: `1px solid ${getIntentColor(s.intent)}20`,
            }}>
              {INTENT_LABELS[s.intent] || s.intent}: {s.count}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px', alignItems: 'center' }}>
        <input
          placeholder="Cari pertanyaan..."
          value={searchFilter}
          onChange={(e) => applyFilter(setSearchFilter)(e.target.value)}
          style={{
            padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem', flex: 1, minWidth: '180px',
            outline: 'none',
          }}
        />
        <select
          value={intentFilter}
          onChange={(e) => applyFilter(setIntentFilter)(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem', fontWeight: 600 }}
        >
          <option value="all">Semua Kategori</option>
          {Object.entries(INTENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => applyFilter(setDateFrom)(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>s/d</span>
        <input type="date" value={dateTo} onChange={(e) => applyFilter(setDateTo)(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.82rem' }} />
        <button onClick={fetchLogs}
          style={{ padding: '8px 16px', borderRadius: '8px', background: 'var(--brand)', color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          🔍 Cari
        </button>
        <button onClick={exportCSV}
          style={{ padding: '8px 16px', borderRadius: '8px', background: '#D9C284', color: 'var(--text)', border: 'none', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}>
          ⬇ Export CSV
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⏳</div>
          Memuat riwayat query...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '20px', borderRadius: '12px', background: 'var(--danger-tint)', color: 'var(--danger)', border: '1px solid var(--danger)30', textAlign: 'center' }}>
          ❌ {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && logs.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🤖</div>
          <h3 style={{ color: 'var(--text)', margin: '0 0 6px' }}>Belum Ada Riwayat Query</h3>
          <p style={{ fontSize: '0.9rem' }}>
            Setelah AI Command Center digunakan, riwayat pertanyaan akan muncul di sini secara otomatis.
          </p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && logs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div key={entry.id} style={{
                borderRadius: '12px', border: '1px solid var(--border)',
                background: 'var(--surface-card)', overflow: 'hidden',
                transition: 'box-shadow 0.2s',
              }}>
                {/* Collapsed row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  style={{
                    padding: '14px 18px', cursor: 'pointer',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      {entry.intent && <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '1px 8px', borderRadius: '4px',
                        background: entry.intent === 'error' ? 'var(--danger-tint)' : 'var(--surface-muted)',
                        color: getIntentColor(entry.intent),
                        border: `1px solid ${getIntentColor(entry.intent)}40`,
                      }}>
                        {INTENT_LABELS[entry.intent] || entry.intent}
                      </span>}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {new Date(entry.createdAt).toLocaleString('id-ID')}
                      </span>
                      {entry.metadata?.error && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>❌ Error</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4 }}>
                      {entry.query}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {entry.aiResponse?.visualisasi?.tipe && entry.aiResponse.visualisasi.tipe !== 'none' && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--surface-muted)', padding: '2px 8px', borderRadius: '4px' }}>
                        {entry.aiResponse.visualisasi.tipe === 'table' ? '📊' : entry.aiResponse.visualisasi.tipe === 'chart' ? '📈' : entry.aiResponse.visualisasi.tipe === 'metric' ? '📏' : '🗺️'}
                      </span>
                    )}
                    <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(90deg)' : 'none' }}>›</span>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div style={{ padding: '0 18px 16px', borderTop: '1px solid var(--surface-muted)' }}>
                    {entry.aiResponse?.narasi && (
                      <div style={{ margin: '12px 0', padding: '12px', borderRadius: '8px', background: 'var(--surface)', fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text)' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--warning)', marginBottom: '6px' }}>JAWABAN AI</div>
                        {entry.aiResponse.narasi}
                      </div>
                    )}

                    {entry.aiResponse?.rekomendasi && entry.aiResponse.rekomendasi.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '4px' }}>💡 REKOMENDASI</div>
                        {entry.aiResponse.rekomendasi.map((r, i) => (
                          <div key={i} style={{ fontSize: '0.82rem', color: 'var(--text)', padding: '2px 0' }}>{i + 1}. {r}</div>
                        ))}
                      </div>
                    )}

                    {entry.metadata && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        {entry.metadata.opdFilter && <span>🏢 Filter OPD: {entry.metadata.opdFilter}</span>}
                        {entry.metadata.totalData !== undefined && <span>📦 Total data: {entry.metadata.totalData}</span>}
                        {entry.metadata.filteredCount !== undefined && <span>🔍 Terfilter: {entry.metadata.filteredCount}</span>}
                        {entry.metadata.matchedCount !== undefined && <span>🎯 Cocok: {entry.metadata.matchedCount}</span>}
                        {entry.metadata.error && <span style={{ color: 'var(--danger)' }}>❌ {entry.metadata.error}</span>}
                      </div>
                    )}

                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      ID: {entry.id} | Sumber: {entry.aiResponse?.dataSource || '-'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* Navigasi halaman */}
      {total > PAGE_SIZE && (
        <nav
          aria-label="Navigasi halaman laporan"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '20px',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
            Menampilkan{' '}
            <strong>
              {total === 0 ? 0 : page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)}
            </strong>{' '}
            dari {total.toLocaleString('id-ID')} kueri
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
              style={paginationButtonStyle(page === 0 || loading)}
            >
              ← Sebelumnya
            </button>
            <span
              aria-live="polite"
              style={{ fontSize: '0.82rem', color: 'var(--text-body)', minWidth: '96px', textAlign: 'center' }}
            >
              Hal {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={(page + 1) * PAGE_SIZE >= total || loading}
              style={paginationButtonStyle((page + 1) * PAGE_SIZE >= total || loading)}
            >
              Berikutnya →
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}

function paginationButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '8px 14px',
    borderRadius: '8px',
    border: '1px solid var(--border-strong)',
    background: disabled ? 'var(--surface-muted)' : 'var(--surface-card)',
    color: disabled ? 'var(--border-strong)' : 'var(--brand)',
    fontSize: '0.82rem',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}
