"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { askAssistant } from "./actions";

type Msg = { role: "user" | "assistant"; text: string; mode?: string };

export default function Chat({ greeting, suggestions, live }: { greeting: string; suggestions: string[]; live: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", text: greeting }]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [msgs, pending]);

  function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setError(null);
    const history = msgs.slice(1).map(({ role, text }) => ({ role, text }));
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    start(async () => {
      const r = await askAssistant(q, history);
      if (r.ok) setMsgs((m) => [...m, { role: "assistant", text: r.answer, mode: r.mode }]);
      else setError(r.error);
    });
  }

  return (
    <div className="card pad-0" style={{ display: "grid", gridTemplateRows: "auto 1fr auto", height: "min(72vh, 720px)" }}>
      <div className="row between" style={{ padding: "14px 18px", borderBottom: "1px solid var(--line)" }}>
        <div className="row" style={{ gap: 10 }}>
          <span className="avatar" style={{ background: "var(--coral)", color: "#fff" }}><Icon name="sparkle" width={16} height={16} /></span>
          <div><div>Wedding AI</div><div className="tiny" style={{ color: "var(--ok)" }}>● {live ? "Online · Claude" : "Offline mode · answers from your data"}</div></div>
        </div>
      </div>
      <div style={{ overflowY: "auto", padding: 18, display: "grid", gap: 12, alignContent: "start" }} aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} style={{ justifySelf: m.role === "user" ? "end" : "start", maxWidth: "82%" }}>
            <div style={{ whiteSpace: "pre-wrap", padding: "10px 14px", borderRadius: 14, fontSize: 14.5, ...(m.role === "user" ? { background: "var(--coral)", color: "#fff", borderBottomRightRadius: 4 } : { background: "var(--coral-soft)", borderBottomLeftRadius: 4 }) }}>{m.text}</div>
            {m.mode === "scripted" && <div className="tiny faint" style={{ marginTop: 3 }}>scripted</div>}
          </div>
        ))}
        {pending && <div className="small muted" style={{ fontStyle: "italic" }}>Wedding AI is checking your plan…</div>}
        {error && <p className="form-msg err">{error}</p>}
        <div ref={end} />
      </div>
      <div style={{ padding: 12, borderTop: "1px solid var(--line)", display: "grid", gap: 10 }}>
        <div className="chips">{suggestions.map((s) => <button key={s} className="chip" onClick={() => send(s)} disabled={pending} style={{ fontSize: 12.5 }}>{s}</button>)}</div>
        <form className="row" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything about your wedding… (English, বাংলা or Banglish)" aria-label="Your question" maxLength={1000} />
          <button className="btn" disabled={pending || !input.trim()} aria-label="Send"><Icon name="send" /></button>
        </form>
      </div>
    </div>
  );
}
