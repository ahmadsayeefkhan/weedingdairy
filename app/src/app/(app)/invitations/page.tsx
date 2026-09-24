import Link from "next/link";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { requireWedding } from "@/lib/wedding";
import { PageHead } from "@/components/ui";
import { origin } from "@/lib/url";
import { Icon } from "@/components/icons";
import Designer from "./Designer";

export const metadata = { title: "Invitations" };

export default async function InvitationsPage() {
  const { wedding } = await requireWedding(["COUPLE", "PLANNER"]);
  const main = await db.event.findFirst({ where: { weddingId: wedding.id, type: wedding.inviteTemplate }, orderBy: { date: "asc" } });
  const url = `/i/${wedding.publicCode}`;
  const qr = await QRCode.toDataURL(`${await origin()}${url}`, { margin: 1, width: 240, color: { dark: "#2b2530", light: "#ffffff" } });
  const sent = await db.notification.count({ where: { weddingId: wedding.id, title: { startsWith: "Invitation" } } });

  return (
    <div className="stack-lg">
      <PageHead title="Digital invitation" sub="Elegant e-invites in Bangla, English or both" />
      <Designer
        template={wedding.inviteTemplate} lang={wedding.inviteLang} message={wedding.inviteMessage}
        bride={wedding.brideName} groom={wedding.groomName}
        date={(main?.date ?? wedding.date).toISOString()} venue={main?.venue ?? wedding.venueName}
      />
      <section className="card row wrap" style={{ gap: 20 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code for the invitation link" width={120} height={120} style={{ borderRadius: 10 }} />
        <div className="grow stack" style={{ minWidth: 220 }}>
          <h3 style={{ fontSize: 16 }}>Share your invitation</h3>
          <p className="small muted">Each guest gets a personal RSVP link when you send invitations from the guest list. This general link works for anyone you share it with, and new RSVPs join your guest list as pending review.</p>
          <div className="row wrap">
            <code className="small" style={{ background: "var(--blush)", padding: "6px 10px", borderRadius: 8 }}>{url}</code>
            <Link href={url} target="_blank" className="btn quiet sm"><Icon name="globe" />Open</Link>
            <Link href="/guests" className="btn ghost sm"><Icon name="send" />Send to guests</Link>
          </div>
          <p className="tiny faint">{sent} invitations sent so far (dev outbox)</p>
        </div>
      </section>
    </div>
  );
}
