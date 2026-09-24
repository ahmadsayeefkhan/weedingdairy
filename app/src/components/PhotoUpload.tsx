"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Icon } from "./icons";

/** Posts photos to /api/upload. Guests pass `code`; the team passes `eventId`. */
export function PhotoUpload({ code, events, guest }: { code?: string; events?: { id: string; name: string }[]; guest?: boolean }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (!res.ok && !data.saved) setMsg({ ok: false, text: data.error ?? data.rejected?.join(". ") ?? "Upload failed. Try again." });
      else {
        const extra = data.rejected?.length ? ` Skipped: ${data.rejected.join("; ")}.` : "";
        setMsg({ ok: true, text: `${data.saved} photo${data.saved > 1 ? "s" : ""} uploaded${data.pending ? ". They'll appear once the couple approves them" : ""}.${extra}` });
        ref.current?.reset();
        router.refresh();
      }
    } catch { setMsg({ ok: false, text: "Couldn't reach the server. Check your connection and try again." }); }
    setBusy(false);
  }
  return (
    <form ref={ref} onSubmit={onSubmit} className="stack">
      {code && <input type="hidden" name="code" value={code} />}
      {guest && <label className="field"><span>Your name (for the photo credit)</span><input className="input" name="name" maxLength={40} placeholder="e.g. Tasnim" /></label>}
      {events && (
        <label className="field"><span>Album</span><select className="input" name="eventId"><option value="">General</option>{events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</select></label>
      )}
      <label className="field"><span>Photos (JPG, PNG or WebP, up to 8 MB each)</span><input className="input" type="file" name="photos" accept="image/jpeg,image/png,image/webp" multiple required /></label>
      <label className="field"><span>Caption (optional)</span><input className="input" name="caption" maxLength={120} /></label>
      <button className="btn" disabled={busy}><Icon name="upload" />{busy ? "Uploading…" : "Upload photos"}</button>
      {msg && <p className={`form-msg ${msg.ok ? "ok" : "err"}`} role="status">{msg.text}</p>}
    </form>
  );
}
