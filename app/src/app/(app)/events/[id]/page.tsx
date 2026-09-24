import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { getDict } from "@/lib/i18n";
import { toDateInput } from "@/lib/today";
import { bengaliDate, fmtDate, fmtTime } from "@/lib/format";
import { eventMeta, TASK_CATEGORIES } from "@/lib/constants";
import { EventPill, Empty } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { addItem, deleteEvent, deleteItem, updateEvent, updateItem } from "../actions";

export default async function EventDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wedding, role } = await requireWedding();
  const { locale } = await getDict();
  const ev = await db.event.findFirst({ where: { id, weddingId: wedding.id }, include: { items: { orderBy: { time: "asc" } }, tasks: { orderBy: { order: "asc" } } } });
  if (!ev) notFound();
  const m = eventMeta(ev.type);
  const editable = can.edit(role);

  return (
    <div className="stack-lg">
      <Link href="/events" className="linkish row" style={{ gap: 6 }}><Icon name="back" width={16} height={16} />All events</Link>
      <section className="card" style={{ background: m.color, color: "#fff", border: 0, padding: 24 }}>
        <div className="row between wrap" style={{ gap: 12 }}>
          <div className="stack" style={{ gap: 4 }}>
            <span className="eyebrow" style={{ color: "rgba(255,255,255,.8)" }}>{locale === "bn" ? m.bn : m.name}</span>
            <h1 style={{ fontSize: 30, fontWeight: 400 }}>{ev.name}</h1>
            <div>{fmtDate(ev.date, locale)} · <span className="bn">{bengaliDate(ev.date)}</span></div>
            {ev.venue && <div className="row small" style={{ gap: 6 }}><Icon name="pin" width={15} height={15} />{ev.venue}</div>}
          </div>
          <div className="row wrap">
            <Link href={`/live/${ev.id}`} className="btn quiet"><Icon name="live" />Live Mode</Link>
            <Link href={`/vault?event=${ev.id}`} className="btn quiet"><Icon name="image" />Album</Link>
          </div>
        </div>
      </section>

      <div className="split">
        <section className="card">
          <div className="card-title"><h2>Timeline</h2><span className="small muted">{ev.items.length} items</span></div>
          {ev.items.length === 0 ? <Empty icon="clock" title="Nothing scheduled yet">Add the first time block below, like makeup at 14:00.</Empty> : (
            <div className="tl" style={{ ["--ev" as string]: m.color }}>
              {ev.items.map((i) => (
                <div key={i.id} className={`tl-item ${i.status === "DONE" ? "done" : i.status === "NOW" ? "now" : ""}`}>
                  <div className="tl-time">{fmtTime(i.time)}</div>
                  <div className="tl-dot" />
                  <div className="tl-body">
                    {editable ? (
                      <details className="drawer">
                        <summary className="row between">
                          <span><b style={{ fontWeight: 500 }}>{i.title}</b>{i.location && <span className="small muted"> · {i.location}</span>}</span>
                          <Icon name="edit" width={15} height={15} className="faint" />
                        </summary>
                        <ActionForm action={updateItem} className="form-grid">
                          <input type="hidden" name="id" value={i.id} />
                          <label className="field"><span>Time</span><input className="input" type="time" name="time" defaultValue={i.time} required /></label>
                          <label className="field"><span>What</span><input className="input" name="title" defaultValue={i.title} required /></label>
                          <label className="field"><span>Where</span><input className="input" name="location" defaultValue={i.location ?? ""} /></label>
                          <label className="field"><span>Note</span><input className="input" name="note" defaultValue={i.note ?? ""} /></label>
                          <div className="row" style={{ alignSelf: "end" }}><Submit className="btn sm">Save</Submit></div>
                        </ActionForm>
                        <form action={deleteItem} className="mt-s"><input type="hidden" name="id" value={i.id} /><button className="linkish bad">Remove from timeline</button></form>
                      </details>
                    ) : (
                      <span><b style={{ fontWeight: 500 }}>{i.title}</b>{i.location && <span className="small muted"> · {i.location}</span>}</span>
                    )}
                    {i.note && <div className="small muted">{i.note}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
          {editable && (
            <ActionForm action={addItem} className="form-grid mt" reset>
              <input type="hidden" name="eventId" value={ev.id} />
              <label className="field"><span>Time</span><input className="input" type="time" name="time" required /></label>
              <label className="field"><span>What happens</span><input className="input" name="title" placeholder="e.g. Makeup artist arrives" required /></label>
              <label className="field"><span>Where</span><input className="input" name="location" placeholder="Bridal suite" /></label>
              <div style={{ alignSelf: "end" }}><Submit><Icon name="plus" />Add</Submit></div>
            </ActionForm>
          )}
        </section>

        <div className="stack-lg">
          {editable && (
            <section className="card">
              <div className="card-title"><h3>Event details</h3><EventPill type={ev.type} /></div>
              <ActionForm action={updateEvent} className="stack">
                <input type="hidden" name="id" value={ev.id} />
                <label className="field"><span>Name</span><input className="input" name="name" defaultValue={ev.name} required /></label>
                <label className="field"><span>Date</span><input className="input" type="date" name="date" defaultValue={toDateInput(ev.date)} required /></label>
                <label className="field"><span>Venue</span><input className="input" name="venue" defaultValue={ev.venue ?? ""} /></label>
                <Submit className="btn">Save event</Submit>
              </ActionForm>
              {role === "COUPLE" && (
                <form action={deleteEvent} className="mt"><input type="hidden" name="id" value={ev.id} /><button className="linkish bad">Delete this event and its timeline</button></form>
              )}
            </section>
          )}
          <section className="card">
            <div className="card-title"><h3>Tasks for this event</h3><Link href="/checklist">Checklist</Link></div>
            {ev.tasks.length ? (
              <div className="list">
                {ev.tasks.map((t) => (
                  <div key={t.id} className="row small" style={{ gap: 8 }}>
                    <Icon name={t.done ? "check" : "clock"} width={15} height={15} style={{ color: t.done ? "var(--ok)" : "var(--ink-3)" }} />
                    <span className="grow" style={{ textDecoration: t.done ? "line-through" : undefined, color: t.done ? "var(--ink-3)" : undefined }}>{t.title}</span>
                    <span className="badge">{TASK_CATEGORIES[t.category]}</span>
                  </div>
                ))}
              </div>
            ) : <p className="small muted">No tasks linked to this event.</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
