import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { CITIES, PRICE_TIERS, VENDOR_CATEGORIES } from "@/lib/constants";
import { fmtDate, taka } from "@/lib/format";
import { toDateInput, today } from "@/lib/today";
import { Empty, PageHead } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { blockDate, deletePackage, savePackage, unblockDate, updateProfile } from "../actions";

export const metadata = { title: "Profile · VendorOS" };

export default async function VendorProfileEdit() {
  const user = await requireSystemRole("VENDOR");
  const v = await db.vendor.findUnique({ where: { ownerId: user.id }, include: { packages: { orderBy: { price: "asc" } }, blocked: { where: { date: { gte: today() } }, orderBy: { date: "asc" } } } });
  if (!v) return <div className="card"><Empty icon="store" title="No listing linked to this account">Contact hello@weddingdiary.bd to link your business.</Empty></div>;
  return (
    <div className="stack-lg">
      <PageHead title="Profile & packages" sub="What couples see on your marketplace listing">
        {v.status === "APPROVED" && <a className="btn quiet" href={`/vendors/${v.slug}`}><Icon name="globe" />View as couple</a>}
      </PageHead>
      <div className="split">
        <ActionForm action={updateProfile} className="card stack">
          <div className="row between"><h2 style={{ fontSize: 17 }}>Business profile</h2><span className="badge coral">{VENDOR_CATEGORIES[v.category]?.name}</span></div>
          <label className="field"><span>Business name</span><input className="input" name="name" defaultValue={v.name} required /></label>
          <label className="field"><span>About</span><textarea className="input" name="about" defaultValue={v.about} rows={4} required /></label>
          <div className="form-grid">
            <label className="field"><span>City</span><select className="input" name="city" defaultValue={v.city}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="field"><span>Area</span><input className="input" name="area" defaultValue={v.area} placeholder="Banani" /></label>
            <label className="field"><span>Price range</span><select className="input" name="priceTier" defaultValue={v.priceTier}>{[1, 2, 3].map((t) => <option key={t} value={t}>{"৳".repeat(t)} {PRICE_TIERS[t]}</option>)}</select></label>
            <label className="field"><span>Guest capacity</span><input className="input" name="capacity" type="number" defaultValue={v.capacity ?? ""} placeholder="Venues only" /></label>
          </div>
          <label className="field"><span>Specialities (comma separated)</span><input className="input" name="tags" defaultValue={v.tags} placeholder="Cinematic, Drone, Photobook" /></label>
          <div><Submit>Save profile</Submit></div>
        </ActionForm>

        <div className="stack-lg">
          <section className="card stack">
            <h2 style={{ fontSize: 17 }}>Availability</h2>
            <p className="small muted">Block days you can&apos;t work. Confirmed bookings block their day automatically.</p>
            <ActionForm action={blockDate} className="row" reset>
              <input className="input" type="date" name="date" min={toDateInput(today())} required aria-label="Date to block" />
              <Submit className="btn sm">Block</Submit>
            </ActionForm>
            <div className="chips">
              {v.blocked.length === 0 && <span className="small faint">No blocked days.</span>}
              {v.blocked.map((b) => (
                <form key={b.id} action={unblockDate}><input type="hidden" name="id" value={b.id} /><button className="chip" title="Unblock">{fmtDate(b.date)} <Icon name="x" width={12} height={12} /></button></form>
              ))}
            </div>
          </section>
        </div>
      </div>

      <section className="card">
        <div className="card-title"><h2>Packages</h2><span className="small muted">Your lowest price shows as &ldquo;from&rdquo; on the marketplace</span></div>
        <div className="list">
          {v.packages.map((p) => (
            <details key={p.id} className="drawer">
              <summary className="row between"><span>{p.name} <span className="small muted">· {p.description}</span></span><b className="num">{taka(p.price)}</b></summary>
              <ActionForm action={savePackage} className="form-grid">
                <input type="hidden" name="id" value={p.id} />
                <label className="field"><span>Name</span><input className="input" name="name" defaultValue={p.name} /></label>
                <label className="field"><span>Price (৳)</span><input className="input num" name="price" defaultValue={p.price} inputMode="numeric" /></label>
                <label className="field" style={{ gridColumn: "1 / -1" }}><span>What&apos;s included</span><input className="input" name="description" defaultValue={p.description} /></label>
                <div className="row"><Submit className="btn sm">Save</Submit></div>
              </ActionForm>
              <form action={deletePackage} className="mt-s"><input type="hidden" name="id" value={p.id} /><button className="linkish bad">Delete package</button></form>
            </details>
          ))}
        </div>
        <ActionForm action={savePackage} className="form-grid mt" reset>
          <label className="field"><span>New package</span><input className="input" name="name" placeholder="e.g. Holud + Wedding" required /></label>
          <label className="field"><span>Price (৳)</span><input className="input num" name="price" inputMode="numeric" required /></label>
          <label className="field"><span>What&apos;s included</span><input className="input" name="description" /></label>
          <div style={{ alignSelf: "end" }}><Submit><Icon name="plus" />Add package</Submit></div>
        </ActionForm>
      </section>
    </div>
  );
}
