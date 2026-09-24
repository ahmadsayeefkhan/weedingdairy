import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { reviewAverages } from "@/lib/services";
import { addDays, daysBetween, today } from "@/lib/today";
import { fmtDate, taka, takaShort } from "@/lib/format";
import { EVENT_META } from "@/lib/constants";
import { Empty, PageHead, Stat } from "@/components/ui";

export const metadata = { title: "VendorOS" };

export default async function VendorDashboard() {
  const user = await requireSystemRole("VENDOR");
  const v = await db.vendor.findUnique({ where: { ownerId: user.id }, include: { reviews: true } });
  if (!v) redirect("/vendor/profile");
  const t0 = today();
  const bookings = await db.booking.findMany({ where: { vendorId: v.id }, include: { wedding: true, package: true, payments: true }, orderBy: { eventDate: "asc" } });
  const active = bookings.filter((b) => b.status === "ACCEPTED");
  const requests = bookings.filter((b) => b.status === "REQUESTED");
  const avg = reviewAverages(v.reviews);
  const received = bookings.flatMap((b) => b.payments).filter((p) => p.paidAt);
  const monthRevenue = received.filter((p) => p.paidAt! >= addDays(t0, -30)).reduce((a, p) => a + p.amount, 0);
  const nextPayout = bookings.flatMap((b) => b.payments).filter((p) => !p.paidAt && isAccepted(bookings, p.bookingId)).sort((a, b) => +a.dueDate - +b.dueDate)[0];
  // Booking trend: accepted/completed bookings by event month, next 6 months
  const months = Array.from({ length: 6 }, (_, i) => new Date(Date.UTC(t0.getUTCFullYear(), t0.getUTCMonth() + i, 1)));
  const trend = months.map((m) => ({ m, n: bookings.filter((b) => ["ACCEPTED", "COMPLETED", "REQUESTED"].includes(b.status) && b.eventDate.getUTCFullYear() === m.getUTCFullYear() && b.eventDate.getUTCMonth() === m.getUTCMonth()).length }));
  const max = Math.max(1, ...trend.map((t) => t.n));
  const upcoming = active.filter((b) => daysBetween(t0, b.eventDate) >= 0).slice(0, 5);

  return (
    <div className="stack-lg">
      <PageHead title={`${v.name}`} sub="VendorOS: your bookings, revenue and reputation in one place" />
      <section className="grid g4">
        <Stat icon="wallet" label="Received (30 days)" value={takaShort(monthRevenue)} hint={`${taka(received.reduce((a, p) => a + p.amount, 0))} all time`} />
        <Stat icon="handshake" label="Active bookings" value={active.length} hint={`${upcoming.filter((b) => daysBetween(t0, b.eventDate) <= 7).length} this week`} href="/vendor/bookings" />
        <Stat icon="clock" label="New requests" value={requests.length} hint={requests.length ? "Reply within 48 hours" : "All answered"} href="/vendor/bookings" />
        <Stat icon="star" label="Rating" value={avg.count ? avg.overall.toFixed(1) : "–"} hint={`${avg.count} verified reviews`} href="/vendor/reviews" />
      </section>
      <div className="split">
        <section className="card">
          <div className="card-title"><h2>Booking trends</h2><span className="small muted">by event month</span></div>
          <div className="row" style={{ alignItems: "flex-end", gap: 14, height: 180, padding: "10px 4px 0" }}>
            {trend.map((t) => (
              <div key={t.m.toISOString()} className="grow" style={{ display: "grid", justifyItems: "center", gap: 6 }}>
                <span className="small num">{t.n}</span>
                <div style={{ width: "100%", maxWidth: 46, height: `${(t.n / max) * 120 + 4}px`, background: "linear-gradient(var(--coral-2), var(--coral))", borderRadius: "8px 8px 3px 3px" }} />
                <span className="tiny muted">{t.m.toLocaleString("en", { month: "short", timeZone: "UTC" })}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="card dark stack">
          <div className="eyebrow" style={{ color: "#b9b3c2" }}>Next payout</div>
          {nextPayout ? (<><div className="num" style={{ fontSize: 34 }}>{taka(nextPayout.amount)}</div><div className="muted small">Due from the couple on {fmtDate(nextPayout.dueDate)}</div></>) : <div className="muted">No payments due yet.</div>}
          <div className="tiny muted">Payments are simulated in this demo; real payouts arrive with the payment gateway in Phase 2.</div>
        </section>
      </div>
      <section className="card">
        <div className="card-title"><h2>Upcoming weddings</h2><Link href="/vendor/bookings">All bookings</Link></div>
        {upcoming.length === 0 ? <Empty icon="calendar" title="No confirmed weddings yet">Accept a request to see it here.</Empty> : (
          <div className="list">
            {upcoming.map((b) => (
              <div key={b.id} className="row between wrap small">
                <span><b style={{ fontWeight: 500 }}>{b.wedding.brideName} &amp; {b.wedding.groomName}</b> <span className="muted">· {EVENT_META[b.eventType]?.name} · {b.package?.name}</span></span>
                <span className="row" style={{ gap: 8 }}><span className="muted">{fmtDate(b.eventDate)}</span><span className="badge ok">Confirmed</span></span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function isAccepted(bookings: { id: string; status: string }[], id: string) {
  return bookings.find((b) => b.id === id)?.status === "ACCEPTED";
}
