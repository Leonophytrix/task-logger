"use client";
import { useState } from "react";
import { useDateFormatter } from "./display-preferences";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ShieldCheck,
  Users,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { request } from "@/lib/client";
type Account = {
  id: string;
  username: string;
  role: string;
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};
export function UserManager({
  accounts,
  actorId,
}: {
  accounts: Account[];
  actorId: string;
}) {
  const dateLabel = useDateFormatter();
  const [editing, setEditing] = useState<Account | null | undefined>();
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Administration</p>
          <h1 className="text-3xl font-bold">User management</h1>
          <p className="mt-2 text-muted">
            Manage access. Everyone’s work stays their own.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setError("");
          }}
        >
          <Plus />
          Create account
        </Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { name: "Total accounts", value: accounts.length, icon: Users },
          {
            name: "Active accounts",
            value: accounts.filter((u) => u.active).length,
            icon: UserCheck,
          },
          {
            name: "Administrators",
            value: accounts.filter((u) => u.role === "admin").length,
            icon: ShieldCheck,
          },
        ].map(({ name, value, icon: Icon }) => (
          <div key={name} className="panel flex items-center gap-4 p-5">
            <span className="rounded-lg bg-soft p-3 text-primary">
              <Icon size={20} />
            </span>
            <div>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs text-muted">{name}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="panel divide-y">
        {accounts.map((u) => (
          <article
            className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
            key={u.id}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-soft font-semibold text-primary">
                {u.username.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="break-all font-bold">
                  {u.username}
                  {u.id === actorId && (
                    <span className="ml-2 text-xs font-normal text-muted">
                      You
                    </span>
                  )}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {u.role} · Joined {dateLabel(u.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`pill ${u.active ? "status-completed" : "status-pending"}`}
              >
                {u.active ? "Active" : "Disabled"}
              </span>
              {u.mustChangePassword && (
                <span className="pill">Password change required</span>
              )}
              <Button
                variant="ghost"
                size="icon"
                disabled={u.id === actorId}
                aria-label={`Edit user ${u.username}`}
                onClick={() => {
                  setEditing(u);
                  setError("");
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={u.id === actorId}
                aria-label={`Delete user ${u.username}`}
                onClick={() => setDeleting(u)}
              >
                <Trash2 />
              </Button>
            </div>
          </article>
        ))}
      </div>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(v) => !busy && !v && setEditing(undefined)}
        title={editing ? "Edit account" : "Create account"}
        description="Share credentials privately. Temporary passwords must be changed at first login."
      >
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const password = String(f.get("password"));
            setBusy(true);
            setError("");
            try {
              await request(
                editing ? `/api/users/${editing.id}` : "/api/users",
                editing ? "PUT" : "POST",
                {
                  username: f.get("username"),
                  role: f.get("role"),
                  ...(editing ? { active: f.get("active") === "on" } : {}),
                  ...(!editing || password ? { password } : {}),
                },
              );
              setEditing(undefined);
              router.refresh();
              toast.success("Account saved");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Username
            <input
              name="username"
              required
              pattern="[a-zA-Z0-9_.\-]{3,32}"
              minLength={3}
              maxLength={32}
              autoComplete="off"
              autoCapitalize="none"
              defaultValue={editing?.username}
            />
          </label>
          <label>
            Role
            <select name="role" defaultValue={editing?.role || "user"}>
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <label>
            {editing ? "Reset password (optional)" : "Temporary password"}
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required={!editing}
              minLength={12}
              maxLength={128}
            />
          </label>
          <p className="text-xs text-muted">
            Use 12–128 characters. Resetting a password revokes all existing
            sessions.
          </p>
          {editing && (
            <label className="flex min-h-11 items-center gap-3">
              <input
                name="active"
                type="checkbox"
                defaultChecked={editing.active}
              />
              Account active
            </label>
          )}
          {error && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing(undefined)}
            >
              Cancel
            </Button>
            <Button disabled={busy} type="submit">
              {editing ? "Save account" : "Create account"}
            </Button>
          </div>
        </form>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => !busy && !v && setDeleting(null)}
        title="Permanently delete account?"
        description="This deletes the user and all their private tasks, categories, activity and sessions. This cannot be undone."
      >
        <p className="mb-6 break-all font-bold">{deleting?.username}</p>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Keep account
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request(`/api/users/${deleting!.id}`, "DELETE");
                setDeleting(null);
                router.refresh();
                toast.success("Account deleted");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete account
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
