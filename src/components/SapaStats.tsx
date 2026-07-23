'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface Overview {
  totalRecords: number;
  totalOpd: number;
  totalIndicators: number;
  latestUpdate: string;
  lastFetched: string;
}

interface Opd {
  id: number;
  nama: string;
  jumlahIndikator: number;
}

interface Indicator {
  nama: string;
  jumlah: number;
  sampleValues: string[];
}

interface DataByYear {
  year: string;
  count: number;
}

interface KategoriDist {
  name: string;
  count: number;
}

interface SapaStatsData {
  overview: Overview;
  opds: Opd[];
  topIndicators: Indicator[];
  dataByYear: DataByYear[];
  kategoriDistribusi: KategoriDist[];
  sampleRecords: any[];
}

const CHART_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];

function SkeletonCard() {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-16" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/30">
      <div className="skeleton h-4 w-40 mb-4" />
      <div className="skeleton h-64 w-full" />
    </div>
  );
}

export default function SapaStats() {
  const [data, setData] = useState<SapaStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => <SkeletonChart key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-800/50 rounded-2xl p-8 text-center">
        <p className="text-red-400 text-sm">Gagal memuat data SAPA: {error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
          className="mt-3 text-xs text-red-300 underline hover:text-red-200"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!data) return null;

  const sortedOpds = [...data.opds].sort((a, b) => b.jumlahIndikator - a.jumlahIndikator);
  const top10 = [...data.topIndicators].slice(0, 10);
  const years = [...data.dataByYear].sort((a, b) => a.year.localeCompare(b.year));

  return (
    <div className="space-y-6 animate-fadeIn" id="opd">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
          <span className="text-blue-400 text-sm">📊</span>
        </div>
        <div>
          <h2 className="text-sm font-bold text-white">Data SAPA Real-Time</h2>
          <p className="text-[11px] text-slate-500">
            Sumber: api-splp.layanan.go.id · {data.overview.totalRecords} records
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30 card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Total Records</p>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-3xl font-black text-white">
            {data.overview.totalRecords.toLocaleString('id-ID')}
          </p>
          <p className="text-[10px] text-blue-400 mt-1">Data indikator SAPA</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30 card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Total OPD</p>
            <span className="text-lg">🏛️</span>
          </div>
          <p className="text-3xl font-black text-green-400">
            {data.overview.totalOpd}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Organisasi Perangkat Daerah</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30 card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Indikator</p>
            <span className="text-lg">📈</span>
          </div>
          <p className="text-3xl font-black text-amber-400">
            {data.overview.totalIndicators}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Jenis indikator unik</p>
        </div>

        <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/30 card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-slate-500 uppercase tracking-wider font-medium">Update Terakhir</p>
            <span className="text-lg">🔄</span>
          </div>
          <p className="text-sm font-bold text-white">
            {data.overview.latestUpdate
              ? new Date(data.overview.latestUpdate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
              : '-'}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Pemutakhiran data</p>
        </div>
      </div>

      {/* OPD + Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* OPD Table */}
        <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700/30 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/30">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              🏛️ OPD — {sortedOpds.length} Terdaftar
            </h3>
            <p className="text-[10px] text-slate-500 mt-0.5">Sorted by jumlah indikator</p>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-800/80 backdrop-blur-sm">
                <tr className="border-b border-slate-700/30">
                  <th className="text-left py-2.5 px-4 text-[10px] text-slate-500 uppercase font-semibold">#</th>
                  <th className="text-left py-2.5 px-4 text-[10px] text-slate-500 uppercase font-semibold">Nama OPD</th>
                  <th className="text-right py-2.5 px-4 text-[10px] text-slate-500 uppercase font-semibold">Indikator</th>
                </tr>
              </thead>
              <tbody>
                {sortedOpds.map((opd, idx) => (
                  <tr key={opd.id} className="border-b border-slate-700/20 hover:bg-slate-700/30 transition-colors">
                    <td className="py-2.5 px-4 text-slate-600">{idx + 1}</td>
                    <td className="py-2.5 px-4 text-slate-300 font-medium">{opd.nama}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 font-bold text-[11px]">
                        {opd.jumlahIndikator}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top 10 Indicators Chart */}
        <div className="lg:col-span-3 bg-slate-800/50 rounded-2xl border border-slate-700/30 p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            📊 Top 10 Indikator Terbanyak
          </h3>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="nama"
                stroke="#64748b"
                tick={{ fontSize: 10 }}
                width={140}
              />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="jumlah" name="Jumlah Record" radius={[0, 6, 6, 0]}>
                {top10.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year Distribution + Kategori Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6" id="indikator">
        {/* Data by Year */}
        <div className="lg:col-span-3 bg-slate-800/50 rounded-2xl border border-slate-700/30 p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            📅 Distribusi Data per Tahun
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={years} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="year" stroke="#64748b" tick={{ fontSize: 12 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Bar dataKey="count" name="Jumlah Record" radius={[6, 6, 0, 0]}>
                {years.map((_, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? '#3b82f6' : '#22c55e'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Kategori Pie */}
        <div className="lg:col-span-2 bg-slate-800/50 rounded-2xl border border-slate-700/30 p-5">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4">
            🏷️ Distribusi Kategori OPD
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data.kategoriDistribusi}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={90}
                paddingAngle={3}
                dataKey="count"
                nameKey="name"
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: '#475569', strokeWidth: 1 }}
              >
                {data.kategoriDistribusi.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: '#e2e8f0' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
