import { describe, expect, it } from 'vitest';
import { buildOnDeviceItem, confidenceFor, prettyLabel } from './onDevice';

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

describe('buildOnDeviceItem', () => {
  it('returns null with no predictions', () => {
    expect(buildOnDeviceItem([])).toBeNull();
  });

  it('is always a best guess with no invented details', () => {
    const item = buildOnDeviceItem([
      { label: 'coffee mug', score: 0.82 },
      { label: 'cup', score: 0.1 },
      { label: 'teapot', score: 0.03 },
    ]);
    expect(item?.name).toBe('Coffee mug');
    expect(item?.identified).toBe(false);
    expect(item?.description).toBeNull();
    expect(item?.keyFacts).toEqual([]);
    expect(item?.confidenceNote).toBe(
      "Best guess from the photo, 82% sure. The phone can't tell brands or models. Other possibilities: Cup (10%), Teapot (3%).",
    );
  });
});
