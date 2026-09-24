import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { fmtShort } from "@/lib/format";
import { PageHead } from "@/components/ui";

export const metadata = { title: "Outbox · Admin" };

export default async function Outbox({ searchParams }: { searchParams: Promise<{ channel?: string }> }) {
  await requireSystemRole("ADMIN");
  const { channel } = await searchParams;
  const ch = channel && ["SMS", "EMAIL", "WHATSAPP", "IN_APP"].includes(channel) ? channel : undefined;
  const items = await db.notification.findMany({ where: ch ? { channel: ch } : { channel: { not: "IN_APP" } }, orderBy: { createdAt: "desc" }, take: 200 });
  return (
    <div className="stack-lg">
      <PageHead title="Message outbox" sub="Dev mode: SMS, WhatsApp and email are recorded here instead of being sent" />
      <div className="tabs" style={{ width: "fit-content" }}>
        <a href="/admin/outbox" aria-current={!ch ? "true" : undefined}>External</a>
        {["WHATSAPP", "SMS", "EMAIL", "IN_APP"].map((c) => <a key={c} href={`/admin/outbox?channel=${c}`} aria-current={ch === c ? "true" : undefined}>{c.replace("_", "-")}</a>)}
      </div>
      <section className="card pad-0 table-wrap">
        <table className="t">
          <thead><tr><th>When</th><th>Channel</th><th>To</th><th>Message</th></tr></thead>
          <tbody>
            {items.map((n) => (
              <tr key={n.id}><td className="small faint">{fmtShort(n.createdAt)}</td><td><span className="badge">{n.channel}</span></td><td className="small">{n.to}</td><td className="small"><b style={{ fontWeight: 500 }}>{n.title}</b><div className="muted">{n.body}</div></td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
