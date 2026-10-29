import Link from "next/link";
import { requirePageUser } from "@/lib/auth";
import { uiPreferences } from "@/lib/interface-preferences";
import { parseReportRange } from "@/lib/report-validation";
import { reportData } from "@/lib/reports";
import { dayKey, addDays } from "@/lib/calendar";
import { workPeriod } from "@/lib/work-period";
import { dateFormatter } from "@/lib/display-date";
import { Button } from "@/components/ui/button";
import { ReportActions } from "@/components/report-actions";
import {
  CompletionChart,
  TrendChart,
  DistributionChart,
} from "@/components/chart-panels";
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const prefs = await uiPreferences(user.id);
  const p = await searchParams;
  const params = new URLSearchParams();
  for (const key of ["from", "to", "group"])
    if (typeof p[key] === "string") params.set(key, p[key] as string);
  let range;
  try {
    range = parseReportRange(params, prefs.timeZone);
  } catch {
    return (
      <section className="panel space-y-4 p-6">
        <h1 className="text-2xl font-bold">Choose a valid report range</h1>
        <p>Use ordered dates within a 366-day range.</p>
        <Button asChild>
          <Link href="/reports">Reset report dates</Link>
        </Button>
      </section>
    );
  }
  const data = await reportData(user.id, range);
  const format = dateFormatter(prefs);
  const today = dayKey(new Date(), prefs.timeZone);
  const quick = (period: string) => {
    const r = workPeriod(today, period);
    return `/reports?${new URLSearchParams({ from: r.start, to: r.end > today ? today : addDays(r.end, -1), group: period === "daily" ? "day" : period === "weekly" ? "day" : "week" })}`;
  };
  return (
    <div className="report-content space-y-6">
      <div>
        <p className="eyebrow mb-2">Progress you can see</p>
        <h1 className="text-3xl font-bold">Reports & analytics</h1>
        <p className="mt-2 text-muted">
          Your private accomplishment report · {prefs.timeZone}
        </p>
        <p className="mt-2 text-sm font-semibold">
          {format(range.start, { year: "numeric" })} –{" "}
          {format(new Date(range.end.getTime() - 1), { year: "numeric" })}
        </p>
      </div>
      <div className="no-print flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href={quick("daily")}>Daily report</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={quick("weekly")}>Weekly report</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={quick("monthly")}>Monthly report</Link>
        </Button>
      </div>
      <form
        action="/reports"
        className="no-print panel grid items-end gap-4 p-5 sm:grid-cols-2 xl:grid-cols-4"
      >
        <label>
          From date
          <input name="from" type="date" required defaultValue={range.from} />
        </label>
        <label>
          Through date
          <input name="to" type="date" required defaultValue={range.to} />
        </label>
        <label>
          Group completions by
          <select name="group" defaultValue={range.group}>
            <option value="day">Day</option>
            <option value="week">Week (Monday start)</option>
            <option value="month">Month</option>
          </select>
        </label>
        <Button type="submit">Update report</Button>
      </form>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { name: "Tasks created in range", value: data.summary.created },
          { name: "Completions in range", value: data.summary.completions },
          {
            name: "Created-task completion rate",
            value: `${data.summary.rate}%`,
          },
          { name: "Logged minutes in range", value: data.summary.minutes },
        ].map((c) => (
          <div className="panel p-5" key={c.name}>
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="mt-2 text-xs text-muted">{c.name}</p>
          </div>
        ))}
      </div>
      <section className="panel space-y-4 p-5">
        <ReportActions from={range.from} to={range.to} group={range.group} />
        <p className="text-xs leading-5 text-muted">
          Completion counts include re-completions after reopening. Created-task
          rate uses current statuses of tasks created in the range, excluding
          cancelled tasks. Distributions use that same created-task cohort.
          Work-log totals include manual durations. Exports include only your
          records, up to 10,000 per request.
        </p>
        <p className="text-xs text-muted">
          State tracking{" "}
          {data.trackingSince
            ? `began ${format(data.trackingSince, { year: "numeric", hour: "numeric", minute: "2-digit" })}`
            : "begins with your first tracked task"}
          . Earlier states are not reconstructed. Trend rates use all tracked
          tasks at period end.
        </p>
      </section>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <CompletionChart data={data.completionSeries} />
        <TrendChart data={data.trends} />
        <TrendChart data={data.trends} rate />
        <DistributionChart title="Tasks by status" data={data.status} />
        <DistributionChart title="Tasks by priority" data={data.priority} />
        <DistributionChart
          title="Top categories (up to 30)"
          data={data.category}
        />
      </div>
      <section className="panel overflow-hidden">
        <div className="border-b p-5">
          <h2 className="font-bold">Accomplishments</h2>
          <p className="mt-1 text-xs text-muted">
            Completed tasks in chronological order. Up to 500 rows are shown;
            use exports or a shorter range for more.
          </p>
        </div>
        {data.accomplishments.length ? (
          <ol className="divide-y">
            {data.accomplishments.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap justify-between gap-2 p-5"
              >
                <div className="min-w-0 flex-1 basis-48">
                  <p className="break-words font-semibold">{row.title}</p>
                  <p className="mt-1 text-xs text-muted">
                    {row.category || "Uncategorized"} · {row.priority}
                  </p>
                </div>
                <time className="text-xs text-muted">
                  {format(new Date(row.completedAt), {
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="p-10 text-center text-muted">
            Complete a task to start your accomplishment history.
          </p>
        )}
        {data.accomplishmentsTruncated && (
          <p className="border-t p-5 text-sm text-muted">
            More accomplishments are available in the export.
          </p>
        )}
      </section>
    </div>
  );
}
