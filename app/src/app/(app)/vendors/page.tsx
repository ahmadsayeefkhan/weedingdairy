import Link from "next/link";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { matchContext, matchScore, reviewAverages } from "@/lib/services";
import { CITIES, PRICE_TIERS, VENDOR_CATEGORIES } from "@/lib/constants";
import { taka } from "@/lib/format";
import { Empty, PageHead } from "@/components/ui";
import { Icon } from "@/components/icons";
import { toggleShortlist } from "./actions";

export const metadata = { title: "Vendor marketplace" };

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ cat?: string; tier?: string; city?: string; q?: string; sort?: string; saved?: string }> }) {
  const sp = await searchParams;
  const { wedding, role } = await requireWedding();
  const cat = sp.cat && VENDOR_CATEGORIES[sp.cat] ? sp.cat : undefined;
  const tier = Number(sp.tier) >= 1 && Number(sp.tier) <= 3 ? Number(sp.tier) : undefined;
  const city = sp.city && CITIES.includes(sp.city) ? sp.city : undefined;
  const q = sp.q?.trim();
  const shortlist = new Set((await db.shortlist.findMany({ where: { weddingId: wedding.id } })).map((s) => s.vendorId));
  const vendors = await db.vendor.findMany({
    where: {
      status: "APPROVED",
      ...(cat ? { category: cat } : {}), ...(tier ? { priceTier: tier } : {}), ...(city ? { city } : {}),
      ...(q ? { OR: [{ name: { contains: q } }, { tags: { contains: q } }, { area: { contains: q } }] } : {}),
      ...(sp.saved ? { id: { in: [...shortlist] } } : {}),
    },
    include: { reviews: true },
  });
  const mctx = await matchContext(db, wedding.id);
  const rows = await Promise.all(vendors.map(async (v) => ({ v, avg: reviewAverages(v.reviews), score: await matchScore(db, wedding, v, mctx) })));
  const sort = sp.sort ?? "match";
  rows.sort((a, b) => sort === "rating" ? b.avg.overall - a.avg.overall : sort === "price" ? a.v.startingPrice - b.v.startingPrice : b.score - a.score || Number(b.v.featured) - Number(a.v.featured));
  const link = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ cat, tier: tier ? String(tier) : undefined, city, q, sort: sp.sort, saved: sp.saved, ...o }).filter(([, v]) => v) as [string, string][]);
    return `/vendors?${p.toString()}`;
  };
  const editable = can.edit(role);

  return (
    <div className="stack-lg">
      <PageHead title="Vendor marketplace" sub="Curated excellence: verified vendors with reviews from real couples">
        <Link href={link({ saved: sp.saved ? undefined : "1" })} className={`chip${sp.saved ? " on" : ""}`}><Icon name="heart" width={14} height={14} />Shortlist · {shortlist.size}</Link>
      </PageHead>

      <div className="tabs" aria-label="Category">
        <Link href={link({ cat: undefined })} aria-current={!cat ? "true" : undefined}>All</Link>
        {Object.entries(VENDOR_CATEGORIES).map(([k, v]) => <Link key={k} href={link({ cat: k })} aria-current={cat === k ? "true" : undefined}>{v.name}</Link>)}
      </div>

      <form className="card row wrap" style={{ gap: 8 }} action="/vendors">
        {cat && <input type="hidden" name="cat" value={cat} />}
        <div className="grow" style={{ minWidth: 200 }}><input className="input" name="q" defaultValue={q} placeholder="Search kacchi, drone, Gulshan…" aria-label="Search vendors" /></div>
        <select className="input" name="tier" defaultValue={tier ?? ""} style={{ width: "auto" }} aria-label="Price range"><option value="">Any price</option>{[3, 2, 1].map((t) => <option key={t} value={t}>{"৳".repeat(t)} {PRICE_TIERS[t]}</option>)}</select>
        <select className="input" name="city" defaultValue={city ?? ""} style={{ width: "auto" }} aria-label="Location"><option value="">Anywhere</option>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
        <select className="input" name="sort" defaultValue={sort} style={{ width: "auto" }} aria-label="Sort"><option value="match">Best match for you</option><option value="rating">Highest rated</option><option value="price">Lowest price</option></select>
        <button className="btn quiet"><Icon name="filter" />Apply</button>
      </form>

      {rows.length === 0 ? <div className="card"><Empty icon="store" title="No vendors match">Try a different category, price range or city.</Empty></div> : (
        <div className="grid g3">
          {rows.map(({ v, avg, score }) => (
            <div key={v.id} className="card vcard">
              <Link href={`/vendors/${v.slug}`} className="vcover" style={{ backgroundImage: `url(${v.cover})` }} aria-label={v.name}>
                {avg.count > 0 && <span className="rating">★ {avg.overall.toFixed(1)}</span>}
                {score >= 75 && <span className="badge dark match"><Icon name="sparkle" width={11} height={11} />AI match {score}%</span>}
              </Link>
              <div className="vbody">
                <div className="row between">
                  <Link href={`/vendors/${v.slug}`} style={{ fontSize: 17 }} className="ellipsis grow">{v.name}</Link>
                  {editable && (
                    <form action={toggleShortlist}><input type="hidden" name="vendorId" value={v.id} />
                      <button className="linkish" aria-label={shortlist.has(v.id) ? `Remove ${v.name} from shortlist` : `Add ${v.name} to shortlist`} aria-pressed={shortlist.has(v.id)}>
                        <Icon name="heart" width={19} height={19} fill={shortlist.has(v.id) ? "var(--coral)" : "none"} />
                      </button>
                    </form>
                  )}
                </div>
                <div className="row small muted" style={{ gap: 5 }}><Icon name="pin" width={14} height={14} />{v.area ? `${v.area}, ` : ""}{v.city}</div>
                <div className="row wrap" style={{ gap: 5 }}>
                  <span className="badge coral">{VENDOR_CATEGORIES[v.category]?.name}</span>
                  {v.tags.split(",").filter(Boolean).slice(0, 2).map((t) => <span key={t} className="badge">{t}</span>)}
                </div>
                <div className="row between mt-s">
                  <span className="small"><span className="faint">from </span><b className="num">{taka(v.startingPrice)}</b>{v.category === "CATERING" ? <span className="faint">/plate</span> : null}</span>
                  <span className="small" style={{ color: "var(--coral-ink)", letterSpacing: 1 }} title={PRICE_TIERS[v.priceTier]}>{"৳".repeat(v.priceTier)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="tiny faint">AI match blends fit with your budget allocation, your city, verified ratings and availability on your wedding date.</p>
    </div>
  );
}
