import type { Metadata, Viewport } from "next";
import { Playfair_Display, Mulish, Hind_Siliguri, Tiro_Bangla } from "next/font/google";
import { getLocale } from "@/lib/i18n";
import "./globals.css";

// Brand type (Current Brand Guideline §5): Playfair Display headings + Mulish body/UI.
// Bangla companions the guideline recommends: Tiro Bangla for headings, Hind Siliguri for body.
const playfair = Playfair_Display({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-playfair", display: "swap" });
const mulish = Mulish({ subsets: ["latin"], variable: "--font-mulish", display: "swap" });
const hind = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["300", "400", "500", "600"], variable: "--font-hind", display: "swap" });
const tiro = Tiro_Bangla({ subsets: ["bengali"], weight: "400", variable: "--font-tiro", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Wedding Diary Bangladesh", template: "%s · Wedding Diary" },
  description: "Plan your Holud, Mehendi, Wedding and Reception in one place. Powered by WeddingOS.ai.",
  applicationName: "Wedding Diary",
};

export const viewport: Viewport = { themeColor: "#111111", width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${playfair.variable} ${mulish.variable} ${hind.variable} ${tiro.variable}`}>
      <body>{children}</body>
    </html>
  );
}
