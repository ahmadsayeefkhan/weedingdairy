import { db } from "@/lib/db";
import { fmtShort } from "@/lib/format";
import { Empty, PageHead } from "./ui";
import { Icon } from "./icons";

/** In-app notifications for one user; viewing marks them read. */
export async function NotificationsView({ userId }: { userId: string }) {
  const items = await db.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
  const unreadIds = items.filter((n) => !n.read).map((n) => n.id);
  if (unreadIds.length) await db.notification.updateMany({ where: { id: { in: unreadIds } }, data: { read: true } });
  return (
    <div className="stack-lg">
      <PageHead title="Notifications" sub="RSVPs, bookings, payments and team updates" />
      <section className="card">
        {items.length === 0 ? <Empty icon="bell" title="You're all caught up">New RSVPs, booking replies and payment reminders will appear here.</Empty> : (
          <div className="list">
            {items.map((n) => (
              <div key={n.id} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                <span className="icon-chip"><Icon name="bell" /></span>
                <div className="grow">
                  <div className="row" style={{ gap: 8 }}>{n.title}{unreadIds.includes(n.id) && <span className="badge accent">New</span>}</div>
                  <div className="small muted">{n.body}</div>
                </div>
                <span className="tiny faint">{fmtShort(n.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
