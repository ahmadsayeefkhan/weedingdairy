// End-to-end checks of the acceptance criteria in plan/02_prd.md, in a real browser.
// Needs a FRESH seed (it changes data): npm run seed && npm run e2e
import { chromium } from "playwright-core";
import path from "path";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PW = "Diary@2026";
const IMG = path.resolve("public/seed/reception-2.jpg");

let pass = 0, fail = 0;
const results = [];
let current = null; // last page a test navigated; screenshotted on failure
async function check(id, name, fn) {
  try { await fn(); pass++; results.push(`✓ ${id} ${name}`); console.log(`✓ ${id} ${name}`); }
  catch (e) {
    fail++; const m = (e?.message ?? String(e)).split("\n")[0]; results.push(`✗ ${id} ${name}: ${m}`); console.log(`✗ ${id} ${name}: ${m}`);
    // E2E_SHOTS=1 saves a screenshot of every open page on failure (../screens/fail_*.png)
    if (process.env.E2E_SHOTS && current && !current.isClosed()) await current.screenshot({ path: `../screens/fail_${id.replace(/\W/g, "_")}.png`, fullPage: true }).catch(() => {});
  }
}
const assert = (c, msg) => { if (!c) throw new Error(msg); };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
async function session(email) {
  const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);
  if (email) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PW);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click('button[type="submit"]')]);
  }
  return { ctx, page };
}
const text = (page) => page.locator("main, body").first().innerText();
// networkidle: wait for hydration before interacting, like a real user would
const go = async (page, p) => { current = page; await page.goto(`${BASE}${p}`, { waitUntil: "networkidle" }); };
const seeText = async (page, t, timeout = 15000) => page.getByText(t, { exact: false }).first().waitFor({ timeout });

// ---------- E1 onboarding ----------
const stamp = Date.now().toString(36);
const newEmail = `e2e-${stamp}@example.com`;
await check("E1-1", "splash then onboarding slides with Skip", async () => {
  const { page, ctx } = await session(null);
  await go(page, "/");
  await seeText(page, "BANGLADESH");
  await page.locator("main").click();
  await seeText(page, "Plan your day");
  assert(await page.getByRole("link", { name: "Skip" }).isVisible(), "no Skip link");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Next", exact: true }).click();
  await seeText(page, "Start planning");
  await ctx.close();
});
await check("E1-2/E1-3", "sign up, profile setup validation, plan generated", async () => {
  const { page, ctx } = await session(null);
  await go(page, "/signup");
  await page.fill('input[name="name"]', "Farzana Test");
  await page.fill('input[name="email"]', newEmail);
  await page.fill('input[name="password"]', "short");
  await page.click('button[type="submit"]');
  // browser minLength blocks; use a long password
  await page.fill('input[name="password"]', PW);
  await Promise.all([page.waitForURL("**/setup"), page.click('button[type="submit"]')]);
  await page.fill('input[name="bride"]', "Farzana");
  await page.fill('input[name="groom"]', "Tanvir");
  await page.locator('input[name="date"]').evaluate((el) => el.removeAttribute("min")); // test the server rule, not the browser's
  await page.fill('input[name="date"]', "2026-01-01");
  await page.click('button[type="submit"]');
  await seeText(page, "needs to be in the future");
  await page.fill('input[name="date"]', "2027-02-14");
  await Promise.all([page.waitForURL("**/dashboard**"), page.click('button[type="submit"]')]);
  await seeText(page, "Your plan is ready");
  const t = await text(page);
  assert(t.includes("Farzana & Tanvir"), "names missing on dashboard");
  await go(page, "/checklist");
  const cl = await text(page);
  assert(/\b0\/\d{2}\b/.test(cl), "checklist not generated");
  await go(page, "/events");
  assert((await text(page)).includes("Gaye Holud"), "Holud event not created");
  await ctx.close();
});

// ---------- Couple flows ----------
const couple = await session("couple@weddingdiary.test");
const cp = couple.page;
await check("E2-1/E2-3", "dashboard shows countdown and cards", async () => {
  await go(cp, "/dashboard");
  const t = await text(cp);
  assert(t.includes("82") && /days to go/i.test(t), "countdown missing");
  assert(t.includes("Ayesha & Rahul"), "names missing");
  assert(/Budget[\s\S]*৳/.test(t) && t.includes("Guests") && t.includes("Checklist"), "cards missing");
});
await check("E2-4", "notifications flag payment due and overdue", async () => {
  const t = await text(cp);
  assert(/due in 2 days/i.test(t), "no due-soon payment alert");
  assert(/overdue/i.test(t), "no overdue alert");
});
await check("E3-2", "couple adds a timeline item to the Wedding", async () => {
  await go(cp, "/events");
  await cp.getByRole("link", { name: /Wedding.*15 December 2026/ }).first().click();
  await cp.waitForURL("**/events/**");
  await cp.fill('form:has(input[name="eventId"]) input[name="time"]', "21:15");
  await cp.fill('form:has(input[name="eventId"]) input[name="title"]', "E2E fireworks");
  await cp.getByRole("button", { name: "Add" }).click();
  await seeText(cp, "Added to the timeline");
  await seeText(cp, "E2E fireworks");
  assert((await text(cp)).indexOf("9:15 PM") > 0, "time not formatted");
});
await check("E4-2", "toggling a task updates progress", async () => {
  await go(cp, "/checklist");
  const before = (await text(cp)).match(/(\d+)\/(\d+)/);
  await cp.locator('button[aria-label^="Mark"][aria-label$="as done"]').first().click();
  await cp.waitForTimeout(1200);
  await go(cp, "/checklist");
  const after = (await text(cp)).match(/(\d+)\/(\d+)/);
  assert(Number(after[1]) === Number(before[1]) + 1, `progress ${before[0]} → ${after[0]}`);
});
await check("E5-2", "logging an expense validates amount and updates the budget", async () => {
  await go(cp, "/budget");
  await cp.getByText("Log an expense").click();
  await cp.fill('input[name="title"]', "E2E Holud flowers");
  await cp.fill('input[name="amount"]', "abc");
  await cp.getByRole("button", { name: "Add expense" }).click();
  await seeText(cp, "Enter an amount in taka");
  await cp.fill('input[name="amount"]', "12500");
  await cp.getByRole("button", { name: "Add expense" }).click();
  await seeText(cp, "Added ৳12,500");
  await seeText(cp, "E2E Holud flowers");
});
await check("E5-3", "paying a milestone marks it paid and records the expense", async () => {
  await go(cp, "/budget");
  const row = cp.locator("#payments .list > div", { hasText: "Radisson Blu Water Garden · Advance" });
  await row.getByText("Pay now").click();
  await row.locator('select[name="method"]').selectOption("Nagad");
  await row.getByRole("button", { name: /Pay ৳2,50,000/ }).click();
  await cp.locator("#payments .list > div", { hasText: "Radisson Blu Water Garden · Advance" }).getByText("Nagad (simulated)").waitFor();
  await go(cp, "/budget");
  assert((await text(cp)).includes("Advance: Radisson Blu Water Garden"), "expense not created from payment");
});
await check("E6-1", "guest phone validation and add guest", async () => {
  await go(cp, "/guests");
  await cp.getByText("Add guest").first().click();
  const f = cp.locator("form", { has: cp.getByRole("button", { name: "Add guest" }) });
  await f.locator('input[name="name"]').fill("E2E Kamal Uddin");
  await f.locator('input[name="phone"]').fill("12345");
  await f.getByRole("button", { name: "Add guest" }).click();
  await seeText(cp, "Enter a Bangladeshi mobile number");
  await f.locator('input[name="phone"]').fill("01711-234567");
  await f.getByRole("button", { name: "Add guest" }).click();
  await seeText(cp, "E2E Kamal Uddin added");
  await go(cp, "/guests?q=E2E%20Kamal");
  assert((await text(cp)).includes("+880 1711 234567"), "phone not normalised");
});
await check("E6-2", "guest CSV export works for the couple", async () => {
  const r = await cp.request.get(`${BASE}/api/guests.csv`);
  const body = await r.text();
  assert(r.status() === 200 && body.includes("E2E Kamal Uddin"), "CSV missing guest");
});
await check("E6-3", "seating enforces capacity and auto-assigns", async () => {
  await go(cp, "/seating");
  await cp.getByRole("button", { name: /Auto-assign guests/ }).click();
  await seeText(cp, /Seated \d+/);
  const t = await text(cp);
  const over = [...t.matchAll(/(\d+)\/(\d+)\s*seats/g)].some((m) => Number(m[1]) > Number(m[2]));
  assert(!over, "a table is over capacity");
});
await check("E7-1", "invitation designer saves template and language", async () => {
  await go(cp, "/invitations");
  await cp.locator("label.chip", { hasText: "Gaye Holud" }).click();
  await cp.locator("label.chip", { hasText: "বাংলা" }).click();
  await cp.getByRole("button", { name: "Save invitation" }).click();
  await seeText(cp, "Invitation saved");
  await seeText(cp, "গায়ে হলুদ");
});

// ---------- Public RSVP ----------
await check("E7-3", "guest RSVPs from a personal link; couple sees it; answer can change", async () => {
  const { page, ctx } = await session(null);
  await go(page, "/rsvp/demo-rsvp-nadia");
  await seeText(page, "Nadia Hossain");
  await page.locator("label.chip", { hasText: "Joyfully accept" }).click();
  await page.locator('select[name="seats"]').selectOption("2");
  await page.locator("label.chip", { hasText: "Vegetarian" }).click();
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await seeText(page, "can't wait to see you");
  await page.locator("label.chip", { hasText: "Regretfully decline" }).click();
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await seeText(page, "You'll be missed");
  await page.locator("label.chip", { hasText: "Joyfully accept" }).click();
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await seeText(page, "can't wait to see you");
  await ctx.close();
  await go(cp, "/guests?q=Nadia");
  const t = await text(cp);
  assert(/Nadia Hossain[\s\S]*CONFIRMED/.test(t), "couple doesn't see CONFIRMED");
  await go(cp, "/notifications");
  assert((await text(cp)).includes("Nadia Hossain confirmed 2 seats"), "couple not notified");
});
await check("E7-2", "shared invitation link can't overwrite an existing guest's RSVP", async () => {
  await go(cp, "/invitations");
  const code = (await cp.locator("code", { hasText: "/i/" }).innerText()).trim();
  const { page, ctx } = await session(null);
  await go(page, code);
  await page.fill('input[name="name"]', "Someone Else");
  await page.fill('input[name="phone"]', "01711234567"); // E2E Kamal Uddin's number from E6-1
  await page.locator("label.chip", { hasText: "Regretfully decline" }).click();
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await seeText(page, "already on the couple's guest list");
  await page.fill('input[name="phone"]', "01999888777");
  await page.locator("label.chip", { hasText: "Joyfully accept" }).click();
  await page.getByRole("button", { name: "Send RSVP" }).click();
  await seeText(page, "Your RSVP has been sent");
  await ctx.close();
});
await check("SEC", "language switch refuses off-site redirects", async () => {
  await go(cp, "/more");
  await cp.locator('main input[name="back"]').evaluate((el) => { el.value = "//evil.example.com"; });
  await cp.getByRole("button", { name: "English" }).click();
  await cp.waitForLoadState("networkidle");
  assert(new URL(cp.url()).host === new URL(BASE).host, `redirected off-site to ${cp.url()}`);
});
await check("E7-2", "invalid RSVP link shows not found", async () => {
  const { page, ctx } = await session(null);
  const r = await page.goto(`${BASE}/rsvp/not-a-token`);
  assert(r.status() === 404, `status ${r.status()}`);
  await ctx.close();
});

// ---------- Marketplace & booking ----------
await check("E8-1", "marketplace filters by category and city", async () => {
  await go(cp, "/vendors?cat=CATERING&city=Chattogram");
  const t = await text(cp);
  assert(t.includes("Spice Catering Chattogram") && !t.includes("Sultan's Dine"), "filter failed");
});
await check("E8-4/E8-6", "booking blocked on an unavailable date, with backup vendors", async () => {
  await go(cp, "/vendors/cinematic-echo-films");
  await seeText(cp, "Booked on 15 December 2026");
  await seeText(cp, "Backup vendors");
  await cp.getByRole("button", { name: "Send request" }).click();
  await seeText(cp, "already booked on 15 December 2026");
});
await check("E8-4", "couple sends a booking request", async () => {
  await go(cp, "/vendors/royal-rajbari-decor");
  await cp.locator('select[name="eventType"]').selectOption("WEDDING");
  await cp.getByRole("button", { name: "Send request" }).click();
  await seeText(cp, "Request sent to Royal Rajbari Decor");
  await go(cp, "/bookings");
  assert(/Royal Rajbari Decor[\s\S]*Waiting for vendor/i.test(await text(cp)), "request not listed");
});
await check("E8-3", "shortlist toggles", async () => {
  await go(cp, "/vendors/dj-rahat");
  const before = await cp.getByRole("button", { name: /Shortlist/ }).first().innerText();
  await cp.getByRole("button", { name: /Shortlist/ }).first().click();
  await cp.waitForTimeout(1000);
  const after = await cp.getByRole("button", { name: /Shortlist/ }).first().innerText();
  assert(before !== after, "shortlist state unchanged");
});

// ---------- VendorOS ----------
await check("E9-2", "vendor accepts a request; couple gets a payment schedule", async () => {
  const { page, ctx } = await session("vendor@weddingdiary.test");
  await go(page, "/vendor/bookings");
  const req = page.locator(".list > div", { hasText: "Ayesha & Rahul" }).first();
  await req.locator('input[name="note"]').fill("Delighted! Drone included.");
  await req.getByRole("button", { name: "Accept" }).click();
  // the request moves from "New requests" to "Confirmed"
  await page.locator("section.card", { hasText: "Confirmed" }).locator(".list > div", { hasText: "Ayesha & Rahul" }).waitFor();
  await ctx.close();
  await go(cp, "/budget");
  const t = await text(cp);
  assert((t.match(/Dream Lens Studio · /g) ?? []).length === 3, "3 milestones not created");
  await go(cp, "/notifications");
  assert((await text(cp)).includes("Dream Lens Studio accepted"), "couple not notified");
});
await check("E9-4", "vendor sees only its own bookings", async () => {
  const { page, ctx } = await session("vendor@weddingdiary.test");
  await go(page, "/vendor/bookings");
  const t = await text(page);
  assert(!t.includes("Radisson") && !t.includes("Nusrat & Rafiq"), "other vendors' bookings visible");
  await ctx.close();
});
await check("E9-3", "vendor edits a package and blocks a date", async () => {
  const { page, ctx } = await session("vendor@weddingdiary.test");
  await go(page, "/vendor/profile");
  const f = page.locator("form", { has: page.getByRole("button", { name: "Add package" }) });
  await f.locator('input[name="name"]').fill("E2E Mehendi add-on");
  await f.locator('input[name="price"]').fill("20000");
  await f.getByRole("button", { name: "Add package" }).click();
  await seeText(page, "Package added");
  await page.locator('input[aria-label="Date to block"]').fill("2027-03-05");
  await page.getByRole("button", { name: "Block" }).click();
  await seeText(page, "5 March 2027 is now blocked");
  await ctx.close();
});
await check("E8-5", "only couples with a confirmed booking can review; review appears", async () => {
  await go(cp, "/bookings");
  const card = cp.locator("section.card", { hasText: "Bridal Glow by Sarah Khan" });
  await card.getByText("Write a verified review").click();
  await card.locator('textarea[name="text"]').fill("Beautiful trial look, very patient with Ammu too.");
  await card.getByRole("button", { name: "Post review" }).click();
  await card.getByText("You reviewed this vendor").waitFor();
  await go(cp, "/vendors/bridal-glow-by-sarah-khan");
  await seeText(cp, "very patient with Ammu");
});

// ---------- Collaboration & permissions ----------
const inviteEmail = `khala-${stamp}@example.com`;
await check("E10-1", "couple invites a family member who joins with viewer access", async () => {
  await go(cp, "/team");
  await cp.fill('input[name="email"]', inviteEmail);
  await cp.locator('select[name="role"]').last().selectOption("FAMILY");
  await cp.getByRole("button", { name: "Invite" }).click();
  await seeText(cp, "is in the outbox");
  await go(cp, "/team");
  const link = await cp.locator(`a[href^="/join/"]`).first().getAttribute("href");
  const { page, ctx } = await session(null);
  await go(page, link);
  await page.getByRole("link", { name: /Create account/ }).click();
  await page.fill('input[name="name"]', "Khala Test");
  await page.fill('input[name="password"]', PW);
  await Promise.all([page.waitForURL("**/join/**"), page.click('button[type="submit"]')]);
  await Promise.all([page.waitForURL("**/dashboard**"), page.getByRole("button", { name: "Accept invitation" }).click()]);
  const t = await text(page);
  assert(t.includes("Ayesha & Rahul") && t.includes("Family · Viewer"), "not joined as family");
  assert(!/৳\d/.test(await page.locator(".grid.g4").first().innerText()), "family sees budget amount");
  await ctx.close();
});
await check("E10-2", "planner can't open the budget or pay (server-enforced)", async () => {
  const { page, ctx } = await session("planner@weddingdiary.test");
  await go(page, "/budget");
  assert(page.url().includes("/dashboard?denied=1"), "planner reached /budget");
  await seeText(page, "isn't available for your role");
  await go(page, "/checklist");
  assert(await page.locator('button[aria-label$="as done"]').count() > 0, "planner can't edit checklist");
  await ctx.close();
});
await check("E10-2", "family has no edit controls", async () => {
  const { page, ctx } = await session("family@weddingdiary.test");
  await go(page, "/checklist");
  assert(await page.locator('button[aria-label$="as done"]').count() === 0, "family sees task toggles");
  await go(page, "/guests");
  assert(await page.getByText("Add guest").count() === 0, "family can add guests");
  assert(!/\+880 1\d{3}/.test(await text(page)), "family sees guest phone numbers");
  await ctx.close();
});
await check("E10-3", "activity log records who changed what", async () => {
  await go(cp, "/team");
  const t = await text(cp);
  assert(t.includes("payment · paid") && t.includes("member · joined"), "audit entries missing");
});

// ---------- AI assistant ----------
await check("E11-3", "assistant answers budget question from data (scripted)", async () => {
  await go(cp, "/assistant");
  await cp.fill('input[aria-label="Your question"]', "koto taka baki ache?");
  await cp.getByRole("button", { name: "Send" }).click();
  const reply = cp.locator('[aria-live="polite"] > div', { hasText: "left" }).last();
  await reply.waitFor({ timeout: 60000 });
  const t = await reply.innerText();
  assert(/৳[\d,]+ is left/.test(t), `unexpected answer: ${t.slice(0, 80)}`);
  assert(t.includes("scripted") || process.env.ANTHROPIC_API_KEY, "not labelled scripted");
});
await check("E11-2", "assistant respects role: planner can't get budget numbers", async () => {
  const { page, ctx } = await session("planner@weddingdiary.test");
  await go(page, "/assistant");
  await page.fill('input[aria-label="Your question"]', "How much budget is left?");
  await page.getByRole("button", { name: "Send" }).click();
  await page.waitForTimeout(3000);
  const t = await text(page);
  assert(!/৳\d{1,2},\d{2},\d{3} is left/.test(t), "planner got budget figures");
  await ctx.close();
});

// ---------- Live, photos, vault ----------
const live = await session("live@weddingdiary.test");
const lp = live.page;
await check("E14-1", "Live Mode: start the next item; now/next update", async () => {
  await go(lp, "/live");
  await lp.getByRole("link", { name: /Open Live Mode/ }).click();
  await lp.waitForURL("**/live/**");
  await seeText(lp, "Bride & groom entry");
  const row = lp.locator(".tl-item", { hasText: "Lunch service" });
  await row.getByRole("button", { name: "Start" }).click();
  await lp.waitForTimeout(1200);
  await lp.reload();
  const hero = await lp.locator(".hero").innerText();
  assert(/Happening now\s*Lunch service/i.test(hero), "now didn't move to Lunch service");
});
await check("E14-1", "shift upcoming items +15 min notifies the team", async () => {
  await lp.getByRole("button", { name: "+15 min" }).click();
  await seeText(lp, "Everyone on the team was notified");
  await lp.reload();
  assert((await text(lp)).includes("3:45 PM"), "Family photos not moved to 3:45 PM");
});
await check("E14-3", "guest check-in updates the gauge", async () => {
  const before = Number((await lp.locator("text=/\\d+ of \\d+/").first().innerText()).split(" ")[0]);
  const pending = await live.ctx.request.get(`${BASE}/api/guests.csv`);
  const parse = (line) => [...line.matchAll(/("(?:[^"]|"")*"|[^,]*)(?:,|$)/g)].map((m) => m[1].replace(/^"|"$/g, "").replace(/""/g, '"')).slice(0, 12);
  const rows = (await pending.text()).replace(/^﻿/, "").split("\r\n").slice(1).map(parse);
  const notIn = rows.find((r) => r[7] === "CONFIRMED" && r[11] === "0");
  await lp.fill('input[aria-label="Find a guest to check in"]', notIn[0]);
  await lp.getByRole("button", { name: "Search" }).click();
  await lp.waitForURL("**q=**");
  await lp.locator("form", { hasText: "Check in" }).first().getByRole("button", { name: "Check in" }).click();
  await lp.waitForTimeout(1500);
  await lp.reload();
  const after = Number((await lp.locator("text=/\\d+ of \\d+/").first().innerText()).split(" ")[0]);
  assert(after > before, `check-in count ${before} → ${after}`);
});
await check("E14-4", "broadcast and SOS reach the alert feed", async () => {
  await lp.fill('textarea[name="message"]', "E2E: cake arriving at gate 2");
  await lp.getByRole("button", { name: "SOS" }).click();
  await seeText(lp, "SOS sent to the whole team");
  await lp.reload();
  await seeText(lp, "E2E: cake arriving at gate 2");
});
await check("E15-1", "guest uploads a photo from the QR page (no login); non-images rejected", async () => {
  const { page, ctx } = await session(null);
  await go(page, "/share/live-demo");
  await page.fill('input[name="name"]', "E2E Cousin");
  await page.setInputFiles('input[type="file"]', { name: "notes.txt", mimeType: "image/jpeg", buffer: Buffer.from("not an image") });
  await page.getByRole("button", { name: "Upload photos" }).click();
  await seeText(page, "isn't a JPG, PNG or WebP");
  await page.setInputFiles('input[type="file"]', IMG);
  await page.getByRole("button", { name: "Upload photos" }).click();
  await seeText(page, "once the couple approves");
  await ctx.close();
});
await check("E15-2/E15-3", "couple approves the guest photo; TV feed includes it", async () => {
  await go(lp, "/vault?tab=review");
  const card = lp.locator(".photos > div", { hasText: "E2E Cousin" }).first();
  await card.getByRole("button", { name: "Approve" }).click();
  await lp.waitForTimeout(1200);
  const tv = await (await lp.request.get(`${BASE}/api/tv/live-demo`)).json();
  assert(tv.photos.some((p) => p.by === "E2E Cousin"), "approved photo not on TV feed");
  const media = await lp.request.get(`${BASE}${tv.photos.find((p) => p.by === "E2E Cousin").src}`);
  assert(media.status() === 200 && media.headers()["content-type"] === "image/jpeg", "media route failed");
});
await check("E16-1", "Memory Vault groups albums by event and filters favorites", async () => {
  await go(lp, "/vault");
  const t = await text(lp);
  assert(t.includes("Gaye Holud") && t.includes("Wedding") && t.includes("Reception"), "albums missing");
  await go(lp, "/vault?tab=favorites");
  assert((await lp.locator(".photo").count()) >= 2, "favorites missing");
});
await live.ctx.close();

// ---------- Admin ----------
const admin = await session("admin@weddingdiary.test");
const ap = admin.page;
await check("E12-2", "admin approves a pending vendor; it appears in the marketplace", async () => {
  await go(ap, "/admin/vendors?status=PENDING");
  const row = ap.locator("tr", { hasText: "Kolpona Event Decor" });
  await row.getByRole("button", { name: "Approve" }).click();
  await ap.waitForTimeout(1200);
  await go(cp, "/vendors?cat=DECOR&city=Khulna");
  assert((await text(cp)).includes("Kolpona Event Decor"), "approved vendor not listed");
});
await check("E12-3", "admin hides an abusive review", async () => {
  await go(ap, "/admin/reviews");
  const row = ap.locator(".list > div", { hasText: "WORST!!!" });
  await row.getByRole("button", { name: "Hide" }).click();
  await ap.waitForTimeout(1000);
  await go(cp, "/vendors/royal-feast");
  assert(!(await text(cp)).includes("WORST!!!"), "hidden review still visible");
});
await check("E12-4", "AI log and message outbox record activity", async () => {
  await go(ap, "/admin/ai");
  assert((await text(ap)).includes("koto taka baki ache?"), "question not logged");
  await go(ap, "/admin/outbox");
  const t = await text(ap);
  assert(t.includes("SMS") && t.includes("E2E: cake arriving"), "SOS SMS not in outbox");
});
await admin.ctx.close();

// ---------- Settings & i18n ----------
await check("E13-1", "language toggle switches navigation to Bangla", async () => {
  await go(cp, "/settings");
  await cp.getByRole("button", { name: "বাংলা" }).click();
  await cp.waitForURL("**/settings");
  await seeText(cp, "অতিথি");
  await cp.getByRole("button", { name: "English" }).click();
  await cp.waitForURL("**/settings");
  await seeText(cp, "Guests");
});
await check("E13-2", "private visibility turns off the shared invitation link", async () => {
  await go(cp, "/invitations");
  const code = (await cp.locator("code", { hasText: "/i/" }).innerText()).trim();
  await go(cp, "/settings");
  await cp.locator("label.chip", { hasText: "Private" }).click();
  await cp.getByRole("button", { name: "Save settings" }).click();
  await seeText(cp, "Settings saved");
  const r1 = await cp.request.get(`${BASE}${code}`);
  assert(r1.status() === 404, `private link still open (${r1.status()})`);
  await cp.locator("label.chip", { hasText: "Guest-only" }).click();
  await cp.getByRole("button", { name: "Save settings" }).click();
  await seeText(cp, "Settings saved");
  const r2 = await cp.request.get(`${BASE}${code}`);
  assert(r2.status() === 200, "link not restored");
});
await check("E13-3", "couple downloads a JSON export without secret codes", async () => {
  const r = await cp.request.get(`${BASE}/api/export`);
  const j = await r.json();
  assert(r.status() === 200 && j.wedding.brideName === "Ayesha" && !("publicCode" in j.wedding), "bad export");
});
await check("E13-2", "moving the wedding date moves the events with it", async () => {
  await go(cp, "/settings");
  await cp.fill('input[name="date"]', "2026-12-22");
  await cp.getByRole("button", { name: "Save settings" }).click();
  await seeText(cp, "moved 7 days later");
  await go(cp, "/events");
  const t = await text(cp);
  assert(t.includes("19 December 2026") && t.includes("22 December 2026"), "Holud/Wedding dates not moved");
});
await check("E12-2", "a new vendor can't be approved until the listing is complete", async () => {
  const { page, ctx } = await session(null);
  await go(page, "/signup?kind=vendor");
  await page.fill('input[name="name"]', "Rina Test");
  await page.fill('input[name="email"]', `vendor-${stamp}@example.com`);
  await page.fill('input[name="password"]', PW);
  await page.fill('input[name="business"]', `E2E Lights ${stamp}`);
  await Promise.all([page.waitForURL("**/vendor"), page.getByRole("button", { name: "Submit for review" }).click()]);
  await seeText(page, "under review");
  await ctx.close();
  const a = await session("admin@weddingdiary.test");
  await go(a.page, "/admin/vendors?status=PENDING");
  const row = a.page.locator("tr", { hasText: `E2E Lights ${stamp}` });
  assert(await row.getByText("Profile incomplete").isVisible(), "incomplete vendor shows Approve");
  assert(await row.getByRole("button", { name: "Approve" }).count() === 0, "Approve button present");
  await a.ctx.close();
});
await check("MOBILE", "phone layout: tab bar visible, no horizontal scroll", async () => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light", storageState: await couple.ctx.storageState() });
  const page = await ctx.newPage();
  for (const p of ["/dashboard", "/events", "/checklist", "/guests", "/budget", "/vendors", "/live", "/vault", "/invitations"]) {
    await go(page, p);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert(overflow <= 1, `${p} scrolls sideways by ${overflow}px`);
  }
  assert(await page.locator(".tabbar").isVisible(), "tab bar hidden");
  await ctx.close();
});

await couple.ctx.close();
await browser.close();
console.log(`\nE2E: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
