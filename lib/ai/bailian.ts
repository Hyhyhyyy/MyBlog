// lib/ai/bailian.ts — Concrete Aliyun Bailian (DashScope) provider adapter.
//
// DashScope exposes an OpenAI-compatible surface, so the chat actions map 1:1
// onto /chat/completions, and speech-to-text maps onto /audio/transcriptions.
// The provider is purely env-driven: set AI_API_KEY (or ALIYUN_DASHSCOPE_API_KEY)
// to enable it. Without a key, isConfigured() is false and the queue processor
// marks jobs `blocked` instead of leaving them dangling in `waiting_for_provider`.

import {
  AiAction,
  AiProvider,
  AiProviderUnavailableError,
  AiRequest,
  AiResult,
  MODEL_ROUTES,
} from "./provider";

const DEFAULT_BASE_URL = "https://dashscope.aliyuncs.com/compatible-mode/v1";

function apiKey(): string | undefined {
  return process.env.AI_API_KEY || process.env.ALIYUN_DASHSCOPE_API_KEY || undefined;
}

function baseUrl(): string {
  return process.env.AI_BASE_URL || DEFAULT_BASE_URL;
}

// Map each action to its reserved model. Mirrors PROJECT_PROGRESS.md routing.
export function modelForAction(action: AiAction): string {
  switch (action) {
    case "organize_capture":
    case "plan_tasks":
      return MODEL_ROUTES.daily;
    case "review_day":
    case "review_week":
      return MODEL_ROUTES.deepReview;
    case "draft_publication":
    case "embed_record":
      return MODEL_ROUTES.lightweight;
    case "understand_media":
      return MODEL_ROUTES.multimodal;
    case "rerank_records":
      return MODEL_ROUTES.rerank;
    case "transcribe_voice":
      return MODEL_ROUTES.fileAsr;
    default:
      return MODEL_ROUTES.fallback;
  }
}

function systemPromptFor(action: AiAction, locale: "zh-CN" | "en"): string {
  const zh: Record<AiAction, string> = {
    organize_capture: "你是成长档案的整理助手。用户给一条原始记录，请提炼事实要点、推断所属类别，并给出可归档的一句话摘要。只输出结构化要点，不要编造用户未提供的事实。",
    plan_tasks: "你是时间规划助手。根据用户的近期记录与目标，拆解出 3-5 条具体、可执行的今日/本周任务，每条给出预估时长（分钟）。",
    review_day: "你是每日复盘助手。基于当日任务与记录，复盘完成度、遇到的阻碍，以及明天应做的 1-3 项调整。语气克制、具体。",
    review_week: "你是每周复盘助手。汇总本周成长信号，指出稳定进展与风险，给出下周优先级建议。",
    draft_publication: "你是公开表达助手。把一条私密档案改写成适合公开成长时间线的简短陈述，保留事实、去除敏感信息。",
    transcribe_voice: "你是语音转写助手。把语音内容转写为通顺的中文文本。",
    understand_media: "你是多模态理解助手。针对用户上传的图片/文件，描述其内容要点并给出可记入档案的简短说明。",
    embed_record: "你是语义向量助手。为一条档案生成 3-5 个用于检索的关键短语（逗号分隔），不要解释。",
    rerank_records: "你是重排序助手。给定查询与若干档案片段，按相关性从高到低返回其编号，逗号分隔。",
  };
  const en: Record<AiAction, string> = {
    organize_capture: "You are an organizing assistant for a growth archive. Distill the raw note into factual bullets, infer its category, and give a one-line archivable summary. Do not invent facts not present.",
    plan_tasks: "You are a planning assistant. From the user's recent notes and goals, break work into 3-5 concrete tasks with estimated minutes.",
    review_day: "You are a daily-review assistant. Review today's tasks and notes: completion, blockers, and 1-3 adjustments for tomorrow. Be restrained and specific.",
    review_week: "You are a weekly-review assistant. Summarize the week's growth signals, flag risks, and suggest next-week priorities.",
    draft_publication: "You are a public-writing assistant. Rewrite a private record into a short statement fit for a public timeline, keeping facts and dropping sensitive details.",
    transcribe_voice: "You are a transcription assistant. Transcribe the speech into fluent text.",
    understand_media: "You are a multimodal assistant. Describe the uploaded image/file and give a short note worth archiving.",
    embed_record: "You are an embedding assistant. Produce 3-5 comma-separated key phrases for retrieval. No explanation.",
    rerank_records: "You are a reranking assistant. Given a query and passages, return their indices most-to-least relevant, comma-separated.",
  };
  return (locale === "en" ? en : zh)[action];
}

function userPromptFor(action: AiAction, input: unknown, locale: "zh-CN" | "en"): string {
  const asText = typeof input === "string" ? input : JSON.stringify(input ?? {}, null, 2);
  if (locale === "en") return `Action: ${action}\nInput:\n${asText}`;
  return `动作：${action}\n输入内容：\n${asText}`;
}

async function chatCompletion(action: AiAction, input: unknown, locale: "zh-CN" | "en", key: string): Promise<AiResult<string>> {
  const model = modelForAction(action);
  const res = await fetch(`${baseUrl()}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPromptFor(action, locale) },
        { role: "user", content: userPromptFor(action, input, locale) },
      ],
      temperature: 0.6,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`bailian ${res.status}: ${detail.slice(0, 400)}`);
  }
  const data = await res.json();
  const output = data?.choices?.[0]?.message?.content ?? "";
  const usage = data?.usage
    ? { inputTokens: data.usage.prompt_tokens, outputTokens: data.usage.completion_tokens }
    : undefined;
  return { provider: "aliyun-bailian", model, output, usage };
}

// Transcribe raw audio bytes via DashScope's OpenAI-compatible transcription
// endpoint. Returns the transcript text. Caller is responsible for acquiring
// the bytes (e.g. from R2) and the API key.
export async function transcribeAudio(audio: Blob, fileName: string, key: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, fileName);
  form.append("model", MODEL_ROUTES.fileAsr);
  const res = await fetch(`${baseUrl()}/audio/transcriptions`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}` },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`bailian asr ${res.status}: ${detail.slice(0, 400)}`);
  }
  const data = await res.json();
  return data?.text ?? data?.choices?.[0]?.text ?? JSON.stringify(data).slice(0, 400);
}

export const bailianProvider: AiProvider = {
  name: "aliyun-bailian",
  isConfigured() {
    return Boolean(apiKey());
  },
  async run<TInput, TOutput>(request: AiRequest<TInput>): Promise<AiResult<TOutput>> {
    const key = apiKey();
    if (!key) throw new AiProviderUnavailableError();
    if (request.action === "transcribe_voice") {
      // Voice transcription is handled by the queue processor, which has access
      // to the R2 bucket to fetch the audio bytes. Here we only guard config.
      throw new AiProviderUnavailableError();
    }
    const result = await chatCompletion(request.action, request.input, request.locale, key);
    return result as unknown as AiResult<TOutput>;
  },
};
