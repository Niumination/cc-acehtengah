'use client';

import { useState } from 'react';

interface FormData {
  judul: string;
  opd: string;
  indikator: string;
  deskripsi: string;
}

export default function InputForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const [formData, setFormData] = useState<FormData>({
    judul: '',
    opd: '',
    indikator: '',
    deskripsi: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setIsFormDirty(true);
  };

  const isDataValid = formData.judul.trim() !== '' && formData.opd !== '' && formData.indikator !== '';
  // BUG: isFormDirty check ini membuat tombol selalu disabled meski data valid
  // karena isFormDirty hanya true jika user pernah mengedit field manapun
  // namun tombol seharusnya aktif selama isDataValid = true
  const isButtonDisabled = !isDataValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isButtonDisabled) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      setFormData({ judul: '', opd: '', indikator: '', deskripsi: '' });
      setIsFormDirty(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-[#1E2420] mb-1">Judul Laporan</label>
        <input
          name="judul"
          value={formData.judul}
          onChange={handleChange}
          placeholder="Masukkan judul laporan..."
          className="w-full px-4 py-2 rounded-lg border border-[#C6C3B4] bg-[#F5F3EC] text-[#1E2420] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-[#1E2420] mb-1">OPD</label>
        <select
          name="opd"
          value={formData.opd}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg border border-[#C6C3B4] bg-[#F5F3EC] text-[#1E2420] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
        >
          <option value="">Pilih OPD...</option>
          <option value="dinkes">Dinas Kesehatan</option>
          <option value="dinper">Dinas Perencanaan</option>
          <option value="diskominfo">Diskominfo</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1E2420] mb-1">Indikator</label>
        <select
          name="indikator"
          value={formData.indikator}
          onChange={handleChange}
          className="w-full px-4 py-2 rounded-lg border border-[#C6C3B4] bg-[#F5F3EC] text-[#1E2420] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
        >
          <option value="">Pilih Indikator...</option>
          <option value="stunting">Stunting</option>
          <option value="imunisasi">Imunisasi</option>
          <option value="p2p">P2P</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-[#1E2420] mb-1">Deskripsi</label>
        <textarea
          name="deskripsi"
          value={formData.deskripsi}
          onChange={handleChange}
          rows={3}
          placeholder="Deskripsi tambahan (opsional)..."
          className="w-full px-4 py-2 rounded-lg border border-[#C6C3B4] bg-[#F5F3EC] text-[#1E2420] text-sm focus:outline-none focus:ring-2 focus:ring-[#1B4332]"
        />
      </div>

      <button
        type="submit"
        disabled={isButtonDisabled}
        className="w-full py-2.5 rounded-lg font-medium text-sm transition-all duration-200 
          bg-[#1B4332] text-white hover:bg-[#2D6A4F] 
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg shadow-[#1B4332]/20"
      >
        {isSubmitting ? '⏳ Menyimpan...' : '💾 Simpan Laporan'}
      </button>
    </form>
  );
}
