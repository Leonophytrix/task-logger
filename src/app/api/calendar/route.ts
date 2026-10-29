import { NextResponse } from "next/server";
import { and, eq, lt, gte, or, notInArray, sql, asc } from "drizzle-orm";
import { db } from "@/db";
import { events, tasks, categories } from "@/db/schema";
import { apiUser, handleError } from "@/lib/http";
import { dateRangeSchema } from "@/lib/productivity-validation";
import { occurrences } from "@/lib/calendar";
export async function GET(request: Request) {
  try {
    const user = await apiUser();
    const p = new URL(request.url).searchParams;
    const range = dateRangeSchema.parse({
      from: p.get("from"),
      to: p.get("to"),
    });
    const from = new Date(range.from),
      to = new Date(range.to);
    const [eventRows, taskRows] = await Promise.all([
      db()
        .select({ event: events, color: categories.color })
        .from(events)
        .leftJoin(
          categories,
          and(
            eq(categories.id, events.categoryId),
            eq(categories.userId, user.id),
          ),
        )
        .where(
          and(
            eq(events.userId, user.id),
            lt(events.startsAt, to),
            or(
              and(eq(events.recurrence, "none"), gte(events.endsAt, from)),
              and(
                sql`${events.recurrence} <> 'none'`,
                or(
                  sql`${events.recurrenceUntil} is null`,
                  gte(
                    events.recurrenceUntil,
                    new Date(from.getTime() - 31 * 86400000),
                  ),
                ),
              ),
            ),
          ),
        )
        .orderBy(asc(events.startsAt))
        .limit(501),
      db()
        .select({ task: tasks, color: categories.color })
        .from(tasks)
        .leftJoin(
          categories,
          and(
            eq(categories.id, tasks.categoryId),
            eq(categories.userId, user.id),
          ),
        )
        .where(
          and(
            eq(tasks.userId, user.id),
            notInArray(tasks.status, ["cancelled"]),
            or(
              and(gte(tasks.startsAt, from), lt(tasks.startsAt, to)),
              and(gte(tasks.dueAt, from), lt(tasks.dueAt, to)),
            ),
          ),
        )
        .orderBy(asc(tasks.dueAt))
        .limit(501),
    ]);
    const entries = [
      ...eventRows.slice(0, 500).flatMap(({ event, color }) =>
        occurrences(event, from, to).map((o) => ({
          id: o.key,
          source: "event" as const,
          title: event.title,
          startsAt: o.startsAt.toISOString(),
          endsAt: o.endsAt.toISOString(),
          allDay: event.allDay,
          color: color || event.color,
          event,
        })),
      ),
      ...taskRows.slice(0, 500).flatMap(({ task, color }) =>
        [
          { date: task.startsAt, kind: "task" },
          { date: task.dueAt, kind: "deadline" },
        ]
          .filter((x) => x.date && x.date >= from && x.date < to)
          .map((x) => ({
            id: `${task.id}:${x.kind}`,
            source: x.kind,
            title: task.title,
            startsAt: x.date!.toISOString(),
            endsAt: x.date!.toISOString(),
            allDay: false,
            color: color || "#6366f1",
            task,
          })),
      ),
    ];
    entries.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    return NextResponse.json(
      {
        entries: entries.slice(0, 2000).map((entry) => ({
          ...entry,
          event: undefined,
          task: undefined,
          sourceId: "event" in entry ? entry.event.id : entry.task.id,
        })),
        eventDetails: Object.fromEntries(
          eventRows.slice(0, 500).map(({ event }) => [event.id, event]),
        ),
        taskDetails: Object.fromEntries(
          taskRows.slice(0, 500).map(({ task }) => [task.id, task]),
        ),
        truncated:
          eventRows.length > 500 ||
          taskRows.length > 500 ||
          entries.length > 2000,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return handleError(e);
  }
}
