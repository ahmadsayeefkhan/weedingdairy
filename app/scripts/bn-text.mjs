// Renders a line of Bangla text to a transparent PNG with Chrome (correct Bengali shaping).
// node scripts/bn-text.mjs "<text>" <out.png> [px] [color]
import { chromium } from "playwright-core";
const [text, out, px = "64", color = "#ffffff"] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const p = await b.newPage({ viewport: { width: 1800, height: 300 }, deviceScaleFactor: 1 });
await p.setContent(`<html><body style="margin:0;background:transparent"><span id="t" style="font:${px}px 'Nirmala UI','Hind Siliguri',sans-serif;color:${color};white-space:nowrap;display:inline-block;padding:10px 6px">${text}</span></body></html>`);
await p.locator("#t").screenshot({ path: out, omitBackground: true });
await b.close();
