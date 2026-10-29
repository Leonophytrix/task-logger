import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { HttpError } from "./http";
export async function assertCategory(userId: string, id: string | null) {
  if (
    id &&
    !(
      await db()
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, userId)))
        .limit(1)
    ).length
  )
    throw new HttpError(400, "Choose one of your categories.");
}
