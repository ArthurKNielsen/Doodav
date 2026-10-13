import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGemini } from './gemini';
import { createOllama } from './ollama';
import { LlmError } from './types';

const req = { system: 'sys', json: true, maxTokens: 100, messages: [{ role: 'user' as const, text: 'hi', imageBase64: 'AAAA' }] };

function stubFetch(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => handler(String(input), init ?? {}));
  vi.stubGlobal('fetch', fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe('Ollama provider', () => {
  it('sends the image and JSON format, and returns the reply text', async () => {
    const fetchMock = stubFetch(() => Response.json({ message: { content: '{"ok":true}' } }));
    const p = createOllama({ OLLAMA_MODEL: 'qwen2.5vl:7b' });
    expect(await p.complete(req)).toBe('{"ok":true}');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/chat');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('qwen2.5vl:7b');
    expect(body.format).toBe('json');
    expect(body.stream).toBe(false);
    expect(body.messages[0]).toEqual({ role: 'system', content: 'sys' });
    expect(body.messages[1].images).toEqual(['AAAA']);
  });

  it('reports a clear error when Ollama is not running', async () => {
    stubFetch(() => {
      throw new TypeError('fetch failed');
    });
    await expect(createOllama({}).complete(req)).rejects.toMatchObject({ code: 'not_running', status: 503 });
  });

  it('reports a missing model with the pull command', async () => {
    stubFetch(() => new Response('not found', { status: 404 }));
    await expect(createOllama({ OLLAMA_MODEL: 'llava:13b' }).complete(req)).rejects.toThrow('ollama pull llava:13b');
  });

  it('checkReady finds the model with or without a tag', async () => {
    stubFetch(() => Response.json({ models: [{ name: 'qwen2.5vl:7b' }] }));
    expect((await createOllama({ OLLAMA_MODEL: 'qwen2.5vl:7b' }).checkReady()).ready).toBe(true);
    expect((await createOllama({ OLLAMA_MODEL: 'llama3.2' }).checkReady()).ready).toBe(false);
  });
});

describe('Gemini provider', () => {
  it('requires a key before calling the API', async () => {
    const fetchMock = stubFetch(() => Response.json({}));
    await expect(createGemini({}).complete(req)).rejects.toBeInstanceOf(LlmError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends inline image data with JSON mode and joins the reply parts', async () => {
    const fetchMock = stubFetch(() =>
      Response.json({ candidates: [{ content: { parts: [{ text: '{"a"' }, { text: ':1}' }] } }] }),
    );
    const out = await createGemini({ GEMINI_API_KEY: 'k' }).complete(req);
    expect(out).toBe('{"a":1}');

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('gemini-2.5-flash:generateContent');
    expect((init.headers as Record<string, string>)['x-goog-api-key']).toBe('k');
    const body = JSON.parse(init.body as string);
    expect(body.contents[0].parts[0].inlineData).toEqual({ mimeType: 'image/jpeg', data: 'AAAA' });
    expect(body.generationConfig.responseMimeType).toBe('application/json');
  });

  it('maps a rejected key and rate limiting to friendly errors', async () => {
    stubFetch(() => new Response('', { status: 403 }));
    await expect(createGemini({ GEMINI_API_KEY: 'bad' }).complete(req)).rejects.toMatchObject({ code: 'bad_key' });
    stubFetch(() => new Response('', { status: 429 }));
    await expect(createGemini({ GEMINI_API_KEY: 'k' }).complete(req)).rejects.toMatchObject({ code: 'rate_limited', status: 429 });
  });
});
