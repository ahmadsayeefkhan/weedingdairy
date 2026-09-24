import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/lib/db";
import { eventMeta } from "@/lib/constants";
import { origin } from "@/lib/url";
import Slideshow from "./Slideshow";

export const metadata = { title: "Live slideshow" };

export default async function TvPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const ev = await db.event.findUnique({ where: { shareCode: code }, include: { wedding: true } });
  if (!ev || ev.wedding.visibility === "PRIVATE") notFound();
  const photos = await db.photo.findMany({ where: { weddingId: ev.weddingId, status: "APPROVED", OR: [{ eventId: ev.id }, { favorite: true }] }, orderBy: { takenAt: "desc" }, take: 60 });
  const qr = await QRCode.toDataURL(`${await origin()}/share/${code}`, { margin: 1, width: 260 });
  return (
    <Slideshow
      code={code}
      initial={photos.map((p) => ({ id: p.id, src: p.path, by: p.uploadedBy, caption: p.caption }))}
      title={`${ev.wedding.brideName} & ${ev.wedding.groomName}`}
      sub={`${ev.name} · #WeddingDiary`}
      qr={qr}
      color={eventMeta(ev.type).color}
    />
  );
}
