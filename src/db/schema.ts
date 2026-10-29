import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  index,
  unique,
  foreignKey,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey(),
    username: text().notNull().unique(),
    passwordHash: text().notNull(),
    role: text({ enum: ["admin", "user"] })
      .notNull()
      .default("user"),
    active: boolean().notNull().default(true),
    mustChangePassword: boolean().notNull().default(true),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("valid_role", sql`${t.role} in ('admin', 'user')`),
    check("normalized_username", sql`${t.username} ~ '^[a-z0-9_.-]{3,32}$'`),
  ],
);
export const sessions = pgTable(
  "sessions",
  {
    tokenHash: text().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [
    index("sessions_user_idx").on(t.userId),
    index("sessions_expiry_idx").on(t.expiresAt),
  ],
);
export const loginLimits = pgTable(
  "login_limits",
  {
    key: text().primaryKey(),
    attempts: integer().notNull().default(1),
    resetAt: timestamp({ withTimezone: true }).notNull(),
  },
  (t) => [index("limits_expiry_idx").on(t.resetAt)],
);
export const categories = pgTable(
  "categories",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
    color: text().notNull().default("#6366f1"),
  },
  (t) => [
    unique("category_owner_id").on(t.id, t.userId),
    unique("category_owner_name").on(t.userId, t.name),
  ],
);
export const tasks = pgTable(
  "tasks",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid(),
    title: text().notNull(),
    description: text().notNull().default(""),
    priority: text({ enum: ["low", "medium", "high", "critical"] })
      .notNull()
      .default("medium"),
    status: text({
      enum: [
        "new",
        "in_progress",
        "pending",
        "on_hold",
        "completed",
        "cancelled",
      ],
    })
      .notNull()
      .default("new"),
    startsAt: timestamp({ withTimezone: true }),
    dueAt: timestamp({ withTimezone: true }),
    backlog: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp({ withTimezone: true }),
    notes: text().notNull().default(""),
    recurrence: text({ enum: ["none", "daily", "weekly", "monthly"] })
      .notNull()
      .default("none"),
    recurrenceUntil: timestamp({ withTimezone: true }),
    recurrenceAnchor: timestamp({ withTimezone: true }),
    seriesId: uuid(),
    occurrence: integer().notNull().default(0),
    timeZone: text().notNull().default("Asia/Manila"),
  },
  (t) => [
    unique("tasks_owner_id").on(t.id, t.userId),
    unique("tasks_series_occurrence").on(t.seriesId, t.occurrence),
    foreignKey({
      columns: [t.categoryId, t.userId],
      foreignColumns: [categories.id, categories.userId],
    }),
    index("tasks_owner_status_idx").on(t.userId, t.status),
    index("tasks_owner_due_idx").on(t.userId, t.dueAt),
    index("tasks_owner_category_idx").on(t.userId, t.categoryId),
    check(
      "valid_priority",
      sql`${t.priority} in ('low','medium','high','critical')`,
    ),
    check(
      "valid_status",
      sql`${t.status} in ('new','in_progress','pending','on_hold','completed','cancelled')`,
    ),
    check(
      "valid_dates",
      sql`${t.startsAt} is null or ${t.dueAt} is null or ${t.dueAt} >= ${t.startsAt}`,
    ),
    check("valid_title", sql`length(trim(${t.title})) between 1 and 180`),
    check(
      "task_recurrence",
      sql`${t.recurrence} in ('none','daily','weekly','monthly')`,
    ),
  ],
);
export const activity = pgTable(
  "activity",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: uuid().references(() => tasks.id, { onDelete: "set null" }),
    message: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    kind: text({ enum: ["automatic", "manual"] })
      .notNull()
      .default("automatic"),
    durationMinutes: integer().notNull().default(0),
  },
  (t) => [
    index("activity_owner_date_idx").on(t.userId, t.createdAt),
    check("activity_duration", sql`${t.durationMinutes} between 0 and 1440`),
    check("activity_kind", sql`${t.kind} in ('automatic','manual')`),
  ],
);

export const events = pgTable(
  "events",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid(),
    title: text().notNull(),
    description: text().notNull().default(""),
    location: text().notNull().default(""),
    kind: text({ enum: ["event", "meeting", "occasion"] })
      .notNull()
      .default("event"),
    color: text().notNull().default("#6366f1"),
    startsAt: timestamp({ withTimezone: true }).notNull(),
    endsAt: timestamp({ withTimezone: true }).notNull(),
    allDay: boolean().notNull().default(false),
    recurrence: text({ enum: ["none", "daily", "weekly", "monthly"] })
      .notNull()
      .default("none"),
    recurrenceUntil: timestamp({ withTimezone: true }),
    timeZone: text().notNull().default("Asia/Manila"),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    foreignKey({
      columns: [t.categoryId, t.userId],
      foreignColumns: [categories.id, categories.userId],
    }),
    index("events_owner_start_idx").on(t.userId, t.startsAt),
    check("event_dates", sql`${t.endsAt} > ${t.startsAt}`),
    check("event_kind", sql`${t.kind} in ('event','meeting','occasion')`),
    check(
      "event_recurrence",
      sql`${t.recurrence} in ('none','daily','weekly','monthly')`,
    ),
    check("event_title", sql`length(trim(${t.title})) between 1 and 180`),
  ],
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    enabled: boolean().notNull().default(true),
    deadlines: boolean().notNull().default(true),
    overdue: boolean().notNull().default(true),
    events: boolean().notNull().default(true),
    critical: boolean().notNull().default(true),
    agingBacklog: boolean().notNull().default(true),
    reminderMinutes: integer().notNull().default(60),
    backlogDays: integer().notNull().default(14),
    lastCheckedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    check("reminder_interval", sql`${t.reminderMinutes} between 5 and 10080`),
    check("backlog_interval", sql`${t.backlogDays} between 1 and 365`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text().notNull(),
    kind: text({
      enum: ["deadline", "overdue", "event", "critical", "backlog"],
    }).notNull(),
    title: text().notNull(),
    message: text().notNull(),
    href: text().notNull(),
    readAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("notification_owner_key").on(t.userId, t.key),
    index("notifications_owner_date_idx").on(t.userId, t.createdAt),
    index("notifications_owner_read_idx").on(t.userId, t.readAt),
  ],
);

export const taskItems = pgTable(
  "task_items",
  {
    id: uuid().defaultRandom().primaryKey(),
    taskId: uuid().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text({ enum: ["subtask", "checklist"] }).notNull(),
    title: text().notNull(),
    done: boolean().notNull().default(false),
    position: integer().notNull().default(0),
  },
  (t) => [
    foreignKey({
      columns: [t.taskId, t.userId],
      foreignColumns: [tasks.id, tasks.userId],
    }).onDelete("cascade"),
    index("task_items_owner_task_idx").on(t.userId, t.taskId),
    check("item_kind", sql`${t.kind} in ('subtask','checklist')`),
    check("item_title", sql`length(trim(${t.title})) between 1 and 300`),
  ],
);

export const taskTags = pgTable(
  "task_tags",
  {
    id: uuid().defaultRandom().primaryKey(),
    taskId: uuid().notNull(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text().notNull(),
  },
  (t) => [
    foreignKey({
      columns: [t.taskId, t.userId],
      foreignColumns: [tasks.id, tasks.userId],
    }).onDelete("cascade"),
    unique("task_tag_unique").on(t.taskId, t.name),
    index("task_tags_owner_name_idx").on(t.userId, t.name),
  ],
);

export const interfacePreferences = pgTable(
  "interface_preferences",
  {
    userId: uuid()
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    theme: text({ enum: ["light", "dark", "system"] })
      .notNull()
      .default("system"),
    timeZone: text().notNull().default("Asia/Manila"),
    dateFormat: text({
      enum: ["medium", "dd/MM/yyyy", "MM/dd/yyyy", "yyyy-MM-dd"],
    })
      .notNull()
      .default("medium"),
    defaultTaskView: text({ enum: ["list", "kanban", "calendar"] })
      .notNull()
      .default("list"),
  },
  (t) => [
    check("preference_theme", sql`${t.theme} in ('light','dark','system')`),
    check(
      "preference_view",
      sql`${t.defaultTaskView} in ('list','kanban','calendar')`,
    ),
    check(
      "preference_date_format",
      sql`${t.dateFormat} in ('medium','dd/MM/yyyy','MM/dd/yyyy','yyyy-MM-dd')`,
    ),
  ],
);

// Immutable state snapshots support honest historical trends, including deletions.
export const taskHistory = pgTable(
  "task_history",
  {
    id: uuid().defaultRandom().primaryKey(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskKey: uuid().notNull(),
    taskTitle: text().notNull(),
    action: text({
      enum: [
        "baseline",
        "created",
        "updated",
        "completed",
        "reopened",
        "deleted",
      ],
    }).notNull(),
    recordedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    taskCreatedAt: timestamp({ withTimezone: true }).notNull(),
    status: text().notNull(),
    priority: text().notNull(),
    categoryName: text(),
    startsAt: timestamp({ withTimezone: true }),
    dueAt: timestamp({ withTimezone: true }),
    backlog: boolean().notNull(),
    completedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    index("task_history_owner_time_idx").on(t.userId, t.recordedAt),
    index("task_history_owner_task_idx").on(t.userId, t.taskKey, t.recordedAt),
  ],
);
