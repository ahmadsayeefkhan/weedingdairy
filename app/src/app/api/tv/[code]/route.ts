import { db } from "@/lib/db";

/** Approved photos for the TV slideshow (polled by the TV page). */
export async function GET(_: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const ev = await db.event.findUnique({ where: { shareCode: code }, include: { wedding: true } });
  if (!ev || ev.wedding.visibility === "PRIVATE") return Response.json({ error: "Not found" }, { status: 404 });
  const photos = await db.photo.findMany({ where: { weddingId: ev.weddingId, status: "APPROVED", OR: [{ eventId: ev.id }, { favorite: true }] }, orderBy: { takenAt: "desc" }, take: 60 });
  return Response.json({ photos: photos.map((p) => ({ id: p.id, src: p.path, by: p.uploadedBy, caption: p.caption })) }, { headers: { "Cache-Control": "no-store" } });
}
