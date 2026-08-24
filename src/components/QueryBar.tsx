'use client';

import { useState } from 'react';

interface QueryBarProps {
  onQuery: (query: string) => void;
  isLoading: boolean;
  onReset: () => void;
  isDefaultMode: boolean;
}

// Chip harus merepresentasikan pertanyaan yang benar-benar bisa dijawab.
// Meta-query (Semua OPD, OPD Teratas, Sebaran Tahun) dijawab deterministik;
// chip tren tidak ditampilkan jika evidence time-series belum tersedia.
const KEYWORD_CHIPS = [
  { label: '🏛️ Jumlah ASN', query: 'berapa jumlah ASN di aceh tengah' },
  { label: '👶 Stunting', query: 'berapa jumlah balita stunting di aceh tengah' },
  { label: '🌾 Pertanian', query: 'bagaimana data pertanian di aceh tengah' },
  { label: '📚 Pendidikan', query: 'bagaimana data pendidikan di aceh tengah' },
  { label: '🏥 Kesehatan', query: 'bagaimana data kesehatan di aceh tengah' },
  { label: '💼 Tenaga Kerja', query: 'berapa jumlah tenaga kerja di aceh tengah' },
  { label: '☕ Kopi', query: 'produksi kopi di aceh tengah' },
  { label: '📊 Semua OPD', query: 'apa saja OPD yang ada di aceh tengah' },
  { label: '🏆 OPD Teratas', query: 'OPD mana yang memiliki indikator paling banyak di Aceh Tengah' },
  { label: '📅 Sebaran Tahun', query: 'bagaimana sebaran data sapa per tahun' },
];

export default function QueryBar({ onQuery, isLoading, onReset, isDefaultMode }: QueryBarProps) {
  const [input, setInput] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = input.trim();
    if (query && !isLoading) {
      onQuery(query);
      setInput('');
    }
  };

  const handleChipClick = (query: string) => {
    if (!isLoading) onQuery(query);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-card)] shadow-sm" aria-label="Tanya data SAPA">
      <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full border border-[var(--brand-tint)]" />
      <div className="relative px-4 pb-3 pt-5 md:px-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-2"><div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--brand-deep)] to-[var(--brand-soft)] text-base text-white shadow-lg">✦</div><span className="text-base font-black tracking-tight text-[var(--brand)]">SAPA Smart AI</span></div>
          <span className="mt-1 text-xs text-[var(--text-muted)]">Tanya data pembangunan Kabupaten Aceh Tengah dengan bahasa natural</span>
          {!isDefaultMode && <button type="button" onClick={onReset} className="absolute right-4 top-4 inline-flex items-center gap-1 text-[10px] font-bold text-[var(--brand)] transition hover:text-[var(--brand-soft)] md:right-6"><span aria-hidden="true">←</span>Kembali ke beranda</button>}
        </div>
      </div>

      <div className="relative px-4 pb-3 md:px-6"><div className="flex flex-wrap justify-center gap-2">{KEYWORD_CHIPS.map((chip) => <button type="button" key={chip.label} onClick={() => handleChipClick(chip.query)} disabled={isLoading} className="rounded-full border border-[var(--border)] bg-[var(--surface-container-low)] px-3 py-1.5 text-[10px] font-semibold text-[var(--text-body)] transition hover:border-[#B8D1BB] hover:bg-[var(--brand-tint)] hover:text-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-40">{chip.label}</button>)}</div></div>

      <form onSubmit={handleSubmit} className="relative flex flex-col gap-2.5 px-4 pb-5 md:px-6">
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1.5 transition focus-within:border-[#83AB8B] focus-within:ring-4 focus-within:ring-[#52B788]/10"><svg className="ml-2 h-4 w-4 flex-shrink-0 text-[var(--text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.2 4.2" /></svg><input type="text" value={input} onChange={(event) => setInput(event.target.value)} maxLength={2000} disabled={isLoading} aria-label="Pertanyaan tentang data Aceh Tengah" placeholder="Ketik pertanyaan tentang data Aceh Tengah…" className="min-w-0 flex-1 bg-transparent px-1.5 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-muted)] disabled:cursor-not-allowed" /><button type="submit" disabled={isLoading || !input.trim()} className="inline-flex min-w-[96px] items-center justify-center gap-2 rounded-lg bg-[var(--brand)] px-4 py-2.5 text-xs font-bold text-[var(--on-brand)] shadow-lg shadow-[#1B4332]/15 transition hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-40">{isLoading ? <><span className="h-3 w-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />Memproses</> : <>Tanya <span aria-hidden="true">→</span></>}</button></div>
        <div className="flex flex-col gap-1 text-[10px] text-[var(--text-muted)] sm:flex-row sm:items-center sm:justify-between"><span className="inline-flex items-center gap-1.5"><span className="text-[var(--brand)]">✓</span> AI memprioritaskan evidence SAPA sebelum menyusun jawaban.</span><span>Enter untuk mengajukan · Maks. 2.000 karakter</span></div>
      </form>
    </section>
  );
}
