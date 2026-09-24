/* Re-runnable demo seed: wipes the database and fills it with synthetic Bangladeshi data.
   Fixed "today" = APP_TODAY (2026-09-24). Run: npm run seed */
import { PrismaClient, type Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createWedding, schedulePayments, shortCode, token } from "../src/lib/services";
import { addDays, today } from "../src/lib/today";
import { EVENT_META, VENDOR_CATEGORIES } from "../src/lib/constants";

const db = new PrismaClient();
const PASSWORD = "Diary@2026";
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const d = (s: string) => new Date(`${s}T00:00:00Z`);

const MALE = ["Rahim", "Tanvir", "Sakib", "Arif", "Imran", "Fahim", "Nayeem", "Rakib", "Shafiq", "Habib", "Mahmud", "Zubair", "Ashraf", "Kamal", "Mizan", "Sohel", "Faisal", "Jamal", "Rafiq", "Towhid", "Anik", "Shuvo", "Riad", "Sabbir"];
const FEMALE = ["Sadia", "Nusrat", "Farzana", "Tasnim", "Rumana", "Sharmin", "Nabila", "Lamia", "Mithila", "Tahmina", "Afsana", "Shirin", "Rupa", "Jannat", "Maliha", "Sumaiya", "Priya", "Anika", "Fariha", "Tania", "Moushumi", "Ishrat"];
const LAST = ["Ahmed", "Rahman", "Hossain", "Islam", "Chowdhury", "Khan", "Uddin", "Karim", "Haque", "Sarkar", "Talukder", "Bhuiyan", "Mollah", "Siddiqui", "Akter", "Das", "Saha", "Majumder", "Kabir", "Alam"];
const RELATIONS = ["Uncle", "Aunt", "Cousin", "Family friend", "Colleague", "Friend", "Neighbour", "Grandparent", "Business partner", "Teacher"];
const DIETS = ["HALAL", "HALAL", "HALAL", "", "", "VEG", "DIABETIC", "NUT_ALLERGY", "NO_BEEF", "SHELLFISH_ALLERGY"];

function person() {
  const female = rnd() < 0.5;
  const first = pick(female ? FEMALE : MALE);
  return { first, name: `${first} ${pick(LAST)}`, female };
}
function phone() {
  return `+8801${pick(["3", "5", "6", "7", "8", "9"])}${String(Math.floor(rnd() * 1e8)).padStart(8, "0")}`;
}

async function wipe() {
  const models = ["aiLog", "auditLog", "notification", "liveAlert", "photo", "shortlist", "review", "expense", "payment", "booking", "blockedDate", "vendorPackage", "vendor", "guest", "seatTable", "task", "timelineItem", "event", "budgetCategory", "invite", "weddingMember", "wedding", "session", "user"] as const;
  for (const m of models) await (db[m] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();
}

async function user(email: string, name: string, role = "USER", onboarded = true) {
  return db.user.create({ data: { email, name, role, onboarded, passwordHash: await bcrypt.hash(PASSWORD, 10), phone: phone() } });
}

type V = { name: string; cat: string; city: string; area: string; tier: number; price: number; about: string; tags: string; capacity?: number; pk: [string, number, string][]; status?: string; featured?: boolean };
const VENDORS: V[] = [
  { name: "Wedding Diary", cat: "PHOTOGRAPHY", city: "Dhaka", area: "Banani", tier: 3, price: 38000, featured: true, tags: "Cinematic,Photobook,Drone", about: "Bangladesh's pioneering wedding photography team. We tell your story through the small moments: the bride's farewell tears, a father's proud smile, a groom's nervous laughter.", pk: [["Hindu Combo One", 38000, "1 photographer, 1 event, 300 edited photos"], ["Signature Combo", 120000, "2 photographers + cinematographer, 2 events, photobook"], ["Sajib Paul Signature", 225000, "Chief photographer Sajib Paul, 3 events, cinematic film, 2 photobooks"]] },
  { name: "Dream Lens Studio", cat: "PHOTOGRAPHY", city: "Dhaka", area: "Banani", tier: 3, price: 45000, tags: "Cinematic,Candid", about: "Candid-first wedding photography with a cinematic colour grade. 180+ weddings across Dhaka and Chattogram.", pk: [["Holud Story", 45000, "1 photographer, Holud only, 250 photos"], ["Full Wedding", 95000, "2 photographers, wedding + reception"], ["Grand Collection", 160000, "3 events, drone, same-day teaser"]] },
  { name: "Click Arts Bangladesh", cat: "PHOTOGRAPHY", city: "Chattogram", area: "GEC", tier: 2, price: 30000, tags: "Traditional,Family", about: "Warm, traditional coverage focused on families and rituals.", pk: [["Essential", 30000, "1 photographer, 1 event"], ["Complete", 70000, "2 events, album"]] },
  { name: "Frame by Farhan", cat: "PHOTOGRAPHY", city: "Sylhet", area: "Zindabazar", tier: 1, price: 18000, tags: "Candid,Budget", about: "Honest candid photography for intimate weddings.", pk: [["Intimate", 18000, "1 photographer, 4 hours"], ["Day", 32000, "Full day, 400 photos"]] },
  { name: "Cinematic Echo Films", cat: "CINEMATOGRAPHY", city: "Dhaka", area: "Gulshan", tier: 3, price: 60000, tags: "4K,Drone,Same Day Edit", about: "Movie-like wedding films with drone and same-day edits played at your reception.", pk: [["Highlight Reel", 60000, "3–5 minute 4K teaser, colour graded"], ["Full Documentation", 110000, "Multi-camera ceremony coverage + highlight"], ["Same Day Edit", 150000, "Edited film played at the reception"]] },
  { name: "Arif Rahman Films", cat: "CINEMATOGRAPHY", city: "Dhaka", area: "Dhanmondi", tier: 2, price: 40000, tags: "Documentary,Storytelling", about: "Documentary storytelling that captures raw emotion and natural flow.", pk: [["Story", 40000, "Documentary film, 20 minutes"], ["Story + Drone", 65000, "Adds aerial entry shots"]] },
  { name: "Radisson Blu Water Garden", cat: "VENUE", city: "Dhaka", area: "Dhaka Cantonment", tier: 3, price: 500000, capacity: 800, tags: "Ballroom,Lakeside,Parking 300", about: "Grand ballroom and lakeside lawns for 500–800 guests.", pk: [["Grand Ballroom (evening)", 500000, "Hall, stage, basic lighting, 6 hours"], ["Lawn + Ballroom", 750000, "Outdoor Holud lawn and ballroom"]] },
  { name: "International Convention City Bashundhara", cat: "VENUE", city: "Dhaka", area: "Bashundhara", tier: 3, price: 450000, capacity: 1200, tags: "Convention,Parking 200", about: "ICCB halls for 800–1,200 guests with generous parking.", pk: [["Hall (evening)", 450000, "Hall and stage, 6 hours"]] },
  { name: "Raowa Convention Hall", cat: "VENUE", city: "Dhaka", area: "Mohakhali DOHS", tier: 2, price: 250000, capacity: 600, tags: "Hall,Central", about: "Well-loved central Dhaka hall for 400–600 guests.", pk: [["Main hall", 250000, "Hall, stage, 5 hours"]] },
  { name: "Senakunja", cat: "VENUE", city: "Dhaka", area: "Dhaka Cantonment", tier: 2, price: 280000, capacity: 1000, tags: "Hall,Large", about: "Large hall popular for receptions.", pk: [["Hall (evening)", 280000, "Hall and stage"]] },
  { name: "Peninsula Chittagong", cat: "VENUE", city: "Chattogram", area: "Bulbul Center", tier: 3, price: 350000, capacity: 500, tags: "Hotel,Ballroom", about: "Five-star ballroom in Chattogram.", pk: [["Ballroom", 350000, "Ballroom, 6 hours"]] },
  { name: "Sultan's Dine Catering", cat: "CATERING", city: "Dhaka", area: "Dhanmondi", tier: 3, price: 850, tags: "Kacchi,Borhani,Halal", about: "Signature kacchi biryani and borhani for weddings of 100–1,500. Price is per plate.", pk: [["Classic Kacchi menu", 850, "Kacchi, chicken roast, borhani, firni (per plate)"], ["Royal menu", 1250, "Kacchi, rezala, fish, jali kabab, doi, firni (per plate)"]] },
  { name: "Royal Feast", cat: "CATERING", city: "Dhaka", area: "Uttara", tier: 2, price: 650, tags: "Kacchi,Live grill", about: "Kacchi and live grill stations. Price is per plate.", pk: [["Standard", 650, "Kacchi, roast, borhani (per plate)"], ["Deluxe", 950, "Adds live grill and chaat counter"]] },
  { name: "Spice Catering Chattogram", cat: "CATERING", city: "Chattogram", area: "Agrabad", tier: 2, price: 600, tags: "Mezban,Kacchi", about: "Chattogram mezban and kacchi specialists. Price is per plate.", pk: [["Mezban", 600, "Mezbani beef, dal, rice (per plate)"]] },
  { name: "Dhaka Deco", cat: "DECOR", city: "Dhaka", area: "Mirpur", tier: 2, price: 80000, tags: "Holud stage,Marigold,Tent", about: "Marigold Holud stages, tents and backup rain cover.", pk: [["Holud stage", 80000, "Marigold stage, seating, lights"], ["Full wedding decor", 250000, "Stage, entrance, tables"]] },
  { name: "Royal Rajbari Decor", cat: "DECOR", city: "Dhaka", area: "Gulshan", tier: 3, price: 150000, tags: "Traditional,Red & Gold", about: "Traditional red and gold themes inspired by old rajbari palaces.", pk: [["Royal stage", 150000, "Stage and entrance"], ["Palace theme", 500000, "Full venue transformation"]] },
  { name: "Floral Fantasy", cat: "DECOR", city: "Dhaka", area: "Banani", tier: 2, price: 60000, tags: "Pastel,Fresh flowers", about: "Pastel palettes and fresh flowers.", pk: [["Pastel stage", 60000, "Stage and photo corner"]] },
  { name: "Bridal Glow by Sarah Khan", cat: "MAKEUP", city: "Dhaka", area: "Dhanmondi", tier: 2, price: 15000, tags: "Bridal,HD,Airbrush", about: "Bridal, Holud and party looks. Airbrush and HD makeup.", pk: [["Holud look", 15000, "Makeup and hair"], ["Bridal look", 35000, "HD bridal makeup, hair, draping"], ["3-event bundle", 60000, "Holud, wedding, reception"]] },
  { name: "Glam Studio by Maliha", cat: "MAKEUP", city: "Chattogram", area: "Khulshi", tier: 1, price: 9000, tags: "Traditional,Minimal", about: "Traditional and minimal looks.", pk: [["Party look", 9000, "Makeup and hair"], ["Bridal look", 22000, "Bridal makeup and draping"]] },
  { name: "Nusrat's Henna Art", cat: "MEHENDI", city: "Dhaka", area: "Mohammadpur", tier: 2, price: 8000, tags: "Bridal,Arabic", about: "Intricate bridal mehendi; 120+ weddings.", pk: [["Bridal hands", 8000, "Both hands to elbow"], ["Bridal full", 15000, "Hands and feet, full coverage"]] },
  { name: "Ayesha's Artistry", cat: "MEHENDI", city: "Dhaka", area: "Uttara", tier: 1, price: 5000, tags: "Minimal,Arabic", about: "Minimal and Arabic designs.", pk: [["Arabic", 5000, "Both hands"]] },
  { name: "DJ Rahat", cat: "MUSIC", city: "Dhaka", area: "Gulshan", tier: 2, price: 35000, tags: "Live mixing,LED wall,Cold fire", about: "Live mixing with JBL sound, laser lights, smoke and cold fire.", pk: [["Holud night", 35000, "4 hours, sound and lights"], ["Premium", 65000, "Adds LED wall and cold fire"]] },
  { name: "Sur Sangeet Band", cat: "MUSIC", city: "Dhaka", area: "Dhanmondi", tier: 2, price: 50000, tags: "Live band,Rabindra sangeet", about: "Live band for gaye holud and receptions.", pk: [["2-hour set", 50000, "5-piece band"]] },
  { name: "Heritage Wedding Cars", cat: "TRANSPORT", city: "Dhaka", area: "Tejgaon", tier: 3, price: 15000, tags: "Vintage,Chauffeur", about: "Vintage and luxury cars with floral decoration and chauffeur.", pk: [["Vintage car", 15000, "Per day, chauffeur included"], ["Car + decor", 18500, "Adds a floral theme"]] },
  { name: "Kolpona Event Decor", cat: "DECOR", city: "Khulna", area: "Sonadanga", tier: 1, price: 40000, tags: "Budget,Stage", status: "PENDING", about: "New decorator awaiting approval.", pk: [["Basic stage", 40000, "Stage and chairs"]] },
];

const coverFor = (cat: string, i: number) => `/seed/cover-${cat.toLowerCase()}-${(i % 3) + 1}.jpg`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const REVIEW_TEXT = [
  "Thank you for making our day memorable. Your hard work and dedication show in the quality.",
  "Extremely cordial, supportive and reliable. Special thanks to the team for being so kind and reachable.",
  "They arrived on time and handled both families beautifully. Would book again.",
  "Our parents still talk about it. Worth every taka.",
  "Great quality, a little late on the delivery but they kept us informed.",
  "Calm under pressure when it rained during the Holud. Lifesavers.",
];

async function main() {
  const t0 = today();
  console.log("Seeding with today =", t0.toISOString().slice(0, 10));
  await wipe();

  // ---------- Users ----------
  const admin = await user("admin@weddingdiary.test", "Platform Admin", "ADMIN");
  const vendorUser = await user("vendor@weddingdiary.test", "Farhan Kabir (Dream Lens)", "VENDOR");
  const studioUser = await user("studio@weddingdiary.test", "Sajib Paul", "VENDOR");
  const pendingVendorUser = await user("decor@weddingdiary.test", "Kolpona Das", "VENDOR");
  const ayesha = await user("couple@weddingdiary.test", "Ayesha Rahman");
  const rahul = await user("rahul@weddingdiary.test", "Rahul Chowdhury");
  const planner = await user("planner@weddingdiary.test", "Tania Chowdhury");
  const family = await user("family@weddingdiary.test", "Habibur Rahman");
  const nusrat = await user("live@weddingdiary.test", "Nusrat Jahan");
  const newUser = await user("new@weddingdiary.test", "Mithila Akter", "USER", false);
  void admin; void newUser;

  // ---------- Vendors ----------
  const vendors: Record<string, Prisma.VendorGetPayload<{ include: { packages: true } }>> = {};
  for (const [i, v] of VENDORS.entries()) {
    const owner = v.name === "Dream Lens Studio" ? vendorUser.id : v.name === "Wedding Diary" ? studioUser.id : v.status === "PENDING" ? pendingVendorUser.id : null;
    vendors[v.name] = await db.vendor.create({
      data: {
        name: v.name, slug: slug(v.name), category: v.cat, city: v.city, area: v.area, priceTier: v.tier, startingPrice: v.price,
        about: v.about, tags: v.tags, cover: coverFor(v.cat, i), phone: phone(), capacity: v.capacity ?? null,
        status: v.status ?? "APPROVED", featured: v.featured ?? false, ownerId: owner,
        packages: { create: v.pk.map(([name, price, description]) => ({ name, price, description })) },
      },
      include: { packages: true },
    });
  }
  // Blocked dates (vendors unavailable on the demo wedding day -> backup-vendor demo)
  await db.blockedDate.create({ data: { vendorId: vendors["Cinematic Echo Films"].id, date: d("2026-12-15") } });
  await db.blockedDate.create({ data: { vendorId: vendors["Dream Lens Studio"].id, date: d("2026-11-20") } });
  await db.blockedDate.create({ data: { vendorId: vendors["Dream Lens Studio"].id, date: d("2026-11-21") } });

  // ---------- Past weddings (for verified reviews) ----------
  for (let k = 0; k < 6; k++) {
    const b = person(), g = person();
    const pu = await user(`past${k + 1}@weddingdiary.test`, `${FEMALE[k]} ${pick(LAST)}`);
    const past = await db.wedding.create({
      data: { brideName: FEMALE[k + 5], groomName: MALE[k + 3], date: addDays(t0, -60 - k * 40), totalBudget: 1500000, publicCode: shortCode(), members: { create: { userId: pu.id, role: "COUPLE" } } },
    });
    void b; void g;
    const reviewed = Object.values(vendors).filter((v) => v.status === "APPROVED").filter((_, i) => (i + k) % 3 === 0);
    for (const v of reviewed) {
      const bk = await db.booking.create({ data: { weddingId: past.id, vendorId: v.id, eventType: "WEDDING", eventDate: past.date, amount: v.startingPrice, status: "COMPLETED" } });
      const s = () => (rnd() < 0.75 ? 5 : 4);
      const r = { punctuality: s(), behavior: s(), quality: s(), value: rnd() < 0.8 ? s() : 3 };
      await db.review.create({ data: { bookingId: bk.id, vendorId: v.id, authorId: pu.id, ...r, overall: (r.punctuality + r.behavior + r.quality + r.value) / 4, text: pick(REVIEW_TEXT) } });
    }
  }
  // one review to demonstrate moderation
  const spamWedding = await db.wedding.findFirstOrThrow({ where: { members: { some: { user: { email: "past1@weddingdiary.test" } } } } });
  const spamBk = await db.booking.create({ data: { weddingId: spamWedding.id, vendorId: vendors["Royal Feast"].id, eventType: "RECEPTION", eventDate: spamWedding.date, amount: 650, status: "COMPLETED" } });
  const past1 = await db.user.findUniqueOrThrow({ where: { email: "past1@weddingdiary.test" } });
  await db.review.create({ data: { bookingId: spamBk.id, vendorId: vendors["Royal Feast"].id, authorId: past1.id, punctuality: 1, behavior: 1, quality: 2, value: 1, overall: 1.25, text: "WORST!!! call 01700000000 for cheaper catering!!!" } });

  // ---------- Wedding 1: Ayesha & Rahul (planning, 15 Dec 2026) ----------
  const w1 = await createWedding(db, {
    userId: ayesha.id, brideName: "Ayesha", groomName: "Rahul", date: d("2026-12-15"), city: "Dhaka",
    venueName: "Radisson Blu Water Garden, Dhaka", totalBudget: 2500000, events: ["HOLUD", "MEHENDI", "WEDDING", "RECEPTION"],
  });
  await db.wedding.update({ where: { id: w1.id }, data: { inviteMessage: "Together with their families, Ayesha and Rahul request the pleasure of your company", photoAutoApprove: false } });
  await db.weddingMember.createMany({ data: [
    { weddingId: w1.id, userId: rahul.id, role: "COUPLE" },
    { weddingId: w1.id, userId: planner.id, role: "PLANNER" },
    { weddingId: w1.id, userId: family.id, role: "FAMILY" },
  ] });
  await db.invite.create({ data: { weddingId: w1.id, email: "khala@weddingdiary.test", role: "FAMILY", token: token() } });

  const w1events = await db.event.findMany({ where: { weddingId: w1.id } });
  const ev = (t: string) => w1events.find((e) => e.type === t)!;
  await db.event.update({ where: { id: ev("HOLUD").id }, data: { venue: "Rahman residence rooftop, Gulshan 2" } });
  await db.event.update({ where: { id: ev("MEHENDI").id }, data: { venue: "Rahman residence, Gulshan 2" } });
  await db.event.update({ where: { id: ev("RECEPTION").id }, data: { venue: "Senakunja, Dhaka Cantonment" } });

  // Tasks: complete the ones due before today plus a few more
  const tasks = await db.task.findMany({ where: { weddingId: w1.id }, orderBy: { order: "asc" } });
  for (const [i, t] of tasks.entries()) if (i < 9 || i === 11) await db.task.update({ where: { id: t.id }, data: { done: true, doneAt: addDays(t0, -30 + i) } });

  // Bookings
  async function book(weddingId: string, vendorName: string, pkgIdx: number, eventType: string, eventDate: Date, status: string, multiplier = 1, note?: string) {
    const v = vendors[vendorName];
    const p = v.packages[pkgIdx];
    const b = await db.booking.create({
      data: { weddingId, vendorId: v.id, packageId: p.id, eventType, eventDate, amount: p.price * multiplier, status, note, createdAt: addDays(t0, -20), respondedAt: status === "ACCEPTED" ? addDays(t0, -18) : null },
    });
    if (status === "ACCEPTED") await schedulePayments(db, b.id);
    return b;
  }
  const bVenue = await book(w1.id, "Radisson Blu Water Garden", 0, "WEDDING", ev("WEDDING").date, "ACCEPTED");
  const bCater = await book(w1.id, "Sultan's Dine Catering", 0, "WEDDING", ev("WEDDING").date, "ACCEPTED", 250);
  const bMakeup = await book(w1.id, "Bridal Glow by Sarah Khan", 2, "WEDDING", ev("WEDDING").date, "ACCEPTED");
  const bDecor = await book(w1.id, "Dhaka Deco", 0, "HOLUD", ev("HOLUD").date, "ACCEPTED");
  await book(w1.id, "Dream Lens Studio", 2, "WEDDING", ev("WEDDING").date, "REQUESTED", 1, "We'd love drone shots for the baraat entry. Can you cover the Holud too?");
  await book(w1.id, "DJ Rahat", 1, "HOLUD", ev("HOLUD").date, "REQUESTED", 1, "Holud night, rooftop, about 150 guests.");

  // Payment states to match the App UI deck: venue booking paid, venue advance due in 2 days, etc.
  const payFor = async (bookingId: string) => db.payment.findMany({ where: { bookingId }, orderBy: { dueDate: "asc" } });
  const catKey = async (key: string) => db.budgetCategory.findFirstOrThrow({ where: { weddingId: w1.id, key } });
  async function markPaid(p: { id: string; amount: number; milestone: string }, title: string, key: string, vendorId: string, when: Date) {
    await db.payment.update({ where: { id: p.id }, data: { paidAt: when, method: "bKash (simulated)" } });
    await db.expense.create({ data: { weddingId: w1.id, categoryId: (await catKey(key)).id, vendorId, paymentId: p.id, title, amount: p.amount, status: "PAID", date: when } });
  }
  const pv = await payFor(bVenue.id);
  await markPaid(pv.find((p) => p.milestone === "BOOKING")!, "Venue booking: Radisson Blu Water Garden", "VENUE", bVenue.vendorId, addDays(t0, -18));
  await db.payment.update({ where: { id: pv.find((p) => p.milestone === "ADVANCE")!.id }, data: { dueDate: addDays(t0, 2) } });
  const pc = await payFor(bCater.id);
  await markPaid(pc.find((p) => p.milestone === "BOOKING")!, "Catering booking: Sultan's Dine", "CATERING", bCater.vendorId, addDays(t0, -15));
  const pm = await payFor(bMakeup.id);
  await markPaid(pm.find((p) => p.milestone === "BOOKING")!, "Makeup booking: Bridal Glow", "MAKEUP", bMakeup.vendorId, addDays(t0, -12));
  await markPaid(pm.find((p) => p.milestone === "ADVANCE")!, "Makeup advance: Bridal Glow", "MAKEUP", bMakeup.vendorId, addDays(t0, -5));
  const pd = await payFor(bDecor.id);
  await markPaid(pd.find((p) => p.milestone === "BOOKING")!, "Holud decor booking: Dhaka Deco", "DECOR", bDecor.vendorId, addDays(t0, -10));
  await db.payment.update({ where: { id: pd.find((p) => p.milestone === "ADVANCE")!.id }, data: { dueDate: addDays(t0, -1) } }); // overdue

  // Manual expenses
  const exp = async (title: string, key: string, amount: number, status: string, daysAgo: number) =>
    db.expense.create({ data: { weddingId: w1.id, categoryId: (await catKey(key)).id, title, amount, status, date: addDays(t0, -daysAgo) } });
  await exp("Bridal Benarasi from Mirpur Benarasi Palli", "ATTIRE", 185000, "PAID", 25);
  await exp("Groom's sherwani (tailoring)", "ATTIRE", 65000, "PENDING", 8);
  await exp("Gold set from Amin Jewellers", "ATTIRE", 240000, "PAID", 40);
  await exp("Printed cards for elders (200)", "INVITES", 18000, "PAID", 14);
  await exp("Holud dala and tatta", "DECOR", 32000, "PAID", 6);
  await exp("Kazi fee and Kabin papers", "MISC", 15000, "PENDING", 2);

  // Guests
  const eventSets = ["HOLUD,MEHENDI,WEDDING,RECEPTION", "WEDDING,RECEPTION", "WEDDING", "RECEPTION", "HOLUD,WEDDING", "WEDDING,RECEPTION"];
  const named: [string, string, string, number, string, string][] = [
    ["Mr. & Mrs. Rahman", "BRIDE", "Family friend", 4, "CONFIRMED", "HALAL"],
    ["Ahmed Family", "GROOM", "Cousins", 3, "PENDING", ""],
    ["Sarah Khan", "BRIDE", "Colleague", 1, "CONFIRMED", "VEG"],
    ["Chowdhury Group", "GROOM", "Business partners", 4, "DECLINED", ""],
    ["Rafiq Islam", "BRIDE", "Uncle", 5, "CONFIRMED", "DIABETIC"],
    ["Nadia Hossain", "BRIDE", "Friend", 2, "PENDING", "NUT_ALLERGY"],
  ];
  const guestRows: { name: string; side: string; relation: string; seats: number; status: string; diet: string }[] = named.map(([name, side, relation, seats, status, diet]) => ({ name, side, relation, seats, status, diet }));
  for (let i = 0; i < 74; i++) {
    const p = person();
    const r = rnd();
    const family = rnd() < 0.35;
    guestRows.push({
      name: family ? `${p.name.split(" ")[1]} family` : p.name,
      side: rnd() < 0.52 ? "BRIDE" : "GROOM",
      relation: pick(RELATIONS),
      seats: family ? 3 + Math.floor(rnd() * 3) : rnd() < 0.5 ? 1 : 2,
      status: r < 0.66 ? "CONFIRMED" : r < 0.9 ? "PENDING" : "DECLINED",
      diet: pick(DIETS),
    });
  }
  const tables = [];
  const tableDefs: [string, string, number][] = [["Table 1", "Bride's family", 10], ["Table 2", "Groom's family", 10], ["Table 3", "Elders", 8], ["Table 4", "Bride's friends", 10], ["Table 5", "Groom's friends", 10], ["Table 6", "Colleagues", 8], ["Table 7", "Neighbours", 8], ["Table 8", "Cousins", 12]];
  for (const [name, label, capacity] of tableDefs) tables.push(await db.seatTable.create({ data: { weddingId: w1.id, name, label, capacity } }));
  const fill: Record<string, number> = {};
  for (const [i, g] of guestRows.entries()) {
    const confirmed = g.status === "CONFIRMED" ? g.seats : 0;
    let tableId: string | null = null;
    if (g.status === "CONFIRMED" && i < 40) {
      const pref = g.side === "BRIDE" ? [0, 3, 2, 6] : [1, 4, 5, 7];
      for (const ti of pref) {
        const t = tables[ti];
        if ((fill[t.id] ?? 0) + confirmed <= t.capacity) { tableId = t.id; fill[t.id] = (fill[t.id] ?? 0) + confirmed; break; }
      }
    }
    await db.guest.create({
      data: {
        weddingId: w1.id, name: g.name, phone: rnd() < 0.85 ? phone() : null, side: g.side, relation: g.relation,
        events: g.name === "Ahmed Family" ? "HOLUD" : pick(eventSets), invitedSeats: g.seats, confirmedSeats: confirmed, status: g.status,
        diet: g.status === "CONFIRMED" ? g.diet || null : null, rsvpToken: token(), tableId,
        respondedAt: g.status === "PENDING" ? null : addDays(t0, -Math.floor(rnd() * 20)),
      },
    });
  }
  // Fixed RSVP token for the e2e test
  await db.guest.update({ where: { rsvpToken: (await db.guest.findFirstOrThrow({ where: { weddingId: w1.id, name: "Nadia Hossain" } })).rsvpToken }, data: { rsvpToken: "demo-rsvp-nadia" } });

  await db.shortlist.createMany({ data: [
    { weddingId: w1.id, vendorId: vendors["Cinematic Echo Films"].id },
    { weddingId: w1.id, vendorId: vendors["Royal Rajbari Decor"].id },
    { weddingId: w1.id, vendorId: vendors["Heritage Wedding Cars"].id },
  ] });

  // Couple photos in the vault (engagement / pre-wedding)
  for (let i = 1; i <= 3; i++) await db.photo.create({ data: { weddingId: w1.id, path: `/seed/wedding-${i + 3}.jpg`, caption: ["Engagement at Gulshan", "Pre-wedding shoot, Hatirjheel", "Ring ceremony"][i - 1], uploadedBy: "Ayesha", source: "COUPLE", status: "APPROVED", favorite: i === 1, takenAt: addDays(t0, -90 + i * 10) } });

  // Notifications and activity
  const n = async (userId: string, title: string, body: string, days: number, channel = "IN_APP") =>
    db.notification.create({ data: { weddingId: w1.id, userId, channel, to: "couple@weddingdiary.test", title, body, createdAt: addDays(t0, -days) } });
  await n(ayesha.id, "Venue Advance due in 2 days", "৳2,50,000 to Radisson Blu Water Garden is due soon.", 0);
  await n(ayesha.id, "New RSVP", "Rafiq Islam confirmed 5 seats for all events.", 1);
  await n(ayesha.id, "Booking accepted", "Bridal Glow by Sarah Khan accepted your 3-event bundle.", 12);
  await db.notification.create({ data: { weddingId: w1.id, channel: "WHATSAPP", to: "+8801711000001", title: "Invitation", body: "Ayesha & Rahul invite you to their wedding on 15 December 2026. RSVP: /rsvp/…", createdAt: addDays(t0, -3) } });
  await db.notification.create({ data: { weddingId: w1.id, channel: "SMS", to: "+8801911000002", title: "Payment reminder", body: "Venue Advance ৳2,50,000 due in 2 days.", createdAt: addDays(t0, 0) } });
  await db.auditLog.createMany({ data: [
    { weddingId: w1.id, userId: ayesha.id, action: "booking.requested", entity: "Booking", detail: "Dream Lens Studio · Grand Collection", createdAt: addDays(t0, -2) },
    { weddingId: w1.id, userId: planner.id, action: "timeline.updated", entity: "Event", detail: "Wedding: Baraat arrives moved to 18:00", createdAt: addDays(t0, -1) },
    { weddingId: w1.id, userId: ayesha.id, action: "payment.paid", entity: "Payment", detail: "Makeup advance ৳30,000", createdAt: addDays(t0, -5) },
  ] });
  await db.aiLog.create({ data: { userId: ayesha.id, weddingId: w1.id, question: "How much budget is left?", answer: "You have ৳17,64,500 left of ৳25,00,000.", mode: "scripted", tools: "budget_summary", createdAt: addDays(t0, -1) } });

  // ---------- Wedding 2: Nusrat & Rafiq (Reception is TODAY -> Live Mode + Memory Vault) ----------
  const w2 = await createWedding(db, {
    userId: nusrat.id, brideName: "Nusrat", groomName: "Rafiq", date: addDays(t0, -2), city: "Dhaka",
    venueName: "Raowa Convention Hall, Dhaka", totalBudget: 1800000, events: ["HOLUD", "WEDDING", "RECEPTION"],
  });
  await db.wedding.update({ where: { id: w2.id }, data: { photoAutoApprove: false } });
  const w2events = await db.event.findMany({ where: { weddingId: w2.id }, include: { items: true } });
  const rec = w2events.find((e) => e.type === "RECEPTION")!;
  await db.event.update({ where: { id: rec.id }, data: { date: t0, venue: "Senakunja, Dhaka Cantonment", liveStartedAt: t0, shareCode: "live-demo" } });
  await db.timelineItem.deleteMany({ where: { eventId: rec.id } });
  const recItems: [string, string, string, string][] = [
    ["10:00", "Event setup completed", "Main hall", "DONE"], ["11:30", "Guest arrival started", "Main entrance", "DONE"],
    ["13:00", "Bride & groom entry", "Main gate", "NOW"], ["14:00", "Lunch service", "Dining hall", "PLANNED"],
    ["15:30", "Family photos", "Stage", "PLANNED"], ["17:00", "Farewell", "Main gate", "PLANNED"],
  ];
  for (const [time, title, location, status] of recItems) await db.timelineItem.create({ data: { eventId: rec.id, time, title, location, status, note: title === "Bride & groom entry" ? "Procession approaching main gate. Music cue ready." : null } });
  for (const e of w2events.filter((e) => e.type !== "RECEPTION")) await db.timelineItem.updateMany({ where: { eventId: e.id }, data: { status: "DONE" } });
  await db.task.updateMany({ where: { weddingId: w2.id }, data: { done: true, doneAt: addDays(t0, -3) } });
  const w2book = async (name: string, pk: number, et: string, readiness: string, mult = 1) => {
    const b = await book(w2.id, name, pk, et, t0, "ACCEPTED", mult);
    await db.booking.update({ where: { id: b.id }, data: { readiness } });
  };
  await w2book("Wedding Diary", 1, "RECEPTION", "ACTIVE");
  await w2book("Royal Feast", 1, "RECEPTION", "READY", 400);
  await w2book("DJ Rahat", 0, "RECEPTION", "SETUP");
  await w2book("Heritage Wedding Cars", 1, "RECEPTION", "STANDBY");
  // guests with check-ins
  for (let i = 0; i < 70; i++) {
    const p = person();
    const seats = rnd() < 0.3 ? 4 : rnd() < 0.5 ? 2 : 1;
    const status = rnd() < 0.85 ? "CONFIRMED" : "DECLINED";
    const conf = status === "CONFIRMED" ? seats : 0;
    const arrived = status === "CONFIRMED" && i < 48 ? conf : 0;
    await db.guest.create({ data: { weddingId: w2.id, name: p.name, phone: phone(), side: rnd() < 0.5 ? "BRIDE" : "GROOM", relation: pick(RELATIONS), events: "WEDDING,RECEPTION", invitedSeats: seats, confirmedSeats: conf, status, rsvpToken: token(), respondedAt: addDays(t0, -20), checkedInSeats: arrived, checkedInAt: arrived ? t0 : null } });
  }
  // photos: vault from Holud and Wedding, live uploads from today
  const evByType = (t: string) => w2events.find((e) => e.type === t)!;
  const guestsNames = ["Tasnim", "Sabbir", "Lamia", "Anik", "Rumana", "Imran", "Fariha", "Shuvo"];
  for (let i = 1; i <= 6; i++) await db.photo.create({ data: { weddingId: w2.id, eventId: evByType("HOLUD").id, path: `/seed/holud-${i}.jpg`, caption: i === 2 ? "The Holud stage" : null, uploadedBy: i % 2 ? "Wedding Diary" : guestsNames[i], source: i % 2 ? "COUPLE" : "GUEST", status: "APPROVED", favorite: i === 2, takenAt: evByType("HOLUD").date } });
  for (let i = 1; i <= 6; i++) await db.photo.create({ data: { weddingId: w2.id, eventId: evByType("WEDDING").id, path: `/seed/wedding-${i}.jpg`, caption: i === 1 ? "Kabin under the arch" : null, uploadedBy: i % 2 ? "Wedding Diary" : guestsNames[i + 1], source: i % 2 ? "COUPLE" : "GUEST", status: "APPROVED", favorite: i === 1, takenAt: evByType("WEDDING").date } });
  for (let i = 1; i <= 6; i++) await db.photo.create({ data: { weddingId: w2.id, eventId: rec.id, path: `/seed/reception-${i}.jpg`, uploadedBy: guestsNames[i % 8], source: "GUEST", status: i <= 4 ? "APPROVED" : "PENDING", takenAt: t0 } });
  await db.liveAlert.createMany({ data: [
    { weddingId: w2.id, kind: "INFO", message: "VIP guests arrived at Gate 1", byName: "Tanvir (coordinator)", createdAt: new Date(t0.getTime() + 6.9 * 3600_000) },
    { weddingId: w2.id, kind: "BROADCAST", message: "Stage lighting check done in the main hall", byName: "Nusrat", createdAt: new Date(t0.getTime() + 6.7 * 3600_000) },
  ] });

  // ---------- Other couples with confirmed Dream Lens bookings (fills VendorOS) ----------
  const others: [string, string, string, number][] = [["Tasnim", "Imran", "2026-10-30", 1], ["Maliha", "Riad", "2026-11-28", 2], ["Jannat", "Sakib", "2027-01-15", 0]];
  for (const [i, [bride, groom, date, pk]] of others.entries()) {
    const ou = await user(`couple${i + 2}@weddingdiary.test`, `${bride} ${pick(LAST)}`);
    const ow = await db.wedding.create({ data: { brideName: bride, groomName: groom, date: d(date), city: "Dhaka", totalBudget: 1800000, publicCode: shortCode(), members: { create: { userId: ou.id, role: "COUPLE" } } } });
    for (const c of ["PHOTO", "VENUE", "CATERING"]) await db.budgetCategory.create({ data: { weddingId: ow.id, key: c, name: c, allocated: 300000 } });
    const b = await book(ow.id, "Dream Lens Studio", pk, "WEDDING", d(date), "ACCEPTED");
    const first = (await payFor(b.id)).find((p) => p.milestone === "BOOKING")!;
    const photoCat = await db.budgetCategory.findFirstOrThrow({ where: { weddingId: ow.id, key: "PHOTO" } });
    await db.payment.update({ where: { id: first.id }, data: { paidAt: addDays(t0, -4 - i * 6), method: "bKash (simulated)" } });
    await db.expense.create({ data: { weddingId: ow.id, categoryId: photoCat.id, vendorId: b.vendorId, paymentId: first.id, title: "Photography booking", amount: first.amount, status: "PAID", date: addDays(t0, -4 - i * 6) } });
  }

  // ---------- Onboarding user (no wedding yet) exists: new@weddingdiary.test ----------
  console.log("Seed complete. Password for every demo login:", PASSWORD);
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
void EVENT_META; void VENDOR_CATEGORIES;
