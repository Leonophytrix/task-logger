import { uiPreferences } from "@/lib/interface-preferences";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requirePageUser } from "@/lib/auth";
import { CalendarView } from "@/components/calendar-view";
import { dayKey as defaultDayKey } from "@/lib/calendar";
export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requirePageUser();
  const preferences = await uiPreferences(user.id);
  const dayKey = () => defaultDayKey(new Date(), preferences.timeZone);
  const list = await db()
    .select()
    .from(categories)
    .where(eq(categories.userId, user.id))
    .orderBy(asc(categories.name));
  const p = await searchParams;
  const selected =
    typeof p.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
    Number.isFinite(Date.parse(p.date))
      ? p.date
      : dayKey();
  return (
    <CalendarView categories={list} initialDate={selected} today={dayKey()} />
  );
}
