// Exploratory crawl: every role follows every internal link it can reach and reports problems.
// Checks: HTTP status, browser errors, React/hydration warnings, broken images, failed requests,
// stray "NaN"/"undefined"/"Invalid Date"/"[object Object]" text, and sideways scroll on phones.
// Read-only: it only follows links (GET), never submits forms. Usage: node scripts/crawl.mjs [width]
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WIDTH = Number(process.argv[2]) || 1366;
const MOBILE = WIDTH < 700;
const ROLES = [
  ["couple@weddingdiary.test", "/dashboard"], ["planner@weddingdiary.test", "/dashboard"], ["family@weddingdiary.test", "/dashboard"],
  ["live@weddingdiary.test", "/live"], ["vendor@weddingdiary.test", "/vendor"], ["admin@weddingdiary.test", "/admin"],
  ["new@weddingdiary.test", "/setup"], [null, "/"],
];
const EXTRA_PUBLIC = ["/login", "/signup", "/signup?kind=vendor", "/rsvp/demo-rsvp-nadia", "/share/live-demo", "/tv/live-demo"];
const SKIP = /\/api\/|\.csv|\/media\/|logout|^\/tv\//; // downloads, media and the slideshow (polls forever) are checked elsewhere
const BAD_TEXT = /\bNaN\b|\bundefined\b|Invalid Date|\[object Object\]|৳-|\bnull\b/;

const issues = [];
const add = (who, url, kind, detail) => issues.push({ who, url, kind, detail: String(detail).slice(0, 220) });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let pagesVisited = 0;
for (const [email, start] of ROLES) {
  const who = email ? email.split("@")[0] : "guest";
  const ctx = await browser.newContext({ viewport: { width: WIDTH, height: MOBILE ? 844 : 900 }, colorScheme: "light" });
  const page = await ctx.newPage();
  let current = "";
  page.on("pageerror", (e) => add(who, current, "js-error", e.message));
  page.on("console", (m) => {
    if (m.type() !== "error" && m.type() !== "warning") return;
    const t = m.text();
    if (/React DevTools|\[HMR\]|\[Fast Refresh\]|Download the React/.test(t)) return;
    add(who, current, `console-${m.type()}`, t.split("\n")[0]);
  });
  page.on("requestfailed", (r) => { if (!/_rsc|webpack-hmr|__nextjs|\/_next\/webpack/.test(r.url())) add(who, current, "request-failed", `${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 500) add(who, current, "server-5xx", `${r.status()} ${r.url()}`); });
  if (email) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', "Diary@2026");
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click('button[type="submit"]')]);
  }
  const queue = [start, ...(email ? [] : EXTRA_PUBLIC)];
  const seen = new Set();
  while (queue.length && seen.size < 90) {
    const path = queue.shift();
    const key = path.replace(/#.*$/, "");
    if (seen.has(key) || SKIP.test(key)) continue;
    seen.add(key);
    current = key;
    let res;
    try { res = await page.goto(`${BASE}${key}`, { waitUntil: "networkidle", timeout: 60000 }); }
    catch (e) { add(who, key, "navigation", e.message.split("\n")[0]); continue; }
    pagesVisited++;
    const status = res?.status() ?? 0;
    if (status >= 400 && !(status === 404 && /not-a-token/.test(key))) add(who, key, `http-${status}`, page.url());
    const body = await page.locator("body").innerText().catch(() => "");
    const m = body.match(BAD_TEXT);
    if (m) { const i = body.indexOf(m[0]); add(who, key, "bad-text", `"${m[0]}" in: …${body.slice(Math.max(0, i - 60), i + 60).replace(/\s+/g, " ")}…`); }
    const broken = await page.$$eval("img", (imgs) => imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.getAttribute("src")));
    for (const b of broken) add(who, key, "broken-image", b);
    if (MOBILE) {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) {
        const culprit = await page.evaluate(() => { const w = document.documentElement.clientWidth; const el = [...document.querySelectorAll("body *")].find((e) => e.getBoundingClientRect().right > w + 1 && getComputedStyle(e).position !== "fixed"); return el ? `${el.tagName.toLowerCase()}.${[...el.classList].join(".")} "${(el.textContent || "").trim().slice(0, 40)}"` : "?"; });
        add(who, key, "mobile-overflow", `${over}px wider · ${culprit}`);
      }
    }
    // links to follow (same origin, no downloads)
    const hrefs = await page.$$eval("a[href]:not([download])", (as) => as.map((a) => a.getAttribute("href")).filter((h) => h && h.startsWith("/")));
    for (const h of hrefs) if (!seen.has(h.replace(/#.*$/, ""))) queue.push(h);
  }
  console.log(`${who}: visited ${seen.size} pages`);
  await ctx.close();
}
await browser.close();

// de-duplicate identical issues across pages
const grouped = new Map();
for (const i of issues) {
  const k = `${i.kind}|${i.detail}`;
  if (!grouped.has(k)) grouped.set(k, { ...i, where: new Set() });
  grouped.get(k).where.add(`${i.who} ${i.url}`);
}
console.log(`\nVisited ${pagesVisited} pages at ${WIDTH}px. ${grouped.size} distinct issues.\n`);
for (const g of grouped.values()) console.log(`• [${g.kind}] ${g.detail}\n    at ${[...g.where].slice(0, 4).join(" | ")}${g.where.size > 4 ? ` (+${g.where.size - 4} more)` : ""}`);
process.exit(grouped.size ? 1 : 0);
