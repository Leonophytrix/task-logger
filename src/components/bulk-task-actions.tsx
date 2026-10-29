"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { statuses, priorities } from "@/lib/validation";
import { label } from "@/lib/utils";
import { request } from "@/lib/client";
import type { Task } from "@/lib/types";
export function BulkTaskActions({ tasks }: { tasks: Task[] }) {
  const [open, setOpen] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [action, setAction] = useState("status"),
    [busy, setBusy] = useState(false),
    [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const [value, setValue] = useState("new");
  async function apply() {
    setBusy(true);
    try {
      await request("/api/tasks/bulk", "POST", {
        ids: selected,
        action,
        value: action === "backlog" ? value === "true" : value,
      });
      setConfirm(false);
      setOpen(false);
      setSelected([]);
      router.refresh();
      toast.success("Selected tasks updated");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        variant="outline"
        disabled={!tasks.length}
        onClick={() => setOpen(true)}
      >
        Bulk actions
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => !busy && setOpen(v)}
        title="Update multiple tasks"
        description="Choose tasks on the current page. All changes are applied together."
      >
        <div className="space-y-4">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={selected.length === tasks.length && tasks.length > 0}
              onChange={(e) =>
                setSelected(e.target.checked ? tasks.map((t) => t.id) : [])
              }
            />
            Select this page
          </label>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-3">
            {tasks.map((t) => (
              <label className="flex min-h-11 items-center gap-3" key={t.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, t.id]
                        : selected.filter((id) => id !== t.id),
                    )
                  }
                />
                <span className="min-w-0 break-words">{t.title}</span>
              </label>
            ))}
          </div>
          <label>
            Action
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setValue(
                  e.target.value === "priority"
                    ? "medium"
                    : e.target.value === "backlog"
                      ? "true"
                      : "new",
                );
              }}
            >
              <option value="status">Change status</option>
              <option value="priority">Change priority</option>
              <option value="backlog">Change backlog flag</option>
              <option value="delete">Delete tasks</option>
            </select>
          </label>
          {action !== "delete" && (
            <label>
              New value
              <select value={value} onChange={(e) => setValue(e.target.value)}>
                {(action === "status"
                  ? statuses
                  : action === "priority"
                    ? priorities
                    : ["true", "false"]
                ).map((v) => (
                  <option key={v} value={v}>
                    {v === "true"
                      ? "Add to backlog"
                      : v === "false"
                        ? "Remove backlog flag"
                        : label(v)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-xs text-muted">
            Removing the backlog flag does not schedule an unscheduled task.
            Recurring completions create one next occurrence per task.
          </p>
          <Button
            disabled={!selected.length || busy}
            variant={action === "delete" ? "destructive" : "default"}
            onClick={() =>
              action === "delete" ? setConfirm(true) : void apply()
            }
          >
            Apply to {selected.length} tasks
          </Button>
        </div>
      </Dialog>
      <Dialog
        open={confirm}
        onOpenChange={(v) => !busy && setConfirm(v)}
        title="Delete selected tasks?"
        description="This permanently removes the selected tasks and their details. Historical activity remains."
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setConfirm(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={() => void apply()}
          >
            Delete selected tasks
          </Button>
        </div>
      </Dialog>
    </>
  );
}
