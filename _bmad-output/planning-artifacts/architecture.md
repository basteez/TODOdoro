---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-10'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/research/technical-typescript-ecosystem-tododoro-2026-03-10.md
  - _bmad-output/planning-artifacts/product-brief-tododoro-2026-03-10.md
  - _bmad-output/planning-artifacts/prd-validation-report.md
workflowType: 'architecture'
project_name: 'tododoro'
user_name: 'Tiziano'
date: '2026-03-10'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

---

## Project Context Analysis

### Requirements Overview

**Functional Requirements** — 34 FRs across 6 capability groups:

| Group | FRs | Architectural Implication |
|---|---|---|
| Canvas & Spatial Navigation | FR1–6 | Infinite canvas with drag/zoom/pan; hard 100-card cap; keyboard navigation for all primary controls |
| Todo Lifecycle Management | FR7–12 | Session-first domain model; position-is-priority; todo identity stable across title renames |
| Session & Timer Management | FR13–20 | Durable session state; resume-within-window; auto-complete-beyond-window; 60s abandonment threshold |
| Devotion Record & Completion | FR21–23 | Derived read model projected from event history; Completion Moment UI on seal |
| Shelf & Archive | FR24–26 | Persistent archive of sealed + released todos with full event histories; distinct visual badges |
| Event Storage & Data Integrity | FR27–31 | Append-only local event log; repair pipeline; schema upcasting; tolerant reader; deduplication |
| Settings & Personalisation | FR32–34 | Timer config, theme switching (light/dark/system), prefers-reduced-motion honour |

**Non-Functional Requirements** — 23 NFRs across 5 quality areas:

| Area | Key Targets |
|---|---|
| Performance | 60fps canvas; FCP <1.5s; event replay <50ms (≤500 events), <200ms (≤5,000); timer accuracy ±1s |
| Reliability | 100% coherent boot regardless of event log state; atomic event writes; repair pipeline on every boot |
| Security | Zero external data transmission; CSP blocks inline scripts + external loads; OPFS browser-origin sandboxing; no unsanitized HTML |
| Accessibility | WCAG 2.1 AA; keyboard-only for all primary controls; prefers-reduced-motion; ARIA on all canvas nodes |
| Maintainability | 100% domain test coverage as CI gate; zero production deps in domain; TypeScript strict everywhere; acyclic package graph enforced at compile time |

**Scale & Complexity:**

- Primary domain: Web App SPA — local-first, event-sourced, single-user, no backend
- Complexity level: Medium — domain logic sophistication (functional event sourcing, repair pipeline, canvas state) with zero external integrations
- Project context: Greenfield solo — Tiziano, TypeScript first project, 3-month v1 target
- Estimated architectural components: 4 packages (`domain`, `storage`, `ui`, `apps/web`) + 8+ custom React components + 2 storage adapters (JSON prototype, SQLite production)

### Technical Constraints & Dependencies

| Constraint | Impact |
|---|---|
| OPFS browser requirement (2022+ only) | Sets minimum browser floor; SQLocal WASM depends on it |
| Cross-Origin Isolation headers required | `COEP: require-corp` + `COOP: same-origin` in both Vite config and `vercel.json` |
| Web Worker for SQLite | SQLocal runs off main thread — canvas interactions must not block on event writes |
| No external API/network calls | CSP maximally restrictive; zero fetch/WebSocket/analytics |
| `schemaVersion` on every event from day one | Upcasting pipeline must be in place before any events are persisted |
| TypeScript `strict` + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes` | Compiler flags enforced across all packages from first commit — never disabled |
| Acyclic package graph enforced at compile time | TypeScript project references — `domain` imports nothing; others only import downward |

### Cross-Cutting Concerns Identified

1. **Event schema versioning** — affects `domain` types, `storage` persistence, and all future schema migrations; `schemaVersion` field mandatory from first event
2. **Boot-time repair pipeline** — spans domain logic (orphan detection, upcasting, tolerant reader) and storage layer (read order, deduplication)
3. **Timer durability** — crosses session management (domain), event persistence (storage), and wall-clock recovery on app reopen or crash
4. **Accessibility** — WCAG 2.1 AA + keyboard nav + ARIA propagates across all UI components, including React Flow canvas nodes
5. **prefers-reduced-motion** — must resolve to zero-duration at CSS token level, affecting every animated component across the design system
6. **Cross-Origin Isolation headers** — deployment concern (Vercel config + Vite dev server) that must be set before any SQLocal initialization attempt
7. **100% domain test coverage gate** — workflow dependency: CI blocks UI work until `@tododoro/domain` is fully covered; shapes build sequence

---

## Starter Template Evaluation

### Primary Technology Domain

Monorepo SPA — local-first, client-side only, no backend. Primary app is a Vite 7 + React 19 + TypeScript SPA deployed as a static bundle. Monorepo structure is architecturally required for strict package boundary enforcement (`domain`, `storage`, `ui`, `apps/web`).

### Starter Options Considered

- **`create-turbo@latest` (default):** Scaffolds Next.js apps by default — not suitable for a pure client-side SPA with no SSR surface
- **`create-turbo@latest -e with-vite`:** Official Turborepo Vite example; wires pnpm workspaces, Turborepo pipeline, shared TypeScript config, and Vite — correct fit
- **Manual scaffold:** No benefit over `with-vite` example; additional setup work for the same outcome
- **`npm create vite@latest` (single package):** Monorepo structure is a hard requirement for `domain` / `storage` / `ui` package isolation — not suitable

### Selected Starter: `create-turbo` with `with-vite` example

**Rationale:** The official `with-vite` example establishes the monorepo foundation (pnpm workspaces, Turborepo pipeline, shared TypeScript config) without opinionated framework decisions. The default package names are replaced to match tododoro's architecture (`domain`, `storage`, `ui`) during initialization.

**Initialization Command:**

```bash
pnpm dlx create-turbo@latest tododoro -e with-vite --package-manager pnpm
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
- TypeScript across all packages; shared `tsconfig` base at repo root
- `tsconfig.json` per package with `references` field (TypeScript project references ready from day one)
- ESNext target, `moduleResolution: bundler`

**Build Tooling:**
- Vite 7 for `apps/web` — HMR dev server + optimized production build
- Turborepo `turbo.json` pipeline: `build` depends on `^build`; `dev` is persistent and cache-disabled; `test` depends on `^build`
- `pnpm-workspace.yaml` wires all `apps/*` and `packages/*`

**Testing Framework:**
- Vitest wired per-package via `vitest.config.ts` inheriting from Vite config
- Clean slate for domain package strict coverage configuration (100% gate)

**Code Organization:**
- `apps/web/` — Vite React SPA (scaffolded and renamed from default)
- `packages/domain/` — pure TypeScript, zero deps, renamed from default package
- `packages/storage/` — EventStore adapters, added post-scaffold
- `packages/ui/` — React components and canvas, renamed from default package

**Development Experience:**
- `pnpm dev` starts all packages in watch mode via Turborepo
- Hot module replacement in `apps/web` via Vite dev server
- TypeScript project references enforce acyclic compilation graph from first commit

**Note:** Project initialization using this command is the first implementation story. After scaffolding, packages are renamed, TypeScript strict flags (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`) are added to all `tsconfig.json` files, and the Cross-Origin Isolation headers are added to `vite.config.ts` and `vercel.json` before any domain code is written.

---

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- D1: Event ID format — `crypto.randomUUID()` (zero dependencies, available in all target browsers)
- D2: Aggregate model — `Todo` + `Session` as separate aggregates
- D3: Read models — four projections covering all UI surfaces
- D4: Event naming convention — past-tense past-participle (e.g. `TodoDeclared`)
- D6: URL routing — no router library
- D10: CI gate order — domain coverage gate hard-blocks all downstream steps

**Important Decisions (Shape Architecture):**
- D5: Snapshot threshold — 500 events
- D7: Zustand store structure — two stores (`useCanvasStore`, `useSessionStore`)
- D8: Error boundary — single root-level boundary; domain errors never surface as UI errors
- D9: CSP directives — specific header values locked

**Deferred Decisions (Post-MVP):**
- D11: PWA activation — placeholder in place from day one; `vite-plugin-pwa` activated in Phase 2
- Snapshot implementation — designed in domain from v1 but only activated when event log exceeds 500 events

---

### Data Architecture

**D1 — Event ID Format**
- Decision: `crypto.randomUUID()`
- Rationale: Zero dependency, natively available in all target browsers (Chrome 92+, Firefox 95+, Safari 15.4+ — all 2022+ vintage). Sequential ordering uses SQLite's `seq INTEGER PRIMARY KEY AUTOINCREMENT`, not the event ID.
- Affects: `DomainEvent` interface, `IdGenerator` port in `@tododoro/domain`

**D2 — Aggregate Model**
- Decision: `Todo` and `Session` are two separate aggregates
- `Session` carries an optional `todoId: string | null` reference to implement the session-first model
- Sessions exist independently — an unlinked (Exploration) session has `todoId: null`
- Todo aggregate owns its lifecycle events; Session aggregate owns its timer events
- Rationale: Direct implementation of the session-first inversion from the PRD. Aggregates are separate because a session's lifecycle (started → completed/abandoned) is independent of any todo's lifecycle. Joining them would violate the session-first principle at the domain level.
- Affects: All event types, aggregate reducers, `readByAggregate` calls in the storage layer

**D3 — Read Models (Projections)**
Four read models, each projected from the full event log on boot and updated incrementally via `applyEvent`:

| Read Model | Drives | Key Fields |
|---|---|---|
| `TodoListReadModel` | Constellation Canvas (nodes + positions) | `id`, `title`, `position (x,y)`, `pomodoroCount`, `status` |
| `DevotionRecordReadModel` | Devotion Record popover, Release Eulogy | `todoId`, `sessions[]` (date + duration per session) |
| `ShelfReadModel` | Shelf drawer | sealed + released todos with full history and release reason |
| `ActiveSessionReadModel` | Timer overlay + active card state | `sessionId`, `todoId?`, `startedAt`, `configuredDuration`, `status` |

- Rationale: Each read model is shaped precisely for its UI consumer — no over-fetching, no under-fetching. All four are pure projections: `(currentState, event) => newState`.
- Affects: `@tododoro/domain` projection functions; Zustand stores; React component props

**D4 — Event Naming Convention**
- Decision: Past-tense past-participle, domain-noun prefix
- Pattern: `{Noun}{PastParticiple}` — e.g. `TodoDeclared`, `TodoRenamed`, `TodoPositioned`, `TodoSealed`, `TodoReleased`, `SessionStarted`, `SessionCompleted`, `SessionAbandoned`
- Rationale: Event names encode *what happened* (facts), not commands or present-tense descriptions. Consistent with DDD event sourcing conventions and the research document's examples. Makes the event log human-readable as a chronicle.
- Affects: All `eventType` string literals in `@tododoro/domain`; upcasting pipeline keys; storage queries

**D5 — Snapshot Threshold**
- Decision: `SnapshotCreated` event written every 500 events
- Boot replay strategy: load snapshot (if any) + only events after snapshot's `seq` value
- Rationale: Keeps worst-case boot-time event replay bounded at ~500 events regardless of total log size — satisfies NFR4 (< 50ms for ≤500 events). Snapshot is stored as a special event type in the same `events` table; no separate table required.
- Affects: `@tododoro/domain` (snapshot event type + projection logic); `@tododoro/storage` (snapshot read strategy); boot sequence in `apps/web`

---

### Frontend Architecture

**D6 — URL Routing**
- Decision: No router library
- The app has a single persistent view (the canvas). The Shelf is a React state–driven drawer (`isShelfOpen: boolean`). Settings is a Radix Dialog. There are no URLs to manage, no back-button states, no deep links.
- Rationale: Adding a router would introduce complexity with zero user-visible benefit. Aligns with "canvas is the product" — there is nowhere to navigate *to*.
- Affects: `apps/web` entry point; no `<BrowserRouter>` or equivalent wrapper; no dependency on React Router or TanStack Router

**D7 — Zustand Store Structure**
- Decision: Two stores with clear ownership boundaries

| Store | Owns | Updated by |
|---|---|---|
| `useCanvasStore` | `TodoListReadModel` + `ShelfReadModel` + `DevotionRecordReadModel` | Event replay on boot + `applyEvent` on every new event |
| `useSessionStore` | `ActiveSessionReadModel` + timer tick state | `SessionStarted` / `SessionCompleted` / `SessionAbandoned` events + `requestAnimationFrame` tick |

- Rationale: Separating canvas state from session/timer state means a timer tick (60fps via `requestAnimationFrame`) never triggers a re-render of the entire canvas. The canvas only re-renders when a todo-related event occurs. This directly supports NFR1 (60fps canvas during drag/pan/zoom).
- Affects: All React components; Zustand selector usage; bootstrap sequence on app load

**D8 — Error Boundary Strategy**
- Decision: Single React `ErrorBoundary` at the app root
- Domain errors (invalid commands, repair pipeline results) are returned as values (`Error | DomainEvent`), never thrown — handled deterministically inside `@tododoro/domain` and `@tododoro/storage`
- The root boundary is a last-resort safety net for unexpected React rendering failures only
- Rationale: NFR8 requires 100% coherent boot regardless of event log state — this is achieved in the domain/storage layer, not the UI layer. The UI should never see a domain-level error as an uncaught exception.
- Affects: `apps/web` root component; all domain command handlers return `Result` unions, not thrown errors

---

### Security

**D9 — CSP Directives**
Applied in both `vercel.json` (production) and `vite.config.ts` `server.headers` (development):

```
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Opener-Policy: same-origin
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'wasm-unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  connect-src 'none';
  frame-src 'none';
  worker-src 'self' blob:;
```

- `wasm-unsafe-eval`: Required for SQLocal WASM execution
- `unsafe-inline` on `style-src`: Required for Tailwind CSS utility injection in development (Tailwind v4 generates a static stylesheet in production, eliminating this in the prod build if verified)
- `worker-src blob:`: Required for SQLocal's Web Worker initialization pattern
- `connect-src 'none'`: Enforces the zero-external-network-call requirement at the browser level
- Affects: `vercel.json`, `vite.config.ts`; must be set before first SQLocal initialization

---

### Infrastructure & Deployment

**D10 — CI Gate Order**

```
1. pnpm install --frozen-lockfile
2. turbo typecheck          ← all packages in parallel
3. turbo test --filter=@tododoro/domain
   └── coverage gate: lines=100, functions=100, branches=100  ← HARD BLOCK
4. turbo test               ← all packages (domain already cached)
5. turbo build              ← apps/web production bundle
6. Deploy to Vercel         ← only on main branch
```

- The domain coverage gate (step 3) is a hard block: the pipeline fails and no further steps run if `@tododoro/domain` drops below 100%
- Rationale: Enforces NFR20 as a structural CI constraint, not an aspirational goal
- Affects: `.github/workflows/ci.yml`; `turbo.json` pipeline configuration; Vercel deployment trigger

**D11 — PWA Placeholder Strategy**
- Decision: Placeholder from day one; activate in Phase 2
- Day-one additions: `manifest.json` at `public/manifest.json` with correct `name`, `short_name`, `theme_color`, `background_color`, `icons` (placeholder icon); `<link rel="manifest">` in `index.html`
- Phase 2 activation: `vite-plugin-pwa` wired in `vite.config.ts`; service worker generated; offline install flow validated
- Rationale: PWA installability requires no `manifest.json` changes between v1 and Phase 2 — avoids future structural rework. The browser sees the manifest from day one.
- Affects: `apps/web/public/manifest.json`; `apps/web/index.html`

---

### Decision Impact Analysis

**Implementation Sequence (informed by decisions):**
1. Scaffold monorepo (`create-turbo -e with-vite`) + rename packages + add strict TS flags + COEP/COOP headers
2. Define all `DomainEvent` union types + `EventStore` interface in `@tododoro/domain` (D1, D2, D4)
3. Implement all aggregate reducers + decision functions + four projection functions (D3)
4. Implement repair pipeline (upcast + deduplicate + tolerant reader + orphan close)
5. Wire Vitest with 100% coverage gate — reach green before any other work (D10)
6. Implement `JsonEventStore` adapter in `@tododoro/storage` (prototype)
7. Implement `SqliteEventStore` + Drizzle schema in `@tododoro/storage` (production)
8. Scaffold `apps/web` with two Zustand stores (D7) + bootstrap replay + `applyEvent` wiring
9. Build `ConstellationCanvas` in isolation with hardcoded mock cards — 10-second UX test
10. Wire canvas to domain + storage; implement all card interactions (D6: no router)

**Cross-Component Dependencies:**
- D2 (separate aggregates) → D3 (read model shape) → D7 (Zustand store structure) — these three decisions form a chain; changing any one cascades to the others
- D9 (CSP headers) must be verified in Vite dev server before D7 storage store is wired — WASM will silently fail without `wasm-unsafe-eval`
- D10 (CI gate) enforces D5 (snapshot design) must exist in `@tododoro/domain` before storage work begins, even if snapshot activation is deferred

---

## Implementation Patterns & Consistency Rules

**Critical Conflict Points Identified:** 7 categories where AI agents could diverge

### Naming Patterns

**TypeScript File Naming:**
- Source files: `PascalCase.ts` / `PascalCase.tsx` for all classes, components, and types
- Utility/function files: `camelCase.ts` for files that export pure functions (e.g. `projectTodoList.ts`)
- Index files: `index.ts` at the root of each package for public exports only
- Test files: `foo.test.ts` co-located with the source file — never `foo.spec.ts`, never `__tests__/`
- Config files: `kebab-case.config.ts` (e.g. `vitest.config.ts`, `vite.config.ts`)

**Domain Event Naming:**
- All `eventType` strings: `PascalCase` past-participle (`TodoDeclared`, `SessionCompleted`)
- TypeScript interface per event: `interface TodoDeclaredEvent { eventType: 'TodoDeclared'; ... }`
- Union type: `type DomainEvent = TodoDeclaredEvent | TodoRenamedEvent | ...`
- Payload fields: `camelCase` (`todoId`, `startedAt`, `configuredDurationMs`)
- Never: `TODO_DECLARED`, `todo_declared`, `todoDeclared`

**CSS Custom Property Naming:**
- All design tokens: `--kebab-case` (e.g. `--canvas-bg`, `--text-primary`, `--devotion`, `--session-active`)
- Never: `--canvasBg`, `--canvas_bg`

**Zustand Store Naming:**
- Store hooks: `use{Domain}Store` (e.g. `useCanvasStore`, `useSessionStore`)
- State slices: `camelCase` nouns (`todos`, `activeSession`, `shelfItems`)
- Action methods: `camelCase` verbs (`applyEvent`, `bootstrap`, `tick`)

**React Component Naming:**
- All components: `PascalCase.tsx`; function name matches file name exactly
- shadcn/ui primitives: `src/components/ui/` (auto-generated, not manually created)
- Custom components: `src/components/` (flat or feature-grouped per Structure Patterns)

---

### Structure Patterns

**Monorepo Package Organization:**

```
packages/domain/src/
  events.ts                ← all DomainEvent types + discriminated union
  todo.ts                  ← Todo reducer + decision functions
  session.ts               ← Session reducer + decision functions
  projections/
    todoList.ts            ← projectTodoList → TodoListReadModel
    devotionRecord.ts      ← projectDevotionRecord → DevotionRecordReadModel
    shelf.ts               ← projectShelf → ShelfReadModel
    activeSession.ts       ← projectActiveSession → ActiveSessionReadModel
  repair.ts                ← deduplicate, upcast, tolerant reader, orphan close
  ports.ts                 ← EventStore, Clock, IdGenerator interfaces
  index.ts                 ← public exports only

packages/storage/src/
  schema.ts                ← Drizzle schema (events table)
  JsonEventStore.ts        ← localStorage adapter (prototype)
  SqliteEventStore.ts      ← SQLocal + Drizzle adapter (production)
  index.ts

packages/ui/src/
  components/              ← all React components
  index.ts

apps/web/src/
  stores/
    useCanvasStore.ts
    useSessionStore.ts
  commands/
    todoCommands.ts        ← handleDeclareTodo, handleSealTodo, handleReleaseTodo, etc.
    sessionCommands.ts     ← handleStartSession, handleCompleteSession, etc.
  App.tsx
  main.tsx
```

**Test File Location:**
- Always co-located: `packages/domain/src/todo.test.ts` next to `todo.ts`
- Storage integration tests: `packages/storage/src/SqliteEventStore.test.ts`
- Never: separate `__tests__/` directory at any level

**Where Types Live:**
- Domain types: `@tododoro/domain` only — never redefined in other packages
- Read model types: defined in `@tododoro/domain/src/projections/` alongside their projection functions
- React prop types: `interface Props {}` defined inline at top of the component file
- Never: a `types/` directory at package root

---

### Format Patterns

**`interface` vs `type`:**
- `interface`: object shapes representing domain entities, React props, public API contracts (extensible)
- `type`: unions (`type DomainEvent = ...`), discriminated unions, primitive aliases, utility types
- Never `class` in `@tododoro/domain` — functional style only

**Explicit Return Types:**
- All exported functions in `@tododoro/domain`: always explicit return types
- React components: inferred (JSX handles this)
- Internal helpers: inferred is acceptable

**Null vs Undefined:**
- `null`: intentionally absent optional domain values (e.g. `todoId: string | null` on Exploration sessions)
- `undefined`: never used in domain event payloads — `exactOptionalPropertyTypes` enforces this
- Optional properties (`?:`) are never used in event payloads — all fields required; absence represented as `null`

**Event Payload Serialization:**
- All payload fields: `camelCase`
- Timestamps: always milliseconds since epoch as `number` — never ISO strings, never `Date` objects
- Durations: always milliseconds with `Ms` suffix (`configuredDurationMs`, `elapsedMs`)

---

### Communication Patterns

**Command Handler Pattern (imperative shell in `apps/web/src/commands/`):**

```typescript
// ALWAYS: async, returns Result union, never throws
// ALWAYS: read events → reduce state → call decision fn → append → update store
export async function handleSealTodo(
  todoId: string,
  eventStore: EventStore
): Promise<{ ok: true } | { ok: false; error: string }> {
  const events = await eventStore.readByAggregate(todoId);
  const state = events.reduce(reduceTodo, { status: 'nonexistent' });
  const result = sealTodo(state);
  if (result instanceof Error) return { ok: false, error: result.message };
  await eventStore.append(result);
  useCanvasStore.getState().applyEvent(result);  // update store immediately after append
  return { ok: true };
}
```

**Domain Decision Functions (functional core in `@tododoro/domain`):**

```typescript
// ALWAYS: pure function, returns DomainEvent | Error — never throws, never async
// NEVER: import from outside @tododoro/domain
function sealTodo(state: TodoState): TodoSealedEvent | Error { ... }
```

**Zustand Store Updates:**
- Never call `useCanvasStore.setState()` directly from components — only from command handlers
- Components subscribe via selectors only: `const todos = useCanvasStore(s => s.todos)`
- Never subscribe to the whole store: `const store = useCanvasStore()` — always use a selector

**Event Replay Boot Sequence (always in this exact order in `main.tsx`):**

```typescript
const events = await eventStore.readAll();
const repairedEvents = repairEvents(events);
const canvasState = repairedEvents.reduce(projectTodoList, initialTodoListState);
const shelfState = repairedEvents.reduce(projectShelf, initialShelfState);
const devotionState = repairedEvents.reduce(projectDevotionRecord, initialDevotionState);
useCanvasStore.getState().bootstrap(canvasState, shelfState, devotionState);
```

---

### Process Patterns

**Error Handling:**
- Domain errors: returned as `Error` values — never thrown, always handled by caller
- Storage errors: caught at command handler level — failure returns `{ ok: false, error: '...' }`
- UI errors: root `ErrorBoundary` is last-resort only — should never trigger in normal use
- Never: `console.error` in production code; never silent swallowing

**Loading States:**
- tododoro has no per-action loading states — all writes are imperceptible (NFR7)
- Only loading state: `isBooting: boolean` in `useCanvasStore` for initial event replay
- Canvas renders nothing until `isBooting === false`
- Never: individual `isLoading` flags per UI action

**Async in React Components:**
- Never `useEffect` for data fetching — no data fetching exists
- Never `useEffect` for boot replay — bootstrap runs in `main.tsx` before the React tree renders
- `useEffect` valid only for: timer tick subscription, canvas resize observer, keyboard shortcut registration
- Canvas drag → `TodoPositioned` event: debounced 200ms before writing — prevents event log spam

**Tailwind Usage:**
- All styling via Tailwind utility classes — never inline `style={}` props (exception: React Flow node positioning, managed by React Flow)
- Design tokens via CSS custom properties only — never hardcoded hex/hsl values in components
- `prefers-reduced-motion` handled at CSS token level in `tailwind.config.ts` — components never check `window.matchMedia` directly

---

### Enforcement Guidelines

**All AI Agents MUST:**
- Read `packages/domain/src/index.ts` before writing any domain code — all public types are exported from there
- Check `events.ts` before adding new event types — no duplicate `eventType` strings
- Run `pnpm turbo test --filter=@tododoro/domain` after any domain change and verify 100% coverage before continuing
- Never add a production dependency to `@tododoro/domain` — zero deps is a hard rule enforced by CI
- Never add `due_date`, `priority`, `subtasks`, or any equivalent concept to any domain type — the domain enforces the product philosophy
- Use the `Clock` port for all time-related domain logic — never call `Date.now()` directly in domain functions

**Anti-Patterns:**
- ❌ `new Date()` or `Date.now()` inside `@tododoro/domain` — use `Clock.now()` port
- ❌ Any `import` from `@tododoro/ui` or `apps/web` inside `@tododoro/domain` — acyclic graph violation
- ❌ `dangerouslySetInnerHTML` anywhere in the codebase
- ❌ Zustand `setState` called directly from a React component for domain state — only from command handlers
- ❌ `console.log` or `console.error` in committed code
- ❌ `useEffect` timer without a cleanup function — always return `() => clearInterval(id)`
- ❌ Hardcoded `hsl(...)` or `#hex` colour values in component files — all colours via CSS custom properties

---

## Project Structure & Boundaries

### Complete Project Directory Structure

```
tododoro/
├── .github/
│   └── workflows/
│       └── ci.yml                    ← typecheck → domain:test (100% gate) → test → build → deploy
├── .gitignore
├── .prettierrc
├── eslint.config.ts                  ← root ESLint flat config (all packages inherit)
├── package.json                      ← root scripts: dev, build, test, typecheck
├── pnpm-workspace.yaml               ← workspace: ['apps/*', 'packages/*']
├── tsconfig.json                     ← base: strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes
├── turbo.json                        ← pipeline: build, test, typecheck, dev
├── README.md
├── PRODUCT_PHILOSOPHY.md             ← non-negotiable constraints for contributors + AI agents
│
├── apps/
│   └── web/
│       ├── index.html                ← <link rel="manifest">; SQLocal worker script tag
│       ├── package.json
│       ├── tsconfig.json             ← extends root; references all packages
│       ├── vite.config.ts            ← COEP + COOP headers; @vitejs/plugin-react
│       ├── vitest.config.ts
│       ├── vercel.json               ← COEP + COOP + CSP headers for production
│       ├── public/
│       │   ├── manifest.json         ← PWA placeholder (Phase 2 activation point)
│       │   └── favicon.ico
│       └── src/
│           ├── main.tsx              ← boot: readAll → repairEvents → project → bootstrap → render
│           ├── App.tsx               ← root component + single ErrorBoundary
│           ├── index.css             ← Tailwind directives + all CSS custom property tokens
│           ├── db.ts                 ← SQLocal + Drizzle init → SqliteEventStore instance
│           ├── stores/
│           │   ├── useCanvasStore.ts ← TodoListReadModel + ShelfReadModel + DevotionRecordReadModel
│           │   │                        + settings (theme, timer durations) + isBooting
│           │   └── useSessionStore.ts← ActiveSessionReadModel + rAF tick
│           └── commands/
│               ├── todoCommands.ts   ← handleDeclareTodo, handleRenameTodo, handlePositionTodo,
│               │                        handleSealTodo, handleReleaseTodo
│               └── sessionCommands.ts← handleStartSession, handleCompleteSession,
│                                        handleAbandonSession, handleAttributeExplorationSession
│
└── packages/
    │
    ├── domain/                       ← zero production dependencies; 100% test coverage gate
    │   ├── package.json
    │   ├── tsconfig.json             ← extends root; no references (leaf node in graph)
    │   ├── vitest.config.ts          ← coverage thresholds: lines/functions/branches = 100
    │   └── src/
    │       ├── index.ts              ← public exports only
    │       ├── ports.ts              ← EventStore, Clock, IdGenerator interfaces
    │       ├── events.ts             ← DomainEvent union + all event interfaces:
    │       │                           TodoDeclaredEvent, TodoRenamedEvent, TodoPositionedEvent,
    │       │                           TodoSealedEvent, TodoReleasedEvent,
    │       │                           SessionStartedEvent, SessionCompletedEvent, SessionAbandonedEvent,
    │       │                           SnapshotCreatedEvent
    │       ├── todo.ts               ← TodoState + reduceTodo + declareTodo + renameTodo +
    │       │                           positionTodo + sealTodo + releaseTodo
    │       ├── todo.test.ts
    │       ├── session.ts            ← SessionState + reduceSession + startSession +
    │       │                           completeSession + abandonSession
    │       ├── session.test.ts
    │       ├── repair.ts             ← repairEvents: deduplicateByEventId + upcast +
    │       │                           skipUnknownEventTypes + autoCloseOrphanedSessions
    │       ├── repair.test.ts        ← all 6 documented corruption scenarios
    │       └── projections/
    │           ├── todoList.ts       ← projectTodoList → TodoListReadModel        [FR1–6]
    │           ├── todoList.test.ts
    │           ├── devotionRecord.ts ← projectDevotionRecord → DevotionRecordReadModel  [FR21–23]
    │           ├── devotionRecord.test.ts
    │           ├── shelf.ts          ← projectShelf → ShelfReadModel              [FR24–26]
    │           ├── shelf.test.ts
    │           ├── activeSession.ts  ← projectActiveSession → ActiveSessionReadModel  [FR13–20]
    │           └── activeSession.test.ts
    │
    ├── storage/
    │   ├── package.json              ← depends on @tododoro/domain
    │   ├── tsconfig.json             ← extends root; references domain
    │   ├── vitest.config.ts
    │   └── src/
    │       ├── index.ts
    │       ├── schema.ts             ← Drizzle table: events
    │       │                           (seq PK AUTOINCREMENT, event_id UNIQUE, event_type,
    │       │                            aggregate_id, schema_version, timestamp, payload JSON)
    │       │                           indexes: (aggregate_id, seq), (seq)
    │       ├── JsonEventStore.ts     ← localStorage adapter — prototype [FR27]
    │       ├── JsonEventStore.test.ts
    │       ├── SqliteEventStore.ts   ← SQLocal + Drizzle + OPFS — production [FR27–31]
    │       └── SqliteEventStore.test.ts
    │
    └── ui/
        ├── package.json              ← depends on @tododoro/domain, @xyflow/react, @radix-ui/*
        ├── tsconfig.json             ← extends root; references domain
        └── src/
            ├── index.ts
            └── components/
                ├── ConstellationCanvas.tsx     ← FR1–6: React Flow canvas, pan/zoom/drag,
                │                                  100-card cap, empty state, active-session dim
                ├── TodoCard.tsx                ← FR7–8: React Flow custom node; title,
                │                                  DevotionDots row, session start affordance,
                │                                  card action menu; states: idle/hover/active/editing/dragging
                ├── DevotionDots.tsx            ← FR21: compact 6px amber dot row on card
                │                                  aria-label="N Pomodoros invested"
                ├── DevotionRecord.tsx          ← FR21,23: full timeline visualization
                │                                  Variants: Full (popover), Compact (shelf)
                ├── AnalogTimerWipe.tsx         ← FR16: SVG stroke-dashoffset wipe
                │                                  role="timer"; prefers-reduced-motion → static bar
                ├── CompletionMoment.tsx        ← FR22: session/seal overlay (Radix Dialog,
                │                                  no backdrop); auto-dismisses ~3s
                ├── ReleaseRitual.tsx           ← FR9: two-state dialog
                │                                  "Completed its purpose" / "Was never truly mine"
                ├── ReleaseEulogy.tsx           ← FR10: >5 Pomodoro gate; DevotionRecord full +
                │                                  "You invested N Pomodoros. It's okay to let it go."
                ├── ShelfDrawer.tsx             ← FR24: Radix Sheet right drawer; canvas behind
                ├── ShelfCard.tsx               ← FR25–26: Devotion Record compact + sealed/released badge
                ├── CanvasHint.tsx              ← FR12: "Start with what calls to you"
                │                                  CSS fade-out 3s; removed from DOM after
                ├── SettingsPanel.tsx           ← FR32–34: timer sliders + theme switch
                │                                  (Radix Dialog + shadcn Slider + Switch)
                └── ui/                         ← shadcn/ui generated components (owned, not a library)
                    ├── dialog.tsx
                    ├── sheet.tsx
                    ├── slider.tsx
                    ├── switch.tsx
                    ├── tooltip.tsx
                    ├── context-menu.tsx
                    └── popover.tsx
```

### Architectural Boundaries

**Package Dependency Graph (acyclic — enforced by TypeScript project references):**

```
apps/web
  ├── @tododoro/domain    (event types, read model types, ports)
  ├── @tododoro/storage   (EventStore implementations)
  └── @tododoro/ui        (React components)

@tododoro/ui
  └── @tododoro/domain    (read model types for React Flow node data)

@tododoro/storage
  └── @tododoro/domain    (DomainEvent interface, EventStore port)

@tododoro/domain
  └── (nothing)
```

**State Boundary:**
- `@tododoro/domain` is framework-agnostic — no Zustand, no React
- `apps/web` Zustand stores are the only bridge between domain projections and React components
- Command handlers in `apps/web/src/commands/` are the only code that writes to both the event store and Zustand in one flow

**Storage Boundary:**
- `@tododoro/domain/src/ports.ts` defines the `EventStore` interface — the only surface `apps/web` uses to interact with storage
- `apps/web/src/db.ts` constructs the concrete `SqliteEventStore` and injects it into command handlers
- Swapping adapters = change `db.ts` only; all command handlers and domain code are unaffected

**Canvas Boundary:**
- React Flow manages node rendering, viewport state, and drag positions internally
- `apps/web` maps `TodoListReadModel` → `TodoCardNode[]` before passing to `ConstellationCanvas`
- Drag end → `handlePositionTodo` (debounced 200ms) → `TodoPositionedEvent` → `applyEvent` → React Flow re-renders

### Requirements to Structure Mapping

| FR Group | Primary Files |
|---|---|
| FR1–6 Canvas & Spatial Navigation | `ConstellationCanvas.tsx`, `TodoCard.tsx`, `todoCommands.ts` (handlePositionTodo) |
| FR7–12 Todo Lifecycle | `TodoCard.tsx`, `todoCommands.ts`, `ReleaseRitual.tsx`, `domain/todo.ts` |
| FR13–20 Session & Timer | `AnalogTimerWipe.tsx`, `CompletionMoment.tsx`, `sessionCommands.ts`, `domain/session.ts`, `domain/repair.ts` |
| FR21–23 Devotion Record | `DevotionDots.tsx`, `DevotionRecord.tsx`, `projections/devotionRecord.ts` |
| FR24–26 Shelf & Archive | `ShelfDrawer.tsx`, `ShelfCard.tsx`, `projections/shelf.ts` |
| FR27–31 Event Storage & Data Integrity | `SqliteEventStore.ts`, `JsonEventStore.ts`, `schema.ts`, `domain/repair.ts` |
| FR32–34 Settings & Personalisation | `SettingsPanel.tsx`, `useCanvasStore.ts` (settings slice), `index.css` (theme tokens) |

### Data Flow

**Boot sequence (`main.tsx`):**
```
SqliteEventStore.readAll()
  → repairEvents()              [domain/repair.ts]
  → projectTodoList()           [domain/projections/todoList.ts]
  → projectShelf()              [domain/projections/shelf.ts]
  → projectDevotionRecord()     [domain/projections/devotionRecord.ts]
  → projectActiveSession()      [domain/projections/activeSession.ts]
  → useCanvasStore.bootstrap()
  → useSessionStore.bootstrap()
  → React renders App.tsx       [isBooting flips to false]
```

**User action sequence (e.g. seal a todo):**
```
TodoCard "Seal" click
  → todoCommands.handleSealTodo(todoId, eventStore)
  → domain/todo.sealTodo(currentState)      [pure function — no I/O]
  → SqliteEventStore.append(TodoSealedEvent)
  → useCanvasStore.applyEvent(TodoSealedEvent)
  → React Flow re-renders (card fades off canvas)
  → CompletionMoment renders (auto-dismisses ~3s)
```

**External integrations:** None in v1. `connect-src 'none'` in CSP enforces zero external calls at browser level.

---

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
All technology choices are mutually compatible and verified for 2026. `@xyflow/react` v12+ is React 19 compatible. SQLocal runs in a Web Worker — correctly separated from the Zustand/React rendering loop with no contention. Tailwind CSS v4 + Radix UI + React 19 form a validated design system stack. TypeScript project references + Turborepo pipeline enforce the acyclic graph at compile time. Cross-Origin Isolation headers are correctly placed in both Vite dev config and `vercel.json` — no gap between dev and production WASM environments.

**Pattern Consistency:**
Functional domain style (pure functions returning `DomainEvent | Error`) aligns directly with TypeScript discriminated unions — the patterns reinforce each other. Two-store Zustand separation isolates `requestAnimationFrame` timer ticks from canvas node re-renders, directly supporting NFR1 (60fps). Co-located test files align with Vitest's default test discovery — zero config friction. Tailwind CSS custom properties cleanly supports light/dark theme switching and `prefers-reduced-motion` at the token level — no per-component logic required.

**Structure Alignment:**
The four-package monorepo directly implements hexagonal architecture: `domain` is the pure core, `storage` and `ui` are adapters, `apps/web` is the shell. Every architectural boundary maps to a TypeScript project reference boundary — structural violations are compiler errors. `PRODUCT_PHILOSOPHY.md` at repo root gives AI agents and contributors an explicit reference for the non-negotiable constraints.

---

### Requirements Coverage Validation ✅

**Functional Requirements — all 34 FRs covered:**

| FR Group | Status | Architectural Support |
|---|---|---|
| FR1–6 Canvas & Spatial Navigation | ✅ Full | `ConstellationCanvas.tsx` + React Flow + `handlePositionTodo` (debounced 200ms) |
| FR7–12 Todo Lifecycle | ✅ Full | `TodoCard.tsx` + `domain/todo.ts` + `todoCommands.ts` + `ReleaseRitual.tsx` |
| FR13–20 Session & Timer | ✅ Full | `domain/session.ts` + `domain/repair.ts` (FR19–20: resume/auto-complete) + `sessionCommands.ts` + `AnalogTimerWipe.tsx` |
| FR21–23 Devotion Record | ✅ Full | `projections/devotionRecord.ts` + `DevotionDots.tsx` + `DevotionRecord.tsx` + `CompletionMoment.tsx` |
| FR24–26 Shelf & Archive | ✅ Full | `projections/shelf.ts` + `ShelfDrawer.tsx` + `ShelfCard.tsx` |
| FR27–31 Event Storage & Data Integrity | ✅ Full | `SqliteEventStore.ts` + `schema.ts` + `domain/repair.ts` (dedup, upcast, tolerant reader, orphan close) |
| FR32–34 Settings & Personalisation | ✅ Full | `SettingsPanel.tsx` + `useCanvasStore.ts` settings slice + `index.css` theme tokens |

**Non-Functional Requirements — all 23 NFRs covered:**

| NFR Area | Status | Architectural Support |
|---|---|---|
| NFR1 60fps canvas | ✅ | `useSessionStore` isolated for rAF ticks; React Flow only re-renders changed nodes; 100-card hard cap |
| NFR2–3 FCP/TTI | ✅ | Static SPA on Vercel CDN; no server round-trip; Vite production bundle |
| NFR4–5 Event replay performance | ✅ | Snapshot at 500 events; repair runs once on boot; SQLite local reads |
| NFR6 Timer accuracy ±1s | ✅ | `SessionStartedEvent.timestamp` is wall-clock source of truth; resume/auto-complete in `repair.ts` |
| NFR7 100ms feedback | ✅ | All operations imperceptible; no per-action loading states |
| NFR8–11 Reliability | ✅ | `repairEvents()` guarantees coherent boot; atomic `append()`; `schemaVersion` on every event; upcasting pipeline |
| NFR12–15 Security | ✅ | `connect-src 'none'`; OPFS sandboxed per-origin; no `dangerouslySetInnerHTML`; specific CSP directives |
| NFR16–19 Accessibility | ✅ | Radix UI focus trapping + ARIA; `aria-label` on all canvas nodes; `prefers-reduced-motion` at CSS token level |
| NFR20–23 Maintainability | ✅ | 100% domain coverage CI gate; zero production deps in domain; strict TypeScript; project references |

---

### Implementation Readiness Validation ✅

**Decision Completeness:** 11 decisions documented with rationale, versions, and affected components. Technology versions web-verified (create-turbo v2.8.15, React Flow v12.10.1). All critical decisions have concrete code examples in the patterns section.

**Structure Completeness:** Full directory tree with all files annotated across 4 packages + `apps/web` + CI/deployment config. Every FR group maps to specific files. No placeholder directories.

**Pattern Completeness:** 7 conflict categories addressed. Concrete code examples for command handler, domain decision function, Zustand selector, and boot sequence. Anti-patterns explicitly enumerated.

---

### Gap Analysis Results

**Critical Gaps: 0**

**Important Gaps (2 — non-blocking, resolved below):**

1. **`Clock` port interface not fully specified.** The rule against `Date.now()` in domain is documented; the port itself needs a concrete shape. Resolution: define `interface Clock { now(): number }` in `ports.ts`; `SystemClock` adapter in `apps/web`; `FakeClock` in domain test utilities. This is a 5-line addition before any session logic is written — first item in Phase 1.

2. **Exploration session UI entry point not mapped to a component.** FR14 specifies a session without a linked todo. Resolution: a small canvas-level action (fixed-position affordance on `ConstellationCanvas`, outside any card) calls `sessionCommands.handleStartSession(null, eventStore)`. Component-level detail — not an architectural gap, but flagged so the canvas builder doesn't invent a different entry point.

**Nice-to-Have Gaps (2 — deferred):**
- Drizzle migration files directory (`packages/storage/drizzle/`) — needed when `schemaVersion` is first incremented, not at v1
- Playwright e2e test setup — explicit Phase 2 addition; v1 scope is unit + integration only

---

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] All 34 FRs and 23 NFRs extracted and categorised
- [x] Scale and complexity assessed (Medium; solo greenfield; 3-month v1 target)
- [x] Technical constraints identified (OPFS, COEP/COOP, WASM, browser floor 2022+)
- [x] 7 cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] 11 decisions documented with rationale and affected components
- [x] Technology stack fully specified and web-verified
- [x] Implementation sequence ordered by dependency
- [x] Deferred decisions explicitly listed with rationale

**✅ Implementation Patterns**
- [x] 7 naming conflict categories addressed with rules and examples
- [x] Command handler pattern with code example
- [x] Domain decision function pattern with code example
- [x] Zustand selector and boot sequence patterns specified
- [x] Anti-patterns enumerated (8 hard prohibitions)

**✅ Project Structure**
- [x] Complete directory tree with all files annotated
- [x] All 4 packages + `apps/web` fully defined
- [x] Every FR group mapped to specific files
- [x] Architectural boundaries and data flow documented

---

### Architecture Readiness Assessment

**Overall Status: READY FOR IMPLEMENTATION**

**Confidence Level: High**

**Key Strengths:**
1. The philosophy is encoded in the type system — no `due_date`, `priority`, or `subtasks` can appear because the domain types don't permit them
2. The domain package is fully isolated — 100% coverage gate means implementation bugs surface in minutes, not weeks
3. Functional core / imperative shell means every domain function is pure, with zero mocking overhead in tests
4. Event sourcing makes v1 → Phase 2 → Phase 3 purely additive — no schema rewrites, no architectural changes required for PWA, sync, or AI insights

**Areas for Future Enhancement (post-v1):**
- Playwright e2e suite covering the 5 core user journeys
- Drizzle migration pipeline as `schemaVersion` is incremented
- Storybook for UI component visual regression testing
- `vite-plugin-pwa` activation (Phase 2)
