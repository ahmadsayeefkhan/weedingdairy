"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, EDITORS, PermissionError } from "@/lib/wedding";
import { fail, int, ok, str, type ActionResult } from "@/lib/result";
import { audit, notify, notifyMembers } from "@/lib/log";

async function editor() {
  try { return await authorizeWedding(EDITORS); } catch (e) { if (e instanceof PermissionError) return e.message; throw e; }
}

export async function setItemStatus(fd: FormData) {
  const g = await editor(); if (typeof g === "string") return;
  const item = await db.timelineItem.findFirst({ where: { id: str(fd, "id"), event: { weddingId: g.weddingId } }, include: { event: true } });
  const status = str(fd, "status");
  if (!item || !["PLANNED", "NOW", "DONE"].includes(status)) return;
  if (status === "NOW") {
    await db.timelineItem.updateMany({ where: { eventId: item.eventId, status: "NOW" }, data: { status: "DONE" } });
    if (!item.event.liveStartedAt) await db.event.update({ where: { id: item.eventId }, data: { liveStartedAt: new Date() } });
    await db.liveAlert.create({ data: { weddingId: g.weddingId, kind: "INFO", message: `Happening now: ${item.title}`, byName: g.user.name } });
  }
  await db.timelineItem.update({ where: { id: item.id }, data: { status } });
  revalidatePath(`/live/${item.eventId}`);
}

export async function checkIn(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await editor(); if (typeof g === "string") return fail(g);
  const guest = await db.guest.findFirst({ where: { id: str(fd, "guestId"), weddingId: g.weddingId } });
  if (!guest) return fail("That guest isn't on the list.");
  const seats = int(fd, "seats");
  const max = Math.max(guest.invitedSeats, guest.confirmedSeats);
  if (!Number.isFinite(seats) || seats < 0 || seats > max) return fail(`${guest.name} is invited with ${max} seat${max > 1 ? "s" : ""}.`);
  await db.guest.update({ where: { id: guest.id }, data: { checkedInSeats: seats, checkedInAt: seats ? new Date() : null, ...(seats && guest.status !== "CONFIRMED" ? { status: "CONFIRMED", confirmedSeats: seats } : {}) } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "guest.checkin", entity: "Guest", entityId: guest.id, detail: `${guest.name}: ${seats}` });
  revalidatePath("/live", "layout");
  return ok(seats ? `${guest.name} checked in (${seats}).` : `${guest.name} check-in undone.`);
}

export async function broadcast(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await editor(); if (typeof g === "string") return fail(g);
  const kind = str(fd, "kind") === "SOS" ? "SOS" : "BROADCAST";
  const message = str(fd, "message");
  if (message.length < 3) return fail("Write a short message for the team.");
  await db.liveAlert.create({ data: { weddingId: g.weddingId, kind, message: message.slice(0, 280), byName: g.user.name } });
  await notifyMembers(g.weddingId, kind === "SOS" ? "SOS from the venue" : "Coordinator update", message, g.user.id);
  // Booked vendors for today get it by SMS (dev outbox)
  const vendors = await db.booking.findMany({ where: { weddingId: g.weddingId, status: "ACCEPTED" }, include: { vendor: true } });
  for (const b of vendors) if (b.vendor.phone) await notify({ weddingId: g.weddingId, channel: "SMS", to: b.vendor.phone, title: kind === "SOS" ? "SOS" : "Update", body: message });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: `live.${kind.toLowerCase()}`, entity: "LiveAlert", detail: message });
  revalidatePath("/live", "layout");
  return ok(kind === "SOS" ? "SOS sent to the whole team and your vendors." : "Update sent to the team and vendors.");
}

export async function setVendorReadiness(fd: FormData) {
  const g = await editor(); if (typeof g === "string") return;
  const r = str(fd, "readiness");
  if (!["STANDBY", "SETUP", "READY", "ACTIVE"].includes(r)) return;
  const b = await db.booking.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId, status: "ACCEPTED" }, include: { vendor: true } });
  if (!b) return;
  await db.booking.update({ where: { id: b.id }, data: { readiness: r } });
  await db.liveAlert.create({ data: { weddingId: g.weddingId, kind: "INFO", message: `${b.vendor.name}: ${r.toLowerCase()}`, byName: g.user.name } });
  revalidatePath("/live", "layout");
}

export async function moderatePhoto(fd: FormData) {
  const g = await editor(); if (typeof g === "string") return;
  const p = await db.photo.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId } });
  const action = str(fd, "action");
  if (!p) return;
  if (action === "approve") await db.photo.update({ where: { id: p.id }, data: { status: "APPROVED" } });
  else if (action === "hide") await db.photo.update({ where: { id: p.id }, data: { status: "HIDDEN" } });
  else if (action === "favorite") await db.photo.update({ where: { id: p.id }, data: { favorite: !p.favorite } });
  revalidatePath("/", "layout");
}
