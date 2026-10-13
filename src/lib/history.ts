import type { AskTurn, ScanItem } from '../../shared/types';

export interface ScanRecord {
  id: string;
  createdAt: number;
  thumbnail: string | null;
  item: ScanItem;
  followUps: AskTurn[];
}

const KEY = 'doodav.history.v1';
export const MAX_RECORDS = 200;

export function loadHistory(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ScanRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(records: ScanRecord[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
    return true;
  } catch {
    return false;
  }
}

export function newRecordId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function matchesQuery(record: ScanRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const i = record.item;
  const haystack = [
    i.name,
    i.category,
    i.description,
    ...i.keyFacts.flatMap((f) => [f.label, f.value]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}
