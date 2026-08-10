export type AiAction =
  | "organize_capture"
  | "plan_tasks"
  | "review_day"
  | "review_week"
  | "draft_publication"
  | "transcribe_voice"
  | "understand_media"
  | "embed_record"
  | "rerank_records";

export const MODEL_ROUTES = {
  daily: "qwen3.7-plus",
  deepReview: "qwen3.7-max",
  lightweight: "qwen3.6-flash",
  multimodal: "qwen3.5-omni-plus",
  realtimeAsr: "fun-asr-realtime",
  fileAsr: "fun-asr",
  embedding: "text-embedding-v4",
  rerank: "qwen3-rerank",
  fallback: "deepseek-v4-pro",
} as const;

export type AiRequest<T = unknown> = {
  action: AiAction;
  ownerEmail: string;
  input: T;
  locale: "zh-CN" | "en";
};

export type AiResult<T = unknown> = {
  provider: string;
  model: string;
  output: T;
  usage?: { inputTokens?: number; outputTokens?: number };
};

export interface AiProvider {
  readonly name: string;
  isConfigured(): boolean;
  run<TInput, TOutput>(request: AiRequest<TInput>): Promise<AiResult<TOutput>>;
}

export class AiProviderUnavailableError extends Error {
  constructor() {
    super("AI provider is not configured");
    this.name = "AiProviderUnavailableError";
  }
}
