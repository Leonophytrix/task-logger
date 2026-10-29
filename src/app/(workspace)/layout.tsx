import { eq, asc } from "drizzle-orm";
import { requirePageUser } from "@/lib/auth";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { Shell } from "@/components/shell";
import { uiPreferences } from "@/lib/interface-preferences";
import { DisplayPreferences } from "@/components/display-preferences";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requirePageUser();
  const preferences = await uiPreferences(user.id);
  const list = await db()
    .select()
    .from(categories)
    .where(eq(categories.userId, user.id))
    .orderBy(asc(categories.name));
  return (
    <DisplayPreferences value={preferences}>
      <Shell user={user} categories={list}>
        {children}
      </Shell>
    </DisplayPreferences>
  );
}
