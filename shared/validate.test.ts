import { describe, expect, it } from 'vitest';
import { extractJsonObject, validateIdentification } from './validate';

const good = {
  name: 'Monstera deliciosa',
  identified: true,
  confidence: 'high',
  confidenceNote: 'Leaf splits are distinctive.',
  isFood: false,
  category: 'Houseplant',
  description: 'A tropical climbing plant with split leaves.',
  keyFacts: [{ label: 'Light', value: 'Bright indirect' }],
  price: { low: 20, high: 45, currency: 'usd', note: 'estimated' },
  whereToBuy: ['Garden centers'],
  careTips: ['Water when the top inch is dry'],
  allergens: { contains: ['Milk'], mayContain: [], ingredients: 'x' },
  disposal: null,
  funFact: null,
};

describe('validateIdentification', () => {
  it('accepts a well-formed result and normalizes it', () => {
    const r = validateIdentification(good);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.name).toBe('Monstera deliciosa');
    expect(r.value.price).toEqual({ low: 20, high: 45, currency: 'USD', estimated: true, note: 'estimated' });
    expect(r.value.allergens).toBeNull();
    expect(r.value.source).toBe('vision');
  });

  it('rejects non-objects and missing names', () => {
    expect(validateIdentification(null).ok).toBe(false);
    expect(validateIdentification([]).ok).toBe(false);
    expect(validateIdentification({ ...good, name: '   ' }).ok).toBe(false);
  });

  it('rejects a bad confidence value or a missing identified flag', () => {
    expect(validateIdentification({ ...good, confidence: 'certain' }).ok).toBe(false);
    expect(validateIdentification({ ...good, identified: 'yes' }).ok).toBe(false);
  });

  it('forces prices to be marked as estimates', () => {
    const r = validateIdentification({ ...good, price: { low: 5, high: null, currency: null, estimated: false, note: '' } });
    expect(r.ok && r.value.price).toEqual({ low: 5, high: 5, currency: null, estimated: true, note: 'Estimated' });
  });

  it('drops prices with no numbers and no note', () => {
    const r = validateIdentification({ ...good, price: { low: null, high: null, currency: null, note: '' } });
    expect(r.ok && r.value.price).toBeNull();
  });

  it('keeps allergens for food and caps list lengths', () => {
    const r = validateIdentification({
      ...good,
      isFood: true,
      keyFacts: Array.from({ length: 20 }, (_, i) => ({ label: `L${i}`, value: 'v' })),
      careTips: Array.from({ length: 20 }, (_, i) => `tip ${i}`),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.allergens?.contains).toEqual(['Milk']);
    expect(r.value.keyFacts).toHaveLength(8);
    expect(r.value.careTips).toHaveLength(6);
  });

  it('drops malformed list entries instead of failing', () => {
    const r = validateIdentification({ ...good, keyFacts: [{ label: 'A' }, 'junk', { label: 'B', value: 'ok' }] });
    expect(r.ok && r.value.keyFacts).toEqual([{ label: 'B', value: 'ok' }]);
  });
});

describe('extractJsonObject', () => {
  it('parses a bare object', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('strips code fences and surrounding prose', () => {
    expect(extractJsonObject('Here you go:\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });

  it('returns undefined when there is no valid JSON', () => {
    expect(extractJsonObject('no json here')).toBeUndefined();
    expect(extractJsonObject('{not json}')).toBeUndefined();
  });
});
