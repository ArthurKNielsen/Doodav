import { createGemini } from './gemini.js';
import { createOllama } from './ollama.js';
import type { LlmProvider } from './types.js';

export { LlmError } from './types.js';
export type { LlmProvider, LlmRequest, LlmMessage } from './types.js';

export function createProvider(env: NodeJS.ProcessEnv = process.env): LlmProvider {
  const choice = (env.AI_PROVIDER || 'ollama').trim().toLowerCase();
  if (choice === 'ollama') return createOllama(env);
  if (choice === 'gemini') return createGemini(env);
  throw new Error(`Unknown AI_PROVIDER "${choice}". Use "ollama" or "gemini".`);
}
