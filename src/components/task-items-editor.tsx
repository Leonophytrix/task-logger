"use client";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
export type EditableItem = {
  kind: "subtask" | "checklist";
  title: string;
  done: boolean;
};
export function TaskItemsEditor({
  items,
  onChange,
}: {
  items: EditableItem[];
  onChange: (items: EditableItem[]) => void;
}) {
  const [title, setTitle] = useState(""),
    [kind, setKind] = useState<"subtask" | "checklist">("subtask");
  const add = () => {
    if (title.trim() && items.length < 40) {
      onChange([...items, { kind, title: title.trim(), done: false }]);
      setTitle("");
    }
  };
  return (
    <fieldset className="space-y-3 rounded-xl border p-4">
      <legend className="px-1 text-sm font-bold">Subtasks & checklist</legend>
      <p className="text-xs text-muted">
        {items.filter((i) => i.done).length} of {items.length} checked · Up to
        40 items
      </p>
      {items.map((item, index) => (
        <div key={index} className="flex min-w-0 items-center gap-2">
          <input
            type="checkbox"
            aria-label={`Complete item ${index + 1}`}
            checked={item.done}
            onChange={(e) =>
              onChange(
                items.map((i, n) =>
                  n === index ? { ...i, done: e.target.checked } : i,
                ),
              )
            }
          />
          <div className="min-w-0 flex-1">
            <span className="text-xs text-muted">
              {item.kind === "subtask" ? "Subtask" : "Checklist"}
            </span>
            <input
              aria-label={`Item ${index + 1} title`}
              maxLength={300}
              value={item.title}
              onChange={(e) =>
                onChange(
                  items.map((i, n) =>
                    n === index ? { ...i, title: e.target.value } : i,
                  ),
                )
              }
            />
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Remove item ${index + 1}`}
            onClick={() => onChange(items.filter((_, n) => n !== index))}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="grid gap-3">
        <label>
          New item type
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as typeof kind)}
          >
            <option value="subtask">Subtask</option>
            <option value="checklist">Checklist</option>
          </select>
        </label>
        <label>
          New item title
          <input
            maxLength={300}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="Break it into smaller steps…"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          disabled={!title.trim() || items.length >= 40}
          onClick={add}
        >
          <Plus />
          Add item
        </Button>
      </div>
    </fieldset>
  );
}
