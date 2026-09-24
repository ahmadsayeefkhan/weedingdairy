import { bengaliDate, fmtDate, fmtDay } from "@/lib/format";

const THEMES: Record<string, { bg: string; ink: string; accent: string; bnTitle: string; enTitle: string; motif: string }> = {
  HOLUD: { bg: "linear-gradient(160deg,#fff4d6,#f9d77e 70%,#f2b640)", ink: "#5a3a06", accent: "#c98a12", bnTitle: "গায়ে হলুদ", enTitle: "Gaye Holud", motif: "#e59a12" },
  WEDDING: { bg: "linear-gradient(160deg,#fffaf7,#fbe6e2 70%,#f5c9c0)", ink: "#5b2a22", accent: "#d97566", bnTitle: "শুভ বিবাহ", enTitle: "Save the Date", motif: "#d97566" },
  RECEPTION: { bg: "linear-gradient(160deg,#f6f0fa,#e3d4ee 70%,#c7aedb)", ink: "#34214a", accent: "#7a5c8e", bnTitle: "বৌভাত", enTitle: "Reception", motif: "#b08a3e" },
};

/** The digital invitation, used in the designer preview and on the public RSVP pages. */
export function InvitationCard({ template, lang, message, bride, groom, date, venue }: { template: string; lang: string; message: string; bride: string; groom: string; date: Date; venue?: string | null }) {
  const th = THEMES[template] ?? THEMES.WEDDING;
  const en = lang !== "BN";
  const bn = lang !== "EN";
  return (
    <div style={{ background: th.bg, color: th.ink, borderRadius: 18, padding: "34px 26px", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "var(--shadow-lg)", maxWidth: 380, margin: "0 auto" }}>
      <svg aria-hidden viewBox="0 0 200 40" style={{ position: "absolute", top: 0, left: 0, right: 0, width: "100%", opacity: 0.55 }}>
        {Array.from({ length: 21 }, (_, i) => <circle key={i} cx={i * 10} cy={6 + 10 * Math.abs(Math.sin(i / 3))} r={3.4} fill={th.motif} />)}
      </svg>
      <div className="stack" style={{ gap: 10, position: "relative" }}>
        {bn && <div className="bn" style={{ fontSize: 26, color: th.accent, marginTop: 10 }}>{th.bnTitle}</div>}
        {en && <div style={{ fontSize: 11, letterSpacing: "0.34em", textTransform: "uppercase", color: th.accent }}>{th.enTitle}</div>}
        {en && <div style={{ fontStyle: "italic", fontWeight: 300, fontSize: 14 }}>{message}</div>}
        <div style={{ fontSize: 38, fontWeight: 300, lineHeight: 1.05, margin: "6px 0" }}>{bride}<div style={{ fontSize: 22, color: th.accent }}>&amp;</div>{groom}</div>
        <div style={{ width: 60, height: 1, background: th.accent, margin: "0 auto" }} />
        {en && <div style={{ fontSize: 17 }}>{fmtDay(date)}, {fmtDate(date)}</div>}
        {bn && <div className="bn" style={{ fontSize: 16 }}>{fmtDate(date, "bn")} · {bengaliDate(date)}</div>}
        {venue && <div style={{ fontSize: 14 }}>{venue}</div>}
        {bn && <div className="bn small" style={{ opacity: 0.8 }}>আপনার উপস্থিতি একান্ত কাম্য</div>}
      </div>
    </div>
  );
}
