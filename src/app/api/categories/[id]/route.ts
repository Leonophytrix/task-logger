import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, tasks, events } from "@/db/schema";
import { apiUser, body, handleError, HttpError, sameOrigin } from "@/lib/http";
import { categorySchema } from "@/lib/validation";
type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const input = categorySchema.parse(await body(request));
    const [row] = await db()
      .update(categories)
      .set(input)
      .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
      .returning();
    if (!row) throw new HttpError(404, "Category not found.");
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
    await db().transaction(async (tx) => {
      await tx
        .update(events)
        .set({ categoryId: null })
        .where(and(eq(events.categoryId, id), eq(events.userId, user.id)));
      await tx
        .update(tasks)
        .set({ categoryId: null })
        .where(and(eq(tasks.categoryId, id), eq(tasks.userId, user.id)));
      const rows = await tx
        .delete(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, user.id)))
        .returning();
      if (!rows.length) throw new HttpError(404, "Category not found.");
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
