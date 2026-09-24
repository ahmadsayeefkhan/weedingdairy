import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { initials } from "@/lib/format";
import { DIET_TAGS } from "@/lib/constants";
import { Empty, PageHead, Stat } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { addTable, assignGuest, autoAssign, deleteTable } from "./actions";

export const metadata = { title: "Seating" };

export default async function SeatingPage() {
  const { wedding, role } = await requireWedding();
  const editable = can.edit(role);
  const tables = await db.seatTable.findMany({ where: { weddingId: wedding.id }, include: { guests: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } });
  const unassigned = await db.guest.findMany({ where: { weddingId: wedding.id, status: "CONFIRMED", tableId: null }, orderBy: { confirmedSeats: "desc" } });
  const seated = tables.reduce((a, t) => a + t.guests.reduce((b, g) => b + g.confirmedSeats, 0), 0);
  const capacity = tables.reduce((a, t) => a + t.capacity, 0);
  const waitingSeats = unassigned.reduce((a, g) => a + g.confirmedSeats, 0);

  return (
    <div className="stack-lg">
      <PageHead title="Interactive seating planner" sub="Group families and friends effortlessly">
        {editable && (
          <ActionForm action={autoAssign}><Submit className="btn" pendingText="Seating guests…"><Icon name="sparkle" />Auto-assign guests</Submit></ActionForm>
        )}
      </PageHead>
      <section className="grid g4">
        <Stat icon="users" label="Seated" value={seated} hint={`of ${capacity} seats`} />
        <Stat icon="seat" label="Tables" value={tables.length} />
        <Stat icon="clock" label="Waiting for a table" value={waitingSeats} hint={`${unassigned.length} parties`} />
        <Stat icon="check" label="Free seats" value={Math.max(0, capacity - seated)} />
      </section>

      <div className="split">
        <section className="stack-lg">
          {tables.length === 0 ? <div className="card"><Empty icon="seat" title="No tables yet">Add tables to start seating your confirmed guests.</Empty></div> : (
            <div className="tables">
              {tables.map((t) => {
                const used = t.guests.reduce((a, g) => a + g.confirmedSeats, 0);
                const pct = Math.min(1, used / t.capacity);
                const diets = t.guests.flatMap((g) => (g.diet ?? "").split(",").filter((d) => d && d !== "HALAL"));
                return (
                  <div key={t.id} className="card" style={{ padding: 14 }}>
                    <div className="row between"><b style={{ fontWeight: 500 }}>{t.name}</b>{editable && t.guests.length === 0 && <form action={deleteTable}><input type="hidden" name="id" value={t.id} /><button className="linkish bad" aria-label={`Delete ${t.name}`}><Icon name="trash" width={14} height={14} /></button></form>}</div>
                    <div className="tiny muted">{t.label ?? "No label"}</div>
                    <div className="seat-ring" style={{ background: `conic-gradient(var(--coral) ${pct * 360}deg, var(--coral-soft) 0)` }}>
                      <div style={{ width: 92, height: 92, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center" }}>
                        <div><div className="num" style={{ fontSize: 22 }}>{used}/{t.capacity}</div><div className="tiny muted">seats</div></div>
                      </div>
                    </div>
                    <div className="stack" style={{ gap: 4 }}>
                      {t.guests.map((g) => (
                        <div key={g.id} className="row small" style={{ gap: 6 }}>
                          <span className="grow ellipsis">{g.name} <span className="faint">×{g.confirmedSeats}</span></span>
                          {editable && <ActionForm action={assignGuest} showOk={false}><input type="hidden" name="guestId" value={g.id} /><input type="hidden" name="tableId" value="" /><button className="linkish" aria-label={`Unseat ${g.name}`}><Icon name="x" width={13} height={13} /></button></ActionForm>}
                        </div>
                      ))}
                    </div>
                    {diets.length > 0 && <div className="tiny mt-s" style={{ color: "var(--warn)" }}>Diet: {[...new Set(diets)].map((d) => DIET_TAGS[d]).join(", ")}</div>}
                  </div>
                );
              })}
            </div>
          )}
          {editable && (
            <details className="card drawer">
              <summary className="row"><span className="icon-chip"><Icon name="plus" /></span><b>Add table</b></summary>
              <ActionForm action={addTable} className="form-grid" reset>
                <label className="field"><span>Name</span><input className="input" name="name" placeholder={`Table ${tables.length + 1}`} /></label>
                <label className="field"><span>Label</span><input className="input" name="label" placeholder="Bride's family" /></label>
                <label className="field"><span>Seats</span><input className="input" type="number" name="capacity" min={2} max={30} defaultValue={10} /></label>
                <div style={{ alignSelf: "end" }}><Submit>Add table</Submit></div>
              </ActionForm>
            </details>
          )}
        </section>

        <aside className="card" style={{ alignSelf: "start" }}>
          <div className="card-title"><h3>Unassigned guests</h3><span className="badge coral">{unassigned.length}</span></div>
          {unassigned.length === 0 ? <p className="small muted">Every confirmed guest has a seat.</p> : (
            <div className="list">
              {unassigned.map((g) => (
                <div key={g.id} className="stack" style={{ gap: 6 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span className="avatar">{initials(g.name)}</span>
                    <div className="grow"><div className="small">{g.name}</div><div className="tiny muted">{g.side === "BRIDE" ? "Bride's side" : "Groom's side"} · {g.relation} · {g.confirmedSeats} seat{g.confirmedSeats > 1 ? "s" : ""}</div></div>
                  </div>
                  {editable && tables.length > 0 && (
                    <ActionForm action={assignGuest} className="row" >
                      <input type="hidden" name="guestId" value={g.id} />
                      <select className="input" name="tableId" aria-label={`Table for ${g.name}`} style={{ padding: "5px 8px", fontSize: 13 }}>
                        {tables.map((t) => {
                          const free = t.capacity - t.guests.reduce((a, x) => a + x.confirmedSeats, 0);
                          return <option key={t.id} value={t.id} disabled={free < g.confirmedSeats}>{t.name} · {free} free</option>;
                        })}
                      </select>
                      <Submit className="btn sm">Seat</Submit>
                    </ActionForm>
                  )}
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
