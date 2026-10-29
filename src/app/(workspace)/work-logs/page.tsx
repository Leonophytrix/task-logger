import { uiPreferences } from "@/lib/interface-preferences";
import { dateFormatter } from "@/lib/display-date";
import Link from "next/link";
import { and, asc, eq, gte, lt, ilike, sql, count } from "drizzle-orm";
import { BookOpen, Clock3, CheckCheck } from "lucide-react";
import { db } from "@/db";
import { activity, tasks } from "@/db/schema";
import { requirePageUser } from "@/lib/auth";
import {
  dayKey as defaultDayKey,
  dayStart as defaultDayStart,
} from "@/lib/calendar";
import { workPeriod } from "@/lib/work-period";
import { zonedInput } from "@/lib/display-date";
import { WorkLogEditor } from "@/components/work-log-editor";
import { Button } from "@/components/ui/button";
import type { WorkLog } from "@/lib/productivity-types";
export default async function WorkLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const display = await uiPreferences(user.id);
  const dateLabel = dateFormatter(display);
  const dayKey = (v: Date | string = new Date()) =>
    defaultDayKey(v, display.timeZone);
  const dayStart = (key: string) => defaultDayStart(key, display.timeZone);
  const p = await searchParams;
  const get = (k: string) => (typeof p[k] === "string" ? (p[k] as string) : "");
  const date =
    /^\d{4}-\d{2}-\d{2}$/.test(get("date")) &&
    Number.isFinite(Date.parse(get("date")))
      ? get("date")
      : dayKey();
  const period = ["daily", "weekly", "monthly"].includes(get("period"))
    ? get("period")
    : "daily";
  const range = workPeriod(date, period);
  const from = dayStart(range.start),
    to = dayStart(range.end);
  const conditions = [
    eq(activity.userId, user.id),
    gte(activity.createdAt, from),
    lt(activity.createdAt, to),
  ];
  const query = get("q").slice(0, 180);
  if (query)
    conditions.push(
      ilike(activity.message, `%${query.replace(/[\\%_]/g, "\\$&")}%`),
    );
  if (["manual", "automatic"].includes(get("kind")))
    conditions.push(eq(activity.kind, get("kind") as "manual" | "automatic"));
  const where = and(...conditions);
  const [[stats], [completed]] = await Promise.all([
    db()
      .select({
        total: count(),
        minutes: sql<number>`coalesce(sum(${activity.durationMinutes}),0)::int`,
      })
      .from(activity)
      .where(where),
    db()
      .select({ total: count() })
      .from(tasks)
      .where(
        and(
          eq(tasks.userId, user.id),
          eq(tasks.status, "completed"),
          gte(tasks.completedAt, from),
          lt(tasks.completedAt, to),
        ),
      ),
  ]);
  const page = Math.max(
    1,
    Math.min(
      Math.ceil(stats.total / 50) || 1,
      Number.parseInt(get("page")) || 1,
    ),
  );
  const logs = await db()
    .select()
    .from(activity)
    .where(where)
    .orderBy(asc(activity.createdAt), asc(activity.id))
    .limit(50)
    .offset((page - 1) * 50);
  const grouped = new Map<string, typeof logs>();
  for (const log of logs) {
    const key = dayKey(log.createdAt);
    grouped.set(key, [...(grouped.get(key) || []), log]);
  }
  const pageHref = (n: number) => {
    const q = new URLSearchParams({ date, period, page: String(n) });
    if (query) q.set("q", query);
    if (get("kind")) q.set("kind", get("kind"));
    return `/work-logs?${q}`;
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">See how far you’ve come</p>
          <h1 className="text-3xl font-bold">Work logs</h1>
          <p className="mt-2 text-muted">
            Your chronological activity and accomplishments · {display.timeZone}
          </p>
        </div>
        <WorkLogEditor
          defaultTime={zonedInput(new Date().toISOString(), display.timeZone)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { title: "Matching log entries", value: stats.total, icon: BookOpen },
          {
            title: "Matching logged minutes",
            value: stats.minutes,
            icon: Clock3,
          },
          {
            title: "Tasks completed in this period",
            value: completed.total,
            icon: CheckCheck,
          },
        ].map(({ title, value, icon: Icon }) => (
          <div key={title} className="panel flex items-center gap-4 p-5">
            <span className="rounded-lg bg-soft p-3 text-primary">
              <Icon size={20} />
            </span>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted">{title}</p>
            </div>
          </div>
        ))}
      </div>
      <section className="panel">
        <form
          action="/work-logs"
          className="grid gap-3 border-b p-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          <label>
            Period
            <select name="period" defaultValue={period}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label>
            Date in period
            <input name="date" type="date" required defaultValue={date} />
          </label>
          <label>
            Entry type
            <select name="kind" defaultValue={get("kind")}>
              <option value="">All activity</option>
              <option value="automatic">Automatic</option>
              <option value="manual">Manual</option>
            </select>
          </label>
          <label>
            Search activity
            <input
              name="q"
              defaultValue={query}
              maxLength={180}
              placeholder="Find an accomplishment…"
            />
          </label>
          <div className="flex items-end gap-2">
            <Button type="submit">Apply filters</Button>
            <Button asChild variant="ghost">
              <Link href="/work-logs">Reset</Link>
            </Button>
          </div>
        </form>
        <p className="border-b px-5 py-3 text-xs text-muted">
          Chronological order · {dateLabel(from, { year: "numeric" })} to{" "}
          {dateLabel(new Date(to.getTime() - 1), { year: "numeric" })}.
          Completion total counts tasks still marked completed.
        </p>
        {logs.length ? (
          <div>
            {[...grouped].map(([key, list]) => (
              <section key={key} className="border-b last:border-b-0">
                <h2 className="bg-background/60 px-5 py-3 text-sm font-bold">
                  {dateLabel(dayStart(key), {
                    weekday: "long",
                    year: "numeric",
                  })}
                </h2>
                <ol className="divide-y">
                  {list.map((log) => (
                    <li
                      key={log.id}
                      className="flex min-w-0 items-start gap-3 px-4 py-4 sm:px-5"
                    >
                      <span
                        className={`mt-1 size-2 shrink-0 rounded-full ${log.kind === "manual" ? "bg-emerald-600" : "bg-primary"}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-2 flex flex-wrap gap-2 text-xs text-muted">
                          <time dateTime={log.createdAt.toISOString()}>
                            {dateLabel(log.createdAt, {
                              hour: "numeric",
                              minute: "2-digit",
                              month: undefined,
                              day: undefined,
                            })}
                          </time>
                          <span>
                            ·{" "}
                            {log.kind === "manual"
                              ? "Manual work log"
                              : "Automatic activity"}
                          </span>
                          {log.durationMinutes > 0 && (
                            <span className="pill">
                              {log.durationMinutes} min
                            </span>
                          )}
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm">
                          {log.message}
                        </p>
                        {log.taskId && (
                          <Link
                            className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-primary"
                            href={`/tasks?edit=${log.taskId}`}
                          >
                            Open task →
                          </Link>
                        )}
                      </div>
                      {log.kind === "manual" && (
                        <WorkLogEditor
                          log={JSON.parse(JSON.stringify(log)) as WorkLog}
                        />
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <BookOpen className="mx-auto mb-4 text-muted" />
            <h2 className="font-bold">Your next accomplishment starts here</h2>
            <p className="mt-2 text-sm text-muted">
              Try a different date or add a manual work log. Task changes are
              recorded automatically.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted">
          <span>
            {stats.total} matching entries · Page {page}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Button asChild variant="outline">
                <Link href={pageHref(page - 1)}>Previous</Link>
              </Button>
            )}
            {page * 50 < stats.total && (
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
