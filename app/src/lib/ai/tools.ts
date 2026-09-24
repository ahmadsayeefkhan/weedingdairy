import "server-only";
import { db } from "@/lib/db";
import { budgetSummary, guestSummary, paymentState, reviewAverages, taskSummary, vendorAvailable } from "@/lib/services";
import { EVENT_META, TASK_CATEGORIES, VENDOR_CATEGORIES, milestoneName } from "@/lib/constants";
import { daysBetween, today } from "@/lib/today";
import { fmtDate, fmtTime, taka } from "@/lib/format";
import type { WeddingRole } from "@/lib/wedding";

/**
 * Read-only tools over the asking user's own wedding. They run with that user's role:
 * money tools exist only for the couple. Field deny-list: guest phone numbers, emails,
 * RSVP tokens and free-text diet notes are never returned to the model.
 */
export type ToolCtx = { weddingId: string; role: WeddingRole };

type Def = { name: string; description: string; input_schema: { type: "object"; properties: Record<string, unknown>; required?: string[]; additionalProperties: false }; roles: WeddingRole[]; run: (ctx: ToolCtx, input: Record<string, unknown>) => Promise<unknown> };

const ALL: WeddingRole[] = ["COUPLE", "PLANNER", "FAMILY"];

export const TOOLS: Def[] = [
  {
    name: "wedding_overview",
    description: "Couple names, wedding date, days to go, city, main venue and the list of events (Holud, Mehendi, Wedding, Reception) with dates and venues.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    roles: ALL,
    run: async ({ weddingId }) => {
      const w = await db.wedding.findUniqueOrThrow({ where: { id: weddingId }, include: { events: { orderBy: { date: "asc" } } } });
      return {
        couple: `${w.brideName} & ${w.groomName}`, weddingDate: fmtDate(w.date), daysToGo: daysBetween(today(), w.date), today: fmtDate(today()), city: w.city, venue: w.venueName,
        events: w.events.map((e) => ({ name: e.name, type: EVENT_META[e.type]?.name, date: fmtDate(e.date), daysAway: daysBetween(today(), e.date), venue: e.venue })),
      };
    },
  },
  {
    name: "event_timeline",
    description: "Hour-by-hour timeline for one event. Pass the event type: HOLUD, MEHENDI, WEDDING or RECEPTION.",
    input_schema: { type: "object", properties: { event_type: { type: "string", enum: ["HOLUD", "MEHENDI", "WEDDING", "RECEPTION"] } }, required: ["event_type"], additionalProperties: false },
    roles: ALL,
    run: async ({ weddingId }, input) => {
      const ev = await db.event.findFirst({ where: { weddingId, type: String(input.event_type) }, include: { items: { orderBy: { time: "asc" } } } });
      if (!ev) return { error: "This wedding has no such event." };
      return { event: ev.name, date: fmtDate(ev.date), venue: ev.venue, items: ev.items.map((i) => ({ time: fmtTime(i.time), title: i.title, location: i.location, status: i.status })) };
    },
  },
  {
    name: "budget_summary",
    description: "Total budget, spent, remaining and per-category allocation vs spent in Bangladeshi taka, including over-budget categories.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    roles: ["COUPLE"],
    run: async ({ weddingId }) => {
      const s = await budgetSummary(db, weddingId);
      return { total: taka(s.total), spent: taka(s.spent), remaining: taka(s.remaining), percentUsed: s.pctUsed, categories: s.rows.map((r) => ({ name: r.name, allocated: taka(r.allocated), spent: taka(r.spent), committed: taka(r.committed), overBudget: r.over })) };
    },
  },
  {
    name: "payments_due",
    description: "Vendor payment milestones (Booking, Advance, Final Settlement) that are unpaid, with due dates and status.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    roles: ["COUPLE"],
    run: async ({ weddingId }) => {
      const ps = await db.payment.findMany({ where: { weddingId, paidAt: null }, include: { booking: { include: { vendor: true } } }, orderBy: { dueDate: "asc" } });
      return ps.map((p) => ({ vendor: p.booking.vendor.name, milestone: milestoneName(p.milestone), amount: taka(p.amount), due: fmtDate(p.dueDate), status: paymentState(p).label }));
    },
  },
  {
    name: "guest_summary",
    description: "RSVP counts (seats) confirmed / pending / declined, bride's vs groom's side, dietary needs totals, and names of invitations still pending (names only).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    roles: ALL,
    run: async ({ weddingId }) => {
      const s = await guestSummary(db, weddingId);
      const pending = await db.guest.findMany({ where: { weddingId, status: "PENDING" }, select: { name: true, side: true }, take: 30 });
      return { invitedSeats: s.invited, confirmedSeats: s.confirmed, pendingSeats: s.pending, declinedSeats: s.declined, brideSide: s.bride, groomSide: s.groom, dietaryCounts: s.diet, checkedIn: s.checkedIn, pendingInvitations: pending.map((p) => `${p.name} (${p.side === "BRIDE" ? "bride's" : "groom's"} side)`) };
    },
  },
  {
    name: "checklist_status",
    description: "Checklist progress plus overdue tasks and tasks due in the next 14 days.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    roles: ALL,
    run: async ({ weddingId }) => {
      const s = await taskSummary(db, weddingId);
      const t0 = today();
      const open = await db.task.findMany({ where: { weddingId, done: false }, orderBy: { dueDate: "asc" } });
      return {
        done: s.done, total: s.total,
        overdue: open.filter((t) => t.dueDate && t.dueDate < t0).map((t) => ({ task: t.title, category: TASK_CATEGORIES[t.category], due: t.dueDate && fmtDate(t.dueDate) })),
        next14Days: open.filter((t) => t.dueDate && t.dueDate >= t0 && daysBetween(t0, t.dueDate) <= 14).map((t) => ({ task: t.title, category: TASK_CATEGORIES[t.category], due: t.dueDate && fmtDate(t.dueDate) })),
      };
    },
  },
  {
    name: "bookings_status",
    description: "The wedding's vendor bookings and their status (requested, confirmed, declined).",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
    roles: ALL,
    run: async ({ weddingId, role }) => {
      const bs = await db.booking.findMany({ where: { weddingId }, include: { vendor: true, package: true } });
      return bs.map((b) => ({ vendor: b.vendor.name, category: VENDOR_CATEGORIES[b.vendor.category]?.name, package: b.package?.name, event: EVENT_META[b.eventType]?.name, date: fmtDate(b.eventDate), status: b.status, ...(role === "COUPLE" ? { amount: taka(b.amount) } : {}) }));
    },
  },
  {
    name: "search_vendors",
    description: "Search approved marketplace vendors. Optional filters: category (PHOTOGRAPHY, CINEMATOGRAPHY, VENUE, CATERING, DECOR, MAKEUP, MEHENDI, MUSIC, TRANSPORT), city, max_price in taka, and whether they are free on the wedding date.",
    input_schema: {
      type: "object",
      properties: { category: { type: "string" }, city: { type: "string" }, max_price: { type: "number" }, available_on_wedding_date: { type: "boolean" } },
      additionalProperties: false,
    },
    roles: ALL,
    run: async ({ weddingId }, input) => {
      const w = await db.wedding.findUniqueOrThrow({ where: { id: weddingId } });
      const vs = await db.vendor.findMany({
        where: { status: "APPROVED", ...(input.category ? { category: String(input.category).toUpperCase() } : {}), ...(input.city ? { city: String(input.city) } : {}), ...(input.max_price ? { startingPrice: { lte: Number(input.max_price) } } : {}) },
        include: { reviews: true },
      });
      const out = [];
      for (const v of vs) {
        const free = await vendorAvailable(db, v.id, w.date);
        if (input.available_on_wedding_date && !free) continue;
        out.push({ name: v.name, category: VENDOR_CATEGORIES[v.category]?.name, area: `${v.area}, ${v.city}`, from: taka(v.startingPrice) + (v.category === "CATERING" ? " per plate" : ""), rating: reviewAverages(v.reviews).overall || "new", reviews: reviewAverages(v.reviews).count, freeOnWeddingDay: free, link: `/vendors/${v.slug}` });
      }
      return out.sort((a, b) => Number(b.rating) - Number(a.rating)).slice(0, 8);
    },
  },
];

export function toolsFor(role: WeddingRole) {
  return TOOLS.filter((t) => t.roles.includes(role));
}

export async function runTool(ctx: ToolCtx, name: string, input: Record<string, unknown>) {
  const t = toolsFor(ctx.role).find((x) => x.name === name);
  if (!t) return { error: `Tool ${name} isn't available for your role.` };
  try { return await t.run(ctx, input ?? {}); } catch { return { error: "That lookup failed." }; }
}
