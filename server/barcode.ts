// Finds a product for a barcode by trying free databases in order. No AI, no key.
import type { ScanItem } from '../shared/types.js';
import { isValidBarcode, PRODUCT_DATABASES, parseOpenFoodFactsResponse, USER_AGENT } from './openFoodFacts.js';
import { isIsbn13, lookupBook } from './openLibrary.js';

async function lookupProduct(baseUrl: string, code: string, db: (typeof PRODUCT_DATABASES)[number]): Promise<ScanItem | null> {
  const res = await fetch(`${baseUrl}/${code}.json`, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`${db.label} responded with HTTP ${res.status}`);
  return parseOpenFoodFactsResponse(await res.json(), db);
}

/**
 * Returns the product for a barcode, or null if no database knows it.
 * Throws only when every database failed (for example, no internet), so the
 * route can say the lookup is down rather than "not found".
 */
export async function lookupBarcode(code: string): Promise<ScanItem | null> {
  if (!isValidBarcode(code)) return null;
  const errors: unknown[] = [];
  let answered = false;

  for (const db of PRODUCT_DATABASES) {
    try {
      const item = await lookupProduct(db.baseUrl, code, db);
      answered = true;
      if (item) return item;
    } catch (err) {
      errors.push(err);
    }
  }

  if (isIsbn13(code)) {
    try {
      const book = await lookupBook(code);
      answered = true;
      if (book) return book;
    } catch (err) {
      errors.push(err);
    }
  }

  if (!answered && errors.length) throw errors[0];
  return null;
}
