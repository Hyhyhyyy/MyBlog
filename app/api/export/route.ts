import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { assets, captures, records, tasks } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const [taskRows, captureRows, recordRows, assetRows] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.ownerEmail, user.email)),
    db.select().from(captures).where(eq(captures.ownerEmail, user.email)),
    db.select().from(records).where(eq(records.ownerEmail, user.email)),
    db.select().from(assets).where(eq(assets.ownerEmail, user.email)),
  ]);
  const payload = {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    profile: { nickname: "Hyhyhyyy" },
    tasks: taskRows,
    captures: captureRows,
    records: recordRows,
    assets: assetRows.map((asset) => ({
      id: asset.id,
      fileName: asset.fileName,
      contentType: asset.contentType,
      size: asset.size,
      captureId: asset.captureId,
      createdAt: asset.createdAt,
    })),
  };
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="hyhy-growth-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "private, no-store",
    },
  });
}
