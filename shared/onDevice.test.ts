import { describe, expect, it } from 'vitest';
import { buildOnDeviceItem, confidenceFor, firstSentence, prettyLabel } from './onDevice';

describe('prettyLabel', () => {
  it('capitalizes and keeps the first synonym', () => {
    expect(prettyLabel('coffee mug')).toBe('Coffee mug');
    expect(prettyLabel('notebook, notebook computer')).toBe('Notebook');
  });
});

describe('confidenceFor', () => {
  it('maps scores to the same levels the server uses', () => {
    expect(confidenceFor(0.9)).toEqual({ identified: true, confidence: 'high' });
    expect(confidenceFor(0.5)).toEqual({ identified: true, confidence: 'medium' });
    expect(confidenceFor(0.2)).toEqual({ identified: false, confidence: 'low' });
  });
});

describe('firstSentence', () => {
  it('returns the first sentence and caps long text', () => {
    expect(firstSentence('A mug is a cup. It has a handle.')).toBe('A mug is a cup.');
    expect(firstSentence('x'.repeat(400)).endsWith('…')).toBe(true);
  });
});

describe('buildOnDeviceItem', () => {
  it('returns null with no predictions', () => {
    expect(buildOnDeviceItem([], null)).toBeNull();
  });

  it('builds a card with Wikipedia text and honest confidence', () => {
    const item = buildOnDeviceItem(
      [
        { label: 'coffee mug', score: 0.82 },
        { label: 'cup', score: 0.1 },
        { label: 'teapot', score: 0.03 },
      ],
      { title: 'Mug', extract: 'A mug is a type of cup. It is used for drinking.', url: 'https://en.wikipedia.org/wiki/Mug' },
    );
    expect(item?.name).toBe('Coffee mug');
    expect(item?.identified).toBe(false);
    expect(item?.confidence).toBe('high');
    expect(item?.description).toBe('A mug is a type of cup.');
    expect(item?.keyFacts).toEqual([{ label: 'Source', value: 'Wikipedia' }]);
    expect(item?.confidenceNote).toBe('Guessed on your device, 82% sure. Other possibilities: Cup (10%), Teapot (3%).');
    expect(item?.price).toBeNull();
    expect(item?.allergens).toBeNull();
  });

  it('marks weak guesses as not identified and adds no facts it does not have', () => {
    const item = buildOnDeviceItem([{ label: 'thing', score: 0.2 }], null);
    expect(item?.identified).toBe(false);
    expect(item?.confidence).toBe('low');
    expect(item?.description).toBeNull();
    expect(item?.keyFacts).toEqual([]);
  });
});
