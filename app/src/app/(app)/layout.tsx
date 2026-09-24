import { db } from "@/lib/db";
import { requireWedding } from "@/lib/wedding";
import { getDict } from "@/lib/i18n";
import { Shell, type NavItem } from "@/components/Shell";
import { logout, setLocale } from "../(auth)/actions";
import { Icon } from "@/components/icons";
import { initials } from "@/lib/format";

const ROLE_LABEL: Record<string, string> = { COUPLE: "Couple · Admin", PLANNER: "Planner · Editor", FAMILY: "Family · Viewer" };

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, wedding, role } = await requireWedding();
  const { t, locale } = await getDict();
  const unread = await db.notification.count({ where: { userId: user.id, read: false } });

  const items: NavItem[] = [
    { href: "/dashboard", label: t.dashboard, icon: "home", group: t.plan },
    { href: "/events", label: t.events, icon: "calendar", group: t.plan },
    { href: "/checklist", label: t.checklist, icon: "checklist", group: t.plan },
    ...(role === "COUPLE" ? [{ href: "/budget", label: t.budget, icon: "wallet", group: t.plan } as NavItem] : []),
    { href: "/guests", label: t.guests, icon: "users", group: t.people },
    { href: "/seating", label: t.seating, icon: "seat", group: t.people },
    ...(role !== "FAMILY" ? [{ href: "/invitations", label: t.invitations, icon: "mail", group: t.people } as NavItem] : []),
    ...(role === "COUPLE" ? [{ href: "/team", label: t.team, icon: "team", group: t.people } as NavItem] : []),
    { href: "/vendors", label: t.vendors, icon: "store", group: t.vendors },
    { href: "/bookings", label: t.bookings, icon: "handshake", group: t.vendors },
    { href: "/live", label: t.live, icon: "live", group: t.memories },
    { href: "/vault", label: t.vault, icon: "image", group: t.memories },
    { href: "/assistant", label: t.assistant, icon: "sparkle", group: "WeddingOS.ai" },
    { href: "/notifications", label: t.notifications, icon: "bell", group: "WeddingOS.ai", badge: unread },
    ...(role === "COUPLE" ? [{ href: "/settings", label: t.settings, icon: "settings", group: "WeddingOS.ai" } as NavItem] : []),
  ];
  const tabs: NavItem[] = [
    { href: "/dashboard", label: t.dashboard, icon: "home" },
    { href: "/events", label: t.events, icon: "calendar" },
    { href: "/guests", label: t.guests, icon: "users" },
    { href: "/vendors", label: t.vendors, icon: "store" },
    { href: "/more", label: t.more, icon: "menu" },
  ];

  return (
    <Shell
      items={items}
      tabs={tabs}
      who={
        <div className="who">
          <span className="avatar">{initials(user.name)}</span>
          <div className="grow"><div className="ellipsis">{user.name}</div><small>{ROLE_LABEL[role]} · {wedding.brideName} &amp; {wedding.groomName}</small></div>
        </div>
      }
      footer={
        <div className="row between">
          <form action={setLocale} className="row" style={{ gap: 4 }}>
            <input type="hidden" name="back" value="/dashboard" />
            <button name="lang" value="en" className={`chip${locale === "en" ? " on" : ""}`} style={{ padding: "3px 10px" }}>EN</button>
            <button name="lang" value="bn" className={`chip bn${locale === "bn" ? " on" : ""}`} style={{ padding: "3px 10px" }}>বাং</button>
          </form>
          <form action={logout}><button className="linkish row" style={{ gap: 6 }}><Icon name="logout" width={16} height={16} />{t.signOut}</button></form>
        </div>
      }
    >
      {children}
    </Shell>
  );
}
