import Link from "next/link";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { guestSummary } from "@/lib/services";
import { fmtPhone, initials } from "@/lib/format";
import { DIET_TAGS, EVENT_META, eventMeta } from "@/lib/constants";
import { Empty, PageHead, Stat } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { addGuest, deleteGuest, sendInvite, updateGuest } from "./actions";

export const metadata = { title: "Guests" };

type G = Awaited<ReturnType<typeof db.guest.findFirst>>;

function GuestFields({ g, events }: { g?: NonNullable<G>; events: string[] }) {
  const evs = (g?.events ?? events.join(",")).split(",");
  const diet = (g?.diet ?? "").split(",");
  return (
    <>
      <label className="field"><span>Name or family</span><input className="input" name="name" defaultValue={g?.name} required placeholder="e.g. Ahmed family" /></label>
      <label className="field"><span>Mobile</span><input className="input" name="phone" defaultValue={g?.phone ?? ""} inputMode="tel" placeholder="01711 234567" /></label>
      <label className="field"><span>Email</span><input className="input" name="email" type="email" defaultValue={g?.email ?? ""} /></label>
      <label className="field"><span>Side</span><select className="input" name="side" defaultValue={g?.side ?? "BRIDE"}><option value="BRIDE">Bride&apos;s side</option><option value="GROOM">Groom&apos;s side</option></select></label>
      <label className="field"><span>Relation</span><input className="input" name="relation" defaultValue={g?.relation ?? ""} placeholder="Uncle, colleague, friend…" /></label>
      <label className="field"><span>Seats invited</span><input className="input" type="number" name="seats" min={1} max={20} defaultValue={g?.invitedSeats ?? 1} /></label>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0, gridColumn: "1 / -1" }}>
        <span>Invited to</span>
        <div className="chips">{events.map((e) => <label key={e} className="chip" style={{ position: "relative" }}><input type="checkbox" name="events" value={e} defaultChecked={evs.includes(e)} />{EVENT_META[e]?.name ?? e}</label>)}</div>
      </fieldset>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0, gridColumn: "1 / -1" }}>
        <span>Dietary needs</span>
        <div className="chips">{Object.entries(DIET_TAGS).map(([k, v]) => <label key={k} className="chip" style={{ position: "relative" }}><input type="checkbox" name="diet" value={k} defaultChecked={diet.includes(k)} />{v}</label>)}</div>
      </fieldset>
    </>
  );
}

const STATUS_TONE: Record<string, string> = { CONFIRMED: "ok", PENDING: "warn", DECLINED: "bad" };

export default async function GuestsPage({ searchParams }: { searchParams: Promise<{ q?: string; side?: string; status?: string; event?: string }> }) {
  const sp = await searchParams;
  const { wedding, role } = await requireWedding();
  const editable = can.edit(role);
  const s = await guestSummary(db, wedding.id);
  const weddingEvents = (await db.event.findMany({ where: { weddingId: wedding.id }, orderBy: { date: "asc" } })).map((e) => e.type).filter((t, i, a) => a.indexOf(t) === i);
  const q = (sp.q ?? "").trim();
  const guests = await db.guest.findMany({
    where: {
      weddingId: wedding.id,
      ...(q ? { OR: [{ name: { contains: q } }, { relation: { contains: q } }, ...(editable ? [{ phone: { contains: q.replace(/^0/, "") } }] : [])] } : {}),
      ...(sp.side === "BRIDE" || sp.side === "GROOM" ? { side: sp.side } : {}),
      ...(sp.status && STATUS_TONE[sp.status] ? { status: sp.status } : {}),
      ...(sp.event && EVENT_META[sp.event] ? { events: { contains: sp.event } } : {}),
    },
    include: { table: true },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
  const link = (o: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(sp.side ? { side: sp.side } : {}), ...(sp.status ? { status: sp.status } : {}), ...(sp.event ? { event: sp.event } : {}), ...o });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    return `/guests?${p.toString()}`;
  };

  return (
    <div className="stack-lg">
      <PageHead title="Guest list & RSVP" sub="Seamlessly manage invitations for both families">
        {editable && <a className="btn quiet" href="/api/guests.csv"><Icon name="download" />Export CSV</a>}
      </PageHead>

      <section className="grid g4">
        <Stat icon="users" label="Total guests" value={s.invited} hint={`${s.parties} invitations · ${s.bride} bride / ${s.groom} groom`} href={link({ status: "" })} />
        <Stat icon="check" label="Confirmed" value={s.confirmed} hint="seats confirmed" href={link({ status: "CONFIRMED" })} />
        <Stat icon="clock" label="Pending" value={s.pending} hint={`${s.pendingParties} invitations waiting`} href={link({ status: "PENDING" })} />
        <Stat icon="x" label="Declined" value={s.declined} hint="seats declined" href={link({ status: "DECLINED" })} />
      </section>

      <section className="card">
        <form className="row wrap" style={{ gap: 8 }} action="/guests">
          <div className="grow" style={{ minWidth: 200 }}><input className="input" name="q" defaultValue={q} placeholder="Search name or relation…" aria-label="Search guests" /></div>
          <select className="input" name="side" defaultValue={sp.side ?? ""} style={{ width: "auto" }} aria-label="Side"><option value="">Both sides</option><option value="BRIDE">Bride&apos;s side</option><option value="GROOM">Groom&apos;s side</option></select>
          <select className="input" name="event" defaultValue={sp.event ?? ""} style={{ width: "auto" }} aria-label="Event"><option value="">All events</option>{weddingEvents.map((e) => <option key={e} value={e}>{EVENT_META[e].name}</option>)}</select>
          <select className="input" name="status" defaultValue={sp.status ?? ""} style={{ width: "auto" }} aria-label="Status"><option value="">Any status</option><option value="CONFIRMED">Confirmed</option><option value="PENDING">Pending</option><option value="DECLINED">Declined</option></select>
          <button className="btn quiet"><Icon name="filter" />Filter</button>
          {(q || sp.side || sp.status || sp.event) && <Link href="/guests" className="linkish">Clear</Link>}
        </form>
      </section>

      {editable && (
        <div className="row wrap" style={{ gap: 10 }}>
          <details className="card drawer grow">
            <summary className="row"><span className="icon-chip"><Icon name="plus" /></span><b>Add guest</b></summary>
            <ActionForm action={addGuest} className="form-grid" reset>
              <GuestFields events={weddingEvents} />
              <div style={{ alignSelf: "end" }}><Submit>Add guest</Submit></div>
            </ActionForm>
          </details>
          <ActionForm action={sendInvite} className="card" >
            <div className="row wrap" style={{ gap: 10 }}>
              <span className="small muted">Send the RSVP link to the {s.pendingParties} invitations still pending</span>
              <Submit className="btn ghost sm" pendingText="Queuing…"><Icon name="send" />Send invitations</Submit>
            </div>
          </ActionForm>
        </div>
      )}

      <section className="card pad-0">
        <div className="row between" style={{ padding: "14px 18px" }}><h2 style={{ fontSize: 16 }}>Guest overview</h2><span className="small muted">{guests.length} shown</span></div>
        {guests.length === 0 ? <Empty icon="users" title={q || sp.status ? "No guests match" : "No guests yet"}>{q || sp.status ? "Try a different search or filter." : "Add your first guest to start tracking RSVPs."}</Empty> : (
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Name</th><th className="hide-sm">Side</th><th className="hide-sm">Events</th><th>Status</th><th className="right">Seats</th>{editable && <th />}</tr></thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <span className="avatar hide-sm">{initials(g.name)}</span>
                        <div>
                          <div>{g.name}</div>
                          <div className="tiny muted">{g.relation}{editable && g.phone ? ` · ${fmtPhone(g.phone)}` : ""}{g.table ? ` · ${g.table.name}` : ""}{g.diet ? ` · ${g.diet.split(",").map((d) => DIET_TAGS[d]).join(", ")}` : ""}</div>
                        </div>
                      </div>
                    </td>
                    <td className="hide-sm small">{g.side === "BRIDE" ? "Bride's side" : "Groom's side"}</td>
                    <td className="hide-sm"><div className="row wrap" style={{ gap: 4 }}>{g.events.split(",").map((e) => <span key={e} title={EVENT_META[e]?.name} style={{ width: 10, height: 10, borderRadius: 9, background: eventMeta(e).color }} />)}<span className="tiny muted">{g.events.split(",").length === 4 ? "All events" : g.events.split(",").map((e) => EVENT_META[e]?.name.replace("Gaye ", "")).join(", ")}</span></div></td>
                    <td><span className={`badge ${STATUS_TONE[g.status]}`}>{g.status}</span></td>
                    <td className="right num">{g.status === "CONFIRMED" ? g.confirmedSeats : g.status === "DECLINED" ? "–" : g.invitedSeats}</td>
                    {editable && (
                      <td className="right">
                        <details className="drawer" style={{ position: "relative" }}>
                          <summary className="linkish">Edit</summary>
                          <div className="card" style={{ position: "absolute", right: 0, zIndex: 10, width: "min(560px, 86vw)", textAlign: "left", boxShadow: "var(--shadow-lg)", background: "#fff" }}>
                            <ActionForm action={updateGuest} className="form-grid">
                              <input type="hidden" name="id" value={g.id} />
                              <GuestFields g={g} events={weddingEvents} />
                              <label className="field"><span>RSVP</span><select className="input" name="status" defaultValue={g.status}><option>PENDING</option><option>CONFIRMED</option><option>DECLINED</option></select></label>
                              <label className="field"><span>Seats confirmed</span><input className="input" type="number" name="confirmedSeats" min={0} defaultValue={g.confirmedSeats || g.invitedSeats} /></label>
                              <div className="row" style={{ alignSelf: "end" }}><Submit className="btn sm">Save</Submit><a className="linkish" href={`/rsvp/${g.rsvpToken}`} target="_blank">RSVP link</a></div>
                            </ActionForm>
                            <form action={deleteGuest} className="mt-s"><input type="hidden" name="id" value={g.id} /><button className="linkish bad">Remove guest</button></form>
                          </div>
                        </details>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-title"><h2>Dietary summary for the caterer</h2><span className="small muted">confirmed seats</span></div>
        {Object.keys(s.diet).length ? (
          <div className="chips">{Object.entries(s.diet).sort((a, b) => b[1] - a[1]).map(([k, v]) => <span key={k} className="chip" style={{ cursor: "default" }}>{DIET_TAGS[k] ?? k} <b className="num">{v}</b></span>)}</div>
        ) : <p className="small muted">No dietary needs recorded yet. Guests can add them when they RSVP.</p>}
      </section>
    </div>
  );
}
