import { and, asc, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { tasks } from "../../../db/schema";

const starterTasks = [
  ["完成考研基础情况问卷", 15],
  ["进行 408 数据结构基线测试", 45],
  ["整理本周可支配学习时间", 15],
  ["补充一条校园经历的时间与成果", 10],
] as const;

async function owner() {
  return (await getChatGPTUser())?.email ?? null;
}

export async function GET() {
  const email = await owner();
  if (!email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  let rows = await db.select().from(tasks).where(eq(tasks.ownerEmail, email)).orderBy(asc(tasks.position));
  if (rows.length === 0) {
    const now = new Date();
    rows = await db.insert(tasks).values(starterTasks.map(([title, durationMinutes], position) => ({
      ownerEmail: email, title, durationMinutes, position,
      completed: position === 0, createdAt: now, updatedAt: now,
    }))).returning();
  }
  return Response.json({ tasks: rows });
}

export async function POST(request: Request) {
  const email = await owner();
  if (!email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { title?: string; durationMinutes?: number };
  const title = payload.title?.trim();
  if (!title) return Response.json({ error: "请输入任务内容" }, { status: 400 });
  const db = await getDb();
  const current = await db.select({ position: tasks.position }).from(tasks).where(eq(tasks.ownerEmail, email));
  const now = new Date();
  const [task] = await db.insert(tasks).values({
    ownerEmail: email, title, durationMinutes: Math.max(1, payload.durationMinutes ?? 15),
    position: current.length, completed: false, createdAt: now, updatedAt: now,
  }).returning();
  return Response.json({ task }, { status: 201 });
}

export async function PATCH(request: Request) {
  const email = await owner();
  if (!email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const payload = await request.json() as { id?: number; completed?: boolean; title?: string; durationMinutes?: number };
  if (!Number.isInteger(payload.id)) {
    return Response.json({ error: "Invalid task update" }, { status: 400 });
  }
  const updates: { completed?: boolean; title?: string; durationMinutes?: number; updatedAt: Date } = { updatedAt: new Date() };
  if (typeof payload.completed === "boolean") updates.completed = payload.completed;
  if (typeof payload.title === "string" && payload.title.trim()) updates.title = payload.title.trim();
  if (typeof payload.durationMinutes === "number") updates.durationMinutes = Math.max(1, payload.durationMinutes);
  const db = await getDb();
  const [task] = await db.update(tasks).set(updates)
    .where(and(eq(tasks.id, payload.id!), eq(tasks.ownerEmail, email))).returning();
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ task });
}

export async function DELETE(request: Request) {
  const email = await owner();
  if (!email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "Invalid task id" }, { status: 400 });
  const db = await getDb();
  const [task] = await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.ownerEmail, email))).returning();
  if (!task) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ deleted: true });
}
