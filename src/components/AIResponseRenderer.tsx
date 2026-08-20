'use client';

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
  '#1B4332', // hijau tua
  '#A15C38', // terakota
  '#2D6A4F', // hijau sedang
  '#8A6E1D', // emas tua
  '#4B5249', // abu zaitun
  '#B3261E', // merah
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
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0F2A1E] to-[#1B4332] flex items-center justify-center text-sm">
          📊
        </div>
        <div>
          <h2 className="text-base font-bold text-[#1B4332]">Hasil Analisis AI</h2>
          <p className="text-[11px] text-[#5C6358]">
            {response.dataSource} · {new Date(response.timestamp).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Dynamic Visualization */}
      {visualisasi && visualisasi.tipe !== 'none' && (
        <div className="bg-[#FFFFFF] border border-[#9A9683] rounded-2xl p-5">
          {visualisasi.tipe === 'metric' && <MetricRenderer config={visualisasi.konfigurasi} />}
          {visualisasi.tipe === 'table' && <TableRenderer config={visualisasi.konfigurasi} />}
          {visualisasi.tipe === 'chart' && <ChartRenderer config={visualisasi.konfigurasi} />}
        </div>
      )}

      {/* Narasi */}
      {narasi && (
        <div className="bg-[#FFFFFF]/60 border border-[#9A9683] rounded-2xl p-5">
          <p className="text-sm text-[#4B5249] leading-relaxed whitespace-pre-wrap">{narasi}</p>
        </div>
      )}

      {/* Rekomendasi */}
      {rekomendasi && rekomendasi.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-[#A15C38]/20 rounded-2xl p-5 shadow-lg shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#F3DCC9] flex items-center justify-center text-sm">💡</div>
            <p className="text-xs font-bold text-[#1B4332] uppercase tracking-wider">Rekomendasi AI</p>
          </div>
          <ul className="space-y-2.5 relative">
            {rekomendasi.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[#4B5249]">
                <span className="flex-shrink-0 w-5 h-5 rounded-md bg-[#F3DCC9] flex items-center justify-center text-[11px] font-bold text-[#1B4332]">{i + 1}</span>
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
        <div key={i} className="bg-[#E9E6DA] rounded-xl p-4 text-center border border-[#9A9683]">
          <p className="text-[11px] text-[#5C6358] uppercase tracking-wider mb-1">{m.label}</p>
          <p className="text-xl font-bold text-[#1B4332]">{m.value}</p>
          {m.unit && <p className="text-[11px] text-[#5C6358] mt-0.5">{m.unit}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Table Renderer ───
function TableRenderer({ config }: { config: VisualConfig }) {
  const columns = config?.columns ?? [];
  const rawRows = config?.rows ?? [];

  if (columns.length === 0 || rawRows.length === 0) return null;

  // Handle dua format columns: array of strings ATAU array of objects {key, name}
  const colMeta = columns.map((c) =>
    typeof c === 'string' ? { key: c, name: c } : { key: c?.key ?? c?.name ?? String(c), name: c?.name ?? c?.key ?? String(c) }
  );

  return (
    <div className="overflow-x-auto max-h-[500px]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[#E9E6DA]">
          <tr className="border-b border-[#9A9683]">
            {colMeta.map((col) => (
              <th key={col.key} className="text-left py-2.5 px-3 font-semibold text-[#5C6358] whitespace-nowrap">
                {col.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rawRows.map((row, i) => (
            <tr key={i} className="border-b border-[#9A9683] hover:bg-[#E9E6DA] transition-colors">
              {colMeta.map((col, ci) => (
                <td key={col.key} className="py-2 px-3 text-[#4B5249]">
                  {renderCell(row, col, ci)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
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
          <CartesianGrid strokeDasharray="3 3" stroke="#9A9683" />
          <XAxis dataKey={xKey} stroke="#5C6358" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="#5C6358" tick={{ fontSize: 11 }} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="#9A9683" />
          <XAxis dataKey={xKey} stroke="#5C6358" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="#5C6358" tick={{ fontSize: 11 }} />
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
          <CartesianGrid strokeDasharray="3 3" stroke="#9A9683" />
          <XAxis dataKey={xKey} stroke="#5C6358" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
          <YAxis stroke="#5C6358" tick={{ fontSize: 11 }} />
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
    <div className="p-2.5 bg-[#FFFFFF] border border-[#9A9683] rounded-lg shadow-xl text-xs">
      <p className="font-bold text-[#1B4332] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}
