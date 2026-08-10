import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { aiJobs, assets, captures } from "../../../db/schema";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const audio = form.get("audio");
  const duration = Number(form.get("duration") ?? 0);
  if (!(audio instanceof File)) return Response.json({ error: "没有收到录音" }, { status: 400 });
  if (audio.size > 25 * 1024 * 1024) return Response.json({ error: "录音不能超过25MB" }, { status: 413 });

  const now = new Date();
  const db = await getDb();
  const [capture] = await db.insert(captures).values({
    ownerEmail: user.email,
    kind: "随手记",
    content: `语音记录 · ${Math.max(1, Math.round(duration))} 秒（原音频已保存，等待转写接口启用）`,
    status: "inbox",
    createdAt: now,
    updatedAt: now,
  }).returning();

  const extension = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  const objectKey = `${encodeURIComponent(user.email)}/voice/${crypto.randomUUID()}.${extension}`;
  const { env } = await import("cloudflare:workers");
  await env.BUCKET.put(objectKey, audio.stream(), {
    httpMetadata: { contentType: audio.type || "audio/webm" },
    customMetadata: { captureId: String(capture.id), duration: String(duration) },
  });
  const [asset] = await db.insert(assets).values({
    ownerEmail: user.email,
    objectKey,
    fileName: `语音记录-${now.toISOString().replace(/[:.]/g, "-")}.${extension}`,
    contentType: audio.type || "audio/webm",
    size: audio.size,
    captureId: capture.id,
    createdAt: now,
  }).returning();
  await db.insert(aiJobs).values({
    ownerEmail: user.email,
    action: "transcribe_voice",
    entityType: "capture",
    entityId: capture.id,
    status: "waiting_for_provider",
    provider: "aliyun-bailian",
    model: "fun-asr",
    inputJson: JSON.stringify({ assetId: asset.id, duration }),
    createdAt: now,
    updatedAt: now,
  });
  return Response.json({ capture, asset, transcriptionStatus: "waiting_for_provider" }, { status: 201 });
}
