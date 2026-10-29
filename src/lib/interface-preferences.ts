import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { interfacePreferences } from "@/db/schema";
export const defaultPreferences = {
  theme: "system",
  timeZone: "Asia/Manila",
  dateFormat: "medium",
  defaultTaskView: "list",
} as const;
export type InterfacePreferences = Omit<
  typeof interfacePreferences.$inferSelect,
  "userId"
>;
export async function uiPreferences(
  userId: string,
): Promise<InterfacePreferences> {
  const [row] = await db()
    .select()
    .from(interfacePreferences)
    .where(eq(interfacePreferences.userId, userId))
    .limit(1);
  return row || { ...defaultPreferences };
}
