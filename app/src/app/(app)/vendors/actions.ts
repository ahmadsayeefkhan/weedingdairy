"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, EDITORS, PermissionError } from "@/lib/wedding";
import { fail, int, ok, str, type ActionResult } from "@/lib/result";
import { parseDateInput, today } from "@/lib/today";
import { vendorAvailable } from "@/lib/services";
import { EVENT_META } from "@/lib/constants";
import { fmtDate, taka } from "@/lib/format";
import { audit, notify } from "@/lib/log";

async function auth(roles: ("COUPLE" | "PLANNER")[]) {
  try { return await authorizeWedding(roles); } catch (e) { if (e instanceof PermissionError) return e.message; throw e; }
}

export async function toggleShortlist(fd: FormData) {
  const g = await auth(EDITORS as ("COUPLE" | "PLANNER")[]); if (typeof g === "string") return;
  const vendorId = str(fd, "vendorId");
  const existing = await db.shortlist.findUnique({ where: { weddingId_vendorId: { weddingId: g.weddingId, vendorId } } });
  if (existing) await db.shortlist.delete({ where: { id: existing.id } });
  else if (await db.vendor.findFirst({ where: { id: vendorId, status: "APPROVED" } })) await db.shortlist.create({ data: { weddingId: g.weddingId, vendorId } });
  revalidatePath("/vendors", "layout");
}

export async function requestBooking(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await auth(["COUPLE", "PLANNER"]); if (typeof g === "string") return fail(g);
  const vendor = await db.vendor.findFirst({ where: { id: str(fd, "vendorId"), status: "APPROVED" }, include: { packages: true } });
  if (!vendor) return fail("This vendor isn't taking bookings right now.");
  const pkg = vendor.packages.find((p) => p.id === str(fd, "packageId"));
  if (!pkg) return fail("Choose a package.");
  const eventType = str(fd, "eventType");
  if (!EVENT_META[eventType]) return fail("Choose which event this is for.");
  const date = parseDateInput(str(fd, "date"));
  if (!date) return fail("Choose the date.");
  if (date < today()) return fail("The date has already passed.");
  const qty = vendor.category === "CATERING" ? int(fd, "qty") : 1;
  if (vendor.category === "CATERING" && (!Number.isFinite(qty) || qty < 20 || qty > 5000)) return fail("Enter the number of plates (20–5,000).");
  if (!(await vendorAvailable(db, vendor.id, date))) return fail(`${vendor.name} is already booked on ${fmtDate(date)}. Look at the backup suggestions or pick another date.`);
  const dup = await db.booking.findFirst({ where: { weddingId: g.weddingId, vendorId: vendor.id, eventDate: date, status: { in: ["REQUESTED", "ACCEPTED"] } } });
  if (dup) return fail("You already have an active booking with this vendor for that date.");
  const amount = pkg.price * qty;
  if (amount > 1_000_000_000) return fail("That booking is too large to record here. Contact the vendor directly.");
  const b = await db.booking.create({ data: { weddingId: g.weddingId, vendorId: vendor.id, packageId: pkg.id, eventType, eventDate: date, amount, note: str(fd, "note").slice(0, 500) || null } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "booking.requested", entity: "Booking", entityId: b.id, detail: `${vendor.name} · ${pkg.name} · ${taka(amount)}` });
  const w = await db.wedding.findUniqueOrThrow({ where: { id: g.weddingId } });
  if (vendor.ownerId) await notify({ userId: vendor.ownerId, to: vendor.name, title: "New booking request", body: `${w.brideName} & ${w.groomName} asked for ${pkg.name} on ${fmtDate(date)} (${taka(amount)}).` });
  revalidatePath("/", "layout");
  return ok(`Request sent to ${vendor.name}. You'll be notified when they reply.`);
}

export async function cancelBooking(fd: FormData) {
  const g = await auth(["COUPLE"]); if (typeof g === "string") return;
  const b = await db.booking.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId, status: { in: ["REQUESTED", "ACCEPTED"] } }, include: { vendor: true, payments: true } });
  if (!b) return;
  if (b.payments.some((p) => p.paidAt) && b.status === "ACCEPTED") {
    // Paid milestones stay on record; unpaid ones are removed.
    await db.payment.deleteMany({ where: { bookingId: b.id, paidAt: null } });
  } else await db.payment.deleteMany({ where: { bookingId: b.id } });
  await db.booking.update({ where: { id: b.id }, data: { status: "CANCELLED" } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "booking.cancelled", entity: "Booking", entityId: b.id, detail: b.vendor.name });
  if (b.vendor.ownerId) await notify({ userId: b.vendor.ownerId, to: b.vendor.name, title: "Booking cancelled", body: `A couple cancelled their booking for ${fmtDate(b.eventDate)}.` });
  revalidatePath("/", "layout");
}

export async function submitReview(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await auth(["COUPLE"]); if (typeof g === "string") return fail(g);
  const b = await db.booking.findFirst({ where: { id: str(fd, "bookingId"), weddingId: g.weddingId }, include: { review: true, vendor: true } });
  if (!b) return fail("That booking no longer exists.");
  if (!["ACCEPTED", "COMPLETED"].includes(b.status)) return fail("Only couples with a confirmed booking can review a vendor.");
  if (b.review) return fail("You've already reviewed this booking.");
  const r = { punctuality: int(fd, "punctuality"), behavior: int(fd, "behavior"), quality: int(fd, "quality"), value: int(fd, "value") };
  if (Object.values(r).some((v) => !(v >= 1 && v <= 5))) return fail("Rate all four areas from 1 to 5 stars.");
  const text = str(fd, "text");
  if (text.length < 10) return fail("Write a sentence or two about your experience.");
  await db.review.create({ data: { bookingId: b.id, vendorId: b.vendorId, authorId: g.user.id, ...r, overall: (r.punctuality + r.behavior + r.quality + r.value) / 4, text: text.slice(0, 1000) } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "review.posted", entity: "Vendor", entityId: b.vendorId, detail: b.vendor.name });
  if (b.vendor.ownerId) await notify({ userId: b.vendor.ownerId, to: b.vendor.name, title: "New verified review", body: `You received a ${((r.punctuality + r.behavior + r.quality + r.value) / 4).toFixed(1)}★ review.` });
  revalidatePath("/", "layout");
  return ok("Thank you! Your verified review is live.");
}
