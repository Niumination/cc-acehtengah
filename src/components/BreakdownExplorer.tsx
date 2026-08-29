'use client';

import { useState } from 'react';

/**
 * BreakdownExplorer — tombol "Pecah Jawaban" + tree eksplorasi (mindmap ala NotebookLM).
 * Semua data DETERMINISTIK dari /api/dtsen/breakdown (tanpa LLM → hemat usage model AI).
 * Level: kabupaten → kecamatan → desa → desil. Klik node untuk turun satu level.
 */
export default function BreakdownExplorer({ sourceLabel, program }: { sourceLabel?: string | null; program?: string | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [path, setPath] = useState<{ nama: string; scope: string }[]>([{ nama: 'Kabupaten Aceh Tengah', scope: 'kabupaten' }]);
  const [rows, setRows] = useState<{ nama: string; nilai?: number; jiwa?: number; keluarga?: number }[]>([]);
  const [total, setTotal] = useState<number | null>(null);

  const scopeFor = (p: { nama: string; scope: string }[]) => {
    if (p.length === 1) return 'kecamatan';
    if (p.length === 2) return 'desa';
    return 'desil';
  };

  const fetchLevel = async (target: { nama: string; scope: string }[]) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ scope: scopeFor(target) });
      // Filter kecamatan/desa dari path
      const kec = target.find((t) => t.scope === 'kecamatan');
      const desa = target.find((t) => t.scope === 'desa');
      if (kec && kec.nama !== 'Kabupaten Aceh Tengah') params.set('kecamatan', kec.nama);
      if (desa) params.set('desa', desa.nama);
      // Program bansos (PBI dsb.) — hanya relevan di level kabupaten/kecamatan
      if (program && target.length <= 2) params.set('program', program);
      const res = await fetch(`/api/dtsen/breakdown?${params.toString()}`);
      const d = await res.json();
      if (!res.ok || !d.ok) throw new Error(d.error ?? 'Gagal memecah data');
      setPath(target);
      setRows(d.rows ?? []);
      setTotal(d.total ?? null);
    } catch (e: any) {
      setError(e.message ?? 'Gagal memecah data.');
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    if (!open) {
      setOpen(true);
      await fetchLevel(path);
    } else {
      setOpen(false);
    }
  };

  const drill = (nama: string) => {
    const next = [...path, { nama, scope: scopeFor(path) }];
    fetchLevel(next);
  };

  const up = () => {
    if (path.length <= 1) return;
    fetchLevel(path.slice(0, -1));
  };

  return (
    <div className="mt-3 border-t border-[#C6C3B4]/60 pt-3">
      <button
        onClick={toggle}
        className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#F5F3EC] hover:bg-[#E9E6DA] text-[#1B4332] border border-[#C6C3B4] transition-colors"
      >
        <span>{open ? '▲' : '🔍'}</span>
        {open ? 'Tutup Rincian' : 'Pecah Jawaban (rincian per wilayah)'}
        {sourceLabel && <span className="text-[9px] text-[#767D6F] font-medium">· {sourceLabel}</span>}
      </button>

      {open && (
        <div className="mt-3 bg-[#F5F3EC]/70 border border-[#C6C3B4] rounded-xl p-4">
          {/* Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3 text-[11px]">
            {path.map((p, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[#767D6F]">→</span>}
                <span
                  onClick={() => i < path.length - 1 && fetchLevel(path.slice(0, i + 1))}
                  className={i === path.length - 1 ? 'font-bold text-[#1B4332]' : 'text-[#2D6A4F] cursor-pointer hover:underline'}
                >
                  {p.nama}
                </span>
              </span>
            ))}
            {total !== null && (
              <span className="ml-auto text-[10px] text-[#767D6F] font-semibold">
                Total: <b className="text-[#1B4332]">{total.toLocaleString('id-ID')}</b>
              </span>
            )}
          </div>

          {error && <p className="text-[11px] text-[#B3261E] mb-2">⚠️ {error}</p>}
          {loading && <p className="text-[11px] text-[#767D6F] italic">Memuat rincian…</p>}

          {!loading && !error && rows.length === 0 && (
            <p className="text-[11px] text-[#767D6F] italic">Tidak ada data pada level ini (semua disensor k≥5 atau kosong).</p>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 max-h-[380px] overflow-y-auto pr-1">
              {rows.map((r) => {
                const nilai = r.nilai ?? r.jiwa ?? 0;
                const pct = total ? (nilai / total) * 100 : 0;
                return (
                  <div
                    key={String(r.nama)}
                    onClick={() => path.length < 3 && drill(String(r.nama))}
                    className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg border text-[11px] transition-colors ${
                      path.length < 3
                        ? 'bg-white border-[#C6C3B4] hover:border-[#2D6A4F] hover:bg-[#DCE8DE] cursor-pointer'
                        : 'bg-white border-[#E9E6DA]'
                    }`}
                    title={path.length < 3 ? `Klik untuk lihat rincian ${r.nama}` : undefined}
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#1E2420] truncate">
                        {path.length < 3 && <span className="text-[#2D6A4F] mr-1">▸</span>}
                        {String(r.nama).toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </p>
                      {r.keluarga !== undefined && (
                        <p className="text-[9px] text-[#767D6F]">{r.keluarga.toLocaleString('id-ID')} keluarga</p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-[#1B4332]">{nilai.toLocaleString('id-ID')} <span className="text-[9px] font-medium text-[#767D6F]">jiwa</span></p>
                      <div className="w-16 h-1.5 bg-[#E9E6DA] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2D6A4F] rounded-full" style={{ width: `${Math.max(2, pct)}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
