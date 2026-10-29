import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, activity } from "@/db/schema";
import { apiUser, body, handleError, sameOrigin } from "@/lib/http";
import { eventSchema } from "@/lib/productivity-validation";
import { assertCategory } from "@/lib/category-access";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const input = eventSchema.parse(await body(request));
    await assertCategory(user.id, input.categoryId);
    const event = await db().transaction(async (tx) => {
      const [row] = await tx
        .insert(events)
        .values({
          ...input,
          userId: user.id,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          recurrenceUntil: input.recurrenceUntil
            ? new Date(input.recurrenceUntil)
            : null,
        })
        .returning();
      await tx.insert(activity).values({
        userId: user.id,
        message: `Created ${input.kind} “${input.title}”`,
      });
      return row;
    });
    return NextResponse.json(event, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
