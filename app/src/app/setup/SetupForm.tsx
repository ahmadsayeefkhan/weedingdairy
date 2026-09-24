"use client";
import { useMemo, useState } from "react";
import { ActionForm, Submit } from "@/components/ActionForm";
import { CITIES, EVENT_META, EVENT_TYPES, VENUE_SUGGESTIONS } from "@/lib/constants";
import { bengaliDate, fmtDate, groupLakh } from "@/lib/format";
import { completeSetup } from "./actions";

export default function SetupForm({ minDate, defaultDate }: { minDate: string; defaultDate: string }) {
  const [date, setDate] = useState(defaultDate);
  const [budget, setBudget] = useState(1500000);
  const [city, setCity] = useState("Dhaka");
  const d = useMemo(() => (date ? new Date(`${date}T00:00:00Z`) : null), [date]);
  const venues = VENUE_SUGGESTIONS.filter((v) => city === "Dhaka" ? v.includes("Dhaka") : !v.includes("Dhaka"));
  return (
    <ActionForm action={completeSetup} className="stack-lg">
      <div className="form-grid">
        <label className="field"><span>Bride&apos;s name</span><input className="input" name="bride" required placeholder="e.g. Ayesha" /></label>
        <label className="field"><span>Groom&apos;s name</span><input className="input" name="groom" required placeholder="e.g. Rahul" /></label>
      </div>
      <label className="field">
        <span>Wedding date</span>
        <input className="input" type="date" name="date" min={minDate} value={date} onChange={(e) => setDate(e.target.value)} required />
        {d && !isNaN(d.getTime()) && (
          <span className="small muted" style={{ textTransform: "none", letterSpacing: 0 }}>
            {fmtDate(d)} · <span className="bn">{bengaliDate(d)}</span> (Bangla calendar)
          </span>
        )}
      </label>
      <div className="form-grid">
        <label className="field"><span>City</span>
          <select className="input" name="city" value={city} onChange={(e) => setCity(e.target.value)}>{CITIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="field"><span>Venue (optional)</span>
          <input className="input" name="venue" list="venues" placeholder="Start typing a venue" />
          <datalist id="venues">{venues.map((v) => <option key={v} value={v} />)}</datalist>
        </label>
      </div>
      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <span>Events</span>
        <div className="chips">
          {EVENT_TYPES.map((t) => (
            <label key={t} className="chip" style={{ position: "relative" }}>
              <input type="checkbox" name="events" value={t} defaultChecked={t === "HOLUD" || t === "WEDDING" || t === "RECEPTION"} />
              <span style={{ width: 8, height: 8, borderRadius: 9, background: EVENT_META[t].color, display: "inline-block" }} />
              {EVENT_META[t].name}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Budget range</span>
        <input type="range" min={100000} max={10000000} step={50000} value={budget} onChange={(e) => setBudget(Number(e.target.value))} style={{ accentColor: "var(--accent)" }} aria-valuetext={`৳${groupLakh(budget)}`} />
        <input type="hidden" name="budget" value={budget} />
        <span style={{ fontSize: 22, textTransform: "none", letterSpacing: 0, color: "var(--ink)" }} className="num">৳{groupLakh(budget)}</span>
      </label>
      <Submit className="btn block" pendingText="Building your plan…">Continue to dashboard</Submit>
    </ActionForm>
  );
}
