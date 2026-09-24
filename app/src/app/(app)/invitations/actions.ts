"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, EDITORS, PermissionError } from "@/lib/wedding";
import { fail, ok, str, type ActionResult } from "@/lib/result";
import { audit } from "@/lib/log";

export async function saveInvitation(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  let g;
  try { g = await authorizeWedding(EDITORS); } catch (e) { if (e instanceof PermissionError) return fail(e.message); throw e; }
  const template = str(fd, "template");
  const lang = str(fd, "lang");
  const message = str(fd, "message");
  if (!["HOLUD", "WEDDING", "RECEPTION"].includes(template)) return fail("Choose a template.");
  if (!["EN", "BN", "BOTH"].includes(lang)) return fail("Choose a language.");
  if (message.length > 160) return fail("Keep the message under 160 characters.");
  await db.wedding.update({ where: { id: g.weddingId }, data: { inviteTemplate: template, inviteLang: lang, inviteMessage: message || "Together with their families" } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "invitation.saved", entity: "Wedding", detail: `${template} · ${lang}` });
  revalidatePath("/invitations");
  return ok("Invitation saved. Guests will see this design on their RSVP link.");
}
