"use server";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { authorizeWedding, PermissionError } from "@/lib/wedding";
import { fail, ok, str, type ActionResult } from "@/lib/result";
import { token } from "@/lib/services";
import { audit, notify } from "@/lib/log";

async function couple() {
  try { return await authorizeWedding(["COUPLE"]); } catch (e) { if (e instanceof PermissionError) return e.message; throw e; }
}

export async function inviteMember(_: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const g = await couple(); if (typeof g === "string") return fail(g);
  const email = str(fd, "email").toLowerCase();
  const role = str(fd, "role");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.");
  if (!["PLANNER", "FAMILY", "COUPLE"].includes(role)) return fail("Choose a role.");
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser && (await db.weddingMember.findFirst({ where: { weddingId: g.weddingId, userId: existingUser.id } }))) return fail("This person is already on your team.");
  if (existingUser && existingUser.role !== "USER") return fail("That email belongs to a vendor or admin account. Use a personal email.");
  const w = await db.wedding.findUniqueOrThrow({ where: { id: g.weddingId } });
  const inv = await db.invite.create({ data: { weddingId: g.weddingId, email, role, token: token() } });
  await notify({ weddingId: g.weddingId, channel: "EMAIL", to: email, title: `Join ${w.brideName} & ${w.groomName}'s wedding on Wedding Diary`, body: `${g.user.name} invited you as ${role.toLowerCase()}. Accept: /join/${inv.token}` });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "member.invited", entity: "Invite", entityId: inv.id, detail: `${email} as ${role}` });
  revalidatePath("/team");
  return ok(`Invitation for ${email} is in the outbox. Share the link below with them.`);
}

export async function changeRole(fd: FormData) {
  const g = await couple(); if (typeof g === "string") return;
  const m = await db.weddingMember.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId }, include: { user: true } });
  const role = str(fd, "role");
  if (!m || m.userId === g.user.id || !["PLANNER", "FAMILY", "COUPLE"].includes(role)) return;
  await db.weddingMember.update({ where: { id: m.id }, data: { role } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "member.role", entity: "WeddingMember", entityId: m.id, detail: `${m.user.name}: ${m.role} → ${role}` });
  revalidatePath("/team");
}

export async function removeMember(fd: FormData) {
  const g = await couple(); if (typeof g === "string") return;
  const m = await db.weddingMember.findFirst({ where: { id: str(fd, "id"), weddingId: g.weddingId }, include: { user: true } });
  if (!m || m.userId === g.user.id) return;
  await db.weddingMember.delete({ where: { id: m.id } });
  await audit({ weddingId: g.weddingId, userId: g.user.id, action: "member.removed", entity: "WeddingMember", detail: m.user.name });
  revalidatePath("/team");
}

export async function revokeInvite(fd: FormData) {
  const g = await couple(); if (typeof g === "string") return;
  await db.invite.deleteMany({ where: { id: str(fd, "id"), weddingId: g.weddingId, acceptedAt: null } });
  revalidatePath("/team");
}
