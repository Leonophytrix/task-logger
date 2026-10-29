"use client";
import { useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { request } from "@/lib/client";
import { remindersChanged } from "./use-reminders";
import type { ReminderPreferences } from "@/lib/productivity-types";
export function NotificationSettings({
  preferences,
  userId,
}: {
  preferences: ReminderPreferences;
  userId: string;
}) {
  const [busy, setBusy] = useState(false),
    [browserStatus, setBrowserStatus] = useState(""),
    [browserBusy, setBrowserBusy] = useState(false);
  async function browserEnable() {
    setBrowserBusy(true);
    try {
      if (!("Notification" in window) || !window.isSecureContext)
        throw new Error(
          "Browser notifications require a supported browser on HTTPS or localhost.",
        );
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error(
          "Permission was not granted. You can change it in your browser site settings.",
        );
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.register(
          "/notifications-sw.js",
        );
        await navigator.serviceWorker.ready;
        await registration.showNotification("Taskflow notifications enabled", {
          body: "Reminders are checked while this app is open.",
        });
      }
      localStorage.setItem(`browser-reminders:${userId}`, "on");
      setBrowserStatus("Enabled on this browser.");
      remindersChanged();
    } catch (e) {
      setBrowserStatus((e as Error).message);
    } finally {
      setBrowserBusy(false);
    }
  }
  return (
    <section className="panel p-5 sm:p-7">
      <h2 className="flex items-center gap-2 font-bold">
        <Bell size={18} />
        Notification preferences
      </h2>
      <p className="mb-5 mt-2 text-sm text-muted">
        Reminders refresh while the app is open. Delivery is not guaranteed when
        the app or browser is closed.
      </p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await request("/api/preferences/notifications", "PUT", {
              enabled: f.has("enabled"),
              deadlines: f.has("deadlines"),
              overdue: f.has("overdue"),
              events: f.has("events"),
              critical: f.has("critical"),
              agingBacklog: f.has("agingBacklog"),
              reminderMinutes: Number(f.get("reminderMinutes")),
              backlogDays: Number(f.get("backlogDays")),
            });
            toast.success("Reminder preferences saved");
            remindersChanged();
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            { key: "enabled", label: "Enable new in-app reminders" },
            { key: "deadlines", label: "Upcoming deadlines" },
            { key: "overdue", label: "Overdue tasks" },
            { key: "events", label: "Upcoming events and meetings" },
            { key: "critical", label: "Critical-priority tasks" },
            { key: "agingBacklog", label: "Aging backlog tasks" },
          ] as const
        ).map((item) => (
          <label key={item.key} className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              name={item.key}
              defaultChecked={preferences[item.key]}
            />
            {item.label}
          </label>
        ))}
        <label>
          Remind before deadlines and events
          <select
            name="reminderMinutes"
            defaultValue={preferences.reminderMinutes}
          >
            {[5, 15, 30, 60, 120, 1440, 10080].map((m) => (
              <option key={m} value={m}>
                {m < 60
                  ? `${m} minutes`
                  : m < 1440
                    ? `${m / 60} hours`
                    : m === 1440
                      ? "1 day"
                      : "1 week"}
              </option>
            ))}
          </select>
        </label>
        <label>
          Backlog reminder after (days)
          <input
            type="number"
            name="backlogDays"
            min={1}
            max={365}
            required
            defaultValue={preferences.backlogDays}
          />
        </label>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" />}Save reminders
        </Button>
      </form>
      <div className="mt-6 space-y-3 border-t pt-5">
        <p className="text-sm font-semibold">
          Browser notifications (this device)
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={browserBusy}
            onClick={() => void browserEnable()}
          >
            Enable browser alerts
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              localStorage.removeItem(`browser-reminders:${userId}`);
              setBrowserStatus(
                "Browser alerts disabled on this device. In-app reminders stay available.",
              );
            }}
          >
            Disable browser alerts
          </Button>
        </div>
        {browserStatus && (
          <p role="status" className="text-sm text-muted">
            {browserStatus}
          </p>
        )}
      </div>
    </section>
  );
}
