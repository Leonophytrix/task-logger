import { z } from "zod";
import { timeZoneSchema } from "./validation";
import { dayKey, dayStart } from "./calendar";
const date = z.string().datetime({ offset: true });
export const eventSchema = z
  .object({
    title: z.string().trim().min(1).max(180),
    description: z.string().max(10000).default(""),
    location: z.string().trim().max(300).default(""),
    kind: z.enum(["event", "meeting", "occasion"]),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    categoryId: z.string().uuid().nullable(),
    startsAt: date,
    endsAt: date,
    allDay: z.boolean(),
    recurrence: z.enum(["none", "daily", "weekly", "monthly"]),
    recurrenceUntil: date.nullable(),
    timeZone: timeZoneSchema.default("Asia/Manila"),
  })
  .superRefine((v, c) => {
    const start = new Date(v.startsAt).getTime(),
      end = new Date(v.endsAt).getTime();
    if (end <= start || end - start > 31 * 86400000)
      c.addIssue({
        code: "custom",
        message: "End must follow start, within 31 days.",
        path: ["endsAt"],
      });
    if (v.recurrenceUntil && new Date(v.recurrenceUntil).getTime() < start)
      c.addIssue({
        code: "custom",
        message: "Repeat-until must follow the first start.",
        path: ["recurrenceUntil"],
      });
    if (
      v.allDay &&
      [v.startsAt, v.endsAt].some(
        (d) =>
          dayStart(dayKey(d, v.timeZone), v.timeZone).getTime() !==
          new Date(d).getTime(),
      )
    )
      c.addIssue({
        code: "custom",
        message:
          "All-day events must start and end at midnight in the event timezone.",
        path: ["allDay"],
      });
  });
export const dateRangeSchema = z
  .object({ from: date, to: date })
  .refine(
    (v) =>
      new Date(v.to) > new Date(v.from) &&
      new Date(v.to).getTime() - new Date(v.from).getTime() <= 62 * 86400000,
    "Choose a range of at most 62 days.",
  );
export const preferenceSchema = z.object({
  enabled: z.boolean(),
  deadlines: z.boolean(),
  overdue: z.boolean(),
  events: z.boolean(),
  critical: z.boolean(),
  agingBacklog: z.boolean(),
  reminderMinutes: z.number().int().min(5).max(10080),
  backlogDays: z.number().int().min(1).max(365),
});
export const workLogSchema = z
  .object({
    message: z.string().trim().min(1).max(5000),
    createdAt: date,
    durationMinutes: z.number().int().min(0).max(1440),
  })
  .refine(
    (v) => new Date(v.createdAt).getTime() <= Date.now() + 60000,
    "Work logs cannot be in the future.",
  );
