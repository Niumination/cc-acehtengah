'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const COLORS = ['#1B4332', '#2D6A4F', '#A15C38', '#B3261E', '#767D6F', '#2D6A4F', '#A15C38', '#C6C3B4', '#1B4332', '#4B5249'];

interface AnalyticsData {
  overview: { totalRecords: number; totalOpd: number; totalIndicators: number };
  opdBreakdown: { nama: string; jumlahIndikator: number; uniqueIndicators: number; totalRecords: number; hasData: boolean }[];
  indicatorFrequency: { nama: string; jumlah: number; opds: string[] }[];
  satuanDistribusi: { name: string; count: number }[];
  jadwalDistribusi: { name: string; count: number }[];
  completeness: { nama: string; completeness: number; totalRecords: number }[];
  kategoriIndikator: { name: string; count: number }[];
  lastFetched: string;
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="p-2.5 bg-[#FFFFFF] border border-[#C6C3B4] rounded-lg shadow-xl text-xs">
      <p className="font-bold text-[#1B4332] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color || p.fill }}>{p.name}: {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="p-2.5 bg-[#FFFFFF] border border-[#C6C3B4] rounded-lg shadow-xl text-xs">
      <p className="font-bold text-[#1B4332]">{d.name}</p>
      <p className="text-[#4B5249]">Jumlah: {d.count.toLocaleString()}</p>
    </div>
  );
};

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-[#FFFFFF] border border-[#C6C3B4] rounded-2xl p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${color}`}>{icon}</div>
        <div>
          <p className="text-[10px] text-[#767D6F] uppercase tracking-wider font-medium">{label}</p>
          <p className="text-2xl font-bold text-[#1B4332]">{value.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true); setError(null);
      const res = await fetch('/api/analytics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-[#E9E6DA] rounded-lg w-64" />
        <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-[#E9E6DA] rounded-2xl" />)}</div>
        <div className="h-[600px] bg-[#E9E6DA] rounded-2xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <p className="text-[#B3261E] text-sm mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-[#1B4332] text-white text-sm rounded-lg hover:bg-[#2D6A4F]">Coba Lagi</button>
      </div>
    );
  }

  if (!data) return null;

  const opdData = [...data.opdBreakdown]
    .sort((a, b) => b.jumlahIndikator - a.jumlahIndikator)
    .map(opd => ({ ...opd, nama: opd.nama.length > 35 ? opd.nama.substring(0, 32) + '...' : opd.nama }));

  const compData = [...data.completeness]
    .sort((a, b) => b.completeness - a.completeness)
    .map(opd => ({ ...opd, nama: opd.nama.length > 35 ? opd.nama.substring(0, 32) + '...' : opd.nama }));

  const satData = [...data.satuanDistribusi].sort((a, b) => b.count - a.count).slice(0, 10);

  const topInd = [...data.indicatorFrequency]
    .sort((a, b) => b.jumlah - a.jumlah).slice(0, 20)
    .map(ind => ({ ...ind, nama: ind.nama?.length > 40 ? ind.nama.substring(0, 37) + '...' : (ind.nama || 'Unknown') }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1B4332]">📊 Analitik Data SAPA</h1>
          <p className="text-sm text-[#767D6F] mt-1">
            {data.lastFetched && `Terakhir diperbarui: ${new Date(data.lastFetched).toLocaleString('id-ID')}`}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon="📦" label="Total Records" value={data.overview.totalRecords} color="bg-[#DCE8DE]" />
        <StatCard icon="🏛️" label="Total OPD" value={data.overview.totalOpd} color="bg-[#DCE8DE]" />
        <StatCard icon="📈" label="Total Indikator" value={data.overview.totalIndicators} color="bg-[#F3DCC9]" />
      </div>

      {/* OPD Performance — full width, tall */}
      <div className="bg-[#0F2A1E]/90 border border-[#C6C3B4] rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[#1B4332] mb-4">🏛️ OPD Performance — Jumlah Indikator</h2>
        <ResponsiveContainer width="100%" height={Math.max(500, opdData.length * 32)}>
          <BarChart data={opdData} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C6C3B4" />
            <XAxis type="number" stroke="#767D6F" tick={{ fontSize: 11 }} />
            <YAxis dataKey="nama" type="category" width={190} stroke="#767D6F" tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="jumlahIndikator" name="Jumlah Indikator" fill="#1B4332" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Data Completeness — full width, tall */}
      <div className="bg-[#0F2A1E]/90 border border-[#C6C3B4] rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[#1B4332] mb-4">✅ Data Completeness per OPD</h2>
        <ResponsiveContainer width="100%" height={Math.max(500, compData.length * 32)}>
          <BarChart data={compData} layout="vertical" margin={{ top: 5, right: 30, left: 200, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C6C3B4" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} stroke="#767D6F" tick={{ fontSize: 11 }} />
            <YAxis dataKey="nama" type="category" width={190} stroke="#767D6F" tick={{ fontSize: 11 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="completeness" name="Completeness %" fill="#2D6A4F" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Kategori Indikator */}
        <div className="bg-[#0F2A1E]/90 border border-[#C6C3B4] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#1B4332] mb-3">🏷️ Kategori Indikator</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.kategoriIndikator} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="count" nameKey="name" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {data.kategoriIndikator.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Satuan Distribution */}
        <div className="bg-[#0F2A1E]/90 border border-[#C6C3B4] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#1B4332] mb-3">📐 Satuan / Unit</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={satData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="count" nameKey="name" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {satData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Jadwal Pemutakhiran */}
        <div className="bg-[#0F2A1E]/90 border border-[#C6C3B4] rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#1B4332] mb-3">🔄 Jadwal Pemutakhiran</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={data.jadwalDistribusi} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="count" nameKey="name" label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false}>
                {data.jadwalDistribusi.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top 20 Indicator Frequency */}
      <div className="bg-[#0F2A1E]/90 border border-[#C6C3B4] rounded-2xl p-5">
        <h2 className="text-sm font-bold text-[#1B4332] mb-4">📊 Top 20 Indikator Terbanyak</h2>
        <ResponsiveContainer width="100%" height={Math.max(400, topInd.length * 30)}>
          <BarChart data={topInd} layout="vertical" margin={{ top: 5, right: 30, left: 300, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#C6C3B4" />
            <XAxis type="number" stroke="#767D6F" tick={{ fontSize: 11 }} />
            <YAxis dataKey="nama" type="category" width={290} stroke="#767D6F" tick={{ fontSize: 10 }} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
            <Bar dataKey="jumlah" name="Kemunculan" fill="#A15C38" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
