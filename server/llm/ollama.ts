import { LlmError, type LlmProvider, type LlmRequest } from './types.js';

const TIMEOUT_MS = 180_000;

interface OllamaChatBody {
  model: string;
  stream: false;
  format?: 'json';
  options: { num_predict: number; temperature: number };
  messages: Array<{ role: string; content: string; images?: string[] }>;
}

export function createOllama(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const host = (env.OLLAMA_HOST || 'http://localhost:11434').replace(/\/$/, '');
  const model = env.OLLAMA_MODEL || 'qwen2.5vl:7b';

  return {
    name: `Ollama (${model})`,

    async complete(req: LlmRequest): Promise<string> {
      const body: OllamaChatBody = {
        model,
        stream: false,
        ...(req.json ? { format: 'json' as const } : {}),
        options: { num_predict: req.maxTokens, temperature: 0.2 },
        messages: [
          { role: 'system', content: req.system },
          ...req.messages.map((m) => ({
            role: m.role,
            content: m.text,
            ...(m.imageBase64 ? { images: [m.imageBase64] } : {}),
          })),
        ],
      };

      let res: Response;
      try {
        res = await fetch(`${host}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
      } catch (err) {
        if (err instanceof Error && err.name === 'TimeoutError') {
          throw new LlmError('The local model took too long. Try a smaller model or a faster computer.', 504, 'timeout');
        }
        throw new LlmError(`Can't reach Ollama at ${host}. Start it with "ollama serve".`, 503, 'not_running');
      }

      if (res.status === 404) {
        throw new LlmError(`Ollama doesn't have the model "${model}". Run: ollama pull ${model}`, 503, 'missing_model');
      }
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 200);
        throw new LlmError(`Ollama returned HTTP ${res.status}. ${detail}`.trim(), 502, 'upstream_error');
      }

      const data = (await res.json()) as { message?: { content?: string } };
      return data.message?.content ?? '';
    },

    async checkReady() {
      try {
        const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) });
        if (!res.ok) return { ready: false, message: `Ollama answered with HTTP ${res.status}.` };
        const data = (await res.json()) as { models?: Array<{ name?: string; model?: string }> };
        const names = (data.models ?? []).flatMap((m) => [m.name, m.model]).filter(Boolean) as string[];
        const found = names.some((n) => n === model || (!model.includes(':') && n.split(':')[0] === model));
        return found
          ? { ready: true, message: `Using ${model} through Ollama.` }
          : { ready: false, message: `Ollama is running, but the model "${model}" isn't downloaded. Run: ollama pull ${model}` };
      } catch {
        return {
          ready: false,
          message: `Ollama isn't running. Start the Ollama app (or run "ollama serve"), then refresh.`,
        };
      }
    },
  };
}
