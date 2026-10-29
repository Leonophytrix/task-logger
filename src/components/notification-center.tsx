"use client";
import { useEffect, useState } from "react";
import { useDateFormatter } from "./display-preferences";
import Link from "next/link";
import { Bell, CheckCheck, ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { request } from "@/lib/client";
import { label } from "@/lib/utils";
import { remindersChanged } from "./use-reminders";
import type { NotificationItem } from "@/lib/productivity-types";
export function NotificationCenter() {
  const dateLabel = useDateFormatter();
  const [items, setItems] = useState<NotificationItem[]>([]),
    [unreadOnly, setUnreadOnly] = useState(false),
    [page, setPage] = useState(1),
    [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        await request("/api/notifications/sync", "POST");
        const response = await fetch(
          `/api/notifications?unread=${unreadOnly}&page=${page}`,
          { signal: controller.signal },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (active) {
          setItems(data.items);
          setTotal(data.total);
          setError("");
        }
      } catch (e) {
        if (active && (e as Error).name !== "AbortError")
          setError((e as Error).message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [unreadOnly, page, revision]);
  const refresh = () => {
    setLoading(true);
    setRevision((v) => v + 1);
    remindersChanged();
  };
  async function mark(data: { all: true } | { id: string; read: boolean }) {
    setBusy(true);
    try {
      await request("/api/notifications", "PATCH", data);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">A gentle nudge</p>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="mt-2 text-muted">
            Your private reminders and recent alerts.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void mark({ all: true })}
        >
          <CheckCheck />
          Mark all read
        </Button>
      </div>
      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setLoading(true);
                setPage(1);
                setUnreadOnly(e.target.checked);
              }}
            />
            Unread only
          </label>
          <Button variant="ghost" disabled={loading} onClick={refresh}>
            Refresh reminders
          </Button>
        </div>
        <p className="border-b px-5 py-3 text-xs text-muted">
          History records when an alert was generated. Open its item for the
          current status. Reminders are checked while the app is open.
        </p>
        {error ? (
          <p role="alert" className="p-5 text-red-700 dark:text-red-300">
            {error}
          </p>
        ) : loading ? (
          <div
            aria-busy="true"
            className="flex items-center justify-center gap-2 p-12 text-muted"
          >
            <Loader2 className="animate-spin" size={20} />
            Loading reminders
          </div>
        ) : items.length ? (
          <div className="divide-y">
            {items.map((item) => (
              <article
                key={item.id}
                className={`flex min-w-0 gap-3 p-4 sm:p-5 ${!item.readAt ? "bg-soft/30" : ""}`}
              >
                <span
                  className={`mt-1 shrink-0 rounded-full p-2 ${!item.readAt ? "bg-soft text-primary" : "bg-background text-muted"}`}
                >
                  <Bell size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-bold">{item.title}</h2>
                    {!item.readAt && <span className="pill">Unread</span>}
                  </div>
                  <p className="mt-1 break-words text-sm text-muted">
                    {item.message}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {label(item.kind)} ·{" "}
                    {dateLabel(item.createdAt, {
                      hour: "numeric",
                      minute: "2-digit",
                      year: "numeric",
                    })}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={item.href}
                        onClick={() => {
                          if (!item.readAt)
                            void mark({ id: item.id, read: true });
                        }}
                      >
                        Open item
                        <ArrowUpRight />
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        void mark({ id: item.id, read: !item.readAt })
                      }
                    >
                      {item.readAt ? "Mark unread" : "Mark read"}
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Bell className="mx-auto mb-4 text-muted" />
            <h2 className="font-bold">You’re all caught up</h2>
            <p className="mt-2 text-sm text-muted">
              Upcoming deadlines, events and tasks needing attention will appear
              here.
            </p>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-xs text-muted">
          <span>
            {total} reminders · Page {page}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={page <= 1 || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => p - 1);
              }}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={page * 30 >= total || loading}
              onClick={() => {
                setLoading(true);
                setPage((p) => p + 1);
              }}
            >
              Next
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
