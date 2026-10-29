import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import { postgresOptions } from "@/lib/postgres-options";
let instance: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("Database is not configured. Follow README.md.");
  instance ??= drizzle(
    new Pool({
      ...postgresOptions(process.env.DATABASE_URL),
      max: Math.max(1, Math.min(5, Number(process.env.DB_POOL_MAX) || 3)),
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    }),
    { schema },
  );
  return instance;
}
