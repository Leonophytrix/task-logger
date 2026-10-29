import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
// Day keys are calendar dates in the selected IANA timezone; default Asia/Manila.
export const MANILA_OFFSET = 8 * 3600000;
export const DAY = 86400000;
export function dayKey(
  value: Date | string = new Date(),
  timeZone = "Asia/Manila",
) {
  return formatInTimeZone(new Date(value), timeZone, "yyyy-MM-dd");
}
export function dayStart(key: string, timeZone = "Asia/Manila") {
  return fromZonedTime(`${key}T00:00:00`, timeZone);
}
export function addDays(key: string, count: number) {
  return new Date(Date.parse(`${key}T00:00:00Z`) + count * DAY)
    .toISOString()
    .slice(0, 10);
}
export function monthShift(key: string, count: number) {
  const d = new Date(`${key.slice(0, 7)}-01T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + count);
  return d.toISOString().slice(0, 10);
}
export function calendarRange(key: string, view: string) {
  if (view === "month") {
    const first = key.slice(0, 7) + "-01";
    const weekday = new Date(first + "T00:00:00Z").getUTCDay();
    const start = addDays(first, -weekday);
    return { start, end: addDays(start, 42) };
  }
  if (view === "week") {
    const start = addDays(key, -new Date(key + "T00:00:00Z").getUTCDay());
    return { start, end: addDays(start, 7) };
  }
  return { start: key, end: addDays(key, view === "agenda" ? 30 : 1) };
}
export type RecurringEvent = {
  id: string;
  startsAt: Date | string;
  endsAt: Date | string;
  recurrence: string;
  recurrenceUntil: Date | string | null;
  timeZone?: string;
};
export function occurrences<T extends RecurringEvent>(
  event: T,
  from: Date,
  to: Date,
) {
  const start = new Date(event.startsAt);
  const duration = new Date(event.endsAt).getTime() - start.getTime();
  const until = event.recurrenceUntil
    ? new Date(event.recurrenceUntil).getTime()
    : Infinity;
  const result: { event: T; startsAt: Date; endsAt: Date; key: string }[] = [];
  if (event.recurrence === "none") {
    if (start < to && start.getTime() + duration > from.getTime())
      result.push({
        event,
        startsAt: start,
        endsAt: new Date(start.getTime() + duration),
        key: `${event.id}:${start.toISOString()}`,
      });
    return result;
  }
  // Skip directly toward the window. Monthly recurrences skip dates absent in a month.
  const timeZone = event.timeZone || "Asia/Manila";
  const fromLocal = new Date(
    formatInTimeZone(
      new Date(from.getTime() - duration),
      timeZone,
      "yyyy-MM-dd'T'HH:mm:ss.SSS",
    ) + "Z",
  );
  const startLocal = new Date(
    formatInTimeZone(start, timeZone, "yyyy-MM-dd'T'HH:mm:ss.SSS") + "Z",
  );
  let n =
    event.recurrence === "monthly"
      ? Math.max(
          0,
          (fromLocal.getUTCFullYear() - startLocal.getUTCFullYear()) * 12 +
            fromLocal.getUTCMonth() -
            startLocal.getUTCMonth() -
            1,
        )
      : Math.max(
          0,
          Math.floor(
            (from.getTime() - duration - start.getTime()) /
              (event.recurrence === "weekly" ? 7 * DAY : DAY),
          ),
        );
  for (let checked = 0; checked < 400; checked++, n++) {
    let date: Date;
    if (event.recurrence === "monthly") {
      const local = new Date(startLocal);
      local.setUTCDate(1);
      local.setUTCMonth(local.getUTCMonth() + n);
      const expectedMonth = local.getUTCMonth();
      local.setUTCDate(startLocal.getUTCDate());
      if (local.getUTCMonth() !== expectedMonth) continue;
      date = fromZonedTime(local.toISOString().slice(0, -1), timeZone);
    } else {
      const local = new Date(startLocal);
      local.setUTCDate(
        local.getUTCDate() + n * (event.recurrence === "weekly" ? 7 : 1),
      );
      date = fromZonedTime(local.toISOString().slice(0, -1), timeZone);
    }
    if (
      formatInTimeZone(date, timeZone, "HH:mm:ss") !==
      formatInTimeZone(start, timeZone, "HH:mm:ss")
    )
      continue;
    if (date >= to || date.getTime() > until) break;
    if (date.getTime() + duration > from.getTime())
      result.push({
        event,
        startsAt: date,
        endsAt: new Date(date.getTime() + duration),
        key: `${event.id}:${date.toISOString()}`,
      });
  }
  return result;
}
