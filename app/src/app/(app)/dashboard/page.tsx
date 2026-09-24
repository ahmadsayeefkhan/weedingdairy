import Link from "next/link";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { getDict } from "@/lib/i18n";
import { budgetSummary, guestSummary, paymentState, taskSummary } from "@/lib/services";
import { daysBetween, today } from "@/lib/today";
import { bengaliDate, bnDigits, fmtDate, fmtShort, taka, takaShort } from "@/lib/format";
import { eventMeta, milestoneName } from "@/lib/constants";
import { Bar, EventPill, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ welcome?: string; denied?: string }> }) {
  const sp = await searchParams;
  const { wedding, role } = await requireWedding();
  const { t, locale } = await getDict();
  const t0 = today();
  const [tasks, guests, events, bookings, payments] = await Promise.all([
    taskSummary(db, wedding.id),
    guestSummary(db, wedding.id),
    db.event.findMany({ where: { weddingId: wedding.id }, orderBy: { date: "asc" } }),
    db.booking.findMany({ where: { weddingId: wedding.id, status: { in: ["REQUESTED", "ACCEPTED", "COMPLETED"] } }, include: { vendor: true } }),
    db.payment.findMany({ where: { weddingId: wedding.id, paidAt: null }, include: { booking: { include: { vendor: true } } }, orderBy: { dueDate: "asc" } }),
  ]);
  const budget = can.money(role) ? await budgetSummary(db, wedding.id) : null;
  const days = daysBetween(t0, wedding.date);
  const progress = tasks.total ? Math.round((tasks.done / tasks.total) * 100) : 0;
  const next = events.find((e) => daysBetween(t0, e.date) >= 0);
  const accepted = bookings.filter((b) => b.status !== "REQUESTED").length;
  const n = (x: number | string) => (locale === "bn" ? bnDigits(x) : String(x));

  const dueSoon = payments.filter((p) => daysBetween(t0, p.dueDate) <= 7);
  const alerts: { tone: string; text: React.ReactNode; href: string }[] = [];
  if (guests.pendingParties) alerts.push({ tone: "", text: <><b>{guests.pendingParties}</b> invitations still waiting for an RSVP</>, href: "/guests?status=PENDING" });
  if (budget) for (const p of dueSoon) {
    const st = paymentState(p);
    alerts.push({ tone: st.key === "OVERDUE" ? "bad" : "warn", text: <>{p.booking.vendor.name}: {milestoneName(p.milestone)} of <b>{taka(p.amount)}</b> is {st.label.toLowerCase()}</>, href: "/budget#payments" });
  }
  if (budget) for (const r of budget.rows.filter((r) => r.over)) alerts.push({ tone: "bad", text: <>{r.name} is over budget by <b>{taka(r.committed - r.allocated)}</b></>, href: "/budget" });
  if (tasks.overdue) alerts.push({ tone: "warn", text: <><b>{tasks.overdue}</b> checklist tasks are overdue</>, href: "/checklist" });
  const requested = bookings.filter((b) => b.status === "REQUESTED");
  if (requested.length) alerts.push({ tone: "", text: <><b>{requested.length}</b> booking requests waiting for the vendor&apos;s reply</>, href: "/bookings" });

  return (
    <div className="stack-lg">
      {sp.welcome && <div className="notice ok"><Icon name="sparkle" />Your plan is ready. We added your events, a budget split and a checklist to get you started.</div>}
      {sp.denied && <div className="notice warn"><Icon name="lock" />That page isn&apos;t available for your role. Ask the couple if you need access.</div>}

      <section className="hero">
        <div className="row between wrap" style={{ alignItems: "flex-start", gap: 20, position: "relative", zIndex: 1 }}>
          <div className="stack" style={{ gap: 6 }}>
            <div className="eyebrow">Wedding dashboard</div>
            <h1 style={{ fontSize: "clamp(24px,3.2vw,34px)", fontWeight: 400 }}>{wedding.brideName} &amp; {wedding.groomName}&apos;s Big Day</h1>
            <div style={{ opacity: 0.9 }}>{fmtDate(wedding.date, locale)} · <span className="bn">{bengaliDate(wedding.date)}</span></div>
            {wedding.venueName && <div className="row small" style={{ opacity: 0.9, gap: 6 }}><Icon name="pin" width={15} height={15} />{wedding.venueName}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="count">{days >= 0 ? n(days) : "✓"}</div>
            <div className="eyebrow" style={{ marginTop: 6 }}>{days >= 0 ? t.daysToGo : "Married!"}</div>
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1, marginTop: 22 }}>
          <div className="row between small" style={{ marginBottom: 6 }}><span>{t.planningProgress}</span><b className="num">{n(progress)}%</b></div>
          <div style={{ height: 8, background: "rgba(255,255,255,.3)", borderRadius: 9 }}><div style={{ width: `${progress}%`, height: "100%", background: "#fff", borderRadius: 9 }} /></div>
          <div className="ribbon" style={{ marginTop: 14, maxWidth: 260 }} aria-label="Your events">
            {events.map((e) => <span key={e.id} style={{ background: eventMeta(e.type).color, outline: "1.5px solid rgba(255,255,255,.7)" }} title={e.name} />)}
          </div>
        </div>
      </section>

      <section className="grid g4">
        {budget ? (
          <Stat href="/budget" icon="wallet" label={t.budget} value={takaShort(budget.spent, locale)} hint={<>of {takaShort(budget.total, locale)} {t.spent} · {budget.pctUsed}%</>} />
        ) : (
          <Stat href="/events" icon="calendar" label={t.events} value={n(events.length)} hint={next ? `Next: ${next.name}` : "All done"} />
        )}
        <Stat href="/guests" icon="users" label={t.guests} value={n(guests.invited)} hint={<>{n(guests.confirmed)} {t.confirmed}</>} />
        <Stat href="/bookings" icon="store" label={t.vendors} value={n(bookings.length)} hint={<>{n(accepted)} {t.confirmed}</>} />
        <Stat href="/checklist" icon="checklist" label={t.checklist} value={n(tasks.total)} hint={<>{n(tasks.done)} {t.completed}</>} />
      </section>

      <section className="split">
        <div className="card">
          <div className="card-title"><h2>Needs your attention</h2><Link href="/notifications">All notifications</Link></div>
          {alerts.length ? (
            <div className="list">
              {alerts.slice(0, 6).map((a, i) => (
                <Link key={i} href={a.href} className="row" style={{ gap: 12 }}>
                  <span className={`icon-chip`} style={a.tone === "bad" ? { background: "var(--bad-soft)", color: "var(--bad)" } : a.tone === "warn" ? { background: "var(--warn-soft)", color: "var(--warn)" } : undefined}>
                    <Icon name={a.tone ? "alert" : "bell"} />
                  </span>
                  <span className="grow small">{a.text}</span>
                  <Icon name="arrow" width={16} height={16} className="faint" />
                </Link>
              ))}
            </div>
          ) : <p className="muted small">You&apos;re all caught up. Nothing needs your attention right now.</p>}
        </div>

        <div className="stack-lg">
          {next && (
            <Link href={`/events/${next.id}`} className="card" style={{ background: eventMeta(next.type).color, color: "#fff", border: 0 }}>
              <div className="eyebrow" style={{ color: "rgba(255,255,255,.8)" }}>{t.nextEvent}</div>
              <div style={{ fontSize: 22, marginTop: 4 }}>{locale === "bn" ? eventMeta(next.type).bn : next.name}</div>
              <div className="row between small" style={{ marginTop: 6, opacity: 0.92 }}>
                <span>{fmtDate(next.date, locale)}{next.venue ? ` · ${next.venue}` : ""}</span>
                <span>{daysBetween(t0, next.date) === 0 ? "Today" : `in ${daysBetween(t0, next.date)} days`}</span>
              </div>
            </Link>
          )}
          <div className="card">
            <div className="card-title"><h3>Due this week</h3><Link href="/checklist">Checklist</Link></div>
            {tasks.dueThisWeek.length ? (
              <div className="list">
                {tasks.dueThisWeek.slice(0, 4).map((tk) => (
                  <div key={tk.id} className="row between small"><span className="grow">{tk.title}</span><span className="faint">{tk.dueDate ? fmtShort(tk.dueDate) : ""}</span></div>
                ))}
              </div>
            ) : <p className="small muted">No tasks due in the next 7 days.</p>}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-title"><h2>{t.events}</h2><Link href="/events">Open planner</Link></div>
        <div className="grid g4">
          {events.map((e) => {
            const d = daysBetween(t0, e.date);
            return (
              <Link key={e.id} href={`/events/${e.id}`} className="stack" style={{ gap: 6, padding: 12, borderRadius: 10, background: eventMeta(e.type).soft }}>
                <EventPill type={e.type} bn={locale === "bn"} />
                <div style={{ fontSize: 17 }}>{fmtDate(e.date, locale)}</div>
                <div className="tiny muted ellipsis">{e.venue ?? "Venue not set"}</div>
                <div className="tiny" style={{ color: eventMeta(e.type).color }}>{d > 0 ? `${d} days to go` : d === 0 ? "Today" : "Done"}</div>
              </Link>
            );
          })}
        </div>
      </section>

      {budget && (
        <section className="card">
          <div className="card-title"><h2>Budget snapshot</h2><Link href="/budget">Budget analytics</Link></div>
          <div className="row between small"><span>{taka(budget.spent)} spent</span><span className="muted">{taka(budget.remaining)} remaining</span></div>
          <div className="mt-s"><Bar value={budget.spent} max={budget.total} /></div>
        </section>
      )}
    </div>
  );
}
