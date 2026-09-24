# 01 · Scope

**Vision:** One unified, bilingual (EN/বাংলা) wedding operating system for Bangladeshi couples, their families, planners and vendors. Wedding Diary, powered by WeddingOS.ai.

## Personas
| Persona | Role in app | Main jobs |
|---|---|---|
| Couple (Ayesha & Rahul) | `COUPLE` (Admin of their wedding) | Set up the wedding, run budget and payments, guests and RSVP, checklist, events, book vendors, ask the AI |
| Planner | `PLANNER` (Editor) | Manage vendors, timeline and checklist; no budget totals, no settings |
| Family member | `FAMILY` (Viewer) | View schedule and guests; read-only |
| Guest | public invite link (no login) | View the invitation and RSVP with seats and diet |
| Vendor (Dream Lens Studio) | `VENDOR` (VendorOS) | Manage profile, packages and availability; accept or decline booking requests; see revenue and reviews |
| Platform admin | `ADMIN` | Approve vendors, see platform KPIs, moderate reviews, see the AI question log and the notification log |

## V1 in / out
| In scope (V1 = Phase 01 MVP + demo-critical) | Out of scope (later) |
|---|---|
| Splash, onboarding, sign-in, couple profile setup (events, date, venue, budget) | Native iOS/Android (V1 is a mobile-first responsive web app / PWA) |
| Dashboard: countdown, progress, cards, notifications, next event | Offline mode, voice commands, widgets |
| **Live & Memories:** Wedding Day Live Mode, guest check-in, vendor readiness, live photo sharing via QR, TV slideshow, Memory Vault (E14–E16) | Baraat GPS, live video streaming |
| Event planner: Holud/Mehendi/Wedding/Reception with day timelines | Chromecast/native TV casting (V1 TV = browser slideshow URL) |
| Smart checklist with auto-generated, culturally relevant templates | AI face recognition, reels, highlight detection, photo engine |
| Budget analytics by category, expenses, lakh formatting, PDF export (print) | AR preview, virtual tours, jewelry try-on |
| Payment scheduler (Booking / Advance / Final Settlement), due alerts | Real payment gateway (V1: simulated bKash/SSLCommerz sandbox) |
| Guest list and RSVP (side, relation, event, status, seats, diet), CSV export | Accommodation, transport, gift registry, Salami tracker |
| Seating planner (tables, assign, auto-assign) | Digital guest book, polls |
| Digital invitation (3 templates, BN/EN) with a public RSVP link | Wedding website builder, custom domains |
| Vendor marketplace: filters, profiles, packages, availability, booking request, reviews (booked couples only), backup-vendor suggestions | Contracts e-signature, commission payouts |
| VendorOS: dashboard, bookings, packages, availability, reviews | Subscriptions and billing |
| Collaboration: invite Planner/Family with server-enforced roles | Real SMS/WhatsApp/email (V1: in-app notification log) |
| AI Wedding Assistant (Claude, read-only tools) with an offline "scripted" fallback | Hindi/Urdu UI, live translation |
| Admin: KPIs, vendor approval, review moderation, AI log, notification log | Anniversary reminders, honeymoon planner, analytics heatmaps |
| Settings: visibility, language, data export (JSON) | 2FA, FaceID |

## Success metrics (demo)
- A couple completes setup to a populated dashboard in under 3 minutes.
- A guest RSVPs from an invite link in under 30 seconds, and the couple's counts update.
- A booking request flows couple → vendor accept → payment schedule → budget, end to end.
- Every role sees only what the permissions matrix allows (smoke test proves it).
