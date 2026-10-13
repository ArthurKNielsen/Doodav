// Validates the JSON the AI model returns for an identification.
// The model is asked for strict JSON, but we never trust it: every field is
// checked here, and anything malformed is rejected before it reaches the UI.
import type { AllergenInfo, Confidence, KeyFact, PriceInfo, ScanItem } from './types';

export type ValidationResult =
  | { ok: true; value: ScanItem }
  | { ok: false; error: string };

const MAX_NAME = 120;
const MAX_TEXT = 300;
const MAX_FACTS = 8;
const MAX_LIST = 6;

const CONFIDENCE: readonly Confidence[] = ['high', 'medium', 'low'];

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Trimmed non-empty string, or null. Non-strings are treated as "unknown". */
function optionalText(v: unknown, max = MAX_TEXT): string | null {
  if (typeof v !== 'string') return null;
  const t = v.trim().slice(0, max);
  return t.length > 0 ? t : null;
}

/** Keeps only usable string entries, trimmed and capped. Lists are lenient: bad entries are dropped. */
function textList(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => optionalText(x))
    .filter((x): x is string => x !== null)
    .slice(0, max);
}

function keyFacts(v: unknown): KeyFact[] {
  if (!Array.isArray(v)) return [];
  const facts: KeyFact[] = [];
  for (const entry of v) {
    if (!isRecord(entry)) continue;
    const label = optionalText(entry.label, 60);
    const value = optionalText(entry.value, 160);
    if (label && value) facts.push({ label, value });
    if (facts.length >= MAX_FACTS) break;
  }
  return facts;
}

function price(v: unknown): PriceInfo | null {
  if (!isRecord(v)) return null;
  const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null);
  const low = num(v.low);
  const high = num(v.high);
  const note = optionalText(v.note) ?? '';
  // Nothing usable: no numbers and no explanation.
  if (low === null && high === null && note === '') return null;
  return {
    low,
    high: high ?? low,
    currency: optionalText(v.currency, 8)?.toUpperCase() ?? null,
    // Prices read from a photo are estimates by definition, so we force the flag
    // instead of trusting the model to set it.
    estimated: true,
    note: note || 'Estimated',
  };
}

function allergens(v: unknown): AllergenInfo | null {
  if (!isRecord(v)) return null;
  const contains = textList(v.contains, 15);
  const mayContain = textList(v.mayContain, 15);
  const ingredients = optionalText(v.ingredients, 600);
  if (contains.length === 0 && mayContain.length === 0 && !ingredients) return null;
  return { contains, mayContain, ingredients };
}

/**
 * Validate the parsed JSON from the model. Returns a clean ScanItem or a
 * human-readable error. Top-level fields that are required (name, identified,
 * confidence) fail the whole result; optional fields degrade to null/[].
 */
export function validateIdentification(raw: unknown): ValidationResult {
  if (!isRecord(raw)) return { ok: false, error: 'Response was not a JSON object.' };

  const name = optionalText(raw.name, MAX_NAME);
  if (!name) return { ok: false, error: 'Response had no item name.' };

  if (typeof raw.identified !== 'boolean') {
    return { ok: false, error: 'Response is missing the "identified" flag.' };
  }

  const confidence = raw.confidence;
  if (!CONFIDENCE.includes(confidence as Confidence)) {
    return { ok: false, error: 'Response has an invalid "confidence" value.' };
  }

  const isFood = raw.isFood === true;

  return {
    ok: true,
    value: {
      name,
      category: optionalText(raw.category, 60),
      description: optionalText(raw.description, 200),
      keyFacts: keyFacts(raw.keyFacts),
      price: price(raw.price),
      whereToBuy: textList(raw.whereToBuy, MAX_LIST),
      careTips: textList(raw.careTips, MAX_LIST),
      // Allergen notes only make sense for food.
      allergens: isFood ? allergens(raw.allergens) : null,
      disposal: optionalText(raw.disposal),
      funFact: optionalText(raw.funFact),
      isFood,
      identified: raw.identified,
      confidence: confidence as Confidence,
      confidenceNote: optionalText(raw.confidenceNote),
      source: 'vision',
    },
  };
}

/**
 * Pulls the first JSON object out of a model reply. Handles code fences and
 * stray prose around the object. Returns `undefined` if nothing parses.
 */
export function extractJsonObject(text: string): unknown {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) return undefined;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return undefined;
  }
}
