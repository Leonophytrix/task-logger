"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { request } from "@/lib/client";
export function AuthForm({ change = false }: { change?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    if (change && form.get("password") !== form.get("confirm")) {
      setError("Passwords do not match.");
      setBusy(false);
      return;
    }
    try {
      const result = await request<{ redirect: string }>(
        `/api/auth/${change ? "password" : "login"}`,
        "POST",
        Object.fromEntries(form),
      );
      router.replace(result.redirect);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      {change ? (
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
      ) : (
        <label>
          Username
          <input
            name="username"
            autoComplete="username"
            required
            autoCapitalize="none"
            spellCheck={false}
            minLength={3}
            maxLength={32}
          />
        </label>
      )}
      <label>
        {change ? "New password" : "Password"}
        <input
          name="password"
          type="password"
          autoComplete={change ? "new-password" : "current-password"}
          required
          minLength={change ? 12 : 1}
          maxLength={128}
        />
      </label>
      {change && (
        <>
          <p className="text-xs text-muted">
            Use 12–128 characters. A unique passphrase works well.
          </p>
          <label>
            Confirm new password
            <input
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={12}
              maxLength={128}
            />
          </label>
        </>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200"
        >
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : null}
        {change ? "Update password" : "Sign in to your workspace"}
        {!busy && <ArrowRight />}
      </Button>
    </form>
  );
}
