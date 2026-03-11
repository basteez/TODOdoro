# Story 1.6: Implement Repair Pipeline with Full Test Coverage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the repair pipeline implemented with 100% test coverage covering all documented corruption scenarios,
So that the app always boots coherently regardless of what is in the event log.

## Acceptance Criteria

1. **Given** all aggregates and projections are implemented (Stories 1.3–1.5)
   **When** `packages/domain/src/repair.ts` and `packages/domain/src/repair.test.ts` are created
   **Then** `repairEvents` composes: `deduplicateByEventId`, `upcastEvents`, `skipUnknownEventTypes`, and `autoCloseOrphanedSessions`

2. **And** `deduplicateByEventId` removes exact duplicate events by `eventId`, keeping the first occurrence

3. **And** `upcastEvents` upgrades events from older `schemaVersion` values to the current schema without data loss

4. **And** `skipUnknownEventTypes` silently drops events with unrecognised `eventType` strings and passes through all known types

5. **And** `autoCloseOrphanedSessions` detects `SessionStartedEvent` with no matching completion; if wall-clock elapsed time exceeds `configuredDurationMs`, synthesizes a `SessionCompletedEvent` capped at the configured duration; if within the window, leaves the session open for the UI to resume

6. **And** `repair.test.ts` covers all 6 corruption scenarios: duplicate events, unknown event types, orphaned session within window, orphaned session past window, truncated log, mismatched schemaVersion

7. **And** `pnpm turbo test --filter=@tododoro/domain` reports 100% coverage for `repair.ts`

## Tasks / Subtasks

- [x] Task 1: Implement `deduplicateByEventId` (AC: #2)
  - [x] 1.1 Pure function: `deduplicateByEventId(events: ReadonlyArray<DomainEvent>): ReadonlyArray<DomainEvent>`
  - [x] 1.2 Iterate in order; use a `Set<string>` of seen `eventId` values; keep first occurrence, drop subsequent duplicates
  - [x] 1.3 Test: single event → unchanged; two distinct events → unchanged; exact duplicate → second dropped; two events with same eventId but different content → first kept

- [x] Task 2: Implement `upcastEvents` (AC: #3)
  - [x] 2.1 Pure function: `upcastEvents(events: ReadonlyArray<DomainEvent>): ReadonlyArray<DomainEvent>`
  - [x] 2.2 At `schemaVersion = 1` (current), no upcasting is needed — return events unchanged
  - [x] 2.3 The function's structure must be extensible: future versions add `case 1: return upcastFrom1To2(event)` etc.
  - [x] 2.4 Test: events at `CURRENT_SCHEMA_VERSION` pass through unchanged; events with lower `schemaVersion` (simulate with a raw object) pass through unchanged at v1 (future migration point)

- [x] Task 3: Implement `skipUnknownEventTypes` (AC: #4)
  - [x] 3.1 Pure function: `skipUnknownEventTypes(events: ReadonlyArray<DomainEvent | UnknownEvent>): ReadonlyArray<DomainEvent>`
  - [x] 3.2 Define `UnknownEvent` as a catch-all type: `{ eventType: string; [key: string]: unknown }`
  - [x] 3.3 Use a Set or switch to enumerate all known `eventType` strings from the `DomainEvent` union discriminant
  - [x] 3.4 Test: all 9 known event types pass through; an object with `eventType: 'SomeFutureEvent'` is silently dropped; mixed array keeps only known events

- [x] Task 4: Implement `autoCloseOrphanedSessions` (AC: #5)
  - [x] 4.1 Signature: `autoCloseOrphanedSessions(events: ReadonlyArray<DomainEvent>, clock: Clock, idGenerator: IdGenerator): ReadonlyArray<DomainEvent>`
  - [x] 4.2 Scan events to find all `SessionStartedEvent`s; for each, check if a matching `SessionCompletedEvent` or `SessionAbandonedEvent` exists (same `aggregateId`)
  - [x] 4.3 For each orphaned session (no completion/abandonment found):
    - If `clock.now() - event.timestamp >= event.configuredDurationMs`: synthesize a `SessionCompletedEvent` with `elapsedMs = event.configuredDurationMs` (cap at configured duration) and append it to the events array
    - If `clock.now() - event.timestamp < event.configuredDurationMs`: leave the session open (return events unchanged for this session)
  - [x] 4.4 Test: orphaned session past window → `SessionCompletedEvent` synthesized and appended; orphaned session within window → no change; completed session (has matching completed) → no change; abandoned session (has matching abandoned) → no change

- [x] Task 5: Implement `repairEvents` composer (AC: #1)
  - [x] 5.1 Signature: `repairEvents(events: ReadonlyArray<DomainEvent | UnknownEvent>, clock: Clock, idGenerator: IdGenerator): ReadonlyArray<DomainEvent>`
  - [x] 5.2 Compose in this exact order: `skipUnknownEventTypes` → `deduplicateByEventId` → `upcastEvents` → `autoCloseOrphanedSessions`
  - [x] 5.3 Test: end-to-end scenario with all 4 steps exercised in one pass

- [x] Task 6: Create `repair.test.ts` covering all 6 documented corruption scenarios (AC: #6, #7)
  - [x] 6.1 Scenario 1 — Duplicate events: two `TodoDeclaredEvent` with same `eventId` → only one in output
  - [x] 6.2 Scenario 2 — Unknown event types: `{ eventType: 'LegacyTodoItemAdded', ... }` in log → silently removed
  - [x] 6.3 Scenario 3 — Orphaned session within window: `SessionStartedEvent` with `timestamp = now - 10_000` and `configuredDurationMs = 1_500_000` → no synthesized event; session remains open
  - [x] 6.4 Scenario 4 — Orphaned session past window: `SessionStartedEvent` with `timestamp = now - 2_000_000` and `configuredDurationMs = 1_500_000` → `SessionCompletedEvent` synthesized with `elapsedMs = 1_500_000`
  - [x] 6.5 Scenario 5 — Truncated log: log ends abruptly after `SessionStartedEvent` (no completion) and `clock.now()` is past window → treated same as Scenario 4
  - [x] 6.6 Scenario 6 — Mismatched schemaVersion: events with `schemaVersion = 0` pass through `upcastEvents` unchanged at v1 (no-op upcasting); verifies extensibility structure is in place

- [x] Task 7: Extract shared test utilities to `testUtils.ts` (optional refactor, recommended)
  - [x] 7.1 Create `packages/domain/src/testUtils.ts` (or `packages/domain/src/test/testUtils.ts`) with `FakeClock` and `FakeIdGenerator`
  - [x] 7.2 Update `todo.test.ts`, `session.test.ts`, and `repair.test.ts` to import from the shared file
  - [x] 7.3 Ensure `testUtils.ts` is excluded from the coverage report (add to `vitest.config.ts` exclude list)

- [x] Task 8: Update `packages/domain/src/index.ts`
  - [x] 8.1 Export `repairEvents` and `UnknownEvent` type from `./repair.js`

## Dev Notes

### Composition Order Matters

The `repairEvents` pipeline runs these steps in sequence:

```
Input events (possibly with unknown types)
  │
  ▼
skipUnknownEventTypes    → removes unknown event types FIRST so subsequent steps see only typed DomainEvents
  │
  ▼
deduplicateByEventId     → removes duplicates after unknown types removed (prevents duplicate-but-unknown from skewing dedup)
  │
  ▼
upcastEvents             → upgrades schema versions (operates on clean typed events)
  │
  ▼
autoCloseOrphanedSessions → closes orphaned sessions LAST (needs the full, clean, deduplicated event log to find orphans)
  │
  ▼
Output: ReadonlyArray<DomainEvent> (clean, typed, versioned, sessions closed)
```

**Why this order is non-negotiable:**
- `skipUnknownEventTypes` must be first — subsequent functions rely on TypeScript's type narrowing of `DomainEvent`
- `deduplicateByEventId` before `upcastEvents` — no point upcasting events we'll discard
- `autoCloseOrphanedSessions` last — it needs the full log to correctly identify which sessions are truly orphaned (not just truncated mid-array)

### `UnknownEvent` Type Definition

The storage layer may return events that were written by a future version of the app (forward compatibility). These must be representable in TypeScript without causing type errors:

```typescript
// In repair.ts
export interface UnknownEvent {
  readonly eventType: string;       // not a known DomainEvent discriminant
  readonly eventId: string;
  readonly aggregateId: string;
  readonly schemaVersion: number;
  readonly timestamp: number;
  readonly [key: string]: unknown;  // additional unknown payload fields
}
```

The input to `repairEvents` is `ReadonlyArray<DomainEvent | UnknownEvent>`. After `skipUnknownEventTypes`, the output is `ReadonlyArray<DomainEvent>`.

### `skipUnknownEventTypes` Implementation

```typescript
// Known event types — derived from the DomainEvent discriminated union
const KNOWN_EVENT_TYPES = new Set<string>([
  'TodoDeclared',
  'TodoRenamed',
  'TodoPositioned',
  'TodoSealed',
  'TodoReleased',
  'SessionStarted',
  'SessionCompleted',
  'SessionAbandoned',
  'SnapshotCreated',
]);

export function skipUnknownEventTypes(
  events: ReadonlyArray<DomainEvent | UnknownEvent>
): ReadonlyArray<DomainEvent> {
  return events.filter(
    (event): event is DomainEvent => KNOWN_EVENT_TYPES.has(event.eventType)
  );
}
```

**Why a `Set` and not a `switch`:** A `Set` is O(1) lookup and trivially extensible — just add new event type strings. If you use a `switch`, TypeScript exhaustiveness checking may not apply correctly to `UnknownEvent` inputs.

**The type predicate `(event): event is DomainEvent`** is required to narrow the type from `DomainEvent | UnknownEvent` to `DomainEvent` after filtering.

### `autoCloseOrphanedSessions` Implementation Pattern

```typescript
export function autoCloseOrphanedSessions(
  events: ReadonlyArray<DomainEvent>,
  clock: Clock,
  idGenerator: IdGenerator
): ReadonlyArray<DomainEvent> {
  // Build a set of sessionIds that have been closed
  const closedSessionIds = new Set<string>();
  for (const event of events) {
    if (event.eventType === 'SessionCompleted' || event.eventType === 'SessionAbandoned') {
      closedSessionIds.add(event.aggregateId);
    }
  }

  const synthesized: DomainEvent[] = [];

  for (const event of events) {
    if (event.eventType === 'SessionStarted' && !closedSessionIds.has(event.aggregateId)) {
      // Orphaned session
      const elapsed = clock.now() - event.timestamp;
      if (elapsed >= event.configuredDurationMs) {
        // Past window — synthesize completion capped at configured duration
        synthesized.push({
          eventType: 'SessionCompleted',
          eventId: idGenerator.generate(),
          aggregateId: event.aggregateId,
          schemaVersion: CURRENT_SCHEMA_VERSION,
          timestamp: event.timestamp + event.configuredDurationMs,
          elapsedMs: event.configuredDurationMs, // capped at configured duration
        });
      }
      // Within window — leave open, no synthesized event
    }
  }

  return synthesized.length > 0 ? [...events, ...synthesized] : events;
}
```

**Why `elapsedMs = event.configuredDurationMs` (not actual elapsed):** The session is auto-completed with the configured duration as the canonical elapsed time. This prevents artificially inflating the Devotion Record with wall-clock time that includes the closed browser window. NFR9 says "no user data is silently lost" — capping at the configured duration is the deterministic fallback.

**Why append synthesized events at the end:** The repair pipeline appends synthesized events so the event log remains ordered by original timestamp, with synthesized events coming after. The projections consume events in order, so a synthesized `SessionCompleted` at the end will correctly close the session in `ActiveSessionReadModel` and add the Devotion dot.

### `upcastEvents` Extensibility Pattern

At `schemaVersion = 1`, no migration is needed. However, the structure MUST be in place for Story 1.7 (CI gate requires this):

```typescript
export function upcastEvents(
  events: ReadonlyArray<DomainEvent>
): ReadonlyArray<DomainEvent> {
  return events.map(upcastEvent);
}

function upcastEvent(event: DomainEvent): DomainEvent {
  // At schemaVersion = 1, no migration needed
  // Future versions add:
  // if (event.schemaVersion === 1) return upcastFrom1To2(event);
  return event;
}
```

**Test for `upcastEvents`:** Verify all events pass through unchanged at v1. This confirms the structure is in place even though no migration is active. The test for Scenario 6 (mismatched schemaVersion) must pass an event with `schemaVersion: 0` and verify it passes through `upcastEvents` unchanged (v1 has no migration from 0 → 1 because all initial events are written at v1).

### All 6 Corruption Scenarios — Test Setup Patterns

```typescript
// FakeClock and FakeIdGenerator — NOW extracted to shared testUtils.ts (see Task 7)
import { FakeClock, FakeIdGenerator } from '../testUtils.js'; // or inline if Task 7 skipped

// Helper to build a valid SessionStartedEvent
function makeSessionStarted(overrides: Partial<SessionStartedEvent> = {}): SessionStartedEvent {
  return {
    eventType: 'SessionStarted',
    eventId: 'session-event-1',
    aggregateId: 'session-1',
    schemaVersion: 1,
    timestamp: 1_000_000,
    todoId: 'todo-1',
    configuredDurationMs: 1_500_000, // 25 minutes
    ...overrides,
  };
}

// Scenario 1: Duplicate events
const duplicateLog = [makeSessionStarted(), makeSessionStarted()]; // same eventId
const result1 = deduplicateByEventId(duplicateLog);
expect(result1).toHaveLength(1);

// Scenario 3: Orphaned session within window
const clock3 = new FakeClock(1_000_000 + 10_000); // 10 seconds elapsed, window = 25 min
const log3 = [makeSessionStarted({ timestamp: 1_000_000, configuredDurationMs: 1_500_000 })];
const result3 = autoCloseOrphanedSessions(log3, clock3, new FakeIdGenerator());
expect(result3).toHaveLength(1); // no synthesized event

// Scenario 4: Orphaned session past window
const clock4 = new FakeClock(1_000_000 + 2_000_000); // 2000s elapsed, window = 25 min = 1500s
const log4 = [makeSessionStarted({ timestamp: 1_000_000, configuredDurationMs: 1_500_000 })];
const result4 = autoCloseOrphanedSessions(log4, clock4, new FakeIdGenerator());
expect(result4).toHaveLength(2);
const synthesized = result4[1];
expect(synthesized.eventType).toBe('SessionCompleted');
expect((synthesized as SessionCompletedEvent).elapsedMs).toBe(1_500_000);
```

### Shared `testUtils.ts` — Recommended Extraction

Story 1.3 created `FakeClock` and `FakeIdGenerator` inline. Story 1.4 copied them. By Story 1.6, having them in 3 files is duplication. Extract now:

```typescript
// packages/domain/src/testUtils.ts
// NOTE: This file is test-only infrastructure — excluded from coverage gate

export class FakeClock {
  private _now: number;
  constructor(now = 1_000_000) { this._now = now; }
  now(): number { return this._now; }
  advance(ms: number): void { this._now += ms; }
  set(now: number): void { this._now = now; }
}

export class FakeIdGenerator {
  private _counter = 0;
  generate(): string { return `test-id-${++this._counter}`; }
}
```

Update `packages/domain/vitest.config.ts` to exclude `testUtils.ts` from coverage:

```typescript
coverage: {
  exclude: ['src/testUtils.ts', '**/*.test.ts', 'src/ports.ts'],
  // ... existing excludes
}
```

**Updating `todo.test.ts` and `session.test.ts` is optional** but recommended for consistency. The dev agent for this story can choose to leave them inline if refactoring feels risky.

### File Structure — Only These Files Are Created/Modified

```
packages/domain/src/
  repair.ts           ← CREATE (UnknownEvent, deduplicateByEventId, upcastEvents,
                               skipUnknownEventTypes, autoCloseOrphanedSessions, repairEvents)
  repair.test.ts      ← CREATE (all 6 corruption scenarios + unit tests per function)
  testUtils.ts        ← CREATE (optional but recommended: FakeClock, FakeIdGenerator)
  index.ts            ← UPDATE (add exports for repairEvents, UnknownEvent)
```

**DO NOT create or modify:**
- Any file in `projections/` — Story 1.5 is done
- `todo.ts`, `session.ts` — done
- `events.ts`, `ports.ts` — done

### Vitest Coverage Config Check

The `vitest.config.ts` must exclude `testUtils.ts` from the coverage report. Failing to do so will result in 100% branches not being reported (because `testUtils.ts` has no branches to test):

```typescript
// packages/domain/vitest.config.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  thresholds: { lines: 100, functions: 100, branches: 100, statements: 100 },
  exclude: [
    'src/ports.ts',         // interface-only, no runtime branches
    'src/testUtils.ts',     // test infrastructure
    '**/*.test.ts',
  ],
}
```

### TypeScript Conventions

| Rule | Correct | Wrong |
|---|---|---|
| File name | `repair.ts` (camelCase, pure functions) | `Repair.ts` |
| Type guard | `(event): event is DomainEvent => ...` | `event as DomainEvent` |
| Immutability | `[...events, synthesized]` | `events.push(synthesized)` |
| Error returns | `return new Error(...)` (in aggregates only) | repair functions don't return errors — they repair silently |
| Known types set | `new Set<string>([...])` | Hard-coded array of strings with includes() |

### Index.ts Update

```typescript
// Add to packages/domain/src/index.ts:

export type { UnknownEvent } from './repair.js';
export { repairEvents, deduplicateByEventId, upcastEvents, skipUnknownEventTypes, autoCloseOrphanedSessions } from './repair.js';
```

Exporting the individual functions allows testing them in isolation from `apps/web` and from Story 1.7's `JsonEventStore.test.ts`.

### References

- Story 1.6 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6]
- Repair pipeline composition: [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — Boot sequence]
- `autoCloseOrphanedSessions` behavior: [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — D5 Snapshot Threshold (orphan close)]
- `repairEvents` called on every boot: [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Boot sequence]
- NFR8 (100% coherent boot): [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]
- NFR9 (no silent data loss, deterministic fallback): [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]
- `CURRENT_SCHEMA_VERSION`: [Source: packages/domain/src/events.ts#CURRENT_SCHEMA_VERSION]
- Session orphan detection (FR19, FR20): [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5, Story 3.6]
- FakeClock pattern: [Source: _bmad-output/implementation-artifacts/1-3-implement-todo-aggregate-with-full-test-coverage.md#FakeClock and FakeIdGenerator Test Utilities]
- `exactOptionalPropertyTypes` (null not optional): [Source: _bmad-output/implementation-artifacts/1-3-implement-todo-aggregate-with-full-test-coverage.md#TypeScript Conventions]
- Coverage gate config: [Source: packages/domain/vitest.config.ts]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered. All tests passed on first run with 100% coverage.

### Completion Notes List

- Implemented all 5 repair pipeline functions as pure functions in `repair.ts`: `deduplicateByEventId`, `upcastEvents`, `skipUnknownEventTypes`, `autoCloseOrphanedSessions`, `repairEvents`
- Defined `UnknownEvent` interface for forward compatibility with future event types
- Pipeline composition order: skipUnknown → deduplicate → upcast → autoClose (as specified in Dev Notes)
- Created 28 tests in `repair.test.ts` covering all 6 documented corruption scenarios plus unit tests per function (26 original + 2 added during code review)
- Extracted `FakeClock` and `FakeIdGenerator` to shared `testUtils.ts`, updated `todo.test.ts`, `session.test.ts`, and `repair.test.ts` to import from shared file
- Added `testUtils.ts` to vitest coverage exclusion list
- Exported `repairEvents`, individual functions, and `UnknownEvent` type from `index.ts`
- All 145 tests pass (28 new + 117 existing), 100% coverage maintained

### File List

- `packages/domain/src/repair.ts` — CREATED (repair pipeline functions + UnknownEvent type)
- `packages/domain/src/repair.test.ts` — CREATED (28 tests: unit tests + 6 corruption scenarios + 2 review fixes)
- `packages/domain/src/testUtils.ts` — CREATED (shared FakeClock + FakeIdGenerator)
- `packages/domain/src/index.ts` — MODIFIED (added repair pipeline exports)
- `packages/domain/src/todo.test.ts` — MODIFIED (import FakeClock/FakeIdGenerator from testUtils)
- `packages/domain/src/session.test.ts` — MODIFIED (import FakeClock/FakeIdGenerator from testUtils)
- `packages/domain/vitest.config.ts` — MODIFIED (added testUtils.ts to coverage exclusion)

## Change Log

- 2026-03-11: Implemented repair pipeline with full test coverage (Story 1.6). Created `repair.ts` with 5 pure functions composing the event repair pipeline. All 6 documented corruption scenarios tested. Extracted shared test utilities to `testUtils.ts`. 100% code coverage maintained.
- 2026-03-11: Code review fixes — Made Scenario 5 (truncated log) a distinct multi-event test, added multi-session test for `autoCloseOrphanedSessions`, added upcast step exercise to `repairEvents` E2E test. Tests: 26 → 28, all passing with 100% coverage.
