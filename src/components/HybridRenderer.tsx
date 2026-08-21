'use client';

import { HybridResponse } from '@/types';
import TrendChart from './charts/TrendChart';
import MetricCard from './MetricCard';

interface Props {
  response: HybridResponse | null;
  isLoading: boolean;
}

export default function HybridRenderer({ response, isLoading }: Props) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400">
        <div className="flex items-center gap-2">
          <span className="animate-pulse">⏳</span>
          <span>Memproses pertanyaan...</span>
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
        <p className="text-sm">Ketikan pertanyaan di atas untuk memulai</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Narasi Eksekutif */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200">
        <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">
          {response.narasi}
        </p>
        <p className="text-xs text-gray-400 mt-3">
          Sumber: {response.dataSource} · {new Date(response.timestamp).toLocaleString('id-ID')}
        </p>
      </div>

      {/* Visualisasi */}
      {response.visualisasi.tipe !== 'none' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200">
          {response.visualisasi.tipe === 'chart' && (
            <TrendChart
              data={response.visualisasi.konfigurasi.data ?? []}
              lines={response.visualisasi.konfigurasi.lines ?? []}
              xKey={response.visualisasi.konfigurasi.xKey ?? 'periode'}
              title={response.visualisasi.konfigurasi.title}
            />
          )}
          {response.visualisasi.tipe === 'map' && (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
              <p className="text-gray-400">🗺️ Peta GIS — (implementasi Leaflet menyusul)</p>
            </div>
          )}
          {response.visualisasi.tipe === 'metric' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(response.visualisasi.konfigurasi.metrics ?? []).map((m: any) => (
                <MetricCard
                  key={m.label}
                  label={m.label}
                  value={m.value}
                  change={m.change}
                  icon={m.icon}
                  color={m.color ?? 'blue'}
                />
              ))}
            </div>
          )}
          {response.visualisasi.tipe === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {(response.visualisasi.konfigurasi.columns ?? []).map((col: string) => (
                      <th key={col} className="text-left py-2 px-3 font-medium text-gray-500">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(response.visualisasi.konfigurasi.rows ?? []).map((row: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      {(response.visualisasi.konfigurasi.columns ?? []).map((col: string) => (
                        <td key={col} className="py-2 px-3">
                          {row[col] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Rekomendasi */}
      {response.rekomendasi && response.rekomendasi.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
          <h3 className="font-semibold text-amber-800 dark:text-amber-300 mb-3">💡 Rekomendasi</h3>
          <ul className="space-y-2">
            {response.rekomendasi.map((r, i) => (
              <li key={i} className="flex gap-2 text-amber-700 dark:text-amber-400">
                <span className="font-mono">{i + 1}.</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
