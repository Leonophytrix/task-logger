"use client";
import { useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "./ui/button";
export function ReportActions({
  from,
  to,
  group,
}: {
  from: string;
  to: string;
  group: string;
}) {
  const [dataset, setDataset] = useState("accomplishments");
  const href = (format: string) =>
    `/api/reports/export?${new URLSearchParams({ from, to, group, dataset, format })}`;
  return (
    <div className="no-print flex flex-wrap items-end gap-3">
      <label className="min-w-0 flex-1 basis-44">
        Export data
        <select value={dataset} onChange={(e) => setDataset(e.target.value)}>
          <option value="accomplishments">Accomplishments in range</option>
          <option value="tasks">Tasks created in range</option>
          <option value="worklogs">Work logs in range</option>
        </select>
      </label>
      <Button variant="outline" asChild>
        <a href={href("csv")}>
          <Download />
          CSV
        </a>
      </Button>
      <Button variant="outline" asChild>
        <a href={href("json")}>
          <Download />
          JSON
        </a>
      </Button>
      <Button variant="outline" onClick={() => window.print()}>
        <Printer />
        Print report
      </Button>
    </div>
  );
}
