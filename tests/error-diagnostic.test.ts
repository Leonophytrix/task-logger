import { expect, it } from "vitest";
import { errorDiagnostic } from "../src/lib/error-diagnostic";

it("finds safe database and TLS codes inside wrapped errors", () => {
  expect(
    errorDiagnostic(
      new Error("query with private parameters", {
        cause: Object.assign(new Error("private connection string"), {
          code: "28P01",
        }),
      }),
    ),
  ).toBe("28P01");
  expect(
    errorDiagnostic({ cause: { code: "SELF_SIGNED_CERT_IN_CHAIN" } }),
  ).toBe("SELF_SIGNED_CERT_IN_CHAIN");
});
it("identifies known configuration failures without disclosing values", () => {
  expect(
    errorDiagnostic(
      new Error("Set AUTH_SECRET to at least 32 random characters."),
    ),
  ).toBe("AUTH_SECRET_INVALID");
  expect(
    errorDiagnostic(
      new Error("DATABASE_CA_CERT must contain a valid PEM CA certificate."),
    ),
  ).toBe("DATABASE_CA_CERT_INVALID");
});
it("does not log arbitrary messages, codes, or circular error objects", () => {
  const error = {
    code: "postgresql://private:password@host/db",
    message: "private task",
    cause: undefined as unknown,
  };
  error.cause = error;
  expect(errorDiagnostic(error)).toBe("UNCLASSIFIED_SERVER_ERROR");
});
