"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, PermissionError } from "@/lib/wedding";
import { fail, int, ok, str, type ActionResult } from "@/lib/result";
import { parseDateInput, today } from "@/lib/today";
import { VENDOR_CATEGORIES, milestoneName } from "@/lib/constants";
import { taka } from "@/lib/format";
import { audit, notify } from "@/lib/log";

async function couple() {
  try { return await authorizeWedding(["COUPLE"]); } catch (e) { if (e instanceof PermissionError) return e.message; throw e; }
}

export async function addExpense(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await couple(); if (typeof g === "string") return fail(g);
  const title = str(fd, "title");
  const amount = int(fd, "amount");
  const status = str(fd, "status") === "PAID" ? "PAID" : "PENDING";
  const date = parseDateInput(str(fd, "date")) ?? today();
  const cat = await db.budgetCategory.findFirst({ where: { id: str(fd, "categoryId"), weddingId: g.weddingId } });
  if (title.length < 2) return fail("Describe the expense.");
  if (!cat) return fail("Choose a budget category.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 50000000) return fail("Enter an amount in taka, for example 25000.");
  await db.expense.create({ data: { weddingId: g.weddingId, categoryId: cat.id, title, amount, status, date } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "expense.added", entity: "Expense", detail: `${title} ${taka(amount)} (${status})` });
  revalidatePath("/", "layout");
  return ok(`Added ${taka(amount)} to ${cat.name}.`);
}

export async function toggleExpense(fd: FormData) {
  const g = await couple(); if (typeof g === "string") return;
  const e = await db.expense.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId } });
  if (!e || e.paymentId) return; // vendor milestone expenses follow their payment
  await db.expense.update({ where: { id: e.id }, data: { status: e.status === "PAID" ? "PENDING" : "PAID" } });
  revalidatePath("/", "layout");
}

export async function deleteExpense(fd: FormData) {
  const g = await couple(); if (typeof g === "string") return;
  const e = await db.expense.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId } });
  if (!e || e.paymentId) return;
  await db.expense.delete({ where: { id: e.id } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "expense.deleted", entity: "Expense", detail: `${e.title} ${taka(e.amount)}` });
  revalidatePath("/", "layout");
}

export async function updateAllocations(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await couple(); if (typeof g === "string") return fail(g);
  const total = int(fd, "total");
  if (!Number.isFinite(total) || total < 100000 || total > 100000000) return fail("Set a total between ৳1,00,000 and ৳10,00,00,000.");
  const cats = await db.budgetCategory.findMany({ where: { weddingId: g.weddingId } });
  const updates: { id: string; allocated: number }[] = [];
  for (const c of cats) {
    const v = int(fd, `c_${c.id}`);
    if (!Number.isFinite(v) || v < 0 || v > 100000000) return fail(`Enter a valid amount for ${c.name}.`);
    updates.push({ id: c.id, allocated: v });
  }
  const sum = updates.reduce((a, u) => a + u.allocated, 0);
  if (sum > total) return fail(`Your categories add up to ${taka(sum)}, which is more than the total of ${taka(total)}. Lower a category or raise the total.`);
  await db.$transaction([
    db.wedding.update({ where: { id: g.weddingId }, data: { totalBudget: total } }),
    ...updates.map((u) => db.budgetCategory.update({ where: { id: u.id }, data: { allocated: u.allocated } })),
  ]);
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "budget.reallocated", entity: "Wedding", detail: `Total ${taka(total)}` });
  revalidatePath("/", "layout");
  return ok(sum < total ? `Saved. ${taka(total - sum)} is not yet allocated.` : "Saved.");
}

/** Simulated checkout (bKash / Nagad / card / cash). TODO: real gateway in Phase 2 (RAID Q2). Idempotent: a paid milestone stays paid. */
export async function payMilestone(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await couple(); if (typeof g === "string") return fail(g);
  const p = await db.payment.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId }, include: { booking: { include: { vendor: true } } } });
  if (!p) return fail("That payment no longer exists.");
  if (p.paidAt) return ok("This payment was already recorded as paid.");
  const method = ["bKash", "Nagad", "Card", "Cash", "Bank transfer"].includes(str(fd, "method")) ? str(fd, "method") : "bKash";
  const key = VENDOR_CATEGORIES[p.booking.vendor.category]?.budgetKey ?? "MISC";
  const cat = await db.budgetCategory.findFirst({ where: { weddingId: g.weddingId, key } }) ?? (await db.budgetCategory.findFirstOrThrow({ where: { weddingId: g.weddingId } }));
  const when = today();
  // Idempotent: only the request that flips paidAt from null records the expense (two tabs can't double-pay).
  const paid = await db.$transaction(async (tx) => {
    const flipped = await tx.payment.updateMany({ where: { id: p.id, paidAt: null }, data: { paidAt: when, method: `${method} (simulated)` } });
    if (flipped.count !== 1) return false;
    await tx.expense.create({ data: { weddingId: g.weddingId, categoryId: cat.id, vendorId: p.booking.vendorId, paymentId: p.id, title: `${milestoneName(p.milestone)}: ${p.booking.vendor.name}`, amount: p.amount, status: "PAID", date: when } });
    return true;
  });
  if (!paid) return ok("This payment was already recorded as paid.");
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "payment.paid", entity: "Payment", entityId: p.id, detail: `${p.booking.vendor.name} ${milestoneName(p.milestone)} ${taka(p.amount)} via ${method}` });
  if (p.booking.vendor.ownerId) await notify({ userId: p.booking.vendor.ownerId, to: p.booking.vendor.name, title: "Payment received", body: `${milestoneName(p.milestone)} of ${taka(p.amount)} paid via ${method} (simulated).` });
  revalidatePath("/", "layout");
  return ok(`Paid ${taka(p.amount)} to ${p.booking.vendor.name} via ${method}. Your budget has been updated.`);
}
