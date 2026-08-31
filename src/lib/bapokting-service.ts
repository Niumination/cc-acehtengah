// ─── Bapokting Service — AI Smart Query integration ───
// Integrasi /api/bapokting dengan QueryBar dan AIResponseRenderer

export interface BapoktingQueryOptions {
  tanggal?: string;
  kategori?: string;
  agregat?: 'mingguan' | 'bulanan' | 'tahunan';
}

export async function queryBapokting(options: BapoktingQueryOptions = {}) {
  const params = new URLSearchParams();
  if (options.tanggal) params.append('tanggal', options.tanggal);
  if (options.kategori) params.append('kategori', options.kategori);
  if (options.agregat) params.append('agregat', options.agregat);

  const res = await fetch(`/api/bapokting?${params.toString()}`);
  if (!res.ok) throw new Error(`Bapokting API error: ${res.status}`);

  return res.json();
}

// Generate AI prompt untuk query bapokting
export function buildBapoktingPrompt(query: string, data: any): string {
  if (!data?.data || data.data.length === 0) {
    return "Maaf, saya tidak menemukan data harga bapokting untuk permintaan Anda.";
  }

  const top5 = data.data.slice(0, 5).sort((a: any, b: any) => b.harga - a.harga);
  const lowest5 = [...data.data].sort((a: any, b: any) => a.harga - b.harga).slice(0, 5);

  let prompt = `Berdasarkan data SPLP DISPERINDAG Aceh Tengah (${data.sumber || 'terkini'}):\n\n`;

  prompt += `*Harga Bahan Pokok Teratas (Mahal → Murah):*\n`;
  top5.forEach((item: any) => {
    prompt += `• ${item.namaBarang}: Rp ${item.harga.toLocaleString()} / ${item.satuan}\n`;
  });

  prompt += `\n*Harga Bahan Pokok Termurah:*\n`;
  lowest5.forEach((item: any) => {
    prompt += `• ${item.namaBarang}: Rp ${item.harga.toLocaleString()} / ${item.satuan}\n`;
  });

  if (data.agregat?.mingguan?.chartData) {
    prompt += `\n*Tren Harga Mingguan (Top 5):*\n`;
    data.agregat.mingguan.chartData.slice(0, 5).forEach((item: any) => {
      prompt += `• ${item.label}: Rp ${Math.round(item.hargaRataRata).toLocaleString()}\n`;
    });
  }

  if (data.agregat?.bulanan?.chartData) {
    prompt += `\n*Tren Harga Bulanan (Top 5):*\n`;
    data.agregat.bulanan.chartData.slice(0, 5).forEach((item: any) => {
      prompt += `• ${item.label}: Rp ${Math.round(item.hargaRataRata).toLocaleString()}\n`;
    });
  }

  return prompt;
}

// Format untuk display di dashboard
export function formatBapoktingData(data: any) {
  if (!data?.data) return [];

  return data.data.map((item: any) => ({
    nama: item.namaBarang,
    harga: item.harga,
    satuan: item.satuan,
    kategori: item.kategori,
    keterangan: item.keterangan,
  }));
}

// Group by kategori
export function groupBapoktingByCategory(data: any) {
  if (!data?.data) return {};

  const grouped: Record<string, any[]> = {};
  data.data.forEach((item: any) => {
    const cat = item.kategori || 'Lainnya';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });
  return grouped;
}
