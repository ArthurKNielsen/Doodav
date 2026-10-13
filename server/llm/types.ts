// Provider-neutral interface for the vision/chat model. The rest of the app
// only talks to this, so swapping Ollama for Gemini (or another host) is a config change.

export interface LlmMessage {
  role: 'user' | 'assistant';
  text: string;
  /** Raw base64 JPEG (no data: prefix), attached to the message when present. */
  imageBase64?: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  /** Ask the provider for JSON output where it supports it. */
  json: boolean;
  maxTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  complete(req: LlmRequest): Promise<string>;
  /** Cheap check for the UI: is the provider configured and reachable? */
  checkReady(): Promise<{ ready: boolean; message: string }>;
}

/** An error the route can show directly. `status` is the HTTP status to return. */
export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'LlmError';
  }
}
