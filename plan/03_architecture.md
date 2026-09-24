# 03 · Architecture

## Stack
- Next.js (App Router, TypeScript) in `app/`, using server components and server actions.
- Prisma + SQLite (`app/prisma/dev.db`), so it runs locally with no keys.
- Plain CSS with design tokens (coral system from the App UI deck), mobile-first. Bottom tab bar on phones, sidebar on desktop.
- Auth: email + bcrypt, a random session token in the DB, an httpOnly cookie.
- AI: `@anthropic-ai/sdk`, with the model ID in `.env` (`AI_MODEL`); scripted fallback when `ANTHROPIC_API_KEY` is unset.
- Tests: `scripts/smoke.mjs` (fetch) and `scripts/e2e.mjs` (playwright-core on installed Chrome).

## Data model (main entities)
| Entity | Key fields | Relations |
|---|---|---|
| User | email, name, passwordHash, role (USER/VENDOR/ADMIN), locale | sessions, memberships, vendor? |
| Wedding | brideName, groomName, date, city, venueName, totalBudget, visibility, inviteTemplate/lang/message, publicCode | members, events, tasks, guests, tables, budgetCategories, expenses, bookings, payments |
| WeddingMember | role COUPLE/PLANNER/FAMILY, status | user, wedding |
| Invite | email, role, token, acceptedAt | wedding |
| Event | type HOLUD/MEHENDI/WEDDING/RECEPTION/OTHER, name, date, venue | timelineItems |
| TimelineItem | time, title, location, note | event |
| Task | title, category, dueDate, done, order | wedding, event? |
| BudgetCategory | key, name, allocated | expenses |
| Expense | title, amount, status PAID/PENDING, date | category, vendor? |
| Guest | name, phone, side, relation, events(csv), invitedSeats, confirmedSeats, status, diet, rsvpToken | table? |
| SeatTable | name, capacity | guests |
| Vendor | name, slug, category, city, area, priceTier, startingPrice, about, cover, status PENDING/APPROVED/SUSPENDED, tags | owner(User), packages, blockedDates, reviews, bookings |
| VendorPackage | name, price, description | vendor |
| Booking | eventDate, status REQUESTED/ACCEPTED/DECLINED/CANCELLED/COMPLETED, amount, note | wedding, vendor, package, payments |
| Payment | milestone BOOKING/ADVANCE/FINAL, amount, dueDate, paidAt | booking, wedding |
| Review | ratings ×4, overall, text, hidden | booking (unique), vendor, author |
| Shortlist | | wedding, vendor |
| Notification | channel IN_APP/SMS/EMAIL/WHATSAPP, to, title, body, sent (simulated) | user?/wedding? |
| AuditLog | action, entity, entityId, detail, at | user, wedding? |
| AiLog | question, answer, mode (claude/scripted), tools, tokensIn/Out, costUsd | user, wedding |

## Permissions matrix (enforced on the server by `requireWeddingRole`)
| Capability | Couple | Planner | Family | Vendor | Admin | Guest (link) |
|---|---|---|---|---|---|---|
| Dashboard (no ৳ for Planner/Family) | ✓ | ✓ | ✓ | – | – | – |
| Events/timeline edit | ✓ | ✓ | view | – | – | – |
| Checklist edit | ✓ | ✓ | view | – | – | – |
| Budget, expenses, payments | ✓ | – | – | – | – | – |
| Guests view / edit | ✓/✓ | ✓/✓ | ✓/– | – | – | own RSVP |
| Seating | ✓ | ✓ | view | – | – | – |
| Invitations | ✓ | ✓ | – | – | – | view |
| Marketplace browse / shortlist | ✓/✓ | ✓/✓ | ✓/– | – | – | – |
| Book vendor / review | ✓ | request only / – | – | – | – | – |
| Members & settings & export | ✓ | – | – | – | – | – |
| AI assistant | ✓ | ✓ (no budget tool) | ✓ (read-only data) | – | – | – |
| VendorOS (own vendor) | – | – | – | ✓ | – | – |
| Admin console | – | – | – | – | ✓ | – |

## Integrations (all adapters with dev mode)
- Messaging (SMS/WhatsApp/email): `lib/notify.ts` writes to the Notification table ("outbox"). No real sends.
- Payments: "Mark as paid" plus a simulated bKash/SSLCommerz checkout (TODO: real gateway, Phase 2).
- AI: `lib/ai/` with tools and a deny-list (phone numbers and diet notes of guests are never sent to the model; aggregates only).

## Security & privacy
Server-side role checks on every page and action; zod-like validation with human messages; guest phone numbers are visible only to Couple/Planner; RSVP tokens are random, 128-bit; audit log for bookings, payments, RSVP, member changes and vendor approval.
