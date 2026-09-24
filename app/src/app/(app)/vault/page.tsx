import Link from "next/link";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { fmtDate } from "@/lib/format";
import { eventMeta } from "@/lib/constants";
import { Empty, PageHead } from "@/components/ui";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Icon } from "@/components/icons";
import { moderatePhoto } from "../live/actions";

export const metadata = { title: "Memory Vault" };

export default async function VaultPage({ searchParams }: { searchParams: Promise<{ event?: string; tab?: string }> }) {
  const sp = await searchParams;
  const { wedding, role } = await requireWedding();
  const editable = can.edit(role);
  const events = await db.event.findMany({ where: { weddingId: wedding.id }, orderBy: { date: "asc" } });
  const eventFilter = events.find((e) => e.id === sp.event)?.id;
  const tab = sp.tab === "review" && editable ? "review" : sp.tab === "favorites" ? "favorites" : "timeline";
  const photos = await db.photo.findMany({
    where: {
      weddingId: wedding.id,
      ...(eventFilter ? { eventId: eventFilter } : {}),
      ...(tab === "review" ? { status: "PENDING" } : { status: "APPROVED" }),
      ...(tab === "favorites" ? { favorite: true } : {}),
    },
    include: { event: true },
    orderBy: { takenAt: "asc" },
  });
  const pending = editable ? await db.photo.count({ where: { weddingId: wedding.id, status: "PENDING" } }) : 0;
  const counts = await db.photo.groupBy({ by: ["eventId"], where: { weddingId: wedding.id, status: "APPROVED" }, _count: true });
  const countFor = (id: string | null) => counts.find((c) => c.eventId === id)?._count ?? 0;
  const link = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ event: eventFilter, tab: tab === "timeline" ? undefined : tab, ...o }).filter(([, v]) => v) as [string, string][]);
    return `/vault?${p.toString()}`;
  };
  // group photos by album for the timeline view
  const groups = new Map<string, { title: string; date: Date | null; type: string; items: typeof photos }>();
  for (const p of photos) {
    const key = p.eventId ?? "general";
    if (!groups.has(key)) groups.set(key, { title: p.event?.name ?? "General", date: p.event?.date ?? null, type: p.event?.type ?? "OTHER", items: [] });
    groups.get(key)!.items.push(p);
  }

  return (
    <div className="stack-lg">
      <PageHead title="Memory Vault" sub="Preserve every precious moment, forever" />
      <div className="row wrap" style={{ gap: 10 }}>
        <Link href={link({ event: undefined })} className={`chip${!eventFilter ? " on" : ""}`}>All albums</Link>
        {events.map((e) => (
          <Link key={e.id} href={link({ event: e.id })} className={`chip${eventFilter === e.id ? " on" : ""}`}>
            <span style={{ width: 8, height: 8, borderRadius: 9, background: eventMeta(e.type).color }} />{e.name} · {countFor(e.id)}
          </Link>
        ))}
      </div>
      <div className="tabs" style={{ width: "fit-content" }}>
        <Link href={link({ tab: undefined })} aria-current={tab === "timeline" ? "true" : undefined}>Timeline</Link>
        <Link href={link({ tab: "favorites" })} aria-current={tab === "favorites" ? "true" : undefined}>Favorites</Link>
        {editable && <Link href={link({ tab: "review" })} aria-current={tab === "review" ? "true" : undefined}>To review{pending ? ` · ${pending}` : ""}</Link>}
      </div>

      {photos.length === 0 ? (
        <div className="card"><Empty icon="image" title={tab === "review" ? "Nothing to review" : "No photos here yet"}>{tab === "review" ? "Guest uploads that need approval will appear here." : "Upload photos below, or share the guest QR link from Live Mode."}</Empty></div>
      ) : tab === "review" ? (
        <section className="card">
          <div className="card-title"><h2>Guest uploads waiting for approval</h2></div>
          <div className="photos">
            {photos.map((p) => (
              <div key={p.id} className="stack" style={{ gap: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <div className="photo"><img src={p.path} alt={p.caption ?? `Photo by ${p.uploadedBy}`} /><div className="cap">{p.uploadedBy} · {p.event?.name ?? "General"}</div></div>
                <form action={moderatePhoto} className="row" style={{ gap: 6 }}>
                  <input type="hidden" name="id" value={p.id} />
                  <button name="action" value="approve" className="btn sm grow">Approve</button>
                  <button name="action" value="hide" className="btn quiet sm">Hide</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      ) : (
        [...groups.values()].map((g) => (
          <section key={g.title} className="card" style={{ borderLeft: `4px solid ${eventMeta(g.type).color}` }}>
            <div className="card-title"><div><h2>{g.title}</h2><div className="small muted">{g.date ? fmtDate(g.date) : ""} · {g.items.length} photos</div></div></div>
            <div className="photos">
              {g.items.map((p) => (
                <div key={p.id} className="photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.path} alt={p.caption ?? `Photo by ${p.uploadedBy}`} loading="lazy" />
                  <div className="cap">{p.caption ? `${p.caption} · ` : ""}{p.uploadedBy}</div>
                  <div className="tl-actions">
                    {editable && (
                      <form action={moderatePhoto}><input type="hidden" name="id" value={p.id} /><button name="action" value="favorite" className="chip" style={{ padding: 4, background: "rgba(255,255,255,.9)" }} aria-label={p.favorite ? "Remove from favorites" : "Add to favorites"}><Icon name="heart" width={14} height={14} fill={p.favorite ? "var(--accent)" : "none"} /></button></form>
                    )}
                    <a href={p.path} download className="chip" style={{ padding: 4, background: "rgba(255,255,255,.9)" }} aria-label="Download original"><Icon name="download" width={14} height={14} /></a>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {editable && (
        <details className="card drawer">
          <summary className="row"><span className="icon-chip"><Icon name="upload" /></span><b>Upload photos</b></summary>
          <PhotoUpload events={events.map((e) => ({ id: e.id, name: e.name }))} />
        </details>
      )}
      <p className="tiny faint">Guests add photos from the QR link on the Live Mode screen. High-resolution originals are stored as uploaded.</p>
    </div>
  );
}
