import { readFile } from "fs/promises";
import path from "path";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

/**
 * Serves uploaded photos. Approved photos of non-private weddings are public (TV wall, guest gallery);
 * pending, hidden or private-wedding photos are only served to members of that wedding.
 */
export async function GET(_: Request, ctx: { params: Promise<{ wedding: string; file: string }> }) {
  const { wedding, file } = await ctx.params;
  if (!/^[a-z0-9]+$/i.test(wedding) || !/^[a-f0-9]{24}\.(jpg|png|webp)$/.test(file)) return new Response("Not found", { status: 404 });
  const photo = await db.photo.findFirst({ where: { weddingId: wedding, path: `/media/${wedding}/${file}` }, include: { wedding: true } });
  if (!photo) return new Response("Not found", { status: 404 });
  const isPublic = photo.status === "APPROVED" && photo.wedding.visibility !== "PRIVATE";
  if (!isPublic) {
    const u = await currentUser();
    const member = u && (await db.weddingMember.findFirst({ where: { userId: u.id, weddingId: wedding } }));
    if (!member) return new Response("Not found", { status: 404 });
  }
  try {
    const buf = await readFile(path.join(process.cwd(), "uploads", wedding, file));
    // Short, private caching so hiding a photo takes effect quickly.
    return new Response(new Uint8Array(buf), { headers: { "Content-Type": TYPES[file.split(".").pop()!], "Cache-Control": "private, max-age=300" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
