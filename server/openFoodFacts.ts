// Product barcode lookups for the Open*Facts family of free databases (no API key).
// They all share one API shape, so one parser serves them all.
import type { AllergenInfo, KeyFact, ScanItem } from '../shared/types.js';

export interface ProductDatabase {
  label: string;
  baseUrl: string;
  /** Food databases carry nutrition and allergen data. The others don't. */
  isFood: boolean;
}

/** Searched in order. The first match wins. */
export const PRODUCT_DATABASES: ProductDatabase[] = [
  { label: 'Open Food Facts', baseUrl: 'https://world.openfoodfacts.org/api/v2/product', isFood: true },
  { label: 'Open Products Facts', baseUrl: 'https://world.openproductsfacts.org/api/v2/product', isFood: false },
  { label: 'Open Beauty Facts', baseUrl: 'https://world.openbeautyfacts.org/api/v2/product', isFood: false },
];

// These databases ask API users to identify their app in the User-Agent.
export const USER_AGENT = 'Doohav/0.1 (personal project)';

/** EAN-8, UPC-A, EAN-13, and GTIN-14 are all 8 to 14 digits. */
export function isValidBarcode(code: string): boolean {
  return /^\d{8,14}$/.test(code);
}

/** "en:oat-milk" -> "Oat milk". */
function prettyTag(tag: string): string {
  const bare = tag.replace(/^[a-z]{2}:/, '').replace(/-/g, ' ').trim();
  return bare.charAt(0).toUpperCase() + bare.slice(1);
}

function tags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string').map(prettyTag);
}

function text(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

/** Formats a per-100g nutriment, or returns null if it is missing. */
function nutrient(n: Record<string, unknown>, key: string, unit: string, label: string): KeyFact | null {
  const v = n[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) return null;
  return { label, value: `${Math.round(v * 10) / 10} ${unit} per 100 g` };
}

/**
 * Turns an Open*Facts API response into a ScanItem.
 * Returns null when the product is not in the database (status !== 1).
 * Only fields the database actually has are filled in; nothing is guessed.
 * These databases have no price data, so price and whereToBuy stay empty.
 */
export function parseOpenFoodFactsResponse(json: unknown, db: ProductDatabase = PRODUCT_DATABASES[0]): ScanItem | null {
  if (typeof json !== 'object' || json === null) return null;
  const body = json as Record<string, unknown>;
  if (body.status !== 1) return null;
  const p = body.product;
  if (typeof p !== 'object' || p === null) return null;
  const product = p as Record<string, unknown>;

  const name = text(product.product_name) ?? text(product.product_name_en) ?? 'Unknown product';
  const brand = text(product.brands);
  const quantity = text(product.quantity);
  // Open Food Facts lists categories as "Beverages, Plant-based, Oat drinks".
  // The first one is the broadest, so it is the most useful category label.
  const category = text(product.categories)?.split(',')[0]?.trim() ?? null;

  const keyFacts: KeyFact[] = [];
  if (brand) keyFacts.push({ label: 'Brand', value: brand });
  if (quantity) keyFacts.push({ label: 'Quantity', value: quantity });
  const grade = text(product.nutriscore_grade);
  if (grade) keyFacts.push({ label: 'Nutri-Score', value: grade.toUpperCase() });

  const n = (typeof product.nutriments === 'object' && product.nutriments !== null
    ? product.nutriments
    : {}) as Record<string, unknown>;
  const nutrients = [
    nutrient(n, 'energy-kcal_100g', 'kcal', 'Energy'),
    nutrient(n, 'fat_100g', 'g', 'Fat'),
    nutrient(n, 'sugars_100g', 'g', 'Sugars'),
    nutrient(n, 'salt_100g', 'g', 'Salt'),
    nutrient(n, 'proteins_100g', 'g', 'Protein'),
  ];
  for (const fact of nutrients) if (fact) keyFacts.push(fact);

  const contains = tags(product.allergens_tags);
  const mayContain = tags(product.traces_tags);
  const ingredients = text(product.ingredients_text);
  const allergens: AllergenInfo | null =
    db.isFood && (contains.length || mayContain.length || ingredients)
      ? { contains, mayContain, ingredients }
      : null;

  return {
    name,
    category,
    description: [brand, quantity].filter(Boolean).join(' · ') || null,
    keyFacts,
    price: null,
    whereToBuy: [],
    careTips: [],
    allergens,
    disposal: null,
    funFact: null,
    isFood: db.isFood,
    identified: true,
    confidence: null,
    confidenceNote: `Exact match from ${db.label}.`,
    source: 'barcode',
  };
}
