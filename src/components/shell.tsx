"use client";
import { useSyncExternalStore, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePersistedTheme } from "./use-persisted-theme";
import {
  Layers3,
  LayoutDashboard,
  ListTodo,
  Settings,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  ChevronRight,
  ShieldCheck,
  CalendarDays,
  Archive,
  Bell,
  BookOpen,
  Columns3,
  ChartNoAxesCombined,
} from "lucide-react";
import { Dialog as Primitive } from "radix-ui";
import { Button } from "./ui/button";
import { LogoutButton } from "./logout-button";
import { TaskEditor } from "./task-editor";
import { useReminders } from "./use-reminders";
import type { Category, PublicUser } from "@/lib/types";
const subscribe = (callback: () => void) => {
  window.addEventListener("taskflow-sidebar", callback);
  return () => window.removeEventListener("taskflow-sidebar", callback);
};
export function Shell({
  user,
  categories,
  children,
}: {
  user: PublicUser;
  categories: Category[];
  children: React.ReactNode;
}) {
  const path = usePathname();
  const unread = useReminders(user.id);
  const [drawer, setDrawer] = useState(false);
  const { setTheme } = usePersistedTheme();
  const collapsed = useSyncExternalStore(
    subscribe,
    () => localStorage.getItem("sidebar") === "collapsed",
    () => false,
  );
  const links = [
    { href: "/", name: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", name: "My Tasks", icon: ListTodo },
    { href: "/kanban", name: "Kanban", icon: Columns3 },
    { href: "/calendar", name: "Calendar", icon: CalendarDays },
    { href: "/backlogs", name: "Backlogs", icon: Archive },
    { href: "/work-logs", name: "Work Logs", icon: BookOpen },
    { href: "/reports", name: "Reports", icon: ChartNoAxesCombined },
    { href: "/notifications", name: "Notifications", icon: Bell },
    { href: "/settings", name: "Settings", icon: Settings },
    ...(user.role === "admin"
      ? [{ href: "/admin/users", name: "User Management", icon: Users }]
      : []),
  ];
  const navigation = (compact = false) => (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto p-4">
      <Link
        href="/"
        onClick={() => setDrawer(false)}
        className="mb-6 flex min-h-11 shrink-0 items-center gap-3 px-2 text-xl font-bold"
      >
        <span className="rounded-xl bg-primary p-2 text-white dark:text-slate-950">
          <Layers3 size={21} />
        </span>
        {!compact && (
          <span>
            taskflow<span className="text-primary">.</span>
          </span>
        )}
      </Link>
      {!compact && <p className="eyebrow mb-3 px-3">Workspace</p>}
      <nav aria-label="Main navigation" className="space-y-2">
        {links.map(({ href, name, icon: Icon }) => (
          <Link
            title={compact ? name : undefined}
            aria-label={compact ? name : undefined}
            key={href}
            href={href}
            onClick={() => setDrawer(false)}
            aria-current={path === href ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${path === href ? "bg-soft text-primary" : "text-muted hover:bg-background hover:text-foreground"}`}
          >
            <Icon size={19} />
            {!compact && <span>{name}</span>}
            {!compact && href === "/notifications" && unread > 0 && (
              <span
                className="pill ml-auto"
                aria-label={`${unread} unread notifications`}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
            {!compact && path === href && (
              <span className="ml-auto size-1.5 rounded-full bg-primary" />
            )}
          </Link>
        ))}
      </nav>
      {!compact && (
        <div className="mt-6 hidden rounded-xl border border-dashed p-4 min-[900px]:block">
          <ShieldCheck size={20} className="mb-2 text-primary" />
          <p className="text-xs font-semibold">Your personal workspace</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Your tasks stay private, even from administrators.
          </p>
        </div>
      )}
      <div className="mt-auto pt-8">
        {!compact && (
          <>
            <div className="mb-3 flex items-center gap-2 px-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-soft font-bold text-primary">
                {user.username.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {user.username}
                </p>
                <p className="text-xs capitalize text-muted">
                  {user.role} account
                </p>
              </div>
            </div>
            <LogoutButton />
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label={compact ? "Expand sidebar" : "Collapse sidebar"}
          className="mt-3 hidden lg:inline-flex"
          onClick={() => {
            localStorage.setItem(
              "sidebar",
              collapsed ? "expanded" : "collapsed",
            );
            window.dispatchEvent(new Event("taskflow-sidebar"));
          }}
        >
          {compact ? <PanelLeftOpen /> : <PanelLeftClose />}
        </Button>
      </div>
    </div>
  );
  return (
    <div className="min-h-dvh">
      <aside
        className={`fixed inset-y-0 left-0 z-30 hidden border-r bg-card lg:block ${collapsed ? "w-20" : "w-60"}`}
      >
        {navigation(collapsed)}
      </aside>
      <div className={`workspace-frame ${collapsed ? "lg:pl-20" : "lg:pl-60"}`}>
        <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-2 border-b bg-card/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="lg:hidden"
              onClick={() => setDrawer(true)}
            >
              <Menu />
            </Button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-muted sm:inline">Workspace</span>
              <ChevronRight size={14} className="hidden text-muted sm:block" />
              <span className="truncate font-semibold">
                {links.find((l) => l.href === path)?.name || "Workspace"}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/notifications"
              aria-label={`Notifications, ${unread} unread`}
              className="relative flex size-11 items-center justify-center rounded-lg text-muted hover:bg-soft"
            >
              <Bell size={19} />
              {unread > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute right-0 top-0 rounded-full bg-primary px-1.5 text-[10px] font-bold text-white dark:text-slate-950"
                >
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <label className="sr-only" htmlFor="theme">
              Color theme
            </label>
            <select
              id="theme"
              aria-label="Color theme"
              defaultValue=""
              onChange={(e) => setTheme(e.target.value)}
              className="!w-24 !p-2 sm:!w-28"
            >
              <option value="" disabled>
                Theme
              </option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
            <span className="hidden md:block">
              <TaskEditor categories={categories} />
            </span>
          </div>
        </header>
        <main
          id="main"
          className="enter mx-auto w-full max-w-[1680px] p-4 pb-24 sm:p-8 sm:pb-24 xl:p-10"
        >
          {children}
        </main>
        <TaskEditor categories={categories} floating />
      </div>
      <Primitive.Root open={drawer} onOpenChange={setDrawer}>
        <Primitive.Portal>
          <Primitive.Overlay className="fixed inset-0 z-40 bg-slate-950/60" />
          <Primitive.Content className="fixed inset-y-0 left-0 z-50 w-[min(288px,90vw)] overflow-y-auto border-r bg-card pb-[env(safe-area-inset-bottom)]">
            <Primitive.Title className="sr-only">Navigation</Primitive.Title>
            <Primitive.Description className="sr-only">
              Workspace navigation and account controls
            </Primitive.Description>
            <Primitive.Close
              className="absolute right-2 top-3 flex size-11 items-center justify-center"
              aria-label="Close navigation"
            >
              ×
            </Primitive.Close>
            {navigation()}
          </Primitive.Content>
        </Primitive.Portal>
      </Primitive.Root>
    </div>
  );
}
