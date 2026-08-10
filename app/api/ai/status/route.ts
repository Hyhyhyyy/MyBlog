import { eq, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { aiJobs } from "../../../../db/schema";
import { bailianProvider } from "../../../../lib/ai/bailian";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const configured = bailianProvider.isConfigured();
  const db = await getDb();

  const [counts] = await db
    .select({
      waiting: sql<number>`SUM(CASE WHEN ${aiJobs.status} = 'waiting_for_provider' THEN 1 ELSE 0 END)`,
      processing: sql<number>`SUM(CASE WHEN ${aiJobs.status} = 'processing' THEN 1 ELSE 0 END)`,
      completed: sql<number>`SUM(CASE WHEN ${aiJobs.status} = 'completed' THEN 1 ELSE 0 END)`,
      failed: sql<number>`SUM(CASE WHEN ${aiJobs.status} = 'failed' THEN 1 ELSE 0 END)`,
      blocked: sql<number>`SUM(CASE WHEN ${aiJobs.status} = 'blocked' THEN 1 ELSE 0 END)`,
    })
    .from(aiJobs)
    .where(eq(aiJobs.ownerEmail, user.email));

  return Response.json({
    configured,
    provider: configured ? bailianProvider.name : null,
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
    capabilities: [
      "organize_capture",
      "plan_tasks",
      "review_day",
      "review_week",
      "draft_publication",
      "transcribe_voice",
      "understand_media",
    ],
    jobs: {
      waiting: Number(counts?.waiting ?? 0),
      processing: Number(counts?.processing ?? 0),
      completed: Number(counts?.completed ?? 0),
      failed: Number(counts?.failed ?? 0),
      blocked: Number(counts?.blocked ?? 0),
    },
    message: configured
      ? "AI 服务商已配置，可在“处理”后自动产出结果。"
      : "接口已预留；在环境变量配置 AI_API_KEY（阿里云百炼/DashScope）后即可启用。未配置时任务会标记为 blocked，不会无限堆积。",
  });
}
