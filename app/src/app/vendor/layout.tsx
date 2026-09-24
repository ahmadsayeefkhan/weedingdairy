import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { Shell, type NavItem } from "@/components/Shell";
import { Icon } from "@/components/icons";
import { initials } from "@/lib/format";
import { logout } from "../(auth)/actions";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSystemRole("VENDOR");
  const v = await db.vendor.findUnique({ where: { ownerId: user.id } });
  const pending = v ? await db.booking.count({ where: { vendorId: v.id, status: "REQUESTED" } }) : 0;
  const unread = await db.notification.count({ where: { userId: user.id, read: false } });
  const items: NavItem[] = [
    { href: "/vendor", label: "Dashboard", icon: "chart", group: "VendorOS" },
    { href: "/vendor/bookings", label: "Bookings", icon: "handshake", group: "VendorOS", badge: pending },
    { href: "/vendor/profile", label: "Profile & packages", icon: "store", group: "VendorOS" },
    { href: "/vendor/reviews", label: "Reviews", icon: "star", group: "VendorOS" },
    { href: "/vendor/notifications", label: "Notifications", icon: "bell", group: "VendorOS", badge: unread },
  ];
  return (
    <Shell
      brandSub="VENDOR OS"
      items={items}
      tabs={items.slice(0, 4).concat({ href: "/vendor/notifications", label: "Alerts", icon: "bell" })}
      who={<div className="who"><span className="avatar">{initials(v?.name ?? user.name)}</span><div className="grow"><div className="ellipsis">{v?.name ?? user.name}</div><small>{user.name}</small></div></div>}
      footer={<form action={logout}><button className="linkish row" style={{ gap: 6 }}><Icon name="logout" width={16} height={16} />Sign out</button></form>}
    >
      {v?.status === "PENDING" && <div className="notice warn" style={{ marginBottom: 16 }}><Icon name="clock" />Your listing is under review. Complete your profile and packages; couples will see you once the Wedding Diary team approves it.</div>}
      {v?.status === "SUSPENDED" && <div className="notice bad" style={{ marginBottom: 16 }}><Icon name="alert" />Your listing is suspended and hidden from couples. Contact hello@weddingdiary.bd.</div>}
      {children}
    </Shell>
  );
}
