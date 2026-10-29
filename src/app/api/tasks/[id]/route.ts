import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { apiUser, body, handleError, sameOrigin } from "@/lib/http";
import { statuses, taskSchema } from "@/lib/validation";
import {
  deleteTaskInTransaction,
  taskDetails,
  updateTask,
} from "@/lib/task-service";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    return NextResponse.json(await taskDetails(user.id, id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return handleError(e);
  }
}
export async function PUT(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    return NextResponse.json(
      await updateTask(user.id, id, taskSchema.parse(await body(request))),
    );
  } catch (e) {
    return handleError(e);
  }
}
export async function PATCH(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const input = z
      .object({ status: z.enum(statuses) })
      .parse(await body(request));
    return NextResponse.json(await updateTask(user.id, id, input));
  } catch (e) {
    return handleError(e);
  }
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    await db().transaction((tx) => deleteTaskInTransaction(tx, user.id, id));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
