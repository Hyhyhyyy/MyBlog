import { getChatGPTUser } from "../../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({
    configured: false,
    provider: null,
    models: {
      daily: "qwen3.7-plus",
      deepReview: "qwen3.7-max",
      lightweight: "qwen3.6-flash",
      multimodal: "qwen3.5-omni-plus",
      realtimeAsr: "fun-asr-realtime",
      fileAsr: "fun-asr",
      embedding: "text-embedding-v4",
      rerank: "qwen3-rerank",
      fallback: "deepseek-v4-pro",
    },
    capabilities: ["organize_capture", "plan_tasks", "review_day", "review_week", "draft_publication", "transcribe_voice", "understand_media"],
    message: "接口已预留；配置服务端供应商密钥后启用。",
  });
}
