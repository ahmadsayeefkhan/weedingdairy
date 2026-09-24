import "server-only";
import { redirect } from "next/navigation";
import { db } from "./db";
import { requireUser, type SessionUser } from "./auth";

export type WeddingRole = "COUPLE" | "PLANNER" | "FAMILY";
export const EDITORS: WeddingRole[] = ["COUPLE", "PLANNER"];
export const ALL: WeddingRole[] = ["COUPLE", "PLANNER", "FAMILY"];

export class PermissionError extends Error {}

/** Loads the signed-in user's wedding and membership role; redirects when absent. */
export async function requireWedding(allowed: WeddingRole[] = ALL) {
  const user = await requireUser();
  if (user.role !== "USER") redirect(user.role === "ADMIN" ? "/admin" : "/vendor");
  const m = await db.weddingMember.findFirst({
    where: { userId: user.id },
    include: { wedding: true },
    orderBy: { createdAt: "asc" },
  });
  if (!m) redirect("/setup");
  const role = m.role as WeddingRole;
  if (!allowed.includes(role)) redirect("/dashboard?denied=1");
  return { user, wedding: m.wedding, role };
}

/** For server actions: throws instead of redirecting so the caller can return an error message. */
export async function authorizeWedding(allowed: WeddingRole[]): Promise<{ user: SessionUser; weddingId: string; role: WeddingRole }> {
  const user = await requireUser();
  const m = await db.weddingMember.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  if (!m) throw new PermissionError("You are not part of a wedding yet.");
  const role = m.role as WeddingRole;
  if (!allowed.includes(role)) throw new PermissionError("Your role doesn't allow this change. Ask the couple for access.");
  return { user, weddingId: m.weddingId, role };
}

export const can = {
  edit: (r: WeddingRole) => r === "COUPLE" || r === "PLANNER",
  money: (r: WeddingRole) => r === "COUPLE",
  manage: (r: WeddingRole) => r === "COUPLE",
};
