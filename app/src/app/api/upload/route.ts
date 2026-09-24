import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { notifyMembers } from "@/lib/log";

const MAX = 8 * 1024 * 1024;
const MAX_FILES = 10;

/** Detect image type from magic bytes; never trust the file name or the browser's content type. */
function sniff(b: Buffer): "jpg" | "png" | "webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return "webp";
  return null;
}

/**
 * Photo upload.
 * Guests: `code` = the event's share code (no login). Photos wait for approval unless the couple turned on auto-approve.
 * Team: signed-in Couple/Planner with `eventId`; photos are approved immediately.
 */
const MAX_BODY = MAX * MAX_FILES + 1024 * 1024;
const WINDOW_MS = 10 * 60_000;
const WINDOW_MAX = 40; // uploads per share code / signed-in user per 10 minutes
const recent = new Map<string, number[]>(); // in-memory rate limit (single-server V1)

function rateLimited(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > WINDOW_MAX;
}

export async function POST(req: Request) {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) return Response.json({ error: `Upload up to ${MAX_FILES} photos of 8 MB each at a time.` }, { status: 413 });
  let fd: FormData;
  try { fd = await req.formData(); } catch { return Response.json({ error: "Send the photos as a form upload." }, { status: 400 }); }
  const code = String(fd.get("code") ?? "");
  const eventIdParam = String(fd.get("eventId") ?? "");
  let weddingId: string, eventId: string | null, source: "GUEST" | "COUPLE", uploader: string, autoApprove: boolean;

  if (code) {
    const ev = await db.event.findUnique({ where: { shareCode: code }, include: { wedding: true } });
    if (!ev || ev.wedding.visibility === "PRIVATE") return Response.json({ error: "This photo-sharing link isn't active." }, { status: 404 });
    weddingId = ev.weddingId; eventId = ev.id; source = "GUEST";
    uploader = String(fd.get("name") ?? "").trim().slice(0, 40) || "A guest";
    autoApprove = ev.wedding.photoAutoApprove;
  } else {
    const u = await currentUser();
    if (!u) return Response.json({ error: "Sign in to upload." }, { status: 401 });
    const m = await db.weddingMember.findFirst({ where: { userId: u.id } });
    if (!m || m.role === "FAMILY") return Response.json({ error: "Your role can't upload to the vault." }, { status: 403 });
    weddingId = m.weddingId; source = "COUPLE"; uploader = u.name; autoApprove = true;
    eventId = eventIdParam ? (await db.event.findFirst({ where: { id: eventIdParam, weddingId } }))?.id ?? null : null;
  }

  if (rateLimited(code || weddingId)) return Response.json({ error: "Lots of photos are arriving right now. Please try again in a few minutes." }, { status: 429 });
  const files = fd.getAll("photos").filter((f): f is File => typeof f === "object" && "arrayBuffer" in f && f.size > 0);
  if (!files.length) return Response.json({ error: "Choose at least one photo." }, { status: 400 });
  if (files.length > MAX_FILES) return Response.json({ error: `Upload up to ${MAX_FILES} photos at a time.` }, { status: 400 });
  const caption = String(fd.get("caption") ?? "").trim().slice(0, 120) || null;
  const dir = path.join(process.cwd(), "uploads", weddingId);
  await mkdir(dir, { recursive: true });
  let saved = 0;
  const rejected: string[] = [];
  for (const f of files) {
    if (f.size > MAX) { rejected.push(`${f.name} is larger than 8 MB`); continue; }
    const buf = Buffer.from(await f.arrayBuffer());
    const ext = sniff(buf);
    if (!ext) { rejected.push(`${f.name} isn't a JPG, PNG or WebP photo`); continue; }
    const name = `${randomBytes(12).toString("hex")}.${ext}`;
    await writeFile(path.join(dir, name), buf);
    await db.photo.create({ data: { weddingId, eventId, path: `/media/${weddingId}/${name}`, caption, uploadedBy: uploader, source, status: autoApprove ? "APPROVED" : "PENDING" } });
    saved++;
  }
  if (saved && source === "GUEST" && !autoApprove) await notifyMembers(weddingId, "New guest photos", `${uploader} shared ${saved} photo${saved > 1 ? "s" : ""}. Review them in the Memory Vault.`);
  return Response.json({ saved, rejected, pending: !autoApprove }, { status: saved ? 200 : 400 });
}
