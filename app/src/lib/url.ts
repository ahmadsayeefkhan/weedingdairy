import "server-only";
import { headers } from "next/headers";

/** Absolute origin of the current request, for share links and QR codes. */
export async function origin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3210";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") || /^\d+\./.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
