import { db } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { DIET_TAGS } from "@/lib/constants";

const esc = (v: unknown) => {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const u = await currentUser();
  if (!u) return new Response("Sign in first.", { status: 401 });
  const m = await db.weddingMember.findFirst({ where: { userId: u.id }, orderBy: { createdAt: "asc" } });
  if (!m || (m.role !== "COUPLE" && m.role !== "PLANNER")) return new Response("Your role can't export the guest list.", { status: 403 });
  const guests = await db.guest.findMany({ where: { weddingId: m.weddingId }, include: { table: true }, orderBy: { name: "asc" } });
  const rows = [
    ["Name", "Phone", "Email", "Side", "Relation", "Events", "Invited seats", "Status", "Confirmed seats", "Table", "Dietary", "Checked in"],
    ...guests.map((g) => [g.name, g.phone, g.email, g.side === "BRIDE" ? "Bride" : "Groom", g.relation, g.events, g.invitedSeats, g.status, g.confirmedSeats, g.table?.name, (g.diet ?? "").split(",").filter(Boolean).map((d) => DIET_TAGS[d]).join("; "), g.checkedInSeats]),
  ];
  const csv = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="guest-list.csv"' } });
}
