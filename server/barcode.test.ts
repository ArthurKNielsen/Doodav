import { afterEach, describe, expect, it, vi } from 'vitest';
import { lookupBarcode } from './barcode';

const CODE = '5000159484695';

function stubDatabases(answers: Record<string, () => Response>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      const host = Object.keys(answers).find((h) => url.includes(h));
      if (!host) throw new Error(`unexpected request ${url}`);
      return answers[host]();
    }),
  );
}

const found = (name: string) => Response.json({ status: 1, product: { product_name: name } });
const missing = () => Response.json({ status: 0, status_verbose: 'product not found' });

afterEach(() => vi.unstubAllGlobals());

describe('lookupBarcode', () => {
  it('uses the food database first when it has the product', async () => {
    stubDatabases({ 'openfoodfacts.org': () => found('Crisps'), 'openproductsfacts.org': () => found('Other') });
    const item = await lookupBarcode(CODE);
    expect(item?.name).toBe('Crisps');
    expect(item?.isFood).toBe(true);
  });

  it('falls back to the general products database for non-food items', async () => {
    stubDatabases({
      'openfoodfacts.org': missing,
      'openproductsfacts.org': () => found('Phone charger'),
      'openbeautyfacts.org': missing,
    });
    const item = await lookupBarcode(CODE);
    expect(item?.name).toBe('Phone charger');
    expect(item?.isFood).toBe(false);
    expect(item?.confidenceNote).toBe('Exact match from Open Products Facts.');
  });

  it('returns null when no database knows the barcode', async () => {
    stubDatabases({
      'openfoodfacts.org': missing,
      'openproductsfacts.org': missing,
      'openbeautyfacts.org': missing,
    });
    expect(await lookupBarcode(CODE)).toBeNull();
  });

  it('throws when every database fails, so the app can say the lookup is down', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('fetch failed'))));
    await expect(lookupBarcode(CODE)).rejects.toThrow();
  });
});
