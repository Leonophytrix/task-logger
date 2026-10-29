import { uiPreferences } from "@/lib/interface-preferences";
import { dateFormatter } from "@/lib/display-date";
import Link from "next/link";
import { and, asc, eq, count, sql } from "drizzle-orm";
import { z } from "zod";
import { Archive, Clock3, AlertTriangle } from "lucide-react";
import { db } from "@/db";
import { tasks, categories } from "@/db/schema";
import { requirePageUser } from "@/lib/auth";
import { backlogCondition, owner } from "@/lib/task-data";
import { priorities } from "@/lib/validation";
import { label } from "@/lib/utils";
import { TaskEditor } from "@/components/task-editor";
import { ActivateTask } from "@/components/activate-task";
import { Button } from "@/components/ui/button";
import type { Task } from "@/lib/types";
export default async function BacklogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const display = await uiPreferences(user.id);
  const dateLabel = dateFormatter(display);
  const p = await searchParams;
  const get = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const conditions = [owner(user.id), backlogCondition];
  const priority = z.enum(priorities).safeParse(get("priority")),
    category = z.string().uuid().safeParse(get("category"));
  const age = [7, 14, 30, 90].includes(Number(get("age")))
    ? Number(get("age"))
    : 0;
  if (priority.success) conditions.push(eq(tasks.priority, priority.data));
  if (category.success) conditions.push(eq(tasks.categoryId, category.data));
  if (age)
    conditions.push(sql`${tasks.createdAt} <= now()-${age}*interval '1 day'`);
  const where = and(...conditions);
  const [[stats], cats] = await Promise.all([
    db()
      .select({
        now: sql<string>`now()::text`,
        total: count(),
        aging: sql<number>`count(*) filter (where ${tasks.createdAt} < now()-interval '14 days')::int`,
        neglected: sql<number>`count(*) filter (where ${tasks.updatedAt} < now()-interval '14 days')::int`,
      })
      .from(tasks)
      .where(where),
    db()
      .select()
      .from(categories)
      .where(eq(categories.userId, user.id))
      .orderBy(asc(categories.name)),
  ]);
  const page = Math.max(
    1,
    Math.min(
      Math.ceil(stats.total / 30) || 1,
      Number.parseInt(get("page")) || 1,
    ),
  );
  const rows = await db()
    .select()
    .from(tasks)
    .where(where)
    .orderBy(
      sql`case ${tasks.priority} when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
      asc(tasks.createdAt),
      asc(tasks.id),
    )
    .limit(30)
    .offset((page - 1) * 30);
  const now = new Date(stats.now).getTime();
  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    for (const k of ["priority", "category", "age"])
      if (get(k)) q.set(k, get(k));
    q.set("page", String(n));
    return `/backlogs?${q}`;
  };
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Ideas waiting for their moment</p>
        <h1 className="text-3xl font-bold">Backlogs</h1>
        <p className="mt-2 text-muted">
          Unscheduled or backlogged tasks, ordered by priority. Finished tasks
          are excluded.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { name: "Waiting tasks", value: stats.total, icon: Archive },
          { name: "At least 14 days old", value: stats.aging, icon: Clock3 },
          {
            name: "Untouched for 14 days",
            value: stats.neglected,
            icon: AlertTriangle,
          },
        ].map(({ name, value, icon: Icon }) => (
          <div className="panel flex items-center gap-4 p-5" key={name}>
            <span className="rounded-lg bg-soft p-3 text-primary">
              <Icon size={20} />
            </span>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted">{name}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="panel">
        <form
          action="/backlogs"
          className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          <label>
            Priority
            <select name="priority" defaultValue={get("priority")}>
              <option value="">All priorities</option>
              {priorities.map((s) => (
                <option value={s} key={s}>
                  {label(s)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Category
            <select name="category" defaultValue={get("category")}>
              <option value="">All categories</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Age since created
            <select name="age" defaultValue={String(age)}>
              <option value="0">Any age</option>
              {[7, 14, 30, 90].map((d) => (
                <option key={d} value={d}>
                  {d}+ days
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply filters</Button>
            <Button variant="ghost" asChild>
              <Link href="/backlogs">Reset</Link>
            </Button>
          </div>
        </form>
        {rows.length ? (
          <div className="divide-y">
            {rows.map((t) => {
              const days = Math.max(
                0,
                Math.floor((now - t.createdAt.getTime()) / 86400000),
              );
              const neglected = now - t.updatedAt.getTime() >= 14 * 86400000;
              return (
                <article
                  key={t.id}
                  className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5"
                >
                  <div className="min-w-0 flex-1 basis-52">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className={`pill priority-${t.priority}`}>
                        {label(t.priority)}
                      </span>
                      <span className="pill">{label(t.status)}</span>
                      {neglected && (
                        <span className="pill status-pending">
                          Needs a fresh look
                        </span>
                      )}
                    </div>
                    <h2 className="break-words font-bold">{t.title}</h2>
                    <p className="mt-2 text-xs text-muted">
                      {cats.find((c) => c.id === t.categoryId)?.name ||
                        "Uncategorized"}{" "}
                      · {days} {days === 1 ? "day" : "days"} old · Updated{" "}
                      {dateLabel(t.updatedAt)}
                    </p>
                    {t.dueAt && (
                      <p className="mt-1 text-xs text-muted">
                        Due {dateLabel(t.dueAt, { year: "numeric" })}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <TaskEditor
                      task={JSON.parse(JSON.stringify(t)) as Task}
                      categories={cats}
                      trigger="Edit task"
                    />
                    <ActivateTask id={t.id} />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Archive className="mx-auto mb-4 text-muted" />
            <h2 className="font-bold">Nothing waiting here</h2>
            <p className="mt-2 text-sm text-muted">
              Try different filters or add an unscheduled task.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted">
          <span>
            {stats.total} matching tasks · Page {page}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline">
                <Link href={pageHref(page - 1)}>Previous</Link>
              </Button>
            )}
            {page * 30 < stats.total && (
              <Button asChild variant="outline">
                <Link href={pageHref(page + 1)}>Next</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
