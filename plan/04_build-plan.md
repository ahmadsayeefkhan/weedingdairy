# 04 · Build plan (vertical slices)

| # | Slice | Stories | Click-through |
|---|---|---|---|
| 1 | Foundation: project, design system, auth, seed, shell | E1-2, E13-1 | Sign in as each demo user and land on the right home |
| 2 | Onboarding and profile setup | E1-1, E1-3 | New user: splash → onboarding → setup → dashboard |
| 3 | Dashboard, events and timeline | E2-*, E3-* | Countdown, cards, event timeline editing |
| 4 | Checklist | E4-* | Toggle and add tasks; progress updates |
| 5 | Budget and payments | E5-* | Add expense, pay milestone, see the donut change, print report |
| 6 | Guests, seating, invitations, public RSVP | E6-*, E7-* | Add guest → send invite (outbox) → RSVP as guest → counts change → seat them |
| 7 | Marketplace and booking, reviews, backups, AI match | E8-* | Filter → profile → request → (vendor accepts) → payments appear |
| 8 | VendorOS | E9-* | Vendor accepts a request, edits a package, blocks a date |
| 9 | Collaboration and permissions | E10-* | Couple invites planner; planner can't see budget |
| 10 | AI assistant | E11-* | Ask "How much budget is left?" → scripted answer from data |
| 11 | Admin and settings | E12-*, E13-2/3 | Approve vendor, hide review, view logs, export data |
| 12 | Finish: tests, README, user manual PDF | – | Full fresh-seed run, all green |
| 13 | Live Mode (E14) | E14-* | Start Live Mode → mark now/next → vendor status → check in guests → broadcast |
| 14 | Live photos + TV + Memory Vault (E15, E16) | E15-*, E16-* | Guest uploads via QR link → moderate → TV slideshow → vault albums |

Build order: 1–9, then 13–14, then 10–12.
