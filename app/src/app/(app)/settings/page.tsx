import { requireWedding } from "@/lib/wedding";
import { getDict } from "@/lib/i18n";
import { CITIES } from "@/lib/constants";
import { toDateInput } from "@/lib/today";
import { initials } from "@/lib/format";
import { PageHead } from "@/components/ui";
import { ActionForm, Submit } from "@/components/ActionForm";
import { Icon } from "@/components/icons";
import { setLocale } from "../../(auth)/actions";
import { saveSettings } from "./actions";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const { wedding, user } = await requireWedding(["COUPLE"]);
  const { locale } = await getDict();
  const prefs = wedding.notifyPrefs.split(",");
  return (
    <div className="stack-lg">
      <PageHead title="Settings & privacy" sub="Complete control over your wedding data" />
      <section className="card row" style={{ gap: 14 }}>
        <span className="avatar lg">{initials(`${wedding.brideName} ${wedding.groomName}`)}</span>
        <div className="grow"><div style={{ fontSize: 18 }}>{wedding.brideName} &amp; {wedding.groomName}</div><div className="small muted">{user.email} · Free plan</div></div>
      </section>
      <ActionForm action={saveSettings} className="stack-lg">
        <section className="card stack">
          <h2 style={{ fontSize: 17 }}>Wedding details</h2>
          <div className="form-grid">
            <label className="field"><span>Bride</span><input className="input" name="bride" defaultValue={wedding.brideName} /></label>
            <label className="field"><span>Groom</span><input className="input" name="groom" defaultValue={wedding.groomName} /></label>
            <label className="field"><span>Wedding date</span><input className="input" type="date" name="date" defaultValue={toDateInput(wedding.date)} /></label>
            <label className="field"><span>City</span><select className="input" name="city" defaultValue={wedding.city}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="field" style={{ gridColumn: "1 / -1" }}><span>Main venue</span><input className="input" name="venue" defaultValue={wedding.venueName ?? ""} /></label>
          </div>
          <label className="row small" style={{ gap: 8 }}><input type="checkbox" name="moveEvents" defaultChecked style={{ accentColor: "var(--coral)", width: 18, height: 18 }} />If the date changes, move my events and open task deadlines by the same number of days</label>
        </section>
        <section className="card stack">
          <h2 style={{ fontSize: 17 }}>Privacy</h2>
          <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
            <span>Who can see your invitation page</span>
            <div className="chips">
              {[["PUBLIC", "Public: event list visible"], ["GUEST_ONLY", "Guest-only: invitation, no event list"], ["PRIVATE", "Private: shared link off"]].map(([k, v]) => (
                <label key={k} className="chip" style={{ position: "relative" }}><input type="radio" name="visibility" value={k} defaultChecked={wedding.visibility === k} />{v}</label>
              ))}
            </div>
          </fieldset>
          <label className="row small" style={{ gap: 8 }}><input type="checkbox" name="autoApprove" defaultChecked={wedding.photoAutoApprove} style={{ accentColor: "var(--coral)", width: 18, height: 18 }} />Show guest photos on the live wall without approval</label>
        </section>
        <section className="card stack">
          <h2 style={{ fontSize: 17 }}>Notifications</h2>
          <div className="chips">
            {[["rsvp", "New RSVPs"], ["payments", "Payment reminders (48h before)"], ["tasks", "Task reminders"]].map(([k, v]) => (
              <label key={k} className="chip" style={{ position: "relative" }}><input type="checkbox" name="prefs" value={k} defaultChecked={prefs.includes(k)} />{v}</label>
            ))}
          </div>
        </section>
        <div><Submit>Save settings</Submit></div>
      </ActionForm>
      <section className="card row between wrap">
        <form action={setLocale} className="row" style={{ gap: 6 }}>
          <input type="hidden" name="back" value="/settings" />
          <span className="small muted">Language</span>
          <button name="lang" value="en" className={`chip${locale === "en" ? " on" : ""}`}>English</button>
          <button name="lang" value="bn" className={`chip bn${locale === "bn" ? " on" : ""}`}>বাংলা</button>
        </form>
        <a className="btn quiet" href="/api/export"><Icon name="download" />Download all my wedding data</a>
      </section>
      <section className="card stack">
        <h2 style={{ fontSize: 17 }}>Security</h2>
        <p className="small muted">Two-factor authentication and FaceID app lock arrive with the native app (later version).</p>
      </section>
    </div>
  );
}
