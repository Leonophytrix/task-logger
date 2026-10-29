import { and, asc, desc, eq, ilike, or, sql, count } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { categories, tasks } from "@/db/schema";
import { taskTags } from "@/db/schema";
import { redirect } from "next/navigation";
import { uiPreferences } from "@/lib/interface-preferences";
import { requirePageUser } from "@/lib/auth";
import { statuses, priorities } from "@/lib/validation";
import {
  activeCondition,
  backlogCondition,
  overdueCondition,
  owner,
} from "@/lib/task-data";
import { TaskList } from "@/components/task-list";
import { OpenTask } from "@/components/open-task";
import type { Task } from "@/lib/types";
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const p = await searchParams;
  const preferences = await uiPreferences(user.id);
  if (!Object.keys(p).length && preferences.defaultTaskView !== "list")
    redirect(
      preferences.defaultTaskView === "kanban" ? "/kanban" : "/calendar",
    );
  const get = (key: string) =>
    typeof p[key] === "string" ? (p[key] as string) : "";
  const conditions = [owner(user.id)];
  const tag =
    typeof p.tag === "string" ? p.tag.trim().toLowerCase().slice(0, 32) : "";
  if (tag)
    conditions.push(
      sql`exists (select 1 from ${taskTags} where ${taskTags.taskId}=${tasks.id} and ${taskTags.userId}=${user.id} and ${taskTags.name}=${tag})`,
    );
  const status = z.enum(statuses).safeParse(get("status"));
  const priority = z.enum(priorities).safeParse(get("priority"));
  const cat = z.string().uuid().safeParse(get("category"));
  if (status.success) conditions.push(eq(tasks.status, status.data));
  if (priority.success) conditions.push(eq(tasks.priority, priority.data));
  if (cat.success) conditions.push(eq(tasks.categoryId, cat.data));
  if (get("q")) {
    const q = get("q")
      .slice(0, 180)
      .replace(/[\\%_]/g, "\\$&");
    conditions.push(
      or(ilike(tasks.title, `%${q}%`), ilike(tasks.description, `%${q}%`))!,
    );
  }
  if (get("view") === "overdue") conditions.push(overdueCondition!);
  if (get("view") === "backlog") conditions.push(backlogCondition!);
  if (get("view") === "urgent")
    conditions.push(
      and(activeCondition, sql`${tasks.priority} in ('high','critical')`)!,
    );
  const where = and(...conditions);
  const [{ total }] = await db()
    .select({ total: count() })
    .from(tasks)
    .where(where);
  const page = Math.max(
    1,
    Math.min(Math.ceil(total / 30) || 1, Number.parseInt(get("page")) || 1),
  );
  const sort =
    get("sort") === "due"
      ? asc(tasks.dueAt)
      : get("sort") === "priority"
        ? sql`case ${tasks.priority} when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`
        : get("sort") === "title"
          ? asc(tasks.title)
          : get("sort") === "created"
            ? desc(tasks.createdAt)
            : desc(tasks.updatedAt);
  const [list, cats] = await Promise.all([
    db()
      .select()
      .from(tasks)
      .where(where)
      .orderBy(sort, asc(tasks.id))
      .limit(30)
      .offset((page - 1) * 30),
    db()
      .select()
      .from(categories)
      .where(eq(categories.userId, user.id))
      .orderBy(asc(categories.name)),
  ]);
  const edit = z.string().uuid().safeParse(get("edit"));
  const [selected] = edit.success
    ? await db()
        .select()
        .from(tasks)
        .where(and(owner(user.id), eq(tasks.id, edit.data)))
        .limit(1)
    : [];
  return (
    <>
      <TaskList
        tasks={JSON.parse(JSON.stringify(list)) as Task[]}
        categories={cats}
        total={total}
        page={page}
      />
      {selected && (
        <OpenTask
          task={JSON.parse(JSON.stringify(selected)) as Task}
          categories={cats}
        />
      )}
    </>
  );
}
