import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { activity } from "@/db/schema";
import { apiUser, body, handleError, HttpError, sameOrigin } from "@/lib/http";
import { workLogSchema } from "@/lib/productivity-validation";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const input = workLogSchema.parse(await body(request));
    const [row] = await db()
      .update(activity)
      .set({ ...input, createdAt: new Date(input.createdAt) })
      .where(
        and(
          eq(activity.id, id),
          eq(activity.userId, user.id),
          eq(activity.kind, "manual"),
        ),
      )
      .returning();
    if (!row) throw new HttpError(404, "Editable work log not found.");
    return NextResponse.json(row);
  } catch (e) {
    return handleError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const rows = await db()
      .delete(activity)
      .where(
        and(
          eq(activity.id, id),
          eq(activity.userId, user.id),
          eq(activity.kind, "manual"),
        ),
      )
      .returning({ id: activity.id });
    if (!rows.length) throw new HttpError(404, "Editable work log not found.");
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
