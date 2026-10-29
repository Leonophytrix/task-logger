"use client";
import { useId, useState } from "react";
import { useDateFormatter } from "./display-preferences";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Columns3, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { TaskEditor } from "./task-editor";
import { request } from "@/lib/client";
import { statuses } from "@/lib/validation";
import { label } from "@/lib/utils";
import type { Task, Category } from "@/lib/types";
type Status = (typeof statuses)[number];
export function KanbanBoard({
  groups,
  counts,
  categories,
  query,
  priority,
}: {
  groups: Record<Status, Task[]>;
  counts: Record<Status, number>;
  categories: Category[];
  query: string;
  priority: string;
}) {
  const router = useRouter();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  );
  async function move(id: string, status: Status) {
    setBusy(true);
    try {
      await request(`/api/tasks/${id}`, "PATCH", { status });
      toast.success(`Moved to ${label(status)}`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function dragEnd(e: DragEndEvent) {
    if (e.over && statuses.includes(e.over.id as Status))
      void move(String(e.active.id), e.over.id as Status);
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">One clear step at a time</p>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Columns3 className="text-primary" />
            Kanban
          </h1>
          <p className="mt-2 text-muted">
            Hold the grip to drag on touchscreens, or choose a status on any
            card. Swipe horizontally to explore.
          </p>
        </div>
        <TaskEditor categories={categories} />
      </div>
      <form
        action="/kanban"
        className="panel flex flex-wrap items-end gap-3 p-4"
      >
        <label className="min-w-0 flex-1 basis-48">
          Search tasks
          <input
            name="q"
            defaultValue={query}
            maxLength={180}
            placeholder="Find a task…"
          />
        </label>
        <label className="min-w-0 flex-1 basis-36">
          Priority
          <select name="priority" defaultValue={priority}>
            <option value="">All priorities</option>
            {["low", "medium", "high", "critical"].map((p) => (
              <option value={p} key={p}>
                {label(p)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit">
          <Search />
          Filter
        </Button>
        <Button asChild variant="ghost">
          <Link href="/tasks?display=list">List view</Link>
        </Button>
      </form>
      <p className="text-xs text-muted">
        Up to 50 cards per status. Filter to narrow larger boards. Card order
        follows last update.
      </p>
      <DndContext id={id} sensors={sensors} onDragEnd={dragEnd}>
        <div
          aria-label="Kanban board"
          className="flex max-w-full gap-4 overflow-x-auto overscroll-x-contain pb-5"
          tabIndex={0}
        >
          {statuses.map((status) => (
            <Column key={status} status={status} total={counts[status]}>
              <div className="space-y-3">
                {groups[status].map((task) => (
                  <Card
                    key={task.id}
                    task={task}
                    categories={categories}
                    busy={busy}
                    move={move}
                  />
                ))}
                {!groups[status].length && (
                  <p className="rounded-xl border border-dashed px-4 py-10 text-center text-sm text-muted">
                    A little room for progress
                  </p>
                )}
              </div>
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  );
}
function Column({
  status,
  total,
  children,
}: {
  status: Status;
  total: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      aria-label={`${label(status)} column`}
      className={`w-[min(280px,calc(100vw-48px))] shrink-0 rounded-2xl border p-3 ${isOver ? "border-primary bg-soft" : "bg-background"}`}
    >
      <h2 className="mb-4 flex items-center justify-between px-1 py-2 font-bold">
        {label(status)}
        <span className="pill">{total}</span>
      </h2>
      {children}
    </section>
  );
}
function Card({
  task,
  categories,
  busy,
  move,
}: {
  task: Task;
  categories: Category[];
  busy: boolean;
  move: (id: string, status: Status) => Promise<void>;
}) {
  const dateLabel = useDateFormatter();
  const {
    setNodeRef,
    setActivatorNodeRef,
    transform,
    listeners,
    attributes,
    isDragging,
  } = useDraggable({ id: task.id, disabled: busy });
  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={`panel min-w-0 p-4 ${isDragging ? "relative z-30 opacity-70 shadow-xl" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`pill priority-${task.priority}`}>
          {label(task.priority)}
        </span>
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          {...attributes}
          aria-label={`Drag ${task.title}`}
          style={{ touchAction: "none" }}
          className="flex size-11 shrink-0 touch-none items-center justify-center rounded-lg text-muted hover:bg-soft"
        >
          <GripVertical size={18} />
        </button>
      </div>
      <h3 className="mt-1 break-words font-bold">{task.title}</h3>
      <p className="mt-2 text-xs text-muted">
        {categories.find((c) => c.id === task.categoryId)?.name ||
          "Uncategorized"}{" "}
        · {dateLabel(task.dueAt)}
      </p>
      {task.recurrence !== "none" && (
        <p className="mt-2 text-xs text-primary">Repeats {task.recurrence}</p>
      )}
      <div className="mt-3">
        <label className="text-xs">
          Move to status
          <select
            aria-label={`Move ${task.title} to status`}
            disabled={busy}
            value={task.status}
            onChange={(e) => void move(task.id, e.target.value as Status)}
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="mt-2 flex justify-end">
        <TaskEditor task={task} categories={categories} trigger="Details" />
      </div>
    </article>
  );
}
