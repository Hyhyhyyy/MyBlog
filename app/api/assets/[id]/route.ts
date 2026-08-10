import { and, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { assets } from "../../../../db/schema";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const db = await getDb();
  const [asset] = await db.select().from(assets)
    .where(and(eq(assets.id, Number(id)), eq(assets.ownerEmail, user.email))).limit(1);
  if (!asset) return Response.json({ error: "Not found" }, { status: 404 });
  const { env } = await import("cloudflare:workers");
  const object = await env.BUCKET.get(asset.objectKey);
  if (!object) return Response.json({ error: "File missing" }, { status: 404 });
  return new Response(object.body, {
    headers: {
      "content-type": asset.contentType,
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(asset.fileName)}`,
      "cache-control": "private, no-store",
    },
  });
}
