import Link from "next/link";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { backupVendors, paymentState } from "@/lib/services";
import { EVENT_META, VENDOR_CATEGORIES, milestoneName } from "@/lib/constants";
import { fmtDate, fmtShort, taka } from "@/lib/format";
import { toDateInput } from "@/lib/today";
import { Empty, PageHead } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { cancelBooking, submitReview } from "../vendors/actions";

export const metadata = { title: "Bookings" };

const STATUS: Record<string, { label: string; tone: string }> = {
  REQUESTED: { label: "Waiting for vendor", tone: "warn" }, ACCEPTED: { label: "Confirmed", tone: "ok" }, COMPLETED: { label: "Completed", tone: "ok" },
  DECLINED: { label: "Declined", tone: "bad" }, CANCELLED: { label: "Cancelled", tone: "" },
};

function StarPick({ name, label }: { name: string; label: string }) {
  return (
    <label className="field"><span>{label}</span>
      <select className="input" name={name} defaultValue="5">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{"★".repeat(n)} {n}</option>)}</select>
    </label>
  );
}

export default async function BookingsPage() {
  const { wedding, role } = await requireWedding();
  const money = can.money(role);
  const bookings = await db.booking.findMany({
    where: { weddingId: wedding.id },
    include: { vendor: true, package: true, payments: { orderBy: { dueDate: "asc" } }, review: true },
    orderBy: [{ eventDate: "asc" }],
  });
  const order = ["REQUESTED", "ACCEPTED", "COMPLETED", "DECLINED", "CANCELLED"];
  bookings.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const declined = bookings.filter((b) => b.status === "DECLINED");
  const backups = Object.fromEntries(await Promise.all(declined.map(async (b) => [b.id, await backupVendors(db, b.vendor, b.eventDate)] as const)));

  return (
    <div className="stack-lg">
      <PageHead title="Bookings" sub="Every vendor request, confirmation and payment milestone">
        <Link href="/vendors" className="btn"><Icon name="store" />Find vendors</Link>
      </PageHead>
      {bookings.length === 0 ? <div className="card"><Empty icon="handshake" title="No bookings yet">Browse the marketplace and send your first booking request.</Empty></div> : (
        <div className="stack-lg">
          {bookings.map((b) => {
            const st = STATUS[b.status];
            const paid = b.payments.filter((p) => p.paidAt).reduce((a, p) => a + p.amount, 0);
            return (
              <section key={b.id} className="card stack">
                <div className="row wrap" style={{ gap: 14 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 12, backgroundImage: `url(${b.vendor.cover})`, backgroundSize: "cover", flex: "none" }} />
                  <div className="grow" style={{ minWidth: 180 }}>
                    <Link href={`/vendors/${b.vendor.slug}`} style={{ fontSize: 17 }}>{b.vendor.name}</Link>
                    <div className="small muted">{VENDOR_CATEGORIES[b.vendor.category]?.name} · {b.package?.name ?? "Custom"} · {EVENT_META[b.eventType]?.name}, {fmtDate(b.eventDate)}</div>
                  </div>
                  <span className={`badge ${st.tone}`}>{st.label}</span>
                  {money && <b className="num" style={{ fontSize: 18 }}>{taka(b.amount)}</b>}
                </div>
                {b.note && <p className="small muted">Your message: &ldquo;{b.note}&rdquo;</p>}
                {b.vendorNote && <p className="small">Vendor replied: &ldquo;{b.vendorNote}&rdquo;</p>}
                {money && b.payments.length > 0 && (
                  <div className="row wrap" style={{ gap: 8 }}>
                    {b.payments.map((p) => {
                      const ps = paymentState(p);
                      return <span key={p.id} className={`badge ${ps.tone}`}>{milestoneName(p.milestone)} {taka(p.amount)} · {p.paidAt ? "Paid" : `${ps.label} (${fmtShort(p.dueDate)})`}</span>;
                    })}
                    <span className="small muted">{taka(paid)} of {taka(b.amount)} paid · <Link href="/budget#payments" className="linkish">Pay</Link></span>
                  </div>
                )}
                {b.status === "DECLINED" && backups[b.id]?.length > 0 && (
                  <div className="notice"><Icon name="sparkle" /><span className="small">Backup vendors free on {fmtShort(b.eventDate)}: {backups[b.id].map((x, i) => <span key={x.id}>{i ? ", " : ""}<Link className="linkish" href={`/vendors/${x.slug}?date=${toDateInput(b.eventDate)}`}>{x.name}</Link></span>)}</span></div>
                )}
                <div className="row wrap" style={{ gap: 10 }}>
                  {role === "COUPLE" && ["REQUESTED", "ACCEPTED"].includes(b.status) && (
                    <form action={cancelBooking}><input type="hidden" name="id" value={b.id} /><button className="linkish bad">{b.status === "REQUESTED" ? "Withdraw request" : "Cancel booking"}</button></form>
                  )}
                  {b.review && <span className="small" style={{ color: "var(--ok)" }}>★ You reviewed this vendor ({b.review.overall.toFixed(1)})</span>}
                </div>
                {role === "COUPLE" && !b.review && ["ACCEPTED", "COMPLETED"].includes(b.status) && (
                  <details className="drawer">
                    <summary className="linkish">Write a verified review</summary>
                    <ActionForm action={submitReview} className="form-grid">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <StarPick name="punctuality" label="Punctuality" /><StarPick name="behavior" label="Behavior" /><StarPick name="quality" label="Quality of work" /><StarPick name="value" label="Value for money" />
                      <label className="field" style={{ gridColumn: "1 / -1" }}><span>Your experience</span><textarea className="input" name="text" required minLength={10} /></label>
                      <div><Submit>Post review</Submit></div>
                    </ActionForm>
                  </details>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
