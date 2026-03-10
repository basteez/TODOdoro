# Story 1.3: Implement Todo Aggregate with Full Test Coverage

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want the Todo aggregate (reducer + all decision functions) implemented with 100% test coverage,
So that all todo lifecycle business rules are correct and enforced before any UI is written.

## Acceptance Criteria

1. **Given** domain event types and ports are defined (Story 1.2)
   **When** `packages/domain/src/todo.ts` and `packages/domain/src/todo.test.ts` are created
   **Then** `todo.ts` exports `TodoState`, `reduceTodo`, `declareTodo`, `renameTodo`, `positionTodo`, `sealTodo`, and `releaseTodo`

2. **And** all decision functions are pure: `(state, input) => DomainEvent | Error`; never throw; never call `Date.now()` directly (use the `Clock` port)

3. **And** `releaseTodo` requires a `reason: 'completed_its_purpose' | 'was_never_truly_mine'` parameter

4. **And** invalid transitions return `Error` values:
   - sealing a nonexistent todo (`status === 'nonexistent'`)
   - releasing an already-sealed todo (`status === 'sealed'`)
   - releasing an already-released todo (`status === 'released'`)
   - renaming a nonexistent or sealed/released todo
   - positioning a nonexistent todo
   - declaring a new todo when `activeCount >= 100`

5. **And** `pnpm turbo test --filter=@tododoro/domain` reports 100% line, function, and branch coverage for `todo.ts`

## Tasks / Subtasks

- [x] Task 1: Define `TodoState` type and `reduceTodo` reducer (AC: #1, #2)
  - [x] 1.1 Define `TodoState` as a discriminated union: `'nonexistent' | 'active' | 'sealed' | 'released'`
  - [x] 1.2 Implement `reduceTodo(state: TodoState, event: DomainEvent): TodoState` — handles only todo-relevant events; ignores non-todo events
  - [x] 1.3 Initial state constant: `INITIAL_TODO_STATE: TodoState = { status: 'nonexistent' }`

- [x] Task 2: Implement all 5 decision functions (AC: #2, #3, #4)
  - [x] 2.1 `declareTodo(activeCount: number, title: string, clock: Clock, idGenerator: IdGenerator): TodoDeclaredEvent | Error`
  - [x] 2.2 `renameTodo(state: TodoState, title: string, clock: Clock, idGenerator: IdGenerator): TodoRenamedEvent | Error`
  - [x] 2.3 `positionTodo(state: TodoState, x: number, y: number, clock: Clock, idGenerator: IdGenerator): TodoPositionedEvent | Error`
  - [x] 2.4 `sealTodo(state: TodoState, clock: Clock, idGenerator: IdGenerator): TodoSealedEvent | Error`
  - [x] 2.5 `releaseTodo(state: TodoState, reason: 'completed_its_purpose' | 'was_never_truly_mine', clock: Clock, idGenerator: IdGenerator): TodoReleasedEvent | Error`

- [x] Task 3: Create `todo.test.ts` with 100% coverage (AC: #5)
  - [x] 3.1 Create `FakeClock` and `FakeIdGenerator` test utilities inline in the test file
  - [x] 3.2 Test `reduceTodo`: all event types that affect todo state; verify state after each transition
  - [x] 3.3 Test `declareTodo`: success case; 100-card cap error; uses `clock.now()` and `idGenerator.generate()`
  - [x] 3.4 Test `renameTodo`: success case; error on nonexistent/sealed/released state
  - [x] 3.5 Test `positionTodo`: success case; error on nonexistent state
  - [x] 3.6 Test `sealTodo`: success case; error on nonexistent state; error on already-sealed; error on released
  - [x] 3.7 Test `releaseTodo`: both `reason` values; error on nonexistent; error on sealed; error on already-released
  - [x] 3.8 Run `pnpm turbo test --filter=@tododoro/domain` and verify 100% coverage output

- [x] Task 4: Update `packages/domain/src/index.ts` to export new public types (AC: #1)
  - [x] 4.1 Add `export type { TodoState }` and `export { reduceTodo, declareTodo, renameTodo, positionTodo, sealTodo, releaseTodo, INITIAL_TODO_STATE }` from `./todo.js`

## Dev Notes

### `TodoState` Type Shape (MUST use this exact discriminated union)

```typescript
// packages/domain/src/todo.ts

export type TodoState =
  | { readonly status: 'nonexistent' }
  | {
      readonly status: 'active';
      readonly todoId: string;
      readonly title: string;
      readonly position: { readonly x: number; readonly y: number };
    }
  | {
      readonly status: 'sealed';
      readonly todoId: string;
      readonly title: string;
    }
  | {
      readonly status: 'released';
      readonly todoId: string;
      readonly title: string;
      readonly releaseReason: 'completed_its_purpose' | 'was_never_truly_mine';
    };

export const INITIAL_TODO_STATE: TodoState = { status: 'nonexistent' };
```

**Why a discriminated union, not a flat interface with optionals:** `exactOptionalPropertyTypes: true` is enforced across all packages. Optionals (`?:`) are blocked in event payloads (Story 1.2 learnings). A discriminated union by `status` gives TypeScript exhaustive branch checking — every uncovered status variant becomes a compile error.

### Decision Function Signatures (exact shapes)

```typescript
import type { Clock, IdGenerator } from './ports.js';
import type {
  TodoDeclaredEvent,
  TodoRenamedEvent,
  TodoPositionedEvent,
  TodoSealedEvent,
  TodoReleasedEvent,
} from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';

// Creates a brand-new todo — no prior TodoState needed; 100-cap check via activeCount
export function declareTodo(
  activeCount: number,
  title: string,
  clock: Clock,
  idGenerator: IdGenerator
): TodoDeclaredEvent | Error

// Operates on existing aggregate state
// Note: clock and idGenerator are required because event interfaces mandate eventId (string)
// and timestamp (number); Date.now() and crypto.randomUUID() are forbidden in domain code.
export function renameTodo(state: TodoState, title: string, clock: Clock, idGenerator: IdGenerator): TodoRenamedEvent | Error
export function positionTodo(state: TodoState, x: number, y: number, clock: Clock, idGenerator: IdGenerator): TodoPositionedEvent | Error
export function sealTodo(state: TodoState, clock: Clock, idGenerator: IdGenerator): TodoSealedEvent | Error
export function releaseTodo(
  state: TodoState,
  reason: 'completed_its_purpose' | 'was_never_truly_mine',
  clock: Clock,
  idGenerator: IdGenerator,
): TodoReleasedEvent | Error
```

**`declareTodo` takes `activeCount` because:** it creates a brand-new aggregate (no prior `TodoState`), yet must enforce the 100-card cap. The command handler reads the active count from the `TodoListReadModel` (or by counting events) and passes it in. This keeps the function pure and testable.

**ALWAYS use `CURRENT_SCHEMA_VERSION` from `events.ts` for `schemaVersion` field.** Never hardcode `1`.

**ALWAYS use `clock.now()` for `timestamp`. NEVER use `Date.now()` inside domain code** — this is an anti-pattern explicitly forbidden in the architecture.

**ALWAYS use `idGenerator.generate()` for `eventId` and `aggregateId` in `declareTodo`.** Other decision functions use the `aggregateId` from the existing `state.todoId`.

### `reduceTodo` Implementation Pattern

```typescript
export function reduceTodo(state: TodoState, event: DomainEvent): TodoState {
  switch (event.eventType) {
    case 'TodoDeclared':
      if (state.status !== 'nonexistent') return state; // defensive — ignore duplicate declare events
      return {
        status: 'active',
        todoId: event.aggregateId,
        title: event.title,
        position: { x: 0, y: 0 }, // default until TodoPositioned arrives
      };
    case 'TodoRenamed':
      if (state.status !== 'active') return state; // defensive — ignore event if wrong state
      return { ...state, title: event.title };
    case 'TodoPositioned':
      if (state.status !== 'active') return state;
      return { ...state, position: { x: event.x, y: event.y } };
    case 'TodoSealed':
      if (state.status !== 'active') return state;
      return { status: 'sealed', todoId: state.todoId, title: state.title };
    case 'TodoReleased':
      if (state.status !== 'active') return state;
      return {
        status: 'released',
        todoId: state.todoId,
        title: state.title,
        releaseReason: event.releaseReason,
      };
    default:
      return state; // All non-todo events (SessionStarted, etc.) are ignored
  }
}
```

**Why `default: return state`:** The `reduceTodo` reducer receives any `DomainEvent` from the full event log. Session events, snapshot events, etc. must all be silently ignored. The `switch` must have a `default` branch to satisfy 100% branch coverage **and** to handle non-todo events without crashing.

### Error Return Patterns (MUST follow exactly)

**Return `new Error(...)` — never `throw`. Never use a custom Error subclass.**

```typescript
// Invalid transition — sealing nonexistent todo
if (state.status !== 'active') {
  return new Error(`Cannot seal todo: status is '${state.status}'`);
}

// 100-card cap
if (activeCount >= 100) {
  return new Error('Cannot declare todo: 100-card cap reached');
}

// Empty title guard (good defensive check — prevents empty TodoDeclared / TodoRenamed events)
if (title.trim().length === 0) {
  return new Error('Todo title cannot be empty');
}
```

**Architecture rule:** All domain errors are returned as values (`Error | DomainEvent`), never thrown. The root `ErrorBoundary` in `apps/web` is last-resort only and should never see domain errors.

### `FakeClock` and `FakeIdGenerator` Test Utilities

These are **first introduced in this story** (per Story 1.2 completion notes). Define them inline in `todo.test.ts` — do NOT put them in a shared `testUtils.ts` file (Stories 1.4 and 1.6 will copy-paste; a shared util file can be created in Story 1.6 if needed).

```typescript
// In packages/domain/src/todo.test.ts

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

**Why `FakeClock`:** Deterministic timestamps in tests. Allows testing time-dependent transitions without `Date.now()` non-determinism. The `advance(ms)` method enables future session tests (Stories 1.4, 1.6) to simulate time passing.

### Coverage Gate Requirements

The `vitest.config.ts` in `packages/domain/` sets thresholds:
```
lines: 100, functions: 100, branches: 100, statements: 100
```

**Every branch in `todo.ts` MUST be tested.** This includes:
- `switch` default branch (test with a `SessionStarted` event passed to `reduceTodo`)
- `reduceTodo` state guard for each event (e.g. `TodoRenamed` when `status === 'sealed'` → should return unchanged state)
- Every `if (state.status !== 'active')` path in decision functions
- Both `reason` values in `releaseTodo`

**Common missed branches that fail 100% gate:**
- The `default` case of `reduceTodo`'s `switch` statement
- `reduceTodo` receiving a todo event on wrong state (e.g. `TodoRenamed` applied when `status === 'sealed'`)
- `declareTodo` with `activeCount === 99` (success) vs `activeCount === 100` (error)
- Empty title check (if included)

Run `pnpm turbo test --filter=@tododoro/domain --coverage` to see coverage report. **Do NOT proceed to mark this story done if any coverage threshold fails.**

### File Structure — Only These Files Are Created/Modified

```
packages/domain/src/
  todo.ts          ← CREATE (TodoState, reduceTodo, declareTodo, renameTodo,
                             positionTodo, sealTodo, releaseTodo, INITIAL_TODO_STATE)
  todo.test.ts     ← CREATE (FakeClock, FakeIdGenerator inline; all test cases)
  index.ts         ← UPDATE (add exports for TodoState, all functions, INITIAL_TODO_STATE)
```

**DO NOT create:**
- `session.ts` — that is Story 1.4
- `repair.ts` — that is Story 1.6
- `projections/` directory — that is Story 1.5
- Any `types/` directory — explicitly forbidden by architecture

**DO NOT modify:**
- `events.ts` — types are already complete (Story 1.2 is done)
- `ports.ts` — interfaces are already complete (Story 1.2 is done)

### TypeScript Conventions (MUST Follow)

| Rule | Correct | Wrong |
|---|---|---|
| File name | `todo.ts` (camelCase, pure functions) | `Todo.ts` (PascalCase is for classes/components) |
| Test file | `todo.test.ts` (co-located) | `todo.spec.ts` or `__tests__/todo.ts` |
| Import ext | `from './events.js'` | `from './events'` |
| Timestamps | `clock.now()` | `Date.now()` |
| Event IDs | `idGenerator.generate()` | `crypto.randomUUID()` directly |
| Errors | `return new Error(...)` | `throw new Error(...)` |
| Optional fields | Never in domain types | `field?: T` — blocked by `exactOptionalPropertyTypes` |

### Import Pattern in `todo.ts`

```typescript
import type { DomainEvent, TodoDeclaredEvent, TodoRenamedEvent, TodoPositionedEvent, TodoSealedEvent, TodoReleasedEvent } from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';
import type { Clock, IdGenerator } from './ports.js';
```

**`CURRENT_SCHEMA_VERSION` is a value export (not a type)** — use regular `import`, not `import type`. All event interfaces are type-only imports. `Clock` and `IdGenerator` are type-only imports.

### Index.ts Update

```typescript
// Add to packages/domain/src/index.ts after existing exports:

export type { TodoState } from './todo.js';
export { reduceTodo, declareTodo, renameTodo, positionTodo, sealTodo, releaseTodo, INITIAL_TODO_STATE } from './todo.js';
```

Use `export type { TodoState }` (type-only) and regular `export { ... }` for functions and the `INITIAL_TODO_STATE` constant (these are runtime values).

### Architecture Constraint: Zero Production Dependencies

`packages/domain/package.json` must still have zero `"dependencies"` entries after this story. No new packages are needed — this story is pure TypeScript logic using only the types defined in Stories 1.1 and 1.2.

Verify before marking done:
```bash
cat packages/domain/package.json
# "dependencies" key must be absent OR empty {}
```

### Command Handler Context (How `declareTodo` Will Be Called by `apps/web`)

The future command handler in `apps/web/src/commands/todoCommands.ts` will look like:

```typescript
export async function handleDeclareTodo(
  title: string,
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator
): Promise<{ ok: true } | { ok: false; error: string }> {
  const allEvents = await eventStore.readAll();
  // Count active todos from the event log (until TodoListReadModel is available in Story 1.5)
  const activeCount = /* derive from events */;
  const result = declareTodo(activeCount, title, clock, idGenerator);
  if (result instanceof Error) return { ok: false, error: result.message };
  await eventStore.append(result);
  useCanvasStore.getState().applyEvent(result);
  return { ok: true };
}
```

This is **for context only** — do NOT implement `todoCommands.ts` in this story. This story is domain-only.

### References

- Story 1.3 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.3]
- `TodoState` discriminated union pattern: [Source: _bmad-output/planning-artifacts/architecture.md#Format Patterns — interface vs type]
- Decision function pattern (`pure, returns DomainEvent | Error`): [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- 100-card cap (FR5): [Source: _bmad-output/planning-artifacts/epics.md#Requirements Inventory — FR5]
- `Clock` port (never call `Date.now()` directly): [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- `CURRENT_SCHEMA_VERSION` constant: [Source: packages/domain/src/events.ts#CURRENT_SCHEMA_VERSION]
- Import `.js` extension rule: [Source: _bmad-output/implementation-artifacts/1-2-define-domain-event-types-and-port-interfaces.md#Import Path Convention]
- Zero production dependencies: [Source: _bmad-output/planning-artifacts/architecture.md#Enforcement Guidelines]
- Test file co-location: [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — Test File Location]
- Coverage thresholds (100% gate): [Source: packages/domain/vitest.config.ts]
- `FakeClock` introduction in Story 1.3: [Source: _bmad-output/implementation-artifacts/1-2-define-domain-event-types-and-port-interfaces.md#Notes on Clock]
- Error as value (never throw): [Source: _bmad-output/planning-artifacts/architecture.md#Process Patterns — Error Handling]
- `exactOptionalPropertyTypes` enforcement: [Source: _bmad-output/implementation-artifacts/1-2-define-domain-event-types-and-port-interfaces.md#Previous Story Learnings]

## Dev Agent Record

### Agent Model Used

claude-4.6-sonnet-medium-thinking (Cursor Agent)

### Debug Log References

No debug issues encountered. All 37 tests passed on first run with 100% coverage.

### Completion Notes List

- Implemented `TodoState` discriminated union (4 variants: nonexistent/active/sealed/released) as specified in Dev Notes.
- Implemented `INITIAL_TODO_STATE` constant as `{ status: 'nonexistent' }`.
- Implemented `reduceTodo` with exhaustive switch: handles all 5 todo events plus default branch for non-todo events (SessionStarted, etc.).
- Implemented all 5 decision functions as pure functions returning `DomainEvent | Error` (never throw).
- **Signature deviation from story spec:** The story listed simplified signatures for `renameTodo`, `positionTodo`, `sealTodo`, and `releaseTodo` (without `clock`/`idGenerator`). These were extended to include `clock: Clock, idGenerator: IdGenerator` as the event interfaces require `eventId` (string) and `timestamp` (number), and the architecture explicitly forbids `Date.now()` and `crypto.randomUUID()` in domain code. This is the only way to satisfy both TypeScript interfaces and architecture constraints.
- `FakeClock` and `FakeIdGenerator` defined inline in `todo.test.ts` as specified (not shared util).
- All error branches covered: nonexistent/sealed/released guards, 100-card cap, empty title.
- 37 tests covering all branches; `pnpm turbo test --filter=@tododoro/domain -- --coverage` reports 100% statements/branches/functions/lines for `todo.ts`.
- Zero production dependencies added to `packages/domain/package.json`.

### File List

- packages/domain/src/todo.ts (created; updated in review — added state guard to TodoDeclared case)
- packages/domain/src/todo.test.ts (created; updated in review — removed stale shared fixtures, added branch test for TodoDeclared on non-nonexistent state, added eventId assertions to 4 success tests; 38 tests)
- packages/domain/src/index.ts (modified — added TodoState, INITIAL_TODO_STATE, reduceTodo, declareTodo, renameTodo, positionTodo, sealTodo, releaseTodo exports)
- packages/domain/vitest.config.ts (modified in review — passWithNoTests: false; coverage exclude list extended to include ports.ts and *.test.ts)

## Change Log

- 2026-03-10: Implemented Todo aggregate (Story 1.3) — created todo.ts with TodoState discriminated union, INITIAL_TODO_STATE, reduceTodo reducer, and 5 decision functions; created todo.test.ts with 37 tests at 100% coverage; updated index.ts with new exports.
- 2026-03-10: Code review fixes — added TodoDeclared state guard in reduceTodo for consistency with all other event cases; fixed vitest coverage config (exclude ports.ts and test files, passWithNoTests: false); cleaned up test fixtures in reduceTodo describe block; added eventId assertions to success tests for renameTodo/positionTodo/sealTodo/releaseTodo; updated Dev Notes signatures to reflect actual clock/idGenerator params.
