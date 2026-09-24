import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { reviewAverages } from "@/lib/services";
import { fmtShort } from "@/lib/format";
import { Bar, Empty, PageHead, Stars } from "@/components/ui";

export const metadata = { title: "Reviews · VendorOS" };

export default async function VendorReviews() {
  const user = await requireSystemRole("VENDOR");
  const v = await db.vendor.findUnique({ where: { ownerId: user.id }, include: { reviews: { where: { hidden: false }, include: { booking: { include: { wedding: true } } }, orderBy: { createdAt: "desc" } } } });
  const reviews = v?.reviews ?? [];
  const avg = reviewAverages(reviews);
  return (
    <div className="stack-lg">
      <PageHead title="Reviews" sub="Verified feedback from couples who booked you" />
      <section className="card row wrap" style={{ gap: 30 }}>
        <div><div className="serif" style={{ fontSize: 52, lineHeight: 1.1 }}>{avg.count ? avg.overall.toFixed(1) : "–"}</div><Stars value={avg.overall} /><div className="small muted">{avg.count} reviews</div></div>
        <div className="grow grid g2" style={{ minWidth: 260 }}>
          {([["Punctuality", avg.punctuality], ["Behavior", avg.behavior], ["Quality of work", avg.quality], ["Value for money", avg.value]] as const).map(([k, val]) => (
            <div key={k}><div className="row between small"><span>{k}</span><b>{val.toFixed(1)}</b></div><Bar value={val} max={5} thin /></div>
          ))}
        </div>
      </section>
      <section className="card">
        {reviews.length === 0 ? <Empty icon="star" title="No reviews yet">Couples can review you after a confirmed booking.</Empty> : (
          <div className="list">
            {reviews.map((r) => (
              <div key={r.id} className="stack" style={{ gap: 4 }}>
                <div className="row between"><span className="small">{r.booking.wedding.brideName} &amp; {r.booking.wedding.groomName} · <span className="faint">{fmtShort(r.createdAt)}</span></span><Stars value={r.overall} /></div>
                <p className="small">&ldquo;{r.text}&rdquo;</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
