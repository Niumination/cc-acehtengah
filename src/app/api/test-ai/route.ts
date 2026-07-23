import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
  const model = process.env.AI_MODEL ?? 'gpt-4o-mini';

  const result: Record<string, any> = {
    baseUrl,
    model,
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey?.length ?? 0,
    apiKeyPrefix: apiKey?.substring(0, 8) ?? 'N/A',
  };

  // Test /models endpoint
  try {
    const modelsRes = await fetch(`${baseUrl}/models`, {
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const modelsData = await modelsRes.json().catch(() => ({}));
    result.modelsTest = {
      status: modelsRes.status,
      ok: modelsRes.ok,
      sampleModels: (modelsData.data ?? []).slice(0, 5).map((m: any) => m.id),
    };
  } catch (e: any) {
    result.modelsTest = { error: e.message };
  }

  // Test /chat/completions with simple prompt
  try {
    const chatRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(30000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'Reply with just the word OK' }],
        max_tokens: 10,
        temperature: 0,
      }),
    });
    const chatData = await chatRes.json().catch(() => ({}));
    result.chatTest = {
      status: chatRes.status,
      ok: chatRes.ok,
      response: chatData.choices?.[0]?.message?.content ?? null,
      error: chatData.error ?? null,
      raw: JSON.stringify(chatData).slice(0, 500),
    };
  } catch (e: any) {
    result.chatTest = { error: e.message };
  }

  return NextResponse.json(result);
}
