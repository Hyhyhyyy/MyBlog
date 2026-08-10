import { desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { aiJobs } from "../../../db/schema";
import { bailianProvider, modelForAction } from "../../../lib/ai/bailian";
import type { AiAction } from "../../../lib/ai/provider";

const AI_ACTIONS: AiAction[] = [
  "organize_capture",
  "plan_tasks",
  "review_day",
  "review_week",
  "draft_publication",
  "transcribe_voice",
  "understand_media",
  "embed_record",
  "rerank_records",
];

// GET /api/ai — list this user's AI jobs (most recent first).
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db
    .select()
    .from(aiJobs)
    .where(eq(aiJobs.ownerEmail, user.email))
    .orderBy(desc(aiJobs.createdAt), desc(aiJobs.id))
    .limit(50);
  return Response.json({ jobs: rows, provider: bailianProvider.name });
}

// POST /api/ai — enqueue a new AI job for the given action.
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const payload = (await request.json().catch(() => ({}))) as {
    action?: string;
    input?: unknown;
    entityType?: string;
    entityId?: number;
    locale?: "zh-CN" | "en";
  };
  if (!payload.action || !AI_ACTIONS.includes(payload.action as AiAction)) {
    return Response.json({ error: "Invalid or missing action" }, { status: 400 });
  }
  const action = payload.action as AiAction;
  const now = new Date();
  const db = await getDb();
  const [job] = await db
    .insert(aiJobs)
    .values({
      ownerEmail: user.email,
      action,
      entityType: payload.entityType ?? "manual",
      entityId: Number.isInteger(payload.entityId) ? payload.entityId : null,
      status: "waiting_for_provider",
      provider: bailianProvider.name,
      model: modelForAction(action),
      inputJson: JSON.stringify(payload.input ?? {}),
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return Response.json({ job }, { status: 201 });
}
