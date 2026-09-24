import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { InvitationCard } from "@/components/InvitationCard";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Logo } from "@/components/icons";
import { DIET_TAGS, EVENT_META } from "@/lib/constants";
import { fmtDate, fmtShort } from "@/lib/format";
import { submitRsvp } from "../../actions";

export const metadata = { title: "RSVP", robots: { index: false } };

export default async function RsvpPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const guest = await db.guest.findUnique({ where: { rsvpToken: token }, include: { wedding: { include: { events: { orderBy: { date: "asc" } } } } } });
  if (!guest) notFound();
  const w = guest.wedding;
  const invited = w.events.filter((e) => guest.events.split(",").includes(e.type));
  const main = w.events.find((e) => e.type === w.inviteTemplate) ?? invited[0];
  const diet = (guest.diet ?? "").split(",");

  return (
    <main style={{ position: "relative", zIndex: 1, padding: "28px 16px 60px", maxWidth: 560, margin: "0 auto" }} className="stack-lg">
      <div className="ambient" />
      <div className="row" style={{ justifyContent: "center", gap: 8 }}><Logo size={26} /><span className="small">Wedding Diary</span></div>
      <InvitationCard template={w.inviteTemplate} lang={w.inviteLang} message={w.inviteMessage} bride={w.brideName} groom={w.groomName} date={main?.date ?? w.date} venue={main?.venue ?? w.venueName} />

      <section className="card stack">
        <div>
          <div className="eyebrow">Dear</div>
          <h1 style={{ fontSize: 24 }}>{guest.name}</h1>
          <p className="small muted">You&apos;re invited to {invited.length === 1 ? "this event" : `${invited.length} events`}{guest.invitedSeats > 1 ? `, with up to ${guest.invitedSeats} seats for your family` : ""}.</p>
        </div>
        <div className="list">
          {invited.map((e) => (
            <div key={e.id} className="row between small">
              <span className="evpill" style={{ color: EVENT_META[e.type]?.color, background: EVENT_META[e.type]?.soft }}>{e.name}</span>
              <span className="muted">{fmtDate(e.date)}{e.venue ? ` · ${e.venue}` : ""}</span>
            </div>
          ))}
        </div>
        {guest.respondedAt && (
          <p className={`form-msg ${guest.status === "CONFIRMED" ? "ok" : "err"}`}>
            Your answer ({fmtShort(guest.respondedAt)}): {guest.status === "CONFIRMED" ? `attending, ${guest.confirmedSeats} seat${guest.confirmedSeats > 1 ? "s" : ""}` : "not attending"}. You can change it below.
          </p>
        )}
      </section>

      <ActionForm action={submitRsvp} className="card stack-lg">
        <input type="hidden" name="token" value={guest.rsvpToken} />
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Will you attend?</span>
          <div className="chips">
            <label className="chip" style={{ position: "relative" }}><input type="radio" name="attending" value="yes" defaultChecked={guest.status !== "DECLINED"} required />Joyfully accept</label>
            <label className="chip" style={{ position: "relative" }}><input type="radio" name="attending" value="no" defaultChecked={guest.status === "DECLINED"} />Regretfully decline</label>
          </div>
        </fieldset>
        <label className="field" style={{ maxWidth: 200 }}>
          <span>How many seats?</span>
          <select className="input" name="seats" defaultValue={guest.confirmedSeats || guest.invitedSeats}>
            {Array.from({ length: guest.invitedSeats }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
          </select>
        </label>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Dietary needs</span>
          <div className="chips">{Object.entries(DIET_TAGS).map(([k, v]) => <label key={k} className="chip" style={{ position: "relative" }}><input type="checkbox" name="diet" value={k} defaultChecked={diet.includes(k)} />{v}</label>)}</div>
        </fieldset>
        <label className="field"><span>Anything else for the caterer?</span><input className="input" name="dietNote" defaultValue={guest.dietNote ?? ""} maxLength={200} placeholder="e.g. one child, no spicy food" /></label>
        <Submit className="btn block" pendingText="Sending…">Send RSVP</Submit>
      </ActionForm>
      <p className="tiny faint" style={{ textAlign: "center" }}>Wedding Diary · Powered by WeddingOS.ai</p>
    </main>
  );
}
