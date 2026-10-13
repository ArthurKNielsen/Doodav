// Scan history, kept in localStorage. Storage can be unavailable (private
// browsing, blocked site data), so every read and write is guarded.
import type { AskTurn, ScanItem } from '../../shared/types';

export interface ScanRecord {
  id: string;
  createdAt: number;
  /** Small JPEG data URL for the list view. */
  thumbnail: string | null;
  item: ScanItem;
  followUps: AskTurn[];
}

const KEY = 'doohav.history.v1';
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

/** Writes the list, returns false if the browser refused (for example, storage is full). */
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

/** Case-insensitive search across the fields a person would remember. */
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
