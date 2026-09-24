import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Data export for the couple (Settings → Download all my wedding data). */
export async function GET() {
  const u = await currentUser();
  if (!u) return new Response("Sign in first.", { status: 401 });
  const m = await db.weddingMember.findFirst({ where: { userId: u.id, role: "COUPLE" } });
  if (!m) return new Response("Only the couple can export wedding data.", { status: 403 });
  const wedding = await db.wedding.findUniqueOrThrow({
    where: { id: m.weddingId },
    include: {
      events: { include: { items: true } }, tasks: true, guests: true, tables: true, categories: true, expenses: true,
      bookings: { include: { vendor: { select: { name: true, category: true } }, payments: true } },
      members: { include: { user: { select: { name: true, email: true } } } }, photos: true,
    },
  });
  const { publicCode: _code, ...data } = wedding;
  void _code;
  return new Response(JSON.stringify({ exportedAt: new Date().toISOString(), wedding: data }, null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": 'attachment; filename="wedding-diary-export.json"' },
  });
}
