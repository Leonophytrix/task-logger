"use client";
import { useState } from "react";
import { useDateFormatter } from "./display-preferences";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Check,
  Trash2,
  Pencil,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { TaskEditor } from "./task-editor";
import { BulkTaskActions } from "./bulk-task-actions";
import { request } from "@/lib/client";
import { label } from "@/lib/utils";
import { priorities, statuses } from "@/lib/validation";
import type { Category, Task } from "@/lib/types";
export function TaskList({
  tasks,
  categories,
  total,
  page,
}: {
  tasks: Task[];
  categories: Category[];
  total: number;
  page: number;
}) {
  const dateLabel = useDateFormatter();
  const router = useRouter();
  const params = useSearchParams();
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const change = (key: string, value: string) => {
    const p = new URLSearchParams(params);
    p.set(key, value);
    p.delete("page");
    router.push(`/tasks?${p}`);
  };
  async function complete(task: Task) {
    setWorking(task.id);
    try {
      await request(`/api/tasks/${task.id}`, "PATCH", {
        status: task.status === "completed" ? "new" : "completed",
      });
      toast.success(
        task.status === "completed"
          ? "Task reopened"
          : "Task completed. Nice work!",
      );
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setWorking(null);
    }
  }
  const actions = (t: Task) => (
    <div className="flex items-center justify-end gap-1">
      <TaskEditor
        categories={categories}
        task={t}
        trigger={
          <>
            <Pencil />
            <span className="sr-only">Edit {t.title}</span>
          </>
        }
      />
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${t.title}`}
        onClick={() => setDeleting(t)}
      >
        <Trash2 />
      </Button>
    </div>
  );
  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Plan with intention</p>
          <h1 className="text-3xl font-bold tracking-tight">
            My tasks
            <span className="ml-3 align-middle text-base font-normal text-muted">
              {total}
            </span>
          </h1>
          <p className="mt-2 text-muted">
            A little clarity for everything on your plate.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BulkTaskActions tasks={tasks} />
          <TaskEditor categories={categories} />
        </div>
      </div>
      <section className="panel">
        <div className="space-y-4 border-b p-4 sm:p-5">
          <form className="flex flex-wrap gap-2" action="/tasks">
            <input name="display" type="hidden" value="list" />
            <div className="relative min-w-0 flex-1">
              <Search
                className="pointer-events-none absolute left-3 top-3.5 text-muted"
                size={17}
              />
              <input
                aria-label="Search tasks"
                name="q"
                defaultValue={params.get("q") || ""}
                placeholder="Search your tasks…"
                className="!pl-10"
              />
            </div>
            <label className="min-w-0 flex-1 basis-32">
              <span className="sr-only">Filter by tag</span>
              <input
                name="tag"
                aria-label="Filter by tag"
                maxLength={32}
                defaultValue={params.get("tag") || ""}
                placeholder="Tag (optional)"
              />
            </label>
            {["status", "priority", "category", "view", "sort"].map(
              (k) =>
                params.get(k) && (
                  <input
                    key={k}
                    type="hidden"
                    name={k}
                    value={params.get(k)!}
                  />
                ),
            )}
            <Button variant="outline" type="submit">
              Search
            </Button>
          </form>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <label className="min-w-0">
              <span className="sr-only">Status</span>
              <select
                aria-label="Filter by status"
                value={params.get("status") || ""}
                onChange={(e) => change("status", e.target.value)}
              >
                <option value="">All statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="sr-only">Priority</span>
              <select
                aria-label="Filter by priority"
                value={params.get("priority") || ""}
                onChange={(e) => change("priority", e.target.value)}
              >
                <option value="">All priorities</option>
                {priorities.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="sr-only">Category</span>
              <select
                aria-label="Filter by category"
                value={params.get("category") || ""}
                onChange={(e) => change("category", e.target.value)}
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0">
              <span className="sr-only">Task group</span>
              <select
                aria-label="Task group"
                value={params.get("view") || ""}
                onChange={(e) => change("view", e.target.value)}
              >
                <option value="">All tasks</option>
                <option value="overdue">Overdue</option>
                <option value="backlog">Backlog</option>
                <option value="urgent">High & critical</option>
              </select>
            </label>
            <label className="col-span-2 min-w-0 md:col-span-1">
              <span className="sr-only">Sort tasks</span>
              <select
                aria-label="Sort tasks"
                value={params.get("sort") || "updated"}
                onChange={(e) => change("sort", e.target.value)}
              >
                <option value="updated">Recently updated</option>
                <option value="due">Due date</option>
                <option value="priority">Priority</option>
                <option value="created">Newest first</option>
                <option value="title">Title A–Z</option>
              </select>
            </label>
          </div>
          {params.size > 0 && (
            <Link
              href="/tasks"
              className="inline-flex min-h-11 items-center gap-2 text-xs font-semibold text-primary"
            >
              <SlidersHorizontal size={14} />
              Clear filters
            </Link>
          )}
        </div>
        {tasks.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-background/60 text-xs text-muted">
                  <tr>
                    <th className="px-5 py-4 font-medium">Task</th>
                    <th className="p-3 font-medium">Status</th>
                    <th className="p-3 font-medium">Priority</th>
                    <th className="p-3 font-medium">Due date</th>
                    <th className="p-3 font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {tasks.map((t) => (
                    <tr key={t.id} className="hover:bg-background/60">
                      <td className="max-w-[320px] px-3 py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={working === t.id}
                            aria-label={`${t.status === "completed" ? "Reopen" : "Complete"} ${t.title}`}
                            onClick={() => complete(t)}
                          >
                            <span
                              className={`flex size-5 items-center justify-center rounded-full border ${t.status === "completed" ? "border-primary bg-primary text-white dark:text-slate-950" : ""}`}
                            >
                              {t.status === "completed" && <Check size={13} />}
                            </span>
                          </Button>
                          <div className="min-w-0">
                            <p
                              className={`truncate font-semibold ${t.status === "completed" ? "text-muted line-through" : ""}`}
                            >
                              {t.title}
                            </p>
                            <p className="mt-1 truncate text-xs text-muted">
                              {categories.find((c) => c.id === t.categoryId)
                                ?.name || "Uncategorized"}
                              {t.backlog && " · Backlog"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`pill status-${t.status}`}>
                          {label(t.status)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`pill priority-${t.priority}`}>
                          {label(t.priority)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-3 text-xs text-muted">
                        {dateLabel(t.dueAt, { year: "numeric" })}
                      </td>
                      <td className="p-2">{actions(t)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y md:hidden">
              {tasks.map((t) => (
                <article key={t.id} className="p-4">
                  <div className="flex items-start gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`${t.status === "completed" ? "Reopen" : "Complete"} ${t.title}`}
                      disabled={working === t.id}
                      onClick={() => complete(t)}
                    >
                      <span className="flex size-5 items-center justify-center rounded-full border">
                        {t.status === "completed" && <Check size={13} />}
                      </span>
                    </Button>
                    <div className="min-w-0 flex-1 pt-2">
                      <h2 className="break-words font-semibold">{t.title}</h2>
                      <p className="mt-1 break-words text-xs text-muted">
                        {categories.find((c) => c.id === t.categoryId)?.name ||
                          "Uncategorized"}{" "}
                        · {dateLabel(t.dueAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-2">
                      <span className={`pill status-${t.status}`}>
                        {label(t.status)}
                      </span>
                      <span className={`pill priority-${t.priority}`}>
                        {label(t.priority)}
                      </span>
                    </div>
                    {actions(t)}
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <div className="px-5 py-20 text-center">
            <Inbox className="mx-auto mb-4 text-muted" size={35} />
            <h2 className="font-bold">
              {params.size
                ? "No tasks match these filters"
                : "Make space for your first task"}
            </h2>
            <p className="mx-auto mb-6 mt-2 max-w-sm text-sm text-muted">
              {params.size
                ? "Try another search or clear the filters."
                : "Capture an idea, set a priority, and take the first step."}
            </p>
            <TaskEditor categories={categories} />
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-4 text-xs text-muted">
          <span>
            {total
              ? `${(page - 1) * 30 + 1}–${Math.min(page * 30, total)} of ${total} tasks`
              : "0 tasks"}{" "}
            · Asia/Manila
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous page"
              disabled={page <= 1}
              onClick={() => {
                const p = new URLSearchParams(params);
                p.set("page", String(page - 1));
                router.push(`/tasks?${p}`);
              }}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next page"
              disabled={page * 30 >= total}
              onClick={() => {
                const p = new URLSearchParams(params);
                p.set("page", String(page + 1));
                router.push(`/tasks?${p}`);
              }}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </section>
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => !busy && !v && setDeleting(null)}
        title="Delete this task?"
        description="This permanently removes the task. An activity entry will remain."
      >
        <p className="mb-6 break-words font-semibold">{deleting?.title}</p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Keep task
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request(`/api/tasks/${deleting!.id}`, "DELETE");
                setDeleting(null);
                router.refresh();
                toast.success("Task deleted");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete task
          </Button>
        </div>
      </Dialog>
    </>
  );
}
