import "server-only";
import {
  and,
  eq,
  gt,
  lt,
  isNull,
  or,
  asc,
  count,
  sql,
  desc,
} from "drizzle-orm";
import { db } from "@/db";
import {
  notificationPreferences,
  notifications,
  tasks,
  events,
} from "@/db/schema";
import { activeCondition, backlogCondition } from "./task-data";
import { occurrences } from "./calendar";
import { dayKey } from "./calendar";
import { uiPreferences } from "./interface-preferences";
export async function preferencesFor(userId: string) {
  const [stored] = await db()
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  return (
    stored || {
      userId,
      enabled: true,
      deadlines: true,
      overdue: true,
      events: true,
      critical: true,
      agingBacklog: true,
      reminderMinutes: 60,
      backlogDays: 14,
      lastCheckedAt: null,
    }
  );
}
export async function syncReminders(userId: string) {
  const now = new Date();
  await db()
    .insert(notificationPreferences)
    .values({ userId })
    .onConflictDoNothing();
  const [prefs] = await db()
    .update(notificationPreferences)
    .set({ lastCheckedAt: now })
    .where(
      and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.enabled, true),
        or(
          isNull(notificationPreferences.lastCheckedAt),
          lt(
            notificationPreferences.lastCheckedAt,
            new Date(now.getTime() - 30000),
          ),
        ),
      ),
    )
    .returning();
  if (prefs) {
    try {
      const until = new Date(now.getTime() + prefs.reminderMinutes * 60000);
      const taskOwner = and(eq(tasks.userId, userId), activeCondition);
      const conditions = [
        ...(prefs.deadlines
          ? [and(gt(tasks.dueAt, now), lt(tasks.dueAt, until))]
          : []),
        ...(prefs.overdue ? [lt(tasks.dueAt, now)] : []),
        ...(prefs.critical ? [eq(tasks.priority, "critical")] : []),
        ...(prefs.agingBacklog
          ? [
              and(
                backlogCondition,
                lt(
                  tasks.createdAt,
                  new Date(now.getTime() - prefs.backlogDays * 86400000),
                ),
              ),
            ]
          : []),
      ];
      const groups = await Promise.all(
        conditions.map((c) =>
          db()
            .select()
            .from(tasks)
            .where(and(taskOwner, c))
            .orderBy(asc(tasks.dueAt), asc(tasks.createdAt))
            .limit(100),
        ),
      );
      const taskRows = [
        ...new Map(groups.flat().map((t) => [t.id, t])).values(),
      ];
      type NewNotification = typeof notifications.$inferInsert;
      const rows: NewNotification[] = [];
      for (const task of taskRows) {
        const base = {
          userId,
          href: `/tasks?edit=${task.id}`,
          message: task.title,
        };
        if (
          prefs.deadlines &&
          task.dueAt &&
          task.dueAt > now &&
          task.dueAt <= until
        )
          rows.push({
            ...base,
            key: `deadline:${task.id}:${task.dueAt.toISOString()}`,
            kind: "deadline",
            title: "A task deadline is approaching",
          });
        if (prefs.overdue && task.dueAt && task.dueAt < now)
          rows.push({
            ...base,
            key: `overdue:${task.id}:${task.dueAt.toISOString()}`,
            kind: "overdue",
            title: "A task is overdue",
          });
        if (prefs.critical && task.priority === "critical")
          rows.push({
            ...base,
            key: `critical:${task.id}`,
            kind: "critical",
            title: "A critical task needs your attention",
          });
        if (
          prefs.agingBacklog &&
          (task.backlog || !task.startsAt) &&
          now.getTime() - task.createdAt.getTime() >=
            prefs.backlogDays * 86400000
        )
          rows.push({
            ...base,
            key: `backlog:${task.id}:${task.createdAt.toISOString()}`,
            kind: "backlog",
            title: "A backlog task is getting older",
          });
      }
      if (prefs.events) {
        const display = await uiPreferences(userId);
        const list = await db()
          .select()
          .from(events)
          .where(
            and(
              eq(events.userId, userId),
              lt(events.startsAt, until),
              or(
                and(eq(events.recurrence, "none"), gt(events.startsAt, now)),
                and(
                  sql`${events.recurrence}<>'none'`,
                  or(
                    isNull(events.recurrenceUntil),
                    gt(events.recurrenceUntil, now),
                  ),
                ),
              ),
            ),
          )
          .orderBy(asc(events.startsAt))
          .limit(200);
        for (const event of list)
          for (const occurrence of occurrences(event, now, until)) {
            if (occurrence.startsAt >= now)
              rows.push({
                userId,
                href: `/calendar?date=${dayKey(occurrence.startsAt, display.timeZone)}`,
                key: `event:${occurrence.key}`,
                kind: "event",
                title: `Upcoming ${event.kind}`,
                message: event.title,
              });
          }
      }
      if (rows.length)
        await db()
          .insert(notifications)
          .values(rows)
          .onConflictDoNothing({
            target: [notifications.userId, notifications.key],
          });
      // Keep a bounded history; no external scheduler is required.
      await db()
        .delete(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            lt(
              notifications.createdAt,
              new Date(now.getTime() - 90 * 86400000),
            ),
          ),
        );
    } catch (e) {
      await db()
        .update(notificationPreferences)
        .set({ lastCheckedAt: null })
        .where(
          and(
            eq(notificationPreferences.userId, userId),
            eq(notificationPreferences.lastCheckedAt, now),
          ),
        );
      throw e;
    }
  }
  const [[{ unread }], latest] = await Promise.all([
    db()
      .select({ unread: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      ),
    db()
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, userId), isNull(notifications.readAt)),
      )
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(5),
  ]);
  return { unread, latest };
}
