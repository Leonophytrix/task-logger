import { addDays, calendarRange, monthShift } from "./calendar";
export function workPeriod(date: string, period: string) {
  if (period === "monthly") {
    const start = date.slice(0, 7) + "-01";
    return { start, end: monthShift(start, 1) };
  }
  if (period === "weekly") return calendarRange(date, "week");
  return { start: date, end: addDays(date, 1) };
}
