import type { categories, tasks } from "@/db/schema";
export type Task = Omit<
  typeof tasks.$inferSelect,
  | "createdAt"
  | "updatedAt"
  | "completedAt"
  | "startsAt"
  | "dueAt"
  | "recurrenceUntil"
  | "recurrenceAnchor"
> & {
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  startsAt: string | null;
  dueAt: string | null;
  recurrenceUntil: string | null;
  recurrenceAnchor: string | null;
};
export type TaskDetail = Task & {
  tags: string[];
  items: { kind: "subtask" | "checklist"; title: string; done: boolean }[];
  history: { message: string; createdAt: string }[];
};
export type Category = typeof categories.$inferSelect;
export type PublicUser = { id: string; username: string; role: string };
