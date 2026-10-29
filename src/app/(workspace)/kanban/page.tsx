import { and, asc, desc, eq, count, ilike } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks, categories } from "@/db/schema";
import { requirePageUser } from "@/lib/auth";
import { statuses, priorities } from "@/lib/validation";
import { KanbanBoard } from "@/components/kanban-board";
import type { Task } from "@/lib/types";
export default async function KanbanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const p = await searchParams;
  const query = typeof p.q === "string" ? p.q.slice(0, 180) : "";
  const priority = z.enum(priorities).safeParse(p.priority);
  const conditions = [eq(tasks.userId, user.id)];
  if (query)
    conditions.push(
      ilike(tasks.title, `%${query.replace(/[\\%_]/g, "\\$&")}%`),
    );
  if (priority.success) conditions.push(eq(tasks.priority, priority.data));
  const [rows, totals, cats] = await Promise.all([
    Promise.all(
      statuses.map((status) =>
        db()
          .select()
          .from(tasks)
          .where(and(...conditions, eq(tasks.status, status)))
          .orderBy(desc(tasks.updatedAt), asc(tasks.id))
          .limit(50),
      ),
    ),
    db()
      .select({ status: tasks.status, total: count() })
      .from(tasks)
      .where(and(...conditions))
      .groupBy(tasks.status),
    db()
      .select()
      .from(categories)
      .where(eq(categories.userId, user.id))
      .orderBy(asc(categories.name)),
  ]);
  const groups = Object.fromEntries(
    statuses.map((s, i) => [s, JSON.parse(JSON.stringify(rows[i]))]),
  ) as Record<(typeof statuses)[number], Task[]>;
  const counts = Object.fromEntries(
    statuses.map((s) => [s, totals.find((t) => t.status === s)?.total || 0]),
  ) as Record<(typeof statuses)[number], number>;
  return (
    <KanbanBoard
      groups={groups}
      counts={counts}
      categories={cats}
      query={query}
      priority={priority.success ? priority.data : ""}
    />
  );
}
