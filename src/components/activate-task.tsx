"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { request } from "@/lib/client";
export function ActivateTask({ id }: { id: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <Button
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await request(`/api/backlogs/${id}/activate`, "POST");
          toast.success("Task moved to active work");
          router.refresh();
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="animate-spin" /> : <ArrowUpRight />}Make
      active
    </Button>
  );
}
