"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, Logo, type IconName } from "@/components/icons";

const SLIDES: { icon: IconName; title: string; body: string; ev: string }[] = [
  { icon: "calendar", title: "Plan your day", body: "Holud, Mehendi, Wedding and Reception, each with its own timeline and checklist.", ev: "var(--holud)" },
  { icon: "users", title: "Manage guests", body: "Send invitations, track RSVPs from both families, and seat everyone.", ev: "var(--mehendi)" },
  { icon: "wallet", title: "Track your budget", body: "See every taka against your plan, with reminders before each vendor payment.", ev: "var(--wedding)" },
  { icon: "store", title: "Book trusted vendors", body: "Verified photographers, venues and caterers, with reviews from real couples.", ev: "var(--reception)" },
];

export default function Onboarding() {
  const [splash, setSplash] = useState(true);
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1600);
    return () => clearTimeout(t);
  }, []);

  if (splash) {
    return (
      <main className="center-page splash" onClick={() => setSplash(false)} style={{ cursor: "pointer" }}>
        <div style={{ textAlign: "center", display: "grid", gap: 16, justifyItems: "center" }}>
          <div style={{ width: 96, height: 96, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,.7)", display: "grid", placeItems: "center" }}>
            <Logo size={56} color="#fff" />
          </div>
          <div style={{ fontSize: 40, fontWeight: 300, lineHeight: 1 }}>Wedding<br />Diary</div>
          <div style={{ letterSpacing: "0.5em", fontSize: 12, opacity: 0.85 }}>BANGLADESH</div>
        </div>
      </main>
    );
  }

  const s = SLIDES[i];
  const last = i === SLIDES.length - 1;
  return (
    <main className="center-page">
      <div className="ambient" />
      <div className="auth-card card stack-lg" style={{ padding: 28, textAlign: "center" }}>
        <div className="row between">
          <span className="row" style={{ gap: 8 }}><Logo size={24} /><span className="small">Wedding Diary</span></span>
          <Link href="/login" className="linkish">Skip</Link>
        </div>
        <div style={{ margin: "18px auto 4px", width: 128, height: 128, borderRadius: 32, display: "grid", placeItems: "center", background: "var(--coral-soft)", color: "var(--coral-ink)", position: "relative" }}>
          <Icon name={s.icon} width={52} height={52} />
          <span style={{ position: "absolute", bottom: -6, left: 30, right: 30, height: 5, borderRadius: 9, background: s.ev }} />
        </div>
        <div className="stack">
          <h1 style={{ fontSize: 26, color: "var(--coral-ink)" }}>{s.title}</h1>
          <p className="muted">{s.body}</p>
        </div>
        <div className="row" style={{ justifyContent: "center", gap: 6 }} aria-label={`Step ${i + 1} of ${SLIDES.length}`}>
          {SLIDES.map((_, k) => (
            <button key={k} onClick={() => setI(k)} aria-label={`Go to step ${k + 1}`} style={{ width: k === i ? 22 : 8, height: 8, borderRadius: 9, border: 0, background: k === i ? "var(--coral)" : "var(--line-2)", transition: "width .2s", cursor: "pointer" }} />
          ))}
        </div>
        {last ? (
          <div className="stack">
            <Link href="/signup" className="btn block">Start planning</Link>
            <Link href="/login" className="btn quiet block">I already have an account</Link>
          </div>
        ) : (
          <button className="btn block" onClick={() => setI(i + 1)}>Next</button>
        )}
        <p className="tiny faint">Powered by WeddingOS.ai</p>
      </div>
    </main>
  );
}
