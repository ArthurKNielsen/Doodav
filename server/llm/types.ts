
export interface LlmMessage {
  role: 'user' | 'assistant';
  text: string;
  imageBase64?: string;
}

export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  json: boolean;
  maxTokens: number;
}

export interface LlmProvider {
  readonly name: string;
  complete(req: LlmRequest): Promise<string>;
  checkReady(): Promise<{ ready: boolean; message: string }>;
}

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
