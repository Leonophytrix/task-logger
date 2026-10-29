import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { currentUser } from "./auth";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiUser(admin = false, allowPasswordChange = false) {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Please sign in.");
  if (user.mustChangePassword && !allowPasswordChange)
    throw new HttpError(403, "Change your temporary password first.");
  if (admin && user.role !== "admin")
    throw new HttpError(403, "Administrator access required.");
  return user;
}
export function sameOrigin(request: Request) {
  if (!process.env.APP_URL)
    throw new HttpError(503, "Set APP_URL before using the application.");
  if (request.headers.get("origin") !== new URL(process.env.APP_URL).origin)
    throw new HttpError(403, "Request origin was rejected.");
}
export async function body(request: Request) {
  if (Number(request.headers.get("content-length")) > 65536)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const decoder = new TextDecoder();
  let raw = "";
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 65536) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large.");
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  try {
    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Invalid JSON.");
  }
}
export function handleError(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0].message },
      { status: 400 },
    );
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  const e = error as { code?: string; cause?: { code?: string } };
  if ([e.code, e.cause?.code].includes("23505"))
    return NextResponse.json(
      { error: "That name already exists." },
      { status: 409 },
    );
  console.error(
    "Request failed:",
    error instanceof Error ? error.name : "Unknown error",
  );
  return NextResponse.json(
    {
      error:
        "Unable to complete the request. Check server configuration or try again.",
    },
    { status: 500 },
  );
}
