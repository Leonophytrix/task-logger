import { it, expect } from "vitest";
import { nextTaskOccurrence } from "../src/lib/recurring-tasks";
it("keeps monthly anchor dates and skips missing days", () => {
  const anchor = new Date("2028-01-31T09:00:00+08:00");
  const next = nextTaskOccurrence(anchor, "monthly", 0, "Asia/Manila");
  expect(next?.date.toISOString()).toBe("2028-03-31T01:00:00.000Z");
  expect(next?.index).toBe(2);
});
it("keeps recurring wall-clock times across daylight-saving changes", () => {
  const next = nextTaskOccurrence(
    new Date("2026-03-07T09:00:00-05:00"),
    "daily",
    0,
    "America/New_York",
  );
  expect(next?.date.toISOString()).toBe("2026-03-08T13:00:00.000Z");
});
it("skips nonexistent spring-forward wall times", () => {
  const next = nextTaskOccurrence(
    new Date("2026-03-07T02:30:00-05:00"),
    "daily",
    0,
    "America/New_York",
  );
  expect(next?.index).toBe(2);
  expect(next?.date.toISOString()).toBe("2026-03-09T06:30:00.000Z");
});
