import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks, activity } from "@/db/schema";
import { apiUser, handleError, HttpError, sameOrigin } from "@/lib/http";
import { recordTaskState } from "@/lib/task-service";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const task = await db().transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
        .for("update");
      if (!old) throw new HttpError(404, "Task not found.");
      if (["completed", "cancelled"].includes(old.status))
        throw new HttpError(
          409,
          "Finished tasks cannot be activated from the backlog.",
        );
      if (!old.backlog && old.startsAt)
        throw new HttpError(409, "This task is already scheduled.");
      const now = new Date();
      const startsAt =
        old.startsAt ||
        new Date(Math.min(now.getTime(), old.dueAt?.getTime() ?? Infinity));
      const [row] = await tx
        .update(tasks)
        .set({
          backlog: false,
          startsAt,
          status: "in_progress",
          updatedAt: now,
        })
        .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
        .returning();
      await tx.insert(activity).values({
        userId: user.id,
        taskId: id,
        message: `Activated backlog task “${old.title}”`,
      });
      await recordTaskState(tx, row, "updated");
      return row;
    });
    return NextResponse.json(task);
  } catch (e) {
    return handleError(e);
  }
}
