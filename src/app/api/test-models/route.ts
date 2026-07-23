import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';

  if (!apiKey) return NextResponse.json({ error: 'No API key' });

  const models = [
    'deepseek-v4-flash-free',
    'deepseek-v4-flash',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'mimo-v2.5-free',
    'nemotron-3-ultra-free',
    'gpt-5.4-mini',
  ];

  const results: any[] = [];

  for (const model of models) {
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Answer in Indonesian. Be concise.' },
            { role: 'user', content: 'Berapa jumlah OPD di Aceh Tengah? Jawab singkat.' },
          ],
          max_tokens: 200,
          temperature: 0,
        }),
      });
      const data = await res.json();
      const elapsed = Date.now() - start;
      const content = data.choices?.[0]?.message?.content ?? '';
      const reasoning = data.choices?.[0]?.message?.reasoning_content ?? '';
      results.push({
        model,
        status: res.ok ? 'ok' : 'error',
        elapsedMs: elapsed,
        contentLength: content.length,
        reasoningLength: reasoning.length,
        contentPreview: (content || reasoning).slice(0, 100),
        error: data.error?.message ?? null,
      });
    } catch (e: any) {
      results.push({
        model,
        status: 'timeout/error',
        elapsedMs: Date.now() - start,
        error: e.message?.slice(0, 50),
      });
    }
  }

  return NextResponse.json({ results });
}
