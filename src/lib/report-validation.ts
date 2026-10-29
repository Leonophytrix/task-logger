import { z } from "zod";
import { addDays, dayKey, dayStart } from "./calendar";
export const reportRangeSchema = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    group: z.enum(["day", "week", "month"]).default("day"),
  })
  .refine(
    (v) =>
      v.from <= v.to && Date.parse(v.to) - Date.parse(v.from) <= 365 * 86400000,
    "Choose an ordered date range of at most 366 days.",
  );
export function parseReportRange(
  params: URLSearchParams,
  timeZone = "Asia/Manila",
) {
  const today = dayKey(new Date(), timeZone);
  const input = reportRangeSchema.parse({
    from: params.get("from") || addDays(today, -29),
    to: params.get("to") || today,
    group: params.get("group") || "day",
  });
  return {
    ...input,
    start: dayStart(input.from, timeZone),
    end: dayStart(addDays(input.to, 1), timeZone),
    timeZone,
  };
}
export type ReportRange = ReturnType<typeof parseReportRange>;
