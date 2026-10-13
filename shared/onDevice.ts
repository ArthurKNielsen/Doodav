import type { Confidence, ScanItem } from './types';

export interface Prediction {
  label: string;
  score: number;
}

export interface WikiSummary {
  title: string;
  extract: string;
  url: string | null;
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

export function firstSentence(text: string, max = 220): string {
  const trimmed = text.trim();
  const end = trimmed.search(/\.\s/);
  const sentence = end === -1 ? trimmed : trimmed.slice(0, end + 1);
  return sentence.length > max ? `${sentence.slice(0, max - 1).trimEnd()}…` : sentence;
}

export function buildOnDeviceItem(predictions: Prediction[], wiki: WikiSummary | null): ScanItem | null {
  const top = predictions[0];
  if (!top) return null;

  const name = prettyLabel(top.label);
  const pct = Math.round(top.score * 100);
  const others = predictions
    .slice(1, 3)
    .map((p) => `${prettyLabel(p.label)} (${Math.round(p.score * 100)}%)`);
  const { identified, confidence } = confidenceFor(top.score);

  return {
    name,
    category: null,
    description: wiki?.extract ? firstSentence(wiki.extract) : null,
    keyFacts: wiki?.url ? [{ label: 'Source', value: 'Wikipedia' }] : [],
    price: null,
    whereToBuy: [],
    careTips: [],
    allergens: null,
    disposal: null,
    funFact: null,
    isFood: false,
    // The on-device model only knows general categories, so it never claims an exact identification.
    identified: false,
    confidence,
    confidenceNote:
      `Guessed on your device, ${pct}% sure.` +
      (others.length ? ` Other possibilities: ${others.join(', ')}.` : ''),
    source: 'vision',
  };
}
