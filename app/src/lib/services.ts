// Domain logic shared by pages, server actions, the AI tools and the seed script.
import { randomBytes } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { BUDGET_SPLIT, CHECKLIST_TEMPLATE, EVENT_DAY_OFFSET, EVENT_META, MILESTONES, TIMELINE_TEMPLATE, VENDOR_CATEGORIES } from "./constants";
import { addDays, daysBetween, today } from "./today";

export const token = (bytes = 16) => randomBytes(bytes).toString("hex");
export const shortCode = () => randomBytes(5).toString("hex");

type Db = PrismaClient;

export async function createWedding(
  db: Db,
  input: { userId: string; brideName: string; groomName: string; date: Date; city: string; venueName: string | null; totalBudget: number; events: string[] },
) {
  const wedding = await db.wedding.create({
    data: {
      brideName: input.brideName, groomName: input.groomName, date: input.date, city: input.city,
      venueName: input.venueName, totalBudget: input.totalBudget, publicCode: shortCode(),
      members: { create: { userId: input.userId, role: "COUPLE" } },
    },
  });
  const eventIds: Record<string, string> = {};
  for (const type of input.events) {
    const ev = await db.event.create({
      data: {
        weddingId: wedding.id, type, name: EVENT_META[type]?.name ?? type,
        date: addDays(input.date, EVENT_DAY_OFFSET[type] ?? 0), venue: type === "WEDDING" ? input.venueName : null,
        shareCode: shortCode(),
        items: { create: (TIMELINE_TEMPLATE[type] ?? []).map((i) => ({ ...i })) },
      },
    });
    eventIds[type] = ev.id;
  }
  // Budget categories from the default split, rounded to the nearest ৳1,000
  let allocated = 0;
  for (const [i, c] of BUDGET_SPLIT.entries()) {
    const amt = i === BUDGET_SPLIT.length - 1 ? input.totalBudget - allocated : Math.round((input.totalBudget * c.pct) / 100 / 1000) * 1000;
    allocated += amt;
    await db.budgetCategory.create({ data: { weddingId: wedding.id, key: c.key, name: c.name, allocated: amt } });
  }
  // Checklist: only tasks relevant to the chosen events; tasks already overdue are kept (due today)
  const t0 = today();
  let order = 0;
  for (const t of CHECKLIST_TEMPLATE) {
    if (t.event && !eventIds[t.event]) continue;
    let due = addDays(input.date, -t.daysBefore);
    if (due < t0) due = t0;
    await db.task.create({
      data: { weddingId: wedding.id, title: t.title, category: t.category, dueDate: due, order: order++, eventId: t.event ? eventIds[t.event] : null },
    });
  }
  return wedding;
}

/** Vendor accepts → schedule Booking / Advance / Final Settlement payments. */
export async function schedulePayments(db: Db, bookingId: string) {
  const b = await db.booking.findUniqueOrThrow({ where: { id: bookingId } });
  const existing = await db.payment.count({ where: { bookingId } });
  if (existing) return;
  const t0 = today();
  let sum = 0;
  let prevDue = t0;
  for (const [i, m] of MILESTONES.entries()) {
    const amount = i === MILESTONES.length - 1 ? b.amount - sum : Math.round((b.amount * m.pct) / 100);
    sum += amount;
    let due = m.daysBefore === null ? addDays(t0, 7) : addDays(b.eventDate, -m.daysBefore);
    // Milestones stay in order (Booking → Advance → Final), never fall due in the past,
    // and never after the event itself (short-notice bookings bunch up on the event date).
    if (i > 0 && due <= prevDue) due = addDays(prevDue, 1);
    if (due > b.eventDate) due = b.eventDate;
    if (due < t0) due = t0;
    if (due < prevDue) due = prevDue;
    prevDue = due;
    await db.payment.create({ data: { weddingId: b.weddingId, bookingId, milestone: m.key, amount, dueDate: due } });
  }
}

/** Keeps a seated guest only if their table still has room for their confirmed seats. */
export async function tableIdIfFits(db: Db, tableId: string | null, guestId: string, seats: number) {
  if (!tableId || seats <= 0) return null;
  const t = await db.seatTable.findUnique({ where: { id: tableId }, include: { guests: true } });
  if (!t) return null;
  const used = t.guests.filter((g) => g.id !== guestId).reduce((a, g) => a + g.confirmedSeats, 0);
  return used + seats <= t.capacity ? tableId : null;
}

export function paymentState(p: { paidAt: Date | null; dueDate: Date }) {
  if (p.paidAt) return { key: "PAID", label: "Paid", tone: "ok" as const };
  const d = daysBetween(today(), p.dueDate);
  if (d < 0) return { key: "OVERDUE", label: `Overdue ${-d}d`, tone: "bad" as const };
  if (d <= 7) return { key: "DUE", label: d === 0 ? "Due today" : `Due in ${d} day${d === 1 ? "" : "s"}`, tone: "warn" as const };
  return { key: "UPCOMING", label: "Upcoming", tone: "muted" as const };
}

export async function budgetSummary(db: Db, weddingId: string) {
  const w = await db.wedding.findUniqueOrThrow({ where: { id: weddingId } });
  const cats = await db.budgetCategory.findMany({ where: { weddingId }, include: { expenses: true } });
  const rows = cats
    .map((c) => {
      const spent = c.expenses.filter((e) => e.status === "PAID").reduce((a, e) => a + e.amount, 0);
      const committed = c.expenses.reduce((a, e) => a + e.amount, 0);
      return { id: c.id, key: c.key, name: c.name, allocated: c.allocated, spent, committed, over: committed > c.allocated };
    })
    .sort((a, b) => BUDGET_SPLIT.findIndex((x) => x.key === a.key) - BUDGET_SPLIT.findIndex((x) => x.key === b.key));
  const spent = rows.reduce((a, r) => a + r.spent, 0);
  const committed = rows.reduce((a, r) => a + r.committed, 0);
  const allocatedTotal = rows.reduce((a, r) => a + r.allocated, 0);
  return {
    total: w.totalBudget, spent, committed, remaining: w.totalBudget - spent,
    pctUsed: w.totalBudget ? Math.round((spent / w.totalBudget) * 100) : 0,
    allocatedTotal, rows,
  };
}

export async function guestSummary(db: Db, weddingId: string) {
  const guests = await db.guest.findMany({ where: { weddingId } });
  const seats = (s: string) => guests.filter((g) => g.status === s);
  const confirmed = seats("CONFIRMED").reduce((a, g) => a + g.confirmedSeats, 0);
  const pending = seats("PENDING").reduce((a, g) => a + g.invitedSeats, 0);
  const declined = seats("DECLINED").reduce((a, g) => a + g.invitedSeats, 0);
  const invited = guests.reduce((a, g) => a + g.invitedSeats, 0);
  const diet: Record<string, number> = {};
  for (const g of seats("CONFIRMED")) for (const t of (g.diet ?? "").split(",").filter(Boolean)) diet[t] = (diet[t] ?? 0) + g.confirmedSeats;
  const checkedIn = guests.reduce((a, g) => a + g.checkedInSeats, 0);
  return {
    parties: guests.length, invited, confirmed, pending, declined, diet, checkedIn,
    pendingParties: seats("PENDING").length,
    bride: guests.filter((g) => g.side === "BRIDE").reduce((a, g) => a + g.invitedSeats, 0),
    groom: guests.filter((g) => g.side === "GROOM").reduce((a, g) => a + g.invitedSeats, 0),
  };
}

export async function taskSummary(db: Db, weddingId: string) {
  const tasks = await db.task.findMany({ where: { weddingId } });
  const t0 = today();
  return {
    total: tasks.length,
    done: tasks.filter((t) => t.done).length,
    overdue: tasks.filter((t) => !t.done && t.dueDate && t.dueDate < t0).length,
    dueThisWeek: tasks.filter((t) => !t.done && t.dueDate && daysBetween(t0, t.dueDate) >= 0 && daysBetween(t0, t.dueDate) <= 7),
  };
}

/** Is the vendor free on the date? Blocked dates and accepted bookings both count. */
export async function vendorAvailable(db: Db, vendorId: string, date: Date, excludeBookingId?: string) {
  const blocked = await db.blockedDate.findFirst({ where: { vendorId, date } });
  if (blocked) return false;
  const v = await db.vendor.findUniqueOrThrow({ where: { id: vendorId } });
  // Venues/caterers/photographers can serve one wedding per day in V1 (assumption)
  const clash = await db.booking.findFirst({
    where: { vendorId, eventDate: date, status: "ACCEPTED", id: excludeBookingId ? { not: excludeBookingId } : undefined },
  });
  return !clash && v.status === "APPROVED";
}

/** Zero Panic Policy: same category, available on the date, starting price within ±20%, best rated first. */
export async function backupVendors(db: Db, vendor: { id: string; category: string; startingPrice: number }, date: Date, limit = 3) {
  const lo = vendor.startingPrice * 0.8, hi = vendor.startingPrice * 1.2;
  const pool = await db.vendor.findMany({
    where: { status: "APPROVED", category: vendor.category, id: { not: vendor.id }, startingPrice: { gte: Math.floor(lo), lte: Math.ceil(hi) } },
    include: { reviews: true },
  });
  const out = [];
  for (const v of pool) if (await vendorAvailable(db, v.id, date)) out.push({ ...v, avg: reviewAverages(v.reviews) });
  // widen the price band if nothing fits
  if (!out.length) {
    const wider = await db.vendor.findMany({ where: { status: "APPROVED", category: vendor.category, id: { not: vendor.id } }, include: { reviews: true } });
    for (const v of wider) if (await vendorAvailable(db, v.id, date)) out.push({ ...v, avg: reviewAverages(v.reviews) });
  }
  return out.sort((a, b) => b.avg.overall - a.avg.overall).slice(0, limit);
}

export function reviewAverages(reviews: { punctuality: number; behavior: number; quality: number; value: number; overall: number; hidden: boolean }[]) {
  const r = reviews.filter((x) => !x.hidden);
  const avg = (k: "punctuality" | "behavior" | "quality" | "value" | "overall") => (r.length ? Math.round((r.reduce((a, x) => a + x[k], 0) / r.length) * 10) / 10 : 0);
  return { count: r.length, overall: avg("overall"), punctuality: avg("punctuality"), behavior: avg("behavior"), quality: avg("quality"), value: avg("value") };
}

/**
 * AI Match: deterministic 0–100 score for how well a vendor fits this wedding.
 * Need (10: category not booked yet) + budget fit (35: price vs what's left in the category)
 * + city (15) + verified rating (25) + free on the wedding date (15).
 */
export type MatchContext = { remaining: Record<string, number>; booked: Set<string>; guests: number };

export async function matchContext(db: Db, weddingId: string): Promise<MatchContext> {
  const b = await budgetSummary(db, weddingId);
  const bookings = await db.booking.findMany({ where: { weddingId, status: { in: ["REQUESTED", "ACCEPTED"] } }, include: { vendor: true } });
  const g = await guestSummary(db, weddingId);
  return {
    remaining: Object.fromEntries(b.rows.map((r) => [r.key, Math.max(0, r.allocated - r.committed)])),
    booked: new Set(bookings.map((x) => x.vendor.category)),
    guests: Math.max(50, g.confirmed + g.pending),
  };
}

export async function matchScore(
  db: Db,
  wedding: { id: string; city: string; date: Date },
  vendor: { id: string; category: string; city: string; startingPrice: number; reviews: { overall: number; hidden: boolean; punctuality: number; behavior: number; quality: number; value: number }[] },
  ctx: MatchContext,
) {
  const key = VENDOR_CATEGORIES[vendor.category]?.budgetKey;
  const left = key ? ctx.remaining[key] ?? 0 : 0;
  const cost = vendor.category === "CATERING" ? vendor.startingPrice * ctx.guests : vendor.startingPrice;
  const budgetFit = left <= 0 ? 5 : cost <= left * 0.6 ? 35 : cost <= left ? 28 : Math.max(0, 28 - Math.round(((cost - left) / left) * 50));
  const need = ctx.booked.has(vendor.category) ? 0 : 10;
  const city = vendor.city === wedding.city ? 15 : 0;
  const avg = reviewAverages(vendor.reviews);
  const rating = avg.count ? Math.max(0, Math.min(25, Math.round(((avg.overall - 3.5) / 1.5) * 25))) : 8;
  const avail = (await vendorAvailable(db, vendor.id, wedding.date)) ? 15 : 0;
  return need + budgetFit + city + rating + avail;
}
