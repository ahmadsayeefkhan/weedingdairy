"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, PermissionError } from "@/lib/wedding";
import { fail, ok, str, type ActionResult } from "@/lib/result";
import { addDays, daysBetween, parseDateInput, today } from "@/lib/today";
import { CITIES } from "@/lib/constants";
import { audit } from "@/lib/log";

export async function saveSettings(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let g;
  try { g = await authorizeWedding(["COUPLE"]); } catch (e) { if (e instanceof PermissionError) return fail(e.message); throw e; }
  const brideName = str(fd, "bride"), groomName = str(fd, "groom");
  const date = parseDateInput(str(fd, "date"));
  const city = str(fd, "city");
  const visibility = str(fd, "visibility");
  if (brideName.length < 2 || groomName.length < 2) return fail("Enter both names.");
  if (!date) return fail("Choose the wedding date.");
  const w = await db.wedding.findUniqueOrThrow({ where: { id: g.weddingId } });
  if (+date !== +w.date && date < today()) return fail("A new wedding date can't be in the past.");
  if (!CITIES.includes(city)) return fail("Choose a city.");
  if (!["PUBLIC", "GUEST_ONLY", "PRIVATE"].includes(visibility)) return fail("Choose who can see your wedding.");
  const prefs = fd.getAll("prefs").map(String).filter((p) => ["rsvp", "payments", "tasks"].includes(p)).join(",");
  await db.wedding.update({
    where: { id: g.weddingId },
    data: { brideName, groomName, date, city, venueName: str(fd, "venue") || null, visibility, notifyPrefs: prefs, photoAutoApprove: fd.get("autoApprove") === "on" },
  });
  // Moving the wedding date moves the events and the open checklist deadlines with it (unless the couple opts out).
  const shift = daysBetween(w.date, date);
  let moved = "";
  if (shift !== 0 && fd.get("moveEvents") === "on") {
    const events = await db.event.findMany({ where: { weddingId: g.weddingId } });
    const tasks = await db.task.findMany({ where: { weddingId: g.weddingId, done: false, dueDate: { not: null } } });
    const t0 = today();
    await db.$transaction([
      ...events.map((e) => db.event.update({ where: { id: e.id }, data: { date: addDays(e.date, shift) } })),
      ...tasks.map((t) => { const d = addDays(t.dueDate!, shift); return db.task.update({ where: { id: t.id }, data: { dueDate: d < t0 ? t0 : d } }); }),
    ]);
    moved = ` Your ${events.length} events and ${tasks.length} open tasks moved ${Math.abs(shift)} days ${shift > 0 ? "later" : "earlier"}.`;
  }
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "settings.saved", entity: "Wedding", detail: shift ? `wedding date moved ${shift} days` : `visibility ${visibility}` });
  revalidatePath("/", "layout");
  return ok(`Settings saved.${moved}`);
}
