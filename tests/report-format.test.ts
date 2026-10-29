import { it, expect } from "vitest";
import { csvCell, toCSV } from "../src/lib/csv";
import { localToISO, zonedInput, dateFormatter } from "../src/lib/display-date";
import { parseReportRange } from "../src/lib/report-validation";
it("escapes spreadsheet formulas, quotes and newlines", () => {
  expect(csvCell(" =1+1")).toBe('"\' =1+1"');
  expect(csvCell('a"b')).toBe('"a""b"');
  expect(toCSV([{ title: "one\ntwo" }], ["title"])).toContain('"one\ntwo"');
});
it("formats saved zones and rejects nonexistent DST wall times", () => {
  expect(localToISO("2026-03-08T09:00", "America/New_York")).toBe(
    "2026-03-08T13:00:00.000Z",
  );
  expect(() => localToISO("2026-03-08T02:30", "America/New_York")).toThrow();
  expect(zonedInput("2026-10-29T18:00:00Z", "Asia/Manila")).toBe(
    "2026-10-30T02:00",
  );
  expect(
    dateFormatter({ timeZone: "UTC", dateFormat: "yyyy-MM-dd" })(
      "2026-10-29T18:00:00Z",
    ),
  ).toBe("2026-10-29");
});
it("bounds report ranges and derives timezone-aware inclusive end dates", () => {
  expect(() =>
    parseReportRange(
      new URLSearchParams({ from: "2020-01-01", to: "2030-01-01" }),
    ),
  ).toThrow();
  const r = parseReportRange(
    new URLSearchParams({ from: "2026-03-08", to: "2026-03-08" }),
    "America/New_York",
  );
  expect(r.end.getTime() - r.start.getTime()).toBe(23 * 3600000);
});
