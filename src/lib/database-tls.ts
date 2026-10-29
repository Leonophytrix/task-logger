// Only loopback databases in nonproduction can use plaintext TCP.
export function databaseTLS(
  url: string,
  environment = process.env.NODE_ENV,
): false | "verify-full" {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(url).hostname,
  );
  return local && environment !== "production" ? false : "verify-full";
}
