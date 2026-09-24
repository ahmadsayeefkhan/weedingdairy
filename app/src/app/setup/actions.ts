"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { fail, int, str, type ActionResult } from "@/lib/result";
import { createWedding } from "@/lib/services";
import { parseDateInput, today } from "@/lib/today";
import { EVENT_TYPES, CITIES } from "@/lib/constants";
import { audit } from "@/lib/log";

export async function completeSetup(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "USER") return fail("Only couples can set up a wedding.");
  if (await db.weddingMember.findFirst({ where: { userId: user.id } })) redirect("/dashboard");
  const brideName = str(fd, "bride");
  const groomName = str(fd, "groom");
  const date = parseDateInput(str(fd, "date"));
  const city = str(fd, "city");
  const venue = str(fd, "venue");
  const budget = int(fd, "budget");
  const events = fd.getAll("events").map(String).filter((e) => (EVENT_TYPES as readonly string[]).includes(e));
  if (brideName.length < 2 || groomName.length < 2) return fail("Enter both the bride's and the groom's names.");
  if (!date) return fail("Choose your wedding date.");
  if (date <= today()) return fail("The wedding date needs to be in the future.");
  if (!CITIES.includes(city)) return fail("Choose a city.");
  if (!events.length) return fail("Pick at least one event: Holud, Mehendi, Wedding or Reception.");
  if (!Number.isFinite(budget) || budget < 100000 || budget > 100000000) return fail("Set a budget between ৳1,00,000 and ৳10,00,00,000.");
  const w = await createWedding(db, { userId: user.id, brideName, groomName, date, city, venueName: venue || null, totalBudget: budget, events });
  await db.user.update({ where: { id: user.id }, data: { onboarded: true } });
  await audit({ weddingId: w.id, userId: user.id, action: "wedding.created", entity: "Wedding", entityId: w.id, detail: `${brideName} & ${groomName}` });
  redirect("/dashboard?welcome=1");
}
