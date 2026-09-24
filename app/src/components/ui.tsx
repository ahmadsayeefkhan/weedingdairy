import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./icons";
import { eventMeta } from "@/lib/constants";

export function PageHead({ title, sub, children }: { title: string; sub?: string; children?: ReactNode }) {
  return (
    <div className="head">
      <div className="head-title">
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {children && <div className="head-actions">{children}</div>}
    </div>
  );
}

export function Stat({ icon, label, value, hint, href }: { icon: IconName; label: string; value: ReactNode; hint?: ReactNode; href?: string }) {
  const body = (
    <div className="card stat" style={{ height: "100%" }}>
      <div className="label"><span className="icon-chip"><Icon name={icon} /></span>{label}</div>
      <div className="value">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
  return href ? <Link href={href} style={{ display: "block" }}>{body}</Link> : body;
}

export function Empty({ icon = "sparkle", title, children }: { icon?: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <Icon name={icon} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function EventPill({ type, name, bn }: { type: string; name?: string; bn?: boolean }) {
  const m = eventMeta(type);
  return <span className="evpill" style={{ color: m.color, background: m.soft }}>{name ?? (bn ? m.bn : m.name)}</span>;
}

export function Bar({ value, max, thin }: { value: number; max: number; thin?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return <div className={`bar${thin ? " thin" : ""}${value > max ? " over" : ""}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${pct}%` }} /></div>;
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="row" style={{ gap: 2, color: "#e0a526" }} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Icon key={i} name="star" width={size} height={size} fill={i <= Math.round(value) ? "currentColor" : "none"} />
      ))}
    </span>
  );
}

/** Donut chart from segments; plain SVG, no library. */
export function Donut({ segments, size = 180, stroke = 22, center }: { segments: { value: number; color: string; label: string }[]; size?: number; stroke?: number; center?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((a, s) => a + s.value, 0);
  let offset = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={segments.map((s) => `${s.label} ${Math.round((s.value / (total || 1)) * 100)}%`).join(", ")}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--coral-soft)" strokeWidth={stroke} />
        {total > 0 && segments.filter((s) => s.value > 0).map((s) => {
          const len = (s.value / total) * c;
          const el = (
            <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <title>{s.label}</title>
            </circle>
          );
          offset += len;
          return el;
        })}
      </svg>
      {center && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>{center}</div>}
    </div>
  );
}

export function Denied() {
  return <div className="notice warn" role="status"><Icon name="lock" />That page isn&apos;t available for your role. Ask the couple if you need access.</div>;
}
