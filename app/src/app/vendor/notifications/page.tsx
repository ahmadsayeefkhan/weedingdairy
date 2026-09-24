import { requireSystemRole } from "@/lib/auth";
import { NotificationsView } from "@/components/NotificationsView";

export const metadata = { title: "Notifications" };

export default async function Page() {
  const u = await requireSystemRole("VENDOR");
  return <NotificationsView userId={u.id} />;
}
