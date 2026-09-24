"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, EDITORS, PermissionError } from "@/lib/wedding";
import { fail, int, ok, str, type ActionResult } from "@/lib/result";
import { audit } from "@/lib/log";

async function editor() {
  try { return await authorizeWedding(EDITORS); } catch (e) { if (e instanceof PermissionError) return e.message; throw e; }
}

async function seatsUsed(tableId: string, exceptGuest?: string) {
  const gs = await db.guest.findMany({ where: { tableId, id: exceptGuest ? { not: exceptGuest } : undefined } });
  return gs.reduce((a, g) => a + g.confirmedSeats, 0);
}

export async function addTable(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await editor(); if (typeof g === "string") return fail(g);
  const capacity = int(fd, "capacity");
  const count = await db.seatTable.count({ where: { weddingId: g.weddingId } });
  const name = str(fd, "name") || `Table ${count + 1}`;
  if (!Number.isFinite(capacity) || capacity < 2 || capacity > 30) return fail("A table seats between 2 and 30 people.");
  await db.seatTable.create({ data: { weddingId: g.weddingId, name, label: str(fd, "label") || null, capacity } });
  revalidatePath("/seating");
  return ok(`${name} added.`);
}

export async function deleteTable(fd: FormData) {
  const g = await editor(); if (typeof g === "string") return;
  await db.seatTable.deleteMany({ where: { id: str(fd, "id"), weddingId: g.weddingId } });
  revalidatePath("/seating");
}

export async function assignGuest(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await editor(); if (typeof g === "string") return fail(g);
  const guest = await db.guest.findFirst({ where: { id: str(fd, "guestId"), weddingId: g.weddingId } });
  if (!guest) return fail("That guest no longer exists.");
  const tableId = str(fd, "tableId");
  if (!tableId) {
    await db.guest.update({ where: { id: guest.id }, data: { tableId: null } });
    revalidatePath("/seating");
    return ok(`${guest.name} unseated.`);
  }
  if (guest.status !== "CONFIRMED") return fail("Only confirmed guests can be seated.");
  const table = await db.seatTable.findFirst({ where: { id: tableId, weddingId: g.weddingId } });
  if (!table) return fail("That table no longer exists.");
  const used = await seatsUsed(table.id, guest.id);
  if (used + guest.confirmedSeats > table.capacity) return fail(`${table.name} has ${table.capacity - used} free seats, but ${guest.name} needs ${guest.confirmedSeats}.`);
  await db.guest.update({ where: { id: guest.id }, data: { tableId: table.id } });
  revalidatePath("/seating");
  return ok(`${guest.name} seated at ${table.name}.`);
}

/** Auto-assign: largest parties first, keep sides together (tables whose label or current guests match the side). */
export async function autoAssign(): Promise<ActionResult> {
  const g = await editor(); if (typeof g === "string") return fail(g);
  const tables = await db.seatTable.findMany({ where: { weddingId: g.weddingId }, include: { guests: true }, orderBy: { name: "asc" } });
  if (!tables.length) return fail("Add a table first.");
  const waiting = (await db.guest.findMany({ where: { weddingId: g.weddingId, status: "CONFIRMED", tableId: null } })).sort((a, b) => b.confirmedSeats - a.confirmedSeats);
  const free = new Map(tables.map((t) => [t.id, t.capacity - t.guests.reduce((a, x) => a + x.confirmedSeats, 0)]));
  const sideOf = (t: (typeof tables)[number]) => {
    const b = t.guests.filter((x) => x.side === "BRIDE").length, gr = t.guests.filter((x) => x.side === "GROOM").length;
    if (b || gr) return b >= gr ? "BRIDE" : "GROOM";
    const l = (t.label ?? "").toLowerCase();
    return l.includes("bride") ? "BRIDE" : l.includes("groom") ? "GROOM" : null;
  };
  let seated = 0;
  for (const guest of waiting) {
    const candidates = tables.filter((t) => (free.get(t.id) ?? 0) >= guest.confirmedSeats).sort((a, b) => {
      const sa = sideOf(a) === guest.side ? 0 : sideOf(a) === null ? 1 : 2;
      const sb = sideOf(b) === guest.side ? 0 : sideOf(b) === null ? 1 : 2;
      return sa - sb || (free.get(a.id)! - free.get(b.id)!);
    });
    const t = candidates[0];
    if (!t) continue;
    await db.guest.update({ where: { id: guest.id }, data: { tableId: t.id } });
    t.guests.push({ ...guest, tableId: t.id });
    free.set(t.id, free.get(t.id)! - guest.confirmedSeats);
    seated++;
  }
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "seating.auto", entity: "SeatTable", detail: `${seated} parties seated` });
  revalidatePath("/seating");
  const left = waiting.length - seated;
  return ok(`Seated ${seated} ${seated === 1 ? "party" : "parties"}.${left ? ` ${left} still need a table: add more tables or seats.` : ""}`);
}
