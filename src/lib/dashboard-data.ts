import { sql } from "drizzle-orm";
import { db } from "@/db";
import { dayKey, dayStart, addDays } from "@/lib/calendar";
export async function dashboardCompletionSeries({
  userId,
  timeZone,
}: {
  userId: string;
  timeZone: string;
}) {
  const today = dayKey(new Date(), timeZone);
  const start = addDays(today, -13);
  const rows = await db().execute(
    sql`select to_char((case when action='baseline' then "completedAt" else "recordedAt" end) at time zone ${timeZone},'YYYY-MM-DD') as date,count(*)::int as completed from task_history where "userId"=${userId}::uuid and (action='completed' or (action='baseline' and "completedAt" is not null)) and (case when action='baseline' then "completedAt" else "recordedAt" end)>=${dayStart(start, timeZone).toISOString()}::timestamptz group by 1 order by 1`,
  );
  const map = new Map(
    (rows.rows as { date: string; completed: number }[]).map((r) => [
      r.date,
      r.completed,
    ]),
  );
  const data = Array.from({ length: 14 }, (_, i) => ({
    date: addDays(start, i),
    completed: map.get(addDays(start, i)) || 0,
  }));
  return data;
}
