'use client';

import { useEffect, useState } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
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
  sampleRecords: {
    opd: string;
    indikator: string | null;
    nilai: string;
    satuan: string;
    tahun: string | null;
    periode: string;
  }[];
}

// Palet kategorikal unik — lihat catatan di AIResponseRenderer (§7.2 #10).
const CHART_COLORS = ['var(--brand)', 'var(--accent)', 'var(--brand-soft)', 'var(--warning)', 'var(--text-body)', 'var(--danger)', '#52796F', '#31708E'];

/** Truncate long indicator names for chart readability */
function truncateName(name: string, maxLen: number = 35): string {
  if (name.length <= maxLen) return name;
  return name.slice(0, maxLen) + '…';
}

function SkeletonCard() {
  return (
    <div className="bg-[var(--surface-muted)] rounded-2xl p-5 border border-[var(--border)]">
      <div className="skeleton h-4 w-24 mb-3" />
      <div className="skeleton h-8 w-16" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-[var(--surface-muted)] rounded-2xl p-6 border border-[var(--border)]">
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
      <div className="bg-[var(--danger-tint)] border border-[var(--danger)]/20 rounded-2xl p-8 text-center">
        <p className="text-[var(--danger)] text-sm">Gagal memuat data SAPA: {error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload(); }}
          className="mt-3 text-xs text-[var(--danger)] underline hover:text-red-200"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (!data) return null;

  const sortedOpds = [...data.opds].sort((a, b) => b.jumlahIndikator - a.jumlahIndikator);
  const top10 = [...data.topIndicators].slice(0, 10).map(ind => ({
    ...ind,
    shortName: truncateName(ind.nama, 32),
  }));
  const years = [...data.dataByYear].sort((a, b) => a.year.localeCompare(b.year));

  // Format lastFetched as readable date
  const lastFetchedStr = data.overview.lastFetched
    ? new Date(data.overview.lastFetched).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '-';

  return (
    <div className="space-y-6 animate-fadeIn" id="opd">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[var(--surface-card)]/20 flex items-center justify-center">
          <span className="text-[var(--brand)] text-sm">📊</span>
        </div>
        <div>
          <h2 className="text-sm font-bold text-[var(--brand)]">Data SAPA Real-Time</h2>
          <p className="text-[11px] text-[var(--text-muted)]">
            Sumber: api-splp.layanan.go.id · {data.overview.totalRecords} records
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[var(--surface-muted)] rounded-2xl p-5 border border-[var(--border)] card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Total Records</p>
            <span className="text-lg">📦</span>
          </div>
          <p className="text-3xl font-black text-[var(--brand)]">
            {data.overview.totalRecords.toLocaleString('id-ID')}
          </p>
          <p className="text-[11px] text-[var(--brand)] mt-1">Data indikator SAPA</p>
        </div>

        <div className="bg-[var(--surface-muted)] rounded-2xl p-5 border border-[var(--border)] card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Total OPD</p>
            <span className="text-lg">🏛️</span>
          </div>
          <p className="text-3xl font-black text-[var(--brand-soft)]">
            {data.overview.totalOpd}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Organisasi Perangkat Daerah</p>
        </div>

        <div className="bg-[var(--surface-muted)] rounded-2xl p-5 border border-[var(--border)] card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Indikator</p>
            <span className="text-lg">📈</span>
          </div>
          <p className="text-3xl font-black text-[var(--brand)]">
            {data.overview.totalIndicators}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Jenis indikator unik</p>
        </div>

        <div className="bg-[var(--surface-muted)] rounded-2xl p-5 border border-[var(--border)] card-hover">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] text-[var(--text-muted)] uppercase tracking-wider font-medium">Update Terakhir</p>
            <span className="text-lg">🔄</span>
          </div>
          <p className="text-sm font-bold text-[var(--brand)]">
            {data.overview.latestUpdate || '-'}
          </p>
          <p className="text-[11px] text-[var(--text-muted)] mt-1">Terakhir diambil: {lastFetchedStr}</p>
        </div>
      </div>

      {/* OPD + Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* OPD Table */}
        <div className="lg:col-span-2 bg-[var(--surface-muted)] rounded-2xl border border-[var(--border)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider">
              🏛️ OPD — {sortedOpds.length} Terdaftar
            </h3>
            <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Sorted by jumlah indikator</p>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-[var(--surface-muted)] backdrop-blur-sm">
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-2.5 px-4 text-[11px] text-[var(--text-muted)] uppercase font-semibold">#</th>
                  <th className="text-left py-2.5 px-4 text-[11px] text-[var(--text-muted)] uppercase font-semibold">Nama OPD</th>
                  <th className="text-right py-2.5 px-4 text-[11px] text-[var(--text-muted)] uppercase font-semibold">Indikator</th>
                </tr>
              </thead>
              <tbody>
                {sortedOpds.map((opd, idx) => (
                  <tr key={opd.id} className="border-b border-[var(--border)]/20 hover:bg-[var(--border)]/30 transition-colors">
                    <td className="py-2.5 px-4 text-[var(--text-body)]">{idx + 1}</td>
                    <td className="py-2.5 px-4 text-[var(--text-body)] font-medium">{opd.nama}</td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center justify-center min-w-[28px] px-2 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand)] font-bold text-[11px]">
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
        <div className="lg:col-span-3 bg-[var(--surface-muted)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider mb-4">
            📊 Top 10 Indikator Terbanyak
          </h3>
          <ResponsiveContainer width="100%" height={380}>
            <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis type="number" stroke="var(--border)" tick={{ fontSize: 11, fill: 'var(--text)' }} />
              <YAxis
                type="category"
                dataKey="shortName"
                stroke="var(--border)"
                tick={{ fontSize: 9, fill: 'var(--text)' }}
                width={160}
              />
              <Tooltip
                contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: 'var(--text)' }}
                labelStyle={{ color: 'var(--border)' }}
                formatter={(value, _name, item) => [`${value ?? 0} record`, (item?.payload as { nama?: string } | undefined)?.nama ?? '']}
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
        <div className="lg:col-span-3 bg-[var(--surface-muted)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider mb-4">
            📅 Distribusi Data per Tahun
          </h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={years} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" stroke="var(--border)" tick={{ fontSize: 12, fill: 'var(--text)' }} />
              <YAxis stroke="var(--border)" tick={{ fontSize: 11, fill: 'var(--text)' }} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: 'var(--text)' }}
                labelStyle={{ color: 'var(--border)' }}
              />
              <Bar dataKey="count" name="Jumlah Record" radius={[6, 6, 0, 0]}>
                {years.map((entry, i) => (
                  <Cell key={i} fill={i % 2 === 0 ? 'var(--brand)' : 'var(--brand-soft)'} />
                ))}
              </Bar>
              <LabelList dataKey="count" position="top" style={{ fill: 'var(--text)', fontSize: 12, fontWeight: 700 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Kategori Pie */}
        <div className="lg:col-span-2 bg-[var(--surface-muted)] rounded-2xl border border-[var(--border)] p-5">
          <h3 className="text-xs font-bold text-[var(--brand)] uppercase tracking-wider mb-4">
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
                contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '12px', fontSize: '12px' }}
                itemStyle={{ color: 'var(--text)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
