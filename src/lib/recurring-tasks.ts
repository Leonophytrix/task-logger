import { fromZonedTime, formatInTimeZone } from "date-fns-tz";
// The ordinal is relative to an immutable anchor, avoiding drift after short months.
export function nextTaskOccurrence(
  anchor: Date,
  rule: string,
  index: number,
  timeZone: string,
) {
  const local = new Date(
    formatInTimeZone(anchor, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSS") + "Z",
  );
  for (let n = index + 1; n <= index + 24; n++) {
    const next = new Date(local);
    if (rule === "monthly") {
      next.setUTCDate(1);
      next.setUTCMonth(next.getUTCMonth() + n);
      const month = next.getUTCMonth();
      next.setUTCDate(local.getUTCDate());
      if (month !== next.getUTCMonth()) continue;
    } else if (rule === "daily" || rule === "weekly")
      next.setUTCDate(next.getUTCDate() + n * (rule === "weekly" ? 7 : 1));
    else return null;
    const date = fromZonedTime(next.toISOString().slice(0, -1), timeZone);
    if (
      formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSS") !==
      next.toISOString().slice(0, -1)
    )
      continue;
    return {
      date,
      index: n,
    };
  }
  return null;
}
