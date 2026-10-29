import { redirect } from "next/navigation";
import { Layers3, LockKeyhole, ArrowUpRight, Check } from "lucide-react";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  const user = await currentUser();
  if (user) redirect(user.mustChangePassword ? "/change-password" : "/");
  const configured = !!process.env.DATABASE_URL && !!process.env.AUTH_SECRET;
  return (
    <main id="main" className="grid min-h-dvh lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[#21243e] p-12 text-white lg:flex xl:p-20">
        <div className="flex items-center gap-3 text-2xl font-bold">
          <span className="rounded-xl bg-indigo-400/20 p-3">
            <Layers3 />
          </span>
          taskflow<span className="text-indigo-300">.</span>
        </div>
        <div className="relative z-10 max-w-lg">
          <span className="mb-7 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs text-indigo-200">
            A little structure. A lot more possibility.
          </span>
          <h1 className="text-5xl font-semibold leading-[1.15] tracking-tight xl:text-6xl">
            Make room for
            <br />
            <span className="text-indigo-300">your best work.</span>
          </h1>
          <p className="mt-6 max-w-sm text-base leading-7 text-slate-300">
            Your tasks, priorities, and progress. Together in one calm, private
            workspace.
          </p>
          <div className="mt-9 rotate-[-3deg] rounded-2xl border border-white/15 bg-white/5 p-6 shadow-2xl">
            <div className="flex justify-between">
              <span className="text-sm text-indigo-200">
                ONE STEP AT A TIME
              </span>
              <ArrowUpRight size={20} />
            </div>
            <p className="mt-4 text-xl">Turn plans into progress.</p>
            <div className="mt-5 flex items-center gap-3 text-sm text-slate-300">
              <span className="rounded-full bg-emerald-400/20 p-1 text-emerald-300">
                <Check size={16} />
              </span>
              Less busywork. More meaningful work.
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Designed for focus. Built for you.
        </p>
        <div className="absolute -right-40 top-40 size-[500px] rounded-full border border-white/5" />
      </section>
      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-12 flex items-center gap-2 text-xl font-bold lg:hidden">
            <Layers3 className="text-primary" />
            taskflow.
          </div>
          <div className="mb-6 inline-flex rounded-xl border bg-card p-3 text-primary">
            <LockKeyhole size={23} />
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
          <p className="mb-8 mt-2 text-muted">
            A fresh start for a productive day.
          </p>
          {configured ? (
            <AuthForm />
          ) : (
            <div role="status" className="panel space-y-3 p-5">
              <p className="font-semibold">Let’s set up your workspace</p>
              <p className="text-sm text-muted">
                Add DATABASE_URL, APP_URL, and AUTH_SECRET to .env, apply
                migrations, then run the secure admin setup script.
              </p>
              <code className="block break-all rounded bg-background p-3 text-xs">
                npm run db:migrate
                <br />
                npm run admin:setup
              </code>
              <p className="text-xs text-muted">
                See README.md for complete instructions. No public registration
                is available.
              </p>
            </div>
          )}
          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-muted">
            <LockKeyhole size={13} />
            Private access · Accounts managed by your administrator
          </p>
        </div>
      </section>
    </main>
  );
}
