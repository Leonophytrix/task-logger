"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { request } from "@/lib/client";
import { label } from "@/lib/utils";
import { priorities, statuses } from "@/lib/validation";
import type { Category, Task } from "@/lib/types";
import type { TaskDetail } from "@/lib/types";
import { TaskItemsEditor, type EditableItem } from "./task-items-editor";
import { usePreferences, useDateFormatter } from "./display-preferences";
import { zonedInput, localToISO } from "@/lib/display-date";
export function TaskEditor({
  categories,
  task,
  trigger,
  floating = false,
  onSaved,
}: {
  categories: Category[];
  task?: Task;
  trigger?: React.ReactNode;
  floating?: boolean;
  onSaved?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const preferences = usePreferences();
  const dateLabel = useDateFormatter();
  const [details, setDetails] = useState<TaskDetail | null>(null),
    [items, setItems] = useState<EditableItem[]>([]),
    [loading, setLoading] = useState(false),
    [retry, setRetry] = useState(0);
  const data = details || task;
  const timeZone = data?.timeZone || preferences.timeZone;
  useEffect(() => {
    if (!open || !task) return;
    const controller = new AbortController();
    let active = true;
    fetch(`/api/tasks/${task.id}`, { signal: controller.signal })
      .then(async (response) => {
        const value = await response.json();
        if (!response.ok) throw new Error(value.error);
        return value;
      })
      .then((value) => {
        if (active) {
          setDetails(value);
          setItems(value.items);
          setError("");
        }
      })
      .catch((e) => {
        if (active && e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [open, task, retry]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      await request(
        task ? `/api/tasks/${task.id}` : "/api/tasks",
        task ? "PUT" : "POST",
        {
          title: f.get("title"),
          description: f.get("description"),
          status: f.get("status"),
          priority: f.get("priority"),
          categoryId: f.get("categoryId") || null,
          startsAt: localToISO(String(f.get("startsAt")), timeZone),
          dueAt: localToISO(String(f.get("dueAt")), timeZone),
          backlog: f.get("backlog") === "on",
          notes: f.get("notes"),
          tags: String(f.get("tags") || "")
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          items,
          recurrence: f.get("recurrence"),
          recurrenceUntil: f.get("recurrenceUntil")
            ? localToISO(`${f.get("recurrenceUntil")}T23:59`, timeZone)
            : null,
          timeZone,
        },
      );
      toast.success(task ? "Task updated" : "Task created");
      setOpen(false);
      onSaved?.();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant={task ? "ghost" : "default"}
        onClick={() => {
          setError("");
          setDetails(null);
          setItems([]);
          setLoading(!!task);
          setOpen(true);
        }}
        className={
          floating
            ? "fixed bottom-[max(20px,env(safe-area-inset-bottom))] right-5 z-20 size-14 rounded-full p-0 shadow-lg md:hidden"
            : undefined
        }
        aria-label={floating ? "Quick add task" : undefined}
      >
        {trigger || (
          <>
            <Plus />
            {!floating && "New task"}
          </>
        )}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!busy) setOpen(v);
        }}
        title={task ? "Edit task" : "A new step forward"}
        description={`Capture what needs doing. Times use ${timeZone}.`}
      >
        {loading ? (
          <p role="status" className="py-8 text-center text-muted">
            Loading task details…
          </p>
        ) : task && !details ? (
          <div className="space-y-4">
            <p role="alert">{error || "Could not load task details."}</p>
            <Button
              onClick={() => {
                setLoading(true);
                setRetry((v) => v + 1);
              }}
            >
              Retry details
            </Button>
          </div>
        ) : (
          <form
            key={details?.updatedAt || "new"}
            onSubmit={submit}
            className="space-y-5"
          >
            <label>
              Task title
              <input
                name="title"
                required
                maxLength={180}
                defaultValue={data?.title}
                placeholder="What would you like to accomplish?"
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows={3}
                maxLength={10000}
                defaultValue={data?.description}
                placeholder="Add a little context…"
              />
            </label>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label>
                Status
                <select name="status" defaultValue={data?.status || "new"}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Priority
                <select
                  name="priority"
                  defaultValue={data?.priority || "medium"}
                >
                  {priorities.map((s) => (
                    <option key={s} value={s}>
                      {label(s)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              Category
              <select name="categoryId" defaultValue={data?.categoryId || ""}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Start date & time
                <input
                  type="datetime-local"
                  name="startsAt"
                  defaultValue={zonedInput(data?.startsAt || null, timeZone)}
                />
              </label>
              <label>
                Due date & time
                <input
                  type="datetime-local"
                  name="dueAt"
                  defaultValue={zonedInput(data?.dueAt || null, timeZone)}
                />
              </label>
            </div>
            <label className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                name="backlog"
                defaultChecked={data?.backlog}
              />
              Keep in backlog
            </label>
            <label>
              Tags (comma-separated)
              <input
                name="tags"
                maxLength={700}
                defaultValue={details?.tags.join(", ") || ""}
                placeholder="planning, personal"
              />
            </label>
            <label>
              Private notes
              <textarea
                name="notes"
                rows={3}
                maxLength={10000}
                defaultValue={data?.notes}
              />
            </label>
            <TaskItemsEditor items={items} onChange={setItems} />
            <div className="grid gap-4 sm:grid-cols-2">
              <label>
                Repeat task
                <select
                  name="recurrence"
                  defaultValue={data?.recurrence || "none"}
                >
                  <option value="none">Does not repeat</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label>
                Repeat until (optional)
                <input
                  name="recurrenceUntil"
                  type="date"
                  defaultValue={
                    data?.recurrenceUntil
                      ? zonedInput(data.recurrenceUntil, timeZone).slice(0, 10)
                      : ""
                  }
                />
              </label>
            </div>
            <p className="text-xs text-muted">
              Completing a recurring task creates one next occurrence,
              preserving its scheduled time and resetting checklist items.
              Monthly repeats skip missing days. Changing a schedule starts a
              new series from this occurrence.
            </p>
            {details?.history.length ? (
              <details className="rounded-xl border p-3">
                <summary className="min-h-11 cursor-pointer text-sm font-semibold">
                  Task activity (up to 50 entries)
                </summary>
                <ol className="space-y-2 text-xs text-muted">
                  {details.history.map((entry, i) => (
                    <li key={i} className="break-words">
                      {entry.message}
                      <time className="mt-1 block">
                        {dateLabel(entry.createdAt, {
                          hour: "numeric",
                          minute: "2-digit",
                          year: "numeric",
                        })}
                      </time>
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
            {error && (
              <p
                role="alert"
                className="text-sm text-red-700 dark:text-red-300"
              >
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button disabled={busy} type="submit">
                {busy && <Loader2 className="animate-spin" />}
                {task ? "Save changes" : "Create task"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
