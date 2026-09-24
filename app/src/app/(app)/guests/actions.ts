"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, EDITORS, PermissionError } from "@/lib/wedding";
import { fail, int, ok, str, type ActionResult } from "@/lib/result";
import { normalizeBdPhone } from "@/lib/format";
import { DIET_TAGS, EVENT_META } from "@/lib/constants";
import { tableIdIfFits, token } from "@/lib/services";
import { audit, notify } from "@/lib/log";

async function editor() {
  try { return await authorizeWedding(EDITORS); } catch (e) { if (e instanceof PermissionError) return e.message; throw e; }
}

function parseGuest(fd: FormData): { error: string } | { data: { name: string; phone: string | null; email: string | null; side: string; relation: string; events: string; invitedSeats: number; diet: string | null; dietNote: string | null } } {
  const name = str(fd, "name");
  const rawPhone = str(fd, "phone");
  const email = str(fd, "email").toLowerCase();
  const side = str(fd, "side");
  const relation = str(fd, "relation") || "Guest";
  const events = fd.getAll("events").map(String).filter((e) => EVENT_META[e]);
  const seats = int(fd, "seats");
  const diet = fd.getAll("diet").map(String).filter((d) => DIET_TAGS[d]);
  if (name.length < 2) return { error: "Enter the guest's name or family name." };
  if (side !== "BRIDE" && side !== "GROOM") return { error: "Choose the bride's or the groom's side." };
  if (!Number.isFinite(seats) || seats < 1 || seats > 20) return { error: "Seats should be between 1 and 20." };
  let phone: string | null = null;
  if (rawPhone) {
    phone = normalizeBdPhone(rawPhone);
    if (!phone) return { error: "Enter a Bangladeshi mobile number like 01711 234567 or +880 1711 234567." };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email address or leave it empty." };
  if (!events.length) return { error: "Invite the guest to at least one event." };
  return { data: { name, phone, email: email || null, side, relation, events: events.join(","), invitedSeats: seats, diet: diet.join(",") || null, dietNote: str(fd, "dietNote") || null } };
}

export async function addGuest(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await editor(); if (typeof g === "string") return fail(g);
  const p = parseGuest(fd);
  if ("error" in p) return fail(p.error);
  const guest = await db.guest.create({ data: { ...p.data, weddingId: g.weddingId, rsvpToken: token() } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "guest.added", entity: "Guest", entityId: guest.id, detail: `${guest.name} (${guest.invitedSeats})` });
  revalidatePath("/", "layout");
  return ok(`${guest.name} added. Send the invitation from the guest list when you're ready.`);
}

export async function updateGuest(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await editor(); if (typeof g === "string") return fail(g);
  const guest = await db.guest.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId } });
  if (!guest) return fail("That guest no longer exists.");
  const p = parseGuest(fd);
  if ("error" in p) return fail(p.error);
  const status = ["PENDING", "CONFIRMED", "DECLINED"].includes(str(fd, "status")) ? str(fd, "status") : guest.status;
  let confirmedSeats = status === "CONFIRMED" ? Math.min(p.data.invitedSeats, int(fd, "confirmedSeats") || p.data.invitedSeats) : 0;
  if (confirmedSeats < 1 && status === "CONFIRMED") confirmedSeats = 1;
  const tableId = status === "CONFIRMED" ? await tableIdIfFits(db, guest.tableId, guest.id, confirmedSeats) : null;
  await db.guest.update({ where: { id: guest.id }, data: { ...p.data, status, confirmedSeats, tableId } });
  if (status !== guest.status) await audit({ weddingId: g.weddingId, userId: g.user.id, action: "rsvp.changed", entity: "Guest", entityId: guest.id, detail: `${guest.name}: ${guest.status} → ${status} (by team)` });
  revalidatePath("/", "layout");
  return ok(guest.tableId && !tableId && status === "CONFIRMED" ? "Guest saved. Their table no longer has room, so they're back in the unseated list." : "Guest saved.");
}

export async function deleteGuest(fd: FormData) {
  const g = await editor(); if (typeof g === "string") return;
  const guest = await db.guest.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId } });
  if (!guest) return;
  await db.guest.delete({ where: { id: guest.id } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "guest.removed", entity: "Guest", detail: guest.name });
  revalidatePath("/", "layout");
}

/** Messaging adapter in dev mode: the invitation is written to the outbox, nothing is sent. */
export async function sendInvite(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await editor(); if (typeof g === "string") return fail(g);
  const w = await db.wedding.findUniqueOrThrow({ where: { id: g.weddingId } });
  const ids = fd.getAll("ids").map(String);
  const guests = await db.guest.findMany({ where: { weddingId: g.weddingId, ...(ids.length ? { id: { in: ids } } : { status: "PENDING" }) } });
  let sent = 0;
  for (const guest of guests) {
    const channel = guest.phone ? "WHATSAPP" : guest.email ? "EMAIL" : null;
    if (!channel) continue;
    await notify({ weddingId: g.weddingId, channel, to: guest.phone ?? guest.email!, title: `Invitation: ${w.brideName} & ${w.groomName}`, body: `Assalamu alaikum ${guest.name}! ${w.brideName} & ${w.groomName} would love you to join them. Please RSVP here: /rsvp/${guest.rsvpToken}` });
    sent++;
  }
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "invites.sent", entity: "Guest", detail: `${sent} invitations` });
  revalidatePath("/", "layout");
  const skipped = guests.length - sent;
  return sent ? ok(`${sent} invitation${sent === 1 ? "" : "s"} queued in the outbox (dev mode, nothing is sent).${skipped ? ` ${skipped} skipped: no phone or email.` : ""}`) : fail("None of these guests has a phone number or email yet.");
}
