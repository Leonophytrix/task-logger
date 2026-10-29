"use client";
import { useEffect, useRef } from "react";
import { TaskEditor } from "./task-editor";
import type { Category, Task } from "@/lib/types";
export function OpenTask({
  task,
  categories,
}: {
  task: Task;
  categories: Category[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector("button")?.click();
  }, [task.id]);
  return (
    <div ref={ref} className="hidden">
      <TaskEditor task={task} categories={categories} />
    </div>
  );
}
