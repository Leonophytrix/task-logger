import { it, expect } from "vitest";
import {
  contentSecurityPolicy,
  sessionCookieName,
  sessionCookieOptions,
  applicationOrigin,
} from "../src/lib/security-policy";
import { postgresOptions } from "../src/lib/postgres-options";
it("requires production HTTPS origins and rejects credential-bearing or path URLs", () => {
  expect(applicationOrigin("https://taskflow.example", "production")).toBe(
    "https://taskflow.example",
  );
  expect(() =>
    applicationOrigin("http://taskflow.example", "production"),
  ).toThrow();
  expect(() =>
    applicationOrigin("https://name:secret@example.com", "production"),
  ).toThrow();
  expect(() =>
    applicationOrigin("https://example.com/subpath", "production"),
  ).toThrow();
});
it("uses secure host-only production sessions", () => {
  const policy = sessionCookieOptions(new Date(), "production");
  expect(sessionCookieName("production")).toBe("__Host-taskflow");
  expect(policy.httpOnly).toBe(true);
  expect(policy.secure).toBe(true);
  expect(policy.sameSite).toBe("lax");
  expect(policy.path).toBe("/");
  expect(policy).not.toHaveProperty("domain");
});
it("requires nonced production scripts without unsafe script execution", () => {
  const policy = contentSecurityPolicy("example-nonce", false);
  const scripts = policy
    .split(";")
    .find((p) => p.trim().startsWith("script-src"))!;
  expect(scripts).toContain("'nonce-example-nonce'");
  expect(scripts).toContain("'strict-dynamic'");
  expect(scripts).not.toContain("unsafe-inline");
  expect(scripts).not.toContain("unsafe-eval");
  expect(policy).toContain("frame-ancestors 'none'");
});
it("rejects malformed certificate values instead of disabling TLS checks", () => {
  expect(() =>
    postgresOptions(
      "postgresql://postgres@db.example.com/postgres",
      "not a certificate",
    ),
  ).toThrow("DATABASE_CA_CERT");
});
