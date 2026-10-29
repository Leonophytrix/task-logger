import { NextResponse } from "next/server";
import { and, eq, isNull, desc, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { apiUser, body, handleError, HttpError, sameOrigin } from "@/lib/http";
export async function GET(request: Request) {
  try {
    const user = await apiUser();
    const p = new URL(request.url).searchParams;
    const where = and(
      eq(notifications.userId, user.id),
      p.get("unread") === "true" ? isNull(notifications.readAt) : undefined,
    );
    const [{ total }] = await db()
      .select({ total: count() })
      .from(notifications)
      .where(where);
    const page = Math.max(
      1,
      Math.min(Math.ceil(total / 30) || 1, Number(p.get("page")) || 1),
    );
    const list = await db()
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(30)
      .offset((Math.floor(page) - 1) * 30);
    return NextResponse.json(
      { items: list, total, page: Math.floor(page) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return handleError(e);
  }
}
export async function PATCH(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const input = z
      .union([
        z.object({ all: z.literal(true) }),
        z.object({ id: z.string().uuid(), read: z.boolean() }),
      ])
      .parse(await body(request));
    if ("all" in input)
      await db()
        .update(notifications)
        .set({ readAt: new Date() })
        .where(
          and(eq(notifications.userId, user.id), isNull(notifications.readAt)),
        );
    else {
      const rows = await db()
        .update(notifications)
        .set({ readAt: input.read ? new Date() : null })
        .where(
          and(
            eq(notifications.id, input.id),
            eq(notifications.userId, user.id),
          ),
        )
        .returning({ id: notifications.id });
      if (!rows.length) throw new HttpError(404, "Notification not found.");
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
