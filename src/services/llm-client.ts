// ─── Cloud LLM via OpenAI-compatible API ───
// Supports: OpenAI, OpenRouter, Groq, Together, DeepSeek, etc.
// Config via env: AI_API_KEY, AI_BASE_URL, AI_MODEL

interface LLMInput {
  query: string;
  data?: any;
  konteks?: any[];
}

function getConfig() {
  return {
    baseUrl: process.env.AI_BASE_URL ?? 'https://api.openai.com/v1',
    apiKey: process.env.AI_API_KEY ?? '',
    model: process.env.AI_MODEL ?? 'gpt-4o-mini',
  };
}

export async function callLLM(systemPrompt: string, input: LLMInput): Promise<string> {
  const config = getConfig();

  if (!config.apiKey) {
    throw new Error('AI_API_KEY tidak dikonfigurasi. Set di .env.local');
  }

  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
  ];

  if (input.konteks?.length) {
    messages.push({
      role: 'system',
      content: `Konteks Regulasi:\n${JSON.stringify(input.konteks, null, 2)}`,
    });
  }

  if (input.data) {
    const dataStr = JSON.stringify(input.data, null, 2);
    // Truncate data if too large (keep first 12000 chars for context window)
    const truncated = dataStr.length > 12000 ? dataStr.slice(0, 12000) + '\n...[dipotong]' : dataStr;
    messages.push({
      role: 'system',
      content: `Data Terkini dari SAPA:\n${truncated}`,
    });
  }

  messages.push({ role: 'user', content: input.query });

  const res = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.1,
      top_p: 0.9,
      max_tokens: 8192, // Reasoning models need more tokens for chain-of-thought
    }),
    signal: AbortSignal.timeout(90000), // 90s for reasoning models
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`AI API error ${res.status}: ${errBody.slice(0, 300)}`);
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;

  if (!message) {
    throw new Error('AI returned empty response');
  }

  // Handle reasoning models (DeepSeek, etc.) — content may be in reasoning_content
  // The actual answer should be in 'content', reasoning in 'reasoning_content'
  let content = message.content ?? '';

  // If content is empty but reasoning_content exists, the model may have used all tokens for reasoning
  if (!content && message.reasoning_content) {
    // Log that reasoning was used but no answer was produced
    console.warn('[LLM] Model returned reasoning but no content. Reasoning length:', message.reasoning_content.length);
    // Try to extract any answer from the end of reasoning
    content = message.reasoning_content;
  }

  if (!content) {
    throw new Error('AI returned completely empty response');
  }

  return content;
}
