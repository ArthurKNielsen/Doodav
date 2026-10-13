import { LlmError, type LlmProvider, type LlmRequest } from './types.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function createGemini(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const apiKey = env.GEMINI_API_KEY?.trim() ?? '';
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';

  return {
    name: `Gemini (${model})`,

    async complete(req: LlmRequest): Promise<string> {
      if (!apiKey) {
        throw new LlmError('GEMINI_API_KEY is not set. Add your free key to .env and restart the server.', 503, 'missing_key');
      }

      const body = {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: req.messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [
            ...(m.imageBase64 ? [{ inlineData: { mimeType: 'image/jpeg', data: m.imageBase64 } }] : []),
            { text: m.text },
          ],
        })),
        generationConfig: {
          maxOutputTokens: Math.max(req.maxTokens, 2048),
          temperature: 0.2,
          ...(req.json ? { responseMimeType: 'application/json' } : {}),
        },
      };

      let res: Response;
      try {
        res = await fetch(`${BASE}/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(60_000),
        });
      } catch {
        throw new LlmError('Could not reach the Gemini API. Check your internet connection.', 502, 'upstream_error');
      }

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        throw new LlmError('The Gemini API key was rejected. Check GEMINI_API_KEY in .env.', 503, 'bad_key');
      }
      if (res.status === 429) {
        throw new LlmError('The free Gemini limit was reached for now. Wait a minute and try again.', 429, 'rate_limited');
      }
      if (!res.ok) {
        throw new LlmError(`Gemini returned HTTP ${res.status}.`, 502, 'upstream_error');
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
    },

    async checkReady() {
      return apiKey
        ? { ready: true, message: `Using ${model} through Google Gemini (free tier).` }
        : { ready: false, message: 'GEMINI_API_KEY is not set. Add your free key to .env and restart the server.' };
    },
  };
}
