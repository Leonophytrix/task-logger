"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main id="main" className="mx-auto max-w-lg px-5 py-20">
      <h1 className="text-2xl font-bold">We couldn’t load your workspace</h1>
      <p className="my-4 text-muted">
        Check your database connection and server configuration, then try again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </main>
  );
}
