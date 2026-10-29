import "dotenv/config";
import { Client } from "pg";
import { postgresOptions } from "../src/lib/postgres-options";
async function main() {
  const url = process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL in .env.");
  const client = new Client({
    ...postgresOptions(url),
    connectionTimeoutMillis: 10000,
  });
  await client.connect();
  try {
    const names = [
      "users",
      "sessions",
      "login_limits",
      "tasks",
      "categories",
      "activity",
      "events",
      "notifications",
      "notification_preferences",
      "interface_preferences",
      "task_items",
      "task_tags",
      "task_history",
    ];
    const result = await client.query<{
      relname: string;
      relrowsecurity: boolean;
    }>(
      "select c.relname,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=any($1::text[])",
      [names],
    );
    if (
      result.rows.length !== names.length ||
      result.rows.some((r) => !r.relrowsecurity)
    )
      throw new Error(
        "Missing app tables or row-level security. Run db:migrate and inspect the security migrations.",
      );
    const privileges = await client.query(
      "select r.rolname,c.relname from pg_roles r cross join pg_class c join pg_namespace n on n.oid=c.relnamespace where r.rolname in ('anon','authenticated') and n.nspname='public' and c.relname=any($1::text[]) and (has_table_privilege(r.rolname,c.oid,'SELECT') or has_table_privilege(r.rolname,c.oid,'INSERT') or has_table_privilege(r.rolname,c.oid,'UPDATE') or has_table_privilege(r.rolname,c.oid,'DELETE'))",
      [names],
    );
    if (privileges.rowCount)
      throw new Error(
        "Browser database roles still have privileges on private tables. Review the security migrations.",
      );
    const columns = await client.query(
      "select column_name from information_schema.columns where table_schema='public' and table_name='activity' and column_name in ('kind','durationMinutes')",
    );
    if (columns.rowCount !== 2)
      throw new Error("Work-log migration is missing.");
    const taskColumns = await client.query(
      "select column_name from information_schema.columns where table_schema='public' and table_name='tasks' and column_name in ('notes','recurrence','recurrenceUntil','recurrenceAnchor','seriesId','occurrence','timeZone')",
    );
    if (taskColumns.rowCount !== 7)
      throw new Error("Phase 3 recurring-task migration is missing.");
    const migrations = await client.query<{ count: string }>(
      "select count(*) from drizzle.__drizzle_migrations",
    );
    console.log(
      `Database verified: ${result.rows.length} private tables, RLS enabled, no browser-role access, work-log and recurring-task fields present, ${migrations.rows[0].count} migrations recorded. No user content was read.`,
    );
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  const error = e as { code?: string; message?: string };
  console.error(
    error.code
      ? `Database verification failed (${error.code}). Check connectivity and certificate configuration.`
      : error.message || "Database verification failed.",
  );
  process.exitCode = 1;
});
