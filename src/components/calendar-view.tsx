"use client";
import { useEffect, useState } from "react";
import { useDateFormatter, usePreferences } from "./display-preferences";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock3,
  Flag,
} from "lucide-react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { EventEditor } from "./event-editor";
import { TaskEditor } from "./task-editor";
import {
  addDays,
  calendarRange,
  dayKey as defaultDayKey,
  dayStart as defaultDayStart,
  monthShift,
} from "@/lib/calendar";
import { label } from "@/lib/utils";
import type { Category } from "@/lib/types";
import type { CalendarEntry, CalendarEvent } from "@/lib/productivity-types";
export function CalendarView({
  categories,
  initialDate,
  today,
}: {
  categories: Category[];
  initialDate: string;
  today: string;
}) {
  const dateLabel = useDateFormatter();
  const preferences = usePreferences();
  const dayKey = (value: Date | string) =>
    defaultDayKey(value, preferences.timeZone);
  const dayStart = (key: string) => defaultDayStart(key, preferences.timeZone);
  const [date, setDate] = useState(initialDate),
    [view, setView] = useState("month"),
    [entries, setEntries] = useState<CalendarEntry[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [truncated, setTruncated] = useState(false),
    [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<CalendarEvent | null | undefined>(),
    [selected, setSelected] = useState<CalendarEntry | null>(null);
  const range = calendarRange(date, view);
  const from = dayStart(range.start).toISOString(),
    to = dayStart(range.end).toISOString();
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    fetch(`/api/calendar?${new URLSearchParams({ from, to })}`, {
      signal: controller.signal,
    })
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error);
        return data;
      })
      .then((data) => {
        if (active) {
          setEntries(
            data.entries.map((entry: CalendarEntry & { sourceId: string }) => ({
              ...entry,
              event:
                entry.source === "event"
                  ? data.eventDetails[entry.sourceId]
                  : undefined,
              task:
                entry.source !== "event"
                  ? data.taskDetails[entry.sourceId]
                  : undefined,
            })),
          );
          setTruncated(data.truncated);
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
  }, [from, to, revision]);
  function navigate(next: string) {
    setLoading(true);
    if (next === date) setRevision((v) => v + 1);
    setDate(next);
  }
  function switchView(next: string) {
    setLoading(true);
    setView(next);
  }
  function refresh() {
    setLoading(true);
    setRevision((v) => v + 1);
  }
  const onDay = (key: string) =>
    entries.filter((e) =>
      e.allDay
        ? dayKey(e.startsAt) <= key &&
          dayKey(new Date(new Date(e.endsAt).getTime() - 1)) >= key
        : dayKey(e.startsAt) === key,
    );
  function openEntry(entry: CalendarEntry) {
    if (entry.event) setEditing(entry.event);
    else setSelected(entry);
  }
  const days = Array.from(
    {
      length:
        view === "month"
          ? 42
          : view === "week"
            ? 7
            : view === "agenda"
              ? 30
              : 1,
    },
    (_, i) => addDays(range.start, i),
  );
  const heading =
    view === "month"
      ? dateLabel(dayStart(date), {
          month: "long",
          year: "numeric",
          day: undefined,
        })
      : view === "week"
        ? `${dateLabel(dayStart(range.start))} – ${dateLabel(dayStart(addDays(range.end, -1)), { year: "numeric" })}`
        : dateLabel(dayStart(date), { weekday: "long", year: "numeric" });
  const agenda = (keys: string[]) => (
    <div className="divide-y">
      {keys.map((key) => {
        const list = onDay(key);
        if (!list.length) return null;
        return (
          <section key={key} className="p-4 sm:p-5">
            <h3 className="mb-3 text-sm font-bold">
              {dateLabel(dayStart(key), { weekday: "short", year: "numeric" })}
            </h3>
            <div className="space-y-2">
              {list.map((e) => (
                <button
                  key={e.id}
                  onClick={() => openEntry(e)}
                  className="flex min-h-14 w-full min-w-0 items-start gap-3 rounded-xl border bg-background/50 p-3 text-left hover:border-primary"
                >
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-full border"
                    style={{ background: e.color }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words font-semibold">{e.title}</p>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>
                        {e.allDay
                          ? "All day"
                          : dateLabel(e.startsAt, {
                              hour: "numeric",
                              minute: "2-digit",
                              month: undefined,
                              day: undefined,
                            })}
                      </span>
                      <span>
                        · {e.event ? label(e.event.kind) : label(e.source)}
                      </span>
                      {e.event?.recurrence !== "none" && e.event && (
                        <span>· Repeats {e.event.recurrence}</span>
                      )}
                    </p>
                  </div>
                  {e.source === "deadline" ? (
                    <Flag className="shrink-0 text-primary" size={16} />
                  ) : (
                    <Clock3 className="shrink-0 text-muted" size={16} />
                  )}
                </button>
              ))}
            </div>
          </section>
        );
      })}
      {!keys.some((k) => onDay(k).length) && (
        <div className="p-12 text-center">
          <CalendarDays className="mx-auto mb-3 text-muted" />
          <p className="font-semibold">A little room in your schedule</p>
          <p className="mt-2 text-sm text-muted">
            Add an event or schedule a task to see it here.
          </p>
        </div>
      )}
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Make time for what matters</p>
          <h1 className="text-3xl font-bold">Calendar</h1>
          <p className="mt-2 text-muted">
            Tasks, deadlines and plans · {preferences.timeZone}
          </p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus />
          New event
        </Button>
      </div>
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous calendar period"
              onClick={() =>
                navigate(
                  view === "month"
                    ? monthShift(date, -1)
                    : addDays(
                        date,
                        view === "week" ? -7 : view === "agenda" ? -30 : -1,
                      ),
                )
              }
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next calendar period"
              onClick={() =>
                navigate(
                  view === "month"
                    ? monthShift(date, 1)
                    : addDays(
                        date,
                        view === "week" ? 7 : view === "agenda" ? 30 : 1,
                      ),
                )
              }
            >
              <ChevronRight />
            </Button>
            <Button variant="outline" onClick={() => navigate(today)}>
              Today
            </Button>
          </div>
          <h2 className="order-last w-full text-base font-bold sm:order-none sm:w-auto">
            {heading}
          </h2>
          <label>
            <span className="sr-only">Calendar view</span>
            <select
              aria-label="Calendar view"
              value={view}
              onChange={(e) => switchView(e.target.value)}
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
              <option value="agenda">Agenda</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3 border-b px-4 py-3 text-xs text-muted">
          <span>Click a date to open its day view</span>
          <span>· Colored by category</span>
        </div>
        {error ? (
          <div role="alert" className="p-6">
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <Button className="mt-3" variant="outline" onClick={refresh}>
              Try again
            </Button>
          </div>
        ) : loading ? (
          <div
            aria-busy="true"
            aria-label="Loading calendar"
            className="h-80 bg-border/30 motion-safe:animate-pulse"
          />
        ) : (
          <>
            {view === "month" && (
              <>
                <div className="grid grid-cols-7 border-b text-center text-xs text-muted">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (d) => (
                      <div className="py-3" key={d}>
                        {d}
                      </div>
                    ),
                  )}
                </div>
                <div className="grid grid-cols-7">
                  {days.map((key) => {
                    const list = onDay(key);
                    return (
                      <div
                        key={key}
                        className={`min-w-0 border-b border-r p-1 sm:min-h-28 sm:p-2 ${key.slice(0, 7) !== date.slice(0, 7) ? "bg-background/80 text-muted" : ""}`}
                      >
                        <button
                          aria-label={`Open ${key}, ${list.length} items`}
                          onClick={() => {
                            navigate(key);
                            switchView("day");
                          }}
                          className={`flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-lg text-xs hover:bg-soft sm:w-11 ${key === today ? "bg-primary font-bold text-white dark:text-slate-950" : ""}`}
                        >
                          <span>{Number(key.slice(8))}</span>
                          {list.length > 0 && (
                            <span className="sm:hidden">
                              {list.length}{" "}
                              <span className="sr-only">items</span>
                            </span>
                          )}
                        </button>
                        <div className="hidden space-y-1 sm:block">
                          {list.slice(0, 2).map((e) => (
                            <button
                              key={e.id}
                              title={e.title}
                              onClick={() => openEntry(e)}
                              className="flex min-h-11 w-full min-w-0 items-center gap-1 rounded bg-soft px-2 text-left text-xs text-primary"
                            >
                              <span
                                className="size-1.5 shrink-0 rounded-full"
                                style={{ background: e.color }}
                              />
                              <span className="truncate">{e.title}</span>
                            </button>
                          ))}
                          {list.length > 2 && (
                            <button
                              className="min-h-11 w-full text-xs text-muted"
                              onClick={() => {
                                navigate(key);
                                switchView("day");
                              }}
                            >
                              +{list.length - 2} more
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t sm:hidden">
                  <p className="eyebrow px-4 pt-5">
                    Compact agenda for this month
                  </p>
                  {agenda(
                    days.filter((k) => k.slice(0, 7) === date.slice(0, 7)),
                  )}
                </div>
              </>
            )}
            {view !== "month" && agenda(days)}
            {truncated && (
              <p role="status" className="p-4 text-sm text-muted">
                This period contains more items than we can show at once. Choose
                a shorter view to see more.
              </p>
            )}
          </>
        )}
      </section>
      {editing !== undefined && (
        <EventEditor
          key={editing?.id || `new:${date}`}
          open
          onOpenChange={(v) => !v && setEditing(undefined)}
          event={editing || undefined}
          date={date}
          categories={categories}
          onSaved={refresh}
        />
      )}
      <Dialog
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        title={selected?.title || "Task details"}
        description={
          selected
            ? `${label(selected.source)} · ${dateLabel(selected.startsAt, { hour: "numeric", minute: "2-digit", year: "numeric" })}`
            : undefined
        }
      >
        {selected?.task && (
          <div className="space-y-5">
            <p className="whitespace-pre-wrap break-words text-muted">
              {selected.task.description || "No description."}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="pill">{label(selected.task.status)}</span>
              <span className={`pill priority-${selected.task.priority}`}>
                {label(selected.task.priority)}
              </span>
            </div>
            <TaskEditor
              categories={categories}
              task={selected.task}
              trigger="Edit task"
              onSaved={() => {
                setSelected(null);
                refresh();
              }}
            />
            <Button asChild variant="outline">
              <Link href={`/tasks?edit=${selected.task.id}`}>
                Open in My Tasks
              </Link>
            </Button>
          </div>
        )}
      </Dialog>
    </div>
  );
}
