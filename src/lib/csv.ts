// Quote every field and neutralize spreadsheet formula prefixes in untrusted strings.
export function csvCell(value: unknown) {
  let text =
    value == null
      ? ""
      : value instanceof Date
        ? value.toISOString()
        : typeof value === "object"
          ? JSON.stringify(value)
          : String(value);
  if (typeof value === "string" && /^[\s\u0000-\u001f]*[=+\-@]/.test(text))
    text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
export function toCSV(rows: Record<string, unknown>[], columns: string[]) {
  return (
    "\uFEFF" +
    [
      columns.map(csvCell).join(","),
      ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(",")),
    ].join("\r\n")
  );
}
