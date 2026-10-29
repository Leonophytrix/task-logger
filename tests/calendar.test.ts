import { expect, it } from "vitest";
import {
  occurrences,
  dayKey,
  dayStart,
  addDays,
  calendarRange,
} from "../src/lib/calendar";
import {
  eventSchema,
  dateRangeSchema,
} from "../src/lib/productivity-validation";
it("uses Manila dates across UTC midnight and leap days", () => {
  expect(dayKey("2026-10-29T18:00:00Z")).toBe("2026-10-30");
  expect(dayStart("2026-10-30").toISOString()).toBe("2026-10-29T16:00:00.000Z");
  expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  expect(calendarRange("2026-10-29", "month")).toEqual({
    start: "2026-09-27",
    end: "2026-11-08",
  });
});
it("expands monthly events without drifting from the original day", () => {
  const e = {
    id: "x",
    startsAt: "2026-01-31T09:00:00+08:00",
    endsAt: "2026-01-31T10:00:00+08:00",
    recurrence: "monthly",
    recurrenceUntil: null,
  };
  expect(
    occurrences(e, new Date("2026-02-01"), new Date("2026-05-01")).map((o) =>
      dayKey(o.startsAt),
    ),
  ).toEqual(["2026-03-31"]);
});
it("bounds old daily series to the requested range and honors repeat-until", () => {
  const e = {
    id: "x",
    startsAt: "2000-01-01T09:00:00+08:00",
    endsAt: "2000-01-01T10:00:00+08:00",
    recurrence: "daily",
    recurrenceUntil: "2026-10-30T23:59:00+08:00",
  };
  const rows = occurrences(e, dayStart("2026-10-29"), dayStart("2026-11-03"));
  expect(rows.map((o) => dayKey(o.startsAt))).toEqual([
    "2026-10-29",
    "2026-10-30",
  ]);
});
it("includes overlapping all-day events and enforces exclusive midnight ends", () => {
  const e = {
    id: "x",
    startsAt: "2026-10-29T00:00:00+08:00",
    endsAt: "2026-10-31T00:00:00+08:00",
    recurrence: "none",
    recurrenceUntil: null,
  };
  expect(
    occurrences(e, dayStart("2026-10-30"), dayStart("2026-10-31")),
  ).toHaveLength(1);
  expect(
    occurrences(e, dayStart("2026-10-31"), dayStart("2026-11-01")),
  ).toHaveLength(0);
  expect(
    eventSchema.safeParse({
      ...e,
      title: "Meeting",
      description: "",
      location: "",
      kind: "meeting",
      color: "#6366f1",
      categoryId: null,
      allDay: true,
    }).success,
  ).toBe(true);
  expect(
    dateRangeSchema.safeParse({
      from: "2026-01-01T00:00:00Z",
      to: "2030-01-01T00:00:00Z",
    }).success,
  ).toBe(false);
});
