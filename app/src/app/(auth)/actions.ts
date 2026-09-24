"use server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, homeFor, verifyPassword, currentUser } from "@/lib/auth";
import { fail, str, type ActionResult } from "@/lib/result";
import { audit, notify } from "@/lib/log";
import { VENDOR_CATEGORIES } from "@/lib/constants";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  if (!EMAIL.test(email)) return fail("Enter a valid email address.");
  if (!password) return fail("Enter your password.");
  const u = await db.user.findUnique({ where: { email } });
  if (!u || !(await verifyPassword(password, u.passwordHash))) return fail("That email and password don't match. Check them and try again.");
  await createSession(u.id);
  const next = str(fd, "next");
  if (next.startsWith("/join/")) redirect(next);
  if (u.role === "USER" && !u.onboarded) redirect("/setup");
  redirect(homeFor(u.role));
}

export async function signup(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const name = str(fd, "name");
  const email = str(fd, "email").toLowerCase();
  const password = str(fd, "password");
  const kind = str(fd, "kind") === "vendor" ? "vendor" : "couple";
  const inviteToken = str(fd, "invite");
  if (name.length < 2) return fail("Enter your full name.");
  if (!EMAIL.test(email)) return fail("Enter a valid email address.");
  if (password.length < 8) return fail("Use at least 8 characters for your password.");
  if (await db.user.findUnique({ where: { email } })) return fail("An account with this email already exists. Sign in instead.");

  if (kind === "vendor") {
    const business = str(fd, "business");
    const category = str(fd, "category");
    const city = str(fd, "city") || "Dhaka";
    if (business.length < 2) return fail("Enter your business name.");
    if (!VENDOR_CATEGORIES[category]) return fail("Choose a vendor category.");
    const u = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "VENDOR", onboarded: true } });
    const base = business.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "vendor";
    const slug = (await db.vendor.findUnique({ where: { slug: base } })) ? `${base}-${Date.now().toString(36)}` : base;
    const v = await db.vendor.create({
      data: { ownerId: u.id, name: business, slug, category, city, area: "", priceTier: 2, startingPrice: 0, about: "", tags: "", cover: `/seed/cover-${category.toLowerCase()}-1.jpg`, status: "PENDING" },
    });
    await audit({ userId: u.id, action: "vendor.registered", entity: "Vendor", entityId: v.id, detail: business });
    const admins = await db.user.findMany({ where: { role: "ADMIN" } });
    for (const a of admins) await notify({ userId: a.id, to: a.email, title: "New vendor to review", body: `${business} (${VENDOR_CATEGORIES[category].name}, ${city}) is waiting for approval.` });
    await createSession(u.id);
    redirect("/vendor");
  }

  const u = await db.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: "USER" } });
  await createSession(u.id);
  if (inviteToken) redirect(`/join/${inviteToken}`);
  redirect("/setup");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function setLocale(fd: FormData) {
  const lang = str(fd, "lang") === "bn" ? "bn" : "en";
  (await cookies()).set("wd_lang", lang, { path: "/", maxAge: 365 * 86400, sameSite: "lax" });
  const u = await currentUser();
  if (u) await db.user.update({ where: { id: u.id }, data: { locale: lang } });
  const back = str(fd, "back");
  redirect(/^\/(?![\/\\])/.test(back) ? back : "/"); // same-site paths only (no //host or /\host)
}
