import { redirect } from "next/navigation";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requirePageUser } from "@/lib/auth";
import { UserManager } from "@/components/user-manager";
export default async function UsersPage() {
  const user = await requirePageUser();
  if (user.role !== "admin") redirect("/");
  const accounts = await db()
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      active: users.active,
      mustChangePassword: users.mustChangePassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.username));
  return (
    <UserManager
      actorId={user.id}
      accounts={JSON.parse(JSON.stringify(accounts))}
    />
  );
}
