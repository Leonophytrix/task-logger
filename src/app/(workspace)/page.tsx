import { uiPreferences } from "@/lib/interface-preferences";
import { dashboardCompletionSeries } from "@/lib/dashboard-data";
import { CompletionChart } from "@/components/chart-panels";
import { dateFormatter } from "@/lib/display-date";
import Link from "next/link";
import { and, desc, eq, sql, asc } from "drizzle-orm";
import {
  ArrowUpRight,
  ListTodo,
  CircleDashed,
  Clock3,
  CircleCheck,
  ArrowRight,
  Flag,
  CalendarDays,
  Sparkles,
  Activity,
  Inbox,
} from "lucide-react";
import { db } from "@/db";
import { tasks, activity } from "@/db/schema";
import { requirePageUser } from "@/lib/auth";
import {
  activeCondition,
  backlogCondition,
  overdueCondition,
  owner,
} from "@/lib/task-data";
import { label } from "@/lib/utils";
export default async function Dashboard() {
  const user = await requirePageUser();
  const display = await uiPreferences(user.id);
  const dateLabel = dateFormatter(display);
  const [stats, focus, schedule, recent, completionData] = await Promise.all([
    db()
      .select({
        total: sql<number>`count(*)::int`,
        new: sql<number>`count(*) filter (where ${tasks.status}='new')::int`,
        progress: sql<number>`count(*) filter (where ${tasks.status}='in_progress')::int`,
        pending: sql<number>`count(*) filter (where ${tasks.status}='pending')::int`,
        completed: sql<number>`count(*) filter (where ${tasks.status}='completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${tasks.status}='cancelled')::int`,
        overdue: sql<number>`count(*) filter (where ${overdueCondition})::int`,
        backlog: sql<number>`count(*) filter (where ${backlogCondition})::int`,
        urgent: sql<number>`count(*) filter (where ${activeCondition} and ${tasks.priority} in ('high','critical'))::int`,
      })
      .from(tasks)
      .where(owner(user.id)),
    db()
      .select()
      .from(tasks)
      .where(and(owner(user.id), activeCondition))
      .orderBy(
        sql`case ${tasks.priority} when 'critical' then 0 when 'high' then 1 when 'medium' then 2 else 3 end`,
        asc(tasks.dueAt),
      )
      .limit(5),
    db()
      .select()
      .from(tasks)
      .where(
        and(
          owner(user.id),
          activeCondition,
          sql`((${tasks.startsAt} at time zone ${display.timeZone})::date = (now() at time zone ${display.timeZone})::date or (${tasks.dueAt} at time zone ${display.timeZone})::date = (now() at time zone ${display.timeZone})::date)`,
        ),
      )
      .orderBy(asc(tasks.startsAt))
      .limit(5),
    db()
      .select()
      .from(activity)
      .where(eq(activity.userId, user.id))
      .orderBy(desc(activity.createdAt))
      .limit(5),
    dashboardCompletionSeries({ userId: user.id, timeZone: display.timeZone }),
  ]);
  const s = stats[0];
  const rate =
    s.total - s.cancelled
      ? Math.round((s.completed / (s.total - s.cancelled)) * 100)
      : 0;
  const cards = [
    {
      name: "Total tasks",
      value: s.total,
      filter: "",
      icon: ListTodo,
      color: "text-primary bg-soft",
    },
    {
      name: "In progress",
      value: s.progress,
      filter: "status=in_progress",
      icon: CircleDashed,
      color: "text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950",
    },
    {
      name: "Pending",
      value: s.pending,
      filter: "status=pending",
      icon: Clock3,
      color: "text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950",
    },
    {
      name: "Completed",
      value: s.completed,
      filter: "status=completed",
      icon: CircleCheck,
      color:
        "text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950",
    },
  ];
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="size-1.5 rounded-full bg-primary" />
            Your productivity, at a glance
          </p>
          <h1 className="break-words text-2xl font-bold tracking-tight sm:text-3xl">
            Let’s make progress, {user.username}.
          </h1>
          <p className="mt-2 text-muted">
            A clear view of what matters. One task at a time.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-lg border bg-card px-4 py-3 text-xs text-muted">
          <CalendarDays size={15} />
          {dateLabel(new Date(), { weekday: "short", year: "numeric" })}
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ name, value, filter, icon: Icon, color }) => (
          <Link
            key={name}
            href={`/tasks${filter ? "?" + filter : ""}`}
            className="panel p-5 hover:border-primary"
          >
            <div className="flex items-center justify-between">
              <span className={`rounded-xl p-2.5 ${color}`}>
                <Icon size={21} />
              </span>
              <ArrowUpRight size={16} className="text-muted" />
            </div>
            <p className="mb-1 mt-5 text-3xl font-bold tracking-tight">
              {value.toLocaleString()}
            </p>
            <p className="text-sm text-muted">{name}</p>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { name: "New tasks", value: s.new, q: "status=new" },
          { name: "Overdue", value: s.overdue, q: "view=overdue" },
          { name: "Backlog", value: s.backlog, q: "view=backlog" },
          { name: "High & critical", value: s.urgent, q: "view=urgent" },
        ].map((c) => (
          <Link
            key={c.name}
            href={`/tasks?${c.q}`}
            className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 hover:border-primary"
          >
            <span className="text-sm text-muted">{c.name}</span>
            <span className="font-bold">
              {c.value}
              <span className="ml-3 text-muted">↗</span>
            </span>
          </Link>
        ))}
      </div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <section className="panel min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b p-5">
            <div>
              <h2 className="flex items-center gap-2 font-bold">
                <Flag size={17} className="text-primary" />
                Your focus list
              </h2>
              <p className="mt-1 text-xs text-muted">
                Highest priorities, ready for your attention
              </p>
            </div>
            <Link
              className="flex min-h-11 items-center gap-1 text-xs font-semibold text-primary"
              href="/tasks"
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {focus.length ? (
            <div className="divide-y">
              {focus.map((t) => (
                <Link
                  href={`/tasks?edit=${t.id}`}
                  key={t.id}
                  className="flex min-w-0 items-start gap-3 px-5 py-4 hover:bg-background"
                >
                  <span className="mt-1 size-4 shrink-0 rounded-full border-2" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="mt-1 text-xs text-muted">
                      {dateLabel(t.dueAt)} · {label(t.status)}
                    </p>
                  </div>
                  <span className={`pill priority-${t.priority}`}>
                    {label(t.priority)}
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="A clear space, a fresh start"
              text="Add your first task using New task. Your priorities will appear here."
            />
          )}
        </section>
        <section className="panel p-5">
          <h2 className="flex items-center gap-2 font-bold">
            <Sparkles size={18} className="text-primary" />
            Every step counts
          </h2>
          <p className="mt-1 text-xs text-muted">
            Your overall completion rate
          </p>
          <div className="flex justify-center py-7">
            <div
              role="img"
              aria-label={`${rate}% of non-cancelled tasks completed`}
              className="flex size-36 items-center justify-center rounded-full p-3"
              style={{
                background: `conic-gradient(var(--primary) ${rate}%, var(--border) 0)`,
              }}
            >
              <div className="flex size-full flex-col items-center justify-center rounded-full bg-card">
                <span className="text-3xl font-bold">{rate}%</span>
                <span className="text-xs text-muted">completed</span>
              </div>
            </div>
          </div>
          <p className="text-center text-xs text-muted">
            {s.completed} of {s.total - s.cancelled} tasks completed
          </p>
          <div className="mt-5 rounded-xl bg-background p-4">
            <p className="font-semibold">Small wins add up.</p>
            <p className="mt-1 text-xs leading-5 text-muted">
              Choose one meaningful task and give it your focus today.
            </p>
          </div>
        </section>
        <section className="panel overflow-hidden">
          <h2 className="flex items-center gap-2 border-b p-5 font-bold">
            <CalendarDays size={18} className="text-primary" />
            Today’s schedule
            <span className="ml-auto text-xs font-normal text-muted">
              {display.timeZone}
            </span>
          </h2>
          {schedule.length ? (
            <div className="divide-y">
              {schedule.map((t) => (
                <Link
                  href={`/tasks?edit=${t.id}`}
                  key={t.id}
                  className="flex items-center gap-4 p-5 hover:bg-background"
                >
                  <span className="w-20 shrink-0 text-xs text-muted">
                    {dateLabel(t.startsAt || t.dueAt, {
                      hour: "numeric",
                      minute: "2-digit",
                      month: undefined,
                      day: undefined,
                    })}
                  </span>
                  <div className="min-w-0 border-l-2 border-primary pl-4">
                    <p className="truncate font-semibold">{t.title}</p>
                    <p className="mt-1 text-xs text-muted">{label(t.status)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty
              title="Room to plan your day"
              text="Tasks starting or due today will appear here."
            />
          )}
        </section>
        <section className="panel overflow-hidden">
          <h2 className="flex items-center gap-2 border-b p-5 font-bold">
            <Activity size={18} className="text-primary" />
            Recent activity
          </h2>
          {recent.length ? (
            <ol className="space-y-5 p-5">
              {recent.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div className="min-w-0">
                    <p className="break-words text-sm">{a.message}</p>
                    <p className="mt-1 text-xs text-muted">
                      {dateLabel(a.createdAt, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <Empty
              title="Your progress starts here"
              text="Task creation, edits and completions are recorded automatically."
            />
          )}
        </section>
      </div>
      <CompletionChart data={completionData} />
    </div>
  );
}
function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-4 rounded-2xl bg-background p-4 text-muted">
        <Inbox size={25} />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="mt-2 max-w-xs text-sm leading-6 text-muted">{text}</p>
    </div>
  );
}
