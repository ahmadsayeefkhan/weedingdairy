"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authorizeWedding, EDITORS, PermissionError } from "@/lib/wedding";
import { fail, ok, str, int, type ActionResult } from "@/lib/result";
import { parseDateInput } from "@/lib/today";
import { EVENT_META, TIMELINE_TEMPLATE } from "@/lib/constants";
import { shortCode } from "@/lib/services";
import { audit, notifyMembers } from "@/lib/log";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

async function guard() {
  try { return await authorizeWedding(EDITORS); } catch (e) { if (e instanceof PermissionError) return e.message; throw e; }
}

async function ownEvent(weddingId: string, id: string) {
  return db.event.findFirst({ where: { id, weddingId } });
}

export async function createEvent(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await guard(); if (typeof g === "string") return fail(g);
  const type = str(fd, "type");
  const date = parseDateInput(str(fd, "date"));
  const name = str(fd, "name") || EVENT_META[type]?.name || "";
  if (!EVENT_META[type]) return fail("Choose an event type.");
  if (!date) return fail("Choose a date for the event.");
  if (name.length < 2) return fail("Give the event a name.");
  const ev = await db.event.create({
    data: { weddingId: g.weddingId, type, name, date, venue: str(fd, "venue") || null, shareCode: shortCode(), items: { create: (TIMELINE_TEMPLATE[type] ?? []).map((i) => ({ ...i })) } },
  });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "event.created", entity: "Event", entityId: ev.id, detail: name });
  revalidatePath("/", "layout");
  redirect(`/events/${ev.id}`);
}

export async function updateEvent(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await guard(); if (typeof g === "string") return fail(g);
  const ev = await ownEvent(g.weddingId, str(fd, "id"));
  if (!ev) return fail("That event no longer exists.");
  const date = parseDateInput(str(fd, "date"));
  const name = str(fd, "name");
  if (!date) return fail("Choose a date for the event.");
  if (name.length < 2) return fail("Give the event a name.");
  await db.event.update({ where: { id: ev.id }, data: { name, date, venue: str(fd, "venue") || null } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "event.updated", entity: "Event", entityId: ev.id, detail: name });
  revalidatePath("/", "layout");
  return ok("Event saved.");
}

export async function deleteEvent(fd: FormData) {
  const g = await guard(); if (typeof g === "string") return;
  const ev = await ownEvent(g.weddingId, str(fd, "id"));
  if (!ev) return;
  await db.event.delete({ where: { id: ev.id } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "event.deleted", entity: "Event", entityId: ev.id, detail: ev.name });
  revalidatePath("/", "layout");
  redirect("/events");
}

export async function addItem(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await guard(); if (typeof g === "string") return fail(g);
  const ev = await ownEvent(g.weddingId, str(fd, "eventId"));
  if (!ev) return fail("That event no longer exists.");
  const time = str(fd, "time");
  const title = str(fd, "title");
  if (!TIME.test(time)) return fail("Enter a time like 18:30.");
  if (title.length < 2) return fail("Describe what happens at this time.");
  await db.timelineItem.create({ data: { eventId: ev.id, time, title, location: str(fd, "location") || null, note: str(fd, "note") || null } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "timeline.added", entity: "Event", entityId: ev.id, detail: `${ev.name}: ${time} ${title}` });
  revalidatePath(`/events/${ev.id}`);
  return ok("Added to the timeline.");
}

export async function updateItem(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await guard(); if (typeof g === "string") return fail(g);
  const item = await db.timelineItem.findFirst({ where: { id: str(fd, "id"), event: { weddingId: g.weddingId } }, include: { event: true } });
  if (!item) return fail("That timeline item no longer exists.");
  const time = str(fd, "time");
  const title = str(fd, "title");
  if (!TIME.test(time)) return fail("Enter a time like 18:30.");
  if (title.length < 2) return fail("Describe what happens at this time.");
  await db.timelineItem.update({ where: { id: item.id }, data: { time, title, location: str(fd, "location") || null, note: str(fd, "note") || null } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "timeline.updated", entity: "Event", entityId: item.eventId, detail: `${item.event.name}: ${title} at ${time}` });
  if (item.time !== time) await notifyMembers(g.weddingId, `${item.event.name} timeline changed`, `${title} moved from ${item.time} to ${time}.`, g.user.id);
  revalidatePath(`/events/${item.eventId}`);
  return ok("Saved.");
}

export async function deleteItem(fd: FormData) {
  const g = await guard(); if (typeof g === "string") return;
  const item = await db.timelineItem.findFirst({ where: { id: str(fd, "id"), event: { weddingId: g.weddingId } } });
  if (!item) return;
  await db.timelineItem.delete({ where: { id: item.id } });
  revalidatePath(`/events/${item.eventId}`);
}

export async function shiftItems(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await guard(); if (typeof g === "string") return fail(g);
  const ev = await ownEvent(g.weddingId, str(fd, "eventId"));
  if (!ev) return fail("That event no longer exists.");
  const mins = int(fd, "minutes");
  if (!Number.isFinite(mins) || mins === 0 || Math.abs(mins) > 240) return fail("Shift by between 5 and 240 minutes.");
  const items = await db.timelineItem.findMany({ where: { eventId: ev.id, status: "PLANNED" } });
  for (const it of items) {
    const [h, m] = it.time.split(":").map(Number);
    const t = Math.min(23 * 60 + 59, Math.max(0, h * 60 + m + mins));
    await db.timelineItem.update({ where: { id: it.id }, data: { time: `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}` } });
  }
  await db.liveAlert.create({ data: { weddingId: g.weddingId, kind: "SHIFT", message: `${ev.name}: upcoming items moved ${mins > 0 ? "later" : "earlier"} by ${Math.abs(mins)} minutes`, byName: g.user.name } });
  await notifyMembers(g.weddingId, "Schedule adjusted", `${ev.name}: ${items.length} upcoming items moved ${mins > 0 ? "+" : ""}${mins} min.`, g.user.id);
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "timeline.shifted", entity: "Event", entityId: ev.id, detail: `${mins} min` });
  revalidatePath("/", "layout");
  return ok(`Moved ${items.length} upcoming items by ${mins} minutes. Everyone on the team was notified.`);
}
