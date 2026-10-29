import { databaseTLS } from "./database-tls";
import { rootCertificates } from "node:tls";
import { X509Certificate } from "node:crypto";
// pg lets URL SSL options overwrite the TLS object. Normalize them so remote
// certificate/hostname verification cannot be disabled by a connection-string flag.
export function postgresOptions(
  url: string,
  certificate = process.env.DATABASE_CA_CERT,
) {
  const parsed = new URL(url);
  for (const key of ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"])
    parsed.searchParams.delete(key);
  let ca: string[] | undefined;
  if (certificate) {
    const pem = certificate.replace(/\\n/g, "\n").trim();
    try {
      if (!new X509Certificate(pem).ca) throw new Error();
    } catch {
      throw new Error(
        "DATABASE_CA_CERT must contain a valid PEM CA certificate.",
      );
    }
    ca = [...rootCertificates, pem];
  }
  return {
    connectionString: parsed.toString(),
    ssl:
      databaseTLS(url) === false
        ? false
        : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
  };
}
