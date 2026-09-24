import { db } from "@/lib/db";
import { requireSystemRole } from "@/lib/auth";
import { fmtShort } from "@/lib/format";
import { Empty, PageHead, Stat } from "@/components/ui";

export const metadata = { title: "AI log · Admin" };

export default async function AiLog() {
  await requireSystemRole("ADMIN");
  const logs = await db.aiLog.findMany({ include: { user: true, wedding: true }, orderBy: { createdAt: "desc" }, take: 200 });
  const cost = logs.reduce((a, l) => a + l.costUsd, 0);
  const claude = logs.filter((l) => l.mode.startsWith("claude")).length;
  return (
    <div className="stack-lg">
      <PageHead title="AI question log" sub="Every question to Wedding AI: who asked, which tools ran, tokens and cost" />
      <section className="grid g3">
        <Stat icon="sparkle" label="Questions" value={logs.length} />
        <Stat icon="chart" label="Answered by Claude" value={claude} hint={`${logs.length - claude} scripted (offline)`} />
        <Stat icon="wallet" label="API cost" value={`$${cost.toFixed(4)}`} hint="estimated from token usage" />
      </section>
      <section className="card pad-0 table-wrap">
        {logs.length === 0 ? <Empty icon="sparkle" title="No questions yet" /> : (
          <table className="t">
            <thead><tr><th>When</th><th>Who</th><th>Question and answer</th><th className="hide-sm">Mode · tools</th><th className="right hide-sm">Tokens</th></tr></thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="small faint">{fmtShort(l.createdAt)}</td>
                  <td className="small">{l.user.name}<div className="tiny faint">{l.wedding ? `${l.wedding.brideName} & ${l.wedding.groomName}` : ""}</div></td>
                  <td className="small"><b style={{ fontWeight: 500 }}>{l.question}</b><div className="muted" style={{ whiteSpace: "pre-wrap", maxWidth: 520 }}>{l.answer.slice(0, 300)}{l.answer.length > 300 ? "…" : ""}</div></td>
                  <td className="hide-sm small"><span className={`badge ${l.mode === "scripted" ? "" : "accent"}`}>{l.mode}</span><div className="tiny faint">{l.tools || "no tools"}</div></td>
                  <td className="right hide-sm num small">{l.tokensIn + l.tokensOut || "–"}{l.costUsd ? <div className="tiny faint">${l.costUsd.toFixed(4)}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
