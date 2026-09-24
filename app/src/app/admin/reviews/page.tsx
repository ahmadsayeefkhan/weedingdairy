import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { fmtShort } from "@/lib/format";
import { PageHead, Stars } from "@/components/ui";
import { setReviewHidden } from "../actions";

export const metadata = { title: "Reviews · Admin" };

export default async function AdminReviews() {
  await requireSystemRole("ADMIN");
  const reviews = await db.review.findMany({ include: { vendor: true, booking: { include: { wedding: true } } }, orderBy: [{ overall: "asc" }, { createdAt: "desc" }] });
  return (
    <div className="stack-lg">
      <PageHead title="Review moderation" sub="Every review comes from a verified booking. Lowest ratings first." />
      <section className="card">
        <div className="list">
          {reviews.map((r) => (
            <div key={r.id} className="row wrap" style={{ gap: 12, opacity: r.hidden ? 0.55 : 1 }}>
              <div className="grow" style={{ minWidth: 220 }}>
                <div className="row" style={{ gap: 8 }}><b style={{ fontWeight: 500 }}>{r.vendor.name}</b><Stars value={r.overall} size={12} />{r.hidden && <span className="badge bad">Hidden</span>}</div>
                <p className="small">&ldquo;{r.text}&rdquo;</p>
                <div className="tiny faint">{r.booking.wedding.brideName} &amp; {r.booking.wedding.groomName} · {fmtShort(r.createdAt)}</div>
              </div>
              <form action={setReviewHidden}><input type="hidden" name="id" value={r.id} /><input type="hidden" name="hidden" value={r.hidden ? "0" : "1"} /><button className={r.hidden ? "btn quiet sm" : "btn ghost sm"}>{r.hidden ? "Restore" : "Hide"}</button></form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
