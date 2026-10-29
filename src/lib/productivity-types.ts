import type {
  events,
  notificationPreferences,
  notifications,
  activity,
} from "@/db/schema";
import type { Task } from "./types";
type JSONDates<T> = {
  [K in keyof T]: T[K] extends Date
    ? string
    : T[K] extends Date | null
      ? string | null
      : T[K];
};
export type CalendarEvent = JSONDates<typeof events.$inferSelect>;
export type CalendarEntry = {
  id: string;
  source: string;
  title: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  color: string;
  event?: CalendarEvent;
  task?: Task;
};
export type NotificationItem = JSONDates<typeof notifications.$inferSelect>;
export type ReminderPreferences = Omit<
  typeof notificationPreferences.$inferSelect,
  "userId" | "lastCheckedAt"
>;
export type WorkLog = JSONDates<typeof activity.$inferSelect>;
