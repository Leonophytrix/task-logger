import { readFileSync } from "node:fs";
// Test databases execute the same ordered SQL files as the production migrator.
export async function applyTestMigrations(database: {
  exec: (sql: string) => Promise<unknown>;
}) {
  const journal = JSON.parse(
    readFileSync("drizzle/meta/_journal.json", "utf8"),
  ) as { entries: { tag: string }[] };
  for (const { tag } of journal.entries)
    await database.exec(readFileSync(`drizzle/${tag}.sql`, "utf8"));
}
