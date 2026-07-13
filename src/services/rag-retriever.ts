// ─── Retrieval-Augmented Generation ───
// Vector DB: Qdrant — dokumen regulasi SPBE, Perpres, PermenPANRB, dokumen daerah

export interface RegulationContext {
  judul: string;
  pasal?: string;
  konten: string;
  relevansi: number;
}

export async function retrieveContext(
  query: string,
  kategori?: string,
): Promise<RegulationContext[]> {
  const qdrantUrl = process.env.QDRANT_URL ?? 'http://localhost:6333';

  try {
    const { embedQuery } = await import('./llm-client');
    const vector = await embedQuery(query);

    const filter = kategori
      ? { must: [{ key: 'kategori', match: { value: kategori } }] }
      : undefined;

    const res = await fetch(`${qdrantUrl}/collections/regulasi_spbe/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector,
        filter,
        limit: 5,
        with_payload: true,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    return (data.result ?? []).map((r: any) => ({
      judul: r.payload?.judul ?? '',
      pasal: r.payload?.pasal,
      konten: r.payload?.konten ?? '',
      relevansi: r.score ?? 0,
    }));
  } catch {
    // Qdrant belum online → return empty, LLM tetap jalan tanpa RAG
    return [];
  }
}
