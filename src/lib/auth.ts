import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { sessionCookieName, sessionCookieOptions } from "./security-policy";
export const cookieName = sessionCookieName();
export function digest(value: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set AUTH_SECRET to at least 32 random characters.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
export async function currentUser() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token || !process.env.DATABASE_URL) return null;
  const [row] = await db()
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.tokenHash, digest(token)),
        gt(sessions.expiresAt, new Date()),
        eq(users.active, true),
      ),
    )
    .limit(1);
  return row?.user ?? null;
}
export async function requirePageUser() {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  return { id: user.id, username: user.username, role: user.role };
}
export async function createSession(
  userId: string,
  expectedPasswordHash: string,
) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db().transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .for("update");
    if (!user?.active || user.passwordHash !== expectedPasswordHash)
      throw new Error("Account changed during sign in.");
    await tx
      .insert(sessions)
      .values({ tokenHash: digest(token), userId, expiresAt: expires });
  });
  (await cookies()).set(cookieName, token, sessionCookieOptions(expires));
}
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(cookieName)?.value;
  if (token)
    await db()
      .delete(sessions)
      .where(eq(sessions.tokenHash, digest(token)));
  jar.delete(cookieName);
}
