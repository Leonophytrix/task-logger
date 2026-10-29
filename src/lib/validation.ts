import { z } from "zod";
export const statuses = [
  "new",
  "in_progress",
  "pending",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export const priorities = ["low", "medium", "high", "critical"] as const;
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^[a-z0-9_.-]{3,32}$/,
    "Use 3–32 letters, numbers, dots, hyphens or underscores.",
  );
export const passwordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128);
export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1).max(128),
});
const date = z.string().datetime({ offset: true }).nullable();
export const timeZoneSchema = z
  .string()
  .max(80)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid IANA timezone.");
export const taskItemSchema = z.object({
  kind: z.enum(["subtask", "checklist"]),
  title: z.string().trim().min(1).max(300),
  done: z.boolean(),
});
export const taskSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().max(10000).default(""),
    priority: z.enum(priorities),
    status: z.enum(statuses),
    categoryId: z.string().uuid().nullable(),
    startsAt: date,
    dueAt: date,
    backlog: z.boolean(),
    notes: z.string().max(10000).optional(),
    tags: z
      .array(z.string().trim().toLowerCase().min(1).max(32))
      .max(20)
      .transform((values) => [...new Set(values)])
      .optional(),
    items: z.array(taskItemSchema).max(40).optional(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly"]).optional(),
    recurrenceUntil: date.optional(),
    timeZone: timeZoneSchema.optional(),
  })
  .refine(
    (t) => !t.startsAt || !t.dueAt || new Date(t.dueAt) >= new Date(t.startsAt),
    { message: "Due date must follow the start date.", path: ["dueAt"] },
  )
  .refine(
    (t) =>
      !t.recurrence || t.recurrence === "none" || !!(t.startsAt || t.dueAt),
    {
      message: "Recurring tasks need a start or due date.",
      path: ["recurrence"],
    },
  )
  .refine(
    (t) =>
      !t.recurrenceUntil ||
      !t.recurrence ||
      t.recurrence === "none" ||
      new Date(t.recurrenceUntil) >= new Date(t.dueAt || t.startsAt!),
    {
      message: "Repeat-until must follow the first task date.",
      path: ["recurrenceUntil"],
    },
  );
export const categorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
});
export const userSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  role: z.enum(["admin", "user"]),
});
export const userUpdateSchema = z.object({
  username: usernameSchema,
  role: z.enum(["admin", "user"]),
  active: z.boolean(),
  password: passwordSchema.optional(),
});
export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  password: passwordSchema,
});
export type TaskInput = z.infer<typeof taskSchema>;
