# Wedding Diary Bangladesh: WeddingOS V1

A mobile-first web app that plans a Bangladeshi wedding from the first Holud to the last Reception photo. It's built from the two briefs in this folder (*Wedding Diary Pitch Final.pdf* and *Wedding Diary Bangladesh – App UI.pdf*) and uses the App UI deck's design system: Coral Red `#D97566`, Light Coral `#FF8B7A`, white, 12px corners and glass cards.

It runs entirely on your computer with **no API keys and no paid services**.

## Run it

Requirements: Node.js 20.9+ and Google Chrome (for the automated tests).

```bash
cd app
npm install
cp .env.example .env        # already present in this folder
npm run seed                # creates the SQLite database and demo data
npm run dev                 # http://localhost:3210
```

## Demo logins (password `Diary@2026`)

| Email | Who | Start at |
|---|---|---|
| couple@weddingdiary.test | Ayesha (couple, admin): wedding on 15 Dec 2026 | /dashboard |
| planner@weddingdiary.test | Tania (planner, editor): no budget access | /dashboard |
| family@weddingdiary.test | Habibur Rahman (family, viewer) | /dashboard |
| live@weddingdiary.test | Nusrat (couple): **Reception is today**, for Live Mode and the Memory Vault | /live |
| vendor@weddingdiary.test | Dream Lens Studio (VendorOS) | /vendor |
| admin@weddingdiary.test | Platform admin | /admin |
| new@weddingdiary.test | New couple with no wedding yet (profile setup) | /setup |

Public pages that need no login: `/rsvp/demo-rsvp-nadia` (a guest's RSVP), `/share/live-demo` (guest photo upload), `/tv/live-demo` (TV slideshow). The demo "today" is fixed at **24 September 2026** (`APP_TODAY` in `.env`).

## What's in V1

**Couple and family:** splash and onboarding, profile setup (Holud / Mehendi / Wedding / Reception, date shown in the Bangla calendar, budget slider); dashboard with countdown, progress and alerts; event planner with day timelines; smart checklist generated from the wedding details; budget analytics in ৳ lakh with a donut chart, allocations and a printable PDF report; payment scheduler (Booking 20% / Advance 50% / Final Settlement 30%) with sandbox bKash / Nagad checkout; guest list and RSVP (sides, relations, events, seats, dietary needs, +880 phone validation, CSV export); seating planner with auto-assign; digital invitations in English, বাংলা or both, with a QR code and personal RSVP links; family and team roles; English / বাংলা toggle; privacy settings and data export.

**Marketplace:** 25 vendors across 9 categories, filters, AI match scores, verified reviews (only couples with a booking can review) with four rating criteria, availability checks, and backup vendors under the "Zero Panic Policy".

**Wedding day and memories:** Live Mode (happening now / up next, start and finish items, shift the schedule by ±15 minutes, guest check-in, vendor readiness, broadcast and SOS); guest photo upload by QR with no login; moderation; a full-screen TV slideshow; a Memory Vault with albums by event and favorites.

**AI Wedding Assistant:** uses Claude (`claude-opus-5`, set in `AI_MODEL`) with read-only tools over the wedding's own data, limited by the user's role. With no API key it answers common questions in **scripted** mode from real data, in English, Bangla or Banglish. Every question is logged for the admin.

**VendorOS:** dashboard (revenue, bookings, trends, next payout), accept or decline requests, packages, blocked dates, reviews, wedding-day status.

**Admin:** KPIs, vendor approval, suspend and feature, review moderation, AI question log, message outbox.

## Tests

With the dev server running:

```bash
npm run typecheck && npm run lint
npm run seed && npm run smoke     # 96 checks: each role reaches its pages and is refused others
npm run seed && npm run e2e       # 42 real-browser checks of the acceptance criteria (plan/02_prd.md)
```

## Environment variables (`app/.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite file (default `file:./dev.db`) |
| `APP_TODAY` | Fixed "today" for demos and tests; remove to use the real date |
| `PORT` | Dev server port (3210) |
| `ANTHROPIC_API_KEY` | Optional. Turns on Claude for the assistant |
| `AI_MODEL` | Optional. Claude model id (default `claude-opus-5`) |

## Deploying (e.g. Hostinger)

Use a plan that runs Node.js apps with persistent storage: Hostinger's Node.js web app hosting or a VPS. The app keeps its SQLite database and uploaded photos on disk, so the folder must survive restarts and redeploys.

- **App root:** `app/`
- **Node:** 20.9 or newer
- **Install and build:** `npm ci && npm run db:setup && npm run build`
- **Start:** `npm start`, which listens on the `PORT` the host provides
- **Demo data (optional, erases existing data):** `npm run seed`
- **Environment variables** (in the host panel or `app/.env`):
  - `DATABASE_URL="file:./prod.db"`
  - Remove `APP_TODAY` so the app uses the real date.
  - Optional: `ANTHROPIC_API_KEY` and `AI_MODEL`.
- **Back up** `app/prisma/prod.db` and `app/uploads/`. Both are excluded from git.

## Stubbed or placeholder

- **Payments** are simulated (sandbox checkout; no money moves). The gateway (bKash / Nagad / SSLCommerz) is for Phase 2.
- **SMS, WhatsApp and email** are written to the in-app outbox (Admin → Message outbox); nothing is sent.
- **Font:** Jost stands in for the licensed ITC Avant Garde Gothic. **Logo:** a redrawn vector stand-in for the WD monogram until the official SVG is supplied.
- **Photos** in the demo are generated abstract artwork, not real people.
- The payment split (20/50/30) and the default budget split are assumptions to confirm (see `plan/05_raid.md`).
- Later versions: native apps, AI face recognition, reels and highlights, live video streaming, AR, accommodation, transport, gift registry, 2FA.

## Project documents

`plan/00_brief-digest.md` (what the PDFs say) · `01_scope.md` · `02_prd.md` (epics and acceptance criteria) · `03_architecture.md` (data model and permissions) · `04_build-plan.md` · `05_raid.md` (risks, assumptions, decisions, open questions) · `docs/` (user manual).
