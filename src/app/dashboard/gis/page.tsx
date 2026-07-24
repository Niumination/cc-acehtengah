'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import react-leaflet components for SSR safety
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const CircleMarker = dynamic(() => import('react-leaflet').then(mod => mod.CircleMarker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface SampleData {
  opd: string;
  indicator: string;
  value: string | number;
  unit: string;
}

interface Kecamatan {
  nama: string;
  lat: number;
  lng: number;
  opds: string[];
  totalRecords: number;
  totalIndicators: number;
  dataDensity: number;
  sampleData: SampleData[];
}

interface GeoData {
  kecamatan: Kecamatan[];
  bounds: { center: [number, number], zoom: number };
  summary: { totalKecamatan: number; totalRecords: number; avgDensity: number };
  lastFetched: string;
}

const AcehTengahCenter: [number, number] = [4.5833, 96.7500];

function getColor(records: number): string {
  if (records > 40) return '#22c55e';
  if (records > 20) return '#f59e0b';
  return '#ef4444';
}

function getRadius(records: number): number {
  return Math.max(10, Math.min(30, records / 3));
}

function LeafletMap({ data }: { data: GeoData }) {
  const [L, setL] = useState<any>(null);

  useEffect(() => {
    // Dynamic leaflet import
    Promise.all([
      import('leaflet'),
      import('leaflet/dist/leaflet.css'),
    ]).then(([leafletMod]) => {
      const L = leafletMod.default || leafletMod;
      setL(L);
    });
  }, []);

  if (!L) return <div className="h-[600px] bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400">Loading map library...</div>;

  return (
    <MapContainer
      center={AcehTengahCenter}
      zoom={11}
      className="h-[600px] rounded-2xl border border-slate-700/50"
      style={{ background: '#0f172a' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {data.kecamatan.map((kec) => (
        <CircleMarker
          key={kec.nama}
          center={[kec.lat, kec.lng]}
          radius={getRadius(kec.totalRecords)}
          pathOptions={{
            color: getColor(kec.totalRecords),
            fillColor: getColor(kec.totalRecords),
            fillOpacity: 0.7,
            weight: 2,
          }}
        >
          <Popup>
            <div className="text-sm min-w-[250px]">
              <h3 className="font-bold text-slate-800 text-base mb-2">📍 {kec.nama}</h3>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div className="bg-blue-50 rounded-lg p-1.5 text-center">
                  <p className="text-[10px] text-blue-600">Records</p>
                  <p className="font-bold text-blue-700">{kec.totalRecords}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-1.5 text-center">
                  <p className="text-[10px] text-green-600">Indicators</p>
                  <p className="font-bold text-green-700">{kec.totalIndicators}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mb-1"><strong>OPD Terkait:</strong></p>
              <div className="flex flex-wrap gap-1 mb-2">
                {kec.opds.map(opd => (
                  <span key={opd} className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{opd}</span>
                ))}
              </div>
              {kec.sampleData.length > 0 && (
                <>
                  <p className="text-[10px] text-slate-500 mb-1"><strong>Sample Data:</strong></p>
                  <table className="text-[10px] w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-0.5">OPD</th>
                        <th className="text-left py-0.5">Indikator</th>
                        <th className="text-right py-0.5">Nilai</th>
                      </tr>
                    </thead>
                    <tbody>
                      {kec.sampleData.slice(0, 3).map((d, i) => (
                        <tr key={i} className="border-b border-slate-100">
                          <td className="py-0.5">{d.opd.split(' ').slice(0, 2).join(' ')}</td>
                          <td className="py-0.5">{d.indicator?.slice(0, 25)}...</td>
                          <td className="py-0.5 text-right">{d.value} {d.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

export default function GisPage() {
  const [data, setData] = useState<GeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/geodata');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">🗺️ Peta GIS Aceh Tengah</h1>
          <p className="text-sm text-slate-400 mt-1">
            Distribusi data SAPA per kecamatan
          </p>
        </div>
        {data && (
          <div className="text-right text-xs text-slate-500">
            <p>Terakhir update: {new Date(data.lastFetched).toLocaleString('id-ID')}</p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      {data && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard icon="📍" label="Kecamatan" value={data.summary.totalKecamatan} sub="Total wilayah" />
          <SummaryCard icon="📦" label="Total Records" value={data.summary.totalRecords} sub="Data terkumpul" />
          <SummaryCard icon="📊" label="Avg Density" value={data.summary.avgDensity} sub="Records/kecamatan" />
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-6 text-xs text-slate-400">
        <span className="font-medium text-slate-300">Legenda Density:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-500" />
          <span>{'>'}40 records (Tinggi)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>{'>'}20 records (Sedang)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span>{'≤'}20 records (Rendah)</span>
        </div>
      </div>

      {/* Map */}
      {loading && (
        <div className="h-[600px] bg-slate-800 rounded-2xl flex items-center justify-center border border-slate-700/50">
          <div className="text-center">
            <div className="text-4xl mb-3">🗺️</div>
            <p className="text-sm text-slate-400">Memuat data geospasial...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="h-[600px] bg-slate-800 rounded-2xl flex items-center justify-center border border-red-500/30">
          <div className="text-center">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm text-red-400 mb-3">{error}</p>
            <button onClick={fetchData} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-500">
              Coba Lagi
            </button>
          </div>
        </div>
      )}

      {!loading && !error && data && (
        <LeafletMap data={data} />
      )}

      {/* Kecamatan Table */}
      {data && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-700/50">
            <h2 className="text-sm font-bold text-white">📋 Detail per Kecamatan</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-700/50 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">#</th>
                  <th className="text-left px-4 py-3 font-medium">KECAMATAN</th>
                  <th className="text-left px-4 py-3 font-medium">OPD TERKAIT</th>
                  <th className="text-right px-4 py-3 font-medium">RECORDS</th>
                  <th className="text-right px-4 py-3 font-medium">INDIKATOR</th>
                  <th className="text-right px-4 py-3 font-medium">DENSITY</th>
                  <th className="text-center px-4 py-3 font-medium">STATUS</th>
                </tr>
              </thead>
              <tbody>
                {data.kecamatan
                  .sort((a, b) => b.totalRecords - a.totalRecords)
                  .map((kec, idx) => (
                  <tr key={kec.nama} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3 text-white font-medium">📍 {kec.nama}</td>
                    <td className="px-4 py-3 text-slate-400">
                      <div className="flex flex-wrap gap-1">
                        {kec.opds.map(opd => (
                          <span key={opd} className="bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{opd.split(' ').slice(0, 3).join(' ')}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-white">{kec.totalRecords}</td>
                    <td className="px-4 py-3 text-right font-mono text-blue-400">{kec.totalIndicators}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-400">{Math.round(kec.dataDensity)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        kec.totalRecords > 40 ? 'bg-green-500/20 text-green-400' :
                        kec.totalRecords > 20 ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          kec.totalRecords > 40 ? 'bg-green-400' :
                          kec.totalRecords > 20 ? 'bg-yellow-400' :
                          'bg-red-400'
                        }`} />
                        {kec.totalRecords > 40 ? 'Tinggi' : kec.totalRecords > 20 ? 'Sedang' : 'Rendah'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, sub }: { icon: string; label: string; value: number; sub: string }) {
  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-700/50 p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-lg">{icon}</div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{label}</p>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          <p className="text-[10px] text-slate-600">{sub}</p>
        </div>
      </div>
    </div>
  );
}
