import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { and, desc, eq } from "drizzle-orm";
import { assets } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.select().from(assets).where(eq(assets.ownerEmail, user.email))
    .orderBy(desc(assets.createdAt)).limit(100);
  return Response.json({ assets: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "请选择文件" }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return Response.json({ error: "文件不能超过 20MB" }, { status: 413 });
  const safeName = file.name.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(-120);
  const objectKey = `${encodeURIComponent(user.email)}/${crypto.randomUUID()}-${safeName}`;
  const { env } = await import("cloudflare:workers");
  await env.BUCKET.put(objectKey, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  const db = await getDb();
  const [asset] = await db.insert(assets).values({
    ownerEmail: user.email, objectKey, fileName: file.name,
    contentType: file.type || "application/octet-stream", size: file.size, createdAt: new Date(),
  }).returning();
  return Response.json({ asset }, { status: 201 });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid asset id" }, { status: 400 });
  const db = await getDb();
  const [asset] = await db.select().from(assets)
    .where(and(eq(assets.id, id), eq(assets.ownerEmail, user.email))).limit(1);
  if (!asset) return Response.json({ error: "Not found" }, { status: 404 });
  const { env } = await import("cloudflare:workers");
  await env.BUCKET.delete(asset.objectKey);
  await db.delete(assets).where(and(eq(assets.id, id), eq(assets.ownerEmail, user.email)));
  return Response.json({ deleted: true });
}
