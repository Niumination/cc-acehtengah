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

/**
 * Strip reasoning/thinking prefixes from model output.
 * Some reasoning models (DeepSeek, etc.) put chain-of-thought before the answer.
 */
function stripReasoningPrefix(content: string): string {
  // Remove "Thinking." or "<think>...</think>" blocks at the start
  let cleaned = content;

  // Remove think tags
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

  // Remove common reasoning prefixes
  const prefixes = [
    /^Thinking[\.\s:]+/i,
    /^Let me (?:think|analyze|consider|break)/i,
    /^I need to (?:analyze|consider|look)/i,
    /^\*{2}Thinking\*{2}[\.\s:]+/i,
    /^Step \d+[\.\s:]+/i,
  ];

  for (const prefix of prefixes) {
    cleaned = cleaned.replace(prefix, '').trim();
  }

  // If the result still starts with "Thinking" followed by a newline, strip it
  if (cleaned.startsWith('Thinking\n')) {
    cleaned = cleaned.replace(/^Thinking\n/, '').trim();
  }

  return cleaned || content; // Fallback to original if stripping removed everything
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
    const truncated = dataStr.length > 15000 ? dataStr.slice(0, 15000) + '\n...[dipotong]' : dataStr;
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
      max_tokens: 4096,
    }),
    signal: AbortSignal.timeout(120000), // 120s for reasoning models
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

  // Handle reasoning models — prefer content, fallback to reasoning_content
  let content = message.content ?? '';

  // If content is empty but reasoning_content exists
  if (!content && message.reasoning_content) {
    console.warn('[LLM] Model returned reasoning but no content. Reasoning length:', message.reasoning_content.length);
    content = message.reasoning_content;
  }

  if (!content) {
    throw new Error('AI returned completely empty response');
  }

  // Strip reasoning prefixes from the output
  return stripReasoningPrefix(content);
}
