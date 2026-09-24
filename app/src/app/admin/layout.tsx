import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { Shell, type NavItem } from "@/components/Shell";
import { Icon } from "@/components/icons";
import { logout } from "../(auth)/actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSystemRole("ADMIN");
  const pending = await db.vendor.count({ where: { status: "PENDING" } });
  const items: NavItem[] = [
    { href: "/admin", label: "Overview", icon: "chart", group: "WeddingOS admin" },
    { href: "/admin/vendors", label: "Vendors", icon: "store", group: "WeddingOS admin", badge: pending },
    { href: "/admin/reviews", label: "Reviews", icon: "star", group: "WeddingOS admin" },
    { href: "/admin/ai", label: "AI question log", icon: "sparkle", group: "Logs" },
    { href: "/admin/outbox", label: "Message outbox", icon: "send", group: "Logs" },
  ];
  return (
    <Shell
      brandSub="ADMIN"
      items={items}
      tabs={items}
      who={<div className="who"><span className="avatar">WD</span><div className="grow"><div>{user.name}</div><small>{user.email}</small></div></div>}
      footer={<form action={logout}><button className="linkish row" style={{ gap: 6 }}><Icon name="logout" width={16} height={16} />Sign out</button></form>}
    >
      {children}
    </Shell>
  );
}
