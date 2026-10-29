import "server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  tasks,
  activity,
  categories,
  taskItems,
  taskTags,
  taskHistory,
} from "@/db/schema";
import { HttpError } from "./http";
import { assertCategory } from "./category-access";
import { nextTaskOccurrence } from "./recurring-tasks";
import type { TaskInput } from "./validation";
export type TaskTransaction = Parameters<
  Parameters<ReturnType<typeof db>["transaction"]>[0]
>[0];
type Row = typeof tasks.$inferSelect;
export async function recordTaskState(
  tx: TaskTransaction,
  row: Row,
  action: typeof taskHistory.$inferInsert.action,
) {
  const [category] = row.categoryId
    ? await tx
        .select({ name: categories.name })
        .from(categories)
        .where(
          and(
            eq(categories.id, row.categoryId),
            eq(categories.userId, row.userId),
          ),
        )
        .limit(1)
    : [];
  await tx.insert(taskHistory).values({
    recordedAt: sql`clock_timestamp()`,
    userId: row.userId,
    taskKey: row.id,
    taskTitle: row.title,
    action,
    taskCreatedAt: row.createdAt,
    status: row.status,
    priority: row.priority,
    categoryName: category?.name || null,
    startsAt: row.startsAt,
    dueAt: row.dueAt,
    backlog: row.backlog,
    completedAt: row.completedAt,
  });
}
async function saveDetails(
  tx: TaskTransaction,
  row: Row,
  input: Pick<TaskInput, "items" | "tags">,
) {
  if (input.items !== undefined) {
    await tx
      .delete(taskItems)
      .where(
        and(eq(taskItems.taskId, row.id), eq(taskItems.userId, row.userId)),
      );
    if (input.items.length)
      await tx.insert(taskItems).values(
        input.items.map((item, position) => ({
          ...item,
          position,
          taskId: row.id,
          userId: row.userId,
        })),
      );
  }
  if (input.tags !== undefined) {
    await tx
      .delete(taskTags)
      .where(and(eq(taskTags.taskId, row.id), eq(taskTags.userId, row.userId)));
    if (input.tags.length)
      await tx.insert(taskTags).values(
        input.tags.map((name) => ({
          name,
          taskId: row.id,
          userId: row.userId,
        })),
      );
  }
}
async function spawnNext(tx: TaskTransaction, row: Row) {
  if (row.recurrence === "none" || !row.recurrenceAnchor || !row.seriesId)
    return;
  const next = nextTaskOccurrence(
    row.recurrenceAnchor,
    row.recurrence,
    row.occurrence,
    row.timeZone,
  );
  if (!next || (row.recurrenceUntil && next.date > row.recurrenceUntil)) return;
  const reference = row.dueAt || row.startsAt!;
  const delta = next.date.getTime() - reference.getTime();
  const [created] = await tx
    .insert(tasks)
    .values({
      userId: row.userId,
      title: row.title,
      description: row.description,
      notes: row.notes,
      categoryId: row.categoryId,
      priority: row.priority,
      status: "new",
      backlog: row.backlog,
      startsAt: row.startsAt ? new Date(row.startsAt.getTime() + delta) : null,
      dueAt: row.dueAt ? next.date : null,
      recurrence: row.recurrence,
      recurrenceUntil: row.recurrenceUntil,
      recurrenceAnchor: row.recurrenceAnchor,
      seriesId: row.seriesId,
      occurrence: next.index,
      timeZone: row.timeZone,
    })
    .onConflictDoNothing({ target: [tasks.seriesId, tasks.occurrence] })
    .returning();
  if (!created) return;
  const [items, tags] = await Promise.all([
    tx
      .select()
      .from(taskItems)
      .where(
        and(eq(taskItems.taskId, row.id), eq(taskItems.userId, row.userId)),
      )
      .orderBy(asc(taskItems.position)),
    tx
      .select()
      .from(taskTags)
      .where(and(eq(taskTags.taskId, row.id), eq(taskTags.userId, row.userId))),
  ]);
  await saveDetails(tx, created, {
    items: items.map((i) => ({ kind: i.kind, title: i.title, done: false })),
    tags: tags.map((t) => t.name),
  });
  await tx.insert(activity).values({
    userId: row.userId,
    taskId: created.id,
    message: `Created next recurring task “${row.title}”`,
  });
  await recordTaskState(tx, created, "created");
}
export async function createTask(userId: string, input: TaskInput) {
  await assertCategory(userId, input.categoryId);
  return db().transaction(async (tx) => {
    const { items, tags, ...fields } = input;
    const id = randomUUID();
    const recurrence = input.recurrence || "none";
    const anchor = input.dueAt || input.startsAt;
    const [row] = await tx
      .insert(tasks)
      .values({
        ...fields,
        id,
        userId,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        dueAt: input.dueAt ? new Date(input.dueAt) : null,
        recurrenceUntil: input.recurrenceUntil
          ? new Date(input.recurrenceUntil)
          : null,
        recurrenceAnchor:
          recurrence !== "none" && anchor ? new Date(anchor) : null,
        seriesId: recurrence !== "none" ? id : null,
        completedAt: input.status === "completed" ? new Date() : null,
      })
      .returning();
    await saveDetails(tx, row, { items, tags });
    await tx
      .insert(activity)
      .values({ userId, taskId: row.id, message: `Created “${row.title}”` });
    await recordTaskState(
      tx,
      row,
      row.status === "completed" ? "completed" : "created",
    );
    if (row.status === "completed") await spawnNext(tx, row);
    return row;
  });
}
export async function updateTaskInTransaction(
  tx: TaskTransaction,
  userId: string,
  id: string,
  input: Partial<TaskInput>,
) {
  const [old] = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .for("update");
  if (!old) throw new HttpError(404, "Task not found.");
  const { items, tags, ...fields } = input;
  const recurrence = input.recurrence ?? old.recurrence;
  const startsAt =
    input.startsAt === undefined
      ? old.startsAt
      : input.startsAt
        ? new Date(input.startsAt)
        : null;
  const dueAt =
    input.dueAt === undefined
      ? old.dueAt
      : input.dueAt
        ? new Date(input.dueAt)
        : null;
  const changedSchedule =
    recurrence !== old.recurrence ||
    startsAt?.getTime() !== old.startsAt?.getTime() ||
    dueAt?.getTime() !== old.dueAt?.getTime() ||
    (input.timeZone !== undefined && input.timeZone !== old.timeZone);
  const status = input.status || old.status;
  const anchor = dueAt || startsAt;
  if (recurrence !== "none" && !anchor)
    throw new HttpError(400, "Recurring tasks need a start or due date.");
  const [row] = await tx
    .update(tasks)
    .set({
      ...fields,
      startsAt,
      dueAt,
      recurrenceUntil:
        input.recurrenceUntil === undefined
          ? old.recurrenceUntil
          : input.recurrenceUntil
            ? new Date(input.recurrenceUntil)
            : null,
      updatedAt: new Date(),
      completedAt:
        status === "completed" ? old.completedAt || new Date() : null,
      ...(changedSchedule
        ? {
            recurrenceAnchor: recurrence !== "none" ? anchor : null,
            seriesId: recurrence !== "none" ? randomUUID() : null,
            occurrence: 0,
          }
        : {}),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .returning();
  await saveDetails(tx, row, { items, tags });
  await tx.insert(activity).values({
    userId,
    taskId: id,
    message:
      old.status !== status
        ? `Moved “${row.title}” to ${status.replaceAll("_", " ")}`
        : `Updated “${row.title}”`,
  });
  await recordTaskState(
    tx,
    row,
    status === "completed" && old.status !== "completed"
      ? "completed"
      : old.status === "completed" && status !== "completed"
        ? "reopened"
        : "updated",
  );
  if (status === "completed" && old.status !== "completed")
    await spawnNext(tx, row);
  return row;
}
export async function updateTask(
  userId: string,
  id: string,
  input: Partial<TaskInput>,
) {
  if (input.categoryId !== undefined)
    await assertCategory(userId, input.categoryId);
  return db().transaction((tx) =>
    updateTaskInTransaction(tx, userId, id, input),
  );
}
export async function deleteTaskInTransaction(
  tx: TaskTransaction,
  userId: string,
  id: string,
) {
  const [old] = await tx
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .for("update");
  if (!old) throw new HttpError(404, "Task not found.");
  await recordTaskState(tx, old, "deleted");
  await tx.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  await tx
    .insert(activity)
    .values({ userId, message: `Deleted “${old.title}”` });
}
export async function taskDetails(userId: string, id: string) {
  const [task] = await db()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
    .limit(1);
  if (!task) throw new HttpError(404, "Task not found.");
  const [items, tags, history] = await Promise.all([
    db()
      .select()
      .from(taskItems)
      .where(and(eq(taskItems.taskId, id), eq(taskItems.userId, userId)))
      .orderBy(asc(taskItems.position)),
    db()
      .select({ name: taskTags.name })
      .from(taskTags)
      .where(and(eq(taskTags.taskId, id), eq(taskTags.userId, userId))),
    db()
      .select({ message: activity.message, createdAt: activity.createdAt })
      .from(activity)
      .where(and(eq(activity.taskId, id), eq(activity.userId, userId)))
      .orderBy(desc(activity.createdAt))
      .limit(50),
  ]);
  return {
    ...task,
    items,
    tags: tags.map((t) => t.name),
    history: history.reverse(),
  };
}
