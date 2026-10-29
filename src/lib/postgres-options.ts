import { databaseTLS } from "./database-tls";
// pg lets URL SSL options overwrite the TLS object. Normalize them so remote
// certificate/hostname verification cannot be disabled by a connection-string flag.
export function postgresOptions(url: string) {
  const parsed = new URL(url);
  for (const key of ["sslmode", "ssl", "sslcert", "sslkey", "sslrootcert"])
    parsed.searchParams.delete(key);
  return {
    connectionString: parsed.toString(),
    ssl: databaseTLS(url) === false ? false : { rejectUnauthorized: true },
  };
}
