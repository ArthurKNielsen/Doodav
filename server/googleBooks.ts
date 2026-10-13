import type { KeyFact, ScanItem } from '../shared/types';
import { USER_AGENT } from './openFoodFacts';

type VolumeInfo = {
  title?: unknown;
  authors?: unknown;
  publisher?: unknown;
  publishedDate?: unknown;
  pageCount?: unknown;
  categories?: unknown;
  description?: unknown;
};

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
const list = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : [];

export function parseGoogleBooksResponse(json: unknown, isbn: string): ScanItem | null {
  if (typeof json !== 'object' || json === null) return null;
  const items = (json as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) return null;
  const first = items[0] as { volumeInfo?: VolumeInfo } | null;
  const info = first?.volumeInfo;
  if (!info) return null;

  const title = text(info.title);
  if (!title) return null;

  const authors = list(info.authors);
  const keyFacts: KeyFact[] = [];
  if (authors.length) keyFacts.push({ label: 'Author', value: authors.join(', ') });
  const publisher = text(info.publisher);
  if (publisher) keyFacts.push({ label: 'Publisher', value: publisher });
  const published = text(info.publishedDate);
  if (published) keyFacts.push({ label: 'Published', value: published });
  if (typeof info.pageCount === 'number' && info.pageCount > 0) {
    keyFacts.push({ label: 'Pages', value: String(info.pageCount) });
  }
  const subjects = list(info.categories).slice(0, 3);
  if (subjects.length) keyFacts.push({ label: 'Subjects', value: subjects.join(', ') });
  keyFacts.push({ label: 'ISBN', value: isbn });

  return {
    name: title,
    category: 'Book',
    description: authors.length ? `by ${authors.join(', ')}` : null,
    keyFacts,
    price: null,
    whereToBuy: [],
    careTips: [],
    allergens: null,
    disposal: null,
    funFact: null,
    isFood: false,
    identified: true,
    confidence: null,
    confidenceNote: 'Exact match from Google Books.',
    source: 'barcode',
  };
}

export async function lookupGoogleBook(isbn: string): Promise<ScanItem | null> {
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Google Books responded with HTTP ${res.status}`);
  return parseGoogleBooksResponse(await res.json(), isbn);
}
