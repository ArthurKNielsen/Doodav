import type { Confidence, ScanItem } from './types';

export interface Prediction {
  label: string;
  score: number;
}

export function prettyLabel(raw: string): string {
  const first = raw.split(',')[0].trim();
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export function confidenceFor(score: number): { identified: boolean; confidence: Confidence } {
  return {
    identified: score >= 0.5,
    confidence: score >= 0.7 ? 'high' : score >= 0.4 ? 'medium' : 'low',
  };
}

/**
 * Builds a card from the on-device guess. The model only knows general categories,
 * so it never adds details: no description, no facts, and never an exact identification.
 */
export function buildOnDeviceItem(predictions: Prediction[]): ScanItem | null {
  const top = predictions[0];
  if (!top) return null;

  const name = prettyLabel(top.label);
  const pct = Math.round(top.score * 100);
  const others = predictions
    .slice(1, 3)
    .map((p) => `${prettyLabel(p.label)} (${Math.round(p.score * 100)}%)`);

  return {
    name,
    category: null,
    description: null,
    keyFacts: [],
    price: null,
    whereToBuy: [],
    careTips: [],
    allergens: null,
    disposal: null,
    funFact: null,
    isFood: false,
    identified: false,
    confidence: null,
    confidenceNote:
      `Best guess from the photo, ${pct}% sure. The phone can't tell brands or models.` +
      (others.length ? ` Other possibilities: ${others.join(', ')}.` : ''),
    source: 'vision',
  };
}
