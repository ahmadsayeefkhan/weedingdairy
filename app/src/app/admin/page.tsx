import Link from "next/link";
import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { fmtShort, taka, takaShort } from "@/lib/format";
import { VENDOR_CATEGORIES } from "@/lib/constants";
import { PageHead, Stat } from "@/components/ui";

export const metadata = { title: "Admin" };

export default async function AdminHome() {
  await requireSystemRole("ADMIN");
  const [weddings, users, approved, pending, bookings, accepted, photos, aiQs, activity] = await Promise.all([
    db.wedding.count(), db.user.count({ where: { role: "USER" } }),
    db.vendor.count({ where: { status: "APPROVED" } }), db.vendor.count({ where: { status: "PENDING" } }),
    db.booking.count(), db.booking.findMany({ where: { status: { in: ["ACCEPTED", "COMPLETED"] } }, include: { vendor: true } }),
    db.photo.count(), db.aiLog.count(),
    db.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 12, include: { user: true } }),
  ]);
  const gmv = accepted.reduce((a, b) => a + b.amount, 0);
  const byCat = Object.entries(accepted.reduce<Record<string, number>>((acc, b) => ({ ...acc, [b.vendor.category]: (acc[b.vendor.category] ?? 0) + b.amount }), {})).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...byCat.map((c) => c[1]));
  return (
    <div className="stack-lg">
      <PageHead title="WeddingOS admin" sub="Platform health across couples, vendors and bookings" />
      <section className="grid g4">
        <Stat icon="heart" label="Weddings managed" value={weddings} hint={`${users} couple & family accounts`} />
        <Stat icon="store" label="Active vendors" value={approved} hint={<Link className="linkish" href="/admin/vendors">{pending} waiting for approval</Link>} />
        <Stat icon="handshake" label="Bookings" value={bookings} hint={`${accepted.length} confirmed`} />
        <Stat icon="wallet" label="Booking value (GMV)" value={takaShort(gmv)} hint={taka(gmv)} />
      </section>
      <div className="split">
        <section className="card">
          <div className="card-title"><h2>Confirmed booking value by category</h2></div>
          <div className="stack">
            {byCat.map(([k, v]) => (
              <div key={k}><div className="row between small"><span>{VENDOR_CATEGORIES[k]?.name ?? k}</span><b className="num">{taka(v)}</b></div><div className="bar thin"><i style={{ width: `${(v / max) * 100}%` }} /></div></div>
            ))}
          </div>
        </section>
        <section className="card dark stack">
          <div className="eyebrow" style={{ color: "#b9b3c2" }}>AI engine</div>
          <div className="row between"><span>Questions answered</span><b className="num">{aiQs}</b></div>
          <div className="row between"><span>Photos in vaults</span><b className="num">{photos}</b></div>
          <Link href="/admin/ai" className="btn quiet sm" style={{ width: "fit-content" }}>Open AI log</Link>
        </section>
      </div>
      <section className="card">
        <div className="card-title"><h2>Live activity</h2></div>
        <div className="list">
          {activity.map((a) => (
            <div key={a.id} className="row between small"><span><b style={{ fontWeight: 500 }}>{a.action}</b> <span className="muted">{a.detail}</span></span><span className="faint">{a.user?.name ?? "Guest"} · {fmtShort(a.createdAt)}</span></div>
          ))}
        </div>
      </section>
    </div>
  );
}
