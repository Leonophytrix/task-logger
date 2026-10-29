import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AuthForm } from "@/components/auth-form";
import { LogoutButton } from "@/components/logout-button";
export const dynamic = "force-dynamic";
export default async function ChangePassword() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <main id="main" className="flex min-h-dvh items-center justify-center p-4">
      <section className="panel w-full max-w-md p-6 sm:p-9">
        <h1 className="text-2xl font-bold">Make this workspace yours</h1>
        <p className="mb-7 mt-2 text-muted">
          Replace your temporary password before continuing.
        </p>
        <AuthForm change />
        <div className="mt-4">
          <LogoutButton />
        </div>
      </section>
    </main>
  );
}
