export const EVENT_TYPES = ["HOLUD", "MEHENDI", "WEDDING", "RECEPTION"] as const;

/** Event colour-coding is the app's signature: turmeric Holud, henna Mehendi, coral Wedding, plum Reception. */
export const EVENT_META: Record<string, { name: string; bn: string; color: string; soft: string }> = {
  HOLUD: { name: "Gaye Holud", bn: "গায়ে হলুদ", color: "#C98A12", soft: "#FBEFD2" },
  MEHENDI: { name: "Mehendi", bn: "মেহেদি", color: "#5F7F3A", soft: "#E7EEDC" },
  WEDDING: { name: "Wedding", bn: "বিয়ে", color: "#D97566", soft: "#FBE6E2" },
  RECEPTION: { name: "Reception", bn: "বৌভাত", color: "#7A5C8E", soft: "#ECE4F1" },
  OTHER: { name: "Other", bn: "অন্যান্য", color: "#6B6770", soft: "#EEEDEF" },
};
export const eventMeta = (t: string) => EVENT_META[t] ?? EVENT_META.OTHER;

export const TASK_CATEGORIES: Record<string, string> = {
  VENUE: "Venue", ATTIRE: "Attire", CATERING: "Catering", RITUALS: "Rituals", GUESTS: "Guests", VENDORS: "Vendors",
};

/** Default budget split. Assumption A4 in plan/05_raid.md, not market data. */
export const BUDGET_SPLIT: { key: string; name: string; pct: number; color: string }[] = [
  { key: "VENUE", name: "Venue", pct: 30, color: "#D97566" },
  { key: "CATERING", name: "Catering", pct: 25, color: "#C98A12" },
  { key: "DECOR", name: "Decor", pct: 10, color: "#5F7F3A" },
  { key: "PHOTO", name: "Photography & Video", pct: 10, color: "#7A5C8E" },
  { key: "ATTIRE", name: "Attire & Jewellery", pct: 10, color: "#B04A5A" },
  { key: "MAKEUP", name: "Makeup & Mehendi", pct: 4, color: "#E8A598" },
  { key: "INVITES", name: "Invitations & Gifts", pct: 3, color: "#3E7C8C" },
  { key: "MUSIC", name: "Music & Entertainment", pct: 3, color: "#8C6A3E" },
  { key: "TRANSPORT", name: "Transport", pct: 2, color: "#4A4E69" },
  { key: "MISC", name: "Miscellaneous", pct: 3, color: "#A9A3AD" },
];
export const categoryColor = (key: string) => BUDGET_SPLIT.find((b) => b.key === key)?.color ?? "#A9A3AD";

export const VENDOR_CATEGORIES: Record<string, { name: string; budgetKey: string }> = {
  PHOTOGRAPHY: { name: "Photography", budgetKey: "PHOTO" },
  CINEMATOGRAPHY: { name: "Cinematography", budgetKey: "PHOTO" },
  VENUE: { name: "Venue", budgetKey: "VENUE" },
  CATERING: { name: "Catering", budgetKey: "CATERING" },
  DECOR: { name: "Decor", budgetKey: "DECOR" },
  MAKEUP: { name: "Makeup", budgetKey: "MAKEUP" },
  MEHENDI: { name: "Mehendi artist", budgetKey: "MAKEUP" },
  MUSIC: { name: "DJ & Music", budgetKey: "MUSIC" },
  TRANSPORT: { name: "Wedding car", budgetKey: "TRANSPORT" },
};

export const PRICE_TIERS: Record<number, string> = { 1: "Standard", 2: "Premium", 3: "Luxury" };

export const CITIES = ["Dhaka", "Chattogram", "Sylhet", "Cox's Bazar", "Khulna", "Rajshahi"];

export const VENUE_SUGGESTIONS = [
  "Radisson Blu Water Garden, Dhaka",
  "International Convention City Bashundhara (ICCB), Dhaka",
  "InterContinental Dhaka",
  "Raowa Convention Hall, Dhaka",
  "Senakunja, Dhaka Cantonment",
  "Le Méridien Dhaka",
  "The Westin Dhaka",
  "Radisson Blu Chattogram Bay View",
  "Peninsula Chittagong",
  "Grand Sultan Tea Resort, Sreemangal",
  "Sayeman Beach Resort, Cox's Bazar",
];

export const DIET_TAGS: Record<string, string> = {
  HALAL: "Halal", VEG: "Vegetarian", VEGAN: "Vegan", NO_BEEF: "No beef", DIABETIC: "Diabetic-friendly",
  NUT_ALLERGY: "Nut allergy", SHELLFISH_ALLERGY: "Shellfish allergy", GLUTEN_FREE: "Gluten-free",
};

/** Assumption A3: 20% on booking (due in 7 days), 50% advance (60 days before), 30% final (7 days before). */
export const MILESTONES: { key: string; name: string; pct: number; daysBefore: number | null }[] = [
  { key: "BOOKING", name: "Booking", pct: 20, daysBefore: null },
  { key: "ADVANCE", name: "Advance", pct: 50, daysBefore: 60 },
  { key: "FINAL", name: "Final Settlement", pct: 30, daysBefore: 7 },
];
export const milestoneName = (k: string) => MILESTONES.find((m) => m.key === k)?.name ?? k;

/** Culturally relevant auto-generated checklist. daysBefore is relative to the wedding date. */
export const CHECKLIST_TEMPLATE: { title: string; category: string; daysBefore: number; event?: string }[] = [
  { title: "Agree the wedding budget with both families", category: "VENUE", daysBefore: 180 },
  { title: "Shortlist and visit 3 venues", category: "VENUE", daysBefore: 170 },
  { title: "Book the main wedding venue", category: "VENUE", daysBefore: 150, event: "WEDDING" },
  { title: "Book the reception (bou-bhat) venue", category: "VENUE", daysBefore: 145, event: "RECEPTION" },
  { title: "Book photographer and cinematographer", category: "VENDORS", daysBefore: 140 },
  { title: "Draft the guest list with both families", category: "GUESTS", daysBefore: 130 },
  { title: "Choose the caterer and taste the kacchi", category: "CATERING", daysBefore: 120 },
  { title: "Order the bridal Benarasi or lehenga", category: "ATTIRE", daysBefore: 110, event: "WEDDING" },
  { title: "Order the groom's sherwani", category: "ATTIRE", daysBefore: 105, event: "WEDDING" },
  { title: "Book the decorator for the Holud stage", category: "VENDORS", daysBefore: 100, event: "HOLUD" },
  { title: "Book the makeup artist (bridal and trial)", category: "VENDORS", daysBefore: 95 },
  { title: "Buy the yellow Jamdani for the Holud", category: "ATTIRE", daysBefore: 80, event: "HOLUD" },
  { title: "Book the mehendi artist", category: "VENDORS", daysBefore: 75, event: "MEHENDI" },
  { title: "Send digital invitations", category: "GUESTS", daysBefore: 60 },
  { title: "Finalise the Holud dala and tatta", category: "RITUALS", daysBefore: 45, event: "HOLUD" },
  { title: "Arrange the Kabin (Akd) with the Kazi", category: "RITUALS", daysBefore: 40, event: "WEDDING" },
  { title: "Finalise the menu: borhani, firni, rezala", category: "CATERING", daysBefore: 30 },
  { title: "Book wedding cars and plan the baraat route", category: "VENDORS", daysBefore: 30, event: "WEDDING" },
  { title: "Chase pending RSVPs", category: "GUESTS", daysBefore: 21 },
  { title: "Make the seating plan", category: "GUESTS", daysBefore: 14 },
  { title: "Bridal makeup trial", category: "ATTIRE", daysBefore: 14, event: "WEDDING" },
  { title: "Share the day timeline with vendors", category: "VENDORS", daysBefore: 7 },
  { title: "Prepare salami envelopes and the gift list", category: "RITUALS", daysBefore: 5 },
  { title: "Confirm the final guest count with the caterer", category: "CATERING", daysBefore: 4 },
];

/** Default day timeline per event type. Offsets are days relative to the wedding day. */
export const EVENT_DAY_OFFSET: Record<string, number> = { HOLUD: -3, MEHENDI: -2, WEDDING: 0, RECEPTION: 2 };

export const TIMELINE_TEMPLATE: Record<string, { time: string; title: string; location?: string }[]> = {
  HOLUD: [
    { time: "15:00", title: "Stage and marigold decor setup", location: "Stage" },
    { time: "17:30", title: "Bride's makeup", location: "Bridal suite" },
    { time: "19:00", title: "Guest arrival", location: "Main entrance" },
    { time: "19:45", title: "Holud ceremony with the families", location: "Stage" },
    { time: "21:00", title: "Dinner service", location: "Dining hall" },
  ],
  MEHENDI: [
    { time: "16:00", title: "Mehendi artists arrive", location: "Lawn" },
    { time: "16:30", title: "Bride's mehendi", location: "Lawn" },
    { time: "19:00", title: "Music and dance", location: "Lawn" },
  ],
  WEDDING: [
    { time: "14:00", title: "Bridal makeup", location: "Bridal suite" },
    { time: "18:00", title: "Baraat arrives", location: "Main gate" },
    { time: "18:30", title: "Gate dhora and welcome", location: "Main gate" },
    { time: "19:00", title: "Kabin (Akd)", location: "Stage" },
    { time: "20:15", title: "Dinner service", location: "Dining hall" },
    { time: "22:30", title: "Bidaai", location: "Main gate" },
  ],
  RECEPTION: [
    { time: "18:30", title: "Couple entry", location: "Main hall" },
    { time: "19:00", title: "Family photos", location: "Stage" },
    { time: "20:00", title: "Dinner service", location: "Dining hall" },
  ],
  OTHER: [],
};
