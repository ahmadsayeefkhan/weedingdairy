import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { InvitationCard } from "@/components/InvitationCard";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Logo } from "@/components/icons";
import { EVENT_META } from "@/lib/constants";
import { fmtDate } from "@/lib/format";
import { selfRsvp } from "../../actions";

export const metadata = { title: "Invitation" };

export default async function InvitePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const w = await db.wedding.findUnique({ where: { publicCode: code }, include: { events: { orderBy: { date: "asc" } } } });
  if (!w || w.visibility === "PRIVATE") notFound();
  const main = w.events.find((e) => e.type === w.inviteTemplate) ?? w.events[0];
  return (
    <main style={{ position: "relative", zIndex: 1, padding: "28px 16px 60px", maxWidth: 560, margin: "0 auto" }} className="stack-lg">
      <div className="ambient" />
      <div className="row" style={{ justifyContent: "center", gap: 8 }}><Logo size={26} /><span className="small">Wedding Diary</span></div>
      <InvitationCard template={w.inviteTemplate} lang={w.inviteLang} message={w.inviteMessage} bride={w.brideName} groom={w.groomName} date={main?.date ?? w.date} venue={main?.venue ?? w.venueName} />
      {w.visibility === "PUBLIC" && (
        <section className="card list">
          {w.events.map((e) => (
            <div key={e.id} className="row between small">
              <span className="evpill" style={{ color: EVENT_META[e.type]?.color, background: EVENT_META[e.type]?.soft }}>{e.name}</span>
              <span className="muted">{fmtDate(e.date)}{e.venue ? ` · ${e.venue}` : ""}</span>
            </div>
          ))}
        </section>
      )}
      <ActionForm action={selfRsvp} className="card stack" reset>
        <h2 style={{ fontSize: 18 }}>RSVP</h2>
        <input type="hidden" name="code" value={code} />
        <div className="form-grid">
          <label className="field"><span>Your name</span><input className="input" name="name" required /></label>
          <label className="field"><span>Mobile</span><input className="input" name="phone" inputMode="tel" placeholder="01711 234567" required /></label>
          <label className="field"><span>Guest of</span><select className="input" name="side"><option value="BRIDE">{w.brideName}&apos;s side</option><option value="GROOM">{w.groomName}&apos;s side</option></select></label>
          <label className="field"><span>Seats</span><select className="input" name="seats">{[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n}>{n}</option>)}</select></label>
        </div>
        <div className="chips">
          <label className="chip" style={{ position: "relative" }}><input type="radio" name="attending" value="yes" defaultChecked />Joyfully accept</label>
          <label className="chip" style={{ position: "relative" }}><input type="radio" name="attending" value="no" />Regretfully decline</label>
        </div>
        <Submit className="btn block">Send RSVP</Submit>
      </ActionForm>
    </main>
  );
}
