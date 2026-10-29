import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import type { InterfacePreferences } from "./interface-preferences";
export type DatePreferences = Pick<
  InterfacePreferences,
  "timeZone" | "dateFormat"
>;
export const defaultDatePreferences: DatePreferences = {
  timeZone: "Asia/Manila",
  dateFormat: "medium",
};
export function dateFormatter(preferences: DatePreferences) {
  return (
    value: Date | string | null,
    options: Intl.DateTimeFormatOptions = {},
  ) => {
    if (!value) return "Unscheduled";
    const date = new Date(value);
    const custom =
      preferences.dateFormat !== "medium" &&
      !("month" in options && options.month === undefined) &&
      !("day" in options && options.day === undefined);
    if (custom) {
      const base = formatInTimeZone(
        date,
        preferences.timeZone,
        preferences.dateFormat,
      );
      if (options.hour)
        return `${base}, ${new Intl.DateTimeFormat("en", { timeZone: preferences.timeZone, hour: options.hour, minute: options.minute }).format(date)}`;
      return base;
    }
    return new Intl.DateTimeFormat("en-PH", {
      timeZone: preferences.timeZone,
      month: "short",
      day: "numeric",
      ...options,
    }).format(date);
  };
}
export function zonedInput(value: string | null, timeZone = "Asia/Manila") {
  return value
    ? formatInTimeZone(new Date(value), timeZone, "yyyy-MM-dd'T'HH:mm")
    : "";
}
export function localToISO(value: string, timeZone = "Asia/Manila") {
  if (!value) return null;
  const date = fromZonedTime(value, timeZone);
  if (
    !Number.isFinite(date.getTime()) ||
    formatInTimeZone(date, timeZone, "yyyy-MM-dd'T'HH:mm") !== value
  )
    throw new Error(
      `That local time does not exist in ${timeZone}. Choose another time.`,
    );
  return date.toISOString();
}
