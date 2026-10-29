import { NextResponse } from "next/server";
import { db } from "@/db";
import { notificationPreferences } from "@/db/schema";
import { apiUser, body, handleError, sameOrigin } from "@/lib/http";
import { preferenceSchema } from "@/lib/productivity-validation";
import { preferencesFor } from "@/lib/reminders";
export async function GET() {
  try {
    const user = await apiUser();
    return NextResponse.json(await preferencesFor(user.id));
  } catch (e) {
    return handleError(e);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const input = preferenceSchema.parse(await body(request));
    await db()
      .insert(notificationPreferences)
      .values({ userId: user.id, ...input })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: { ...input, lastCheckedAt: null },
      });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
