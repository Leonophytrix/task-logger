"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";
import { request } from "@/lib/client";
import { localToISO, zonedInput } from "@/lib/display-date";
import { usePreferences } from "./display-preferences";
import { addDays, dayKey as defaultDayKey } from "@/lib/calendar";
import type { Category } from "@/lib/types";
import type { CalendarEvent } from "@/lib/productivity-types";
export function EventEditor({
  open,
  onOpenChange,
  event,
  categories,
  date,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event?: CalendarEvent;
  categories: Category[];
  date: string;
  onSaved: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [allDay, setAllDay] = useState(event?.allDay || false),
    [removing, setRemoving] = useState(false);
  const router = useRouter();
  const preferences = usePreferences();
  const timeZone = event?.timeZone || preferences.timeZone;
  const dayKey = (v: string) => defaultDayKey(v, timeZone);
  const inputToISO = (v: string) => localToISO(v, timeZone);
  const manilaInput = (v: string) => zonedInput(v, timeZone);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      await request(
        event ? `/api/events/${event.id}` : "/api/events",
        event ? "PUT" : "POST",
        {
          title: f.get("title"),
          description: f.get("description"),
          location: f.get("location"),
          kind: f.get("kind"),
          categoryId: f.get("categoryId") || null,
          color: f.get("color"),
          allDay,
          timeZone,
          startsAt: inputToISO(
            allDay ? `${f.get("startDate")}T00:00` : String(f.get("startsAt")),
          ),
          endsAt: inputToISO(
            allDay
              ? `${addDays(String(f.get("endDate")), 1)}T00:00`
              : String(f.get("endsAt")),
          ),
          recurrence: f.get("recurrence"),
          recurrenceUntil: f.get("until")
            ? inputToISO(`${f.get("until")}T23:59`)
            : null,
        },
      );
      toast.success(event ? "Event updated" : "Event created");
      onOpenChange(false);
      onSaved();
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => !busy && onOpenChange(v)}
        title={event ? "Event details" : "Plan something ahead"}
        description={
          event?.recurrence !== "none" && event
            ? `Changes apply to the entire recurring series. Times use ${timeZone}.`
            : `All dates and times use ${timeZone}.`
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <label>
            Event title
            <input
              name="title"
              required
              maxLength={180}
              defaultValue={event?.title}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Type
              <select name="kind" defaultValue={event?.kind || "event"}>
                <option value="event">Event</option>
                <option value="meeting">Meeting</option>
                <option value="occasion">Occasion</option>
              </select>
            </label>
            <label>
              Category
              <select name="categoryId" defaultValue={event?.categoryId || ""}>
                <option value="">No category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
            />
            All-day event
          </label>
          <div
            key={allDay ? "all-day" : "timed"}
            className="grid gap-4 sm:grid-cols-2"
          >
            {allDay ? (
              <>
                <label>
                  Start date
                  <input
                    name="startDate"
                    type="date"
                    required
                    defaultValue={event ? dayKey(event.startsAt) : date}
                  />
                </label>
                <label>
                  Last day (inclusive)
                  <input
                    name="endDate"
                    type="date"
                    required
                    defaultValue={
                      event ? addDays(dayKey(event.endsAt), -1) : date
                    }
                  />
                </label>
              </>
            ) : (
              <>
                <label>
                  Starts at
                  <input
                    name="startsAt"
                    type="datetime-local"
                    required
                    defaultValue={
                      event ? manilaInput(event.startsAt) : `${date}T09:00`
                    }
                  />
                </label>
                <label>
                  Ends at
                  <input
                    name="endsAt"
                    type="datetime-local"
                    required
                    defaultValue={
                      event ? manilaInput(event.endsAt) : `${date}T10:00`
                    }
                  />
                </label>
              </>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label>
              Repeat
              <select
                name="recurrence"
                defaultValue={event?.recurrence || "none"}
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
                name="until"
                type="date"
                defaultValue={
                  event?.recurrenceUntil ? dayKey(event.recurrenceUntil) : ""
                }
              />
            </label>
          </div>
          <p className="text-xs text-muted">
            Monthly repeats skip months without the original day. All-day events
            include their last day.
          </p>
          <label>
            Location
            <input
              name="location"
              maxLength={300}
              defaultValue={event?.location}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              rows={3}
              maxLength={10000}
              defaultValue={event?.description}
            />
          </label>
          <label>
            Color (used without a category)
            <input
              type="color"
              name="color"
              defaultValue={event?.color || "#6366f1"}
              className="mt-2 block h-11 w-20 rounded border p-1"
            />
          </label>
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
            {event && (
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={() => setRemoving(true)}
              >
                <Trash2 />
                Delete
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              {event ? "Save event" : "Create event"}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={removing}
        onOpenChange={(v) => !busy && setRemoving(v)}
        title="Delete event?"
        description={
          event?.recurrence !== "none"
            ? "This permanently deletes the entire recurring series."
            : "This permanently deletes the event."
        }
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setRemoving(false)}
          >
            Keep event
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request(`/api/events/${event!.id}`, "DELETE");
                setRemoving(false);
                onOpenChange(false);
                onSaved();
                router.refresh();
                toast.success("Event deleted");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete event
          </Button>
        </div>
      </Dialog>
    </>
  );
}
