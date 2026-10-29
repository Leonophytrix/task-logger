"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Dialog } from "./ui/dialog";
import { request } from "@/lib/client";
import type { Category } from "@/lib/types";
export function CategoryManager({ categories }: { categories: Category[] }) {
  const [editing, setEditing] = useState<Category | null | undefined>();
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <section className="panel p-5 sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Your categories</h2>
          <p className="mt-1 text-sm text-muted">
            Give your work a little structure.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setEditing(null);
            setError("");
          }}
        >
          <Plus />
          Add category
        </Button>
      </div>
      {categories.length ? (
        <ul className="divide-y">
          {categories.map((c) => (
            <li className="flex min-w-0 items-center gap-3 py-2" key={c.id}>
              <span
                className="size-3 shrink-0 rounded-full border"
                style={{ background: c.color }}
              />
              <span className="min-w-0 flex-1 break-words">{c.name}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Edit category ${c.name}`}
                onClick={() => {
                  setEditing(c);
                  setError("");
                }}
              >
                <Pencil />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete category ${c.name}`}
                onClick={() => setDeleting(c)}
              >
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-background p-5 text-sm text-muted">
          No categories yet. Try “Personal”, “Work”, or a project name.
        </p>
      )}
      <Dialog
        open={editing !== undefined}
        onOpenChange={(v) => !busy && !v && setEditing(undefined)}
        title={editing ? "Edit category" : "New category"}
        description="Categories are private to your account."
      >
        <form
          className="space-y-5"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const f = new FormData(e.currentTarget);
            try {
              await request(
                editing ? `/api/categories/${editing.id}` : "/api/categories",
                editing ? "PUT" : "POST",
                Object.fromEntries(f),
              );
              setEditing(undefined);
              router.refresh();
              toast.success("Category saved");
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Name
            <input
              name="name"
              required
              maxLength={40}
              defaultValue={editing?.name}
            />
          </label>
          <label>
            Color
            <input
              className="mt-2 block h-11 w-20 rounded border p-1"
              type="color"
              name="color"
              defaultValue={editing?.color || "#6366f1"}
            />
          </label>
          {error && (
            <p role="alert" className="text-red-700 dark:text-red-300">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            Save category
          </Button>
        </form>
      </Dialog>
      <Dialog
        open={!!deleting}
        onOpenChange={(v) => !busy && !v && setDeleting(null)}
        title="Delete category?"
        description="Tasks in this category will become uncategorized. The tasks will be kept."
      >
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setDeleting(null)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await request(`/api/categories/${deleting!.id}`, "DELETE");
                setDeleting(null);
                router.refresh();
                toast.success("Category deleted");
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete category
          </Button>
        </div>
      </Dialog>
    </section>
  );
}
