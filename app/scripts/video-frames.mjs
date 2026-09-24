// Renders the explainer video's 1920×1080 frames with Chrome, so they use the brand's real web fonts
// (Playfair Display, Mulish, Tiro Bangla) and shape Bangla correctly. Called by video/build_video.py:
// node scripts/video-frames.mjs <frames.json>   where each item is
// { out, layout: "title"|"wide"|"phone"|"outro", img, eyebrow, title, sub, bn }
import { chromium } from "playwright-core";
import fs from "fs";

const CHROME = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const frames = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));

const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const dataUrl = (p) => `data:image/png;base64,${fs.readFileSync(p).toString("base64")}`;
const LOGO = (color, w = 2.4) =>
  `<svg viewBox="0 0 48 48" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">` +
  `<path d="M24 38C19 33 10 32 4 33V13c6-1 15 0 20 5 5-5 14-6 20-5v20c-6-1-15 0-20 5z"/><path d="M24 18v20"/>` +
  `<path d="M24 16c-2.6-3.6-7.6-2.2-7.6 1.6 0 3.6 7.6 8 7.6 8s7.6-4.4 7.6-8c0-3.8-5-5.2-7.6-1.6z" fill="${color}" fill-opacity=".15"/></svg>`;

// Tokens mirror app/src/app/globals.css (brand guideline: ink, ivory, one diary red).
const CSS = `
:root { --accent:#B3242B; --ink:#111111; --ivory:#FAF7F2; --muted:#555350; --line:#E7E2DF; }
* { box-sizing: border-box; margin: 0; }
body { width: 1920px; height: 1080px; overflow: hidden; font-family: Mulish, "Hind Siliguri", sans-serif; color: var(--ink); background: var(--ivory); position: relative; }
.serif { font-family: "Playfair Display", "Tiro Bangla", Georgia, serif; font-weight: 400; }
.ribbon { position: absolute; top: 0; background: var(--accent); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%); }
.brand { position: absolute; left: 80px; top: 58px; display: flex; align-items: center; gap: 16px; }
.brand svg { width: 52px; height: 52px; }
.brand .name { font-size: 34px; line-height: 1; }
.brand .sub { font-size: 13px; font-weight: 700; letter-spacing: .36em; color: var(--accent); margin-top: 8px; }
.copy { position: absolute; }
.eyebrow { font-size: 17px; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; color: var(--accent); margin-bottom: 20px; }
.copy h1 { font-size: 58px; line-height: 1.12; }
.copy p { font-size: 25px; color: var(--muted); margin-top: 18px; }
.shot { position: absolute; border: 1px solid var(--line); border-radius: 12px; box-shadow: 0 40px 90px -40px rgba(17,17,17,.45); background: #fff; object-fit: cover; object-position: top left; }
.phone { position: absolute; background: #111; border-radius: 56px; padding: 14px; box-shadow: 0 50px 100px -40px rgba(17,17,17,.55); }
.phone img { display: block; border-radius: 42px; }
.cover { background: var(--ink); color: #F6F2EC; }
.frame { position: absolute; inset: 22px; border: 1px solid rgba(255,255,255,.1); border-radius: 12px; }
`;

function page(f) {
  const brand = `<div class="brand">${LOGO("var(--accent)")}<div><div class="serif name">Wedding Diary</div><div class="sub">BANGLADESH</div></div></div>`;
  const copy = (x, y, w) => `<div class="copy" style="left:${x}px;top:${y}px;width:${w}px">
    <div class="ribbon" style="left:-46px;top:-14px;width:18px;height:74px;position:absolute"></div>
    ${f.eyebrow ? `<div class="eyebrow">${esc(f.eyebrow)}</div>` : ""}
    <h1 class="serif">${esc(f.title)}</h1>${f.sub ? `<p>${esc(f.sub)}</p>` : ""}</div>`;
  if (f.layout === "title") {
    return `<body class="cover"><div class="frame"></div><div class="ribbon" style="left:120px;width:34px;height:190px"></div>
      <div style="position:absolute;inset:0;display:grid;place-items:center;text-align:center">
        <div style="display:grid;justify-items:center">
          <div style="width:170px;height:170px;border-radius:50%;border:2px solid rgba(255,255,255,.5);display:grid;place-items:center;margin-bottom:44px">
            <div style="width:96px;height:96px">${LOGO("#fff", 2.2)}</div></div>
          <div class="serif" style="font-size:128px;line-height:1">${esc(f.title)}</div>
          <div style="font-size:24px;font-weight:700;letter-spacing:.5em;margin:30px 0 0 .5em;color:rgba(246,242,236,.72)">BANGLADESH</div>
          <div style="font-size:36px;margin-top:40px">${esc(f.sub)}</div>
          ${f.bn ? `<div style="font-family:'Tiro Bangla',serif;font-size:58px;margin-top:44px;color:#fff">${esc(f.bn)}</div>` : ""}
        </div></div></body>`;
  }
  if (f.layout === "phone" || f.layout === "outro") {
    const ph = 900, pw = Math.round((f.w * ph) / f.h);
    return `<body>${brand}${copy(200, 380, 820)}
      ${f.layout === "outro" ? `<div style="position:absolute;left:200px;top:720px;font-size:26px;font-weight:700;letter-spacing:.12em;color:var(--accent)">weddingdiary.com.bd · @weddingdiarybd</div>` : ""}
      <div class="phone" style="left:1180px;top:${(1080 - ph - 28) / 2}px"><img src="${dataUrl(f.img)}" style="width:${pw}px;height:${ph}px"></div></body>`;
  }
  let tw = 1230, th = Math.round((f.h * tw) / f.w);
  if (th > 900) { th = 900; tw = Math.round((f.w * th) / f.h); }
  return `<body>${brand}${copy(130, 290, 430)}<img class="shot" src="${dataUrl(f.img)}" style="right:110px;top:${(1080 - th) / 2}px;width:${tw}px;height:${th}px"></body>`;
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
for (const f of frames) {
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display&family=Mulish:wght@400;700&family=Hind+Siliguri&family=Tiro+Bangla&display=block" rel="stylesheet">
    <style>${CSS}</style></head>${page(f)}</html>`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: f.out });
  console.log("frame", f.out.split(/[\\/]/).pop());
}
await browser.close();
