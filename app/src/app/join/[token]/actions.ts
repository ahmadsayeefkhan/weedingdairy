"use server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { str } from "@/lib/result";
import { audit, notifyMembers } from "@/lib/log";

export async function acceptInvite(fd: FormData) {
  const user = await requireUser();
  const inv = await db.invite.findUnique({ where: { token: str(fd, "token") } });
  if (!inv || inv.acceptedAt || inv.email !== user.email || user.role !== "USER") redirect(`/join/${str(fd, "token")}`);
  if (await db.weddingMember.findFirst({ where: { userId: user.id } })) redirect(`/join/${inv.token}`);
  await db.weddingMember.create({ data: { weddingId: inv.weddingId, userId: user.id, role: inv.role } });
  await db.invite.update({ where: { id: inv.id }, data: { acceptedAt: new Date() } });
  await db.user.update({ where: { id: user.id }, data: { onboarded: true } });
  await audit({ weddingId: inv.weddingId, userId: user.id, action: "member.joined", entity: "WeddingMember", detail: `${user.name} as ${inv.role}` });
  await notifyMembers(inv.weddingId, "New team member", `${user.name} joined as ${inv.role.toLowerCase()}.`, user.id);
  redirect("/dashboard");
}
