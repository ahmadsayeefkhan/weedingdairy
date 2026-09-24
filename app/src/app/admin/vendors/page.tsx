import Link from "next/link";
import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { reviewAverages } from "@/lib/services";
import { VENDOR_CATEGORIES } from "@/lib/constants";
import { taka } from "@/lib/format";
import { PageHead } from "@/components/ui";
import { setVendorStatus, toggleFeatured } from "../actions";

export const metadata = { title: "Vendors · Admin" };

export default async function AdminVendors({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireSystemRole("ADMIN");
  const { status } = await searchParams;
  const s = status && ["PENDING", "APPROVED", "SUSPENDED"].includes(status) ? status : undefined;
  const vendors = await db.vendor.findMany({ where: s ? { status: s } : {}, include: { reviews: true, owner: true, _count: { select: { bookings: true, packages: true } } }, orderBy: [{ status: "desc" }, { name: "asc" }] });
  return (
    <div className="stack-lg">
      <PageHead title="Vendor onboarding" sub="Approve new listings, feature top vendors, suspend problems" />
      <div className="tabs" style={{ width: "fit-content" }}>
        <Link href="/admin/vendors" aria-current={!s ? "true" : undefined}>All</Link>
        {["PENDING", "APPROVED", "SUSPENDED"].map((k) => <Link key={k} href={`/admin/vendors?status=${k}`} aria-current={s === k ? "true" : undefined}>{k[0] + k.slice(1).toLowerCase()}</Link>)}
      </div>
      <section className="card pad-0 table-wrap">
        <table className="t">
          <thead><tr><th>Vendor</th><th className="hide-sm">Category</th><th className="hide-sm">From</th><th className="hide-sm">Rating</th><th>Status</th><th /></tr></thead>
          <tbody>
            {vendors.map((v) => {
              const avg = reviewAverages(v.reviews);
              return (
                <tr key={v.id}>
                  <td><div>{v.name}{v.featured && <span className="badge dark" style={{ marginLeft: 6 }}>Featured</span>}</div><div className="tiny muted">{v.area ? `${v.area}, ` : ""}{v.city} · {v.owner?.email ?? "no owner account"} · {v._count.bookings} bookings</div></td>
                  <td className="hide-sm small">{VENDOR_CATEGORIES[v.category]?.name}</td>
                  <td className="hide-sm num small">{taka(v.startingPrice)}</td>
                  <td className="hide-sm small">{avg.count ? `★ ${avg.overall.toFixed(1)} (${avg.count})` : "–"}</td>
                  <td><span className={`badge ${v.status === "APPROVED" ? "ok" : v.status === "PENDING" ? "warn" : "bad"}`}>{v.status}</span></td>
                  <td>
                    <div className="row" style={{ gap: 6, justifyContent: "flex-end" }}>
                      <form action={setVendorStatus} className="row" style={{ gap: 6 }}>
                        <input type="hidden" name="id" value={v.id} />
                        {v.status !== "APPROVED" && (v._count.packages > 0 && v.about.trim().length >= 20
                          ? <button name="status" value="APPROVED" className="btn sm">Approve</button>
                          : <span className="tiny muted" title="The vendor must add a description and at least one package first">Profile incomplete</span>)}
                        {v.status === "APPROVED" && <button name="status" value="SUSPENDED" className="btn quiet sm">Suspend</button>}
                      </form>
                      {v.status === "APPROVED" && <form action={toggleFeatured}><input type="hidden" name="id" value={v.id} /><button className="linkish">{v.featured ? "Unfeature" : "Feature"}</button></form>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
