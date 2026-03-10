---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: 'complete'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
---

# tododoro - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for tododoro, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: User can create a new todo card on the canvas
FR2: User can freely position todo cards on the canvas using drag-and-drop
FR3: User can zoom in and out of the canvas to view all cards or focus on a single card
FR4: User can pan across the canvas in any direction
FR5: The system enforces a maximum of 100 simultaneously active todo cards on the canvas
FR6: User can operate canvas card creation, session start, todo seal, todo release, and settings controls using keyboard navigation alone, with visible focus indicators
FR7: User can assign and update a title for any todo card
FR8: User can declare a todo complete (seal it)
FR9: User can release a todo by choosing between two explicit release reasons: "completed its purpose" or "was never truly mine"
FR10: User sees the todo's full Devotion Record surfaced one final time before releasing a card with more than 5 Pomodoros invested
FR11: The system preserves the complete Pomodoro history of a todo when its title is renamed
FR12: The app presents an empty canvas on first launch with no required setup steps or account creation
FR13: User can start a Pomodoro session linked to a specific todo card
FR14: User can start a Pomodoro session without linking it to a todo (Exploration session)
FR15: User can attach a completed Exploration session to an existing todo or leave it as an unlinked record
FR16: The timer runs for a user-configured duration and signals completion
FR17: Sessions shorter than 60 seconds are automatically abandoned and do not contribute to any Devotion Record
FR18: Only one Pomodoro session can be active at any given time
FR19: An active session resumes automatically if the app is reopened while the session window has not yet elapsed
FR20: An active session is automatically completed with the configured duration if the app is reopened after the session window has elapsed
FR21: User can view the Devotion Record for any active todo — a timeline of all Pomodoros invested across dates
FR22: The system displays a Completion Moment when a todo is sealed, summarising the total investment before archiving
FR23: The Devotion Record reflects all sessions accumulated across the full lifetime of the todo, regardless of title changes
FR24: User can view the Shelf — a persistent collection of all sealed and released todos
FR25: Each Shelf entry displays the todo's Devotion Record, full lifecycle history, and its sealed or released status
FR26: Sealed and released todos display distinct visual badges in the Shelf view
FR27: All app state is stored locally on the user's device; no data is transmitted to any external server or service
FR28: The app opens in a usable state even when the event log is partially corrupted or incomplete, with no crash or unrecoverable error screen
FR29: Duplicate events in the event log are deduplicated automatically during replay
FR30: Unknown event types in the event log are skipped without error during replay
FR31: The app supports schema migration of stored events across future versions without data loss
FR32: User can configure timer durations independently for work sessions, short breaks, and long breaks
FR33: User can switch between light, dark, and system-default colour themes
FR34: The app honours the user's OS-level reduced motion preference for all animations

### NonFunctional Requirements

NFR1: Canvas renders at a sustained 60fps during drag, pan, and zoom on modern desktop hardware
NFR2: First Contentful Paint < 1.5 seconds on standard broadband (static CDN bundle, no server round-trip)
NFR3: Time to interactive (canvas fully loaded and responsive) < 2 seconds on first load
NFR4: Event log replay on boot completes in < 50ms for logs up to 500 events
NFR5: Event log replay completes in < 200ms for logs up to 5,000 events (snapshot-based replay applies at this threshold)
NFR6: Session timer accuracy remains within ±1 second of wall-clock time across app backgrounding, device sleep, and wake cycles
NFR7: All user-initiated actions (create card, start session, seal todo) produce visible feedback within 100ms
NFR8: The app opens in a coherent, usable state 100% of the time regardless of event log state (corruption, truncation, orphaned sessions)
NFR9: No user data is silently lost — every unrecoverable state is handled by the repair pipeline with a deterministic fallback (orphaned sessions auto-completed; corrupted segments skipped from last valid event)
NFR10: Event writes are atomic — a SessionStarted event is persisted before the timer begins; no in-memory-only timer state exists
NFR11: All stored events carry a schemaVersion field; the app successfully replays events written by any previous version of itself
NFR12: No user data is transmitted to any external server, analytics service, or third-party API at any time
NFR13: The app is deployed with a Content Security Policy that blocks all inline scripts, inline styles, and external resource loads not explicitly allowlisted
NFR14: User data storage is sandboxed per browser origin and inaccessible to other web origins by browser enforcement
NFR15: The app renders no unsanitized user-controlled HTML content; all output passes through the framework's built-in XSS output escaping
NFR16: All interactive controls (canvas cards, session start, seal, release, settings) are operable via keyboard alone, with visible focus indicators
NFR17: All text elements meet WCAG 2.1 Level AA colour contrast ratio (4.5:1 minimum) in both light and dark themes
NFR18: No animations or motion effects trigger when the user's OS-level prefers-reduced-motion preference is set
NFR19: All canvas node components expose meaningful accessible names (aria-label) consumable by screen readers
NFR20: @tododoro/domain maintains 100% test coverage (lines, functions, branches) as a CI gate — no UI work begins until this gate passes
NFR21: The domain package has zero production dependencies — pure TypeScript, no framework, storage, or runtime dependencies
NFR22: TypeScript strict mode, noUncheckedIndexedAccess, and exactOptionalPropertyTypes are enabled across all packages from the first commit and never disabled
NFR23: All inter-package dependency directions are acyclic and enforced at compile time via TypeScript project references — circular imports fail the build

### Additional Requirements

**From Architecture:**

- **Starter Template**: Initialize with `pnpm dlx create-turbo@latest tododoro -e with-vite --package-manager pnpm`; rename packages to `domain`, `storage`, `ui`; add TypeScript strict flags (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) to all `tsconfig.json`; add Cross-Origin Isolation headers to `vite.config.ts` and `vercel.json` before any domain code is written
- Monorepo structure with four packages: `@tododoro/domain` (zero production deps), `@tododoro/storage`, `@tododoro/ui`, `apps/web`
- Cross-Origin Isolation headers (`COEP: require-corp` + `COOP: same-origin`) required in both `vite.config.ts` and `vercel.json`; must be verified before any SQLocal initialization
- SQLocal runs SQLite in a Web Worker via OPFS (off main thread); canvas interactions must not block on event writes
- `schemaVersion` field on every domain event from the very first commit; upcasting pipeline in place before any events are persisted
- TypeScript project references enforce acyclic compilation graph from first commit; domain imports nothing; others only import downward
- CI gate order: `pnpm install --frozen-lockfile` → `turbo typecheck` → `turbo test --filter=@tododoro/domain` (100% coverage — HARD BLOCK) → `turbo test` → `turbo build` → Vercel deploy (main branch only)
- Two Zustand stores: `useCanvasStore` (owns TodoListReadModel + ShelfReadModel + DevotionRecordReadModel + settings + isBooting) and `useSessionStore` (owns ActiveSessionReadModel + rAF tick)
- Event naming convention: `PascalCase` past-participle, e.g. `TodoDeclared`, `TodoRenamed`, `TodoPositioned`, `TodoSealed`, `TodoReleased`, `SessionStarted`, `SessionCompleted`, `SessionAbandoned`
- Snapshot threshold at 500 events using `SnapshotCreatedEvent`; stored in the same `events` table; boot loads snapshot + events after snapshot's `seq`
- No router library; Shelf as React state drawer (`isShelfOpen: boolean`); Settings as Radix Dialog
- Boot sequence in `main.tsx`: `readAll() → repairEvents() → projectTodoList() → projectShelf() → projectDevotionRecord() → projectActiveSession() → bootstrap() → render`; runs before React tree renders
- CSP directives: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'`; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data:`; `connect-src 'none'`; `frame-src 'none'`; `worker-src 'self' blob:`
- `PRODUCT_PHILOSOPHY.md` at repo root documenting non-negotiable constraints for contributors and AI agents
- PWA: `manifest.json` placeholder at `public/manifest.json` from day one; `vite-plugin-pwa` activation deferred to Phase 2
- All domain errors returned as values (`Error | DomainEvent`), never thrown; root `ErrorBoundary` is last-resort for unexpected React rendering failures only
- Canvas drag → `TodoPositioned` event: debounced 200ms before writing
- `Clock` port: `interface Clock { now(): number }` in `ports.ts`; `SystemClock` adapter in `apps/web`; `FakeClock` in domain test utilities
- Exploration session UI entry point: fixed-position canvas affordance outside any card; calls `sessionCommands.handleStartSession(null, eventStore)`
- Four read models, each a pure projection `(state, event) => newState`: `TodoListReadModel`, `DevotionRecordReadModel`, `ShelfReadModel`, `ActiveSessionReadModel`
- Command handler pattern: async, returns `Result` union, never throws; reads events → reduces state → calls decision fn → appends → updates store

**From UX Design:**

- Desktop-first; tablet (768–1023px) secondary with touch drag support; mobile (< 768px) excluded from v1
- Dark mode as default (Midnight Canvas direction); light mode via `prefers-color-scheme` + manual override (Fog Light direction); all colour tokens as CSS custom properties on `:root` and `[data-theme="light"]`; no hardcoded hex/hsl values in components
- Zero-onboarding: single centred italic ambient hint "Start with what calls to you", CSS fade-out at 3 seconds, removed from DOM after; no animation if `prefers-reduced-motion` is set
- Analog wipe timer: circular SVG `stroke-dashoffset` animation; `role="timer"` with `aria-live="off"` during session; on completion `aria-live="assertive"` once; respects `prefers-reduced-motion` (static bar fallback)
- Completion Moment: Radix Dialog without backdrop; auto-dismisses ~3s or any interaction; 1–2 lines max; past-tense copy; no congratulatory language
- Release Ritual: Radix Dialog; two large distinct buttons; Escape cancels; no explicit cancel button visible
- Release Eulogy: full DevotionRecord + "You invested N Pomodoros. It's okay to let it go." + Continue button; precedes Release Ritual
- Shelf: Radix Sheet (right drawer); canvas remains visible behind it; `aria-label="Shelf"`
- DevotionDots: row of 6px amber dots on card; filled = invested Pomodoro, dim = empty slot; `aria-label="N Pomodoros invested"`
- All touch targets: `min-w-[44px] min-h-[44px]`; `@media (hover: none)` — card action affordances always visible on touch
- Semantic HTML throughout: `<nav>`, `<main>`, `<aside>` (Shelf), `<dialog>` for overlays
- No global primary CTA; canvas is the call to action; global action button is a philosophical violation
- No success toasts, no "Saved!" indicators, no loading spinners on user-initiated actions; only ceremony (Completion Moment) or silence
- Focus rings: 2px solid `--session-active`, 2px offset, `:focus-visible` only (hidden for mouse, always for keyboard)
- Canvas pan convention: space+drag or middle-mouse-drag to pan; scrollwheel to zoom (Figma mental model)
- Peripheral UI (Shelf icon, Settings icon): fixed canvas corners, icon only, ~35% opacity
- Canvas card interactions: `aria-label="[title], N Pomodoros invested, [state]"` on all React Flow nodes; skip-to-canvas link for keyboard users

### FR Coverage Map

| FR | Epic | Description |
|---|---|---|
| FR1 | Epic 2 | Create todo card on canvas |
| FR2 | Epic 2 | Drag-and-drop card positioning |
| FR3 | Epic 2 | Zoom in/out canvas |
| FR4 | Epic 2 | Pan canvas in any direction |
| FR5 | Epic 2 | 100-card hard cap enforcement |
| FR6 | Epic 2 | Keyboard navigation for all primary controls |
| FR7 | Epic 2 | Assign and update card title |
| FR8 | Epic 5 | Seal a todo (declare complete) |
| FR9 | Epic 5 | Two-state release ritual |
| FR10 | Epic 5 | Release Eulogy for >5 Pomodoros |
| FR11 | Epic 4 | History preserved across title renames |
| FR12 | Epic 2 | Empty canvas on first launch; zero onboarding |
| FR13 | Epic 3 | Start session linked to a card |
| FR14 | Epic 3 | Start unlinked Exploration session |
| FR15 | Epic 3 | Attribute Exploration session after completion |
| FR16 | Epic 3 | Configurable timer duration + completion signal |
| FR17 | Epic 3 | Auto-abandon sessions < 60 seconds |
| FR18 | Epic 3 | Only one active session at a time |
| FR19 | Epic 3 | Session resumes if app reopened within window |
| FR20 | Epic 3 | Session auto-completes if reopened past window |
| FR21 | Epic 4 | View Devotion Record timeline per todo |
| FR22 | Epic 4 | Completion Moment on todo seal |
| FR23 | Epic 4 | Devotion Record stable across title renames |
| FR24 | Epic 5 | View the Shelf (sealed + released todos) |
| FR25 | Epic 5 | Shelf entry shows Devotion Record + lifecycle history |
| FR26 | Epic 5 | Distinct sealed/released visual badges in Shelf |
| FR27 | Epic 6 | All state stored locally; nothing transmitted externally |
| FR28 | Epic 6 | Coherent boot from partial/corrupted event log |
| FR29 | Epic 6 | Duplicate event deduplication on replay |
| FR30 | Epic 6 | Unknown event types skipped gracefully |
| FR31 | Epic 6 | Schema migration across future versions |
| FR32 | Epic 7 | Configure timer durations independently |
| FR33 | Epic 7 | Light / dark / system theme switching |
| FR34 | Epic 7 | Honour OS reduced-motion preference |

## Epic List

### Epic 1: Project Foundation & Domain Core
Users can trust that the entire domain model — all events, aggregates, projections, and repair pipeline — is correct, fully tested, and CI-gated before any UI is written. The monorepo is scaffolded, TypeScript strict mode is enforced across all packages, and the JsonEventStore prototype is wired so the app can run. This epic enables all others.
**FRs covered:** Domain logic for FR17, FR19, FR20, FR27 (JsonEventStore prototype), FR29, FR30, FR31
**NFRs covered:** NFR20, NFR21, NFR22, NFR23

### Epic 2: The Constellation Canvas
Users can open the app to an empty canvas, create todo cards, position them spatially to declare priorities, rename them, and navigate with zoom and pan. The zero-onboarding hint dissolves in 3 seconds. The spatial model is usable within 10 seconds.
**FRs covered:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR12
**NFRs covered:** NFR1, NFR2, NFR3, NFR7, NFR16, NFR19

### Epic 3: The Pomodoro Session Loop
Users can start a focused Pomodoro session linked to a canvas card (or unlinked as an Exploration session), watch the analog wipe timer run, have the session complete automatically, see the first Devotion dot appear, and have sessions survive app closures and crashes.
**FRs covered:** FR13, FR14, FR15, FR16, FR17, FR18, FR19, FR20
**NFRs covered:** NFR6, NFR7, NFR8, NFR10

### Epic 4: The Devotion Record
Users can witness their accumulated presence — DevotionDots on cards communicate investment at a glance, the full Devotion Record timeline tells the story of when they showed up, and session history survives todo renames. The aha moment is real.
**FRs covered:** FR11, FR21, FR22, FR23
**NFRs covered:** NFR7

### Epic 5: Todo Lifecycle & The Shelf
Users can complete the full lifecycle of an intention — seal a todo with a Completion Moment ceremony, release it with honest two-state clarity (with Release Eulogy when high-investment), and revisit the full personal archive in the Shelf with distinct sealed/released badges.
**FRs covered:** FR8, FR9, FR10, FR24, FR25, FR26
**NFRs covered:** NFR7

### Epic 6: Production Storage & Data Durability
Users can trust their data completely — all state lives in a local SQLite database via OPFS and WASM, the app always opens coherently regardless of event log state, data survives crashes and future app versions, and security headers are production-grade.
**FRs covered:** FR27, FR28, FR29, FR30, FR31
**NFRs covered:** NFR4, NFR5, NFR8, NFR9, NFR10, NFR11, NFR12, NFR13, NFR14, NFR15

### Epic 7: Settings & Personalisation
Users can configure timer durations to their rhythm, switch between light/dark/system themes, and trust the app honours their OS reduced-motion preference across all animations.
**FRs covered:** FR32, FR33, FR34
**NFRs covered:** NFR18

---

## Epic 1: Project Foundation & Domain Core

A fully configured monorepo with the complete domain model — all events, aggregates, projections, and repair pipeline — covered at 100% and CI-gated. The JsonEventStore prototype is wired so the app can run end-to-end. This epic enables all others.

### Story 1.1: Scaffold Monorepo & Configure Tooling

As a developer,
I want the monorepo scaffolded with Turborepo and all packages configured with strict TypeScript, security headers, and baseline tooling,
So that all subsequent domain, storage, and UI work has a consistent, enforced foundation to build on.

**Acceptance Criteria:**

**Given** a fresh environment with pnpm installed
**When** `pnpm dlx create-turbo@latest tododoro -e with-vite --package-manager pnpm` is run and packages are renamed to `domain`, `storage`, `ui`
**Then** `pnpm dev` starts all packages in watch mode without errors
**And** `pnpm turbo typecheck` passes with zero TypeScript errors across all packages
**And** all `tsconfig.json` files have `strict: true`, `noUncheckedIndexedAccess: true`, and `exactOptionalPropertyTypes: true` enabled
**And** `vite.config.ts` and `vercel.json` include `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` headers
**And** `apps/web/public/manifest.json` exists as a PWA placeholder with correct `name`, `short_name`, `theme_color`, `background_color`, and `icons` fields
**And** `PRODUCT_PHILOSOPHY.md` exists at repo root documenting the non-negotiable constraints (no due dates, no priorities, no sub-tasks, no accounts, no gamification)
**And** `pnpm-workspace.yaml` configures `apps/*` and `packages/*` workspaces

---

### Story 1.2: Define Domain Event Types and Port Interfaces

As a developer,
I want all domain event types and port interfaces defined in `@tododoro/domain`,
So that every other package has a stable, versioned type contract to build against from the first line of implementation code.

**Acceptance Criteria:**

**Given** the monorepo is scaffolded (Story 1.1)
**When** `packages/domain/src/events.ts` and `packages/domain/src/ports.ts` are created
**Then** `events.ts` exports a `DomainEvent` discriminated union containing: `TodoDeclaredEvent`, `TodoRenamedEvent`, `TodoPositionedEvent`, `TodoSealedEvent`, `TodoReleasedEvent`, `SessionStartedEvent`, `SessionCompletedEvent`, `SessionAbandonedEvent`, `SnapshotCreatedEvent`
**And** every event interface includes `schemaVersion: number`, `eventId: string`, `aggregateId: string`, and `timestamp: number` (milliseconds since epoch); all duration fields use the `Ms` suffix (e.g. `configuredDurationMs`)
**And** `ports.ts` exports `EventStore`, `Clock` (`{ now(): number }`), and `IdGenerator` (`{ generate(): string }`) interfaces
**And** `packages/domain/src/index.ts` re-exports all public types
**And** `@tododoro/domain` has zero production dependencies
**And** `pnpm turbo typecheck` passes with zero errors

---

### Story 1.3: Implement Todo Aggregate with Full Test Coverage

As a developer,
I want the Todo aggregate (reducer + all decision functions) implemented with 100% test coverage,
So that all todo lifecycle business rules are correct and enforced before any UI is written.

**Acceptance Criteria:**

**Given** domain event types and ports are defined (Story 1.2)
**When** `packages/domain/src/todo.ts` and `packages/domain/src/todo.test.ts` are created
**Then** `todo.ts` exports `TodoState`, `reduceTodo`, `declareTodo`, `renameTodo`, `positionTodo`, `sealTodo`, and `releaseTodo`
**And** all decision functions are pure: `(state, input) => DomainEvent | Error`; never throw; never call `Date.now()` directly (use the `Clock` port)
**And** `releaseTodo` requires a `reason: 'completed_its_purpose' | 'was_never_truly_mine'` parameter
**And** invalid transitions return `Error` values (e.g. sealing a nonexistent todo, releasing an already-sealed todo, declaring a todo when the 100-card cap is reached)
**And** `pnpm turbo test --filter=@tododoro/domain` reports 100% line, function, and branch coverage for `todo.ts`

---

### Story 1.4: Implement Session Aggregate with Full Test Coverage

As a developer,
I want the Session aggregate (reducer + decision functions) implemented with 100% test coverage,
So that the 60-second abandonment threshold, Exploration sessions, and all session state transitions are correctly modeled.

**Acceptance Criteria:**

**Given** domain event types and ports are defined (Story 1.2)
**When** `packages/domain/src/session.ts` and `packages/domain/src/session.test.ts` are created
**Then** `session.ts` exports `SessionState`, `reduceSession`, `startSession`, `completeSession`, and `abandonSession`
**And** `startSession` accepts `todoId: string | null` (null for Exploration sessions)
**And** only one session can be active at a time — `startSession` returns `Error` if a session is already active
**And** sessions under 60 seconds produce `SessionAbandonedEvent`; sessions ≥ 60 seconds can be completed with `SessionCompletedEvent`
**And** all decision functions are pure, return `DomainEvent | Error`, never throw, and use the `Clock` port
**And** `pnpm turbo test --filter=@tododoro/domain` reports 100% coverage for `session.ts`

---

### Story 1.5: Implement Read Model Projections with Full Test Coverage

As a developer,
I want all four read model projections implemented with 100% test coverage,
So that each UI surface has its precise data shape derived correctly and predictably from the event log.

**Acceptance Criteria:**

**Given** todo and session aggregates are implemented (Stories 1.3 and 1.4)
**When** `packages/domain/src/projections/` contains `todoList.ts`, `devotionRecord.ts`, `shelf.ts`, and `activeSession.ts`
**Then** `projectTodoList` produces `TodoListReadModel` with `id`, `title`, `position {x, y}`, `pomodoroCount`, and `status` per active todo
**And** `projectDevotionRecord` produces `DevotionRecordReadModel` with a session timeline (date + duration) per todo
**And** `projectShelf` produces `ShelfReadModel` of sealed and released todos with full history and `releaseReason`
**And** `projectActiveSession` produces `ActiveSessionReadModel` with `sessionId`, `todoId | null`, `startedAt`, `configuredDurationMs`, and `status`
**And** all projections are pure functions: `(currentState, event) => newState`; zero side effects
**And** `pnpm turbo test --filter=@tododoro/domain` reports 100% coverage for all four projection files

---

### Story 1.6: Implement Repair Pipeline with Full Test Coverage

As a developer,
I want the repair pipeline implemented with 100% test coverage covering all documented corruption scenarios,
So that the app always boots coherently regardless of what is in the event log.

**Acceptance Criteria:**

**Given** all aggregates and projections are implemented (Stories 1.3–1.5)
**When** `packages/domain/src/repair.ts` and `packages/domain/src/repair.test.ts` are created
**Then** `repairEvents` composes: `deduplicateByEventId`, `upcastEvents`, `skipUnknownEventTypes`, and `autoCloseOrphanedSessions`
**And** `deduplicateByEventId` removes exact duplicate events by `eventId`, keeping the first occurrence
**And** `upcastEvents` upgrades events from older `schemaVersion` values to the current schema without data loss
**And** `skipUnknownEventTypes` silently drops events with unrecognised `eventType` strings and passes through all known types
**And** `autoCloseOrphanedSessions` detects `SessionStartedEvent` with no matching completion; if wall-clock elapsed time exceeds `configuredDurationMs`, synthesizes a `SessionCompletedEvent` capped at the configured duration; if within the window, leaves the session open for the UI to resume
**And** `repair.test.ts` covers all 6 corruption scenarios: duplicate events, unknown event types, orphaned session within window, orphaned session past window, truncated log, mismatched schemaVersion
**And** `pnpm turbo test --filter=@tododoro/domain` reports 100% coverage for `repair.ts`

---

### Story 1.7: Wire CI Pipeline, Snapshot Design, and Prototype Storage

As a developer,
I want the CI pipeline configured with the domain coverage hard-gate, snapshot logic present in the domain, and the JsonEventStore prototype wired so the app runs end-to-end,
So that no downstream work can proceed without 100% domain coverage and the complete boot sequence is validated.

**Acceptance Criteria:**

**Given** all domain code is implemented with 100% coverage (Stories 1.2–1.6)
**When** `.github/workflows/ci.yml`, `packages/storage/src/JsonEventStore.ts`, and the `apps/web/src/main.tsx` boot sequence are created
**Then** the CI pipeline runs: `pnpm install --frozen-lockfile` → `turbo typecheck` → `turbo test --filter=@tododoro/domain` (coverage gate: lines/functions/branches = 100 — HARD BLOCK) → `turbo test` → `turbo build` → Vercel deploy on main branch push
**And** `SnapshotCreatedEvent` exists in the domain with a 500-event threshold; projection functions accept an optional snapshot state for partial replay
**And** `JsonEventStore` implements the `EventStore` port using `localStorage` as a JSON append-only log
**And** `JsonEventStore.test.ts` covers `append`, `readAll`, and `readByAggregate`
**And** `apps/web/src/main.tsx` boot sequence runs: `readAll() → repairEvents() → projectTodoList() → projectShelf() → projectDevotionRecord() → projectActiveSession() → bootstrap()` before rendering the React tree
**And** `pnpm turbo build` produces a clean production bundle with no TypeScript errors

---

## Epic 2: The Constellation Canvas

Users can open the app to an empty canvas, create todo cards, position them spatially to declare priorities, rename them, and navigate with zoom and pan. The zero-onboarding hint dissolves in 3 seconds. The spatial model is usable within 10 seconds.

### Story 2.1: App Shell, Design Tokens, and Canvas Scaffold

As a user,
I want to open tododoro and see a full-viewport canvas with the correct visual identity,
So that the spatial model is established from the very first moment and the app feels intentional and considered.

**Acceptance Criteria:**

**Given** the monorepo foundation is in place (Epic 1)
**When** the app is opened in a modern browser
**Then** the viewport is filled entirely by the canvas — no top navigation bar, no sidebar, no persistent UI rails
**And** the dark (Midnight Canvas) theme is applied by default: `--canvas-bg: hsl(220, 18%, 8%)`, `--surface: hsl(220, 14%, 13%)`, `--devotion: hsl(38, 80%, 58%)`, `--session-active: hsl(210, 60%, 65%)`, `--text-primary: hsl(220, 10%, 88%)`
**And** all colour tokens are defined as CSS custom properties on `:root` in `apps/web/src/index.css`; no hardcoded hex or hsl values appear in component files
**And** React Flow is initialised as `ConstellationCanvas` with pan, zoom, and an empty node set
**And** `useCanvasStore` is initialised with `isBooting: false` after the boot sequence completes
**And** First Contentful Paint is under 1.5 seconds on standard broadband (static CDN, no server round-trip)

---

### Story 2.2: Zero-Onboarding Canvas Hint

As a user opening the app for the first time,
I want to see a brief ambient hint that dissolves on its own,
So that I understand the canvas metaphor without being given a tutorial, and the philosophy begins on the first frame.

**Acceptance Criteria:**

**Given** the app is opened and the canvas is empty (no active todo cards)
**When** the canvas renders
**Then** the `CanvasHint` component renders centred on the canvas with italic text: *"Start with what calls to you"*
**And** the hint fades out via CSS transition after 3 seconds and is removed from the DOM after the transition completes
**And** when `prefers-reduced-motion: reduce` is set, the hint appears and is removed from the DOM after 3 seconds with no fade animation
**And** the hint does not appear when the canvas has one or more existing todo cards
**And** no other onboarding, tooltip, tutorial, or getting-started element appears anywhere in the app

---

### Story 2.3: Create and Title a Todo Card

As a user,
I want to create a new todo card on the canvas by clicking an empty area and typing a title,
So that I can place an intention on the canvas with near-zero friction.

**Acceptance Criteria:**

**Given** the canvas is open and has fewer than 100 active todo cards
**When** the user double-clicks an empty area of the canvas
**Then** a new `TodoCard` node appears at the click position with an editable title field focused
**And** typing and pressing Enter (or clicking away) triggers `handleDeclareTodo`, which writes a `TodoDeclaredEvent` and a `TodoPositionedEvent` to the event store
**And** the card appears on the canvas immediately — no loading state, no spinner; feedback is within 100ms (NFR7)
**And** the new card displays with `--surface` background, a 1px `--surface-border` border, and the title in Inter Medium at 15px
**And** pressing Escape during creation cancels the action and removes the card without writing any event

**Given** the canvas already has 100 active todo cards
**When** the user attempts to create a new card
**Then** no new card is created and a brief inline message indicates the canvas is full

---

### Story 2.4: Rename a Todo Card

As a user,
I want to rename any todo card by double-clicking its title,
So that I can refine what an intention means to me as my understanding evolves.

**Acceptance Criteria:**

**Given** a todo card exists on the canvas
**When** the user double-clicks the card title
**Then** the title becomes an editable inline text field, pre-filled with the current title
**And** pressing Enter or clicking away saves the change: `handleRenameTodo` writes a `TodoRenamedEvent`
**And** the card title updates immediately on the canvas with no loading state
**And** pressing Escape cancels the rename and restores the original title without writing any event
**And** an empty title is not permitted — if the user clears the field and confirms, the rename is cancelled and the original title is restored

---

### Story 2.5: Drag Cards to Declare Priority

As a user,
I want to drag todo cards freely across the canvas,
So that I can declare priority through spatial positioning — dragging a card to the centre means it matters now.

**Acceptance Criteria:**

**Given** one or more todo cards exist on the canvas
**When** the user drags a card to a new position
**Then** the card moves fluidly at 60fps with no perceptible lag (NFR1)
**And** when the drag ends, `handlePositionTodo` is called with a 200ms debounce, writing a `TodoPositionedEvent` with the final `{x, y}` coordinates
**And** the card position persists correctly after a page reload (the position is read from the event log on boot)
**And** while dragging, the card renders at scale 1.02 with increased shadow
**And** no position event is written during the drag — only on drag end (debounced 200ms)

---

### Story 2.6: Pan and Zoom the Canvas

As a user,
I want to pan and zoom the canvas using familiar pointer conventions,
So that the canvas feels like a physical space I can navigate — not a UI I operate.

**Acceptance Criteria:**

**Given** the canvas is open with one or more todo cards
**When** the user scrolls the mouse wheel
**Then** the canvas zooms in or out centred on the cursor position at 60fps
**When** the user holds Space and drags (or uses middle-mouse drag)
**Then** the canvas pans in the drag direction at 60fps
**And** zoom and pan state is managed by React Flow internally and does not write domain events
**And** canvas pan, zoom, and drag all render at a sustained 60fps on modern desktop hardware (NFR1)
**And** on tablet (768–1023px), touch drag moves cards and two-finger pinch zooms the canvas

---

### Story 2.7: Keyboard Navigation for Canvas Controls

As a user who navigates by keyboard,
I want to create cards, start sessions, seal, release, and open settings using keyboard alone,
So that the full canvas experience is accessible without a pointer device.

**Acceptance Criteria:**

**Given** the canvas is open
**When** the user presses Tab
**Then** focus moves sequentially through all visible todo cards, with a 2px solid `--session-active` focus ring on the focused card (`:focus-visible` only)
**And** pressing Enter on a focused card opens the card action menu
**And** pressing `N` (or a documented shortcut) on an empty canvas area triggers the create-card flow
**And** the Shelf icon and Settings icon in the canvas corners are reachable and activatable by keyboard
**And** a skip-to-canvas link is available for keyboard users at the top of the document
**And** all focus indicators meet WCAG 2.1 AA visibility requirements (NFR16)

---

## Epic 3: The Pomodoro Session Loop

Users can start a focused Pomodoro session linked to a canvas card (or unlinked as an Exploration session), watch the analog wipe timer run, have the session complete automatically, see the first Devotion dot appear, and have sessions survive app closures and crashes.

### Story 3.1: Start a Linked Pomodoro Session from a Card

As a user,
I want to start a Pomodoro session directly from a todo card on the canvas,
So that focus begins with a single deliberate action and the session is tied to my intention.

**Acceptance Criteria:**

**Given** a todo card exists on the canvas and no session is currently active
**When** the user clicks the start-session affordance on the card (always visible, not hover-only)
**Then** `handleStartSession(todoId, eventStore)` writes a `SessionStartedEvent` to the event store before the timer begins (NFR10)
**And** `useSessionStore` is updated with the new `ActiveSessionReadModel`
**And** the active card is visually foregrounded with a 2px `--session-active` blue ring
**And** all other canvas cards are dimmed to reduce distraction
**And** the `AnalogTimerWipe` overlay appears — small, fixed-position, peripheral; never full-canvas
**And** the action produces visible feedback within 100ms (NFR7)

**Given** a session is already active
**When** the user attempts to start another session from any card
**Then** no new session is started and the existing session continues uninterrupted

---

### Story 3.2: Analog Wipe Timer Display

As a user in an active session,
I want to see a circular analog timer fill rather than a countdown,
So that I experience time as presence accumulating — not a deadline approaching.

**Acceptance Criteria:**

**Given** a session is active
**When** the `AnalogTimerWipe` component renders
**Then** it displays as a circular SVG ring that fills clockwise from 0% to 100% over the session duration using `stroke-dashoffset` animation
**And** it carries `role="timer"` with `aria-label="N minutes remaining"` and `aria-live="off"` during the session
**And** when `prefers-reduced-motion: reduce` is set, the timer renders as a static filled bar showing proportional elapsed time — no animation
**And** the timer uses Inter Mono / JetBrains Mono for any numeric display at 48px
**And** no progress alerts, notification sounds, or mid-session interruptions occur while the timer runs

---

### Story 3.3: Session Completion and First Devotion Dot

As a user,
I want the session to complete automatically when the timer reaches zero,
So that I receive quiet acknowledgment and see the first evidence of my devotion appear on the card.

**Acceptance Criteria:**

**Given** an active session is running
**When** the timer duration elapses
**Then** `handleCompleteSession` writes a `SessionCompletedEvent` to the event store
**And** the `CompletionMoment` overlay appears: a Radix Dialog without backdrop overlay; shows the todo title + "1 Pomodoro added"; auto-dismisses after ~3 seconds or on any user interaction
**And** the `CompletionMoment` copy is past-tense, 1–2 lines maximum, with no congratulatory language
**And** when `prefers-reduced-motion: reduce` is set, the `CompletionMoment` appears and dismisses instantly with no fade
**And** after dismissal, the active card's blue ring is removed, all cards return to normal opacity, and the canvas returns to its neutral state
**And** a `DevotionDots` row appears on the card showing one filled amber dot at 6px with `aria-label="1 Pomodoro invested"`

---

### Story 3.4: Session Abandonment Below 60-Second Threshold

As a user,
I want sessions under 60 seconds to be silently discarded,
So that accidental starts or interruptions never pollute my Devotion Record and there is no shame in stopping.

**Acceptance Criteria:**

**Given** an active session is running
**When** the user cancels the session within the first 60 seconds
**Then** `handleAbandonSession` writes a `SessionAbandonedEvent` to the event store
**And** no Devotion dot is added to the card
**And** the `CompletionMoment` does not appear — abandonment is completely silent
**And** the canvas returns immediately to its neutral state with no messaging, no confirmation, and no shame indicator

**Given** an active session was abandoned
**When** the Devotion Record is viewed on the linked card
**Then** the abandoned session does not appear in the timeline

---

### Story 3.5: Durable Session — Resume Within Window

As a user,
I want my active session to resume automatically if I reopen the app while the timer window has not elapsed,
So that accidental tab closes or browser crashes never cost me a session.

**Acceptance Criteria:**

**Given** a session is active and the app is closed or the tab is hidden/crashed
**When** the user reopens the app before the configured session duration has elapsed since `SessionStartedEvent.timestamp`
**Then** the boot sequence calls `repairEvents()`, detects the orphaned `SessionStartedEvent`, and determines the session window is still open
**And** `useSessionStore` is initialised with the session in-progress, with the timer resumed at the correct elapsed position
**And** the `AnalogTimerWipe` renders showing the already-elapsed portion filled
**And** the active card's blue ring is shown and other cards are dimmed — the session UI is fully restored
**And** no user action is required to resume; recovery is automatic and invisible

---

### Story 3.6: Durable Session — Auto-Complete Beyond Window

As a user,
I want a session that elapsed while the app was closed to be automatically completed when I reopen it,
So that I never lose a completed Pomodoro to a crash or forgotten tab.

**Acceptance Criteria:**

**Given** a session was active and the app was closed for longer than the configured session duration
**When** the user reopens the app
**Then** the boot sequence calls `repairEvents()`, detects the orphaned `SessionStartedEvent`, determines the session window has elapsed, and synthesizes a `SessionCompletedEvent` capped at the configured duration
**And** the synthesized `SessionCompletedEvent` is written to the event store during boot
**And** the canvas opens in a neutral state — no active session is shown
**And** the linked card now shows a new Devotion dot for the auto-completed session
**And** the `CompletionMoment` does not appear for auto-completed sessions — the recovery is silent

---

### Story 3.7: Start an Unlinked Exploration Session

As a user,
I want to start a Pomodoro session without linking it to any card,
So that I can focus before knowing what I am focusing on.

**Acceptance Criteria:**

**Given** no session is currently active
**When** the user activates the Exploration session affordance — a fixed-position canvas-level control outside any card
**Then** `handleStartSession(null, eventStore)` writes a `SessionStartedEvent` with `todoId: null`
**And** the `AnalogTimerWipe` appears with the same visual treatment as a linked session but with no card foregrounded
**And** the session runs to completion normally; if < 60 seconds, it is silently abandoned

**Given** an Exploration session completes (≥ 60 seconds)
**When** the `CompletionMoment` appears
**Then** it offers two options: "Attach to a todo" (opens a card picker) or "Leave unlinked"
**And** selecting a card calls `handleAttributeExplorationSession(sessionId, todoId, eventStore)`, which updates the session's `todoId` and adds a Devotion dot to the chosen card
**And** selecting "Leave unlinked" or dismissing stores the session as an unlinked record without modifying any card

---

## Epic 4: The Devotion Record

Users can witness their accumulated presence — DevotionDots on cards communicate investment at a glance, the full Devotion Record timeline tells the story of when they showed up, and session history survives todo renames. The aha moment is real.

### Story 4.1: DevotionDots — Compact Presence on the Card

As a user,
I want to see a row of amber dots on each card representing my invested Pomodoros,
So that I can feel the weight of my devotion at a glance without opening any panel.

**Acceptance Criteria:**

**Given** a todo card has one or more completed sessions
**When** the card is visible on the canvas
**Then** the `DevotionDots` component renders below the card title as a row of 6px dots
**And** each completed Pomodoro is represented by a filled amber (`--devotion`) dot; empty slots are rendered at reduced opacity
**And** the component carries `aria-label="N Pomodoros invested"` (e.g. "3 Pomodoros invested")
**And** dots update immediately after a session completes — no page reload required
**And** the dots meet WCAG 2.1 AA contrast requirements for UI components (3:1 minimum) against the card background in both dark and light themes

---

### Story 4.2: Full Devotion Record Timeline Popover

As a user,
I want to open the full Devotion Record on any active card and see a chronological timeline of every session,
So that I can witness the story of when and how much I showed up — not just a count.

**Acceptance Criteria:**

**Given** a todo card has one or more completed sessions
**When** the user opens the Devotion Record (via card action menu or dedicated affordance)
**Then** the `DevotionRecord` component renders in a Radix Popover showing a chronological timeline of sessions by date
**And** each session is represented by a dot or cluster; the density and spacing communicate gaps and bursts of effort visually — not just numerically
**And** the timeline shows the full date range from the first session to the most recent
**And** the component carries an `aria-label` describing the total sessions and date range (e.g. "11 Pomodoros invested across 9 days, from March 1 to March 9")
**And** the record renders entirely from `DevotionRecordReadModel` data held in `useCanvasStore` — no additional event store reads on open

---

### Story 4.3: Devotion Record Preserved Across Title Renames

As a user,
I want my Devotion Record to remain intact if I rename a card,
So that evolving how I name an intention never erases the history of showing up for it.

**Acceptance Criteria:**

**Given** a todo card has accumulated Devotion dots over multiple sessions
**When** the user renames the card (triggering a `TodoRenamedEvent`)
**Then** the card's full session history is unchanged — the Devotion Record still shows all previous sessions
**And** `DevotionDots` still shows the correct count
**And** the `DevotionRecordReadModel` projection uses `todoId` (not `title`) as the stable identity key — title changes are irrelevant to the record
**And** after a page reload, the full history is still present

---

### Story 4.4: Completion Moment on Todo Seal

As a user,
I want to see a brief dignified summary when I seal a todo,
So that the act of declaring something complete is honoured as a ceremony, not processed as a checkbox.

**Acceptance Criteria:**

**Given** a todo card has accumulated one or more Pomodoros and the user initiates a seal
**When** `handleSealTodo` writes a `TodoSealedEvent`
**Then** the `CompletionMoment` overlay renders: Radix Dialog without backdrop, showing the todo title, total Pomodoro count, and approximate time span (e.g. "Chapter 4 — 23 Pomodoros across 18 days")
**And** the overlay auto-dismisses after ~3 seconds or on any user interaction
**And** copy is declarative and past-tense — no congratulatory language; 1–2 lines maximum
**And** when `prefers-reduced-motion: reduce` is set, the overlay appears and dismisses instantly
**And** the card is removed from the canvas after the `CompletionMoment` completes (or immediately if reduced-motion)

---

## Epic 5: Todo Lifecycle & The Shelf

Users can complete the full lifecycle of an intention — seal a todo with a Completion Moment ceremony, release it with honest two-state clarity (with Release Eulogy when high-investment), and revisit the full personal archive in the Shelf with distinct sealed/released badges.

### Story 5.1: Seal a Todo

As a user,
I want to declare a todo complete by sealing it,
So that I can make a sovereign declaration — this is done — without a system validating it for me.

**Acceptance Criteria:**

**Given** an active todo card exists on the canvas
**When** the user selects "Seal" from the card action menu
**Then** `handleSealTodo(todoId, eventStore)` writes a `TodoSealedEvent` to the event store
**And** the `CompletionMoment` overlay renders with a summary of total investment (see Story 4.4)
**And** after the `CompletionMoment` dismisses, the card animates off the canvas (250ms ease-in; no animation if `prefers-reduced-motion` is set)
**And** the sealed todo moves into the `ShelfReadModel` in `useCanvasStore`
**And** the canvas now has one fewer card and returns to neutral — no empty-state prompt appears if other cards remain

---

### Story 5.2: Release Ritual — Two-State Letting Go

As a user,
I want to release a todo by choosing between two honest release reasons,
So that letting go is an act of clarity — distinguishing "this is done" from "this was never truly mine" — not just an archive action.

**Acceptance Criteria:**

**Given** an active todo card exists on the canvas with 5 or fewer invested Pomodoros
**When** the user selects "Release" from the card action menu
**Then** the `ReleaseRitual` component renders as a Radix Dialog with full overlay (canvas obscured)
**And** the dialog presents exactly two large, distinct buttons: "Completed its purpose" and "Was never truly mine"
**And** there is no explicit cancel button visible — pressing Escape cancels and closes the dialog without any event being written
**And** selecting either reason calls `handleReleaseTodo(todoId, reason, eventStore)`, which writes a `TodoReleasedEvent` with the chosen `releaseReason`
**And** the card animates off the canvas after the dialog closes
**And** the copy is non-judgmental, brief, and written from the user's perspective — no warning language, no "Are you sure?"

---

### Story 5.3: Release Eulogy for High-Investment Todos

As a user,
I want to see my full Devotion Record one final time before releasing a todo I've invested heavily in,
So that the release is honoured with the weight it deserves, and letting go feels like clarity rather than erasure.

**Acceptance Criteria:**

**Given** an active todo card has more than 5 invested Pomodoros
**When** the user selects "Release" from the card action menu
**Then** the `ReleaseEulogy` component renders first — before the `ReleaseRitual` dialog
**And** `ReleaseEulogy` shows the full `DevotionRecord` timeline variant (compact) with the framing copy: "You invested N Pomodoros. It's okay to let it go."
**And** a single "Continue" button is shown; pressing it dismisses the Eulogy and opens the `ReleaseRitual` two-state dialog
**And** pressing Escape on the Eulogy cancels the entire release flow — no event is written and the card remains on the canvas

**Given** a todo card has 5 or fewer invested Pomodoros
**When** the user selects "Release"
**Then** the `ReleaseEulogy` does NOT appear — the `ReleaseRitual` dialog opens directly

---

### Story 5.4: The Shelf — Personal Archive

As a user,
I want to open the Shelf and see all my sealed and released todos with their full histories,
So that the lifecycle of my intentions is visible over time — a personal archive, not a graveyard.

**Acceptance Criteria:**

**Given** at least one todo has been sealed or released
**When** the user activates the Shelf icon (fixed canvas corner, ~35% opacity, keyboard-accessible)
**Then** the `ShelfDrawer` opens as a Radix Sheet sliding in from the right; the canvas remains visible behind it
**And** the drawer carries `aria-label="Shelf"`
**And** each `ShelfCard` displays: todo title, sealed or released badge with distinct colours (`--sealed` muted sage / `--released` muted lavender), the compact `DevotionRecord` timeline, and the date sealed/released
**And** sealed and released todos carry visually distinct badges — equal visual dignity, no hierarchy between them
**And** the Shelf renders from `ShelfReadModel` data in `useCanvasStore` — no additional event store reads on open
**And** pressing Escape or clicking the canvas area behind the drawer closes it

---

### Story 5.5: Shelf Empty State

As a user,
I want to see a neutral empty state when the Shelf has no entries,
So that the absence of archived todos feels honest, not like a missing feature or a failure.

**Acceptance Criteria:**

**Given** no todos have been sealed or released
**When** the user opens the Shelf
**Then** the `ShelfDrawer` opens and displays the text "Nothing here yet" — neutral, no illustration, no CTA, no directive prompt
**And** the empty state does not suggest any action the user should take
**And** the empty state copy does not imply the user is behind or missing something

---

## Epic 6: Production Storage & Data Durability

Users can trust their data completely — all state lives in a local SQLite database via OPFS and WASM, the app always opens coherently regardless of event log state, data survives crashes and future app versions, and security headers are production-grade.

### Story 6.1: SQLite Event Store with Drizzle Schema

As a developer,
I want a production SQLite event store implemented using SQLocal + Drizzle running in a Web Worker via OPFS,
So that all event writes are durable, atomic, and off the main thread — keeping canvas interactions smooth.

**Acceptance Criteria:**

**Given** the monorepo foundation is in place (Epic 1)
**When** `packages/storage/src/schema.ts` and `packages/storage/src/SqliteEventStore.ts` are created
**Then** the Drizzle schema defines an `events` table with columns: `seq INTEGER PRIMARY KEY AUTOINCREMENT`, `event_id TEXT UNIQUE`, `event_type TEXT`, `aggregate_id TEXT`, `schema_version INTEGER`, `timestamp INTEGER`, `payload JSON`
**And** indexes exist on `(aggregate_id, seq)` and `(seq)` for efficient aggregate reads and sequential replay
**And** `SqliteEventStore` implements the `EventStore` port using SQLocal + Drizzle, running the SQLite engine in a Web Worker via OPFS
**And** `apps/web/src/db.ts` initialises `SqliteEventStore` and the Cross-Origin Isolation headers are verified present before any SQLocal call
**And** `SqliteEventStore.test.ts` covers `append`, `readAll`, and `readByAggregate`
**And** canvas interactions remain at 60fps during concurrent event writes — no main-thread blocking (NFR1)

---

### Story 6.2: Atomic Event Writes and Boot Sequence Wiring

As a user,
I want every session start to be durably persisted before the timer begins,
So that I never have an in-memory-only timer state that can be lost if the app closes.

**Acceptance Criteria:**

**Given** `SqliteEventStore` is implemented (Story 6.1)
**When** `apps/web/src/db.ts` switches from `JsonEventStore` to `SqliteEventStore`
**Then** the boot sequence in `main.tsx` correctly initialises `SqliteEventStore` and runs the full repair + projection pipeline before rendering
**And** `handleStartSession` awaits the `append()` call and only starts the timer tick after the `SessionStartedEvent` is confirmed written (NFR10)
**And** all other command handlers (`handleDeclareTodo`, `handleSealTodo`, `handleReleaseTodo`, etc.) similarly await `append()` before updating Zustand state
**And** the app opens correctly on first launch (empty OPFS database) and on subsequent launches with existing event data
**And** `pnpm turbo build` produces a clean production bundle with OPFS storage active

---

### Story 6.3: Tolerant Boot from Corrupted or Incomplete Event Log

As a user,
I want the app to always open in a usable state regardless of what is in the event log,
So that no corruption, truncation, or unexpected state ever shows me an error screen.

**Acceptance Criteria:**

**Given** the event log contains one or more corruption scenarios (duplicate events, unknown event types, orphaned sessions, truncated records)
**When** the app boots and runs `repairEvents()` on the full event log from `SqliteEventStore`
**Then** the app opens in a coherent, usable state 100% of the time — no crash, no error screen, no unrecoverable state (NFR8)
**And** orphaned sessions are auto-completed or left open per the repair pipeline rules (Story 1.6)
**And** duplicate events are deduplicated silently
**And** unknown event types are skipped without error
**And** the user sees the canvas with whatever state could be recovered — the repair is entirely invisible
**And** no user data is silently lost — every unrecoverable state has a deterministic fallback (NFR9)

---

### Story 6.4: Schema Migration and Event Versioning

As a developer,
I want all stored events to carry a `schemaVersion` field and the upcasting pipeline to handle version differences,
So that the app can always replay events written by any previous version of itself without data loss.

**Acceptance Criteria:**

**Given** events are being written to `SqliteEventStore`
**When** any event is appended
**Then** it carries the current `schemaVersion` value in both the `schema_version` column and the event payload
**And** the `upcastEvents` function in the repair pipeline correctly transforms events from older schema versions to the current schema
**And** `pnpm turbo test` passes all repair pipeline tests including schema migration scenarios (Story 1.6)
**And** the boot sequence correctly replays a mixed-version event log without errors (NFR11)

---

### Story 6.5: Snapshot-Based Replay for Large Event Logs

As a user,
I want the app to boot quickly even after months of daily use,
So that the canvas is responsive in under 50ms regardless of how many events have accumulated.

**Acceptance Criteria:**

**Given** the event log has accumulated 500 or more events
**When** the app boots
**Then** the boot sequence reads the most recent `SnapshotCreatedEvent` and only replays events after that snapshot's `seq` value
**And** event log replay completes in under 50ms for logs up to 500 events since the last snapshot (NFR4)
**And** event log replay completes in under 200ms for logs up to 5,000 total events (NFR5)
**And** a new `SnapshotCreatedEvent` is written when the event log crosses the 500-event threshold
**And** the app behaves identically with or without a snapshot — the snapshot is a performance optimisation, not a correctness concern

---

### Story 6.6: Production Security Headers and CSP

As a developer,
I want the full Content Security Policy and Cross-Origin Isolation headers applied in production,
So that the app enforces zero external data transmission at the browser level and user data is sandboxed per origin.

**Acceptance Criteria:**

**Given** the app is deployed to Vercel
**When** any page is loaded
**Then** the response includes `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` (required for OPFS + WASM)
**And** the `Content-Security-Policy` header is set with: `default-src 'self'`; `script-src 'self' 'wasm-unsafe-eval'`; `style-src 'self' 'unsafe-inline'`; `img-src 'self' data:`; `connect-src 'none'`; `frame-src 'none'`; `worker-src 'self' blob:`
**And** `connect-src 'none'` enforces zero external network calls at the browser level — no fetch, no WebSocket, no analytics (NFR12)
**And** OPFS storage is sandboxed per browser origin by browser enforcement — no cross-origin access (NFR14)
**And** no `dangerouslySetInnerHTML` exists anywhere in the codebase; all user content passes through React's built-in XSS escaping (NFR15)
**And** the same headers are present in `vite.config.ts` for the development server — no gap between dev and production environments

---

## Epic 7: Settings & Personalisation

Users can configure timer durations to their rhythm, switch between light/dark/system themes, and trust the app honours their OS reduced-motion preference across all animations.

### Story 7.1: Configurable Timer Durations

As a user,
I want to configure the work session, short break, and long break durations independently,
So that the timer fits my rhythm rather than prescribing it.

**Acceptance Criteria:**

**Given** the app is open
**When** the user opens the Settings panel (fixed corner icon, keyboard-accessible)
**Then** the `SettingsPanel` renders as a Radix Dialog with three shadcn/ui Slider controls: "Work session", "Short break", and "Long break"
**And** each slider adjusts the corresponding duration independently, with a reasonable range (e.g. 5–90 minutes for work, 1–30 for breaks)
**And** changes persist immediately to the settings slice of `useCanvasStore` and are reflected in the next session started
**And** settings are stored so they survive page reloads
**And** the settings panel is fully keyboard-navigable: Tab moves between sliders, arrow keys adjust values, Escape closes the panel
**And** changing timer settings does not affect any currently active session

---

### Story 7.2: Light, Dark, and System Theme Switching

As a user,
I want to switch between dark, light, and system-default colour themes,
So that the app adapts to my environment and working conditions.

**Acceptance Criteria:**

**Given** the Settings panel is open
**When** the user interacts with the theme toggle (shadcn/ui Switch or segmented control)
**Then** selecting "Dark" applies the Midnight Canvas palette: `--canvas-bg: hsl(220, 18%, 8%)` and all dark tokens on `:root`
**And** selecting "Light" applies the Fog Light palette: warm cream canvas (`hsl(40, 20%, 96%)`), near-white cards, amber `--devotion` token unchanged
**And** selecting "System" applies the theme matching the OS `prefers-color-scheme` value and updates automatically if the OS setting changes
**And** all colour transitions between themes are instant — a deliberate switch, not an animation
**And** the chosen theme persists across page reloads
**And** all text/background combinations in both themes meet WCAG 2.1 AA contrast ratio (4.5:1 minimum) (NFR17)

---

### Story 7.3: Honour OS Reduced-Motion Preference

As a user who has enabled reduced motion in their OS,
I want all animations in the app to be suppressed,
So that I can use tododoro without triggering motion sensitivity.

**Acceptance Criteria:**

**Given** the user's OS has `prefers-reduced-motion: reduce` set
**When** any animated component renders
**Then** all CSS transition durations resolve to `0ms` via the Tailwind token layer — no per-component logic checks `window.matchMedia` directly
**And** the `AnalogTimerWipe` renders as a static filled bar showing proportional elapsed time (no `stroke-dashoffset` animation)
**And** the `CanvasHint` appears and is removed from DOM after 3 seconds with no CSS fade
**And** the `CompletionMoment` appears and dismisses instantly with no fade
**And** the `ShelfDrawer` opens and closes without the slide animation
**And** card leave-canvas animations (seal, release) are skipped — cards are removed from the DOM immediately
**And** this behaviour activates automatically from the OS setting with no user action required in the app (NFR18)
