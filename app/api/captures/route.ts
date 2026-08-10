import { and, desc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { captures } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const rows = await db.select().from(captures)
    .where(eq(captures.ownerEmail, user.email)).orderBy(desc(captures.createdAt)).limit(50);
  return Response.json({ captures: rows });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { kind?: string; content?: string };
  const content = payload.content?.trim();
  if (!content) return Response.json({ error: "请先写下一点内容" }, { status: 400 });
  const allowedKinds = ["随手记", "学习", "项目", "经历", "成果"];
  const kind = allowedKinds.includes(payload.kind ?? "") ? payload.kind! : "随手记";
  const now = new Date();
  const db = await getDb();
  const [capture] = await db.insert(captures).values({
    ownerEmail: user.email, kind, content, status: "inbox", createdAt: now, updatedAt: now,
  }).returning();
  return Response.json({ capture }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { id?: number; content?: string; kind?: string; status?: string };
  if (!Number.isInteger(payload.id)) return Response.json({ error: "Invalid capture id" }, { status: 400 });
  const updates: { content?: string; kind?: string; status?: string; updatedAt: Date } = { updatedAt: new Date() };
  if (payload.content?.trim()) updates.content = payload.content.trim();
  if (["随手记", "学习", "项目", "经历", "成果"].includes(payload.kind ?? "")) updates.kind = payload.kind;
  if (["inbox", "confirmed", "archived"].includes(payload.status ?? "")) updates.status = payload.status;
  const db = await getDb();
  const [capture] = await db.update(captures).set(updates)
    .where(and(eq(captures.id, payload.id!), eq(captures.ownerEmail, user.email))).returning();
  if (!capture) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ capture });
}

export async function DELETE(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid capture id" }, { status: 400 });
  const db = await getDb();
  const [capture] = await db.delete(captures)
    .where(and(eq(captures.id, id), eq(captures.ownerEmail, user.email))).returning();
  if (!capture) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ deleted: true });
}
