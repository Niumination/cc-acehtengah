import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.AI_API_KEY;
  const baseUrl = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';

  if (!apiKey) {
    return NextResponse.json({ error: 'No API key' });
  }

  // First get all available models
  let allModels: string[] = [];
  try {
    const modelsRes = await fetch(`${baseUrl}/models`, {
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const modelsData = await modelsRes.json().catch(() => ({}));
    allModels = (modelsData.data ?? []).map((m: any) => m.id);
  } catch {
    allModels = ['error fetching models'];
  }

  return NextResponse.json({ allModels, count: allModels.length });
}
