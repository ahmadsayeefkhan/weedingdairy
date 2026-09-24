import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { backupVendors, reviewAverages, vendorAvailable } from "@/lib/services";
import { EVENT_META, PRICE_TIERS, VENDOR_CATEGORIES } from "@/lib/constants";
import { fmtDate, fmtShort, initials, taka } from "@/lib/format";
import { toDateInput, today } from "@/lib/today";
import { Bar, Stars } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { requestBooking, toggleShortlist } from "../actions";

export default async function VendorProfile({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ date?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const { wedding, role } = await requireWedding();
  const v = await db.vendor.findFirst({
    where: { slug, status: "APPROVED" },
    include: { packages: { orderBy: { price: "asc" } }, reviews: { where: { hidden: false }, include: { author: true, booking: { include: { wedding: true } } }, orderBy: { createdAt: "desc" } }, blocked: true },
  });
  if (!v) notFound();
  const avg = reviewAverages(v.reviews);
  const events = await db.event.findMany({ where: { weddingId: wedding.id }, orderBy: { date: "asc" } });
  const checkDate = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? new Date(`${sp.date}T00:00:00Z`) : wedding.date;
  const available = await vendorAvailable(db, v.id, checkDate);
  const backups = available ? [] : await backupVendors(db, v, checkDate);
  const shortlisted = !!(await db.shortlist.findUnique({ where: { weddingId_vendorId: { weddingId: wedding.id, vendorId: v.id } } }));
  const mine = await db.booking.findMany({ where: { weddingId: wedding.id, vendorId: v.id, status: { in: ["REQUESTED", "ACCEPTED", "COMPLETED"] } } });
  const catering = v.category === "CATERING";
  const guestCount = (await db.guest.aggregate({ where: { weddingId: wedding.id, status: { not: "DECLINED" } }, _sum: { invitedSeats: true } }))._sum.invitedSeats ?? 200;
  const canBook = can.edit(role);

  return (
    <div className="stack-lg">
      <Link href="/vendors" className="linkish row" style={{ gap: 6 }}><Icon name="back" width={16} height={16} />Marketplace</Link>
      <section className="card pad-0" style={{ overflow: "hidden" }}>
        <div style={{ height: 240, backgroundImage: `linear-gradient(transparent 40%, rgba(17,17,17,.78)), url(${v.cover})`, backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "flex-end", padding: 22, color: "#fff" }}>
          <div className="row between wrap grow" style={{ gap: 12 }}>
            <div>
              <div className="row wrap" style={{ gap: 6 }}><span className="badge accent">{VENDOR_CATEGORIES[v.category]?.name}</span><span className="badge ok"><Icon name="shield" width={11} height={11} />Verified</span>{v.featured && <span className="badge dark">Featured</span>}</div>
              <h1 style={{ fontSize: 32, fontWeight: 400, marginTop: 6 }}>{v.name}</h1>
              <div className="row small" style={{ gap: 6, opacity: 0.9 }}><Icon name="pin" width={14} height={14} />{v.area ? `${v.area}, ` : ""}{v.city}{v.capacity ? ` · up to ${v.capacity} guests` : ""}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 30 }}>★ {avg.count ? avg.overall.toFixed(1) : "New"}</div>
              <div className="small" style={{ opacity: 0.85 }}>{avg.count} verified review{avg.count === 1 ? "" : "s"}</div>
            </div>
          </div>
        </div>
      </section>

      <div className="split">
        <div className="stack-lg">
          <section className="card stack">
            <h2 style={{ fontSize: 17 }}>About</h2>
            <p className="muted">{v.about}</p>
            <div className="row wrap" style={{ gap: 6 }}>{v.tags.split(",").filter(Boolean).map((t) => <span key={t} className="badge">{t}</span>)}<span className="badge">{"৳".repeat(v.priceTier)} {PRICE_TIERS[v.priceTier]}</span></div>
          </section>

          <section className="card">
            <div className="card-title"><h2>Packages</h2>{catering && <span className="small muted">Prices per plate</span>}</div>
            <div className="list">
              {v.packages.map((p) => (
                <div key={p.id} className="row between wrap" style={{ gap: 12 }}>
                  <div className="grow"><div>{p.name}</div><div className="small muted">{p.description}</div></div>
                  <b className="num" style={{ fontSize: 18 }}>{taka(p.price)}</b>
                </div>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="card-title"><h2>Verified reviews</h2><span className="small muted">Only couples with a booking can review</span></div>
            {avg.count > 0 && (
              <div className="grid g2" style={{ marginBottom: 16 }}>
                {([["Punctuality", avg.punctuality], ["Behavior", avg.behavior], ["Quality of work", avg.quality], ["Value for money", avg.value]] as const).map(([k, val]) => (
                  <div key={k}><div className="row between small"><span>{k}</span><b className="num">{val.toFixed(1)}</b></div><Bar value={val} max={5} thin /></div>
                ))}
              </div>
            )}
            {v.reviews.length === 0 ? <p className="small muted">No reviews yet.</p> : (
              <div className="list">
                {v.reviews.map((r) => (
                  <div key={r.id} className="stack" style={{ gap: 6 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <span className="avatar">{initials(`${r.booking.wedding.brideName} ${r.booking.wedding.groomName}`)}</span>
                      <div className="grow"><div className="small">{r.booking.wedding.brideName} &amp; {r.booking.wedding.groomName}</div><div className="tiny faint">{fmtShort(r.createdAt)} · <span style={{ color: "var(--ok)" }}>Verified booking</span></div></div>
                      <Stars value={r.overall} />
                    </div>
                    <p className="small">&ldquo;{r.text}&rdquo;</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="stack-lg">
          <section className="card stack">
            <div className="row between">
              <h2 style={{ fontSize: 17 }}>Availability</h2>
              {canBook && <form action={toggleShortlist}><input type="hidden" name="vendorId" value={v.id} /><button className="chip" aria-pressed={shortlisted}><Icon name="heart" width={14} height={14} fill={shortlisted ? "currentColor" : "none"} />{shortlisted ? "Shortlisted" : "Shortlist"}</button></form>}
            </div>
            <form className="row" action={`/vendors/${v.slug}`}>
              <input className="input" type="date" name="date" defaultValue={toDateInput(checkDate)} min={toDateInput(today())} aria-label="Date to check" />
              <button className="btn quiet sm">Check</button>
            </form>
            <div className={`notice ${available ? "ok" : "bad"}`}><Icon name={available ? "check" : "alert"} />{available ? `Available on ${fmtDate(checkDate)}` : `Booked on ${fmtDate(checkDate)}`}</div>
            {mine.length > 0 && <p className="small">You have {mine.length} booking{mine.length > 1 ? "s" : ""} with {v.name}. <Link href="/bookings" className="linkish">View</Link></p>}
          </section>

          {!available && backups.length > 0 && (
            <section className="card stack">
              <div className="row" style={{ gap: 8 }}><span className="icon-chip"><Icon name="sparkle" /></span><div><h3 style={{ fontSize: 15 }}>Backup vendors</h3><div className="tiny muted">Zero Panic Policy: available, similar price</div></div></div>
              <div className="list">
                {backups.map((b) => (
                  <Link key={b.id} href={`/vendors/${b.slug}?date=${toDateInput(checkDate)}`} className="row between small">
                    <span>{b.name}<span className="faint"> · {b.area}</span></span><span>★ {b.avg.overall ? b.avg.overall.toFixed(1) : "New"} · {taka(b.startingPrice)}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {canBook ? (
            <ActionForm action={requestBooking} className="card stack">
              <h2 style={{ fontSize: 17 }}>Request a booking</h2>
              <input type="hidden" name="vendorId" value={v.id} />
              <label className="field"><span>Package</span><select className="input" name="packageId">{v.packages.map((p) => <option key={p.id} value={p.id}>{p.name} · {taka(p.price)}</option>)}</select></label>
              <label className="field"><span>For</span><select className="input" name="eventType">{events.map((e) => <option key={e.id} value={e.type}>{EVENT_META[e.type]?.name ?? e.name} · {fmtShort(e.date)}</option>)}</select></label>
              <label className="field"><span>Date</span><input className="input" type="date" name="date" defaultValue={toDateInput(checkDate)} min={toDateInput(today())} required /></label>
              {catering && <label className="field"><span>Plates</span><input className="input num" type="number" name="qty" min={20} max={5000} defaultValue={guestCount} /></label>}
              <label className="field"><span>Message</span><textarea className="input" name="note" maxLength={500} placeholder="Tell them about your event" /></label>
              <Submit pendingText="Sending…">Send request</Submit>
              <p className="tiny faint">No payment now. When {v.name} accepts, you&apos;ll get a schedule: 20% booking, 50% advance, 30% final settlement.</p>
            </ActionForm>
          ) : <div className="notice"><Icon name="lock" />Family members can browse vendors. The couple or planner can send booking requests.</div>}
        </aside>
      </div>
    </div>
  );
}
