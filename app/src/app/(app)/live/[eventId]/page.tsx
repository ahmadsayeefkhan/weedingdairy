import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { daysBetween, today } from "@/lib/today";
import { fmtClock, fmtDate, fmtTime } from "@/lib/format";
import { eventMeta, VENDOR_CATEGORIES } from "@/lib/constants";
import { Donut, Empty } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Icon } from "@/components/icons";
import { shiftItems } from "../../events/actions";
import { broadcast, checkIn, setItemStatus, setVendorReadiness } from "../actions";

export const metadata = { title: "Live Mode" };

const READY: Record<string, string> = { STANDBY: "", SETUP: "warn", READY: "coral", ACTIVE: "ok" };

export default async function LiveEvent({ params, searchParams }: { params: Promise<{ eventId: string }>; searchParams: Promise<{ q?: string }> }) {
  const { eventId } = await params;
  const { q } = await searchParams;
  const { wedding, role } = await requireWedding();
  const ev = await db.event.findFirst({ where: { id: eventId, weddingId: wedding.id }, include: { items: { orderBy: { time: "asc" } } } });
  if (!ev) notFound();
  const m = eventMeta(ev.type);
  const editable = can.edit(role);
  const now = ev.items.find((i) => i.status === "NOW");
  const next = ev.items.find((i) => i.status === "PLANNED" && (!now || i.time > now.time));
  const vendors = await db.booking.findMany({ where: { weddingId: wedding.id, status: "ACCEPTED", OR: [{ eventDate: ev.date }, { eventType: ev.type }] }, include: { vendor: true } });
  const invitedHere = await db.guest.findMany({ where: { weddingId: wedding.id, status: { not: "DECLINED" }, events: { contains: ev.type } } });
  const expected = invitedHere.reduce((a, g) => a + (g.status === "CONFIRMED" ? g.confirmedSeats : g.invitedSeats), 0);
  const arrived = invitedHere.reduce((a, g) => a + g.checkedInSeats, 0);
  const pct = expected ? Math.round((arrived / expected) * 100) : 0;
  const search = q?.trim();
  const found = search ? invitedHere.filter((g) => g.name.toLowerCase().includes(search.toLowerCase())).slice(0, 8) : [];
  const alerts = await db.liveAlert.findMany({ where: { weddingId: wedding.id }, orderBy: { createdAt: "desc" }, take: 8 });
  const photos = await db.photo.count({ where: { weddingId: wedding.id, eventId: ev.id } });
  const pendingPhotos = await db.photo.count({ where: { weddingId: wedding.id, eventId: ev.id, status: "PENDING" } });
  const isToday = daysBetween(today(), ev.date) === 0;

  return (
    <div className="stack-lg">
      <AutoRefresh seconds={15} />
      <div className="row between wrap">
        <Link href="/live" className="linkish row" style={{ gap: 6 }}><Icon name="back" width={16} height={16} />Live Mode</Link>
        <div className="row wrap" style={{ gap: 8 }}>
          <Link href={`/share/${ev.shareCode}`} target="_blank" className="btn quiet sm"><Icon name="qr" />Guest upload page</Link>
          <Link href={`/tv/${ev.shareCode}`} target="_blank" className="btn quiet sm"><Icon name="tv" />TV slideshow</Link>
        </div>
      </div>

      <section className="hero" style={{ background: `radial-gradient(120% 140% at 100% 0%, ${m.color}cc, ${m.color} 60%)` }}>
        <div className="row between wrap" style={{ position: "relative", zIndex: 1, gap: 16 }}>
          <div className="stack" style={{ gap: 4 }}>
            <span className={`badge ${isToday ? "live" : "dark"}`} style={{ width: "fit-content" }}>{isToday ? "Live mode" : "Rehearsal"}</span>
            <h1 style={{ fontSize: 30, fontWeight: 400 }}>{ev.name}</h1>
            <div className="small" style={{ opacity: 0.9 }}>{fmtDate(ev.date)}{ev.venue ? ` · ${ev.venue}` : ""}</div>
          </div>
          <div className="grid g2" style={{ gap: 12, minWidth: 280, flex: "1 1 360px", maxWidth: 560 }}>
            <div style={{ background: "rgba(255,255,255,.16)", borderRadius: 14, padding: 14 }}>
              <div className="eyebrow">Happening now</div>
              <div style={{ fontSize: 19, marginTop: 4 }}>{now ? now.title : "Nothing started yet"}</div>
              {now && <div className="small" style={{ opacity: 0.85 }}>{fmtTime(now.time)}{now.location ? ` · ${now.location}` : ""}</div>}
            </div>
            <div style={{ background: "rgba(255,255,255,.1)", borderRadius: 14, padding: 14 }}>
              <div className="eyebrow">Up next</div>
              <div style={{ fontSize: 19, marginTop: 4 }}>{next ? next.title : "All done"}</div>
              {next && <div className="small" style={{ opacity: 0.85 }}>{fmtTime(next.time)}{next.location ? ` · ${next.location}` : ""}</div>}
            </div>
          </div>
        </div>
      </section>

      <div className="split">
        <section className="card">
          <div className="card-title"><h2>Event timeline</h2><span className="badge ok">Live sync</span></div>
          {ev.items.length === 0 ? <Empty icon="clock" title="No timeline for this event">Add items on the event page first.</Empty> : (
            <div className="tl" style={{ ["--ev" as string]: m.color }}>
              {ev.items.map((i) => (
                <div key={i.id} className={`tl-item ${i.status === "DONE" ? "done" : i.status === "NOW" ? "now" : ""}`}>
                  <div className="tl-time">{fmtTime(i.time)}</div>
                  <div className="tl-dot" />
                  <div className="tl-body row between wrap" style={{ gap: 8 }}>
                    <div><div>{i.title} {i.status === "NOW" && <span className="badge live">Now</span>}</div>{(i.location || i.note) && <div className="tiny muted">{[i.location, i.note].filter(Boolean).join(" · ")}</div>}</div>
                    {editable && (
                      <form action={setItemStatus} className="row" style={{ gap: 4 }}>
                        <input type="hidden" name="id" value={i.id} />
                        {i.status !== "NOW" && i.status !== "DONE" && <button name="status" value="NOW" className="btn sm">Start</button>}
                        {i.status === "NOW" && <button name="status" value="DONE" className="btn ghost sm">Done</button>}
                        {i.status === "DONE" && <button name="status" value="PLANNED" className="linkish tiny">Undo</button>}
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {editable && (
            <ActionForm action={shiftItems} className="row wrap mt" >
              <input type="hidden" name="eventId" value={ev.id} />
              <span className="small muted grow">Running late? Move every upcoming item and notify the team:</span>
              <Submit name="minutes" value="15" className="btn quiet sm">+15 min</Submit>
              <Submit name="minutes" value="30" className="btn quiet sm">+30 min</Submit>
              <Submit name="minutes" value="-15" className="btn quiet sm">−15 min</Submit>
            </ActionForm>
          )}
        </section>

        <div className="stack-lg">
          <section className="card">
            <div className="card-title"><h3>Guest check-in</h3><span className="small muted">{arrived} of {expected}</span></div>
            <div className="row" style={{ gap: 16 }}>
              <Donut size={110} stroke={12} segments={[{ label: "Checked in", value: arrived, color: m.color }, { label: "Not yet", value: Math.max(0, expected - arrived), color: "transparent" }]} center={<div><div className="num" style={{ fontSize: 22 }}>{pct}%</div><div className="tiny muted">checked in</div></div>} />
              <form className="grow stack" action={`/live/${ev.id}`}>
                <input className="input" name="q" defaultValue={search} placeholder="Find a guest…" aria-label="Find a guest to check in" />
                <button className="btn quiet sm">Search</button>
              </form>
            </div>
            {search && (
              <div className="list mt">
                {found.length === 0 && <p className="small muted">No invited guest matches &ldquo;{search}&rdquo;.</p>}
                {found.map((g) => (
                  <div key={g.id} className="row wrap small" style={{ gap: 8 }}>
                    <span className="grow">{g.name} <span className="faint">· {g.status === "CONFIRMED" ? g.confirmedSeats : g.invitedSeats} expected</span></span>
                    {g.checkedInSeats > 0 && <span className="badge ok">In · {g.checkedInSeats}</span>}
                    {editable && (
                      <ActionForm action={checkIn} className="row" showOk={false}>
                        <input type="hidden" name="guestId" value={g.id} />
                        <select className="input" name="seats" defaultValue={g.checkedInSeats || (g.status === "CONFIRMED" ? g.confirmedSeats : g.invitedSeats)} style={{ width: 64, padding: "4px 6px" }} aria-label={`Seats arriving for ${g.name}`}>
                          {Array.from({ length: Math.max(g.invitedSeats, g.confirmedSeats) + 1 }, (_, n) => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <Submit className="btn sm">{g.checkedInSeats ? "Update" : "Check in"}</Submit>
                      </ActionForm>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-title"><h3>Vendor status</h3></div>
            {vendors.length === 0 ? <p className="small muted">No confirmed vendors for this event.</p> : (
              <div className="list">
                {vendors.map((b) => (
                  <div key={b.id} className="row between wrap small" style={{ gap: 6 }}>
                    <span><b style={{ fontWeight: 500 }}>{VENDOR_CATEGORIES[b.vendor.category]?.name}</b> <span className="muted">· {b.vendor.name}</span></span>
                    {editable ? (
                      <form action={setVendorReadiness} className="row" style={{ gap: 4 }}>
                        <input type="hidden" name="id" value={b.id} />
                        <select className="input" name="readiness" defaultValue={b.readiness} style={{ padding: "3px 6px", fontSize: 12, width: "auto" }} aria-label={`Status for ${b.vendor.name}`}>
                          {["STANDBY", "SETUP", "READY", "ACTIVE"].map((r) => <option key={r}>{r}</option>)}
                        </select>
                        <button className="linkish tiny">Set</button>
                      </form>
                    ) : null}
                    <span className={`badge ${READY[b.readiness]}`}>{b.readiness}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card dark">
            <div className="card-title"><h3>Live alerts</h3><span className="small muted">{photos} photos{pendingPhotos ? ` · ${pendingPhotos} to review` : ""}</span></div>
            {editable && (
              <ActionForm action={broadcast} className="stack" reset>
                <textarea className="input" name="message" placeholder="Message the whole team and your vendors…" style={{ minHeight: 60, background: "#fff" }} required />
                <div className="row">
                  <Submit name="kind" value="BROADCAST" className="btn sm"><Icon name="send" />Broadcast</Submit>
                  <Submit name="kind" value="SOS" className="btn danger sm"><Icon name="sos" />SOS</Submit>
                </div>
              </ActionForm>
            )}
            <div className="list mt">
              {alerts.map((a) => (
                <div key={a.id} className="small" style={{ borderColor: "var(--navy-2)" }}>
                  <div className="row" style={{ gap: 6 }}>{a.kind === "SOS" && <span className="badge live">SOS</span>}{a.message}</div>
                  <div className="tiny muted">{a.byName} · {fmtClock(a.createdAt)}</div>
                </div>
              ))}
              {alerts.length === 0 && <p className="small muted">No alerts yet.</p>}
            </div>
            {pendingPhotos > 0 && <Link href={`/vault?event=${ev.id}&tab=review`} className="btn quiet sm mt">Review {pendingPhotos} guest photos</Link>}
          </section>
        </div>
      </div>
    </div>
  );
}
