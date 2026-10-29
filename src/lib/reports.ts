import "server-only";
import { and, eq, gte, lt, count, sql, asc, desc } from "drizzle-orm";
import { db } from "@/db";
import { tasks, categories, taskHistory, activity } from "@/db/schema";
import type { ReportRange } from "./report-validation";
import { addDays, dayKey } from "./calendar";
const completedTime = sql<Date>`case when ${taskHistory.action}='baseline' then ${taskHistory.completedAt} else ${taskHistory.recordedAt} end`;
export function completionWhere(userId: string, range: ReportRange) {
  return and(
    eq(taskHistory.userId, userId),
    sql`(${taskHistory.action}='completed' or (${taskHistory.action}='baseline' and ${taskHistory.completedAt} is not null))`,
    sql`${completedTime} >= ${range.start.toISOString()}::timestamptz`,
    sql`${completedTime} < ${range.end.toISOString()}::timestamptz`,
  );
}
export async function completionRows(
  userId: string,
  range: ReportRange,
  limit = 501,
) {
  return db()
    .select({
      id: taskHistory.id,
      taskId: taskHistory.taskKey,
      title: taskHistory.taskTitle,
      completedAt: completedTime,
      priority: taskHistory.priority,
      category: taskHistory.categoryName,
    })
    .from(taskHistory)
    .where(completionWhere(userId, range))
    .orderBy(asc(completedTime), asc(taskHistory.id))
    .limit(limit);
}
export async function reportData(userId: string, range: ReportRange) {
  const groupSQL=sql.raw({day:"'day'",week:"'week'",month:"'month'"}[range.group]);
  const taskRange = and(
    eq(tasks.userId, userId),
    gte(tasks.createdAt, range.start),
    lt(tasks.createdAt, range.end),
  );
  const bucket = sql<string>`to_char(date_trunc(${groupSQL},${completedTime} at time zone ${range.timeZone}),'YYYY-MM-DD')`;
  const [
    totals,
    completed,
    status,
    priority,
    category,
    series,
    logStats,
    first,
    accomplishments,
    trends,
  ] = await Promise.all([
    db()
      .select({
        created: count(),
        completed: sql<number>`count(*) filter (where ${tasks.status}='completed')::int`,
        cancelled: sql<number>`count(*) filter (where ${tasks.status}='cancelled')::int`,
      })
      .from(tasks)
      .where(taskRange),
    db()
      .select({ count: count() })
      .from(taskHistory)
      .where(completionWhere(userId, range)),
    db()
      .select({ name: tasks.status, value: count() })
      .from(tasks)
      .where(taskRange)
      .groupBy(tasks.status),
    db()
      .select({ name: tasks.priority, value: count() })
      .from(tasks)
      .where(taskRange)
      .groupBy(tasks.priority),
    db()
      .select({
        name: sql<string>`coalesce(${categories.name},'Uncategorized')`,
        value: count(),
      })
      .from(tasks)
      .leftJoin(
        categories,
        and(eq(categories.id, tasks.categoryId), eq(categories.userId, userId)),
      )
      .where(taskRange)
      .groupBy(categories.name)
      .orderBy(desc(count()))
      .limit(30),
    db()
      .select({ date: bucket, completed: count() })
      .from(taskHistory)
      .where(completionWhere(userId, range))
        .groupBy(sql`1`)
        .orderBy(sql`1`),
    db()
      .select({
        entries: count(),
        minutes: sql<number>`coalesce(sum(${activity.durationMinutes}),0)::int`,
      })
      .from(activity)
      .where(
        and(
          eq(activity.userId, userId),
          gte(activity.createdAt, range.start),
          lt(activity.createdAt, range.end),
        ),
      ),
    db()
      .select({
        date: sql<string | null>`min(${taskHistory.recordedAt})::text`,
      })
      .from(taskHistory)
      .where(eq(taskHistory.userId, userId)),
    completionRows(userId, range),
    db().execute(sql`
   with states as (
    select *,lead("recordedAt") over(partition by "taskKey" order by "recordedAt",id) as next_at
    from task_history where "userId"=${userId}::uuid
   ),points as (
    select d::date as date,least(((d+interval '1 day') at time zone ${range.timeZone}),now()) as cutoff
    from generate_series(${range.from}::timestamp,${range.to}::timestamp,interval '1 day') d
    where d::date<=(now() at time zone ${range.timeZone})::date
   ),daily as (
    select p.date,count(*) filter(where s.action<>'deleted' and s.status not in ('completed','cancelled') and s."dueAt"<p.cutoff)::int as overdue,
     count(*) filter(where s.action<>'deleted' and s.status not in ('completed','cancelled') and (s.backlog or s."startsAt" is null))::int as backlog,
     count(*) filter(where s.action<>'deleted' and s.status='completed')::int as done,
     count(*) filter(where s.action<>'deleted' and s.status<>'cancelled')::int as total
    from points p left join states s on s."recordedAt"<=p.cutoff and (s.next_at is null or s.next_at>p.cutoff)
    group by p.date
    ) select distinct on(date_trunc(${groupSQL},date)) to_char(date,'YYYY-MM-DD') as date,overdue,backlog,
    case when total=0 then 0 else round(100.0*done/total)::int end as rate
    from daily order by date_trunc(${groupSQL},date),date desc
  `),
  ]);
  const buckets = new Set<string>();
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const date = new Date(d + "T00:00:00Z");
    if (range.group === "week")
      date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
    if (range.group === "month") date.setUTCDate(1);
    buckets.add(date.toISOString().slice(0, 10));
  }
  const counts = new Map(series.map((row) => [row.date, row.completed]));
  const trackingSince = first[0].date;
  const total = totals[0];
  return {
    range: {
      from: range.from,
      to: range.to,
      group: range.group,
      timeZone: range.timeZone,
    },
    summary: {
      created: total.created,
      completions: completed[0].count,
      rate:
        total.created - total.cancelled
          ? Math.round(
              (total.completed / (total.created - total.cancelled)) * 100,
            )
          : 0,
      ...logStats[0],
    },
    status,
    priority,
    category,
    completionSeries: [...buckets].map((date) => ({
      date,
      completed: counts.get(date) || 0,
    })),
    trends: (
      trends.rows as {
        date: string;
        overdue: number;
        backlog: number;
        rate: number;
      }[]
    ).filter(
      (row) =>
        trackingSince && row.date >= dayKey(trackingSince, range.timeZone),
    ),
    trackingSince,
    accomplishments: accomplishments.slice(0, 500),
    accomplishmentsTruncated: accomplishments.length > 500,
  };
}
