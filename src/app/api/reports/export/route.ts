import { NextResponse } from "next/server";
import { and, eq, gte, lt, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { tasks, activity, taskItems, taskTags } from "@/db/schema";
import { apiUser, handleError, HttpError } from "@/lib/http";
import { uiPreferences } from "@/lib/interface-preferences";
import { parseReportRange } from "@/lib/report-validation";
import { completionRows } from "@/lib/reports";
import { toCSV } from "@/lib/csv";
export async function GET(request: Request) {
  try {
    const user = await apiUser();
    const prefs = await uiPreferences(user.id);
    const p = new URL(request.url).searchParams;
    const format = z.enum(["csv", "json"]).parse(p.get("format"));
    const dataset = z
      .enum(["tasks", "worklogs", "accomplishments"])
      .parse(p.get("dataset"));
    const range = parseReportRange(p, prefs.timeZone);
    let rows: Record<string, unknown>[];
    let columns: string[];
    if (dataset === "tasks") {
      const selected = await db()
        .select()
        .from(tasks)
        .where(
          and(
            eq(tasks.userId, user.id),
            gte(tasks.createdAt, range.start),
            lt(tasks.createdAt, range.end),
          ),
        )
        .limit(10001);
      if (selected.length > 10000)
        throw new HttpError(
          422,
          "More than 10,000 tasks match. Choose a shorter range.",
        );
      const ids = selected.map((t) => t.id);
      const [items, tags] = ids.length
        ? await Promise.all([
            db()
              .select()
              .from(taskItems)
              .where(
                and(
                  eq(taskItems.userId, user.id),
                  inArray(taskItems.taskId, ids),
                ),
              ),
            db()
              .select()
              .from(taskTags)
              .where(
                and(
                  eq(taskTags.userId, user.id),
                  inArray(taskTags.taskId, ids),
                ),
              ),
          ])
        : [[], []];
      const tagsByTask = new Map<string, string[]>(),
        itemsByTask = new Map<
          string,
          { kind: string; title: string; done: boolean }[]
        >();
      for (const tag of tags)
        tagsByTask.set(tag.taskId, [
          ...(tagsByTask.get(tag.taskId) || []),
          tag.name,
        ]);
      for (const item of items)
        itemsByTask.set(item.taskId, [
          ...(itemsByTask.get(item.taskId) || []),
          { kind: item.kind, title: item.title, done: item.done },
        ]);
      rows = selected.map((task) => ({
        ...task,
        userId: undefined,
        tags: tagsByTask.get(task.id) || [],
        items: itemsByTask.get(task.id) || [],
      }));
      columns = [
        "id",
        "title",
        "description",
        "notes",
        "status",
        "priority",
        "categoryId",
        "startsAt",
        "dueAt",
        "createdAt",
        "updatedAt",
        "completedAt",
        "backlog",
        "recurrence",
        "timeZone",
        "tags",
        "items",
      ];
    } else if (dataset === "worklogs") {
      rows = await db()
        .select({
          id: activity.id,
          message: activity.message,
          kind: activity.kind,
          createdAt: activity.createdAt,
          durationMinutes: activity.durationMinutes,
        })
        .from(activity)
        .where(
          and(
            eq(activity.userId, user.id),
            gte(activity.createdAt, range.start),
            lt(activity.createdAt, range.end),
          ),
        )
        .limit(10001);
      columns = ["id", "createdAt", "kind", "message", "durationMinutes"];
    } else {
      rows = await completionRows(user.id, range, 10001);
      columns = ["taskId", "title", "completedAt", "priority", "category"];
    }
    if (rows.length > 10000)
      throw new HttpError(
        422,
        "More than 10,000 records match. Choose a shorter range.",
      );
    const filename = `taskflow-${dataset}-${range.from}-${range.to}.${format}`;
    const headers = {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };
    return format === "json"
      ? NextResponse.json(
          {
            dataset,
            timeZone: prefs.timeZone,
            from: range.from,
            to: range.to,
            exportedAt: new Date().toISOString(),
            records: rows,
          },
          { headers },
        )
      : new Response(toCSV(rows, columns), {
          headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" },
        });
  } catch (e) {
    return handleError(e);
  }
}
