// Shared types used by both the Express server and the React client.

/** How sure the identification is. `null` on barcode lookups (an exact database match). */
export type Confidence = 'high' | 'medium' | 'low';

export interface KeyFact {
  label: string;
  value: string;
}

export interface PriceInfo {
  low: number | null;
  high: number | null;
  currency: string | null;
  /** Always true for vision results: prices from a photo are estimates. */
  estimated: boolean;
  note: string;
}

export interface AllergenInfo {
  contains: string[];
  mayContain: string[];
  ingredients: string | null;
}

/** The info card. Every section except `name` may be empty; the UI hides empty ones. */
export interface ScanItem {
  name: string;
  category: string | null;
  description: string | null;
  keyFacts: KeyFact[];
  price: PriceInfo | null;
  whereToBuy: string[];
  careTips: string[];
  allergens: AllergenInfo | null;
  disposal: string | null;
  funFact: string | null;
  isFood: boolean;
  /** False when the model could not confidently identify the object (the card shows a "best guess" banner). */
  identified: boolean;
  confidence: Confidence | null;
  confidenceNote: string | null;
  source: 'vision' | 'barcode';
}

/** One turn of a follow-up conversation about a scanned item. */
export interface AskTurn {
  role: 'user' | 'assistant';
  content: string;
}
