import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, sessions } from "@/db/schema";
import { apiUser, body, handleError, HttpError, sameOrigin } from "@/lib/http";
import { userUpdateSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  return mutate(request, context, false);
}
export async function DELETE(request: Request, context: Context) {
  return mutate(request, context, true);
}
async function mutate(request: Request, context: Context, remove: boolean) {
  try {
    sameOrigin(request);
    const actor = await apiUser(true);
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    if (id === actor.id)
      throw new HttpError(
        400,
        "Use Settings for your own password. Another admin must change your role or account.",
      );
    const input = remove ? null : userUpdateSchema.parse(await body(request));
    const passwordHash = input?.password
      ? await hashPassword(input.password)
      : undefined;
    await db().transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(842190)`);
      const [target] = await tx
        .select()
        .from(users)
        .where(eq(users.id, id))
        .for("update");
      if (!target) throw new HttpError(404, "User not found.");
      if (
        target.role === "admin" &&
        target.active &&
        (remove || !input?.active || input.role !== "admin")
      ) {
        const admins = await tx
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.role, "admin"), eq(users.active, true)));
        if (admins.length <= 1)
          throw new HttpError(400, "Keep at least one active administrator.");
      }
      if (remove) await tx.delete(users).where(eq(users.id, id));
      else
        await tx
          .update(users)
          .set({
            username: input!.username,
            role: input!.role,
            active: input!.active,
            ...(passwordHash ? { passwordHash, mustChangePassword: true } : {}),
          })
          .where(eq(users.id, id));
      await tx.delete(sessions).where(eq(sessions.userId, id));
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
