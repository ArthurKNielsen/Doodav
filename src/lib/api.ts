// Thin client for the Doohav API. All requests go to the same origin;
// Vite (dev) or the preview server proxies /api to the Express server.
import type { AskTurn, ScanItem } from '../../shared/types';

/** An error the UI can show directly. `code` lets the UI pick a specific message. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new ApiError("Can't reach the Doohav server. Check that it's running.", 0, 'network');
  }

  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  if (!res.ok) {
    throw new ApiError(body.error ?? `Request failed (HTTP ${res.status}).`, res.status, body.code);
  }
  return body as T;
}

const post = <T>(path: string, data: unknown) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

/** Identify an object from a base64 JPEG (no data: prefix). */
export function identify(imageBase64: string, hint?: string): Promise<ScanItem> {
  return post<ScanItem>('/api/identify', { image: imageBase64, hint });
}

/** Look up a food barcode in Open Food Facts. Throws ApiError with status 404 if unknown. */
export function lookupBarcode(code: string): Promise<ScanItem> {
  return request<ScanItem>(`/api/barcode/${encodeURIComponent(code)}`);
}

/** Ask a follow-up question about a scanned item. */
export async function ask(item: ScanItem, question: string, history: AskTurn[]): Promise<string> {
  const res = await post<{ answer: string }>('/api/ask', { item, question, history });
  return res.answer;
}

export interface Health {
  reachable: boolean;
  ready: boolean;
  message: string;
}

/** Whether the server is up and the AI provider is configured and reachable. */
export async function checkHealth(): Promise<Health> {
  try {
    const res = await request<{ ok: boolean; ready: boolean; message: string }>('/api/health');
    return { reachable: true, ready: res.ready, message: res.message };
  } catch {
    return { reachable: false, ready: false, message: '' };
  }
}
