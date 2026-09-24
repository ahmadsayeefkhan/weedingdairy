import { db } from "@/lib/db";
import { requireWedding } from "@/lib/wedding";
import { budgetSummary, paymentState } from "@/lib/services";
import { today, toDateInput } from "@/lib/today";
import { fmtDate, fmtShort, groupLakh, taka, takaShort } from "@/lib/format";
import { categoryColor, milestoneName } from "@/lib/constants";
import { Bar, Donut, Empty, PageHead } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { PrintButton } from "@/components/PrintButton";
import { Icon } from "@/components/icons";
import { addExpense, deleteExpense, payMilestone, toggleExpense, updateAllocations } from "./actions";

export const metadata = { title: "Budget" };

export default async function BudgetPage() {
  const { wedding } = await requireWedding(["COUPLE"]);
  const s = await budgetSummary(db, wedding.id);
  const expenses = await db.expense.findMany({ where: { weddingId: wedding.id }, include: { category: true }, orderBy: { date: "desc" } });
  const payments = await db.payment.findMany({ where: { weddingId: wedding.id }, include: { booking: { include: { vendor: true } } }, orderBy: { dueDate: "asc" } });
  const unpaid = payments.filter((p) => !p.paidAt);
  const upcomingTotal = unpaid.reduce((a, p) => a + p.amount, 0);
  const pending = expenses.filter((e) => e.status === "PENDING").reduce((a, e) => a + e.amount, 0);
  // Savings hint, deterministic: largest over-allocated category
  const over = s.rows.filter((r) => r.over).sort((a, b) => b.committed - b.allocated - (a.committed - a.allocated))[0];
  const under = s.rows.filter((r) => r.committed < r.allocated * 0.5 && r.allocated > 0).sort((a, b) => b.allocated - b.committed - (a.allocated - a.committed))[0];

  return (
    <div className="stack-lg">
      <PageHead title="Budget analytics" sub="Financial clarity for your big day">
        <PrintButton label="Export PDF report" />
      </PageHead>

      <section className="grid" style={{ gridTemplateColumns: "minmax(0,1fr)" }}>
        <div className="card row wrap" style={{ gap: 28, alignItems: "center" }}>
          <Donut
            size={200}
            segments={s.rows.map((r) => ({ label: r.name, value: r.spent, color: categoryColor(r.key) }))}
            center={<div><div className="num" style={{ fontSize: 30 }}>{s.pctUsed}%</div><div className="tiny muted">used</div></div>}
          />
          <div className="grow stack" style={{ minWidth: 240 }}>
            <div className="eyebrow">Total budget</div>
            <div className="num" style={{ fontSize: 36, letterSpacing: "-.02em" }}>{taka(s.total)}</div>
            <div className="grid g3" style={{ gap: 10 }}>
              <div><div className="tiny muted">Spent</div><div className="num" style={{ fontSize: 18 }}>{taka(s.spent)}</div></div>
              <div><div className="tiny muted">Remaining</div><div className="num" style={{ fontSize: 18 }}>{taka(s.remaining)}</div></div>
              <div><div className="tiny muted">Still to pay</div><div className="num" style={{ fontSize: 18 }}>{taka(upcomingTotal + pending)}</div></div>
            </div>
            <Bar value={s.spent} max={s.total} />
            {(over || under) && (
              <div className="notice" style={{ marginTop: 4 }}>
                <Icon name="sparkle" />
                <span className="small">
                  <b>Smart insight · </b>
                  {over && <>{over.name} is {taka(over.committed - over.allocated)} over plan. </>}
                  {under && over && <>{under.name} has {taka(under.allocated - under.committed)} unused. Moving some of it would cover the gap.</>}
                  {under && !over && <>{under.name} has {taka(under.allocated - under.committed)} unused so far.</>}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title"><h2>Category breakdown</h2><span className="small muted">Committed = paid + pending</span></div>
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>Category</th><th className="right">Allocated</th><th className="right">Spent</th><th className="right hide-sm">Committed</th><th style={{ width: "30%" }} className="hide-sm">Progress</th></tr></thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.id}>
                  <td><span className="row" style={{ gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: categoryColor(r.key) }} />{r.name}{r.over && <span className="badge bad">Over</span>}</span></td>
                  <td className="right num">{taka(r.allocated)}</td>
                  <td className="right num">{taka(r.spent)}</td>
                  <td className="right num hide-sm">{taka(r.committed)}</td>
                  <td className="hide-sm"><Bar value={r.committed} max={r.allocated} thin /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <details className="drawer mt no-print">
          <summary className="linkish">Adjust allocations</summary>
          <ActionForm action={updateAllocations} className="stack">
            <label className="field" style={{ maxWidth: 260 }}><span>Total budget (৳)</span><input className="input num" name="total" inputMode="numeric" defaultValue={s.total} required /></label>
            <div className="form-grid">
              {s.rows.map((r) => <label key={r.id} className="field"><span>{r.name}</span><input className="input num" name={`c_${r.id}`} inputMode="numeric" defaultValue={r.allocated} /></label>)}
            </div>
            <div><Submit>Save allocations</Submit></div>
          </ActionForm>
        </details>
      </section>

      <section className="card" id="payments">
        <div className="card-title"><h2>Payment scheduler</h2><span className="small muted">Booking · Advance · Final Settlement</span></div>
        {payments.length === 0 ? <Empty icon="wallet" title="No vendor payments yet">When a vendor accepts your booking, its payment milestones appear here.</Empty> : (
          <div className="list">
            {payments.map((p) => {
              const st = paymentState(p);
              return (
                <div key={p.id} className="row wrap" style={{ gap: 12 }}>
                  <span className="icon-chip" style={st.tone === "ok" ? { background: "var(--ok-soft)", color: "var(--ok)" } : st.tone === "bad" ? { background: "var(--bad-soft)", color: "var(--bad)" } : st.tone === "warn" ? { background: "var(--warn-soft)", color: "var(--warn)" } : undefined}>
                    <Icon name={st.key === "PAID" ? "check" : "clock"} />
                  </span>
                  <div className="grow" style={{ minWidth: 160 }}>
                    <div>{p.booking.vendor.name} · {milestoneName(p.milestone)}</div>
                    <div className="tiny muted">{p.paidAt ? `Paid ${fmtShort(p.paidAt)} · ${p.method ?? ""}` : `Due ${fmtDate(p.dueDate)}`}</div>
                  </div>
                  <span className={`badge ${st.tone}`}>{st.label}</span>
                  <b className="num" style={{ minWidth: 100, textAlign: "right" }}>{taka(p.amount)}</b>
                  {!p.paidAt && (
                    <details className="drawer no-print" style={{ width: "100%" }}>
                      <summary className="linkish" style={{ textAlign: "right" }}>Pay now</summary>
                      <ActionForm action={payMilestone} className="row wrap" >
                        <input type="hidden" name="id" value={p.id} />
                        <span className="small muted grow">Sandbox checkout. No money moves.</span>
                        <select className="input" name="method" style={{ width: 160 }}>{["bKash", "Nagad", "Card", "Bank transfer", "Cash"].map((m) => <option key={m}>{m}</option>)}</select>
                        <Submit pendingText="Processing…">Pay {taka(p.amount)}</Submit>
                      </ActionForm>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-title"><h2>Expenses</h2><span className="small muted">{expenses.length} recorded</span></div>
        <details className="drawer no-print">
          <summary className="btn ghost sm" style={{ display: "inline-flex" }}><Icon name="plus" />Log an expense</summary>
          <ActionForm action={addExpense} className="form-grid" reset>
            <label className="field" style={{ gridColumn: "1 / -1" }}><span>What was it for?</span><input className="input" name="title" placeholder="e.g. Holud flowers from Shahbag" required /></label>
            <label className="field"><span>Category</span><select className="input" name="categoryId">{s.rows.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
            <label className="field"><span>Amount (৳)</span><input className="input num" name="amount" inputMode="numeric" placeholder="25000" required /></label>
            <label className="field"><span>Date</span><input className="input" type="date" name="date" defaultValue={toDateInput(today())} /></label>
            <label className="field"><span>Status</span><select className="input" name="status"><option value="PAID">Paid</option><option value="PENDING">Pending</option></select></label>
            <div style={{ alignSelf: "end" }}><Submit>Add expense</Submit></div>
          </ActionForm>
        </details>
        {expenses.length === 0 ? <Empty icon="wallet" title="No expenses yet">Log what you&apos;ve spent so far to see where your budget stands.</Empty> : (
          <div className="table-wrap mt">
            <table className="t">
              <thead><tr><th>Expense</th><th className="hide-sm">Category</th><th className="hide-sm">Date</th><th>Status</th><th className="right">Amount</th><th className="no-print" /></tr></thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td className="hide-sm"><span className="row" style={{ gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: categoryColor(e.category.key) }} />{e.category.name}</span></td>
                    <td className="hide-sm faint">{fmtShort(e.date)}</td>
                    <td>
                      {e.paymentId ? <span className={`badge ${e.status === "PAID" ? "ok" : "warn"}`}>{e.status}</span> : (
                        <form action={toggleExpense}><input type="hidden" name="id" value={e.id} /><button className={`badge ${e.status === "PAID" ? "ok" : "warn"}`} style={{ border: 0, cursor: "pointer" }} title="Toggle paid / pending">{e.status}</button></form>
                      )}
                    </td>
                    <td className="right num">{taka(e.amount)}</td>
                    <td className="no-print">{!e.paymentId && <form action={deleteExpense}><input type="hidden" name="id" value={e.id} /><button className="linkish bad" aria-label={`Delete ${e.title}`}><Icon name="trash" width={15} height={15} /></button></form>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <p className="tiny faint">Report generated {fmtDate(today())} · {wedding.brideName} &amp; {wedding.groomName} · amounts in Bangladeshi taka ({takaShort(s.total)} = ৳{groupLakh(s.total)})</p>
    </div>
  );
}
