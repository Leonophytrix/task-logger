import { it, expect } from "vitest";
import { workPeriod } from "../src/lib/work-period";
it("uses half-open daily, Sunday-weekly and calendar-month accomplishment ranges", () => {
  expect(workPeriod("2026-10-29", "daily")).toEqual({
    start: "2026-10-29",
    end: "2026-10-30",
  });
  expect(workPeriod("2026-10-29", "weekly")).toEqual({
    start: "2026-10-25",
    end: "2026-11-01",
  });
  expect(workPeriod("2028-02-29", "monthly")).toEqual({
    start: "2028-02-01",
    end: "2028-03-01",
  });
});
