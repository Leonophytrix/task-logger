import { expect, it } from "vitest";
import { databaseTLS } from "../src/lib/database-tls";
import { postgresOptions } from "../src/lib/postgres-options";
it("does not let URL flags disable remote certificate verification", () => {
  const options = postgresOptions(
    "postgresql://postgres@db.example.com/postgres?sslmode=disable&ssl=false",
  );
  expect(options.ssl).toEqual({ rejectUnauthorized: true });
  expect(options.connectionString).not.toContain("ssl");
});
it("requires verified TLS for every remote connection and every production connection", () => {
  expect(
    databaseTLS("postgresql://postgres@db.example.com/postgres", "development"),
  ).toBe("verify-full");
  expect(
    databaseTLS(
      "postgresql://postgres@127.0.0.1:55439/postgres",
      "development",
    ),
  ).toBe(false);
  expect(
    databaseTLS("postgresql://postgres@localhost/postgres", "production"),
  ).toBe("verify-full");
});
