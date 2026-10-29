import { NextResponse } from "next/server";
import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { loginLimits, sessions, users } from "@/db/schema";
import { createSession, destroySession, digest } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { apiUser, body, handleError, HttpError, sameOrigin } from "@/lib/http";
import { loginSchema, passwordChangeSchema } from "@/lib/validation";
export const runtime = "nodejs";
// A fixed dummy hash makes unknown usernames follow the Argon2 verification path.
const dummyHash = hashPassword("dummy-password-never-valid-7hB!");
export async function POST(
  request: Request,
  context: { params: Promise<{ action: string }> },
) {
  try {
    sameOrigin(request);
    const { action } = await context.params;
    if (action === "logout") {
      await destroySession();
      return NextResponse.json({ ok: true });
    }
    if (action === "login") {
      const input = loginSchema.parse(await body(request));
      const trustedHeader = process.env.TRUSTED_IP_HEADER;
      const ip = trustedHeader
        ? request.headers.get(trustedHeader)?.split(",")[0].trim() || "unknown"
        : "shared";
      // Atomic, persistent limits work across serverless instances. Keep successful attempts counted.
      const now = new Date();
      const resetAt = new Date(Date.now() + 15 * 60 * 1000);
      for (const [key, limit] of [
        [`account:${input.username}`, 8],
        [`ip:${ip}`, trustedHeader ? 60 : 200],
      ] as const) {
        const [row] = await db()
          .insert(loginLimits)
          .values({ key: digest(key), resetAt })
          .onConflictDoUpdate({
            target: loginLimits.key,
            set: {
              attempts: sql`case when ${loginLimits.resetAt} < ${now.toISOString()} then 1 else ${loginLimits.attempts} + 1 end`,
              resetAt: sql`case when ${loginLimits.resetAt} < ${now.toISOString()} then ${resetAt.toISOString()}::timestamptz else ${loginLimits.resetAt} end`,
            },
          })
          .returning();
        if (row.attempts > limit)
          throw new HttpError(
            429,
            "Too many attempts. Try again in 15 minutes.",
          );
      }
      const [user] = await db()
        .select()
        .from(users)
        .where(eq(users.username, input.username))
        .limit(1);
      const valid = await verifyPassword(
        user?.passwordHash || (await dummyHash),
        input.password,
      );
      if (!user || !valid || !user.active)
        throw new HttpError(401, "Invalid username or password.");
      await destroySession();
      await createSession(user.id, user.passwordHash);
      await db().delete(sessions).where(lt(sessions.expiresAt, now));
      await db().delete(loginLimits).where(lt(loginLimits.resetAt, now));
      return NextResponse.json({
        redirect: user.mustChangePassword ? "/change-password" : "/",
      });
    }
    if (action === "password") {
      const user = await apiUser(false, true);
      const input = passwordChangeSchema.parse(await body(request));
      if (!(await verifyPassword(user.passwordHash, input.currentPassword)))
        throw new HttpError(400, "Current password is incorrect.");
      if (input.password === input.currentPassword)
        throw new HttpError(400, "Choose a different password.");
      const passwordHash = await hashPassword(input.password);
      await db().transaction(async (tx) => {
        const changed = await tx
          .update(users)
          .set({ passwordHash, mustChangePassword: false })
          .where(
            and(
              eq(users.id, user.id),
              eq(users.passwordHash, user.passwordHash),
            ),
          )
          .returning();
        if (!changed.length)
          throw new HttpError(409, "Account changed. Sign in again.");
        await tx.delete(sessions).where(eq(sessions.userId, user.id));
      });
      await createSession(user.id, passwordHash);
      return NextResponse.json({ redirect: "/" });
    }
    throw new HttpError(404, "Unknown action.");
  } catch (error) {
    return handleError(error);
  }
}
