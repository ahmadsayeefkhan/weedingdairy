import Link from "next/link";
import { db } from "@/lib/db";
import { requireWedding, can } from "@/lib/wedding";
import { daysBetween, today } from "@/lib/today";
import { fmtShort } from "@/lib/format";
import { eventMeta, TASK_CATEGORIES } from "@/lib/constants";
import { Bar, Empty, PageHead } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { addTask, deleteTask, moveTask, toggleTask } from "./actions";

export const metadata = { title: "Checklist" };

export default async function Checklist({ searchParams }: { searchParams: Promise<{ cat?: string; show?: string }> }) {
  const sp = await searchParams;
  const { wedding, role } = await requireWedding();
  const editable = can.edit(role);
  const all = await db.task.findMany({ where: { weddingId: wedding.id }, orderBy: [{ order: "asc" }, { id: "asc" }], include: { event: true } });
  const events = await db.event.findMany({ where: { weddingId: wedding.id }, orderBy: { date: "asc" } });
  const cat = sp.cat && TASK_CATEGORIES[sp.cat] ? sp.cat : null;
  const tasks = all.filter((t) => (!cat || t.category === cat) && (sp.show !== "open" || !t.done));
  const done = all.filter((t) => t.done).length;
  const t0 = today();
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ cat: cat ?? undefined, show: sp.show, ...o }).filter(([, v]) => v) as [string, string][]);
    const s = p.toString();
    return `/checklist${s ? `?${s}` : ""}`;
  };

  return (
    <div className="stack-lg">
      <PageHead title="Smart checklist" sub="Culturally relevant tasks, generated from your wedding details" />
      <section className="card">
        <div className="row between"><span className="small muted">Overall progress</span><b className="num">{done}/{all.length}</b></div>
        <div className="mt-s"><Bar value={done} max={all.length} /></div>
        {done === all.length && all.length > 0 && <p className="small mt-s" style={{ color: "var(--ok)" }}>Every task is done. Enjoy the celebrations!</p>}
      </section>

      <div className="row between wrap">
        <div className="tabs" aria-label="Filter by category">
          <Link href={q({ cat: "" })} aria-current={!cat ? "true" : undefined}>All tasks</Link>
          {Object.entries(TASK_CATEGORIES).map(([k, v]) => <Link key={k} href={q({ cat: k })} aria-current={cat === k ? "true" : undefined}>{v}</Link>)}
        </div>
        <Link className="chip" href={q({ show: sp.show === "open" ? "" : "open" })} aria-pressed={sp.show === "open"}>Hide completed</Link>
      </div>

      <section className="card">
        {tasks.length === 0 ? <Empty icon="checklist" title="No tasks here">Try another category, or add a task below.</Empty> : (
          <div className="list">
            {tasks.map((t) => {
              const overdue = !t.done && t.dueDate && t.dueDate < t0;
              const d = t.dueDate ? daysBetween(t0, t.dueDate) : null;
              return (
                <div key={t.id} className="row" style={{ gap: 12 }}>
                  {editable ? (
                    <form action={toggleTask}>
                      <input type="hidden" name="id" value={t.id} />
                      <button aria-label={t.done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`} style={{ width: 24, height: 24, borderRadius: 7, border: `1.5px solid ${t.done ? "var(--accent)" : "var(--line-2)"}`, background: t.done ? "var(--accent)" : "var(--paper)", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer" }}>
                        {t.done && <Icon name="check" width={15} height={15} strokeWidth={2.4} />}
                      </button>
                    </form>
                  ) : <Icon name={t.done ? "check" : "clock"} width={18} height={18} style={{ color: t.done ? "var(--ok)" : "var(--ink-3)" }} />}
                  <div className="grow">
                    <div style={{ textDecoration: t.done ? "line-through" : undefined, color: t.done ? "var(--ink-3)" : undefined }}>{t.title}</div>
                    <div className="row wrap tiny" style={{ gap: 6, marginTop: 2 }}>
                      <span className="badge">{TASK_CATEGORIES[t.category]}</span>
                      {t.event && <span className="evpill" style={{ color: eventMeta(t.event.type).color, background: eventMeta(t.event.type).soft, fontSize: 11 }}>{t.event.name}</span>}
                      {t.dueDate && <span className={overdue ? "badge bad" : "faint"}>{overdue ? `Overdue · ${fmtShort(t.dueDate)}` : t.done ? `Due ${fmtShort(t.dueDate)}` : d === 0 ? "Due today" : `Due ${fmtShort(t.dueDate)}`}</span>}
                    </div>
                  </div>
                  {editable && (
                    <div className="row hide-sm" style={{ gap: 2 }}>
                      <form action={moveTask}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="dir" value="up" /><button className="linkish" aria-label="Move up" title="Move up">▲</button></form>
                      <form action={moveTask}><input type="hidden" name="id" value={t.id} /><input type="hidden" name="dir" value="down" /><button className="linkish" aria-label="Move down" title="Move down">▼</button></form>
                      <form action={deleteTask}><input type="hidden" name="id" value={t.id} /><button className="linkish bad" aria-label={`Delete ${t.title}`} title="Delete"><Icon name="trash" width={15} height={15} /></button></form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editable && (
        <section className="card">
          <div className="card-title"><h3>Add a task</h3></div>
          <ActionForm action={addTask} className="form-grid" reset>
            <label className="field" style={{ gridColumn: "1 / -1" }}><span>Task</span><input className="input" name="title" placeholder="e.g. Collect the wedding saree from the tailor" required /></label>
            <label className="field"><span>Category</span><select className="input" name="category" defaultValue={cat ?? "VENUE"}>{Object.entries(TASK_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label className="field"><span>Event</span><select className="input" name="eventId"><option value="">Any</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
            <label className="field"><span>Due</span><input className="input" type="date" name="due" /></label>
            <div style={{ alignSelf: "end" }}><Submit>Add task</Submit></div>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
