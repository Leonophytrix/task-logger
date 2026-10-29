import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { contentSecurityPolicy } from "@/lib/security-policy";
export function proxy(request: NextRequest) {
  const nonce = randomBytes(24).toString("base64");
  const policy = contentSecurityPolicy(
    nonce,
    process.env.NODE_ENV === "development",
  );
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", policy);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set(
    "Cache-Control",
    "private, no-store, max-age=0, must-revalidate",
  );
  return response;
}
export const config = {
  matcher: [
    "/((?!api(?:/|$)|_next/|icon.svg|favicon.ico|notifications-sw.js).*)",
  ],
};
