# Story 1.2: Define Domain Event Types and Port Interfaces

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want all domain event types and port interfaces defined in `@tododoro/domain`,
So that every other package has a stable, versioned type contract to build against from the first line of implementation code.

## Acceptance Criteria

1. **Given** the monorepo is scaffolded (Story 1.1)
   **When** `packages/domain/src/events.ts` and `packages/domain/src/ports.ts` are created
   **Then** `events.ts` exports a `DomainEvent` discriminated union containing all 9 event types: `TodoDeclaredEvent`, `TodoRenamedEvent`, `TodoPositionedEvent`, `TodoSealedEvent`, `TodoReleasedEvent`, `SessionStartedEvent`, `SessionCompletedEvent`, `SessionAbandonedEvent`, `SnapshotCreatedEvent`

2. **And** every event interface includes: `eventType` (string literal), `schemaVersion: number`, `eventId: string`, `aggregateId: string`, `timestamp: number` (milliseconds since epoch); all duration fields use the `Ms` suffix (e.g. `configuredDurationMs`, `elapsedMs`)

3. **And** `ports.ts` exports three interfaces: `EventStore` (with `append`, `readAll`, `readByAggregate`), `Clock` (`{ now(): number }`), and `IdGenerator` (`{ generate(): string }`)

4. **And** `packages/domain/src/index.ts` re-exports all public types from `events.ts` and `ports.ts`

5. **And** `@tododoro/domain` has zero production dependencies (only `devDependencies`)

6. **And** `pnpm turbo typecheck` passes with zero errors after these files are created

## Tasks / Subtasks

- [x] Task 1: Create `packages/domain/src/events.ts` with all 9 event interfaces (AC: #1, #2)
  - [x] 1.1 Define shared base fields as an inline doc comment (not a shared interface — each event is standalone)
  - [x] 1.2 Define all 9 `interface` types with their specific payload fields (see Dev Notes for exact shapes)
  - [x] 1.3 Define `type DomainEvent = TodoDeclaredEvent | TodoRenamedEvent | ...` discriminated union (9 members)
  - [x] 1.4 Export all 9 event interfaces and the `DomainEvent` union

- [x] Task 2: Create `packages/domain/src/ports.ts` with all 3 port interfaces (AC: #3)
  - [x] 2.1 Define `interface EventStore` with `append`, `readAll`, `readByAggregate` (see Dev Notes for exact signatures)
  - [x] 2.2 Define `interface Clock` with `now(): number`
  - [x] 2.3 Define `interface IdGenerator` with `generate(): string`
  - [x] 2.4 Export all 3 interfaces

- [x] Task 3: Update `packages/domain/src/index.ts` to re-export all public types (AC: #4)
  - [x] 3.1 Replace the existing `export {};` stub with named re-exports from `events.ts` and `ports.ts`
  - [x] 3.2 Export every interface and the `DomainEvent` union type

- [x] Task 4: Validate (AC: #5, #6)
  - [x] 4.1 Verify `packages/domain/package.json` has zero entries in `dependencies` (devDependencies only)
  - [x] 4.2 Run `pnpm turbo typecheck` — must pass with zero errors
  - [x] 4.3 Run `pnpm turbo test` — must exit 0 (no test files yet, `passWithNoTests: true` is set)

## Dev Notes

### Exact Event Interface Shapes

Define each event as a standalone `interface` — do NOT use a shared base type or generic helper. The discriminant is `eventType` (string literal), not `type` or `kind`.

```typescript
// packages/domain/src/events.ts

export interface TodoDeclaredEvent {
  eventType: 'TodoDeclared';
  eventId: string;
  aggregateId: string; // todoId
  schemaVersion: number;
  timestamp: number;   // ms since epoch
  title: string;
}

export interface TodoRenamedEvent {
  eventType: 'TodoRenamed';
  eventId: string;
  aggregateId: string; // todoId
  schemaVersion: number;
  timestamp: number;
  title: string;       // new title
}

export interface TodoPositionedEvent {
  eventType: 'TodoPositioned';
  eventId: string;
  aggregateId: string; // todoId
  schemaVersion: number;
  timestamp: number;
  x: number;
  y: number;
}

export interface TodoSealedEvent {
  eventType: 'TodoSealed';
  eventId: string;
  aggregateId: string; // todoId
  schemaVersion: number;
  timestamp: number;
}

export interface TodoReleasedEvent {
  eventType: 'TodoReleased';
  eventId: string;
  aggregateId: string; // todoId
  schemaVersion: number;
  timestamp: number;
  releaseReason: 'completed_its_purpose' | 'was_never_truly_mine';
}

export interface SessionStartedEvent {
  eventType: 'SessionStarted';
  eventId: string;
  aggregateId: string;    // sessionId
  schemaVersion: number;
  timestamp: number;
  todoId: string | null;  // null = Exploration session
  configuredDurationMs: number;
}

export interface SessionCompletedEvent {
  eventType: 'SessionCompleted';
  eventId: string;
  aggregateId: string; // sessionId
  schemaVersion: number;
  timestamp: number;
  elapsedMs: number;
}

export interface SessionAbandonedEvent {
  eventType: 'SessionAbandoned';
  eventId: string;
  aggregateId: string; // sessionId
  schemaVersion: number;
  timestamp: number;
  elapsedMs: number;   // will be < 60000 (60s threshold)
}

export interface SnapshotCreatedEvent {
  eventType: 'SnapshotCreated';
  eventId: string;
  aggregateId: string;     // 'system'
  schemaVersion: number;
  timestamp: number;
  snapshotState: unknown;  // Typed in Story 1.7 once read models are defined (Stories 1.3–1.5)
}

export type DomainEvent =
  | TodoDeclaredEvent
  | TodoRenamedEvent
  | TodoPositionedEvent
  | TodoSealedEvent
  | TodoReleasedEvent
  | SessionStartedEvent
  | SessionCompletedEvent
  | SessionAbandonedEvent
  | SnapshotCreatedEvent;
```

### SnapshotCreatedEvent — Important Notes

- `snapshotState: unknown` is intentional for Story 1.2. The concrete read model types (`TodoListReadModel`, `ShelfReadModel`, `DevotionRecordReadModel`, `ActiveSessionReadModel`) are defined in Story 1.5. Story 1.7 refines this to a properly typed snapshot payload.
- **Do NOT forward-declare placeholder read model types here.** Keeping it `unknown` is cleaner and prevents the domain from having self-referential type spaghetti.
- The `aggregateId: 'system'` for snapshot events — snapshots are not tied to a specific aggregate. The storage layer (Story 6.1) uses the `seq` column, not `aggregateId`, to identify the latest snapshot.

### Exact Port Interface Shapes

```typescript
// packages/domain/src/ports.ts

import type { DomainEvent } from './events.js';

export interface EventStore {
  append(event: DomainEvent): Promise<void>;
  readAll(): Promise<readonly DomainEvent[]>;
  readByAggregate(aggregateId: string): Promise<readonly DomainEvent[]>;
}

export interface Clock {
  now(): number;
}

export interface IdGenerator {
  generate(): string;
}
```

**Notes on EventStore:**
- `append` takes a single event (not an array) — command handlers write one event at a time per the architecture pattern
- `readAll` returns `readonly` array — callers must not mutate the result
- `readByAggregate` enables per-aggregate event loading (used by command handlers in `apps/web/src/commands/`)
- The snapshot-optimized read path (`readAll` with an optional `afterSeq` parameter) is deferred to Story 1.7 — keep the interface simple here

**Notes on Clock:**
- `now(): number` returns milliseconds since epoch (Unix timestamp ms)
- All domain decision functions MUST use `Clock.now()` — never `Date.now()` directly
- `SystemClock` adapter (`{ now: () => Date.now() }`) lives in `apps/web` (not domain) — Story 1.7 wires it
- `FakeClock` test utility is introduced in Story 1.3 when first test is needed

**Notes on IdGenerator:**
- `generate(): string` returns a UUID string
- Concrete implementation uses `crypto.randomUUID()` (native browser API, zero deps)
- Lives in `apps/web`, not domain — same injection pattern as Clock

### index.ts Export Structure

```typescript
// packages/domain/src/index.ts
// Replace the empty `export {};` stub with:

export type {
  DomainEvent,
  TodoDeclaredEvent,
  TodoRenamedEvent,
  TodoPositionedEvent,
  TodoSealedEvent,
  TodoReleasedEvent,
  SessionStartedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
  SnapshotCreatedEvent,
} from './events.js';

export type {
  EventStore,
  Clock,
  IdGenerator,
} from './ports.js';
```

**Use `export type` for all exports** — these are pure TypeScript types erased at compile time. This signals clearly that the domain package exports no runtime code in this story.

### File Structure Being Modified

```
packages/domain/src/
  index.ts     ← UPDATE: replace `export {};` stub
  events.ts    ← CREATE: 9 event interfaces + DomainEvent union
  ports.ts     ← CREATE: EventStore, Clock, IdGenerator
```

No other files should be modified. `todo.ts`, `session.ts`, `repair.ts`, and `projections/` are for Stories 1.3–1.6.

### TypeScript Naming Rules (MUST Follow)

| Concept | Convention | Example |
|---|---|---|
| Event interface | `PascalCase` + `Event` suffix | `TodoDeclaredEvent` |
| `eventType` literal | `PascalCase` past-participle | `'TodoDeclared'` |
| Payload fields | `camelCase` | `todoId`, `configuredDurationMs` |
| Duration fields | Must use `Ms` suffix | `configuredDurationMs`, `elapsedMs` |
| Port interfaces | `PascalCase` | `EventStore`, `Clock`, `IdGenerator` |
| File names | `camelCase.ts` for pure-function/type files | `events.ts`, `ports.ts` |

**NEVER use:**
- `type: 'todo_declared'` — wrong casing
- `type: 'TODO_DECLARED'` — wrong casing
- `duration: number` — wrong, must use `Ms` suffix
- Optional fields (`field?: T`) in event payloads — use `null` for absent values
- `undefined` in event payloads — `exactOptionalPropertyTypes` blocks it anyway

### Critical Constraint: Zero Production Dependencies

`packages/domain/package.json` must have zero entries in `"dependencies"`. All runtime code in domain is pure TypeScript — no lodash, no uuid package, no anything. Interfaces compile away to nothing.

Verify before finishing:
```bash
cat packages/domain/package.json
# "dependencies" key must be absent OR empty {}
```

### Import Path Convention

Inside the domain package, use relative imports with `.js` extension (ESM module resolution):
```typescript
import type { DomainEvent } from './events.js';  // correct
import type { DomainEvent } from './events';       // may fail with moduleResolution: bundler
```

The `moduleResolution: bundler` in `tsconfig` requires explicit extensions in relative imports. Vite/Vitest handles the actual resolution, but the TS compiler needs them for `typecheck`.

### Coverage Gate Note

`packages/domain/vitest.config.ts` has 100% coverage thresholds. **Type-only files (interfaces + type aliases) generate zero JavaScript code** — v8 coverage will not count them against the threshold. `src/index.ts` is explicitly excluded from coverage. So:
- `events.ts` → type definitions only → v8 reports 0 statements, 0 branches → does not trigger threshold failure
- `ports.ts` → interfaces only → same as above

**No test files are needed for Story 1.2.** The `passWithNoTests: true` flag in the vitest config ensures `pnpm turbo test` exits 0 with no test files present.

### Previous Story Learnings (Story 1.1)

From Story 1.1 completion notes and debug log:
- `passWithNoTests: true` is already set in `packages/domain/vitest.config.ts` — no change needed
- The ESLint flat config enforces `@typescript-eslint/no-unused-vars: error` — every exported type must be actually used or this lints as an error. Since Story 1.2 only creates types that Story 1.3+ will consume, this is NOT an issue (exported symbols are never flagged as unused).
- `packages/typescript-config/base.json` has all three strict flags: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` — these apply automatically to domain, no per-file changes needed
- `exactOptionalPropertyTypes: true` means `?:` optional fields have a different type from `| undefined`. **Never use optional fields in event payloads** — always require every field and use `null` for intentionally absent values (e.g. `todoId: string | null`)
- pnpm lockfile was already regenerated in Story 1.1 — no changes to `pnpm-lock.yaml` expected for this story (no new deps)

### Project Structure Notes

- **Alignment with unified project structure:** `events.ts` and `ports.ts` go directly in `packages/domain/src/` — NOT in a subdirectory. The architecture directory tree explicitly places them at this level.
- **`projections/` directory** is NOT created in this story — it belongs to Story 1.5
- **`todo.ts`, `session.ts`, `repair.ts`** are NOT created in this story — they belong to Stories 1.3, 1.4, 1.6 respectively
- **No `types/` directory** anywhere — the architecture explicitly forbids a `types/` directory at any level

### Checklist Before Done

- [x] `events.ts` exports exactly 9 event interfaces + `DomainEvent` union
- [x] All 9 interfaces have `eventType` as a string literal (not `string`)
- [x] `SessionStartedEvent.todoId` is `string | null` (not optional `todoId?: string`)
- [x] `TodoReleasedEvent.releaseReason` uses the exact string literals `'completed_its_purpose'` and `'was_never_truly_mine'`
- [x] All duration fields end in `Ms` (`configuredDurationMs`, `elapsedMs`)
- [x] `ports.ts` exports exactly 3 interfaces: `EventStore`, `Clock`, `IdGenerator`
- [x] `index.ts` uses `export type { ... }` for all re-exports
- [x] Zero `dependencies` entries in `packages/domain/package.json`
- [x] `pnpm turbo typecheck` passes

### References

- Event naming convention (PascalCase past-participle): [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- Event discriminated union structure: [Source: _bmad-output/planning-artifacts/architecture.md#D4 Event Naming Convention]
- Port interfaces (EventStore, Clock, IdGenerator): [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns]
- `null` vs `undefined` for absent values: [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — Null vs Undefined]
- `interface` for object shapes, `type` for unions: [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — interface vs type]
- `exactOptionalPropertyTypes` enforcement: [Source: _bmad-output/planning-artifacts/architecture.md#Technical Constraints]
- Event payload fields (camelCase, Ms suffix): [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — Event Payload Serialization]
- `EventStore` command handler pattern: [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- Story acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.2]
- SnapshotCreatedEvent threshold (500 events): [Source: _bmad-output/planning-artifacts/architecture.md#D5 Snapshot Threshold]
- Zero production deps rule: [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (Cursor Agent)

### Debug Log References

No debug issues encountered. All tasks completed in a single pass.

### Completion Notes List

- Created `packages/domain/src/events.ts` with 9 standalone event interfaces (`TodoDeclaredEvent`, `TodoRenamedEvent`, `TodoPositionedEvent`, `TodoSealedEvent`, `TodoReleasedEvent`, `SessionStartedEvent`, `SessionCompletedEvent`, `SessionAbandonedEvent`, `SnapshotCreatedEvent`) and the `DomainEvent` discriminated union. Each interface is standalone (no shared base type). All fields are `readonly` to enforce immutability. All duration fields use `Ms` suffix. `SessionStartedEvent.todoId` is `string | null`. `TodoReleasedEvent.releaseReason` uses exact string literals. `SnapshotCreatedEvent.snapshotState` is `unknown` per spec.
- Added `CURRENT_SCHEMA_VERSION = 1 as const` to `events.ts` and exported from `index.ts` — anchors the initial schema version for Stories 1.3+ aggregate implementations.
- Created `packages/domain/src/ports.ts` with 3 port interfaces: `EventStore` (append, readAll, readByAggregate), `Clock` (now), `IdGenerator` (generate). Uses `.js` extension on relative import per ESM/bundler moduleResolution convention.
- Updated `packages/domain/src/index.ts`: replaced `export {};` stub with `export { CURRENT_SCHEMA_VERSION }` value export and `export type { ... }` re-exports for all 9 event interfaces, `DomainEvent` union, and 3 port interfaces.
- `packages/domain/package.json` confirmed zero `dependencies` entries (only `devDependencies`).
- `pnpm turbo typecheck` passes with 0 errors across all packages.
- `pnpm turbo test` exits 0 — no test files (type-only story), `passWithNoTests: true` confirmed working.

### File List

- `packages/domain/src/events.ts` (created) — 9 readonly event interfaces, `DomainEvent` union, `CURRENT_SCHEMA_VERSION` constant
- `packages/domain/src/ports.ts` (created) — `EventStore`, `Clock`, `IdGenerator` interfaces
- `packages/domain/src/index.ts` (modified) — exports `CURRENT_SCHEMA_VERSION` + all types via `export type {}`

## Change Log

- 2026-03-10: Story 1.2 implemented — created domain event types and port interfaces
