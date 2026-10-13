import type { KeyFact, ScanItem } from '../shared/types.js';
import { USER_AGENT } from './openFoodFacts.js';

export function isIsbn13(code: string): boolean {
  return /^97[89]\d{10}$/.test(code);
}

export function parseOpenLibraryResponse(json: unknown, isbn: string): ScanItem | null {
  if (typeof json !== 'object' || json === null) return null;
  const book = (json as Record<string, unknown>)[`ISBN:${isbn}`];
  if (typeof book !== 'object' || book === null) return null;
  const b = book as Record<string, unknown>;

  const title = typeof b.title === 'string' && b.title.trim() ? b.title.trim() : null;
  if (!title) return null;

  const names = (list: unknown): string[] =>
    Array.isArray(list)
      ? list
          .map((x) => (typeof x === 'object' && x !== null ? (x as { name?: unknown }).name : undefined))
          .filter((n): n is string => typeof n === 'string' && n.trim() !== '')
      : [];

  const authors = names(b.authors);
  const publishers = names(b.publishers);
  const subjects = names(b.subjects).slice(0, 3);
  const keyFacts: KeyFact[] = [];
  if (authors.length) keyFacts.push({ label: 'Author', value: authors.join(', ') });
  if (publishers.length) keyFacts.push({ label: 'Publisher', value: publishers[0] });
  if (typeof b.publish_date === 'string') keyFacts.push({ label: 'Published', value: b.publish_date });
  if (typeof b.number_of_pages === 'number') keyFacts.push({ label: 'Pages', value: String(b.number_of_pages) });
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
    confidenceNote: 'Exact match from Open Library.',
    source: 'barcode',
  };
}

export async function lookupBook(isbn: string): Promise<ScanItem | null> {
  const res = await fetch(
    `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&format=json&jscmd=data`,
    { headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) throw new Error(`Open Library responded with HTTP ${res.status}`);
  return parseOpenLibraryResponse(await res.json(), isbn);
}
