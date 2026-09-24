# 02 · PRD: epics, stories, acceptance criteria

## E1 Onboarding & auth
- E1-1 Splash (coral, logo, "BANGLADESH") and 4 onboarding slides with Skip and a progress dot row.
- E1-2 Sign up / sign in with email + password; demo logins; sessions are httpOnly cookies.
- E1-3 Profile setup: bride and groom names (required), date (future, shows the Bengali calendar date), venue (auto-suggest from venue list), events multi-select (≥1 of Holud/Mehendi/Wedding/Reception), budget slider ৳1L–৳1Cr. On submit, events, default budget categories and a checklist are generated.

## E2 Dashboard
- E2-1 Countdown in days to the wedding date; "Ayesha & Rahul's Big Day".
- E2-2 Planning progress = completed tasks / total tasks.
- E2-3 Cards: Budget (spent of total, in lakh), Guests (total/confirmed), Vendors (booked/confirmed), Tasks (total/completed); each links to its module.
- E2-4 Notifications: pending RSVPs count, payments due within 7 days, over-budget categories.
- E2-5 Next event card (name, date).

## E3 Events & timeline
- E3-1 List the wedding's events with date, venue and colour; add, edit and delete (Couple/Planner).
- E3-2 Day timeline items (time, title, location, note); sorted by time; add/edit/delete.
- E3-3 Family can view but not edit (the server rejects edits).

## E4 Checklist
- E4-1 Tasks with category (Venue, Attire, Catering, Rituals, Guests, Vendors), due date and event; filter by category.
- E4-2 Toggle done; overall progress "12/45".
- E4-3 Add a task; reorder (up/down).

## E5 Budget & payments
- E5-1 Total budget, spent, remaining, % used; donut by category; per-category allocation vs spent bar; over-allocation flagged.
- E5-2 Expenses: add (title, category, amount, vendor, status PAID/PENDING), list recent.
- E5-3 Payment schedule: milestones Booking/Advance/Final Settlement per vendor with due date; statuses PAID / DUE IN n DAYS / OVERDUE / UPCOMING; mark as paid, which creates a PAID expense.
- E5-4 Printable budget report (browser print → PDF).
- E5-5 Planner and Family cannot see budget amounts.

## E6 Guests, RSVP & seating
- E6-1 Guest list: name, phone (+880 validation), side (Bride's/Groom's), relation, events, seats, status, diet; search and filter; counters Total/Confirmed/Pending/Declined (by seats).
- E6-2 Add, edit and delete; CSV export.
- E6-3 Seating: create tables (name, capacity), assign and unassign guests, auto-assign confirmed guests by side and relation, and capacity is enforced.
- E6-4 Dietary summary for the caterer.

## E7 Invitations & public RSVP
- E7-1 Choose a template (Holud / Wedding / Reception), language (EN / বাংলা / both), message; live preview.
- E7-2 Each guest has a unique RSVP link; a general link is also available.
- E7-3 Public RSVP page: invitation, attend yes/no, seats (≤ invited), dietary needs; updates the guest and notifies the couple. The link is idempotent and re-editable.

## E8 Marketplace & booking
- E8-1 Browse approved vendors; filter by category, price tier (৳/৳৳/৳৳৳), city, rating; search.
- E8-2 Vendor profile: cover, about, packages with prices, rating breakdown (Punctuality, Behavior, Quality, Value), reviews, availability.
- E8-3 Shortlist (heart).
- E8-4 Booking request (package, event, date, note). Blocked if the vendor is unavailable that date. Vendor accepts or declines; on accept, a payment schedule is created (Booking 20%, Advance 50%, Final 30%, assumption) and the vendor is marked booked.
- E8-5 Reviews only from couples with a completed or confirmed booking, one per booking; the admin can hide one.
- E8-6 Backup vendors: for a booked vendor, show same-category vendors that are available on the date and within ±20% of the price.
- E8-7 AI Match: shortlist ranked by category need, budget allocation, city and rating (deterministic score).

## E9 VendorOS
- E9-1 Dashboard: monthly revenue (accepted bookings), active bookings, pending requests, rating, trend chart.
- E9-2 Booking requests: accept or decline with a note.
- E9-3 Edit profile and packages; mark blocked dates.
- E9-4 A vendor sees only its own bookings and reviews.

## E10 Collaboration
- E10-1 The Couple invites a member by email with role PLANNER or FAMILY; the invite is logged to notifications; the member signs up with that email and joins.
- E10-2 Permissions are enforced on the server (see matrix); the UI hides disallowed actions.
- E10-3 Activity log (audit) visible to the Couple.

## E11 AI Wedding Assistant
- E11-1 Chat UI (bilingual, Banglish is fine) with suggestion chips.
- E11-2 With an API key: Claude plus read-only tools (budget summary, guests summary, tasks, events, vendor search, payments due) running with the user's permissions.
- E11-3 Without a key: a scripted answer from real data for common intents (budget, guests, tasks, next event, payments, vendor suggestions), labelled "scripted".
- E11-4 Every question is logged; the admin sees the log.

## E12 Admin
- E12-1 KPIs: weddings, users, vendors (approved/pending), bookings, GMV.
- E12-2 Approve or suspend vendors.
- E12-3 Hide or restore reviews.
- E12-4 AI log and notification (outbox) log.

## E13 Settings & i18n
- E13-1 Language toggle EN / বাংলা that persists (cookie); the main navigation and key labels are translated; Bengali digits are optional.
- E13-2 Wedding visibility (Public / Guest-Only / Private), notification preferences.
- E13-3 Data export (JSON download) for the Couple.

## E14 Wedding Day Live Mode (added at checkpoint 1)
- E14-1 Live Mode for an event: HAPPENING NOW / UP NEXT from timeline items; the coordinator marks an item as started or done and can shift upcoming items by +N minutes, which notifies members (outbox).
- E14-2 Vendor readiness board per booked vendor: STANDBY → SETUP → READY → ACTIVE.
- E14-3 Guest check-in: search a guest, mark arrived (seats); "Checked in 72%" gauge.
- E14-4 Broadcast / SOS message to all members (outbox + live alert feed).
- E14-5 Couple and Planner run it; Family views it.

## E15 Live photo sharing & TV slideshow
- E15-1 Each event has a public QR/share link; guests upload photos without logging in (name optional). Image type and size (≤8 MB) are validated.
- E15-2 Moderation: auto-approve on/off; Couple/Planner approve or hide.
- E15-3 TV slideshow page (full-screen, auto-refresh, shows only approved photos, with the QR code on screen).

## E16 Memory Vault
- E16-1 Albums by event (Holud, Mehendi, Wedding, Reception) plus a timeline view; favourites.
- E16-2 Couple uploads photos; guest uploads appear once approved.
- E16-3 Download an original; visibility follows the wedding setting.
