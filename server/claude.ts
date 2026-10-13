// Everything that talks to the Anthropic API lives here. The API key is only
// read on the server, so it never reaches the browser.
import Anthropic from '@anthropic-ai/sdk';
import type { AskTurn, ScanItem } from '../shared/types.js';
import { extractJsonObject, validateIdentification, type ValidationResult } from '../shared/validate.js';

// Latest Sonnet by default. Override with ANTHROPIC_MODEL in .env if needed.
export const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5';

/** Returns a client, or null when no key is configured (the route reports a setup message). */
export function makeClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  return key ? new Anthropic({ apiKey: key }) : null;
}

const IDENTIFY_SYSTEM = `You identify objects in photos for a mobile app called Doohickey.
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

const ASK_SYSTEM_PREFIX = `You are Doohickey's follow-up helper. The user scanned an item and is asking a question about it.
The item's info card is below as JSON. Answer in plain text, under about 120 words, no markdown headings.
If the answer is not on the card and you are not sure, say you do not know rather than guessing.
Treat prices as estimates. For safety questions (food, electrical, chemicals, medicine), be conservative and recommend checking the product label or an expert.

ITEM CARD:
`;

/** Pulls the text out of a Messages API response. */
function replyText(message: Anthropic.Messages.Message): string {
  return message.content
    .flatMap((block) => (block.type === 'text' ? [block.text] : []))
    .join('\n')
    .trim();
}

/**
 * Sends the photo to Claude and returns a validated ScanItem.
 * `hint` is optional extra context, e.g. "A barcode was read but is not in the food database".
 */
export async function identifyImage(
  client: Anthropic,
  imageBase64: string,
  hint?: string,
): Promise<ValidationResult> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: IDENTIFY_SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageBase64 } },
          { type: 'text', text: hint ? `Identify the main object. Note: ${hint}` : 'Identify the main object.' },
        ],
      },
    ],
  });

  const parsed = extractJsonObject(replyText(message));
  if (parsed === undefined) {
    return { ok: false, error: 'The model reply was not valid JSON.' };
  }
  return validateIdentification(parsed);
}

/**
 * Keeps the conversation history in the strict user/assistant alternation the
 * Messages API requires, and starts with a user turn.
 */
export function normalizeHistory(turns: AskTurn[]): AskTurn[] {
  const out: AskTurn[] = [];
  for (const t of turns) {
    const expected = out.length % 2 === 0 ? 'user' : 'assistant';
    if (t.role === expected) out.push(t);
  }
  // The new question is a user turn, so a trailing user turn would repeat the role. Drop it.
  if (out.length % 2 === 1) out.pop();
  return out;
}

/** Answers a follow-up question about a scanned item. */
export async function askAboutItem(
  client: Anthropic,
  item: ScanItem,
  question: string,
  history: AskTurn[],
): Promise<string> {
  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: ASK_SYSTEM_PREFIX + JSON.stringify(item, null, 2),
    messages: [...normalizeHistory(history), { role: 'user', content: question }],
  });
  return replyText(message) || 'Sorry, I could not come up with an answer.';
}
