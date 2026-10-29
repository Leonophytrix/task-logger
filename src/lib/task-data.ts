import "server-only";
import { and, eq, notInArray, sql } from "drizzle-orm";
import { tasks } from "@/db/schema";
export const activeCondition = notInArray(tasks.status, [
  "completed",
  "cancelled",
]);
export const backlogCondition = and(
  activeCondition,
  sql`(${tasks.backlog} = true or ${tasks.startsAt} is null)`,
);
export const overdueCondition = and(
  activeCondition,
  sql`${tasks.dueAt} < now()`,
);
export const owner = (id: string) => eq(tasks.userId, id);
export function serialize<T>(value: T): T extends Date ? string : T {
  return JSON.parse(JSON.stringify(value));
}
