"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { request } from "@/lib/client";
import { localToISO, zonedInput } from "@/lib/display-date";
import { usePreferences } from "./display-preferences";
import type { WorkLog } from "@/lib/productivity-types";
export function WorkLogEditor({
  log,
  defaultTime,
}: {
  log?: WorkLog;
  defaultTime?: string;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const preferences = usePreferences();
  const inputToISO = (v: string) => localToISO(v, preferences.timeZone);
  const manilaInput = (v: string) => zonedInput(v, preferences.timeZone);
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setError("");
    setBusy(true);
    try {
      await request(
        log ? `/api/work-logs/${log.id}` : "/api/work-logs",
        log ? "PUT" : "POST",
        {
          message: f.get("message"),
          createdAt: inputToISO(String(f.get("createdAt"))),
          durationMinutes: Number(f.get("durationMinutes")),
        },
      );
      toast.success("Work log saved");
      setOpen(false);
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
        variant={log ? "ghost" : "default"}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        {log ? (
          <>
            <Pencil />
            <span className="sr-only">Edit work log</span>
          </>
        ) : (
          <>
            <Plus />
            Add work log
          </>
        )}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(v) => !busy && setOpen(v)}
        title={log ? "Edit work log" : "Record your progress"}
        description={`Capture a small win or a block of focused work. ${preferences.timeZone}.`}
      >
        <form onSubmit={save} className="space-y-5">
          <label>
            What did you accomplish?
            <textarea
              required
              name="message"
              maxLength={5000}
              rows={4}
              defaultValue={log?.message}
            />
          </label>
          <label>
            Date & time
            <input
              name="createdAt"
              type="datetime-local"
              required
              defaultValue={log ? manilaInput(log.createdAt) : defaultTime}
            />
          </label>
          <label>
            Duration (minutes, optional)
            <input
              name="durationMinutes"
              type="number"
              min={0}
              max={1440}
              step={1}
              defaultValue={log?.durationMinutes || 0}
            />
          </label>
          <p className="text-xs text-muted">
            Use 0 for no duration. Each entry supports up to 24 hours.
          </p>
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {log && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setDeleting(true)}
              >
                <Trash2 />
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}Save work log
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={deleting}
        onOpenChange={(v) => !busy && setDeleting(v)}
        title="Delete this work log?"
        description="This permanently removes your manual entry. Automatic task activity is kept."
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setDeleting(false)}
          >
            Keep entry
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request(`/api/work-logs/${log!.id}`, "DELETE");
                setDeleting(false);
                setOpen(false);
                router.refresh();
                toast.success("Work log deleted");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete work log
          </Button>
        </div>
      </Dialog>
    </>
  );
}
