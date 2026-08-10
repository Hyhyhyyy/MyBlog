import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { records } from "../../../db/schema";

const categories = ["goal", "study", "project", "experience", "achievement", "review"];

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const category = new URL(request.url).searchParams.get("category");
  const db = await getDb();
  const rows = category && categories.includes(category)
    ? await db.select().from(records).where(and(eq(records.ownerEmail, user.email), eq(records.category, category))).orderBy(desc(records.updatedAt))
    : await db.select().from(records).where(eq(records.ownerEmail, user.email)).orderBy(desc(records.updatedAt));
  return Response.json({ records: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { category?: string; title?: string; description?: string; startedAt?: string; endedAt?: string };
  if (!categories.includes(payload.category ?? "")) return Response.json({ error: "Invalid category" }, { status: 400 });
  if (!payload.title?.trim()) return Response.json({ error: "请输入标题" }, { status: 400 });
  const now = new Date();
  const db = await getDb();
  const [record] = await db.insert(records).values({
    ownerEmail: user.email, category: payload.category!, title: payload.title.trim(),
    description: payload.description?.trim() ?? "", status: "draft", visibility: "private",
    startedAt: payload.startedAt || null, endedAt: payload.endedAt || null,
    createdAt: now, updatedAt: now,
  }).returning();
  return Response.json({ record }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { id?: number; title?: string; description?: string; status?: string; visibility?: string; startedAt?: string; endedAt?: string };
  if (!Number.isInteger(payload.id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  const updates: Record<string, string | Date | null> = { updatedAt: new Date() };
  if (payload.title?.trim()) updates.title = payload.title.trim();
  if (typeof payload.description === "string") updates.description = payload.description.trim();
  if (["draft", "active", "completed", "archived"].includes(payload.status ?? "")) updates.status = payload.status!;
  if (["private", "public"].includes(payload.visibility ?? "")) updates.visibility = payload.visibility!;
  if (typeof payload.startedAt === "string") updates.startedAt = payload.startedAt || null;
  if (typeof payload.endedAt === "string") updates.endedAt = payload.endedAt || null;
  const db = await getDb();
  const [record] = await db.update(records).set(updates)
    .where(and(eq(records.id, payload.id!), eq(records.ownerEmail, user.email))).returning();
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ record });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid id" }, { status: 400 });
  const db = await getDb();
  const [record] = await db.delete(records).where(and(eq(records.id, id), eq(records.ownerEmail, user.email))).returning();
  if (!record) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ deleted: true });
}
