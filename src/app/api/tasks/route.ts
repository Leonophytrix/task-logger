import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { apiUser, body, handleError, sameOrigin } from "@/lib/http";
import { taskSchema } from "@/lib/validation";
import { createTask } from "@/lib/task-service";
export async function GET() {
  try {
    const user = await apiUser();
    return NextResponse.json(
      await db()
        .select()
        .from(tasks)
        .where(eq(tasks.userId, user.id))
        .orderBy(desc(tasks.updatedAt))
        .limit(1000),
    );
  } catch (e) {
    return handleError(e);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    return NextResponse.json(
      await createTask(user.id, taskSchema.parse(await body(request))),
      { status: 201 },
    );
  } catch (e) {
    return handleError(e);
  }
}
