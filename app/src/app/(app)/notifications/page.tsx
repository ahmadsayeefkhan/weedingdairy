import { requireWedding } from "@/lib/wedding";
import { NotificationsView } from "@/components/NotificationsView";

export const metadata = { title: "Notifications" };

export default async function Page() {
  const { user } = await requireWedding();
  return <NotificationsView userId={user.id} />;
}
