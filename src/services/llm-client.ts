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

/** Build message list shared by streaming & non-streaming calls. */
function buildMessages(systemPrompt: string, input: LLMInput): { role: string; content: string }[] {
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
  return messages;
}

/**
 * Strip reasoning/thinking prefixes from model output.
 * Some reasoning models (DeepSeek, etc.) put chain-of-thought before the answer.
 */
function stripReasoningPrefix(content: string): string {
  // Remove think tags
  let cleaned = content;
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

  if (cleaned.startsWith('Thinking\n')) {
    cleaned = cleaned.replace(/^Thinking\n/, '').trim();
  }

  return cleaned || content;
}

/** Extract "narasi" field value from a partial/full JSON string (progressive rendering). */
export function extractNarasiPartial(raw: string): string {
  // Match "narasi":"... (handles escaped quotes)
  const match = raw.match(/"narasi"\s*:\s*"((?:[^"\\]|\\.)*)/);
  if (!match) return '';
  // Unescape common sequences
  return match[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

/**
 * Non-streaming LLM call (fallback / simple path).
 * max_tokens lowered to 1024 + 45s timeout for faster responses.
 */
export async function callLLM(systemPrompt: string, input: LLMInput): Promise<string> {
  const config = getConfig();

  if (!config.apiKey) {
    throw new Error('AI_API_KEY tidak dikonfigurasi. Set di .env.local');
  }

  const messages = buildMessages(systemPrompt, input);

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
      max_tokens: 1024,
    }),
    signal: AbortSignal.timeout(45000), // 45s — cukup untuk free tier
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

  let content = message.content ?? '';

  if (!content && message.reasoning_content) {
    console.warn('[LLM] Model returned reasoning but no content. Reasoning length:', message.reasoning_content.length);
    content = message.reasoning_content;
  }

  if (!content) {
    throw new Error('AI returned completely empty response');
  }

  return stripReasoningPrefix(content);
}

/**
 * Streaming LLM call — calls onChunk(delta) as tokens arrive, returns the full content.
 * Retries once if the request fails BEFORE the first chunk (idempotent-safe).
 */
export async function streamLLM(
  systemPrompt: string,
  input: LLMInput,
  onChunk: (delta: string) => void,
): Promise<string> {
  const config = getConfig();

  if (!config.apiKey) {
    throw new Error('AI_API_KEY tidak dikonfigurasi. Set di .env.local');
  }

  const messages = buildMessages(systemPrompt, input);
  const body = JSON.stringify({
    model: config.model,
    messages,
    temperature: 0.1,
    top_p: 0.9,
    max_tokens: 1024,
    stream: true,
  });

  const doFetch = async (): Promise<{ res: Response }> => {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body,
      signal: AbortSignal.timeout(45000),
    });
    return { res };
  };

  let { res } = await doFetch();

  // Retry once on network/5xx errors before any chunk was received
  if (!res.ok) {
    if (res.status >= 500) {
      console.warn('[LLM] Stream failed (retry 1x):', res.status);
      await new Promise((r) => setTimeout(r, 500));
      ({ res } = await doFetch());
    }
    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      throw new Error(`AI API error ${res.status}: ${errBody.slice(0, 300)}`);
    }
  }

  if (!res.body) {
    throw new Error('AI streaming response has no body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') continue;

      try {
        const chunk = JSON.parse(payload);
        const delta = chunk.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          fullContent += delta;
          onChunk(delta);
        }
      } catch {
        // Ignore malformed chunk lines (heartbeats, etc.)
      }
    }
  }

  return stripReasoningPrefix(fullContent);
}
