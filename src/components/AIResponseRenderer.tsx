'use client';

import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { HybridResponse } from '@/types';

const COLORS = ['#D9C284', '#52B788', '#C97A4A', '#E07A5F', '#6B8F71', '#2D6A4F', '#C97A4A', '#8FBC8F', '#D9C284', '#52796F'];

interface Props {
  response: HybridResponse;
}

export default function AIResponseRenderer({ response }: Props) {
  const { narasi, visualisasi, rekomendasi } = response;

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Query Title */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1B4332] to-[#52B788] flex items-center justify-center text-sm">
          📊
        </div>
        <div>
          <h2 className="text-base font-bold text-white">Hasil Analisis AI</h2>
          <p className="text-[10px] text-[#6B8F71]">
            {response.dataSource} · {new Date(response.timestamp).toLocaleString('id-ID')}
          </p>
        </div>
      </div>

      {/* Dynamic Visualization */}
      {visualisasi && visualisasi.tipe !== 'none' && (
        <div className="bg-[#1B4332]/80 border border-[#40916C]/50 rounded-2xl p-5">
          {visualisasi.tipe === 'metric' && <MetricRenderer config={visualisasi.konfigurasi} />}
          {visualisasi.tipe === 'table' && <TableRenderer config={visualisasi.konfigurasi} />}
          {visualisasi.tipe === 'chart' && <ChartRenderer config={visualisasi.konfigurasi} />}
        </div>
      )}

      {/* Narasi */}
      {narasi && (
        <div className="bg-[#1B4332]/60 border border-[#40916C]/30 rounded-2xl p-5">
          <p className="text-sm text-[#A7C4A0] leading-relaxed whitespace-pre-wrap">{narasi}</p>
        </div>
      )}

      {/* Rekomendasi */}
      {rekomendasi && rekomendasi.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-amber-500/10 border border-[#C97A4A]/30 rounded-2xl p-5 shadow-lg shadow-amber-500/5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -translate-y-16 translate-x-16 blur-2xl" />
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[#C97A4A]/15 flex items-center justify-center text-sm">💡</div>
            <p className="text-xs font-bold text-[#D9C284] uppercase tracking-wider">Rekomendasi AI</p>
          </div>
          <ul className="space-y-2.5 relative">
            {rekomendasi.map((r, i) => (
              <li key={i} className="flex gap-2.5 text-sm text-[#A7C4A0]">
                <span className="flex-shrink-0 w-5 h-5 rounded-md bg-[#C97A4A]/15 flex items-center justify-center text-[10px] font-bold text-[#D9C284]">{i + 1}</span>
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
function MetricRenderer({ config }: { config: any }) {
  const metrics = config?.metrics ?? [];
  if (metrics.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {metrics.map((m: any, i: number) => (
        <div key={i} className="bg-[#2D6A4F]/60 rounded-xl p-4 text-center border border-[#40916C]/30">
          <p className="text-[10px] text-[#6B8F71] uppercase tracking-wider mb-1">{m.label}</p>
          <p className="text-xl font-bold text-white">{m.value}</p>
          {m.unit && <p className="text-[10px] text-[#6B8F71] mt-0.5">{m.unit}</p>}
        </div>
      ))}
    </div>
  );
}

// ─── Table Renderer ───
function TableRenderer({ config }: { config: any }) {
  const columns: string[] = config?.columns ?? [];
  const rawRows: any[] = config?.rows ?? [];

  if (columns.length === 0 || rawRows.length === 0) return null;

  return (
    <div className="overflow-x-auto max-h-[500px]">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-[#2D6A4F]/90">
          <tr className="border-b border-[#40916C]/50">
            {columns.map((col: string) => (
              <th key={col} className="text-left py-2.5 px-3 font-semibold text-[#8FBC8F] whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rawRows.map((row: any, i: number) => (
            <tr key={i} className="border-b border-[#40916C]/30 hover:bg-[#2D6A4F]/40 transition-colors">
              {columns.map((col: string, ci: number) => (
                <td key={col} className="py-2 px-3 text-[#A7C4A0]">
                  {Array.isArray(row) ? (row[ci] ?? '-') : (row[col] ?? '-')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Chart Renderer ───
function ChartRenderer({ config }: { config: any }) {
  const chartType = config?.type ?? 'bar';
  const data = config?.data ?? [];
  const xKey = config?.xKey ?? 'name';
  const lines = config?.lines ?? config?.bars ?? [];

  if (data.length === 0 || lines.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={350}>
      {chartType === 'line' ? (
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#40916C/40" />
          <XAxis dataKey={xKey} stroke="#8FBC8F" tick={{ fontSize: 11 }} />
          <YAxis stroke="#8FBC8F" tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          {lines.map((line: string, i: number) => (
            <Line key={line} type="monotone" dataKey={line} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
        </LineChart>
      ) : (
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#40916C/40" />
          <XAxis dataKey={xKey} stroke="#8FBC8F" tick={{ fontSize: 11 }} />
          <YAxis stroke="#8FBC8F" tick={{ fontSize: 11 }} />
          <Tooltip content={<ChartTooltip />} />
          {lines.map((bar: string, i: number) => (
            <Bar key={bar} dataKey={bar} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}

// ─── Chart Tooltip ───
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-2.5 bg-[#2D6A4F] border border-[#52796F] rounded-lg shadow-xl text-xs">
      <p className="font-bold text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}
