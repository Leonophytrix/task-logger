import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { apiUser, body, handleError, sameOrigin } from "@/lib/http";
import { userSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/password";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    await apiUser(true);
    const input = userSchema.parse(await body(request));
    const [row] = await db()
      .insert(users)
      .values({
        username: input.username,
        role: input.role,
        passwordHash: await hashPassword(input.password),
      })
      .returning({ id: users.id, username: users.username });
    return NextResponse.json(row, { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
