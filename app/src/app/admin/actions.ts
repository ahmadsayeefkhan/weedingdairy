"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/result";
import { audit, notify } from "@/lib/log";

async function admin() {
  const u = await requireUser();
  return u.role === "ADMIN" ? u : null;
}

export async function setVendorStatus(fd: FormData) {
  const a = await admin(); if (!a) return;
  const status = str(fd, "status");
  if (!["APPROVED", "SUSPENDED", "PENDING"].includes(status)) return;
  const v = await db.vendor.findUnique({ where: { id: str(fd, "id") }, include: { _count: { select: { packages: true } } } });
  if (!v) return;
  // A listing needs at least one package and a description before couples can see it.
  if (status === "APPROVED" && (v._count.packages === 0 || v.about.trim().length < 20)) return;
  await db.vendor.update({ where: { id: v.id }, data: { status } });
  await audit({ userId: a.id, action: `vendor.${status.toLowerCase()}`, entity: "Vendor", entityId: v.id, detail: v.name });
  if (v.ownerId) {
    const owner = await db.user.findUnique({ where: { id: v.ownerId } });
    if (owner) await notify({ userId: owner.id, channel: "EMAIL", to: owner.email, title: status === "APPROVED" ? "Your listing is live" : status === "SUSPENDED" ? "Your listing was suspended" : "Listing back in review", body: status === "APPROVED" ? `${v.name} is now visible to couples on Wedding Diary.` : `${v.name} is hidden from couples. Contact hello@weddingdiary.bd.` });
  }
  revalidatePath("/admin", "layout");
}

export async function toggleFeatured(fd: FormData) {
  const a = await admin(); if (!a) return;
  const v = await db.vendor.findUnique({ where: { id: str(fd, "id") } });
  if (!v) return;
  await db.vendor.update({ where: { id: v.id }, data: { featured: !v.featured } });
  revalidatePath("/admin", "layout");
}

export async function setReviewHidden(fd: FormData) {
  const a = await admin(); if (!a) return;
  const r = await db.review.findUnique({ where: { id: str(fd, "id") }, include: { vendor: true } });
  if (!r) return;
  const hidden = str(fd, "hidden") === "1";
  await db.review.update({ where: { id: r.id }, data: { hidden } });
  await audit({ userId: a.id, action: hidden ? "review.hidden" : "review.restored", entity: "Review", entityId: r.id, detail: r.vendor.name });
  revalidatePath("/admin", "layout");
}
