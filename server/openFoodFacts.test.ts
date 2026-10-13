import { describe, expect, it } from 'vitest';
import { isValidBarcode, parseOpenFoodFactsResponse } from './openFoodFacts';

describe('isValidBarcode', () => {
  it('accepts EAN-8, UPC-A, EAN-13, and GTIN-14 lengths', () => {
    expect(isValidBarcode('12345670')).toBe(true);
    expect(isValidBarcode('036000291452')).toBe(true);
    expect(isValidBarcode('5901234123457')).toBe(true);
  });

  it('rejects letters, short codes, and long codes', () => {
    expect(isValidBarcode('1234567')).toBe(false);
    expect(isValidBarcode('123456789012345')).toBe(false);
    expect(isValidBarcode('12345abc')).toBe(false);
  });
});

describe('parseOpenFoodFactsResponse', () => {
  it('returns null when the product is not found', () => {
    expect(parseOpenFoodFactsResponse({ status: 0, status_verbose: 'product not found' })).toBeNull();
    expect(parseOpenFoodFactsResponse(null)).toBeNull();
  });

  it('builds a food card from a full product record', () => {
    const item = parseOpenFoodFactsResponse({
      status: 1,
      product: {
        product_name: 'Oat Drink',
        brands: 'Oatly',
        categories: 'Beverages, Plant-based foods, Oat drinks',
        quantity: '1 L',
        nutriscore_grade: 'c',
        ingredients_text: 'Water, oats, rapeseed oil',
        allergens_tags: ['en:gluten'],
        traces_tags: ['en:nuts'],
        nutriments: { 'energy-kcal_100g': 46.2, fat_100g: 1.52, sugars_100g: 4 },
      },
    });

    expect(item).not.toBeNull();
    expect(item?.name).toBe('Oat Drink');
    expect(item?.category).toBe('Beverages');
    expect(item?.isFood).toBe(true);
    expect(item?.source).toBe('barcode');
    expect(item?.confidence).toBeNull();
    expect(item?.price).toBeNull();
    expect(item?.keyFacts).toEqual([
      { label: 'Brand', value: 'Oatly' },
      { label: 'Quantity', value: '1 L' },
      { label: 'Nutri-Score', value: 'C' },
      { label: 'Energy', value: '46.2 kcal per 100 g' },
      { label: 'Fat', value: '1.5 g per 100 g' },
      { label: 'Sugars', value: '4 g per 100 g' },
    ]);
    expect(item?.allergens).toEqual({
      contains: ['Gluten'],
      mayContain: ['Nuts'],
      ingredients: 'Water, oats, rapeseed oil',
    });
  });

  it('falls back to the English name and leaves missing fields empty', () => {
    const item = parseOpenFoodFactsResponse({ status: 1, product: { product_name_en: 'Plain Crackers' } });
    expect(item?.name).toBe('Plain Crackers');
    expect(item?.keyFacts).toEqual([]);
    expect(item?.allergens).toBeNull();
    expect(item?.category).toBeNull();
  });

  it('uses "Unknown product" when no name exists', () => {
    expect(parseOpenFoodFactsResponse({ status: 1, product: {} })?.name).toBe('Unknown product');
  });
});
