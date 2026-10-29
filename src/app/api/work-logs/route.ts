import { NextResponse } from "next/server";
import { db } from "@/db";
import { activity } from "@/db/schema";
import { apiUser, body, handleError, sameOrigin } from "@/lib/http";
import { workLogSchema } from "@/lib/productivity-validation";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const input = workLogSchema.parse(await body(request));
    const [row] = await db()
      .insert(activity)
      .values({
        ...input,
        userId: user.id,
        kind: "manual",
        createdAt: new Date(input.createdAt),
      })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
