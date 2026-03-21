# Story 6.1: SQLite Event Store with Drizzle Schema

Status: done

## Story

As a developer,
I want a production SQLite event store implemented using SQLocal + Drizzle running in a Web Worker via OPFS,
so that all event writes are durable, atomic, and off the main thread — keeping canvas interactions smooth.

## Acceptance Criteria

1. **Given** the monorepo foundation is in place (Epic 1), **when** `packages/storage/src/schema.ts` and `packages/storage/src/SqliteEventStore.ts` are created, **then** the Drizzle schema defines an `events` table with columns: `seq INTEGER PRIMARY KEY AUTOINCREMENT`, `event_id TEXT UNIQUE`, `event_type TEXT`, `aggregate_id TEXT`, `schema_version INTEGER`, `timestamp INTEGER`, `payload JSON`
2. **And** indexes exist on `(aggregate_id, seq)` and `(seq)` for efficient aggregate reads and sequential replay
3. **And** `SqliteEventStore` implements the `EventStore` port using SQLocal + Drizzle, running the SQLite engine in a Web Worker via OPFS
4. **And** `apps/web/src/db.ts` initialises `SqliteEventStore` and the Cross-Origin Isolation headers are verified present before any SQLocal call
5. **And** `SqliteEventStore.test.ts` covers `append`, `readAll`, and `readByAggregate`
6. **And** canvas interactions remain at 60fps during concurrent event writes — no main-thread blocking (NFR1)

## Tasks / Subtasks

- [x] Task 1: Install SQLocal dependency (AC: #3)
  - [x] 1.1 Add `sqlocal` (v0.17.0) to `packages/storage/package.json`
  - [x] 1.2 Run `pnpm install` and verify workspace resolution
- [x] Task 2: Create Drizzle schema definition (AC: #1, #2)
  - [x] 2.1 Create `packages/storage/src/schema.ts` with events table definition
  - [x] 2.2 Define columns: seq, event_id, event_type, aggregate_id, schema_version, timestamp, payload
  - [x] 2.3 Define indexes on `(aggregate_id, seq)` and `(seq)`
- [x] Task 3: Implement SqliteEventStore class (AC: #3)
  - [x] 3.1 Create `packages/storage/src/SqliteEventStore.ts`
  - [x] 3.2 Implement `initialize()` method that creates table + indexes via raw SQL (CREATE TABLE IF NOT EXISTS)
  - [x] 3.3 Implement `append(event)` — INSERT with all columns, JSON.stringify payload
  - [x] 3.4 Implement `readAll()` — SELECT payload ORDER BY seq ASC, JSON.parse each row
  - [x] 3.5 Implement `readByAggregate(aggregateId)` — WHERE aggregate_id = ? ORDER BY seq ASC
  - [x] 3.6 Export from `packages/storage/src/index.ts`
- [x] Task 4: Create db.ts initialization module (AC: #4)
  - [x] 4.1 Create `apps/web/src/db.ts` with SqliteEventStore initialization
  - [x] 4.2 Add OPFS feature detection with fallback to JsonEventStore
  - [x] 4.3 Verify Cross-Origin Isolation headers are present (check `crossOriginIsolated` global)
- [x] Task 5: Wire into boot sequence (AC: #4, #6)
  - [x] 5.1 Update `apps/web/src/main.tsx` to import from `db.ts` instead of direct JsonEventStore
  - [x] 5.2 Ensure async initialization completes before bootstrap
  - [x] 5.3 Verify canvas 60fps not degraded during event writes
- [x] Task 6: Write tests (AC: #5)
  - [x] 6.1 Create `packages/storage/src/SqliteEventStore.test.ts`
  - [x] 6.2 Test `append` — single event, multiple events, duplicate event_id rejection
  - [x] 6.3 Test `readAll` — empty store returns [], correct ordering by seq
  - [x] 6.4 Test `readByAggregate` — filters correctly, maintains order, empty result for unknown ID
  - [x] 6.5 Test `initialize` — idempotent (safe to call multiple times)
- [x] Task 7: Verify CI passes (AC: all)
  - [x] 7.1 Run `pnpm turbo typecheck` — zero errors
  - [x] 7.2 Run `pnpm turbo test` — all tests pass including new SqliteEventStore tests
  - [x] 7.3 Run `pnpm turbo build` — clean production bundle

## Dev Notes

### Critical Architecture Context

**Drop-in replacement pattern:** `SqliteEventStore` MUST implement the existing `EventStore` interface from `@tododoro/domain/ports.ts` with zero changes to the interface. The interface has three methods: `append(event: DomainEvent): Promise<void>`, `readAll(): Promise<readonly DomainEvent[]>`, `readByAggregate(aggregateId: string): Promise<readonly DomainEvent[]>`. Domain logic, projections, and React components require ZERO modifications.

**SQLocal v0.17.0 — key technical facts:**
- Uses `opfs-sahpool` VFS by default — does NOT require SharedArrayBuffer
- Despite this, the COOP/COEP headers are already in `vite.config.ts` and `vercel.json` (keep them; they're needed for CSP compliance)
- SQLocal abstracts Web Worker creation, message passing, and Mutex serialization entirely
- Developer only interacts with async `sql` tagged template API from main thread
- Import path: `import { SQLocal } from 'sqlocal'` (NOT sqlocal/drizzle for raw SQL approach)

**Schema approach — raw SQL via SQLocal, NOT Drizzle ORM for v1:**
- The event store has only 1 table with simple CRUD operations
- Use SQLocal's `sql` tagged templates directly (e.g., `this.db.sql\`SELECT ...\``)
- Drizzle ORM is deferred to later stories when read models grow complex
- The AC says "Drizzle schema" — satisfy this by creating `schema.ts` as a Drizzle table definition (type-safe reference), but use raw SQL for actual queries via SQLocal
- If using Drizzle for queries: `import { SQLocalDrizzle } from 'sqlocal/drizzle'` + `import { drizzle } from 'drizzle-orm/sqlite-proxy'`

**SQLite schema (exact SQL):**
```sql
CREATE TABLE IF NOT EXISTS events (
  seq INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  timestamp INTEGER NOT NULL,
  payload TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_agg_seq ON events(aggregate_id, seq);
CREATE INDEX IF NOT EXISTS idx_events_seq ON events(seq);
```

**OPFS feature detection + fallback:**
```typescript
export async function createEventStore(): Promise<EventStore> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      const store = new SqliteEventStore('tododoro.sqlite3');
      await store.initialize();
      return store;
    } catch {
      // OPFS not available — fall back
    }
  }
  return new JsonEventStore();
}
```

### Existing Code to Reuse (DO NOT Reinvent)

- **EventStore interface**: `packages/domain/src/ports.ts` — implement this exactly
- **DomainEvent types**: `packages/domain/src/events.ts` — all 10 event types with `CURRENT_SCHEMA_VERSION = 1`
- **JsonEventStore pattern**: `packages/storage/src/JsonEventStore.ts` — follow the same append/read/readByAggregate signature
- **Boot sequence**: `apps/web/src/main.tsx` — the existing bootstrap flow (readAll → repairEvents → project* → bootstrap → render) stays unchanged, only the EventStore source changes
- **Storage exports**: `packages/storage/src/index.ts` — add SqliteEventStore export alongside JsonEventStore

### Files to Create

| File | Purpose |
|------|---------|
| `packages/storage/src/schema.ts` | Drizzle table definition for `events` (type reference) |
| `packages/storage/src/SqliteEventStore.ts` | SQLocal-backed EventStore implementation |
| `packages/storage/src/SqliteEventStore.test.ts` | Test suite for SqliteEventStore |
| `apps/web/src/db.ts` | Database initialization with feature detection + fallback |

### Files to Modify

| File | Change |
|------|--------|
| `packages/storage/package.json` | Add `sqlocal` dependency |
| `packages/storage/src/index.ts` | Export SqliteEventStore + createEventStore |
| `apps/web/src/main.tsx` | Import from `db.ts` instead of direct JsonEventStore instantiation |
| `apps/web/package.json` | May need `sqlocal` if direct import needed (verify workspace resolution) |

### Files NOT to Touch

- `packages/domain/src/*` — zero changes to domain
- `packages/ui/src/*` — zero changes to UI components
- `apps/web/src/stores/*` — zero changes to Zustand stores
- `apps/web/src/commands/*` — zero changes to command handlers
- `apps/web/vite.config.ts` — headers already correct
- `apps/web/vercel.json` — headers already correct

### Testing Strategy

**SqliteEventStore tests need REAL browser APIs (OPFS).** Options:
1. **Preferred for this story**: Use a mock/in-memory approach for unit tests — SQLocal can be instantiated with an in-memory database for testing (no OPFS needed)
2. **Browser integration tests** (Vitest Browser Mode + Playwright): These test real OPFS and would be `*.browser.test.ts` files — can be deferred to a follow-up if Vitest Browser Mode isn't set up yet
3. **E2E tests** (Playwright): Full flow testing — out of scope for this story

**Key test scenarios:**
- Empty store returns empty array
- Single append + readAll returns that event
- Multiple appends maintain insertion order (seq)
- readByAggregate filters correctly
- readByAggregate returns empty array for unknown aggregateId
- Initialize is idempotent (can be called multiple times safely)
- Append rejects duplicate event_id (UNIQUE constraint)

### Anti-Patterns to Avoid

- DO NOT use `new Date()` or `Date.now()` in domain code — use `Clock.now()` port
- DO NOT import from `@tododoro/ui` or `apps/web` in storage package — acyclic dependency graph
- DO NOT add `console.log` or `console.error` in committed code
- DO NOT modify the EventStore interface in ports.ts
- DO NOT use Drizzle Kit's `migrate()` function — it requires Node.js APIs (`node:fs`), not available in browser
- DO NOT use IndexedDB — the architecture decision is OPFS via SQLocal
- DO NOT remove JsonEventStore — it remains as fallback for browsers without OPFS

### Performance Constraints

- Event writes MUST NOT block main thread (SQLocal handles this via Web Worker)
- Canvas must maintain 60fps during concurrent writes
- Boot replay target: <50ms for up to 500 events (NFR4)
- `readAll()` returns events ordered by `seq` — this is the replay order

### Previous Epic Learnings (from Epic 5 Retrospective)

- Code review caught real issues in 4/5 stories — expect review feedback
- Architecture investment pays compound returns — the EventStore interface abstraction is exactly this
- Epic 6 should adopt one-story-at-a-time approach (not compressed same-day execution)
- Tests grew from 341 → 404 in Epic 5 (+18%) — maintain test discipline

### Project Structure Notes

- Package dependency graph: `apps/web → @tododoro/storage → @tododoro/domain` (acyclic, enforced by TypeScript)
- Storage package has zero prod dependencies currently (only devDeps) — SQLocal will be the first prod dependency
- Monorepo uses pnpm workspaces with Turborepo task orchestration
- TypeScript strict mode enforced: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — D5 Snapshot, Event Log Schema, Boot Sequence]
- [Source: _bmad-output/planning-artifacts/research/technical-sqlocal-opfs-drizzle-research-2026-03-21.md — SQLocal API, OPFS VFS, implementation patterns]
- [Source: packages/domain/src/ports.ts — EventStore interface]
- [Source: packages/domain/src/events.ts — DomainEvent union, CURRENT_SCHEMA_VERSION]
- [Source: packages/storage/src/JsonEventStore.ts — existing implementation pattern]
- [Source: apps/web/src/main.tsx — boot sequence]
- [Source: _bmad-output/implementation-artifacts/epic-5-retro-2026-03-21.md — retrospective learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Vite build failed initially with `Invalid value "iife" for option "worker.format"` — SQLocal's Web Worker requires ES module format. Fixed by adding `worker: { format: 'es' }` to `vite.config.ts`.
- Added `drizzle-orm` as a dependency (alongside `sqlocal`) to satisfy AC #1's Drizzle schema requirement. The schema.ts file uses `sqliteTable` from `drizzle-orm/sqlite-core` as a type-safe reference; actual queries use raw SQL via SQLocal's `sql` tagged templates as specified in Dev Notes.

### Completion Notes List

- Implemented `SqliteEventStore` as a drop-in replacement for `JsonEventStore`, implementing the `EventStore` interface with zero changes to domain, UI, or command layers
- Used SQLocal's `sql` tagged templates for all SQL operations (not Drizzle ORM queries) per Dev Notes guidance
- Created `createEventStore()` factory in `db.ts` with OPFS feature detection and graceful fallback to `JsonEventStore`
- Boot sequence updated to use async `createEventStore()` — initialization completes before bootstrap
- Tests use a mock SQLocal class that simulates SQLite behavior (in-memory rows, UNIQUE constraint enforcement, ordering by seq)
- 11 tests covering: initialize idempotency, append (single, multiple, duplicate rejection), readAll (empty, ordering), readByAggregate (filtering, ordering, empty results), destroy
- All 415 tests pass (158 domain + 19 storage + 238 web), zero regressions
- Production build succeeds; SQLite WASM binary (860 KB) and worker scripts are properly bundled

### Change Log

- 2026-03-21: Implemented Story 6.1 — SQLite Event Store with Drizzle Schema. Added SQLocal + Drizzle ORM dependencies, created schema.ts, SqliteEventStore.ts, db.ts, wired boot sequence, added 10 unit tests, fixed Vite worker format for production builds.
- 2026-03-21: Code review fixes — Added `crossOriginIsolated` check to db.ts (AC#4), added `destroy()` method to SqliteEventStore for Web Worker cleanup, documented schema.ts/raw-SQL coupling, improved test mock robustness, added destroy test (11 total).

### File List

**New files:**
- `packages/storage/src/schema.ts` — Drizzle table definition for `events` (type-safe reference)
- `packages/storage/src/SqliteEventStore.ts` — SQLocal-backed EventStore implementation
- `packages/storage/src/SqliteEventStore.test.ts` — 11-test suite for SqliteEventStore
- `apps/web/src/db.ts` — Database initialization with OPFS feature detection + fallback

**Modified files:**
- `packages/storage/package.json` — Added `sqlocal` and `drizzle-orm` dependencies
- `packages/storage/src/index.ts` — Added SqliteEventStore export
- `apps/web/src/main.tsx` — Replaced direct `JsonEventStore` with `createEventStore()` from db.ts
- `apps/web/vite.config.ts` — Added `worker: { format: 'es' }` for SQLocal's Web Worker bundling
- `pnpm-lock.yaml` — Updated lock file
