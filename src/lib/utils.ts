import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export const label = (s: string) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
export function dateLabel(
  value: string | Date | null,
  options: Intl.DateTimeFormatOptions = {},
) {
  return value
    ? new Intl.DateTimeFormat("en-PH", {
        timeZone: "Asia/Manila",
        month: "short",
        day: "numeric",
        ...options,
      }).format(new Date(value))
    : "Unscheduled";
}
export function manilaInput(value: string | null) {
  if (!value) return "";
  return new Date(new Date(value).getTime() + 8 * 3600000)
    .toISOString()
    .slice(0, 16);
}
export function inputToISO(value: string) {
  return value ? new Date(`${value}:00+08:00`).toISOString() : null;
}
