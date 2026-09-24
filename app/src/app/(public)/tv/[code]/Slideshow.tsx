"use client";
import { useEffect, useState } from "react";

type P = { id: string; src: string; by: string; caption: string | null };

/** Full-screen slideshow: new uploads jump to the front; polls every 10 s, advances every 6 s. */
export default function Slideshow({ code, initial, title, sub, qr, color }: { code: string; initial: P[]; title: string; sub: string; qr: string; color: string }) {
  const [photos, setPhotos] = useState(initial);
  const [i, setI] = useState(0);
  useEffect(() => {
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/tv/${code}`, { cache: "no-store" });
        if (r.ok) {
          const d = await r.json();
          setPhotos((prev) => {
            const fresh = d.photos.filter((p: P) => !prev.some((x) => x.id === p.id));
            if (fresh.length) setI(0);
            return fresh.length ? [...fresh, ...prev.filter((x) => d.photos.some((p: P) => p.id === x.id))] : d.photos;
          });
        }
      } catch { /* keep showing what we have */ }
    }, 10000);
    const tick = setInterval(() => setI((n) => n + 1), 6000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [code]);
  const p = photos.length ? photos[i % photos.length] : null;
  return (
    <main style={{ position: "fixed", inset: 0, background: "#111111", color: "#fff", overflow: "hidden" }}>
      {p ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={p.id} src={p.src} alt={p.caption ?? `Photo by ${p.by}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", animation: "tvfade 1s ease" }} />
      ) : (
        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 30, fontFamily: "var(--font-display)" }}>Scan the code to share the first photo</div>
      )}
      <style>{`@keyframes tvfade{from{opacity:0;transform:scale(1.02)}to{opacity:1;transform:none}}`}</style>
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "60px 40px 30px", background: "linear-gradient(transparent, rgba(0,0,0,.75))", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: color, padding: "4px 12px", borderRadius: 99, fontSize: 13, letterSpacing: ".15em" }}>● LIVE</div>
          <div className="serif" style={{ fontSize: 44, marginTop: 10 }}>{title}</div>
          <div style={{ opacity: 0.8 }}>{sub}{p ? ` · photo by ${p.by}` : ""}</div>
        </div>
        <div style={{ textAlign: "center", fontSize: 13 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Scan to upload photos" width={130} height={130} style={{ borderRadius: 12, background: "#fff", padding: 6 }} />
          <div style={{ marginTop: 6, opacity: 0.85 }}>Scan to share your photos</div>
        </div>
      </div>
    </main>
  );
}
