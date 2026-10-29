// Never log database query text, parameters, credentials, or raw error messages.
export function errorDiagnostic(error: unknown): string {
  const seen = new Set<unknown>();
  let current = error;
  for (let depth = 0; depth < 6 && current && !seen.has(current); depth++) {
    seen.add(current);
    if (typeof current !== "object") break;
    const value = current as {
      code?: unknown;
      message?: unknown;
      cause?: unknown;
    };
    if (
      typeof value.code === "string" &&
      /^(?:[0-9A-Z]{5}|ECONNREFUSED|ECONNRESET|ENOTFOUND|ETIMEDOUT|EAI_AGAIN|SELF_SIGNED_CERT_IN_CHAIN|DEPTH_ZERO_SELF_SIGNED_CERT|UNABLE_TO_VERIFY_LEAF_SIGNATURE|UNABLE_TO_GET_ISSUER_CERT_LOCALLY|CERT_HAS_EXPIRED|ERR_TLS_CERT_ALTNAME_INVALID|ERR_INVALID_URL)$/.test(
        value.code,
      )
    )
      return value.code;
    if (value.message === "Set AUTH_SECRET to at least 32 random characters.")
      return "AUTH_SECRET_INVALID";
    if (
      value.message ===
      "DATABASE_CA_CERT must contain a valid PEM CA certificate."
    )
      return "DATABASE_CA_CERT_INVALID";
    if (value.message === "Database is not configured. Follow README.md.")
      return "DATABASE_URL_MISSING";
    if (value.message === "Connection terminated due to connection timeout")
      return "DATABASE_CONNECTION_TIMEOUT";
    current = value.cause;
  }
  return "UNCLASSIFIED_SERVER_ERROR";
}
