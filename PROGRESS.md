# Progress
Phase: 4 (complete) · Current slice: none · Last updated: 2026-09-24

## Done
- [x] Phase 0: brief digest (`plan/00_brief-digest.md`)
- [x] Phase 1: plan (`plan/01`–`05`); checkpoint 1 answered: MVP + Live & Memories, mobile-first web app, free look-alike font, coral #D97566
- [x] Slice 1: foundation (Next 16, Prisma/SQLite, auth, design system, seed, shell)
- [x] Slice 2: splash, onboarding, profile setup
- [x] Slice 3: dashboard, events and timelines
- [x] Slice 4: smart checklist
- [x] Slice 5: budget analytics and payment scheduler
- [x] Slice 6: guests, seating, invitations, public RSVP
- [x] Slice 7: marketplace, booking, reviews, backup vendors, AI match
- [x] Slice 8: VendorOS
- [x] Slice 9: collaboration and permissions (team, invites, audit log)
- [x] Slice 13: Wedding Day Live Mode
- [x] Slice 14: live photo sharing, TV slideshow, Memory Vault
- [x] Slice 10: AI Wedding Assistant (Claude + scripted fallback, logged)
- [x] Slice 11: admin console, settings, data export, EN/বাংলা
- [x] Slice 12: independent review (10 findings fixed), README, user manual PDF (`docs/`)
- Tests on a fresh seed: typecheck ✓ · lint ✓ · smoke 96/96 · e2e 44/44

## Next (later versions, not started)
- Real payment gateway (bKash / Nagad / SSLCommerz), real SMS/WhatsApp/email adapters
- Native iOS/Android apps, offline mode
- Phase 2/3 AI media: face recognition, highlight detection, reels
- Live video streaming, AR previews, accommodation, transport, gift registry and Salami tracker, 2FA

## Open issues / blockers
- None blocking. Client questions are in `plan/05_raid.md` (Open questions).

## Declined by user (do not re-propose)
- (none)

## Decisions made without asking (see plan/05_raid.md)
- Payment split 20/50/30, default budget split, demo "today" fixed at 2026-09-24, Jost as the font stand-in, vector logo stand-in, uploads stored outside `public/`, AI assistant daily cap of 60 questions per user.
