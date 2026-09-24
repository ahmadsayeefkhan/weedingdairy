"use client";
import { useState } from "react";
import { ActionForm, Submit } from "@/components/ActionForm";
import { InvitationCard } from "@/components/InvitationCard";
import { saveInvitation } from "./actions";

export default function Designer(p: { template: string; lang: string; message: string; bride: string; groom: string; date: string; venue: string | null }) {
  const [template, setTemplate] = useState(p.template);
  const [lang, setLang] = useState(p.lang);
  const [message, setMessage] = useState(p.message);
  return (
    <div className="split">
      <div className="card" style={{ background: "var(--navy)", borderColor: "var(--navy-2)", padding: 28 }}>
        <InvitationCard template={template} lang={lang} message={message} bride={p.bride} groom={p.groom} date={new Date(p.date)} venue={p.venue} />
      </div>
      <ActionForm action={saveInvitation} className="card stack-lg">
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Template</span>
          <div className="chips">
            {[["HOLUD", "Gaye Holud"], ["WEDDING", "Wedding"], ["RECEPTION", "Reception"]].map(([k, v]) => (
              <label key={k} className="chip" style={{ position: "relative" }}><input type="radio" name="template" value={k} checked={template === k} onChange={() => setTemplate(k)} />{v}</label>
            ))}
          </div>
        </fieldset>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Language</span>
          <div className="chips">
            {[["EN", "English"], ["BN", "বাংলা"], ["BOTH", "Both"]].map(([k, v]) => (
              <label key={k} className="chip" style={{ position: "relative" }}><input type="radio" name="lang" value={k} checked={lang === k} onChange={() => setLang(k)} />{v}</label>
            ))}
          </div>
        </fieldset>
        <label className="field"><span>Message</span><textarea className="input" name="message" maxLength={160} value={message} onChange={(e) => setMessage(e.target.value)} /></label>
        <Submit>Save invitation</Submit>
      </ActionForm>
    </div>
  );
}
