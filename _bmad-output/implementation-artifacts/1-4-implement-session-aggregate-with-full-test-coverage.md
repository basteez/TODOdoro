# Story 1.4: Implement Session Aggregate with Full Test Coverage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the Session aggregate (reducer + decision functions) implemented with 100% test coverage,
So that the 60-second abandonment threshold, Exploration sessions, and all session state transitions are correctly modeled before any UI is written.

## Acceptance Criteria

1. **Given** domain event types and ports are defined (Story 1.2)
   **When** `packages/domain/src/session.ts` and `packages/domain/src/session.test.ts` are created
   **Then** `session.ts` exports `SessionState`, `reduceSession`, `startSession`, `completeSession`, and `abandonSession`

2. **And** `startSession` accepts `todoId: string | null` (null for Exploration sessions)

3. **And** only one session can be active at a time — `startSession` returns `Error` if a session is already active

4. **And** the domain records `SessionAbandonedEvent` (with `elapsedMs` < 60000) and `SessionCompletedEvent` (with `elapsedMs` ≥ 60000); the 60-second threshold is enforced by the command handler, not the domain decision functions

5. **And** all decision functions are pure: `(state, input) => DomainEvent | Error`; never throw; never call `Date.now()` directly (use the `Clock` port)

6. **And** `pnpm turbo test --filter=@tododoro/domain` reports 100% line, function, and branch coverage for `session.ts`

## Tasks / Subtasks

- [x] Task 1: Define `SessionState` type and `reduceSession` reducer (AC: #1, #5)
  - [x] 1.1 Define `SessionState` as a discriminated union: `'idle' | 'active'`
  - [x] 1.2 Implement `reduceSession(state: SessionState, event: DomainEvent): SessionState` — handles `SessionStarted`, `SessionCompleted`, `SessionAbandoned`; ignores non-session events
  - [x] 1.3 Define `INITIAL_SESSION_STATE: SessionState = { status: 'idle' }`

- [x] Task 2: Implement all 3 decision functions (AC: #2, #3, #4, #5)
  - [x] 2.1 `startSession(state: SessionState, todoId: string | null, configuredDurationMs: number, clock: Clock, idGenerator: IdGenerator): SessionStartedEvent | Error`
  - [x] 2.2 `completeSession(state: SessionState, clock: Clock, idGenerator: IdGenerator): SessionCompletedEvent | Error`
  - [x] 2.3 `abandonSession(state: SessionState, clock: Clock, idGenerator: IdGenerator): SessionAbandonedEvent | Error`

- [x] Task 3: Create `session.test.ts` with 100% coverage (AC: #6)
  - [x] 3.1 Define `FakeClock` and `FakeIdGenerator` inline in `session.test.ts` (copy pattern from `todo.test.ts`)
  - [x] 3.2 Test `reduceSession`: `SessionStarted` transitions to active; `SessionCompleted` and `SessionAbandoned` return to idle; non-session events ignored
  - [x] 3.3 Test `startSession`: success case with `todoId`; success case with `todoId: null` (Exploration); error when session already active
  - [x] 3.4 Test `completeSession`: success when active (elapsed ≥ 60s); error when idle
  - [x] 3.5 Test `abandonSession`: success when active (elapsed < 60s); error when idle
  - [x] 3.6 Verify boundary: elapsed exactly 60000ms → `completeSession` succeeds; elapsed 59999ms → `abandonSession` enforced
  - [x] 3.7 Run `pnpm turbo test --filter=@tododoro/domain -- --coverage` and verify 100% output

- [x] Task 4: Update `packages/domain/src/index.ts` to export new types (AC: #1)
  - [x] 4.1 Add `export type { SessionState }` and `export { reduceSession, startSession, completeSession, abandonSession, INITIAL_SESSION_STATE }` from `./session.js`

## Dev Notes

### `SessionState` Type Shape (MUST use this exact discriminated union)

```typescript
// packages/domain/src/session.ts

export type SessionState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'active';
      readonly sessionId: string;
      readonly todoId: string | null; // null = Exploration session
      readonly startedAt: number; // ms since epoch (clock.now() at SessionStarted)
      readonly configuredDurationMs: number;
    };

export const INITIAL_SESSION_STATE: SessionState = { status: 'idle' };
```

**Why `todoId: string | null` and NOT optional:** `exactOptionalPropertyTypes: true` is enforced across all packages. Optional properties (`?:`) are explicitly forbidden in domain types. An Exploration session has `todoId: null` — this is intentional presence of absence, not a missing field. This pattern follows exactly what Story 1.2 established for `SessionStartedEvent.todoId`.

### Decision Function Signatures (exact shapes)

```typescript
import type { Clock, IdGenerator } from './ports.js';
import type { SessionStartedEvent, SessionCompletedEvent, SessionAbandonedEvent } from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';

export function startSession(
  state: SessionState,
  todoId: string | null,
  configuredDurationMs: number,
  clock: Clock,
  idGenerator: IdGenerator
): SessionStartedEvent | Error

export function completeSession(
  state: SessionState,
  clock: Clock,
  idGenerator: IdGenerator
): SessionCompletedEvent | Error

export function abandonSession(
  state: SessionState,
  clock: Clock,
  idGenerator: IdGenerator
): SessionAbandonedEvent | Error
```

**`startSession` takes `configuredDurationMs`:** The session command handler reads the configured timer duration from `useCanvasStore` settings and passes it in. This keeps the function pure and decoupled from any global state. The architecture specifies that durations always use the `Ms` suffix.

**`completeSession` and `abandonSession` do NOT enforce the 60-second threshold:** The domain's responsibility is to record what happened. The session command handler (in `apps/web/src/commands/sessionCommands.ts`) is responsible for calling the correct function based on elapsed time. The domain enforces that you can't complete/abandon when there's no active session — not when the threshold is hit.

> **Design intent note:** The 60s threshold check belongs in the command handler (imperative shell), not the domain. The domain's job is the state machine: idle ↔ active. This keeps `completeSession` and `abandonSession` symmetric and simple.

### `reduceSession` Implementation Pattern

```typescript
export function reduceSession(state: SessionState, event: DomainEvent): SessionState {
  switch (event.eventType) {
    case 'SessionStarted':
      if (state.status !== 'idle') return state; // defensive — ignore duplicate start
      return {
        status: 'active',
        sessionId: event.aggregateId,
        todoId: event.todoId,
        startedAt: event.timestamp,
        configuredDurationMs: event.configuredDurationMs,
      };
    case 'SessionCompleted':
    case 'SessionAbandoned':
      if (state.status !== 'active') return state; // defensive
      return { status: 'idle' };
    default:
      return state; // All non-session events (TodoDeclared, SnapshotCreated, etc.) are ignored
  }
```

**Why the `default: return state` pattern is required for 100% coverage:** The `reduceSession` function receives events from the full mixed event log. Every non-session event (`TodoDeclared`, `TodoPositioned`, etc.) must reach the `default` branch. Without testing this branch explicitly, coverage will be < 100%. Always add a test that passes a `TodoDeclaredEvent` (or similar) to `reduceSession` to exercise the `default` path.

### Error Return Patterns

```typescript
// startSession — already active
if (state.status !== 'idle') {
  return new Error('Cannot start session: a session is already active');
}

// completeSession / abandonSession — not active
if (state.status !== 'active') {
  return new Error('Cannot complete session: no active session');
}
if (state.status !== 'active') {
  return new Error('Cannot abandon session: no active session');
}
```

**Architecture rule enforced:** Return `new Error(...)` — never `throw`. Never use custom Error subclasses. This is the same contract established in Story 1.3.

### `elapsedMs` Calculation in `completeSession` and `abandonSession`

```typescript
export function completeSession(state: SessionState, clock: Clock, idGenerator: IdGenerator): SessionCompletedEvent | Error {
  if (state.status !== 'active') {
    return new Error('Cannot complete session: no active session');
  }
  const elapsedMs = clock.now() - state.startedAt;
  return {
    eventType: 'SessionCompleted',
    eventId: idGenerator.generate(),
    aggregateId: state.sessionId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: clock.now(),
    elapsedMs,
  };
}
```

**Important:** `elapsedMs` is derived from `clock.now() - state.startedAt`. The `FakeClock.advance(ms)` method from Story 1.3 is what enables testing this without `Date.now()`.

### `FakeClock` and `FakeIdGenerator` — Copy from `todo.test.ts`

```typescript
// In packages/domain/src/session.test.ts — define inline, NOT imported

class FakeClock {
  private _now: number;
  constructor(now = 1_000_000) { this._now = now; }
  now(): number { return this._now; }
  advance(ms: number): void { this._now += ms; }
}

class FakeIdGenerator {
  private _counter = 0;
  generate(): string { return `test-id-${++this._counter}`; }
}
```

**Why inline, not shared:** Story 1.3 completion notes explicitly state these should remain inline per story. A shared `testUtils.ts` may be extracted in Story 1.6 once the pattern is established across multiple test files.

### 60-Second Boundary Tests (Critical for 100% Branch Coverage)

The 60-second check does NOT live in the domain decision functions — the command handler enforces it. However, the test suite MUST verify `elapsedMs` values by controlling `FakeClock`:

```typescript
// Test: completeSession records correct elapsedMs for ≥60s sessions
const clock = new FakeClock(1_000_000);
const state = reduceSession(INITIAL_SESSION_STATE, {
  eventType: 'SessionStarted', aggregateId: 'session-1', eventId: 'e-1',
  schemaVersion: 1, timestamp: clock.now(), todoId: null, configuredDurationMs: 1_500_000
});
clock.advance(60_000); // exactly 60 seconds
const result = completeSession(state, clock, new FakeIdGenerator());
// result should be SessionCompletedEvent with elapsedMs: 60_000

// Test: abandonSession records correct elapsedMs for <60s sessions
const clock2 = new FakeClock(1_000_000);
const state2 = /* same SessionStarted setup */;
clock2.advance(59_999); // 1ms under threshold
const result2 = abandonSession(state2, clock2, new FakeIdGenerator());
// result2 should be SessionAbandonedEvent with elapsedMs: 59_999
```

### Coverage Gate Requirements

The `vitest.config.ts` in `packages/domain/` requires 100% across lines, functions, branches, and statements for all covered files.

**Branches that MUST be covered in `session.ts`:**
- `reduceSession` `default` branch (test with `TodoDeclaredEvent`)
- `reduceSession` `SessionStarted` when `state.status !== 'idle'` (duplicate start guard)
- `reduceSession` `SessionCompleted` when `state.status !== 'active'` (defensive guard)
- `startSession` error path: session already active
- `completeSession` error path: no active session
- `abandonSession` error path: no active session
- `startSession` with `todoId: null` (Exploration) vs `todoId: string` (linked)

**Missing branches that fail 100% gate (most common mistakes):**
- Forgetting to test `reduceSession` when `SessionCompleted` arrives on an `idle` state
- Forgetting to test the `default` branch with a non-session event
- Forgetting the `SessionStarted` defensive guard (when state is already `active`)

### File Structure — Only These Files Are Created/Modified

```
packages/domain/src/
  session.ts          ← CREATE (SessionState, INITIAL_SESSION_STATE, reduceSession,
                               startSession, completeSession, abandonSession)
  session.test.ts     ← CREATE (FakeClock, FakeIdGenerator inline; all test cases)
  index.ts            ← UPDATE (add exports for SessionState, INITIAL_SESSION_STATE,
                               reduceSession, startSession, completeSession, abandonSession)
```

**DO NOT create:**
- `projections/` directory — that is Story 1.5
- `repair.ts` — that is Story 1.6
- Any command handlers — those live in `apps/web/src/commands/` and are Story 1.7+

**DO NOT modify:**
- `events.ts` — types are already complete (Story 1.2 is done)
- `ports.ts` — interfaces are already complete (Story 1.2 is done)
- `todo.ts` / `todo.test.ts` — Story 1.3 is done

### TypeScript Conventions

| Rule | Correct | Wrong |
|---|---|---|
| File name | `session.ts` (camelCase, pure functions) | `Session.ts` (PascalCase is for classes/components) |
| Test file | `session.test.ts` (co-located) | `session.spec.ts` or `__tests__/session.ts` |
| Import ext | `from './events.js'` | `from './events'` |
| Timestamps | `clock.now()` | `Date.now()` |
| Event IDs | `idGenerator.generate()` | `crypto.randomUUID()` directly |
| Errors | `return new Error(...)` | `throw new Error(...)` |
| Optional fields | Never — use `null` | `todoId?: string` — blocked by `exactOptionalPropertyTypes` |
| State | Discriminated union | Flat interface with status string field only |

### Import Pattern in `session.ts`

```typescript
import type { DomainEvent, SessionStartedEvent, SessionCompletedEvent, SessionAbandonedEvent } from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';
import type { Clock, IdGenerator } from './ports.js';
```

### Index.ts Update

```typescript
// Add to packages/domain/src/index.ts after existing exports:

export type { SessionState } from './session.js';
export { reduceSession, startSession, completeSession, abandonSession, INITIAL_SESSION_STATE } from './session.js';
```

### Architecture Constraint: Zero Production Dependencies

`packages/domain/package.json` must still have zero `"dependencies"` entries after this story. This story is pure TypeScript logic — no new packages needed.

### References

- Story 1.4 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.4]
- `SessionState` design: [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — D2 Aggregate Model]
- `todoId: string | null` pattern (Exploration sessions): [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — D2]
- Decision function pattern (pure, returns DomainEvent | Error): [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- `Clock` port (never call `Date.now()`): [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- `CURRENT_SCHEMA_VERSION` constant: [Source: packages/domain/src/events.ts#CURRENT_SCHEMA_VERSION]
- Import `.js` extension rule: [Source: _bmad-output/implementation-artifacts/1-2-define-domain-event-types-and-port-interfaces.md#Import Path Convention]
- `FakeClock` / `FakeIdGenerator` inline pattern: [Source: _bmad-output/implementation-artifacts/1-3-implement-todo-aggregate-with-full-test-coverage.md#FakeClock and FakeIdGenerator Test Utilities]
- Zero production dependencies: [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- `exactOptionalPropertyTypes` enforcement (null not undefined): [Source: _bmad-output/implementation-artifacts/1-3-implement-todo-aggregate-with-full-test-coverage.md#TypeScript Conventions]
- `elapsedMs` suffix for durations: [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — Event Payload Serialization]
- Error as value (never throw): [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — Error Handling]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking

### Debug Log References

None — clean implementation with no debugging required.

### Completion Notes List

- Implemented `SessionState` discriminated union (`idle | active`) with `INITIAL_SESSION_STATE` in `session.ts`.
- Implemented `reduceSession` reducer covering all session events and ignoring non-session events (default branch).
- Implemented all 3 pure decision functions: `startSession`, `completeSession`, `abandonSession` — return `DomainEvent | Error`, never throw, never call `Date.now()` directly.
- `startSession` uses `idGenerator.generate()` for both `aggregateId` (sessionId) and `eventId` to ensure unique IDs.
- `completeSession` and `abandonSession` compute `elapsedMs = clock.now() - state.startedAt`, consistent with `FakeClock.advance()` pattern.
- Created `session.test.ts` with `FakeClock` and `FakeIdGenerator` inline (not shared) per architecture convention.
- 24 tests covering all branches including: defensive guards in `reduceSession`, `SessionStarted` duplicate guard, idle-state errors, Exploration session (`todoId: null`), exact boundary values at 60000ms and 59999ms, and aggregateId mismatch guards.
- `pnpm turbo test --filter=@tododoro/domain -- --coverage` reports **100% across statements, branches, functions, and lines** for `session.ts` (and all domain files).
- Updated `index.ts` to export all new public API.
- Zero new production dependencies added — pure TypeScript logic only.

### File List

packages/domain/src/session.ts (created)
packages/domain/src/session.test.ts (created)
packages/domain/src/index.ts (modified)

## Change Log

- 2026-03-11: Story 1.4 implemented — Session aggregate with full test coverage. Created session.ts and session.test.ts; updated index.ts exports.
- 2026-03-11: Code review fixes — (H1) Captured `clock.now()` once in `completeSession`/`abandonSession` to prevent timestamp/elapsedMs inconsistency; (M1) Added `aggregateId` guard in `reduceSession` to ignore completion/abandonment events from other sessions; (M2) Clarified AC #4 wording re: 60s threshold enforcement. Added 2 new tests for aggregateId mismatch. 24 tests, 100% coverage maintained.
