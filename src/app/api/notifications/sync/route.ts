import { NextResponse } from "next/server";
import { apiUser, handleError, sameOrigin } from "@/lib/http";
import { syncReminders } from "@/lib/reminders";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await apiUser();
    return NextResponse.json(await syncReminders(user.id), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return handleError(e);
  }
}
