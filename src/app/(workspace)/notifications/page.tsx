import { requirePageUser } from "@/lib/auth";
import { NotificationCenter } from "@/components/notification-center";
export default async function NotificationsPage() {
  await requirePageUser();
  return <NotificationCenter />;
}
