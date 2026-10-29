"use client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { label } from "@/lib/utils";
type Point = {
  date: string;
  completed?: number;
  overdue?: number;
  backlog?: number;
  rate?: number;
};
type Distribution = { name: string; value: number };
function DataTable({
  rows,
}: {
  rows: Record<string, string | number | undefined>[];
}) {
  const keys = Object.keys(rows[0] || {});
  return (
    <details className="mt-4 text-xs">
      <summary className="flex min-h-11 cursor-pointer items-center text-primary">
        View chart data
      </summary>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr>
              {keys.map((k) => (
                <th className="border-b p-2" key={k}>
                  {label(k)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {keys.map((k) => (
                  <td key={k} className="border-b p-2">
                    {row[k]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
export function CompletionChart({ data }: { data: Point[] }) {
  return (
    <section className="panel min-w-0 p-5">
      <h2 className="font-bold">Completed tasks over time</h2>
      <p className="mb-5 mt-1 text-xs text-muted">
        Completion events, including tasks completed again after reopening
      </p>
      {data.length ? (
        <>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={data} accessibilityLayer>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  minTickGap={25}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis
                  allowDecimals={false}
                  width={32}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: 10,
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="completed"
                  name="Completed"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            rows={data.map((p) => ({
              date: p.date,
              completed: p.completed || 0,
            }))}
          />
        </>
      ) : (
        <p className="py-16 text-center text-sm text-muted">
          No completions recorded in this range yet.
        </p>
      )}
    </section>
  );
}
export function TrendChart({
  data,
  rate = false,
}: {
  data: Point[];
  rate?: boolean;
}) {
  return (
    <section className="panel min-w-0 p-5">
      <h2 className="font-bold">
        {rate ? "Completion rate over time" : "Overdue & backlog trends"}
      </h2>
      <p className="mb-5 mt-1 text-xs text-muted">
        Recorded states at period end; today is a partial period
      </p>
      {data.length ? (
        <>
          <div className="h-64 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={data} accessibilityLayer>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => String(v).slice(5)}
                  minTickGap={25}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis
                  domain={rate ? [0, 100] : undefined}
                  allowDecimals={false}
                  width={36}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: 10,
                    color: "var(--foreground)",
                  }}
                />
                <Legend />
                {rate ? (
                  <Line
                    type="monotone"
                    dataKey="rate"
                    name="Completed %"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    isAnimationActive={false}
                  />
                ) : (
                  <>
                    <Line
                      type="monotone"
                      dataKey="overdue"
                      name="Overdue"
                      stroke="#dc6262"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="backlog"
                      name="Backlog"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      isAnimationActive={false}
                    />
                  </>
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            rows={data.map((p) =>
              rate
                ? { date: p.date, rate: p.rate || 0 }
                : {
                    date: p.date,
                    overdue: p.overdue || 0,
                    backlog: p.backlog || 0,
                  },
            )}
          />
        </>
      ) : (
        <p className="py-16 text-center text-sm text-muted">
          State history begins when tracking is enabled.
        </p>
      )}
    </section>
  );
}
export function DistributionChart({
  title,
  data,
}: {
  title: string;
  data: Distribution[];
}) {
  return (
    <section className="panel min-w-0 p-5">
      <h2 className="mb-5 font-bold">{title}</h2>
      {data.length ? (
        <>
          <div
            className="min-w-0"
            style={{ height: Math.max(180, Math.min(600, data.length * 36)) }}
          >
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart
                data={data.map((d) => ({ ...d, name: label(d.name) }))}
                layout="vertical"
                accessibilityLayer
              >
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={85}
                  tick={{ fill: "var(--muted)", fontSize: 10 }}
                  tickFormatter={(v) =>
                    String(v).length > 14
                      ? String(v).slice(0, 12) + "…"
                      : String(v)
                  }
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    borderColor: "var(--border)",
                    borderRadius: 10,
                    color: "var(--foreground)",
                  }}
                />
                <Bar
                  dataKey="value"
                  name="Tasks"
                  fill="var(--primary)"
                  radius={[0, 4, 4, 0]}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            rows={data.map((d) => ({ name: label(d.name), tasks: d.value }))}
          />
        </>
      ) : (
        <p className="py-12 text-center text-sm text-muted">
          No tasks created in this range.
        </p>
      )}
    </section>
  );
}
