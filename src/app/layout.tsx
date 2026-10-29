import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/providers";
import { headers } from "next/headers";
import "./globals.css";
export const metadata: Metadata = {
  title: {
    default: "Taskflow · Your space to get things done",
    template: "%s · Taskflow",
  },
  description:
    "A private, focused workspace for your tasks and daily progress.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#6366f1",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const nonce = (await headers()).get("x-nonce") || undefined;
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
