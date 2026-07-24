
'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { format } from 'date-fns';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#84cc16'];

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

const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/analytics');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: AnalyticsData = await response.json();
      setData(result);
    } catch (e: any) {
      setError(`Failed to fetch analytics data: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-2 bg-slate-700 bg-opacity-90 border border-slate-600 rounded-md shadow-lg text-white text-sm">
          <p className="font-bold mb-1">{label}</p>
          {payload.map((p: any, index: number) => (
            <p key={index} style={{ color: p.color }}>
              {p.name}: {p.value}{p.unit || ''}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataEntry = payload[0].payload;
      return (
        <div className="p-2 bg-slate-700 bg-opacity-90 border border-slate-600 rounded-md shadow-lg text-white text-sm">
          <p className="font-bold">{dataEntry.name}</p>
          <p>Count: {dataEntry.value}</p>
          {dataEntry.percent && <p>Percent: {(dataEntry.percent * 100).toFixed(2)}%</p>}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-slate-100 animate-pulse">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-2">📊 Analitik Data SAPA</h1>
          <p className="text-slate-400">Last fetched: Loading...</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="bg-slate-800 p-6 rounded-lg shadow-xl h-96">
              <div className="h-6 bg-slate-700 w-3/4 mb-4 rounded"></div>
              <div className="h-64 bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen text-slate-100 flex flex-col items-center justify-center">
        <p className="text-red-500 text-lg mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition duration-300"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null; // Should not happen if loading and error are handled
  }

  const opdPerformanceData = data.opdBreakdown
    .sort((a, b) => b.jumlahIndikator - a.jumlahIndikator)
    .map(opd => ({
      ...opd,
      nama: opd.nama.length > 30 ? opd.nama.substring(0, 27) + '...' : opd.nama,
    }));

  const dataCompletenessData = data.completeness
    .sort((a, b) => a.completeness - b.completeness)
    .map(opd => ({
      ...opd,
      nama: opd.nama.length > 30 ? opd.nama.substring(0, 27) + '...' : opd.nama,
    }));

  const topSatuanDistribusi = data.satuanDistribusi
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topIndicatorFrequency = data.indicatorFrequency
    .sort((a, b) => b.jumlah - a.jumlah)
    .slice(0, 20)
    .map(indicator => ({
      ...indicator,
      nama: indicator.nama.length > 30 ? indicator.nama.substring(0, 27) + '...' : indicator.nama,
    }));


  return (
    <div className="p-6 bg-gray-900 min-h-screen text-slate-100">
      <div className="mb-8 border-b border-slate-700 pb-4">
        <h1 className="text-4xl font-extrabold text-white mb-2">📊 Analitik Data SAPA</h1>
        <p className="text-slate-400 text-sm">
          Last fetched: {data.lastFetched ? format(new Date(data.lastFetched), 'dd MMMM yyyy HH:mm:ss') : 'N/A'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Overview */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl flex flex-col justify-between">
          <h2 className="text-2xl font-semibold text-white mb-4">Ringkasan Data</h2>
          <div className="space-y-3 text-lg">
            <p><span className="font-bold text-blue-400">Total Records:</span> {data.overview.totalRecords}</p>
            <p><span className="font-bold text-green-400">Total OPD:</span> {data.overview.totalOpd}</p>
            <p><span className="font-bold text-yellow-400">Total Indicators:</span> {data.overview.totalIndicators}</p>
          </div>
        </div>

        {/* OPD Performance Comparison */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl lg:col-span-2">
          <h2 className="text-2xl font-semibold text-white mb-4">OPD Performance Comparison</h2>
          <ResponsiveContainer width="100%" height={Math.max(400, opdPerformanceData.length * 40)}>
            <BarChart
              data={opdPerformanceData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#64748b" />
              <XAxis type="number" stroke="#cbd5e1" />
              <YAxis dataKey="nama" type="category" stroke="#cbd5e1" />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} content={<CustomTooltip />} />
              <Bar dataKey="jumlahIndikator" name="Jumlah Indikator" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Data Completeness per OPD */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl lg:col-span-2">
          <h2 className="text-2xl font-semibold text-white mb-4">Data Completeness per OPD</h2>
          <ResponsiveContainer width="100%" height={Math.max(400, dataCompletenessData.length * 40)}>
            <BarChart
              data={dataCompletenessData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#64748b" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} stroke="#cbd5e1" />
              <YAxis dataKey="nama" type="category" stroke="#cbd5e1" />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} formatter={(value: any) => `${Number(value).toFixed(2)}%`} content={<CustomTooltip unit="%" />} />
              <Bar dataKey="completeness" name="Completeness" fill="#22c55e" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Kategori Indikator Distribution */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl flex flex-col items-center justify-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Kategori Indikator Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.kategoriIndikator}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="name"
                label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {data.kategoriIndikator.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Satuan (Unit) Distribution */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl flex flex-col items-center justify-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Satuan (Unit) Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topSatuanDistribusi}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="name"
                label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {topSatuanDistribusi.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Jadwal Pemutakhiran */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl flex flex-col items-center justify-center">
          <h2 className="text-2xl font-semibold text-white mb-4">Jadwal Pemutakhiran</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data.jadwalDistribusi}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
                nameKey="name"
                label={({ name, percent }: any) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
              >
                {data.jadwalDistribusi.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top 20 Indicator Frequency */}
        <div className="bg-slate-800 p-6 rounded-lg shadow-xl lg:col-span-3">
          <h2 className="text-2xl font-semibold text-white mb-4">Top 20 Indicator Frequency</h2>
          <ResponsiveContainer width="100%" height={Math.max(400, topIndicatorFrequency.length * 40)}>
            <BarChart
              data={topIndicatorFrequency}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#64748b" />
              <XAxis type="number" stroke="#cbd5e1" />
              <YAxis dataKey="nama" type="category" stroke="#cbd5e1" />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.1)' }} content={<CustomTooltip />} />
              <Bar dataKey="jumlah" name="Jumlah Kemunculan" fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsPage;
