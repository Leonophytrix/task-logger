import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { events, activity } from "@/db/schema";
import { apiUser, body, handleError, HttpError, sameOrigin } from "@/lib/http";
import { eventSchema } from "@/lib/productivity-validation";
import { assertCategory } from "@/lib/category-access";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const input = eventSchema.parse(await body(request));
    await assertCategory(user.id, input.categoryId);
    const event = await db().transaction(async (tx) => {
      const [row] = await tx
        .update(events)
        .set({
          ...input,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          recurrenceUntil: input.recurrenceUntil
            ? new Date(input.recurrenceUntil)
            : null,
          updatedAt: new Date(),
        })
        .where(and(eq(events.id, id), eq(events.userId, user.id)))
        .returning();
      if (!row) throw new HttpError(404, "Event not found.");
      await tx.insert(activity).values({
        userId: user.id,
        message: `Updated ${input.kind} “${input.title}”`,
      });
      return row;
    });
    return NextResponse.json(event);
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
    await db().transaction(async (tx) => {
      const [row] = await tx
        .delete(events)
        .where(and(eq(events.id, id), eq(events.userId, user.id)))
        .returning();
      if (!row) throw new HttpError(404, "Event not found.");
      await tx.insert(activity).values({
        userId: user.id,
        message: `Deleted ${row.kind} “${row.title}”`,
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
