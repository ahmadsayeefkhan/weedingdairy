import Link from "next/link";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { getDict } from "@/lib/i18n";
import { daysBetween, today, toDateInput } from "@/lib/today";
import { bengaliDate, fmtDate, fmtDay, fmtTime, monthShort } from "@/lib/format";
import { EVENT_META, eventMeta } from "@/lib/constants";
import { EventPill, PageHead, Empty } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { createEvent } from "./actions";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const { wedding, role } = await requireWedding();
  const { locale } = await getDict();
  const events = await db.event.findMany({ where: { weddingId: wedding.id }, orderBy: { date: "asc" }, include: { items: { orderBy: { time: "asc" } } } });
  const t0 = today();
  const editable = can.edit(role);

  // A strip of days covering the whole celebration
  const first = events[0]?.date ?? wedding.date;
  const last = events[events.length - 1]?.date ?? wedding.date;
  const span = Math.min(14, daysBetween(first, last) + 1);
  const days = Array.from({ length: span }, (_, i) => new Date(first.getTime() + i * 86400000));

  return (
    <div className="stack-lg">
      <PageHead title="Event planner" sub="Orchestrate every moment, from the Holud to the Reception" />

      {events.length > 0 && (
        <div className="card">
          <div className="card-title"><h2>{monthShort(first)} {first.getUTCFullYear()}</h2><span className="small muted">{events.length} events</span></div>
          <div className="row" style={{ gap: 8, overflowX: "auto", paddingBottom: 4 }}>
            {days.map((d) => {
              const ev = events.find((e) => daysBetween(e.date, d) === 0);
              const m = ev ? eventMeta(ev.type) : null;
              const inner = (
                <div style={{ minWidth: 64, padding: "10px 8px", borderRadius: 12, textAlign: "center", background: m ? m.color : "var(--paper)", color: m ? "#fff" : "var(--ink-2)", border: m ? 0 : "1px solid var(--line)" }}>
                  <div className="tiny" style={{ opacity: 0.85 }}>{fmtDay(d).slice(0, 3)}</div>
                  <div style={{ fontSize: 22, lineHeight: 1.1 }}>{d.getUTCDate()}</div>
                  <div className="tiny ellipsis" style={{ maxWidth: 64 }}>{ev ? (locale === "bn" ? m!.bn : ev.name.split(" ").slice(-1)[0]) : "·"}</div>
                </div>
              );
              return ev ? <Link key={d.toISOString()} href={`/events/${ev.id}`}>{inner}</Link> : <div key={d.toISOString()}>{inner}</div>;
            })}
          </div>
        </div>
      )}

      {events.length === 0 ? (
        <div className="card"><Empty icon="calendar" title="No events yet">Add your Holud, Mehendi, Wedding or Reception to start building timelines.</Empty></div>
      ) : (
        <div className="grid g2">
          {events.map((e) => {
            const m = eventMeta(e.type);
            const d = daysBetween(t0, e.date);
            return (
              <Link key={e.id} href={`/events/${e.id}`} className="card stack" style={{ borderTop: `4px solid ${m.color}` }}>
                <div className="row between">
                  <EventPill type={e.type} name={e.name} />
                  <span className="tiny" style={{ color: m.color }}>{d > 0 ? `in ${d} days` : d === 0 ? "Today" : "Done"}</span>
                </div>
                <div>
                  <div style={{ fontSize: 20 }}>{fmtDate(e.date, locale)}</div>
                  <div className="small muted"><span className="bn">{bengaliDate(e.date)}</span>{e.venue ? ` · ${e.venue}` : ""}</div>
                </div>
                {e.items.length > 0 ? (
                  <div className="stack" style={{ gap: 4 }}>
                    {e.items.slice(0, 4).map((i) => (
                      <div key={i.id} className="row small" style={{ gap: 10 }}><span className="faint num" style={{ width: 64 }}>{fmtTime(i.time)}</span><span className="grow ellipsis">{i.title}</span></div>
                    ))}
                    {e.items.length > 4 && <div className="tiny faint">+{e.items.length - 4} more</div>}
                  </div>
                ) : <div className="small faint">No timeline yet</div>}
              </Link>
            );
          })}
        </div>
      )}

      {editable && (
        <details className="card drawer">
          <summary className="row"><span className="icon-chip"><Icon name="plus" /></span><b>Add an event</b></summary>
          <ActionForm action={createEvent} className="form-grid">
            <label className="field"><span>Type</span>
              <select className="input" name="type">{Object.entries(EVENT_META).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select>
            </label>
            <label className="field"><span>Name</span><input className="input" name="name" placeholder="e.g. Aqd ceremony" /></label>
            <label className="field"><span>Date</span><input className="input" type="date" name="date" defaultValue={toDateInput(wedding.date)} required /></label>
            <label className="field"><span>Venue</span><input className="input" name="venue" /></label>
            <div style={{ alignSelf: "end" }}><Submit>Add event</Submit></div>
          </ActionForm>
        </details>
      )}
    </div>
  );
}
