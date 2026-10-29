import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requirePageUser } from "@/lib/auth";
import { CategoryManager } from "@/components/category-manager";
import { ThemeSettings } from "@/components/theme-settings";
import { AuthForm } from "@/components/auth-form";
import { NotificationSettings } from "@/components/notification-settings";
import { preferencesFor } from "@/lib/reminders";
import { uiPreferences } from "@/lib/interface-preferences";
import { InterfaceSettings } from "@/components/interface-settings";
export default async function SettingsPage() {
  const user = await requirePageUser();
  const preferences = await preferencesFor(user.id);
  const display = await uiPreferences(user.id);
  const list = await db()
    .select()
    .from(categories)
    .where(eq(categories.userId, user.id))
    .orderBy(asc(categories.name));
  return (
    <div className="max-w-5xl">
      <p className="eyebrow mb-2">Make yourself at home</p>
      <h1 className="text-3xl font-bold">Settings</h1>
      <p className="mb-7 mt-2 text-muted">
        Your account, your workspace, your way.
      </p>
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-7">
            <h2 className="mb-5 font-bold">Profile</h2>
            <dl className="space-y-4">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Username</dt>
                <dd className="break-all font-semibold">{user.username}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Role</dt>
                <dd className="capitalize">{user.role}</dd>
              </div>
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted">Timezone</dt>
                <dd>{display.timeZone}</dd>
              </div>
            </dl>
            <p className="mt-5 text-xs text-muted">
              Contact an administrator to change your username.
            </p>
          </section>
          <ThemeSettings />
          <InterfaceSettings preferences={display} />
          <NotificationSettings preferences={preferences} userId={user.id} />
          <CategoryManager categories={list} />
        </div>
        <section className="panel p-5 sm:p-7">
          <h2 className="font-bold">Change password</h2>
          <p className="mb-6 mt-1 text-sm text-muted">
            Changing your password signs out your other sessions.
          </p>
          <AuthForm change />
        </section>
      </div>
    </div>
  );
}
