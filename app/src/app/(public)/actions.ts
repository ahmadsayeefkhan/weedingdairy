"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { fail, int, ok, str, type ActionResult } from "@/lib/result";
import { normalizeBdPhone } from "@/lib/format";
import { DIET_TAGS } from "@/lib/constants";
import { tableIdIfFits, token } from "@/lib/services";
import { today } from "@/lib/today";
import { audit, notifyMembers } from "@/lib/log";

/** Personal RSVP by token. Re-submitting updates the answer (idempotent per guest). */
export async function submitRsvp(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const guest = await db.guest.findUnique({ where: { rsvpToken: str(fd, "token") }, include: { wedding: true } });
  if (!guest) return fail("This RSVP link isn't valid any more. Ask the couple for a new one.");
  const attending = str(fd, "attending");
  if (attending !== "yes" && attending !== "no") return fail("Let the couple know whether you can come.");
  const seats = attending === "yes" ? int(fd, "seats") : 0;
  if (attending === "yes" && (!Number.isFinite(seats) || seats < 1 || seats > guest.invitedSeats)) return fail(`Choose between 1 and ${guest.invitedSeats} seats.`);
  const diet = fd.getAll("diet").map(String).filter((d) => DIET_TAGS[d]).join(",") || null;
  const dietNote = str(fd, "dietNote").slice(0, 200) || null;
  const status = attending === "yes" ? "CONFIRMED" : "DECLINED";
  const changed = guest.status !== status || guest.confirmedSeats !== seats;
  const tableId = await tableIdIfFits(db, guest.tableId, guest.id, seats);
  await db.guest.update({ where: { id: guest.id }, data: { status, confirmedSeats: seats, diet: attending === "yes" ? diet : null, dietNote, respondedAt: today(), tableId } });
  if (changed) {
    await audit({ weddingId: guest.weddingId, action: "rsvp.received", entity: "Guest", entityId: guest.id, detail: `${guest.name}: ${status}${seats ? ` (${seats})` : ""}` });
    await notifyMembers(guest.weddingId, "New RSVP", attending === "yes" ? `${guest.name} confirmed ${seats} seat${seats > 1 ? "s" : ""}.` : `${guest.name} can't make it.`);
  }
  revalidatePath(`/rsvp/${guest.rsvpToken}`);
  return ok(attending === "yes" ? `Thank you! ${guest.wedding.brideName} & ${guest.wedding.groomName} can't wait to see you. You can change your answer here any time.` : "Thank you for letting them know. You'll be missed! You can change your answer here any time.");
}

/** General invitation link: anyone can RSVP; they join the guest list for the couple to review. */
export async function selfRsvp(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const w = await db.wedding.findUnique({ where: { publicCode: str(fd, "code") } });
  if (!w || w.visibility === "PRIVATE") return fail("This invitation link isn't active.");
  const name = str(fd, "name");
  const phone = normalizeBdPhone(str(fd, "phone"));
  const attending = str(fd, "attending");
  const seats = attending === "yes" ? int(fd, "seats") : 0;
  if (name.length < 2) return fail("Enter your name.");
  if (!phone) return fail("Enter a Bangladeshi mobile number like 01711 234567, so the couple can reach you.");
  if (attending !== "yes" && attending !== "no") return fail("Let the couple know whether you can come.");
  if (attending === "yes" && (!Number.isFinite(seats) || seats < 1 || seats > 8)) return fail("Choose between 1 and 8 seats.");
  // A number already on the guest list must use its personal link: the shared link can't change someone else's RSVP.
  if (await db.guest.findFirst({ where: { weddingId: w.id, phone } })) return fail("This number is already on the couple's guest list. Please RSVP with the personal link they sent you, or contact them.");
  const data = { status: attending === "yes" ? "CONFIRMED" : "DECLINED", confirmedSeats: seats, respondedAt: today() };
  await db.guest.create({ data: { ...data, weddingId: w.id, name, phone, side: str(fd, "side") === "GROOM" ? "GROOM" : "BRIDE", relation: "Via shared link", events: "WEDDING", invitedSeats: Math.max(1, seats), rsvpToken: token() } });
  await notifyMembers(w.id, "RSVP via shared link", `${name} ${attending === "yes" ? `confirmed ${seats}` : "declined"}. Review them in your guest list.`);
  return ok("Thank you! Your RSVP has been sent to the couple.");
}
