"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/client";
import type { NotificationItem } from "@/lib/productivity-types";
export const remindersChanged = () =>
  window.dispatchEvent(new Event("taskflow-reminders"));
export function useReminders(userId: string) {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  useEffect(() => {
    let active = true,
      busy = false;
    const check = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        const result = await request<{
          unread: number;
          latest: NotificationItem[];
        }>("/api/notifications/sync", "POST");
        if (!active) return;
        setUnread(result.unread);
        if (
          localStorage.getItem(`browser-reminders:${userId}`) === "on" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          const seenKey = `seen-reminders:${userId}`;
          const seen: string[] = JSON.parse(
            localStorage.getItem(seenKey) || "[]",
          );
          for (const item of [...result.latest].reverse())
            if (!seen.includes(item.id)) {
              try {
                const registration =
                  "serviceWorker" in navigator
                    ? await navigator.serviceWorker.getRegistration()
                    : undefined;
                if (registration)
                  await registration.showNotification("Taskflow reminder", {
                    body: item.title,
                    tag: item.id,
                    data: { href: item.href },
                  });
                else {
                  const notification = new Notification("Taskflow reminder", {
                    body: item.title,
                    tag: item.id,
                  });
                  notification.onclick = () => {
                    window.focus();
                    router.push(item.href);
                    notification.close();
                  };
                }
                seen.push(item.id);
              } catch {
                /* In-app reminders still work when browser notifications are unavailable. */
              }
            }
          localStorage.setItem(seenKey, JSON.stringify(seen.slice(-200)));
        }
      } catch {
        /* Keep the last known badge during temporary network outages. */
      } finally {
        busy = false;
      }
    };
    const interval = window.setInterval(() => void check(), 60000);
    void check();
    const wake = () => void check();
    window.addEventListener("taskflow-reminders", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("taskflow-reminders", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [userId, router]);
  return unread;
}
