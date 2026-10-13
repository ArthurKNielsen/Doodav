import type { AskTurn, ScanItem } from '../../shared/types';
import { lookupBarcode as lookupProduct } from '../../server/barcode';

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
    throw new ApiError("Can't reach the Doodav server. Check that it's running.", 0, 'network');
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

export function identify(imageBase64: string, hint?: string): Promise<ScanItem> {
  return post<ScanItem>('/api/identify', { image: imageBase64, hint });
}

const API_BASE = ((import.meta.env.VITE_API_BASE as string | undefined) ?? '').replace(/\/$/, '');

export async function lookupBarcode(code: string): Promise<ScanItem> {
  if (API_BASE) return request<ScanItem>(`${API_BASE}/api/barcode/${encodeURIComponent(code)}`);
  let item: ScanItem | null;
  try {
    item = await lookupProduct(code);
  } catch {
    throw new ApiError("Can't reach the product databases. Check your internet connection.", 502, 'upstream_error');
  }
  if (!item) throw new ApiError('That barcode is not in the product databases.', 404, 'not_found');
  return item;
}

export async function ask(item: ScanItem, question: string, history: AskTurn[]): Promise<string> {
  const res = await post<{ answer: string }>('/api/ask', { item, question, history });
  return res.answer;
}

export interface Health {
  reachable: boolean;
  ready: boolean;
  message: string;
}

export async function checkHealth(): Promise<Health> {
  try {
    const res = await request<{ ok: boolean; ready: boolean; message: string }>('/api/health');
    return { reachable: true, ready: res.ready, message: res.message };
  } catch {
    return { reachable: false, ready: false, message: '' };
  }
}
