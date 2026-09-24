import "server-only";
import { cookies } from "next/headers";

export type Locale = "en" | "bn";

const en = {
  dashboard: "Home", events: "Events", checklist: "Checklist", budget: "Budget", guests: "Guests", seating: "Seating",
  invitations: "Invitations", vendors: "Vendors", bookings: "Bookings", assistant: "Wedding AI", live: "Live Mode",
  vault: "Memory Vault", team: "Family & team", settings: "Settings", notifications: "Notifications", signOut: "Sign out",
  daysToGo: "days to go", planningProgress: "Planning progress", nextEvent: "Next event",
  spent: "spent", confirmed: "confirmed", completed: "completed", booked: "booked", more: "More",
  plan: "Plan", people: "People", memories: "Memories", language: "Language",
};
export type Dict = typeof en;

const bn: Dict = {
  dashboard: "হোম", events: "অনুষ্ঠান", checklist: "চেকলিস্ট", budget: "বাজেট", guests: "অতিথি", seating: "আসন বিন্যাস",
  invitations: "দাওয়াত", vendors: "ভেন্ডর", bookings: "বুকিং", assistant: "ওয়েডিং এআই", live: "লাইভ মোড",
  vault: "স্মৃতির ভান্ডার", team: "পরিবার ও টিম", settings: "সেটিংস", notifications: "নোটিফিকেশন", signOut: "সাইন আউট",
  daysToGo: "দিন বাকি", planningProgress: "পরিকল্পনার অগ্রগতি", nextEvent: "পরবর্তী অনুষ্ঠান",
  spent: "খরচ", confirmed: "নিশ্চিত", completed: "সম্পন্ন", booked: "বুকড", more: "আরও",
  plan: "পরিকল্পনা", people: "মানুষ", memories: "স্মৃতি", language: "ভাষা",
};

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get("wd_lang")?.value;
  return v === "bn" ? "bn" : "en";
}

export async function getDict(): Promise<{ t: Dict; locale: Locale }> {
  const locale = await getLocale();
  return { t: locale === "bn" ? bn : en, locale };
}
