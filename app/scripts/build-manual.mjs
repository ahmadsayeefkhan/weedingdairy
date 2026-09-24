// Prints docs/manual.html to docs/Wedding-Diary-User-Manual.pdf with the installed Chrome.
// Refresh the screenshots first: npm run seed && node scripts/manual-shots.mjs
import { chromium } from "playwright-core";
import path from "path";
import { pathToFileURL } from "url";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const src = path.resolve("../docs/manual.html");
const out = path.resolve("../docs/Wedding-Diary-User-Manual.pdf");
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
await page.goto(pathToFileURL(src).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: out, format: "A4", printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log("wrote", out);
