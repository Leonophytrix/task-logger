import "dotenv/config";
import { createInterface } from "node:readline/promises";
import { randomBytes } from "node:crypto";
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { users } from "../src/db/schema";
import { hashPassword } from "../src/lib/password";
import { usernameSchema } from "../src/lib/validation";
import { postgresOptions } from "../src/lib/postgres-options";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL in .env.");
  const terminal = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const username = usernameSchema.parse(
    await terminal.question("Initial admin username: "),
  );
  terminal.close();
  const client = new Client(
    postgresOptions(
      process.env.DATABASE_MIGRATION_URL || process.env.DATABASE_URL,
    ),
  );
  await client.connect();
  try {
    const database = drizzle(client);
    const password = randomBytes(24).toString("base64url");
    const passwordHash = await hashPassword(password);
    await database.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(842190)`);
      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"));
      if (admins.length)
        throw new Error(
          "An administrator already exists. Use User Management.",
        );
      await tx.insert(users).values({
        username,
        passwordHash,
        role: "admin",
        mustChangePassword: true,
      });
    });
    console.log(
      `\nAdmin created: ${username}\nTemporary password (shown once): ${password}\nStore it privately; change it at first login.\n`,
    );
  } finally {
    await client.end();
  }
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Setup failed");
  process.exitCode = 1;
});
