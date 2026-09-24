import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { eventMeta } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { Logo } from "@/components/icons";
import { PhotoUpload } from "@/components/PhotoUpload";

export const metadata = { title: "Share your photos" };

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ev = await db.event.findUnique({ where: { shareCode: code }, include: { wedding: true, photos: { where: { status: "APPROVED" }, orderBy: { takenAt: "desc" }, take: 12 } } });
  if (!ev || ev.wedding.visibility === "PRIVATE") notFound();
  const m = eventMeta(ev.type);
  return (
    <main style={{ position: "relative", zIndex: 1, padding: "24px 16px 60px", maxWidth: 560, margin: "0 auto" }} className="stack-lg">
      <div className="ambient" />
      <div className="row" style={{ justifyContent: "center", gap: 8 }}><Logo size={26} /><span className="small">Wedding Diary</span></div>
      <section className="card" style={{ background: m.color, color: "#fff", border: 0, textAlign: "center" }}>
        <div className="eyebrow" style={{ color: "rgba(255,255,255,.8)" }}>Live photo sharing</div>
        <h1 style={{ fontSize: 26, fontWeight: 400, marginTop: 4 }}>{ev.wedding.brideName} &amp; {ev.wedding.groomName}</h1>
        <div className="small" style={{ opacity: 0.9 }}>{ev.name} · {fmtDate(ev.date)}</div>
      </section>
      <section className="card stack">
        <p className="small muted">Share the moments you captured. No app or login needed; your photos go to the couple&apos;s Memory Vault and the big screen.</p>
        <PhotoUpload code={code} guest />
      </section>
      {ev.photos.length > 0 && (
        <section className="card">
          <div className="card-title"><h2>Live gallery</h2><span className="small muted">{ev.photos.length} recent</span></div>
          <div className="photos">
            {ev.photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <div key={p.id} className="photo"><img src={p.path} alt={p.caption ?? `Photo by ${p.uploadedBy}`} loading="lazy" /><div className="cap">{p.uploadedBy}</div></div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
