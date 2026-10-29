// Disposable, loopback-only test database. Never imported by application code.
import { PGlite } from "@electric-sql/pglite";
import { createServer } from "pglite-server";
import { applyTestMigrations } from "./test-migrations";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { hashPassword } from "../src/lib/password";
import { browserPassword } from "../tests/browser-fixtures";
async function main() {
  const pg = new PGlite();
  await pg.waitReady;
  await applyTestMigrations(pg);
  const hash = await hashPassword(browserPassword);
  await pg.query(
    'INSERT INTO users (username,"passwordHash",role,"mustChangePassword") VALUES ($1,$2,$3,false),($4,$2,$5,true),($6,$2,$5,false),($7,$2,$5,false)',
    [
      "browseradmin",
      hash,
      "admin",
      "firstlogin",
      "user",
      "productivity",
      "advanced",
    ],
  );
  const server = createServer(pg);
  await pg.exec(
    `INSERT INTO tasks ("userId",title,priority,"dueAt","createdAt","updatedAt") SELECT id,'Neglected planning task','critical',now()-interval '1 day',now()-interval '30 days',now()-interval '20 days' FROM users WHERE username='productivity'`,
  );
  await new Promise<void>((resolve) =>
    server.listen(55439, "127.0.0.1", resolve),
  );
  const child = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "dev",
      "--port",
      "3100",
      "--hostname",
      "127.0.0.1",
    ],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        DATABASE_URL: "postgresql://postgres@127.0.0.1:55439/postgres",
        DB_POOL_MAX: "1",
        AUTH_SECRET: randomBytes(32).toString("hex"),
        APP_URL: "http://127.0.0.1:3100",
        NEXT_TELEMETRY_DISABLED: "1",
        TASKFLOW_TEST_BUILD: "1",
      },
    },
  );
  const close = () => {
    child.kill();
    server.close();
    void pg.close();
  };
  process.on("SIGINT", close);
  process.on("SIGTERM", close);
  child.on("exit", (code) => {
    server.close();
    void pg.close().finally(() => process.exit(code || 0));
  });
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
