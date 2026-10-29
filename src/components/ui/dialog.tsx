"use client";
import { Dialog as Primitive } from "radix-ui";
import { X } from "lucide-react";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Primitive.Root open={open} onOpenChange={onOpenChange}>
      <Primitive.Portal>
        <Primitive.Overlay className="fixed inset-0 z-40 bg-slate-950/55 backdrop-blur-[2px]" />
        <Primitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90dvh] w-[calc(100%-24px)] max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border bg-card p-5 shadow-2xl sm:p-7">
          <Primitive.Title className="pr-10 text-xl font-bold">
            {title}
          </Primitive.Title>
          <Primitive.Description
            className={description ? "mt-1 mb-6 text-sm text-muted" : "sr-only"}
          >
            {description || title}
          </Primitive.Description>
          <Primitive.Close
            aria-label="Close dialog"
            className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-lg hover:bg-soft"
          >
            <X size={20} />
          </Primitive.Close>
          {children}
        </Primitive.Content>
      </Primitive.Portal>
    </Primitive.Root>
  );
}
