import "server-only";
import { db } from "./db";

export async function audit(opts: { weddingId?: string | null; userId?: string | null; action: string; entity: string; entityId?: string; detail?: string }) {
  await db.auditLog.create({ data: { ...opts, weddingId: opts.weddingId ?? null, userId: opts.userId ?? null } });
}

/** Messaging adapter. Dev mode: nothing leaves the machine; every message lands in the Notification outbox. */
export async function notify(opts: { weddingId?: string | null; userId?: string | null; channel?: "IN_APP" | "SMS" | "EMAIL" | "WHATSAPP"; to: string; title: string; body: string }) {
  await db.notification.create({
    data: { weddingId: opts.weddingId ?? null, userId: opts.userId ?? null, channel: opts.channel ?? "IN_APP", to: opts.to, title: opts.title, body: opts.body },
  });
}

/** Notify every member of a wedding in-app. */
export async function notifyMembers(weddingId: string, title: string, body: string, exceptUserId?: string) {
  const members = await db.weddingMember.findMany({ where: { weddingId }, include: { user: true } });
  for (const m of members) {
    if (m.userId === exceptUserId) continue;
    await notify({ weddingId, userId: m.userId, to: m.user.email, title, body });
  }
}
