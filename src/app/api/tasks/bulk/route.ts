import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, inArray, asc } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { apiUser, body, handleError, HttpError, sameOrigin } from "@/lib/http";
import { statuses, priorities } from "@/lib/validation";
import {
  updateTaskInTransaction,
  deleteTaskInTransaction,
} from "@/lib/task-service";
const bulkSchema = z.object({
  ids: z
    .array(z.string().uuid())
    .min(1)
    .max(50)
    .transform((ids) => [...new Set(ids)].sort()),
  action: z.enum(["status", "priority", "backlog", "delete"]),
  value: z.unknown().optional(),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const input = bulkSchema.parse(await body(request));
    const update =
      input.action === "status"
        ? { status: z.enum(statuses).parse(input.value) }
        : input.action === "priority"
          ? { priority: z.enum(priorities).parse(input.value) }
          : input.action === "backlog"
            ? { backlog: z.boolean().parse(input.value) }
            : {};
    await db().transaction(async (tx) => {
      const owned = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.userId, user.id), inArray(tasks.id, input.ids)))
        .orderBy(asc(tasks.id))
        .for("update");
      if (owned.length !== input.ids.length)
        throw new HttpError(404, "One or more selected tasks were not found.");
      for (const id of input.ids)
        if (input.action === "delete")
          await deleteTaskInTransaction(tx, user.id, id);
        else await updateTaskInTransaction(tx, user.id, id, update);
    });
    return NextResponse.json({ ok: true, count: input.ids.length });
  } catch (e) {
    return handleError(e);
  }
}
