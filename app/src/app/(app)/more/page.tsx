import Link from "next/link";
import { requireWedding } from "@/lib/wedding";
import { getDict } from "@/lib/i18n";
import { Icon, type IconName } from "@/components/icons";
import { PageHead } from "@/components/ui";
import { logout, setLocale } from "../../(auth)/actions";

export const metadata = { title: "More" };

export default async function MorePage() {
  const { role } = await requireWedding();
  const { t, locale } = await getDict();
  const links: [string, string, IconName, boolean][] = [
    ["/checklist", t.checklist, "checklist", true],
    ["/budget", t.budget, "wallet", role === "COUPLE"],
    ["/seating", t.seating, "seat", true],
    ["/invitations", t.invitations, "mail", role !== "FAMILY"],
    ["/bookings", t.bookings, "handshake", true],
    ["/live", t.live, "live", true],
    ["/vault", t.vault, "image", true],
    ["/assistant", t.assistant, "sparkle", true],
    ["/team", t.team, "team", role === "COUPLE"],
    ["/notifications", t.notifications, "bell", true],
    ["/settings", t.settings, "settings", role === "COUPLE"],
  ];
  return (
    <div className="stack-lg">
      <PageHead title={t.more} />
      <div className="grid g3">
        {links.filter((l) => l[3]).map(([href, label, icon]) => (
          <Link key={href} href={href} className="card row" style={{ gap: 12 }}><span className="icon-chip"><Icon name={icon} /></span>{label}</Link>
        ))}
      </div>
      <div className="card row between wrap">
        <form action={setLocale} className="row" style={{ gap: 6 }}>
          <input type="hidden" name="back" value="/more" />
          <span className="small muted">{t.language}</span>
          <button name="lang" value="en" className={`chip${locale === "en" ? " on" : ""}`}>English</button>
          <button name="lang" value="bn" className={`chip bn${locale === "bn" ? " on" : ""}`}>বাংলা</button>
        </form>
        <form action={logout}><button className="btn quiet"><Icon name="logout" />{t.signOut}</button></form>
      </div>
    </div>
  );
}
