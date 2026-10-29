import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { interfacePreferences } from "@/db/schema";
import { apiUser, body, handleError, sameOrigin } from "@/lib/http";
import { timeZoneSchema } from "@/lib/validation";
import { uiPreferences } from "@/lib/interface-preferences";
const schema = z
  .object({
    theme: z.enum(["light", "dark", "system"]).optional(),
    timeZone: timeZoneSchema.optional(),
    dateFormat: z
      .enum(["medium", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"])
      .optional(),
    defaultTaskView: z.enum(["list", "kanban", "calendar"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, "Choose a preference to update.");
export async function GET() {
  try {
    const user = await apiUser();
    return NextResponse.json(await uiPreferences(user.id));
  } catch (e) {
    return handleError(e);
  }
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const input = schema.parse(await body(request));
    await db()
      .insert(interfacePreferences)
      .values({ userId: user.id, ...input })
      .onConflictDoUpdate({ target: interfacePreferences.userId, set: input });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
