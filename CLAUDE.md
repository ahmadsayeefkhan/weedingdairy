# App Builder — build a working application from the PDF brief in this folder

You are the builder. This folder holds one or more PDF briefs (a pitch deck, proposal, portfolio or requirements document). Your job is to turn them into a **working, demo-ready web application**, with plan, code, demo data, tests and a user manual, while the owner reviews at a few checkpoints.

**Start trigger:** when the user says "start", "build", "go" or similar, or opens a session and `PROGRESS.md` exists, follow this file. If `PROGRESS.md` exists, read it first and **resume from where it says**, without redoing finished phases.

---

## Ground rules

- **Work autonomously.** Decide things that have a sensible default yourself and record the decision in `plan/05_raid.md`. Ask the user only about things only they can decide: scope trade-offs, business rules the PDF doesn't settle, branding, paid services.
- **Ask in batches.** Use AskUserQuestion with up to 4 questions per call, put the recommended option first, and never ask the same thing twice.
- **The PDF is the source of truth.** Use its names, stage names, terms, numbers and language. When the PDF is silent, choose what a real business in that market would expect, and label it as an assumption.
- **Don't invent real-world facts.** Tax rules, legal formats and prices you aren't sure of go in as clearly marked placeholders (`TODO: confirm with accountant`), and in the RAID log.
- **Never spend money or use paid credits** (APIs, AI generation, cloud) without asking. The app must run fully on a local machine with **no API keys at all**.
- **Never push to a remote, deploy, or send real emails or messages** unless the user asks. Commit locally.
- **Declined is final.** If the user declines a feature or step, record it in `PROGRESS.md` under "Declined" and don't propose it again.
- **Report honestly.** "Done" means it runs and its tests pass, and you show the output. If something is skipped, stubbed or failing, say so plainly.

---

## Phase 0 — Read the brief

1. Find every PDF in this folder and read **all** pages. For long PDFs, read in chunks until you've covered 100%.
2. Write `plan/00_brief-digest.md`:
   - Who the client is, what they do, and the market or country.
   - The problems or pains they list, quoted.
   - Every module, feature or tier they mention.
   - Users and personas.
   - Workflows and stage names, exactly as written.
   - Numbers: scale, prices, KPIs.
   - Local conventions: currency, fiscal year, tax or invoice formats, languages, phone formats.
   - Brand: colours, fonts and tone, if visible.
   - Anything that looks inconsistent in the PDF, noted politely.
3. **Scope rule:** if the brief offers tiers or phases, V1 is the **first or entry tier** plus whatever is needed to demo it end to end. Put everything else under "Later versions", unless the user says otherwise.

## Phase 1 — Plan (short, practical documents)

Create these in `plan/`. Keep each one short enough to read in 5 minutes: tables, not essays.

| File | Contents |
|---|---|
| `01_scope.md` | Vision in one line; personas and their main jobs; V1 **in scope / out of scope** table; success metrics |
| `02_prd.md` | Epics → user stories → **acceptance criteria** (testable, numbered like E1-3) |
| `03_architecture.md` | Stack, data model (entities, key fields, relations), roles and permissions matrix, integrations, AI design (if any), security and privacy |
| `04_build-plan.md` | Ordered **vertical slices**. Each slice is a thin end-to-end feature the user can click through, and lists the stories it covers |
| `05_raid.md` | Risks, Assumptions, Issues, Decisions, Open questions |

Then **checkpoint 1**: summarise the scope in about 10 lines in chat, ask the blocking open questions in one batch, and wait for the user's go-ahead. After that, don't stop again until the build is complete, except for a real blocker.

## Phase 2 — Set up the project

**Default stack.** Use it unless the brief or the user requires another:
- Next.js (App Router, TypeScript) + Prisma + **SQLite**, running locally in one app folder, `app/`.
- Plain CSS with design tokens, or Tailwind, whichever fits the design better.
- `playwright-core` driving the **installed Chrome** for end-to-end checks. Don't download browsers.

Steps:
- **Check versions before writing code.** Frameworks change. Read the docs bundled in `node_modules` (for example `node_modules/next/dist/docs/`) and follow any `AGENTS.md` the framework generates. Don't rely on memory for APIs.
- **Pick a free port.** Check first. Never kill a process you didn't start; another app may be using a common port such as 3000.
- **Set up git and config.** Run `git init`, add a `.gitignore` covering env files, the database, `node_modules` and build output, and add `.env.example` listing every variable with a comment.
- **Add a project section.** Append a `## Project` section to the **bottom of this file** with the real commands (dev, seed, test, e2e), the port, demo logins and any gotchas you discover.

## Phase 3 — Build loop (repeat for each slice in `04_build-plan.md`)

1. **Spec:** write down the slice's data changes, screens, rules, permissions and acceptance criteria, in the build plan or `plan/specs/<slice>.md`.
2. **Implement** the smallest complete version: data model → server logic → UI → seed data.
3. **Verify.** Run the typecheck, lint and tests. Then open the real app in Chrome, take screenshots, **look at them**, and fix anything broken, ugly or confusing.
4. **Test.** Add checks to `scripts/e2e.mjs` for each acceptance criterion in the slice, and run the whole suite, not just the new part.
5. **Commit** locally with a clear message. Update `PROGRESS.md`: slices done, what's next, any open issues.

**Use subagents.** For broad code searches and for an independent review after large slices (correctness against the spec, permission leaks, missing edge cases), use subagents. Fix what they find before moving on.

## Quality bar (every slice)

- **Real product feel.** Build a branded UI using the PDF's colours and fonts where visible, otherwise a considered palette. It must be responsive down to phone width, with clear empty, loading and error states. Load the `frontend-design` skill before the first UI work.
- **Local by default.** Use the brief's currency and number formatting (for example lakh/crore when the market uses them), date formats, time zone, fiscal year, phone format with validation, and language. If the brief mentions a second language, add a language toggle.
- **Permissions on the server.** Every page and action checks the user's role on the server. Never trust the UI alone. Each role sees only what the matrix in `03_architecture.md` allows.
- **Privacy.** Sensitive fields (IDs, bank details, salaries, minors' data) are restricted by role and **never sent to an AI model**. Capture consent where the domain needs it.
- **Audit trail.** Record important state changes (stage moves, approvals, payments) with who and when.
- **Validation.** Validate inputs on the server with clear, human error messages.

## AI features (if the brief has an assistant, chatbot, "AI", insights and so on)

- Use the **Claude API**. Load the `claude-api` skill first for current model IDs and SDK usage; don't hard-code model names from memory. Keep model IDs in config.
- Build it with **tool use** over the app's own data. The tools are **read-only** in V1 and run **with the asking user's permissions**. Keep a field deny-list for sensitive data.
- **Log every question**: user, question, tools used, tokens, cost and answer, and give admins a page to see the log.
- **Scripted fallback:** with no API key set, answer the most common questions from real data using deterministic code, and label the answer "scripted". This keeps the demo working offline and free.
- Support the languages the brief mentions, including mixed or romanised forms if relevant.

## Integrations (payments, email, SMS/WhatsApp, maps, social APIs)

- Put each integration behind a small adapter with a **dev/sandbox mode that needs no keys**. In that mode, emails and messages are written to an in-app "Notifications" log, and payments use the provider's sandbox or a simulated checkout.
- Real keys live only in `.env`. The app must start and demo fully without them.
- Verify webhooks (signatures), make them idempotent, and test them in the e2e script.

## Demo data

- Write a seed script with **synthetic, realistic data** for the brief's market (local names, cities and businesses). Match the scale the brief mentions, and cover every state of every workflow so each screen has something to show.
- Never use real personal data. If the client supplies real data, anonymise it first.
- Create **one demo login per role** with a shared password, and list them in the README and the `## Project` section.
- The seed must be re-runnable: it resets and fills the database.

## Testing (required before any "done")

- `scripts/smoke.mjs`: every route loads for the right role, and the wrong role is refused.
- `scripts/e2e.mjs`: real-browser checks of every acceptance criterion. It prints ✓/✗ per check and exits non-zero on failure.
- Before calling a slice or the build complete, run: typecheck, lint, seed, then smoke and e2e against the running dev server. Show the summary lines.

## Phase 4 — Finish

1. **Full check:** a fresh seed, then all tests green, then a click-through of every persona's main journey with screenshots checked.
2. **README.md:** what the app is, how to install and run it, the demo logins, a feature list by persona, the env variables, and what's stubbed or placeholder.
3. **User manual:** a short illustrated guide per persona, made from real screenshots, exported as a PDF (use the `pdf` skill) into `docs/`.
4. **Final report in chat:** what was built (by epic), test results, what's deferred to later versions, open questions for the client, and the exact command to run it.

---

## Gotchas learned from previous builds

- After a database schema change, **restart the dev server**. The old Prisma client stays cached.
- After a production build (`next build`), clear the dev cache folder (`.next/dev`) and restart dev, or new routes can return 404.
- If pages suddenly return 500 with "worker … child process exceptions", the dev server is in a bad state. Restart it, but only the one you started.
- On Windows, write multi-line scripts to a file and run it. Inline heredocs and nested quotes break easily in the shell.
- Force `colorScheme: "light"` (or test both) in browser checks. Apps that follow the system theme screenshot differently.
- Hide framework dev badges (such as Next.js's `nextjs-portal`) when capturing screenshots for manuals or demos.
- Keep test data deterministic (a fixed "today" date in the seed), so e2e checks don't break as real dates pass.

## PROGRESS.md format (keep it current; it's your memory between sessions)

```markdown
# Progress
Phase: <0–4> · Current slice: <name> · Last updated: <date>
## Done
- [x] Slice 1 — <name> (commit abc123) — e2e: 12/12
## Next
- [ ] Slice 2 — <name>
## Open issues / blockers
## Declined by user (do not re-propose)
## Decisions made without asking (see plan/05_raid.md)
```

## Project

Wedding Diary Bangladesh: WeddingOS V1. The app lives in `app/` (Next.js 16.3 App Router + Prisma 6 + SQLite).

- **Dev:** `cd app && npm run dev`, which serves http://localhost:3210 (ports 3000 and 3001 are used by other apps on this machine).
- **Seed (resets demo data):** `npm run seed`. It runs `prisma db push`, then `prisma/seed.ts`. Prisma blocks `--force-reset` from AI agents, so the seed deletes its own rows instead.
- **Checks:** `npm run typecheck`, `npm run lint`, `npm run smoke` (roles), `npm run e2e` (acceptance criteria; needs a fresh seed). Set `E2E_SHOTS=1` to save screenshots of failures to `../screens/`.
- **Screenshots:** `node scripts/shot.mjs <email|-> <width> /path ...` saves to `../screens/`.
- **Demo logins:** couple@, planner@, family@, live@, vendor@, admin@, new@ (`weddingdiary.test`), password `Diary@2026`. Fixed today = 2026-09-24 (`APP_TODAY`).
- **Demo art:** `python scripts/gen-art.py` regenerates `public/seed/*.jpg` (abstract, no real people).

Gotchas found in this build:
- Git Bash rewrites `/path` arguments into Windows paths. Prefix node script calls with `MSYS_NO_PATHCONV=1`.
- React 19 clears a form bound to an `action` after every submit, including failed ones. `components/ActionForm.tsx` keeps `action` for pre-hydration submits but submits through `onSubmit` + `preventDefault`, so fields survive validation errors.
- E2E must wait for hydration (`networkidle`). Otherwise a click submits the form natively as a GET.
- Uploaded photos go to `app/uploads/` and are served by `/media/[wedding]/[file]`, not from `public/`, so they also work after a production build.
- Badge text is uppercase through CSS, so match text case-insensitively in tests.
