import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { daysBetween, today } from "@/lib/today";
import { fmtDate, fmtShort, taka } from "@/lib/format";
import { EVENT_META, milestoneName } from "@/lib/constants";
import { Empty, PageHead } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { completeBooking, respondBooking, setReadiness } from "../actions";

export const metadata = { title: "Bookings · VendorOS" };

export default async function VendorBookings() {
  const user = await requireSystemRole("VENDOR");
  const v = await db.vendor.findUnique({ where: { ownerId: user.id } });
  if (!v) redirect("/vendor/profile");
  const t0 = today();
  const bookings = await db.booking.findMany({ where: { vendorId: v.id }, include: { wedding: true, package: true, payments: { orderBy: { dueDate: "asc" } } }, orderBy: { eventDate: "asc" } });
  const groups: [string, typeof bookings][] = [
    ["New requests", bookings.filter((b) => b.status === "REQUESTED")],
    ["Confirmed", bookings.filter((b) => b.status === "ACCEPTED")],
    ["Past", bookings.filter((b) => ["COMPLETED", "DECLINED", "CANCELLED"].includes(b.status))],
  ];
  return (
    <div className="stack-lg">
      <PageHead title="Bookings" sub="Accept requests, track payments, and update your wedding-day status" />
      {groups.map(([title, list]) => (
        <section key={title} className="card">
          <div className="card-title"><h2>{title}</h2><span className="badge">{list.length}</span></div>
          {list.length === 0 ? <Empty icon="handshake" title={title === "New requests" ? "No new requests" : "Nothing here yet"} /> : (
            <div className="list">
              {list.map((b) => {
                const paid = b.payments.filter((p) => p.paidAt).reduce((a, p) => a + p.amount, 0);
                const d = daysBetween(t0, b.eventDate);
                return (
                  <div key={b.id} className="stack">
                    <div className="row between wrap" style={{ gap: 10 }}>
                      <div>
                        <div><b style={{ fontWeight: 500 }}>{b.wedding.brideName} &amp; {b.wedding.groomName}</b> · {EVENT_META[b.eventType]?.name}</div>
                        <div className="small muted">{[`${fmtDate(b.eventDate)} (${d === 0 ? "today" : d > 0 ? `in ${d} days` : `${-d} days ago`})`, b.package?.name, b.wedding.city].filter(Boolean).join(" · ")}</div>
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <b className="num">{taka(b.amount)}</b>
                        <span className={`badge ${b.status === "ACCEPTED" || b.status === "COMPLETED" ? "ok" : b.status === "REQUESTED" ? "warn" : b.status === "DECLINED" ? "bad" : ""}`}>{b.status}</span>
                      </div>
                    </div>
                    {b.note && <p className="small">&ldquo;{b.note}&rdquo;</p>}
                    {b.status === "REQUESTED" && (
                      <ActionForm action={respondBooking} className="row wrap">
                        <input type="hidden" name="id" value={b.id} />
                        <input className="input grow" name="note" placeholder="Optional reply to the couple" style={{ minWidth: 200 }} />
                        <Submit name="decision" value="accept" className="btn sm">Accept</Submit>
                        <Submit name="decision" value="decline" className="btn quiet sm">Decline</Submit>
                      </ActionForm>
                    )}
                    {b.status === "ACCEPTED" && (
                      <div className="row wrap" style={{ gap: 8 }}>
                        {b.payments.map((p) => <span key={p.id} className={`badge ${p.paidAt ? "ok" : ""}`}>{milestoneName(p.milestone)} {taka(p.amount)} · {p.paidAt ? "received" : `due ${fmtShort(p.dueDate)}`}</span>)}
                        <span className="small muted">{taka(paid)} received</span>
                      </div>
                    )}
                    {b.status === "ACCEPTED" && d <= 1 && d >= -1 && (
                      <form action={setReadiness} className="row wrap" style={{ gap: 6 }}>
                        <input type="hidden" name="id" value={b.id} />
                        <span className="small muted">Wedding-day status:</span>
                        {["STANDBY", "SETUP", "READY", "ACTIVE"].map((r) => <button key={r} name="readiness" value={r} className={`chip${b.readiness === r ? " on" : ""}`} style={{ padding: "3px 10px" }}>{r}</button>)}
                      </form>
                    )}
                    {b.status === "ACCEPTED" && d < 0 && (
                      <form action={completeBooking}><input type="hidden" name="id" value={b.id} /><button className="btn ghost sm">Mark as completed</button></form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
