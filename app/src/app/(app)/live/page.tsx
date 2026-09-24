import Link from "next/link";
import { db } from "@/lib/db";
import { requireWedding } from "@/lib/wedding";
import { daysBetween, today } from "@/lib/today";
import { fmtDate } from "@/lib/format";
import { eventMeta } from "@/lib/constants";
import { EventPill, Empty, PageHead } from "@/components/ui";
import { Icon } from "@/components/icons";

export const metadata = { title: "Live Mode" };

export default async function LiveIndex() {
  const { wedding } = await requireWedding();
  const events = await db.event.findMany({ where: { weddingId: wedding.id }, orderBy: { date: "asc" } });
  const t0 = today();
  const todays = events.find((e) => daysBetween(t0, e.date) === 0);
  return (
    <div className="stack-lg">
      <PageHead title="Wedding Day Live Mode" sub="Real-time coordination on the big day: timeline, vendors, check-in and photos" />
      {todays ? (
        <Link href={`/live/${todays.id}`} className="card row wrap" style={{ gap: 16, background: eventMeta(todays.type).color, color: "#fff", border: 0 }}>
          <span className="badge live">Live today</span>
          <div className="grow"><div style={{ fontSize: 22 }}>{todays.name}</div><div className="small" style={{ opacity: 0.9 }}>{todays.venue}</div></div>
          <span className="btn quiet">Open Live Mode <Icon name="arrow" /></span>
        </Link>
      ) : (
        <div className="notice"><Icon name="clock" />No event is happening today. You can open any event below to rehearse Live Mode.</div>
      )}
      {events.length === 0 ? <div className="card"><Empty icon="calendar" title="No events yet" /></div> : (
        <div className="grid g2">
          {events.map((e) => (
            <Link key={e.id} href={`/live/${e.id}`} className="card row between">
              <div className="stack" style={{ gap: 4 }}><EventPill type={e.type} name={e.name} /><span className="small muted">{fmtDate(e.date)}</span></div>
              <Icon name="live" width={22} height={22} style={{ color: eventMeta(e.type).color }} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
