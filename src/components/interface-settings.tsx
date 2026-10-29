"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { request } from "@/lib/client";
import type { InterfacePreferences } from "@/lib/interface-preferences";
export function InterfaceSettings({
  preferences,
}: {
  preferences: InterfacePreferences;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { setTheme } = useTheme();
  const zones = [
    ...new Set([
      "UTC",
      "Asia/Manila",
      preferences.timeZone,
      ...Intl.supportedValuesOf("timeZone"),
    ]),
  ].sort();
  return (
    <section className="panel p-5 sm:p-7">
      <h2 className="font-bold">Workspace preferences</h2>
      <p className="mb-5 mt-2 text-sm text-muted">
        Saved to your account across devices. Existing event series retain their
        original timezone.
      </p>
      <form
        key={`${preferences.theme}:${preferences.timeZone}:${preferences.dateFormat}:${preferences.defaultTaskView}`}
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const input = Object.fromEntries(new FormData(e.currentTarget));
          setBusy(true);
          try {
            await request("/api/preferences/interface", "PUT", input);
            setTheme(String(input.theme));
            router.refresh();
            toast.success("Workspace preferences saved");
          } catch (e) {
            toast.error((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Theme
          <select name="theme" defaultValue={preferences.theme}>
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <label>
          Timezone
          <select name="timeZone" defaultValue={preferences.timeZone}>
            {zones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </label>
        <label>
          Date format
          <select name="dateFormat" defaultValue={preferences.dateFormat}>
            <option value="medium">Readable (Oct 29)</option>
            <option value="dd/MM/yyyy">DD/MM/YYYY</option>
            <option value="MM/dd/yyyy">MM/DD/YYYY</option>
            <option value="yyyy-MM-dd">YYYY-MM-DD</option>
          </select>
        </label>
        <label>
          Default task view
          <select
            name="defaultTaskView"
            defaultValue={preferences.defaultTaskView}
          >
            <option value="list">List</option>
            <option value="kanban">Kanban</option>
            <option value="calendar">Calendar</option>
          </select>
        </label>
        <Button type="submit" disabled={busy}>
          Save preferences
        </Button>
      </form>
    </section>
  );
}
