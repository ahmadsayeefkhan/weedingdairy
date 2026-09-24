// Screenshot helper: node scripts/shot.mjs <email|-> <width> <path> [path...]
// Saves to ../screens/<name>.png. Uses the installed Chrome (no browser download).
import { chromium } from "playwright-core";
import fs from "fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3210";
const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const [email, width, ...paths] = process.argv.slice(2);
fs.mkdirSync("../screens", { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: Number(width) || 1366, height: Number(process.env.SHOT_HEIGHT) || 900 }, colorScheme: "light", deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.log("PAGE ERROR", e.message));
if (email && email !== "-") {
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', "Diary@2026");
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), page.click('button[type="submit"]')]);
}
for (const p of paths) {
  const res = await page.goto(`${BASE}${p}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.addStyleTag({ content: "nextjs-portal{display:none!important}" });
  await page.waitForTimeout(400);
  const name = `${(email || "anon").split("@")[0]}_${width}_${p.replace(/[^a-z0-9]+/gi, "_") || "root"}`;
  await page.screenshot({ path: `../screens/${name}.png`, fullPage: !process.env.SHOT_HEIGHT });
  console.log(res?.status(), p, "->", name);
}
await browser.close();
