import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

// Local-preview helper. Miniflare does not reliably apply `migrations_dir` from
// the inline Vite config, and the worker runtime's working directory is not the
// project root, so reading drizzle/*.sql at runtime is unreliable. We therefore
// inline the schema (mirroring drizzle/0000_*.sql and 0001_*.sql) and create it
// idempotently the first time the DB is touched in a process. In production the
// hosting platform applies the real migrations, so these IF NOT EXISTS statements
// are a harmless no-op. Keep this in sync with the drizzle migration files.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS \`assets\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`owner_email\` text NOT NULL,
  \`object_key\` text NOT NULL,
  \`file_name\` text NOT NULL,
  \`content_type\` text NOT NULL,
  \`size\` integer NOT NULL,
  \`capture_id\` integer,
  \`created_at\` integer NOT NULL,
  FOREIGN KEY (\`capture_id\`) REFERENCES \`captures\`(\`id\`) ON UPDATE no action ON DELETE no action
);
CREATE UNIQUE INDEX IF NOT EXISTS \`assets_object_key_unique\` ON \`assets\` (\`object_key\`);
CREATE TABLE IF NOT EXISTS \`captures\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`owner_email\` text NOT NULL,
  \`kind\` text NOT NULL,
  \`content\` text NOT NULL,
  \`status\` text DEFAULT 'inbox' NOT NULL,
  \`created_at\` integer NOT NULL,
  \`updated_at\` integer NOT NULL
);
CREATE TABLE IF NOT EXISTS \`tasks\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`owner_email\` text NOT NULL,
  \`title\` text NOT NULL,
  \`duration_minutes\` integer DEFAULT 15 NOT NULL,
  \`completed\` integer DEFAULT false NOT NULL,
  \`position\` integer DEFAULT 0 NOT NULL,
  \`created_at\` integer NOT NULL,
  \`updated_at\` integer NOT NULL
);
CREATE TABLE IF NOT EXISTS \`ai_jobs\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`owner_email\` text NOT NULL,
  \`action\` text NOT NULL,
  \`entity_type\` text NOT NULL,
  \`entity_id\` integer,
  \`status\` text DEFAULT 'waiting_for_provider' NOT NULL,
  \`provider\` text,
  \`model\` text,
  \`input_json\` text DEFAULT '{}' NOT NULL,
  \`output_json\` text,
  \`error\` text,
  \`created_at\` integer NOT NULL,
  \`updated_at\` integer NOT NULL
);
CREATE TABLE IF NOT EXISTS \`records\` (
  \`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  \`owner_email\` text NOT NULL,
  \`category\` text NOT NULL,
  \`title\` text NOT NULL,
  \`description\` text DEFAULT '' NOT NULL,
  \`status\` text DEFAULT 'draft' NOT NULL,
  \`visibility\` text DEFAULT 'private' NOT NULL,
  \`started_at\` text,
  \`ended_at\` text,
  \`metadata_json\` text DEFAULT '{}' NOT NULL,
  \`created_at\` integer NOT NULL,
  \`updated_at\` integer NOT NULL
);
`;

let schemaReady: Promise<void> | null = null;

async function ensureSchema(env: { DB: unknown }): Promise<void> {
  if (schemaReady) return schemaReady;
  schemaReady = (async () => {
    // D1's `exec` cannot reliably parse a multi-statement batch here, so apply
    // each statement individually. Splitting on ";" is safe because none of the
    // DDL string literals contain one.
    const db = env.DB as {
      prepare(sql: string): { run(): Promise<unknown> };
    };
    const statements = SCHEMA_SQL.split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await db.prepare(stmt).run();
    }
  })().catch((err) => {
    schemaReady = null; // allow a retry on the next request
    throw err;
  });
  return schemaReady;
}

export async function getDb() {
  const { env } = await import("cloudflare:workers");
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.",
    );
  }
  await ensureSchema(env as { DB: unknown });
  return drizzle(env.DB, { schema });
}
