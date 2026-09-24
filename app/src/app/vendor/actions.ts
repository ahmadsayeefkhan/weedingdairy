"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, int, ok, str, type ActionResult } from "@/lib/result";
import { parseDateInput, today } from "@/lib/today";
import { schedulePayments, vendorAvailable } from "@/lib/services";
import { CITIES } from "@/lib/constants";
import { fmtDate, taka } from "@/lib/format";
import { audit, notifyMembers } from "@/lib/log";

async function myVendor() {
  const u = await requireUser();
  if (u.role !== "VENDOR") return null;
  const v = await db.vendor.findUnique({ where: { ownerId: u.id } });
  return v ? { u, v } : null;
}

export async function respondBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await myVendor(); if (!m) return fail("Only the vendor who owns this listing can respond.");
  const b = await db.booking.findFirst({ where: { id: str(fd, "id"), vendorId: m.v.id }, include: { wedding: true } });
  if (!b) return fail("That booking no longer exists.");
  if (b.status !== "REQUESTED") return ok("This request was already answered.");
  const decision = str(fd, "decision");
  const note = str(fd, "note").slice(0, 300) || null;
  if (decision === "accept") {
    // Availability check, status change and payment schedule succeed or fail together.
    const accepted = await db.$transaction(async (tx) => {
      const t = tx as unknown as typeof db;
      if (!(await vendorAvailable(t, m.v.id, b.eventDate, b.id))) return false;
      const r = await tx.booking.updateMany({ where: { id: b.id, status: "REQUESTED" }, data: { status: "ACCEPTED", vendorNote: note, respondedAt: today() } });
      if (r.count !== 1) return false;
      await schedulePayments(t, b.id);
      return true;
    });
    if (!accepted) return fail(`You already have a confirmed booking or a blocked day on ${fmtDate(b.eventDate)}. Decline this request or unblock the date.`);
    await notifyMembers(b.weddingId, "Booking accepted", `${m.v.name} accepted your booking for ${fmtDate(b.eventDate)}. Your payment schedule is ready.`);
  } else if (decision === "decline") {
    await db.booking.update({ where: { id: b.id }, data: { status: "DECLINED", vendorNote: note, respondedAt: today() } });
    await notifyMembers(b.weddingId, "Booking declined", `${m.v.name} can't take your booking for ${fmtDate(b.eventDate)}. We've suggested backup vendors on your Bookings page.`);
  } else return fail("Choose accept or decline.");
  await audit({ weddingId: b.weddingId, userId: m.u.id, action: `booking.${decision}ed`, entity: "Booking", entityId: b.id, detail: `${m.v.name} · ${taka(b.amount)}` });
  revalidatePath("/vendor", "layout");
  return ok(decision === "accept" ? "Accepted. The couple has been notified and their payment schedule created." : "Declined. The couple has been notified.");
}

export async function completeBooking(fd: FormData) {
  const m = await myVendor(); if (!m) return;
  const b = await db.booking.findFirst({ where: { id: str(fd, "id"), vendorId: m.v.id, status: "ACCEPTED" } });
  if (!b || b.eventDate > today()) return;
  await db.booking.update({ where: { id: b.id }, data: { status: "COMPLETED" } });
  await notifyMembers(b.weddingId, "How was it?", `${m.v.name} marked your booking complete. Leave a verified review from your Bookings page.`);
  revalidatePath("/vendor", "layout");
}

export async function updateProfile(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await myVendor(); if (!m) return fail("Only vendors can edit a listing.");
  const name = str(fd, "name"), about = str(fd, "about"), city = str(fd, "city"), area = str(fd, "area");
  const tier = int(fd, "priceTier");
  const cap = str(fd, "capacity") ? int(fd, "capacity") : null;
  if (name.length < 2) return fail("Enter your business name.");
  if (about.length < 20) return fail("Describe your service in at least a sentence (20+ characters).");
  if (!CITIES.includes(city)) return fail("Choose a city.");
  if (![1, 2, 3].includes(tier)) return fail("Choose a price range.");
  if (cap !== null && (!Number.isFinite(cap) || cap < 1 || cap > 20000)) return fail("Capacity should be a number of guests (up to 20,000).");
  const tags = str(fd, "tags").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8).join(",");
  await db.vendor.update({ where: { id: m.v.id }, data: { name, about, city, area, priceTier: tier, capacity: cap, tags } });
  revalidatePath("/vendor", "layout");
  return ok(m.v.status === "PENDING" ? "Saved. Your listing is waiting for review by the Wedding Diary team." : "Profile saved.");
}

export async function savePackage(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await myVendor(); if (!m) return fail("Only vendors can edit packages.");
  const name = str(fd, "name"), description = str(fd, "description");
  const price = int(fd, "price");
  if (name.length < 2) return fail("Name the package.");
  if (!Number.isFinite(price) || price < 100 || price > 50000000) return fail("Enter a price in taka between ৳100 and ৳5,00,00,000.");
  const id = str(fd, "id");
  if (id) {
    const p = await db.vendorPackage.findFirst({ where: { id, vendorId: m.v.id } });
    if (!p) return fail("That package no longer exists.");
    await db.vendorPackage.update({ where: { id }, data: { name, price, description } });
  } else await db.vendorPackage.create({ data: { vendorId: m.v.id, name, price, description } });
  const min = await db.vendorPackage.aggregate({ where: { vendorId: m.v.id }, _min: { price: true } });
  await db.vendor.update({ where: { id: m.v.id }, data: { startingPrice: min._min.price ?? price } });
  revalidatePath("/vendor", "layout");
  return ok(id ? "Package saved." : "Package added.");
}

export async function deletePackage(fd: FormData) {
  const m = await myVendor(); if (!m) return;
  await db.vendorPackage.deleteMany({ where: { id: str(fd, "id"), vendorId: m.v.id } });
  const min = await db.vendorPackage.aggregate({ where: { vendorId: m.v.id }, _min: { price: true } });
  await db.vendor.update({ where: { id: m.v.id }, data: { startingPrice: min._min.price ?? 0 } });
  revalidatePath("/vendor", "layout");
}

export async function blockDate(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const m = await myVendor(); if (!m) return fail("Only vendors can manage availability.");
  const date = parseDateInput(str(fd, "date"));
  if (!date) return fail("Choose a date.");
  if (date < today()) return fail("That date has already passed.");
  const clash = await db.booking.findFirst({ where: { vendorId: m.v.id, eventDate: date, status: "ACCEPTED" } });
  if (clash) return fail("You already have a confirmed booking that day; it's shown as unavailable anyway.");
  await db.blockedDate.upsert({ where: { vendorId_date: { vendorId: m.v.id, date } }, create: { vendorId: m.v.id, date }, update: {} });
  revalidatePath("/vendor", "layout");
  return ok(`${fmtDate(date)} is now blocked.`);
}

export async function unblockDate(fd: FormData) {
  const m = await myVendor(); if (!m) return;
  await db.blockedDate.deleteMany({ where: { id: str(fd, "id"), vendorId: m.v.id } });
  revalidatePath("/vendor", "layout");
}

export async function setReadiness(fd: FormData) {
  const m = await myVendor(); if (!m) return;
  const r = str(fd, "readiness");
  if (!["STANDBY", "SETUP", "READY", "ACTIVE"].includes(r)) return;
  const b = await db.booking.findFirst({ where: { id: str(fd, "id"), vendorId: m.v.id, status: "ACCEPTED" } });
  if (!b) return;
  await db.booking.update({ where: { id: b.id }, data: { readiness: r } });
  await db.liveAlert.create({ data: { weddingId: b.weddingId, kind: "INFO", message: `${m.v.name} is now ${r.toLowerCase()}`, byName: m.v.name } });
  revalidatePath("/vendor", "layout");
}
