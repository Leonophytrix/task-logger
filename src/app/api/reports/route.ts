import { NextResponse } from "next/server";
import { apiUser, handleError } from "@/lib/http";
import { uiPreferences } from "@/lib/interface-preferences";
import { parseReportRange } from "@/lib/report-validation";
import { reportData } from "@/lib/reports";
export async function GET(request: Request) {
  try {
    const user = await apiUser();
    const prefs = await uiPreferences(user.id);
    return NextResponse.json(
      await reportData(
        user.id,
        parseReportRange(new URL(request.url).searchParams, prefs.timeZone),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return handleError(e);
  }
}
