
export type Confidence = 'high' | 'medium' | 'low';

export interface KeyFact {
  label: string;
  value: string;
}

export interface PriceInfo {
  low: number | null;
  high: number | null;
  currency: string | null;
  estimated: boolean;
  note: string;
}

export interface AllergenInfo {
  contains: string[];
  mayContain: string[];
  ingredients: string | null;
}

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
  identified: boolean;
  confidence: Confidence | null;
  confidenceNote: string | null;
  source: 'vision' | 'barcode';
}

export interface AskTurn {
  role: 'user' | 'assistant';
  content: string;
}
