'use client';

import { useMemo, useState } from 'react';

import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { HybridResponse } from '@/types';

// Palet kategorikal — setiap warna UNIK.
// Palet lama mengulang #2D6A4F, #A15C38, dan #1B4332 masing-masing dua kali,
// sehingga dua seri berbeda bisa tampil berwarna sama (§7.2 #10).
// Urutan disusun agar berdekatan tetap berbeda terang-gelap, membantu pembaca
// dengan defisiensi penglihatan warna.
const COLORS = [
  'var(--brand)', // hijau tua
  'var(--accent)', // terakota
  'var(--brand-soft)', // hijau sedang
  'var(--warning)', // emas tua
  'var(--text-body)', // abu zaitun
  'var(--danger)', // merah
  '#52796F', // hijau kebiruan
  '#6B4E71', // ungu tua
  '#C9803F', // oranye
  '#31708E', // biru
];

interface Props {
  response: HybridResponse;
}

// Tipe konfigurasi visualisasi. Payload berasal dari LLM sehingga bentuknya
// tidak dijamin — karena itu setiap field bersifat opsional dan dibaca defensif,
// bukan di-cast ke `any` (§P1-12).
type ChartDatum = Record<string, string | number | null | undefined>;

interface MetricItem {
  label?: string;
  value?: string | number;
  unit?: string;
}

interface VisualConfig {
  metrics?: MetricItem[];
  columns?: (string | { key?: string; name?: string })[];
  rows?: (Record<string, unknown> | unknown[])[];
  type?: string;
  data?: ChartDatum[];
  xKey?: string;
  lines?: string[];
  bars?: string[];
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  fill?: string;
}

export default function AIResponseRenderer({ response }: Props) {
  const { narasi, visualisasi, rekomendasi } = response;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Query Title */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--brand-deep)] to-[var(--brand)] flex items-center justify-center text-sm">
          📊
        </div>
        <div className="flex-1">
          <h2 className="text-base font-bold text-[var(--brand)]">Hasil Analisis AI</h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            {response.dataSource} · {new Date(response.timestamp).toLocaleString('id-ID')}
          </p>
        </div>

        {/* Ekspor tanpa dependency: memakai dialog cetak peramban.
            Pengguna memilih "Simpan sebagai PDF" di dialog tersebut.
            Gaya cetak diatur di globals.css (@media print). */}
        <button
          type="button"
          onClick={() => window.print()}
          className="no-print rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--brand)] transition-colors hover:bg-[var(--surface-muted)]"
        >
          Simpan sebagai PDF
        </button>
      </div>

      {/* Dynamic Visualization */}
      {visualisasi && visualisasi.tipe !== 'none' && (
        <div className="bg-[var(--surface-card)] border border-[var(--border)] rounded-2xl p-5">
          {visualisasi.tipe === 'metric' && <MetricRenderer config={visualisasi.konfigurasi} />}
          {visualisasi.tipe === 'table' && <TableRenderer config={visualisasi.konfigurasi} />}
          {visualisasi.tipe === 'chart' && <ChartRenderer config={visualisasi.konfigurasi} />}
        </div>
      )}

      {/* Narasi */}
      {narasi && (
        <div className="bg-[var(--surface-card)]/60 border border-[var(--border)] rounded-2xl p-5">
          <p className="text-sm text-[var(--text-body)] leading-relaxed whitespace-pre-wrap">{narasi}</p>
        </div>
      )}

      {/* Rekomendasi */}
      {rekomendasi && rekomendasi.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-[var(--accent)]/20 rounded-2xl p-5 shadow-lg shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-tint)] flex items-center justify-center text-sm">💡</div>
            <p className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider">Rekomendasi AI</p>
          </div>
          <ul className="space-y-2.5 relative">
            {rekomendasi.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[var(--text-body)]">
                <span className="flex-shrink-0 w-5 h-5 rounded-md bg-[var(--accent-tint)] flex items-center justify-center text-[11px] font-bold text-[var(--brand)]">{i + 1}</span>
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Metric Renderer ───
function MetricRenderer({ config }: { config: VisualConfig }) {
  const metrics: MetricItem[] = config?.metrics ?? [];
  if (metrics.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m, i) => (
        <div key={i} className="bg-[var(--surface-muted)] rounded-xl p-4 text-center border border-[var(--border)]">
          <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider mb-1">{m.label}</p>
          <p className="text-xl font-bold text-[var(--brand)]">{m.value}</p>
          {m.unit && <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{m.unit}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Table Renderer ───
function TableRenderer({ config }: { config: VisualConfig }) {
  // Dibungkus useMemo: `?? []` menghasilkan larik baru tiap render sehingga
  // dependensi useMemo di bawah tidak pernah stabil.
  const columns = useMemo(() => config?.columns ?? [], [config?.columns]);
  const rawRows = useMemo(() => config?.rows ?? [], [config?.rows]);

  // Pengurutan & penyaringan tabel (§7.2 #9): tabel hasil AI bisa berisi puluhan
  // baris; tanpa ini pimpinan harus memindai manual.
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [filter, setFilter] = useState('');

  // Handle dua format columns: array of strings ATAU array of objects {key, name}
  const colMeta = useMemo(
    () =>
      columns.map((c) =>
        typeof c === 'string'
          ? { key: c, name: c }
          : { key: c?.key ?? c?.name ?? String(c), name: c?.name ?? c?.key ?? String(c) },
      ),
    [columns],
  );

  const rows = useMemo(() => {
    let hasil = rawRows;

    if (filter.trim()) {
      const q = filter.trim().toLowerCase();
      hasil = hasil.filter((row) =>
        colMeta.some((col, i) => renderCell(row, col, i).toLowerCase().includes(q)),
      );
    }

    if (sortKey) {
      const idx = colMeta.findIndex((c) => c.key === sortKey);
      if (idx !== -1) {
        const col = colMeta[idx];
        hasil = [...hasil].sort((a, b) => {
          const va = renderCell(a, col, idx);
          const vb = renderCell(b, col, idx);
          // Bandingkan sebagai angka bila keduanya numerik, selain itu sebagai teks.
          const na = Number(va.replace(/[^\d.-]/g, ''));
          const nb = Number(vb.replace(/[^\d.-]/g, ''));
          const keduanyaAngka = Number.isFinite(na) && Number.isFinite(nb) && va !== '-' && vb !== '-';
          const cmp = keduanyaAngka ? na - nb : va.localeCompare(vb, 'id');
          return sortAsc ? cmp : -cmp;
        });
      }
    }

    return hasil;
  }, [rawRows, colMeta, filter, sortKey, sortAsc]);

  if (columns.length === 0 || rawRows.length === 0) return null;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div>
      {rawRows.length > 8 && (
        <div className="no-print mb-3 flex flex-wrap items-center gap-2">
          <label htmlFor="filter-tabel" className="sr-only">
            Saring baris tabel
          </label>
          <input
            id="filter-tabel"
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Saring baris…"
            className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-card)] px-3 py-1.5 text-xs text-[var(--text)] placeholder-[var(--text-muted)]"
          />
          <span aria-live="polite" className="text-xs text-[var(--text-muted)]">
            {rows.length} dari {rawRows.length} baris
          </span>
        </div>
      )}

      <div className="max-h-[500px] overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[var(--surface-muted)]">
          <tr className="border-b border-[var(--border)]">
            {colMeta.map((col) => (
              <th
                key={col.key}
                scope="col"
                aria-sort={sortKey === col.key ? (sortAsc ? 'ascending' : 'descending') : 'none'}
                className="whitespace-nowrap px-3 py-2.5 text-left font-semibold text-[var(--text-muted)]"
              >
                <button
                  type="button"
                  onClick={() => toggleSort(col.key)}
                  className="flex items-center gap-1 font-semibold hover:text-[var(--brand)]"
                >
                  {col.name}
                  <span aria-hidden="true" className="text-[10px]">
                    {sortKey === col.key ? (sortAsc ? '▲' : '▼') : '↕'}
                  </span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)] hover:bg-[var(--surface-muted)] transition-colors">
              {colMeta.map((col, ci) => (
                <td key={col.key} className="py-2 px-3 text-[var(--text-body)]">
                  {renderCell(row, col, ci)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

/** Baca satu sel tabel dari baris berbentuk array maupun objek, secara defensif. */
function renderCell(
  row: Record<string, unknown> | unknown[],
  col: { key: string; name: string },
  index: number,
): string {
  const raw = Array.isArray(row) ? row[index] : (row[col.key] ?? row[col.name]);
  if (raw === null || raw === undefined || raw === '') return '-';
  return typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
}

// ─── Chart Renderer ───
function ChartRenderer({ config }: { config: VisualConfig }) {
  const chartType = config?.type ?? 'bar';
  const data: ChartDatum[] = config?.data ?? [];
  const xKey = config?.xKey ?? 'name';
  const lines: string[] = config?.lines ?? config?.bars ?? [];

  if (data.length === 0 || lines.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={350}>
      {chartType === 'line' ? (
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={xKey} stroke="var(--text-muted)" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          {lines.map((line, i) => (
            <Line key={line} type="monotone" dataKey={line} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      ) : chartType === 'area' ? (
        <AreaChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            {lines.map((line, i) => (
              <linearGradient key={line} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.6} />
                <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.05} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={xKey} stroke="var(--text-muted)" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          {lines.map((line, i) => (
            <Area key={line} type="monotone" dataKey={line} stroke={COLORS[i % COLORS.length]} fill={`url(#grad-${i})`} strokeWidth={2} />
          ))}
        </AreaChart>
      ) : chartType === 'pie' || chartType === 'donut' ? (
        <PieChart>
          <Tooltip content={<ChartTooltip />} />
          <Pie
            data={data}
            dataKey={lines[0] ?? 'value'}
            nameKey={xKey}
            cx="50%" cy="50%"
            innerRadius={chartType === 'donut' ? 60 : 0}
            outerRadius={120}
            paddingAngle={2}
            label={({ percent }: { percent?: number }) => `${Math.round((percent ?? 0) * 100)}%`}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      ) : (
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={xKey} stroke="var(--text-muted)" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="var(--text-muted)" tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          {lines.map((bar, i) => (
            <Bar key={bar} dataKey={bar} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

// ─── Chart Tooltip ───
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-2.5 bg-[var(--surface-card)] border border-[var(--border)] rounded-lg shadow-xl text-xs">
      <p className="font-bold text-[var(--brand)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}
