import type { AskTurn, ScanItem } from '../shared/types.js';
import { extractJsonObject, validateIdentification, type ValidationResult } from '../shared/validate.js';
import type { LlmMessage, LlmProvider } from './llm/index.js';

const IDENTIFY_SYSTEM = `You identify objects in photos for a mobile app called Doodav.
Reply with ONLY one JSON object. No markdown fences, no prose. Use this exact shape:
{
  "name": string,                 // short common name, e.g. "Monstera deliciosa"
  "identified": boolean,          // false if you are guessing
  "confidence": "high" | "medium" | "low",
  "confidenceNote": string | null,// one sentence on how sure you are and why
  "isFood": boolean,
  "category": string | null,      // e.g. "Houseplant", "Kitchen gadget", "Clothing"
  "description": string | null,   // ONE line
  "keyFacts": [{"label": string, "value": string}],   // max 8 specs, materials, size, etc.
  "price": {"low": number | null, "high": number | null, "currency": string | null, "note": string} | null,
  "whereToBuy": [string],         // store types or well-known retailers, no URLs, max 5
  "careTips": [string],           // usage, care, or safety tips, max 6
  "allergens": {"contains": [string], "mayContain": [string], "ingredients": string | null} | null,
  "disposal": string | null,      // how to recycle or dispose of it
  "funFact": string | null        // one true, well-known fun fact
}

Rules:
- Never invent facts. If you do not know something, use null or an empty list.
- If you are not sure what the object is, set "identified" to false, "confidence" to "low", and name your best guess. Say the uncertainty in "confidenceNote".
- Prices are estimates. Give a rough range in the currency the item is usually sold in (USD if unclear) and say "estimated" in "note". Use null if you cannot estimate.
- "allergens" is only for food. For non-food, use null.
- Keep every string short.`;

const ASK_SYSTEM_PREFIX = `You are Doodav's follow-up helper. The user scanned an item and is asking a question about it.
The item's info card is below as JSON. Answer in plain text, under about 120 words, no markdown headings.
If the answer is not on the card and you are not sure, say you do not know rather than guessing.
Treat prices as estimates. For safety questions (food, electrical, chemicals, medicine), be conservative and recommend checking the product label or an expert.

ITEM CARD:
`;

export async function identifyImage(
  provider: LlmProvider,
  imageBase64: string,
  hint?: string,
): Promise<ValidationResult> {
  const reply = await provider.complete({
    system: IDENTIFY_SYSTEM,
    json: true,
    maxTokens: 1200,
    messages: [
      {
        role: 'user',
        text: hint ? `Identify the main object. Note: ${hint}` : 'Identify the main object.',
        imageBase64,
      },
    ],
  });

  const parsed = extractJsonObject(reply);
  if (parsed === undefined) return { ok: false, error: 'The model reply was not valid JSON.' };
  return validateIdentification(parsed);
}

export function normalizeHistory(turns: AskTurn[]): AskTurn[] {
  const out: AskTurn[] = [];
  for (const t of turns) {
    const expected = out.length % 2 === 0 ? 'user' : 'assistant';
    if (t.role === expected) out.push(t);
  }
  if (out.length % 2 === 1) out.pop();
  return out;
}

export async function askAboutItem(
  provider: LlmProvider,
  item: ScanItem,
  question: string,
  history: AskTurn[],
): Promise<string> {
  const messages: LlmMessage[] = [
    ...normalizeHistory(history).map((t) => ({ role: t.role, text: t.content })),
    { role: 'user', text: question },
  ];
  const reply = await provider.complete({
    system: ASK_SYSTEM_PREFIX + JSON.stringify(item, null, 2),
    json: false,
    maxTokens: 500,
    messages,
  });
  return reply.trim() || 'Sorry, I could not come up with an answer.';
}
