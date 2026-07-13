// ─── Local LLM via Ollama ───
// Model: Qwen 2.5 7B / Llama 3.1 8B

interface LLMInput {
  query: string;
  data?: any;
  konteks?: any[];
}

export async function callLLM(systemPrompt: string, input: LLMInput): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
  const model = process.env.LLM_MODEL ?? 'qwen2.5:7b';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...(input.konteks?.length
      ? [
          {
            role: 'system',
            content: `Konteks Regulasi:\n${JSON.stringify(input.konteks, null, 2)}`,
          },
        ]
      : []),
    ...(input.data
      ? [
          {
            role: 'system',
            content: `Data Terkini:\n${JSON.stringify(input.data, null, 2)}`,
          },
        ]
      : []),
    { role: 'user', content: input.query },
  ];

  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: {
        temperature: 0.1,
        top_p: 0.9,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  return data.message?.content ?? '';
}

export async function embedQuery(query: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';

  const res = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      prompt: query,
    }),
  });

  const data = await res.json();
  return data.embedding;
}
