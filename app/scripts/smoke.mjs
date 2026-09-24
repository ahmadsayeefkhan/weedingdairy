// Smoke test: every route loads for the right role, and the wrong role is refused.
// Run against a freshly seeded DB and a running dev server: npm run seed && npm run smoke
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PW = "Diary@2026";

const coupleRoutes = ["/dashboard", "/events", "/checklist", "/budget", "/guests", "/seating", "/invitations", "/team", "/vendors", "/vendors/dream-lens-studio", "/bookings", "/live", "/vault", "/assistant", "/notifications", "/settings", "/more"];
const vendorRoutes = ["/vendor", "/vendor/bookings", "/vendor/profile", "/vendor/reviews", "/vendor/notifications"];
const adminRoutes = ["/admin", "/admin/vendors", "/admin/reviews", "/admin/ai", "/admin/outbox"];

// [email, allowed routes, [route, expected redirect path prefix][]]
const PLAN = [
  ["couple@weddingdiary.test", coupleRoutes, [["/vendor", "/dashboard"], ["/admin", "/dashboard"]]],
  ["planner@weddingdiary.test", coupleRoutes.filter((r) => !["/budget", "/team", "/settings"].includes(r)), [["/budget", "/dashboard"], ["/team", "/dashboard"], ["/settings", "/dashboard"], ["/admin", "/dashboard"]]],
  ["family@weddingdiary.test", ["/dashboard", "/events", "/checklist", "/guests", "/seating", "/vendors", "/bookings", "/live", "/vault", "/assistant", "/more"], [["/budget", "/dashboard"], ["/invitations", "/dashboard"], ["/team", "/dashboard"]]],
  ["live@weddingdiary.test", ["/dashboard", "/live", "/vault", "/budget"], []],
  ["vendor@weddingdiary.test", vendorRoutes, [["/dashboard", "/vendor"], ["/admin", "/vendor"], ["/budget", "/vendor"]]],
  ["admin@weddingdiary.test", adminRoutes, [["/dashboard", "/admin"], ["/vendor", "/admin"]]],
  ["new@weddingdiary.test", ["/setup"], [["/dashboard", "/setup"]]],
  [null, ["/", "/login", "/signup", "/signup?kind=vendor", "/rsvp/demo-rsvp-nadia", "/share/live-demo", "/tv/live-demo"], [["/dashboard", "/login"], ["/vendor", "/login"], ["/admin", "/login"], ["/budget", "/login"]]],
];

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log(`✓ ${msg}`); } else { fail++; console.log(`✗ ${msg}`); } };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
for (const [email, allowed, denied] of PLAN) {
  const ctx = await browser.newContext({ colorScheme: "light" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const who = email ?? "anonymous";
  if (email) {
    await page.goto(`${BASE}/login`);
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', PW);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click('button[type="submit"]')]);
  }
  for (const r of allowed) {
    const res = await page.goto(`${BASE}${r}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    const path = new URL(page.url()).pathname;
    const want = r.split("?")[0];
    const body = await page.locator("body").innerText().catch(() => "");
    ok(res && res.status() < 400 && path === want && !/Unhandled Runtime Error|Application error/i.test(body), `${who} can open ${r} (${res?.status()} → ${path})`);
  }
  for (const [r, to] of denied) {
    await page.goto(`${BASE}${r}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    const path = new URL(page.url()).pathname;
    ok(path.startsWith(to) && path !== r, `${who} is refused ${r} (→ ${path})`);
  }
  // API permission checks
  if (email === "family@weddingdiary.test" || email === null) {
    const csv = await page.request.get(`${BASE}/api/guests.csv`);
    ok(csv.status() === 403 || csv.status() === 401, `${who} can't export the guest CSV (${csv.status()})`);
    const ex = await page.request.get(`${BASE}/api/export`);
    ok(ex.status() === 403 || ex.status() === 401, `${who} can't export wedding data (${ex.status()})`);
  }
  if (email === "couple@weddingdiary.test") {
    const csv = await page.request.get(`${BASE}/api/guests.csv`);
    ok(csv.status() === 200 && (await csv.text()).includes("Nadia Hossain"), "couple can export the guest CSV");
  }
  ok(errors.length === 0, `${who}: no browser errors${errors.length ? ` (${errors[0]})` : ""}`);
  await ctx.close();
}
await browser.close();
console.log(`\nSmoke: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
