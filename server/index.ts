// Doohav API server. Keeps AI keys on the server and exposes these routes:
//   GET  /api/health          -> is the server up, and is the AI provider ready?
//   POST /api/identify        -> photo (base64 JPEG) -> validated info card
//   GET  /api/barcode/:code   -> Open Food Facts lookup -> info card (404 if unknown)
//   POST /api/ask             -> follow-up question about a card -> plain-text answer
import express, { type NextFunction, type Request, type Response } from 'express';
import { askAboutItem, identifyImage } from './ai.js';
import { createProvider, LlmError, type LlmProvider } from './llm/index.js';
import { isValidBarcode, lookupBarcode } from './openFoodFacts.js';
import type { AskTurn, ScanItem } from '../shared/types.js';

// Load .env if it exists (Node 22 built-in; no dotenv dependency needed).
try {
  process.loadEnvFile();
} catch {
  // No .env file is fine if the variables are set some other way.
}

const PORT = Number(process.env.PORT) || 8787;
const app = express();
// A full-size JPEG from a phone is well under this. The limit is only a safety net.
app.use(express.json({ limit: '8mb' }));

const provider: LlmProvider = createProvider();

/** Sends a consistent JSON error body. */
function fail(res: Response, status: number, error: string, code?: string) {
  res.status(status).json({ error, code });
}

/** Maps provider errors to their friendly status and message. Anything unexpected becomes a generic 502. */
function handleAiError(res: Response, err: unknown) {
  if (err instanceof LlmError) {
    if (err.status >= 500) console.error(`[ai] ${err.code}: ${err.message}`);
    return fail(res, err.status, err.message, err.code);
  }
  console.error('[ai] unexpected failure:', err);
  fail(res, 502, 'The AI service failed. Please try again.', 'upstream_error');
}

app.get('/api/health', async (_req, res) => {
  const status = await provider.checkReady();
  res.json({ ok: true, provider: provider.name, ready: status.ready, message: status.message });
});

app.post('/api/identify', async (req: Request, res: Response) => {
  const { image, hint } = req.body ?? {};
  // Expect raw base64 (no "data:" prefix) from the client's JPEG encoder.
  if (typeof image !== 'string' || image.length === 0) {
    return fail(res, 400, 'Missing image.', 'bad_request');
  }
  if (!/^[A-Za-z0-9+/=]+$/.test(image)) {
    return fail(res, 400, 'Image must be base64-encoded JPEG data.', 'bad_request');
  }
  const hintText = typeof hint === 'string' && hint.length < 300 ? hint : undefined;

  try {
    const result = await identifyImage(provider, image, hintText);
    if (!result.ok) {
      console.warn('[identify] rejected model output:', result.error);
      return fail(res, 502, "I couldn't read the identification result. Please try the scan again.", 'bad_model_output');
    }
    res.json(result.value);
  } catch (err) {
    handleAiError(res, err);
  }
});

app.get('/api/barcode/:code', async (req: Request, res: Response) => {
  const code = String(req.params.code);
  if (!isValidBarcode(code)) return fail(res, 400, 'Barcodes are 8 to 14 digits.', 'bad_request');

  try {
    const item = await lookupBarcode(code);
    if (!item) return fail(res, 404, 'That barcode is not in the Open Food Facts database.', 'not_found');
    res.json(item);
  } catch (err) {
    console.error('[barcode] lookup failed:', err);
    fail(res, 502, 'The product database could not be reached. Try again in a moment.', 'upstream_error');
  }
});

app.post('/api/ask', async (req: Request, res: Response) => {
  const { item, question, history } = req.body ?? {};
  if (typeof item !== 'object' || item === null || typeof (item as ScanItem).name !== 'string') {
    return fail(res, 400, 'Missing item.', 'bad_request');
  }
  if (typeof question !== 'string' || question.trim().length === 0 || question.length > 1000) {
    return fail(res, 400, 'Question must be 1 to 1000 characters.', 'bad_request');
  }
  // Only keep well-formed prior turns, and cap how many we send.
  const turns: AskTurn[] = Array.isArray(history)
    ? history
        .filter((t): t is AskTurn => (t?.role === 'user' || t?.role === 'assistant') && typeof t?.content === 'string')
        .slice(-10)
    : [];

  try {
    const answer = await askAboutItem(provider, item as ScanItem, question.trim(), turns);
    res.json({ answer });
  } catch (err) {
    handleAiError(res, err);
  }
});

// Last-resort handler, e.g. malformed JSON in the request body.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const type = typeof err === 'object' && err !== null && 'type' in err ? (err as { type: string }).type : '';
  if (type === 'entity.parse.failed') return fail(res, 400, 'Malformed request body.', 'bad_request');
  if (type === 'entity.too.large') return fail(res, 413, 'Photo is too large. Try again.', 'too_large');
  console.error('[server] unhandled error:', err);
  fail(res, 500, 'Something went wrong on the server.', 'server_error');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Doohav API listening on http://localhost:${PORT} (AI: ${provider.name})`);
});
