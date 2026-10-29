export function contentSecurityPolicy(nonce: string, development: boolean) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${development ? " ws: wss:" : ""}`,
    "worker-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(development ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}
export function sessionCookieName(environment = process.env.NODE_ENV) {
  return environment === "production" ? "__Host-taskflow" : "taskflow";
}
export function sessionCookieOptions(
  expires: Date,
  environment = process.env.NODE_ENV,
) {
  return {
    httpOnly: true,
    secure: environment === "production",
    sameSite: "lax" as const,
    path: "/",
    expires,
  };
}
export function applicationOrigin(
  url: string | undefined,
  environment = process.env.NODE_ENV,
) {
  if (!url) throw new Error("Set APP_URL to the application origin.");
  const parsed = new URL(url);
  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash
  )
    throw new Error(
      "APP_URL must be an origin without a path, credentials, query or fragment.",
    );
  if (environment === "production" && parsed.protocol !== "https:")
    throw new Error("Production APP_URL must use HTTPS.");
  return parsed.origin;
}
