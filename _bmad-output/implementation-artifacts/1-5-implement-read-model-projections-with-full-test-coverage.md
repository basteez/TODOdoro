# Story 1.5: Implement Read Model Projections with Full Test Coverage

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want all four read model projections implemented with 100% test coverage,
So that each UI surface has its precise data shape derived correctly and predictably from the event log.

## Acceptance Criteria

1. **Given** todo and session aggregates are implemented (Stories 1.3 and 1.4)
   **When** `packages/domain/src/projections/` contains `todoList.ts`, `devotionRecord.ts`, `shelf.ts`, and `activeSession.ts`
   **Then** `projectTodoList` produces `TodoListReadModel` with `id`, `title`, `position {x, y}`, `pomodoroCount`, and `status` per active todo

2. **And** `projectDevotionRecord` produces `DevotionRecordReadModel` with a session timeline (date + duration) per todo

3. **And** `projectShelf` produces `ShelfReadModel` of sealed and released todos with full history and `releaseReason`

4. **And** `projectActiveSession` produces `ActiveSessionReadModel` with `sessionId`, `todoId | null`, `startedAt`, `configuredDurationMs`, and `status`

5. **And** all projections are pure functions: `(currentState, event) => newState`; zero side effects

6. **And** `pnpm turbo test --filter=@tododoro/domain` reports 100% coverage for all four projection files

## Tasks / Subtasks

- [ ] Task 1: Create `packages/domain/src/projections/` directory and implement `todoList.ts` (AC: #1, #5, #6)
  - [ ] 1.1 Define `TodoListItem` interface and `TodoListReadModel` type
  - [ ] 1.2 Define `INITIAL_TODO_LIST_STATE: TodoListReadModel`
  - [ ] 1.3 Implement `projectTodoList(state: TodoListReadModel, event: DomainEvent): TodoListReadModel` — pure reducer
  - [ ] 1.4 Handle: `TodoDeclared` (add item), `TodoRenamed` (update title), `TodoPositioned` (update position), `TodoSealed` (remove from active list), `TodoReleased` (remove from active list), `SessionCompleted` (increment `pomodoroCount` on linked todo)
  - [ ] 1.5 Create `todoList.test.ts` co-located; 100% branch coverage including the `default` branch and session events on non-existent todos

- [ ] Task 2: Implement `devotionRecord.ts` (AC: #2, #5, #6)
  - [ ] 2.1 Define `DevotionSession` interface and `DevotionRecordReadModel` type (map of todoId → sessions[])
  - [ ] 2.2 Define `INITIAL_DEVOTION_RECORD_STATE: DevotionRecordReadModel`
  - [ ] 2.3 Implement `projectDevotionRecord(state: DevotionRecordReadModel, event: DomainEvent): DevotionRecordReadModel`
  - [ ] 2.4 Handle: `SessionCompleted` (append session to linked todo's record); ignore `SessionAbandoned` (abandoned sessions never appear in the record); `default` for all other events
  - [ ] 2.5 Exploration sessions (`todoId: null` on `SessionStarted`) should NOT appear in any todo's record; only `SessionCompleted` with a non-null `todoId` creates an entry
  - [ ] 2.6 Create `devotionRecord.test.ts`; cover: session completion adds entry, abandonment does not, Exploration session does not pollute record, title rename does not affect existing record entries

- [ ] Task 3: Implement `shelf.ts` (AC: #3, #5, #6)
  - [ ] 3.1 Define `ShelfItem` interface and `ShelfReadModel` type (list of sealed/released todos)
  - [ ] 3.2 Define `INITIAL_SHELF_STATE: ShelfReadModel`
  - [ ] 3.3 Implement `projectShelf(state: ShelfReadModel, event: DomainEvent): ShelfReadModel`
  - [ ] 3.4 Handle: `TodoSealed` (add sealed item), `TodoReleased` (add released item with `releaseReason`), `SessionCompleted` (update `pomodoroCount` on shelf item if it's there), `default` for all other events
  - [ ] 3.5 Create `shelf.test.ts`; cover: seal adds to shelf, release with each reason adds to shelf, completed session increments count on already-shelved item

- [ ] Task 4: Implement `activeSession.ts` (AC: #4, #5, #6)
  - [ ] 4.1 Define `ActiveSessionReadModel` interface
  - [ ] 4.2 Define `INITIAL_ACTIVE_SESSION_STATE: ActiveSessionReadModel = { status: 'idle' }`
  - [ ] 4.3 Implement `projectActiveSession(state: ActiveSessionReadModel, event: DomainEvent): ActiveSessionReadModel`
  - [ ] 4.4 Handle: `SessionStarted` (populate all fields), `SessionCompleted` (reset to idle), `SessionAbandoned` (reset to idle), `default` for all other events
  - [ ] 4.5 Create `activeSession.test.ts`; cover all transitions + default branch

- [ ] Task 5: Update `packages/domain/src/index.ts` (AC: #1–#4)
  - [ ] 5.1 Export all read model types and projection functions + initial states from their respective paths

## Dev Notes

### Read Model Type Shapes (MUST use these exact shapes)

#### `TodoListReadModel`

```typescript
// packages/domain/src/projections/todoList.ts

export interface TodoListItem {
  readonly id: string;           // todoId (aggregateId from TodoDeclaredEvent)
  readonly title: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly pomodoroCount: number; // incremented on each SessionCompleted with matching todoId
  readonly status: 'active';     // Only active todos appear in TodoListReadModel
}

export type TodoListReadModel = ReadonlyArray<TodoListItem>;

export const INITIAL_TODO_LIST_STATE: TodoListReadModel = [];
```

**Why only `status: 'active'`:** Sealed and released todos leave the canvas and move to the `ShelfReadModel`. The `TodoListReadModel` only tracks what is currently on the canvas. This directly maps to the React Flow node list in `ConstellationCanvas`.

#### `DevotionRecordReadModel`

```typescript
// packages/domain/src/projections/devotionRecord.ts

export interface DevotionSession {
  readonly sessionId: string;    // aggregateId from SessionStartedEvent
  readonly startedAt: number;    // ms since epoch
  readonly elapsedMs: number;    // from SessionCompletedEvent
}

export interface DevotionRecord {
  readonly todoId: string;
  readonly sessions: ReadonlyArray<DevotionSession>;
}

// Map: todoId → DevotionRecord
export type DevotionRecordReadModel = ReadonlyMap<string, DevotionRecord>;

export const INITIAL_DEVOTION_RECORD_STATE: DevotionRecordReadModel = new Map();
```

**Why a `Map` and not an array:** `DevotionRecordReadModel` is keyed by `todoId` for O(1) lookup from any component that renders devotion dots or the timeline popover. A `ReadonlyMap` is immutable and supports efficient per-todo access.

**Why `DevotionSession` has `startedAt` from `SessionStartedEvent`:** The `projectDevotionRecord` function needs to match the `SessionStartedEvent` (which has the `todoId`) with the `SessionCompletedEvent` (which has `elapsedMs`). The `aggregateId` on both events is the `sessionId` — use this to correlate them. You need to track in-progress sessions during projection to correctly attribute the `elapsedMs` on completion.

> **Implementation hint:** The devotion record projection must track "pending" sessions (started but not yet completed) within its state to correlate `SessionStarted` with `SessionCompleted`. One approach: store pending sessions in a separate map keyed by `sessionId`, then move them to the record on completion.

```typescript
export interface DevotionRecordReadModel {
  readonly records: ReadonlyMap<string, DevotionRecord>;           // todoId → record
  readonly pendingSessions: ReadonlyMap<string, { todoId: string; startedAt: number }>; // sessionId → {todoId, startedAt}
}
export const INITIAL_DEVOTION_RECORD_STATE: DevotionRecordReadModel = {
  records: new Map(),
  pendingSessions: new Map(),
};
```

**Note:** This `pendingSessions` map is not exposed to UI consumers — only `records` matters for rendering. The `pendingSessions` is internal projection bookkeeping.

#### `ShelfReadModel`

```typescript
// packages/domain/src/projections/shelf.ts

export interface ShelfItem {
  readonly id: string;              // todoId
  readonly title: string;
  readonly pomodoroCount: number;
  readonly sealedAt: number | null; // ms since epoch; null if released (not sealed)
  readonly releasedAt: number | null; // ms since epoch; null if sealed
  readonly releaseReason: 'completed_its_purpose' | 'was_never_truly_mine' | null; // null if sealed
  readonly lifecycleStatus: 'sealed' | 'released';
}

export type ShelfReadModel = ReadonlyArray<ShelfItem>;

export const INITIAL_SHELF_STATE: ShelfReadModel = [];
```

**Why `null` and not `undefined` for optional fields:** `exactOptionalPropertyTypes: true` blocks optional properties in domain types. All fields are present; absence is represented as `null`.

**`pomodoroCount` on shelf items:** When a todo is sealed or released, its session history is preserved. If a `SessionCompleted` event arrives after a todo is shelved (possible in theory via repair pipeline edge cases), the shelf item's `pomodoroCount` should be incremented. Track this correctly.

**`ShelfItem` has both `sealedAt` and `releasedAt`:** This makes the type accurately model the sealed/released distinction at the type level, matching what the UI needs for displaying distinct badges.

#### `ActiveSessionReadModel`

```typescript
// packages/domain/src/projections/activeSession.ts

export type ActiveSessionReadModel =
  | { readonly status: 'idle' }
  | {
      readonly status: 'active';
      readonly sessionId: string;
      readonly todoId: string | null; // null = Exploration session
      readonly startedAt: number;     // ms since epoch
      readonly configuredDurationMs: number;
    };

export const INITIAL_ACTIVE_SESSION_STATE: ActiveSessionReadModel = { status: 'idle' };
```

**Why a discriminated union:** Mirrors `SessionState` from Story 1.4. When `status` is `'idle'`, there are no active session fields — the TypeScript narrowing prevents accessing undefined fields. This directly maps to `useSessionStore`'s shape.

### Projection Function Pattern (All 4 Must Follow This)

```typescript
// Pattern: (currentState, event) => newState
// Pure: no side effects, no I/O, no mutations
// State is immutable: always return a new object/array/Map

export function projectTodoList(
  state: TodoListReadModel,
  event: DomainEvent
): TodoListReadModel {
  switch (event.eventType) {
    case 'TodoDeclared':
      return [...state, {
        id: event.aggregateId,
        title: event.title,
        position: { x: 0, y: 0 },
        pomodoroCount: 0,
        status: 'active',
      }];
    case 'TodoRenamed':
      return state.map(item =>
        item.id === event.aggregateId ? { ...item, title: event.title } : item
      );
    // ... other cases
    default:
      return state;
  }
}
```

**Immutability rule:** Never mutate state in place. Always spread arrays/objects or create new Maps. The CI 100% coverage gate will catch untested branches.

### How `projectDevotionRecord` Handles Session Attribution

The tricky case: `SessionStartedEvent` carries `todoId`, but `SessionCompletedEvent` only carries `aggregateId` (the `sessionId`). The projection must correlate them:

```typescript
case 'SessionStarted':
  if (event.todoId === null) return state; // Exploration — skip, no attribution yet
  return {
    ...state,
    pendingSessions: new Map(state.pendingSessions).set(event.aggregateId, {
      todoId: event.todoId,
      startedAt: event.timestamp,
    }),
  };

case 'SessionCompleted': {
  const pending = state.pendingSessions.get(event.aggregateId);
  if (pending === undefined) return state; // Completed session has no pending start (e.g. orphaned — ignore)
  const existingRecord = state.records.get(pending.todoId);
  const newSession: DevotionSession = {
    sessionId: event.aggregateId,
    startedAt: pending.startedAt,
    elapsedMs: event.elapsedMs,
  };
  const updatedRecord: DevotionRecord = {
    todoId: pending.todoId,
    sessions: [...(existingRecord?.sessions ?? []), newSession],
  };
  const newPending = new Map(state.pendingSessions);
  newPending.delete(event.aggregateId);
  return {
    records: new Map(state.records).set(pending.todoId, updatedRecord),
    pendingSessions: newPending,
  };
}

case 'SessionAbandoned': {
  // Remove from pending — abandoned sessions never enter the record
  const newPending = new Map(state.pendingSessions);
  newPending.delete(event.aggregateId);
  return { ...state, pendingSessions: newPending };
}
```

### `pomodoroCount` in `projectTodoList`

When `SessionCompleted` arrives, check if the session had a `todoId` (not null). Need to look up the `todoId` from the `pendingSessions` map... but `projectTodoList` doesn't have access to `DevotionRecordReadModel`'s pending map!

**Resolution:** `projectTodoList` uses the `SessionStartedEvent` to track pending session→todoId mapping internally, then increments `pomodoroCount` on `SessionCompleted`.

```typescript
// TodoListReadModel must internally track pending sessions too
export interface TodoListInternalState {
  readonly items: ReadonlyArray<TodoListItem>;
  readonly pendingSessions: ReadonlyMap<string, string>; // sessionId → todoId
}

// OR: Keep separate from the public ReadModel shape for consumers.
// The simplest approach: expose only items[] to consumers but track pendingSessions
// as part of the full state type.
```

> **Alternative simpler approach:** Make `TodoListReadModel` internally hold the pending map, but the exported type used by components is just the `items` array. Use a wrapper:
> ```typescript
> export interface TodoListState {
>   readonly items: ReadonlyArray<TodoListItem>;
>   readonly pendingSessions: ReadonlyMap<string, string>; // sessionId → todoId
> }
> export type TodoListReadModel = TodoListState; // rename for consistency
> ```
> The `bootstrap` call in `main.tsx` can destructure `items` when passing to React Flow. **This is the recommended approach** to keep all 4 projections as self-contained pure reducers.

### Coverage Requirements for Each Projection

For **`todoList.ts`** — MUST test:
- `TodoDeclared`: adds item with correct initial state
- `TodoRenamed`: updates title of matching item; ignores non-matching items
- `TodoPositioned`: updates position of matching item
- `TodoSealed`: removes item from list
- `TodoReleased`: removes item from list
- `SessionCompleted`: increments `pomodoroCount` on linked todo
- `SessionCompleted` with no linked todo (Exploration — `todoId: null`): no change to items
- `SessionCompleted` with unknown `todoId`: defensive — no change
- `default`: any other event type (e.g. `SnapshotCreated`) returns state unchanged

For **`devotionRecord.ts`** — MUST test:
- `SessionStarted` with `todoId: string`: added to pending
- `SessionStarted` with `todoId: null` (Exploration): skipped
- `SessionCompleted`: moves pending → record
- `SessionCompleted` with no matching pending (orphaned): no-op
- `SessionAbandoned`: removes from pending, no record entry
- Title rename (`TodoRenamed`): existing record entries unaffected (identity = `todoId`, not `title`)
- `default`: ignored

For **`shelf.ts`** — MUST test:
- `TodoSealed`: adds sealed item with correct fields
- `TodoReleased` with `'completed_its_purpose'`: adds released item
- `TodoReleased` with `'was_never_truly_mine'`: adds released item
- `SessionCompleted` for todo that's on the shelf: increments `pomodoroCount`
- `default`: ignored

For **`activeSession.ts`** — MUST test:
- `SessionStarted`: transitions to active
- `SessionCompleted`: returns to idle
- `SessionAbandoned`: returns to idle
- Already idle when `SessionCompleted` arrives: defensive no-op
- `default`: non-session event on idle state; non-session event on active state

### File Structure — Only These Files Are Created/Modified

```
packages/domain/src/
  projections/             ← CREATE the directory
    todoList.ts            ← CREATE (TodoListItem, TodoListReadModel, INITIAL_TODO_LIST_STATE,
                                     projectTodoList)
    todoList.test.ts       ← CREATE
    devotionRecord.ts      ← CREATE (DevotionSession, DevotionRecord, DevotionRecordReadModel,
                                     INITIAL_DEVOTION_RECORD_STATE, projectDevotionRecord)
    devotionRecord.test.ts ← CREATE
    shelf.ts               ← CREATE (ShelfItem, ShelfReadModel, INITIAL_SHELF_STATE,
                                     projectShelf)
    shelf.test.ts          ← CREATE
    activeSession.ts       ← CREATE (ActiveSessionReadModel, INITIAL_ACTIVE_SESSION_STATE,
                                     projectActiveSession)
    activeSession.test.ts  ← CREATE
  index.ts                 ← UPDATE (add all read model + projection exports)
```

**DO NOT create or modify:**
- `todo.ts`, `todo.test.ts` — Story 1.3 is done
- `session.ts`, `session.test.ts` — Story 1.4 is done
- `repair.ts` — that is Story 1.6
- `events.ts`, `ports.ts` — fully complete from Stories 1.1/1.2

### Index.ts Update Pattern

```typescript
// Add to packages/domain/src/index.ts after existing exports:

// Projections
export type { TodoListItem, TodoListReadModel } from './projections/todoList.js';
export { INITIAL_TODO_LIST_STATE, projectTodoList } from './projections/todoList.js';

export type { DevotionSession, DevotionRecord, DevotionRecordReadModel } from './projections/devotionRecord.js';
export { INITIAL_DEVOTION_RECORD_STATE, projectDevotionRecord } from './projections/devotionRecord.js';

export type { ShelfItem, ShelfReadModel } from './projections/shelf.js';
export { INITIAL_SHELF_STATE, projectShelf } from './projections/shelf.js';

export type { ActiveSessionReadModel } from './projections/activeSession.js';
export { INITIAL_ACTIVE_SESSION_STATE, projectActiveSession } from './projections/activeSession.js';
```

### TypeScript Conventions

| Rule | Correct | Wrong |
|---|---|---|
| Projection file name | `todoList.ts` (camelCase) | `TodoList.ts` (PascalCase for files that export pure functions) |
| Type names | `TodoListReadModel` (PascalCase for types) | `todoListReadModel` |
| Return type | Always explicit on exported functions | Inferred |
| Map immutability | `new Map(existing).set(...)` | `existing.set(...)` |
| Array immutability | `[...state, newItem]` or `state.map(...)` | `state.push(newItem)` |
| Null for absence | `todoId: string \| null` | `todoId?: string` |

### Architecture Constraint

- Zero production dependencies for `@tododoro/domain` — these are pure TypeScript files with no imports outside the package
- All imports within `projections/` use relative paths with `.js` extension: `import type { DomainEvent } from '../events.js'`
- Do NOT import from `@tododoro/storage`, `@tododoro/ui`, or `apps/web`

### References

- Story 1.5 acceptance criteria: [Source: _bmad-output/planning-artifacts/epics.md#Story 1.5]
- Read model shapes (D3): [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — D3 Read Models]
- Four read models drive four UI surfaces: [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture — D3]
- Pure projection pattern: [Source: _bmad-output/planning-artifacts/architecture.md#Communication Patterns]
- Boot sequence uses all 4 projections: [Source: _bmad-output/planning-artifacts/architecture.md#Data Flow — Boot sequence]
- `useCanvasStore` owns TodoList + Shelf + DevotionRecord: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — D7]
- `useSessionStore` owns ActiveSession: [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — D7]
- `exactOptionalPropertyTypes` (null not optional): [Source: _bmad-output/implementation-artifacts/1-3-implement-todo-aggregate-with-full-test-coverage.md#TypeScript Conventions]
- ProjectTodoList / ProjectShelf naming convention: [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns — Monorepo Package Organization]
- 100% coverage gate: [Source: _bmad-output/planning-artifacts/architecture.md#Decision Priority Analysis — D10]
- NFR20: 100% domain test coverage as CI gate: [Source: _bmad-output/planning-artifacts/epics.md#NonFunctional Requirements]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
