# Story 5.2: Release Ritual — Two-State Letting Go

Status: done

## Story

As a user,
I want to release a todo by choosing between two honest release reasons,
So that letting go is an act of clarity — distinguishing "this is done" from "this was never truly mine" — not just an archive action.

## Acceptance Criteria

1. **Given** an active todo card exists on the canvas with 5 or fewer invested Pomodoros **When** the user selects "Release" from the card action menu **Then** the `ReleaseRitual` component renders as a Radix Dialog with full overlay (canvas obscured)
2. **Given** the ReleaseRitual dialog is open **Then** it presents exactly two large, distinct buttons: "Completed its purpose" and "Was never truly mine"
3. **Given** the ReleaseRitual dialog is open **Then** there is no explicit cancel button visible — pressing Escape cancels and closes the dialog without any event being written
4. **Given** the user selects either release reason **Then** `handleReleaseTodo(todoId, reason, eventStore)` writes a `TodoReleasedEvent` with the chosen `releaseReason` (`'completed_its_purpose'` or `'was_never_truly_mine'`)
5. **Given** the release event is written **Then** the card animates off the canvas (250ms ease-in; no animation if `prefers-reduced-motion`)
6. **Given** the copy in the dialog **Then** it is non-judgmental, brief, and written from the user's perspective — no warning language, no "Are you sure?"

## Tasks / Subtasks

- [x] Task 1: Create `handleReleaseTodo` command handler (AC: #4)
  - [x] 1.1 Add `handleReleaseTodo` to `apps/web/src/commands/todoCommands.ts`
  - [x] 1.2 Import `releaseTodo` from `@tododoro/domain` (already exported)
  - [x] 1.3 Follow exact pattern of `handleSealTodo`: read by aggregate → reduce → decide → append → applyEvent
  - [x] 1.4 Accept `reason: 'completed_its_purpose' | 'was_never_truly_mine'` parameter

- [x] Task 2: Create `ReleaseRitual` component (AC: #1, #2, #3, #6)
  - [x] 2.1 Create `packages/ui/src/components/ReleaseRitual.tsx`
  - [x] 2.2 Use Radix `Dialog.Root` with `modal={true}` (full overlay, canvas obscured)
  - [x] 2.3 Two large buttons: "Completed its purpose" / "Was never truly mine"
  - [x] 2.4 No cancel button visible — Escape closes via Radix default behaviour
  - [x] 2.5 Copy tone: non-judgmental, brief, user's perspective. No "Are you sure?"
  - [x] 2.6 Export from `packages/ui/src/index.ts`
  - [x] 2.7 Style with CSS custom properties (`--surface`, `--text-primary`, etc.)

- [x] Task 3: Add "Release" action to TodoCard dropdown menu (AC: #1)
  - [x] 3.1 Add `onRelease` callback to `TodoCardData` interface
  - [x] 3.2 Add "Release" item to `DropdownMenu.Content` (after "Seal")
  - [x] 3.3 Style: same `dropdownItemStyle` as existing items
  - [x] 3.4 "Release" is always available (unlike "Seal" which requires sessionsCount > 0)

- [x] Task 4: Wire release flow in App.tsx (AC: #1, #4, #5)
  - [x] 4.1 Add `releaseTarget` state: `{ todoId: string; pomodoroCount: number } | null`
  - [x] 4.2 Create `onReleaseCallback` — sets releaseTarget state (guard: skip if session active for that todo)
  - [x] 4.3 Render `ReleaseRitual` when `releaseTarget` is set AND `pomodoroCount <= 5`
  - [x] 4.4 On reason selected: call `handleReleaseTodo(todoId, reason, eventStore, clock, idGenerator)`
  - [x] 4.5 Card leave animation (reuse pattern from Story 5.1)
  - [x] 4.6 On Escape/cancel: clear `releaseTarget`, no event written
  - [x] 4.7 Pass `onRelease={onReleaseCallback}` to each TodoCard node

- [x] Task 5: Tests (AC: #1–6)
  - [x] 5.1 `handleReleaseTodo` tests: success with each reason, error for non-active, store update
  - [x] 5.2 `ReleaseRitual` tests: renders two buttons, Escape closes without event, reason selection callback
  - [x] 5.3 `TodoCard` tests: "Release" menu item always shown, onRelease callback fires
  - [x] 5.4 Run full test suite

## Dev Notes

### Domain Layer (Already Implemented)

- **`releaseTodo`**: `packages/domain/src/todo.ts:148-165`
  - Signature: `releaseTodo(state: TodoState, reason: 'completed_its_purpose' | 'was_never_truly_mine', clock: Clock, idGenerator: IdGenerator): TodoReleasedEvent | Error`
  - Guard: `state.status !== 'active'` → Error
  - Returns: `{ eventType: 'TodoReleased', eventId, aggregateId: state.todoId, schemaVersion, timestamp, releaseReason: reason }`
- **`reduceTodo`**: `TodoReleased` → `{ status: 'released', todoId, title, releaseReason }` (`todo.ts:53-60`)
- **`projectTodoList`**: `TodoReleased` → filters todo out of `items[]` (card disappears)
- **`projectShelf`**: `TodoReleased` → adds to shelf `items[]` with `{ id, title, pomodoroCount, releasedAt, releaseReason, lifecycleStatus: 'released' }` (`shelf.ts:72-87`)

### Command Handler Pattern

Follow the exact same pattern as `handleSealTodo` (`todoCommands.ts:102-125`):

```typescript
export async function handleReleaseTodo(
  todoId: string,
  reason: 'completed_its_purpose' | 'was_never_truly_mine',
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const events = await eventStore.readByAggregate(todoId);
    const state = events.reduce(reduceTodo, INITIAL_TODO_STATE);
    const event = releaseTodo(state, reason, clock, idGenerator);
    if (event instanceof Error) return { ok: false, error: event.message };
    await eventStore.append(event);
    useCanvasStore.getState().applyEvent(event);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
```

### ReleaseRitual Component Design

Per UX spec: Radix Dialog with full overlay (canvas obscured). Two large, distinct buttons. No cancel button. Escape cancels via Radix default.

```
Props:
  open: boolean
  onSelect: (reason: 'completed_its_purpose' | 'was_never_truly_mine') => void
  onCancel: () => void
```

- Copy tone: declarative, non-judgmental. No "Are you sure?", no warning language.
- Button text: "Completed its purpose" / "Was never truly mine"
- Buttons should be large and visually distinct — consider different subtle colour treatments
- `aria-label="Release todo"` on dialog

### Release Flow State Machine (App.tsx)

```
TodoCard "Release" click
  → check: session active for this todo? → skip
  → set releaseTarget = { todoId, pomodoroCount }
  → Story 5.3 check: pomodoroCount > 5? → show ReleaseEulogy first (Story 5.3)
  → pomodoroCount <= 5? → show ReleaseRitual directly
  → user selects reason → handleReleaseTodo(todoId, reason)
  → card leave animation → card removed from canvas
  → clear releaseTarget
```

Note: Story 5.3 (ReleaseEulogy) gates the flow for >5 Pomodoros. For THIS story, only handle the `<= 5` Pomodoro case. The `> 5` case will be added in Story 5.3.

### Architecture Compliance

- [Source: architecture.md#D7 — Command handler pattern]
- [Source: architecture.md#D8 — Error handling: domain errors returned as values]
- [Source: architecture.md#D6 — No router: ReleaseRitual is a React state-driven dialog]
- [Source: architecture.md — Component location: `packages/ui/src/components/ReleaseRitual.tsx`]

### Project Structure Notes

```
apps/web/src/commands/
  todoCommands.ts             ← MODIFY: add handleReleaseTodo
packages/ui/src/components/
  ReleaseRitual.tsx           ← NEW: Radix Dialog, two-state release
  TodoCard.tsx                ← MODIFY: add "Release" menu item + onRelease prop
packages/ui/src/
  index.ts                    ← MODIFY: export ReleaseRitual
apps/web/src/
  App.tsx                     ← MODIFY: add releaseTarget state, wire onReleaseCallback, render ReleaseRitual
apps/web/src/commands/
  todoCommands.test.ts        ← MODIFY: handleReleaseTodo tests
packages/ui/src/components/
  ReleaseRitual.test.tsx      ← NEW: component tests
  TodoCard.test.tsx           ← MODIFY: release menu item tests
```

### Previous Story Intelligence (Story 5.1 / Story 4.4)

- **Deferred event pattern**: Like seal, the release event should fire AFTER animation completes (or immediately if `prefers-reduced-motion`).
- **Session-active guard**: Do NOT allow release while session is active for that todo.
- **`exactOptionalPropertyTypes`**: Use `prop?: Type | undefined` for optional props.
- **Card leave animation**: Reuse the same pattern from Story 5.1 (`leavingCardId` state + CSS transition).
- **Test count reference**: Story 4.4 ended with 341 tests. Expect more now from 5.1.

### References

- [Source: epics.md#Story 5.2 — acceptance criteria]
- [Source: ux-design-specification.md#Component Strategy — ReleaseRitual: FR9, two-state dialog, "Completed its purpose" / "Was never truly mine"]
- [Source: ux-design-specification.md#Overlay & Modal Patterns — Release Ritual: Full overlay, Escape or selection]
- [Source: ux-design-specification.md#Copy Tone — Declarative, honest, no warning language]
- [Source: packages/domain/src/todo.ts:148-165 — releaseTodo function]
- [Source: packages/domain/src/projections/shelf.ts:72-87 — TodoReleased adds to shelf]
- [Source: packages/domain/src/events.ts:60-67 — TodoReleasedEvent interface]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Created `handleReleaseTodo` command handler following exact `handleSealTodo` pattern
- Created `ReleaseRitual` component: Radix Dialog with full overlay, two large buttons ("Completed its purpose" / "Was never truly mine"), no cancel button, Escape closes via Radix default, non-judgmental copy
- Added `onRelease` callback and "Release" menu item to TodoCard (always available, unlike "Seal")
- Wired release flow in App.tsx: `releaseTarget` state, session-active guard, ReleaseRitual rendered when `pomodoroCount <= 5`, card leave animation reused from Story 5.1
- Tests: 7 handleReleaseTodo command tests, 7 ReleaseRitual component tests, 3 TodoCard release menu tests

### Change Log

- 2026-03-16: Implemented Story 5.2 — Release Ritual with two-state letting go, command handler, ReleaseRitual dialog, TodoCard menu integration, App.tsx wiring with animation
- 2026-03-16: Code review — changed "Completed its purpose" button color from --sealed to --released (semantic token fix), added test for releasing non-active (sealed) todo

### File List

- apps/web/src/commands/todoCommands.ts (modified — added handleReleaseTodo)
- packages/ui/src/components/ReleaseRitual.tsx (new — Radix Dialog two-state release component)
- packages/ui/src/index.ts (modified — export ReleaseRitual)
- packages/ui/src/components/TodoCard.tsx (modified — added onRelease prop, "Release" menu item)
- apps/web/src/App.tsx (modified — added releaseTarget state, onReleaseCallback, handleReleaseSelect/Cancel, ReleaseRitual rendering)
- apps/web/src/commands/todoCommands.test.ts (modified — 7 handleReleaseTodo tests)
- apps/web/src/components/ReleaseRitual.test.tsx (new — 7 component tests)
- apps/web/src/components/TodoCard.test.tsx (modified — 3 release menu item tests)
