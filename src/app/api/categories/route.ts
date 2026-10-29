import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { apiUser, body, handleError, sameOrigin } from "@/lib/http";
import { categorySchema } from "@/lib/validation";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const input = categorySchema.parse(await body(request));
    const [row] = await db()
      .insert(categories)
      .values({ ...input, userId: user.id })
      .returning();
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
