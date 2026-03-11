---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain-skipped', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
date: '2026-03-10'
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-tododoro-2026-03-10.md
  - _bmad-output/planning-artifacts/research/technical-typescript-ecosystem-tododoro-2026-03-10.md
  - _bmad-output/brainstorming/brainstorming-session-2026-03-09T17-13-54.md
briefCount: 1
researchCount: 1
brainstormingCount: 1
projectDocsCount: 0
workflowType: 'prd'
classification:
  projectType: web_app
  domain: personal_productivity
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document — tododoro

**Author:** Tiziano
**Date:** 2026-03-10

## Executive Summary

tododoro is a local-first, Pomodoro-enhanced personal productivity web app built on a single inversion of the conventional productivity model: you don't plan to focus — you focus, then reflect on what it meant. Where every other productivity tool treats tasks as obligations and time as a resource to manage, tododoro treats attention as an act of devotion. It becomes a personal mirror: a record not just of what you completed, but of how much of yourself you gave to each intention.

The app is designed for people who do slow, invisible, non-linear work — makers, researchers, writers, independent builders — exhausted by tools that reward output volume but never acknowledge presence. It is radically local: no accounts, no cloud, no nudges, no scores. The user is the sole authority on their own achievement.

### What Makes This Special

Three things no productivity tool has combined:

1. **Session-first model.** The core entity is the Pomodoro session. Todos are optional labels that sessions belong to — not containers filled with time. Focus comes first; reflection follows. This is an architectural inversion, not a feature.

2. **Two kinds of letting go.** The Release Ritual distinguishes between "completed its purpose" and "was never truly mine." No other productivity tool makes this distinction. Releasing something becomes an act of clarity, not failure.

3. **The Devotion Record.** Every todo accumulates a visual history of every Pomodoro invested across time — not a count, a story. The first time a user sees "11 Pomodoros across 9 days" on something they've been quietly showing up for, no other tool has ever shown them that. That is the aha moment.

The Constellation Canvas replaces lists, tags, and priority fields with a spatial map of intentions. Position is priority — drag a card to the center and that's what matters now. A session starts from the canvas, not a checklist.

### Project Classification

| Attribute | Value |
|---|---|
| **Project Type** | Web App (SPA / PWA) — React + Vite, static deployment, installable |
| **Domain** | Personal Productivity — no regulated compliance requirements |
| **Complexity** | Medium — domain logic (event sourcing, functional aggregates, canvas state) and UX innovation; no external system integrations |
| **Project Context** | Greenfield — new product built from scratch |

## Success Criteria

### User Success

The core signal: a user opens tododoro on Day 8 — not because of a notification, streak, or reminder — but because the canvas is theirs and they want to return to it.

**Qualitative indicators of genuine value:**
- User's canvas has ≤10 cards and none added in the last week — curating, not accumulating
- User has Devotion Records spanning weeks on a single intention — deep, sustained focus is happening
- User sends the app to someone with a personal explanation of *why* — not "it's a Pomodoro app" but something specific to their experience
- User opens the Shelf and reads through it — the mirror is working
- App is used without another Pomodoro timer open elsewhere — the timer is trusted

**Anti-metrics (signals of failure):**
- Users report missing a due date field — the philosophy is not landing
- Users request sub-tasks — wrong user or wrong messaging
- Sessions under 60 seconds spike — the minimum threshold is being gamed or onboarding attracts the wrong audience

### Business Success

tododoro v1 is a personal project with open-source intent. Success means: does the builder ship, learn, and stay philosophically honest?

| Horizon | Objective |
|---|---|
| **3 months** | Working v1 live, deployed, and used by Tiziano daily |
| **6 months** | Open source, shared publicly at least once (HN, blog post, or similar) |
| **12 months** | At least 10 non-Tiziano users using it regularly; at least one has written or said something about *why* |

**The one metric that matters most:** Does Tiziano still use tododoro 6 months after shipping it? A tool its own builder abandons has not solved the problem.

### Technical Success

| KPI | Target | Timeframe |
|---|---|---|
| v1 shipped and self-hosted | ✓ | Month 3 |
| `@tododoro/domain` test coverage | 100% | Before any UI work begins |
| Public release (GitHub + HN) | ✓ | Month 6 |
| GitHub stars | 50+ | Month 12 |
| Unsolicited "why I use this" write-up by a non-builder | 1+ | Month 12 |

**Philosophical integrity guardrails** (non-negotiable — violation means the product has drifted):
- No account system, login, or server-side user data in v1
- No due date, priority field, or sub-task concept in the domain model
- No streaks, scores, or gamification of any kind
- Settings: timer durations + theme toggle only
- Canvas card hard cap (100) is never removed or made configurable
- "Done" is always a user declaration, never a system validation

### Measurable Outcomes

- Canvas load time on first open: < 500ms (cold start)
- Event replay on boot (≤500 events): < 50ms — imperceptible
- Session timer accuracy: within ±1 second of wall-clock across app backgrounding and device wake cycles
- Zero data loss from corrupted event log (repair pipeline handles all 6 documented corruption scenarios)

## Product Scope

### MVP Strategy

tododoro v1 is an *experience MVP*: the minimum that makes the core philosophical model — sessions linked to intentions, devotion witnessed over time — feel real and emotionally true. A version that Tiziano uses daily is the only valid proof of concept.

The canvas, session, and Devotion Record must all be present and feel right. The Shelf and Release Ritual are required because they complete the lifecycle — a product about attention and letting go that has no letting-go mechanism is philosophically incomplete.

**Resource requirements:** Solo developer (Tiziano), building in TypeScript for the first time. Timeline: 3 months to v1. All tooling open source and free. The `@tododoro/domain`-first approach is critical — 100% test coverage before any React means bugs surface in minutes, not weeks.

### MVP Feature Set (Phase 1)

**Core user journeys supported:** all four (Marco's first week, Sofia's slow work, the Release, the edge case).

| Capability | Why it cannot wait |
|---|---|
| Constellation Canvas (drag, zoom, pan) | The entire interaction model — without it, there is no product |
| Todo create / rename / position | Basic data entry onto the canvas |
| Session start, run, complete, abandon | The core loop — no sessions, no devotion |
| Pomodoro timer (analog wipe, configurable) | The time container; must feel right on Day 1 |
| Devotion Record per todo | The aha moment; must be present at v1 |
| Release Ritual (two-state) | Completes the philosophical lifecycle |
| Completion Moment (brief summary on seal) | Honors the act of completion |
| The Shelf (sealed + released todos) | Makes the lifecycle visible over time |
| Local-first event storage (SQLite/WASM) | The entire product premise; no cloud fallback |
| Durable session state + repair pipeline | Data loss is a trust killer |
| Settings (timer durations + theme) | Minimum personalisation; all else is scope creep |
| Zero onboarding (hint dissolves in 3s) | The philosophy starts here |

**Explicitly out of MVP:** PWA service worker, Gravity Signal, Focus Collapse, Living Background, Daily Echo, Retroactive session attribution. Release Eulogy: include if trivial to add after Release Ritual.

### Growth Features (Phase 2 — Month 3–6)

- **PWA manifest + service worker** — installability, full offline mode
- **Focus Collapse** — canvas collapses to single card during active session
- **Living Background** — canvas shifts subtly as timer runs; numbers not needed
- **Release Eulogy** — full Devotion Record surfaced before releasing high-investment todos
- **Gravity Signal** — passive visual weight on frequently-returned-to cards
- **Retroactive session attribution** — attach a completed session to a todo after the fact
- **Full keyboard navigation pass** — accessibility audit and improvements

### Vision (Phase 3 — Month 6+)

- Multi-device sync — CRDT-based, additive, no schema changes (ElectricSQL or equivalent)
- On-device AI insights from personal event log (Transformers.js) — private, no data leaves device
- Export of Devotion Records — Shelf history as a readable archive
- Landing page / marketing site — separate static site, not part of the app bundle

### Risk Mitigation

**Technical risks:**

| Risk | Mitigation |
|---|---|
| Canvas UX fails — spatial model is unfamiliar | Build canvas in isolation first; 10-second usability test before wiring domain |
| TypeScript learning curve slows velocity | Domain-first approach with 100% Vitest coverage; 4–6 week ramp-up budgeted |
| SQLocal WASM build issue in Vite production | JSON localStorage fallback for prototype; pin SQLocal to stable version |
| Event schema breaks backward compatibility | `schemaVersion` + upcasting pipeline enforced in CI from first commit |

**Market risks:**

| Risk | Mitigation |
|---|---|
| Spatial canvas doesn't resonate | Canvas tested standalone; due-date requests are the early warning signal |
| Philosophy doesn't translate on first use | Zero-onboarding hint; "start with what calls to you" — if this fails, messaging is the lever |
| Product attracts wrong audience | No sub-tasks, due dates, or priority fields — enforced at domain level; self-selecting |

**Resource risks:**

| Risk | Mitigation |
|---|---|
| Scope creep | Philosophical integrity guardrails live in the domain package — enforced, not aspirational |
| Month 3 deadline slips | Release Eulogy and Gravity Signal are post-MVP; canvas + session + Devotion Record + Shelf is the hard floor |
| Motivation drops post-ship | Building for yourself is the hedge; the tool its builder uses daily has solved the problem |

## User Journeys

### Journey 1: Marco — The First Week

**Opening scene.** It's a Monday. Marco has 47 items in his todo app, some weeks old. He doesn't know which ones are truly his. He saw a two-sentence description of tododoro on Hacker News — something about "a mirror, not a manager" — and opened it out of low-grade curiosity, not hope.

**First encounter.** The app opens to an empty canvas. A single ambient hint appears — *"Start with what calls to you"* — and dissolves in three seconds. No tutorial. No checklist. No getting-started card. He clicks to add a card and types the name of something he's been quietly wanting to work on for two months. He drags it to the center.

**Rising action.** He starts a session from the card. The analog wipe begins. He works. Twenty-five minutes pass. When the session ends, the card shows a single Pomodoro indicator — small, quiet, there. He adds two more cards he genuinely owns and releases three items from his old tool without migrating them. They weren't his anyway.

**Climax — the aha moment.** By Day 8, the card has 11 Pomodoros across five sessions. He didn't count them. He wasn't tracking. He just kept showing up. The Devotion Record shows a sparse, honest timeline. He screenshots it and sends it to a friend with no caption.

**Resolution.** Marco doesn't use his old todo app anymore — not because tododoro replaced it, but because the canvas has six cards and he actually owns all of them.

*Capabilities revealed: Canvas creation and drag-to-center, session start from canvas, session completion and Pomodoro recording, Devotion Record display, Day 8 return without nudge.*

---

### Journey 2: Sofia — Showing Up for Chapter 4

**Opening scene.** Sofia is six weeks into a chapter with no visible output. Her daily page count is zero. Every productivity app she's tried has shamed her by design — streaks broken, habits missed, no ticks for today.

**The slow accumulation.** She starts using tododoro for "Chapter 4 — methodology." Some days three sessions. Some days she starts a session and closes the laptop after twelve minutes — under 60 seconds of actual work doesn't count. But she came back.

**The divergence.** Six weeks in, she hasn't completed anything. The card is still active. By every traditional productivity metric, nothing has happened. The Devotion Record shows 23 Pomodoros across 18 days — some clustered, some isolated. An honest picture of what it looks like to show up for hard thinking.

**Climax.** She looks at it before starting a new session. 23 Pomodoros. The chapter isn't done. But the devotion is real. The app witnesses it without asking for a completion date.

**Resolution.** Sofia doesn't feel behind. She feels witnessed. The canvas has three cards. She hasn't added anything new because she doesn't need to.

*Capabilities revealed: Long-running active todos, sparse Devotion Record spanning weeks, abandoned sessions (< 60s) not polluting the record, no streak pressure, no completion deadline.*

---

### Journey 3: The Release — Letting Go of Something Real

**Opening scene.** Marco has been working on "Build the CLI tool" for four months — 34 Pomodoros invested. The project no longer feels like his. He keeps dragging the card away from the center. Three weeks, no sessions.

**The decision.** He initiates a release. The app asks: *"Are you releasing this because it no longer matters — or because it was never truly yours?"* It was never truly his — something he thought he should build, not something that came from inside.

**The Release Eulogy.** The app surfaces the full Devotion Record one final time: 34 Pomodoros. 4 months. *"You invested 34 Pomodoros in this. It's okay to let it go."* He releases it.

**Resolution.** On the Shelf, the card sits with a "released" badge and its full history. It didn't disappear. It was honored. Letting it go felt like clarity, not failure.

*Capabilities revealed: Release Ritual (two-state), Release Eulogy threshold (>5 Pomodoros), Shelf view with full history and release badge.*

---

### Journey 4: The Edge Case — The App Closes Mid-Session

**Opening scene.** Marco is 18 minutes into a session. His battery dies. Or the tab crashes.

**The recovery.** The next morning, the app checks the event log: a `SessionStarted` event with no matching `SessionCompleted`, timestamped 14 hours ago — well past the 25-minute window. The app auto-completes the session capped at timer maximum and writes a `SessionCompleted` event. Marco sees the completed session. He didn't lose it.

**The alternative.** He reopens the tab 10 minutes after closing — still within the session window. The timer resumes. The session is durable.

**Resolution.** Neither scenario requires user action. The event log is the source of truth; the wall clock is the authority. The app always opens coherently.

*Capabilities revealed: Durable session state on close/crash, resume-within-window, auto-complete-beyond-window, orphaned session repair pipeline, idempotent event replay on boot.*

---

### Journey Requirements Summary

| Capability Area | Revealed By |
|---|---|
| Canvas creation, drag positioning, session start | Journey 1 |
| Pomodoro recording, Devotion Record display | Journeys 1 & 2 |
| Long-running todos without completion pressure | Journey 2 |
| Abandoned session handling (< 60s threshold) | Journey 2 |
| Release Ritual (two-state), Release Eulogy | Journey 3 |
| Shelf view with release/sealed history | Journey 3 |
| Durable session state, event repair pipeline | Journey 4 |
| Boot-time event replay, tolerant reader | Journey 4 |

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. The Session-First Model — Inverting the Productivity Loop**

Every todo app follows the same model: create a task, then fill it with time. tododoro inverts this. The primary entity is the Pomodoro session. Todos are optional labels that sessions *belong to* — not containers filled with time. Focus comes first; reflection follows. No productivity tool has built around this premise — it is an architectural inversion with philosophical consequences.

**2. The Constellation Canvas — Spatial Position as the Entire Priority System**

The Constellation Canvas eliminates tags, priority fields, urgency levels, and sorting logic with a single spatial metaphor: where a card sits on the canvas *is* its priority. Drag to center = now. Drift to edge = later. The closest analogues are diagramming tools (Miro, FigJam) — not todo apps. The innovation is the deliberate *removal* of the entire priority metadata layer, replaced by physical gesture.

**3. Two Kinds of Letting Go — Emotional Distinction at the Domain Level**

The Release Ritual distinguishes between "completed its purpose" and "was never truly mine." No other productivity tool — not Todoist, Things, OmniFocus, TickTick, nor any Pomodoro app — has made this distinction. Archiving has always been binary: done or deleted. Honoring the distinction in the data model changes the user's relationship to non-completion.

**4. WebAssembly SQLite for Local-First Event Storage**

The persistence layer (SQLocal + wa-sqlite via OPFS) runs full SQLite in the browser via WebAssembly — no server, no cloud, no account. The event log is append-only, stored locally, with a repair pipeline for corruption, orphaned sessions, and schema migration. This is the emerging standard for offline-first apps (Figma, Linear, Excalidraw) but genuinely novel in personal productivity tooling — most "local-first" apps in this space are localStorage key-value stores.

### Market Context & Competitive Landscape

The productivity tool market splits into two camps tododoro rejects:

- **Task managers** (Todoist, Things, OmniFocus): Obligation-centric. Tasks have due dates, priorities, sub-tasks. Completion is a checkbox. Time is invisible.
- **Pomodoro apps** (Forest, Be Focused, Tomato Timer): Time-centric. Sessions are counted. Tasks are optional context. Devotion is invisible.

No existing product connects *time invested* to *personal meaning*. The closest philosophical neighbour is the Bullet Journal method (analog) — a large following built on treating intentions as personal commitments rather than obligations. tododoro is its digital, session-tracked, event-sourced expression.

The innovation gap: no tool answers *"What have I truly shown up for?"* — not in a count, but in a story.

### Validation Approach

The Constellation Canvas is the highest-risk innovation — a significant departure from every UX convention in personal productivity.

1. **Build canvas in isolation first** — 5 hardcoded mock cards; validate zoom/pan/drag/collapse before wiring domain logic
2. **The 10-second test** — someone opens the app with zero instructions and knows what to do within 10 seconds; failure means the canvas model has failed
3. **The aha moment test** — the Devotion Record must produce an emotional response on first encounter; "oh, it counts Pomodoros" means the framing has failed
4. **The anti-metric test** — due date requests from early users indicate wrong audience; messaging, not product, is the lever

## Web App Requirements

### Platform Overview

tododoro is a **Single Page Application (SPA)** with **Progressive Web App (PWA)** capabilities — fully client-side, no server, no API, no backend. All computation and storage happen in the user's browser. Deployed as a static bundle to a CDN (Vercel), functional entirely offline after initial load.

Stack: React 19 + Vite 7, client-side only. No SSR — no public content to index, no SEO surface, no authenticated server sessions. PWA manifest + service worker (`vite-plugin-pwa`) is planned post-MVP but architecturally accounted for from Day 1.

### Browser Support

| Browser | Support Level | Notes |
|---|---|---|
| Chrome / Edge (v109+) | Full | OPFS + WASM fully supported |
| Firefox (v111+) | Full | OPFS + WASM fully supported |
| Safari (v16.4+) | Full | OPFS support added March 2023 |
| Mobile Chrome / Safari | Full | PWA installable on iOS 16.4+ and Android |
| Legacy browsers (< 2022) | Not supported | OPFS/WASM is a hard requirement |

The OPFS requirement sets a natural browser floor at 2022–2023 vintage — acceptable given the target audience.

### Responsive Design

tododoro is **desktop-first**. The Constellation Canvas is designed for pointer input (mouse/trackpad). Mobile phones are out of scope for v1 — the canvas model does not translate to small screens.

| Breakpoint | Support | Notes |
|---|---|---|
| Desktop (≥1024px) | Primary | Full canvas experience |
| Tablet (768–1023px) | Secondary | Touch drag supported via React Flow |
| Mobile (< 768px) | Not supported in v1 | Excluded intentionally |

### Implementation Constraints

- **Cross-Origin Isolation headers required** — SQLocal (WASM SQLite) requires `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` in both `vite.config.ts` and `vercel.json`
- **Web Worker for SQLite** — SQLocal runs the SQLite engine off the main thread; canvas interactions remain smooth during event writes
- **No external calls** — no fetch, no WebSocket, no analytics, no telemetry; CSP is maximally restrictive
- **No SEO** — the app is a tool, not a content surface; no indexing needed or desired

## Functional Requirements

### Canvas & Spatial Navigation

- **FR1:** User can create a new todo card on the canvas
- **FR2:** User can freely position todo cards on the canvas using drag-and-drop
- **FR3:** User can zoom in and out of the canvas to view all cards or focus on a single card
- **FR4:** User can pan across the canvas in any direction
- **FR5:** The system enforces a maximum of 100 simultaneously active todo cards on the canvas
- **FR6:** User can operate canvas card creation, session start, todo seal, todo release, and settings controls using keyboard navigation alone, with visible focus indicators

### Todo Lifecycle Management

- **FR7:** User can assign and update a title for any todo card
- **FR8:** User can declare a todo complete (seal it)
- **FR9:** User can release a todo by choosing between two explicit release reasons: "completed its purpose" or "was never truly mine"
- **FR10:** User can view the todo's full Devotion Record surfaced one final time before releasing a card with more than 5 Pomodoros invested
- **FR11:** The system preserves the complete Pomodoro history of a todo when its title is renamed
- **FR12:** The app presents an empty canvas on first launch with no required setup steps or account creation

### Session & Timer Management

- **FR13:** User can start a Pomodoro session linked to a specific todo card
- **FR14:** User can start a Pomodoro session without linking it to a todo (Exploration session)
- **FR15:** User can attach a completed Exploration session to an existing todo or leave it as an unlinked record
- **FR16:** The timer runs for a user-configured duration and signals completion
- **FR17:** Sessions shorter than 60 seconds are automatically abandoned and do not contribute to any Devotion Record
- **FR18:** Only one Pomodoro session can be active at any given time
- **FR19:** An active session resumes automatically if the app is reopened while the session window has not yet elapsed
- **FR20:** An active session is automatically completed with the configured duration if the app is reopened after the session window has elapsed

### Devotion Record & Completion

- **FR21:** User can view the Devotion Record for any active todo — a timeline of all Pomodoros invested across dates
- **FR22:** The system displays a Completion Moment when a todo is sealed, summarising the total investment before archiving
- **FR23:** The Devotion Record reflects all sessions accumulated across the full lifetime of the todo, regardless of title changes

### Shelf & Archive

- **FR24:** User can view the Shelf — a persistent collection of all sealed and released todos
- **FR25:** Each Shelf entry displays the todo's Devotion Record, full lifecycle history, and its sealed or released status
- **FR26:** Sealed and released todos display distinct visual badges in the Shelf view

### Event Storage & Data Integrity

- **FR27:** All app state is stored locally on the user's device; no data is transmitted to any external server or service
- **FR28:** The app opens in a usable state even when the event log is partially corrupted or incomplete, with no crash or unrecoverable error screen
- **FR29:** Duplicate events in the event log are deduplicated automatically during replay
- **FR30:** Unknown event types in the event log are skipped without error during replay
- **FR31:** The app supports schema migration of stored events across future versions without data loss

### Settings & Personalisation

- **FR32:** User can configure timer durations independently for work sessions, short breaks, and long breaks
- **FR33:** User can switch between light, dark, and system-default colour themes
- **FR34:** The app honours the user's OS-level reduced motion preference for all animations

## Non-Functional Requirements

### Performance

- **NFR1:** Canvas renders at a sustained 60fps during drag, pan, and zoom on modern desktop hardware
- **NFR2:** First Contentful Paint < 1.5 seconds on standard broadband (static CDN bundle, no server round-trip)
- **NFR3:** Time to interactive (canvas fully loaded and responsive) < 2 seconds on first load
- **NFR4:** Event log replay on boot completes in < 50ms for logs up to 500 events
- **NFR5:** Event log replay completes in < 200ms for logs up to 5,000 events (snapshot-based replay applies at this threshold)
- **NFR6:** Session timer accuracy remains within ±1 second of wall-clock time across app backgrounding, device sleep, and wake cycles
- **NFR7:** All user-initiated actions (create card, start session, seal todo) produce visible feedback within 100ms

### Reliability & Data Integrity

- **NFR8:** The app opens in a usable state 100% of the time regardless of event log state (corruption, truncation, orphaned sessions) — canvas renders, no crash or unrecoverable error screen, and session state is recoverable via the repair pipeline
- **NFR9:** No user data is silently lost — every unrecoverable state is handled by the repair pipeline with a deterministic fallback (orphaned sessions auto-completed; corrupted segments skipped from last valid event)
- **NFR10:** Event writes are atomic — a `SessionStarted` event is persisted before the timer begins; no in-memory-only timer state exists
- **NFR11:** All stored events carry a `schemaVersion` field; the app successfully replays events written by any previous version of itself

### Security

- **NFR12:** No user data is transmitted to any external server, analytics service, or third-party API at any time
- **NFR13:** The app is deployed with a Content Security Policy that blocks all inline scripts, inline styles, and external resource loads not explicitly allowlisted
- **NFR14:** User data storage is sandboxed per browser origin and inaccessible to other web origins by browser enforcement
- **NFR15:** The app renders no unsanitized user-controlled HTML content; all output passes through the framework's built-in XSS output escaping

### Accessibility

- **NFR16:** All interactive controls (canvas cards, session start, seal, release, settings) are operable via keyboard alone, with visible focus indicators
- **NFR17:** All text elements meet WCAG 2.1 Level AA colour contrast ratio (4.5:1 minimum) in both light and dark themes
- **NFR18:** No animations or motion effects trigger when the user's OS-level `prefers-reduced-motion` preference is set
- **NFR19:** All canvas node components expose meaningful accessible names (`aria-label`) consumable by screen readers

### Maintainability

- **NFR20:** `@tododoro/domain` maintains 100% test coverage (lines, functions, branches) as a CI gate — no UI work begins until this gate passes
- **NFR21:** The domain package has zero production dependencies — pure TypeScript, no framework, storage, or runtime dependencies
- **NFR22:** TypeScript `strict` mode, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` are enabled across all packages from the first commit and never disabled
- **NFR23:** All inter-package dependency directions are acyclic and enforced at compile time via TypeScript project references — circular imports fail the build
