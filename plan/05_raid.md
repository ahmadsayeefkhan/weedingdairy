# 05 · RAID

## Risks
| # | Risk | Mitigation |
|---|---|---|
| R1 | Brief covers ~80 features; V1 cannot build all of them to quality | V1 = Phase 01 MVP; everything else is listed as later |
| R2 | ITC Avant Garde Gothic is a licensed font | Superseded 2026-09-24: the app now uses the brand guideline's Playfair Display + Mulish (free Google Fonts), so no licence is needed |
| R3 | AI costs | Scripted fallback; no key needed; AI log with cost |

## Assumptions
| # | Assumption |
|---|---|
| A1 | V1 is a responsive, mobile-first web app (PWA-ready), not native apps |
| A2 | Currency BDT with lakh grouping; time zone Asia/Dhaka; demo "today" = 2026-09-24 (fixed in the seed) |
| A3 | Payment split on booking accept: Booking 20% / Advance 50% / Final 30% (TODO: confirm with client) |
| A4 | Default budget allocation (share of total): Venue 30, Catering 25, Decor 10, Photography & Video 10, Attire 10, Makeup 4, Invitations & Gifts 3, Music & Entertainment 3, Transport 2, Miscellaneous 3 (%) (assumption, not market data) |
| A5 | Vendors and prices in the seed are synthetic, but Wedding Diary itself is listed as a Photography vendor with its real price range (৳38,000–৳2,25,000, from the brand audit) |
| A6 | Guest status counts use seats (people), not invitation rows |

## Issues
- I1 Two UI-deck pages (Gift Tracker, Photographer Directory) contain leftover prompt text instead of designs.
- I2 The pitch uses USD and a brighter red; the app follows the UI deck (BDT, coral).

## Decisions
- D1 Stack: Next.js + Prisma + SQLite (default per CLAUDE.md).
- D2 Brand (revised 2026-09-24, owner decision): follows `Current Brand Guideline/`. Ink #111 + white + ivory #FAF7F2 backgrounds; ONE accent, "diary red" #B3242B, deepened from the logo red #E91C24 (the old coral #D97566 is retired). Playfair Display headings, Mulish 16px body, Tiro Bangla / Hind Siliguri for Bangla. Black uppercase buttons, tracked eyebrows. Signature: a red ribbon bookmark on page titles, the active menu item and the dashboard.
- D3 Bengali typeface: Hind Siliguri (brand audit recommends adding one).
- D4 Messaging via an in-app outbox (no real sends).

## Open questions (for the client)
- Q1 Payment split and whether a platform commission is shown to vendors.
- Q2 Which payment gateway (bKash, Nagad, SSLCommerz) for Phase 2.
- Q3 Official vector logo (SVG) and the licensed font files.

## Decisions made during the build
- D5: Uploaded photos are stored in `app/uploads/` and served by `/media/...`. Only approved photos of non-private weddings are public; members can see the rest.
- D6: The AI assistant uses `claude-opus-5` (config `AI_MODEL`) with read-only tools and server-side refusal fallback. It has a per-user cap of 60 questions per 24 hours, and a scripted offline mode with no key.
- D7: AI match score = need (10) + budget fit against what's left in the category (35) + city (15) + verified rating (25) + free on the date (15). It is deterministic and explainable.
- D8: The shared invitation link can't change an existing guest's RSVP (matched by phone). Existing guests must use their personal link.
- D9: A vendor serves one wedding per day in V1 (an accepted booking blocks the date).
- D10: The vector logo is a stand-in drawn from the brand board's open-book "WD" monogram until the official SVG arrives.

## More open questions
- Q4: Should the couple pay vendors through the platform (commission model, pitch p20), or only track payments made outside it?
- Q5: Real vendor list and prices for launch (demo vendors are synthetic, except the Wedding Diary package prices from the brand audit).
- Q6: Hindi and Urdu interface (pitch p44, UI deck p73): which comes after Bangla?
