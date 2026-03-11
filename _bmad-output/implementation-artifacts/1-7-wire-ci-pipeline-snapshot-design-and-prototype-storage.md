# Story 1.7: Wire CI Pipeline, Snapshot Design, and Prototype Storage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the CI pipeline configured with the domain coverage hard-gate, snapshot logic present in the domain, and the JsonEventStore prototype wired so the app runs end-to-end,
So that no downstream work can proceed without 100% domain coverage and the complete boot sequence is validated.

## Acceptance Criteria

1. **Given** all domain code is implemented with 100% coverage (Stories 1.2–1.6)
   **When** `.github/workflows/ci.yml`, `packages/storage/src/JsonEventStore.ts`, and the `apps/web/src/main.tsx` boot sequence are created
   **Then** the CI pipeline runs: `pnpm install --frozen-lockfile` → `turbo typecheck` → `turbo test --filter=@tododoro/domain` (coverage gate: lines/functions/branches = 100 — HARD BLOCK) → `turbo test` → `turbo build` → Vercel deploy on main branch push

2. **And** `SnapshotCreatedEvent` exists in the domain with a 500-event threshold; projection functions accept an optional snapshot state for partial replay

3. **And** `JsonEventStore` implements the `EventStore` port using `localStorage` as a JSON append-only log

4. **And** `JsonEventStore.test.ts` covers `append`, `readAll`, and `readByAggregate`

5. **And** `apps/web/src/main.tsx` boot sequence runs: `readAll() → repairEvents() → projectTodoList() → projectShelf() → projectDevotionRecord() → projectActiveSession() → bootstrap()` before rendering the React tree

6. **And** `pnpm turbo build` produces a clean production bundle with no TypeScript errors

## Tasks / Subtasks

- [x] Task 1: Create `.github/workflows/ci.yml` (AC: #1)
  - [x] 1.1 Create `.github/workflows/ci.yml` with the exact pipeline order from architecture
  - [x] 1.2 Step 1: `pnpm install --frozen-lockfile`
  - [x] 1.3 Step 2: `turbo typecheck`
  - [x] 1.4 Step 3: `turbo test --filter=@tododoro/domain` with `--coverage` flag — HARD BLOCK (non-zero exit kills pipeline)
  - [x] 1.5 Step 4: `turbo test` (all packages — domain already cached)
  - [x] 1.6 Step 5: `turbo build`
  - [x] 1.7 Step 6: Vercel deployment — only on push to `main` branch

- [x] Task 2: Update `SnapshotCreatedEvent` type and add snapshot support to projections (AC: #2)
  - [x] 2.1 Update `SnapshotCreatedEvent.snapshotState` in `events.ts` from `unknown` to a typed shape reflecting all 4 read model states
  - [x] 2.2 Define `SnapshotState` interface: `{ todoList: TodoListReadModel; shelf: ShelfReadModel; devotionRecord: DevotionRecordReadModel; activeSession: ActiveSessionReadModel }`
  - [x] 2.3 Export `SnapshotState` from `@tododoro/domain/index.ts`
  - [x] 2.4 Add snapshot threshold constant to domain: `export const SNAPSHOT_THRESHOLD = 500 as const`
  - [x] 2.5 The `SnapshotCreatedEvent` is already in the `DomainEvent` union (Story 1.2) — no new event type needed
  - [x] 2.6 Update tests if needed to cover new `SnapshotCreatedEvent` fields

- [x] Task 3: Implement `JsonEventStore` in `packages/storage/src/` (AC: #3, #4)
  - [x] 3.1 Create `packages/storage/src/JsonEventStore.ts` implementing the `EventStore` port
  - [x] 3.2 Use `localStorage` key: `'tododoro:events'`
  - [x] 3.3 Implement `append(event: DomainEvent): Promise<void>` — read current JSON, push event, write back
  - [x] 3.4 Implement `readAll(): Promise<ReadonlyArray<DomainEvent>>` — parse JSON from localStorage; return `[]` if key not found or JSON is malformed
  - [x] 3.5 Implement `readByAggregate(aggregateId: string): Promise<ReadonlyArray<DomainEvent>>` — `readAll()` filtered by `aggregateId`
  - [x] 3.6 Create `packages/storage/src/JsonEventStore.test.ts` covering all three methods
  - [x] 3.7 Add `packages/storage/package.json` with correct `@tododoro/domain` workspace dependency

- [x] Task 4: Wire `apps/web/src/main.tsx` boot sequence (AC: #5)
  - [x] 4.1 Create or update `apps/web/src/main.tsx` with the full boot sequence before React renders
  - [x] 4.2 Instantiate `JsonEventStore` as the concrete `EventStore`
  - [x] 4.3 Run: `readAll() → repairEvents() → projectTodoList() → projectShelf() → projectDevotionRecord() → projectActiveSession()`
  - [x] 4.4 Call `useCanvasStore.getState().bootstrap(todoListState, shelfState, devotionState)` and `useSessionStore.getState().bootstrap(activeSessionState)`
  - [x] 4.5 Set `isBooting: false` in `useCanvasStore` after bootstrap completes
  - [x] 4.6 Pass `SystemClock` adapter (wraps `Date.now()`) and `CryptoIdGenerator` adapter (wraps `crypto.randomUUID()`) to `repairEvents`

- [x] Task 5: Create adapters in `apps/web/src/` (AC: #5)
  - [x] 5.1 Create `apps/web/src/adapters/SystemClock.ts`: `export class SystemClock implements Clock { now(): number { return Date.now(); } }`
  - [x] 5.2 Create `apps/web/src/adapters/CryptoIdGenerator.ts`: `export class CryptoIdGenerator implements IdGenerator { generate(): string { return crypto.randomUUID(); } }`
  - [x] 5.3 These are the ONLY places `Date.now()` and `crypto.randomUUID()` may be called in the codebase

- [x] Task 6: Verify `pnpm turbo build` passes (AC: #6)
  - [x] 6.1 Run `pnpm turbo build` and confirm zero TypeScript errors and clean bundle
  - [x] 6.2 Confirm `pnpm turbo test --filter=@tododoro/domain --coverage` still reports 100% after any changes to `events.ts` for the SnapshotState type

## Dev Notes

### CI Pipeline Exact Configuration

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: ['*']
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: latest
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Typecheck all packages
        run: pnpm turbo typecheck

      - name: Domain test (coverage gate — HARD BLOCK)
        run: pnpm turbo test --filter=@tododoro/domain -- --coverage
        # Non-zero exit (coverage < 100%) blocks all subsequent steps

      - name: Test all packages
        run: pnpm turbo test

      - name: Build
        run: pnpm turbo build
```

**Vercel deploy is configured in Vercel dashboard** (connected to the `main` branch), not in the CI YAML. The CI YAML only covers the test/build pipeline. Vercel picks up the `turbo build` output automatically.

### `SnapshotCreatedEvent` — Typing `snapshotState`

Story 1.2 created `SnapshotCreatedEvent` with `snapshotState: unknown` as a placeholder. Now that all read models exist (Story 1.5), update the type:

```typescript
// In packages/domain/src/events.ts — update the existing interface

// Import read model types (they're in the same package, no circular dep)
import type { TodoListReadModel } from './projections/todoList.js';
import type { ShelfReadModel } from './projections/shelf.js';
import type { DevotionRecordReadModel } from './projections/devotionRecord.js';
import type { ActiveSessionReadModel } from './projections/activeSession.js';

export interface SnapshotState {
  readonly todoList: TodoListReadModel;
  readonly shelf: ShelfReadModel;
  readonly devotionRecord: DevotionRecordReadModel;
  readonly activeSession: ActiveSessionReadModel;
}

export interface SnapshotCreatedEvent {
  readonly eventType: 'SnapshotCreated';
  readonly eventId: string;
  readonly aggregateId: string; // 'system'
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly snapshotState: SnapshotState; // was `unknown` in Story 1.2
}
```

**Snapshot threshold constant:**

```typescript
// In packages/domain/src/events.ts or a new constants.ts:
export const SNAPSHOT_THRESHOLD = 500 as const;
```

**Projection functions and snapshot support:** The boot sequence in `main.tsx` checks if the latest `SnapshotCreatedEvent` exists in the event log. If so, it initialises projections from the snapshot state directly and only replays events after the snapshot's position. This is a read-path optimisation — projection functions themselves don't change.

```typescript
// In main.tsx boot sequence:
const allEvents = await eventStore.readAll();
const repairedEvents = repairEvents(allEvents, clock, idGenerator);

// Find most recent snapshot (if any)
const lastSnapshot = [...repairedEvents]
  .reverse()
  .find((e): e is SnapshotCreatedEvent => e.eventType === 'SnapshotCreated');

let todoListState: TodoListReadModel;
let shelfState: ShelfReadModel;
let devotionState: DevotionRecordReadModel;
let sessionState: ActiveSessionReadModel;

if (lastSnapshot) {
  // Start from snapshot state, only replay events after snapshot
  const snapshotIndex = repairedEvents.indexOf(lastSnapshot);
  const eventsAfterSnapshot = repairedEvents.slice(snapshotIndex + 1);
  todoListState = eventsAfterSnapshot.reduce(projectTodoList, lastSnapshot.snapshotState.todoList);
  shelfState = eventsAfterSnapshot.reduce(projectShelf, lastSnapshot.snapshotState.shelf);
  devotionState = eventsAfterSnapshot.reduce(projectDevotionRecord, lastSnapshot.snapshotState.devotionRecord);
  sessionState = eventsAfterSnapshot.reduce(projectActiveSession, lastSnapshot.snapshotState.activeSession);
} else {
  // No snapshot — replay entire log from initial state
  todoListState = repairedEvents.reduce(projectTodoList, INITIAL_TODO_LIST_STATE);
  shelfState = repairedEvents.reduce(projectShelf, INITIAL_SHELF_STATE);
  devotionState = repairedEvents.reduce(projectDevotionRecord, INITIAL_DEVOTION_RECORD_STATE);
  sessionState = repairedEvents.reduce(projectActiveSession, INITIAL_ACTIVE_SESSION_STATE);
}
```

### `JsonEventStore` Implementation

The `JsonEventStore` is the **prototype** storage adapter for Epic 1. It uses `localStorage` as a simple JSON append log. It will be replaced by `SqliteEventStore` in Epic 6.

```typescript
// packages/storage/src/JsonEventStore.ts
import type { DomainEvent, EventStore } from '@tododoro/domain';

const STORAGE_KEY = 'tododoro:events';

export class JsonEventStore implements EventStore {
  async append(event: DomainEvent): Promise<void> {
    const existing = this.readFromStorage();
    existing.push(event);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  }

  async readAll(): Promise<ReadonlyArray<DomainEvent>> {
    return this.readFromStorage();
  }

  async readByAggregate(aggregateId: string): Promise<ReadonlyArray<DomainEvent>> {
    return this.readFromStorage().filter(e => e.aggregateId === aggregateId);
  }

  private readFromStorage(): DomainEvent[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as DomainEvent[]) : [];
    } catch {
      return []; // Corrupted JSON — return empty, repair pipeline handles the rest
    }
  }
}
```

**Why `try/catch` in `readFromStorage` returns `[]`:** The repair pipeline (`repairEvents`) handles corruption scenarios, including unknown event types and malformed data. If `localStorage` contains corrupted JSON, returning an empty array is the safe fallback — the user sees an empty canvas rather than a crash (NFR8).

### `JsonEventStore.test.ts`

Testing `localStorage` in Vitest requires a DOM environment. The `packages/storage/vitest.config.ts` should use `environment: 'jsdom'` or `environment: 'happy-dom'`.

```typescript
// packages/storage/src/JsonEventStore.test.ts
import { beforeEach, describe, it, expect } from 'vitest';
import { JsonEventStore } from './JsonEventStore.js';
import type { TodoDeclaredEvent } from '@tododoro/domain';

describe('JsonEventStore', () => {
  let store: JsonEventStore;

  beforeEach(() => {
    localStorage.clear();
    store = new JsonEventStore();
  });

  it('readAll returns empty array when localStorage is empty', async () => {
    expect(await store.readAll()).toEqual([]);
  });

  it('append persists event and readAll returns it', async () => {
    const event: TodoDeclaredEvent = { /* ... */ };
    await store.append(event);
    const events = await store.readAll();
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual(event);
  });

  it('readByAggregate returns only events matching aggregateId', async () => {
    // ... append 3 events; 2 with same aggregateId, 1 different
    // readByAggregate returns only the 2 matching
  });

  it('readAll returns empty array when localStorage contains corrupted JSON', async () => {
    localStorage.setItem('tododoro:events', 'not-valid-json{{{');
    expect(await store.readAll()).toEqual([]);
  });
});
```

### `packages/storage/package.json` Structure

```json
{
  "name": "@tododoro/storage",
  "version": "0.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "dependencies": {
    "@tododoro/domain": "workspace:*"
  }
}
```

**`@tododoro/storage` has ONE dependency:** `@tododoro/domain`. This is the only allowed downward import in the acyclic dependency graph.

### `SystemClock` and `CryptoIdGenerator` — The Boundary of Side Effects

These two classes are the **only** place where `Date.now()` and `crypto.randomUUID()` appear in the entire codebase:

```typescript
// apps/web/src/adapters/SystemClock.ts
import type { Clock } from '@tododoro/domain';

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}

// apps/web/src/adapters/CryptoIdGenerator.ts
import type { IdGenerator } from '@tododoro/domain';

export class CryptoIdGenerator implements IdGenerator {
  generate(): string {
    return crypto.randomUUID();
  }
}
```

These are injected into command handlers and the boot sequence. Domain code, tests, and all projections use `FakeClock` / `FakeIdGenerator` (or `SystemClock` / `CryptoIdGenerator` from the app shell only).

### `apps/web/src/main.tsx` Full Boot Sequence

```typescript
// apps/web/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.js';
import { JsonEventStore } from '@tododoro/storage';
import {
  repairEvents,
  projectTodoList, INITIAL_TODO_LIST_STATE,
  projectShelf, INITIAL_SHELF_STATE,
  projectDevotionRecord, INITIAL_DEVOTION_RECORD_STATE,
  projectActiveSession, INITIAL_ACTIVE_SESSION_STATE,
} from '@tododoro/domain';
import { useCanvasStore } from './stores/useCanvasStore.js';
import { useSessionStore } from './stores/useSessionStore.js';
import { SystemClock } from './adapters/SystemClock.js';
import { CryptoIdGenerator } from './adapters/CryptoIdGenerator.js';

async function bootstrap() {
  const eventStore = new JsonEventStore();
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();

  const allEvents = await eventStore.readAll();
  const repairedEvents = repairEvents(allEvents, clock, idGenerator);

  // Snapshot-aware replay (see Snapshot section above)
  const todoListState = repairedEvents.reduce(projectTodoList, INITIAL_TODO_LIST_STATE);
  const shelfState = repairedEvents.reduce(projectShelf, INITIAL_SHELF_STATE);
  const devotionState = repairedEvents.reduce(projectDevotionRecord, INITIAL_DEVOTION_RECORD_STATE);
  const sessionState = repairedEvents.reduce(projectActiveSession, INITIAL_ACTIVE_SESSION_STATE);

  useCanvasStore.getState().bootstrap(todoListState, shelfState, devotionState);
  useSessionStore.getState().bootstrap(sessionState);
}

bootstrap().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
```

**Why `bootstrap()` runs before `ReactDOM.createRoot`:** The canvas must not render until `isBooting: false` — otherwise React Flow renders with an empty todo list and any `isBooting` guard in `App.tsx` would flash. The `bootstrap()` → `render()` pattern prevents any flash of empty state.

### File Structure — Files Created/Modified

```
.github/
  workflows/
    ci.yml                            ← CREATE

packages/storage/
  package.json                        ← CREATE (or update if it exists)
  tsconfig.json                       ← CREATE (extends root; references domain)
  vitest.config.ts                    ← CREATE (environment: 'jsdom' or 'happy-dom')
  src/
    index.ts                          ← CREATE (export JsonEventStore)
    JsonEventStore.ts                 ← CREATE
    JsonEventStore.test.ts            ← CREATE

packages/domain/src/
  events.ts                           ← UPDATE (SnapshotCreatedEvent.snapshotState type)
  index.ts                            ← UPDATE (export SnapshotState, SNAPSHOT_THRESHOLD)

apps/web/src/
  main.tsx                            ← CREATE/UPDATE (full boot sequence)
  adapters/
    SystemClock.ts                    ← CREATE
    CryptoIdGenerator.ts              ← CREATE
  stores/
    useCanvasStore.ts                 ← CREATE (bootstrap action, isBooting flag)
    useSessionStore.ts                ← CREATE (bootstrap action)
```

**DO NOT create or modify any domain logic files** — Stories 1.2–1.6 are done. This story wires everything together.

### Zustand Store Shapes (Minimal Scaffolds for Boot Sequence)

These stores need at least the `bootstrap` action and `isBooting` field for the boot sequence to work. Full store implementations happen in Epic 2.

```typescript
// apps/web/src/stores/useCanvasStore.ts — MINIMAL scaffold for Story 1.7
import { create } from 'zustand';
import type {
  TodoListReadModel, ShelfReadModel, DevotionRecordReadModel
} from '@tododoro/domain';

interface CanvasStoreState {
  todos: TodoListReadModel;
  shelf: ShelfReadModel;
  devotionRecord: DevotionRecordReadModel;
  isBooting: boolean;
  bootstrap(
    todos: TodoListReadModel,
    shelf: ShelfReadModel,
    devotionRecord: DevotionRecordReadModel
  ): void;
  applyEvent(event: DomainEvent): void; // stubbed for now
}

export const useCanvasStore = create<CanvasStoreState>((set) => ({
  todos: [],
  shelf: [],
  devotionRecord: { records: new Map(), pendingSessions: new Map() },
  isBooting: true,
  bootstrap(todos, shelf, devotionRecord) {
    set({ todos, shelf, devotionRecord, isBooting: false });
  },
  applyEvent(_event) {
    // Full implementation in Epic 2
  },
}));
```

```typescript
// apps/web/src/stores/useSessionStore.ts — MINIMAL scaffold for Story 1.7
import { create } from 'zustand';
import type { ActiveSessionReadModel } from '@tododoro/domain';
import { INITIAL_ACTIVE_SESSION_STATE } from '@tododoro/domain';

interface SessionStoreState {
  activeSession: ActiveSessionReadModel;
  bootstrap(session: ActiveSessionReadModel): void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  activeSession: INITIAL_ACTIVE_SESSION_STATE,
  bootstrap(session) {
    set({ activeSession: session });
  },
}));
```

### TypeScript Conventions

| Rule | Correct | Wrong |
|---|---|---|
| `Date.now()` | Only in `SystemClock.ts` | Anywhere in domain or storage |
| `crypto.randomUUID()` | Only in `CryptoIdGenerator.ts` | Anywhere in domain |
| `localStorage` | Only in `JsonEventStore.ts` | Anywhere in domain |
| Store updates | `useCanvasStore.getState().bootstrap(...)` | `useCanvasStore.setState(...)` directly from main.tsx |
| Import paths | `from '@tododoro/domain'` | `from '../../packages/domain/src/index.js'` |

### Architecture Constraint: Acyclic Package Graph

This story introduces `packages/storage/tsconfig.json`. It MUST reference `packages/domain`:

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "references": [
    { "path": "../domain" }
  ],
  "include": ["src/**/*"]
}
```

This enforces the compile-time acyclic graph: `domain → (nothing)`, `storage → domain`, `apps/web → domain + storage + ui`.

### References

- Story 1.7 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.7]
- CI gate order (D10): [Source: _bmad-output/planning-artifacts/architecture.md#Infrastructure & Deployment — D10]
- Snapshot threshold 500 events (D5): [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — D5]
- `SnapshotCreatedEvent` type: [Source: packages/domain/src/events.ts#SnapshotCreatedEvent]
- `JsonEventStore` as localStorage adapter: [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — packages/storage/src/]
- Boot sequence order: [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns — Event Replay Boot Sequence]
- `EventStore` port interface: [Source: packages/domain/src/ports.ts]
- `Clock` port (SystemClock as the only `Date.now()` caller): [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- Two-store Zustand structure (D7): [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — D7]
- Acyclic package graph via TypeScript project references: [Source: _bmad-output/planning-artifacts/architecture.md#Architectural Boundaries]
- NFR8 (coherent boot from corrupted log): [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]
- NFR10 (atomic event writes before timer): [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]

## Change Log

- 2026-03-11: Implemented Story 1.7 — CI pipeline, SnapshotState typing, JsonEventStore, boot sequence, adapters, and Zustand store scaffolds. All 6 acceptance criteria satisfied.
- 2026-03-11: Code review — Fixed 6 issues: excluded test files from tsconfig compilation (preventing dist/ test duplication), added vitest dist/ exclusion, added bootstrap() error handling in main.tsx, fixed passWithNoTests in storage, added test file coverage exclusion in storage, pinned pnpm CI version. True test count: 145 domain + 8 storage = 153.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed TS2739 errors in 5 test files after typing `SnapshotCreatedEvent.snapshotState` from `unknown` to `SnapshotState` — added `DUMMY_SNAPSHOT_STATE` helper to `testUtils.ts`
- Resolved pnpm store mismatch by adding `store-dir` to `.npmrc`
- Installed `jsdom` for storage tests (localStorage environment) and `zustand` for web app stores

### Completion Notes List

- **Task 1:** Created `.github/workflows/ci.yml` with exact pipeline: install → typecheck → domain test (coverage HARD BLOCK) → all tests → build. Vercel deploy configured via dashboard, not CI YAML.
- **Task 2:** Typed `SnapshotCreatedEvent.snapshotState` as `SnapshotState` (composite of all 4 read model types). Added `SNAPSHOT_THRESHOLD = 500`. Exported both from `@tododoro/domain`. Updated all 5 test files with `DUMMY_SNAPSHOT_STATE` helper. Domain coverage remains 100%.
- **Task 3:** Implemented `JsonEventStore` with `append`, `readAll`, `readByAggregate` using `localStorage` key `tododoro:events`. Added jsdom environment. 8 tests cover all methods plus corrupted JSON and non-array fallbacks.
- **Task 4:** Wired `main.tsx` boot sequence: `readAll() → repairEvents() → project*()` with snapshot-aware replay. Bootstrap populates Zustand stores before React renders.
- **Task 5:** Created `SystemClock` (sole `Date.now()` caller) and `CryptoIdGenerator` (sole `crypto.randomUUID()` caller) as boundary adapters.
- **Task 6:** Verified `turbo build` produces clean production bundle (200KB gzipped 62KB). Domain coverage 100% across all metrics. All 306 tests pass (290 domain + 16 storage).

### File List

**Created:**
- `.github/workflows/ci.yml`
- `packages/storage/src/JsonEventStore.ts`
- `packages/storage/src/JsonEventStore.test.ts`
- `apps/web/src/adapters/SystemClock.ts`
- `apps/web/src/adapters/CryptoIdGenerator.ts`
- `apps/web/src/stores/useCanvasStore.ts`
- `apps/web/src/stores/useSessionStore.ts`

**Modified:**
- `packages/domain/src/events.ts` — added `SnapshotState` interface, `SNAPSHOT_THRESHOLD` constant, typed `snapshotState` field
- `packages/domain/src/index.ts` — exported `SnapshotState`, `SNAPSHOT_THRESHOLD`
- `packages/domain/src/testUtils.ts` — added `DUMMY_SNAPSHOT_STATE` helper
- `packages/domain/src/projections/activeSession.test.ts` — use `DUMMY_SNAPSHOT_STATE`
- `packages/domain/src/projections/devotionRecord.test.ts` — use `DUMMY_SNAPSHOT_STATE`
- `packages/domain/src/projections/shelf.test.ts` — use `DUMMY_SNAPSHOT_STATE`
- `packages/domain/src/projections/todoList.test.ts` — use `DUMMY_SNAPSHOT_STATE`
- `packages/domain/src/repair.test.ts` — use `DUMMY_SNAPSHOT_STATE`
- `packages/storage/src/index.ts` — export `JsonEventStore`
- `packages/storage/vitest.config.ts` — added `environment: 'jsdom'`, dist exclusion, `passWithNoTests: false`, test file coverage exclusion
- `packages/storage/tsconfig.json` — excluded test files from compilation
- `packages/storage/package.json` — added `jsdom` devDependency (via pnpm add)
- `packages/domain/vitest.config.ts` — added dist exclusion from test discovery
- `packages/domain/tsconfig.json` — excluded test/testUtils files from compilation
- `apps/web/src/main.tsx` — full boot sequence with snapshot-aware replay, bootstrap error handling
- `apps/web/package.json` — added `zustand` dependency (via pnpm add)
- `.npmrc` — added `store-dir` for pnpm store consistency
- `pnpm-lock.yaml` — updated with new dependencies
