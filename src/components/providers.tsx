"use client";
import { ThemeProvider, useTheme } from "next-themes";
import { Toaster } from "sonner";
export function Providers({
  children,
  nonce,
}: {
  children: React.ReactNode;
  nonce?: string;
}) {
  return (
    <ThemeProvider
      nonce={nonce}
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      <a
        href="#main"
        className="sr-only fixed left-3 top-3 z-[100] rounded bg-card p-3 focus:not-sr-only"
      >
        Skip to content
      </a>
      {children}
      <ThemeToaster />
    </ThemeProvider>
  );
}
function ThemeToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      richColors
      position="bottom-right"
      theme={resolvedTheme === "dark" ? "dark" : "light"}
    />
  );
}
