import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { aiJobs, assets } from "../../../../db/schema";
import { bailianProvider, transcribeAudio } from "../../../../lib/ai/bailian";
import { AiAction, AiProviderUnavailableError } from "../../../../lib/ai/provider";

// POST /api/ai/process — drain this user's `waiting_for_provider` jobs.
//
// Each job is moved to a terminal state so the queue never grows unbounded:
//   - completed : provider returned a result (outputJson written)
//   - blocked   : provider not configured (no API key) — needs secrets
//   - failed    : provider call errored (error written for inspection)
// Without an API key every job lands in `blocked`, which is the honest closed
// state; set AI_API_KEY (or ALIYUN_DASHSCOPE_API_KEY) to let them complete.

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const rawId = url.searchParams.get("id");
  const onlyId = rawId != null && rawId !== "" ? Number(rawId) : NaN;
  const db = await getDb();

  // Select by owner, then filter by status (and optional id) in JS. Selecting
  // with the combined `and(owner, status)` predicate returned no rows against
  // Miniflare's D1 in this setup, so we keep the predicate simple and filter
  // the small result set in memory — safe for a single-user job queue.
  const owned = await db.select().from(aiJobs).where(eq(aiJobs.ownerEmail, user.email));
  const pending = owned.filter(
    (j) => j.status === "waiting_for_provider" && (!Number.isInteger(onlyId) || j.id === onlyId),
  );

  let completed = 0;
  let failed = 0;
  let blocked = 0;

  for (const job of pending) {
    const now = new Date();
    await db.update(aiJobs).set({ status: "processing", updatedAt: now }).where(eq(aiJobs.id, job.id));
    try {
      let outputJson: string;
      if (job.action === "transcribe_voice") {
        outputJson = JSON.stringify(await runTranscription(job, user.email));
      } else {
        if (!bailianProvider.isConfigured()) throw new AiProviderUnavailableError();
        const input = safeParse(job.inputJson);
        const result = await bailianProvider.run({
          action: job.action as AiAction,
          ownerEmail: user.email,
          input,
          locale: "zh-CN",
        });
        outputJson = JSON.stringify(result.output);
        await db.update(aiJobs).set({ provider: result.provider, model: result.model }).where(eq(aiJobs.id, job.id));
      }
      await db
        .update(aiJobs)
        .set({ status: "completed", outputJson, error: null, updatedAt: new Date() })
        .where(eq(aiJobs.id, job.id));
      completed += 1;
    } catch (err) {
      const notConfigured = err instanceof AiProviderUnavailableError || !bailianProvider.isConfigured();
      const status = notConfigured ? "blocked" : "failed";
      const message = err instanceof Error ? err.message : String(err);
      await db
        .update(aiJobs)
        .set({ status, error: message.slice(0, 500), updatedAt: new Date() })
        .where(eq(aiJobs.id, job.id));
      if (notConfigured) blocked += 1;
      else failed += 1;
    }
  }

  return Response.json({ processed: pending.length, completed, failed, blocked });
}

async function runTranscription(job: typeof aiJobs.$inferSelect, _ownerEmail: string): Promise<{ transcript: string }> {
  if (!bailianProvider.isConfigured()) throw new AiProviderUnavailableError();
  const key = process.env.AI_API_KEY || process.env.ALIYUN_DASHSCOPE_API_KEY || "";
  const input = safeParse(job.inputJson) as { assetId?: number };
  const assetId = input.assetId;
  if (typeof assetId !== "number") throw new Error("transcription job missing assetId");

  const db = await getDb();
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId)).limit(1);
  if (!asset) throw new Error(`asset ${assetId} not found`);

  const { env } = await import("cloudflare:workers");
  const object = await env.BUCKET.get(asset.objectKey);
  if (!object) throw new Error(`R2 object ${asset.objectKey} not found`);
  const blob = new Blob([await object.arrayBuffer()], { type: asset.contentType || "audio/webm" });
  const transcript = await transcribeAudio(blob, asset.fileName, key);
  return { transcript };
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
