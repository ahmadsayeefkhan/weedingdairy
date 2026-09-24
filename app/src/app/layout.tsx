import type { Metadata, Viewport } from "next";
import { Jost, Hind_Siliguri } from "next/font/google";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

// Jost stands in for the licensed ITC Avant Garde Gothic (see plan/05_raid.md R2); Hind Siliguri covers Bangla.
const jost = Jost({ subsets: ["latin"], variable: "--font-jost", display: "swap" });
const hind = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["300", "400", "500", "600"], variable: "--font-hind", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Wedding Diary Bangladesh", template: "%s · Wedding Diary" },
  description: "Plan your Holud, Mehendi, Wedding and Reception in one place. Powered by WeddingOS.ai.",
  applicationName: "Wedding Diary",
};

export const viewport: Viewport = { themeColor: "#D97566", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${jost.variable} ${hind.variable}`}>
      <body>{children}</body>
    </html>
  );
}
