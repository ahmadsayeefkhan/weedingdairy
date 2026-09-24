// Captures the screenshots used in the user manual (docs/). Run on a fresh seed:
// npm run seed && node scripts/manual-shots.mjs
import { chromium } from "playwright-core";
import fs from "fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "../docs/shots";
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
async function as(email, width = 1366, height = 860) {
  const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: "light", deviceScaleFactor: 1.5 });
  const page = await ctx.newPage();
  if (email) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Diary@2026");
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click('button[type="submit"]')]);
  }
  return { ctx, page };
}
async function shot(page, path, name, prep) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  if (prep) await prep(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("saved", name);
}

const c = await as("couple@weddingdiary.test");
await shot(c.page, "/dashboard", "couple-dashboard");
await c.page.goto(`${BASE}/events`);
const href = await c.page.locator('a[href^="/events/"]', { hasText: "15 December 2026" }).first().getAttribute("href");
await shot(c.page, href, "couple-event");
await shot(c.page, "/checklist", "couple-checklist");
await shot(c.page, "/budget", "couple-budget");
await shot(c.page, "/budget#payments", "couple-payments", (p) => p.locator("#payments").scrollIntoViewIfNeeded());
await shot(c.page, "/guests", "couple-guests");
await shot(c.page, "/seating", "couple-seating");
await shot(c.page, "/invitations", "couple-invitation");
await shot(c.page, "/vendors", "couple-marketplace");
await shot(c.page, "/vendors/cinematic-echo-films", "couple-vendor");
await shot(c.page, "/bookings", "couple-bookings");
await shot(c.page, "/assistant", "couple-assistant", async (p) => {
  await p.fill('input[aria-label="Your question"]', "koto taka baki ache?");
  await p.getByRole("button", { name: "Send" }).click();
  await p.locator('[aria-live="polite"] > div', { hasText: "is left" }).last().waitFor({ timeout: 60000 });
});
await shot(c.page, "/team", "couple-team");
await shot(c.page, "/settings", "couple-settings");
await c.ctx.close();

const m = await as("couple@weddingdiary.test", 390, 844);
await shot(m.page, "/dashboard", "mobile-dashboard");
await m.ctx.close();

const g = await as(null, 390, 844);
await shot(g.page, "/rsvp/demo-rsvp-nadia", "guest-rsvp");
await shot(g.page, "/share/live-demo", "guest-share");
await g.ctx.close();

const l = await as("live@weddingdiary.test");
await l.page.goto(`${BASE}/live`);
const liveHref = await l.page.getByRole("link", { name: /Open Live Mode/ }).getAttribute("href");
await shot(l.page, liveHref, "live-mode");
await shot(l.page, "/vault", "live-vault");
await shot(l.page, "/tv/live-demo", "live-tv");
await l.ctx.close();

const v = await as("vendor@weddingdiary.test");
await shot(v.page, "/vendor", "vendor-dashboard");
await shot(v.page, "/vendor/bookings", "vendor-bookings");
await shot(v.page, "/vendor/profile", "vendor-profile");
await v.ctx.close();

const a = await as("admin@weddingdiary.test");
await shot(a.page, "/admin", "admin-overview");
await shot(a.page, "/admin/vendors", "admin-vendors");
await shot(a.page, "/admin/ai", "admin-ai");
await a.ctx.close();

const n = await as("new@weddingdiary.test", 1366, 900);
await shot(n.page, "/setup", "setup");
await n.ctx.close();
const s = await as(null, 1366, 860);
await shot(s.page, "/", "splash");
await shot(s.page, "/", "onboarding", async (p) => { await p.locator("main").click(); await p.getByText("Plan your day").waitFor(); });
await s.ctx.close();
await browser.close();
