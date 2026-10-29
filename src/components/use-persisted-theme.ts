"use client";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { request } from "@/lib/client";
export function usePersistedTheme() {
  const { setTheme } = useTheme();
  const router = useRouter();
  return {
    setTheme: async (theme: string) => {
      try {
        await request("/api/preferences/interface", "PUT", { theme });
        setTheme(theme);
        router.refresh();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
  };
}
