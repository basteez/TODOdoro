# Story 4.4: Completion Moment on Todo Seal

Status: done

## Story

As a user,
I want to see a brief dignified summary when I seal a todo,
So that the act of declaring something complete is honoured as a ceremony, not processed as a checkbox.

## Acceptance Criteria

1. **Given** a todo card has accumulated one or more Pomodoros and the user initiates a seal **When** `handleSealTodo` writes a `TodoSealedEvent` **Then** the `CompletionMoment` overlay renders: Radix Dialog without backdrop, showing the todo title, total Pomodoro count, and approximate time span (e.g. "Chapter 4 — 23 Pomodoros across 18 days")
2. **Given** the CompletionMoment overlay for a seal is shown **Then** the overlay auto-dismisses after ~3 seconds or on any user interaction
3. **Given** the CompletionMoment overlay for a seal **Then** copy is declarative and past-tense — no congratulatory language; 1–2 lines maximum
4. **Given** `prefers-reduced-motion: reduce` is set **When** a todo is sealed **Then** the overlay appears and dismisses instantly (no fade animation)
5. **Given** the CompletionMoment has completed (or immediately if reduced-motion) **Then** the card is removed from the canvas

## Tasks / Subtasks

- [x] Task 1: Create `handleSealTodo` command handler (AC: #1, #5)
  - [x] 1.1 Add `handleSealTodo` to `apps/web/src/commands/todoCommands.ts`
  - [x] 1.2 Import `sealTodo` from `@tododoro/domain` (already exported)
  - [x] 1.3 Follow exact same pattern as `handleRenameTodo` and `handlePositionTodo`

- [x] Task 2: Add "Seal" action to TodoCard dropdown menu (AC: #1)
  - [x] 2.1 Add `onSeal` callback to `TodoCardData` interface
  - [x] 2.2 Add "Seal" item to existing `DropdownMenu.Content` (after "Rename")
  - [x] 2.3 Style: same `dropdownItemStyle` as "Rename"
  - [x] 2.4 Only show "Seal" when `sessionsCount > 0`

- [x] Task 3: Compute time span for CompletionMoment display (AC: #1, #3)
  - [x] 3.1 Created `computeTimeSpan` helper in `DevotionRecord.tsx`
  - [x] 3.2 Exported utility from `@tododoro/ui`

- [x] Task 4: Enhance CompletionMoment for seal variant (AC: #1, #2, #3, #4)
  - [x] 4.1 Added `variant` and `timeSpan` props
  - [x] 4.2 Seal variant displays "[todoTitle] — N Pomodoros across [timeSpan]"
  - [x] 4.3 Seal variant uses same auto-dismiss (3s) and dismiss-on-interaction
  - [x] 4.4 Seal variant uses `aria-label="Todo sealed"` for accessibility
  - [x] 4.5 `prefers-reduced-motion`: verified — no CSS animations, appears/disappears instantly

- [x] Task 5: Wire seal flow in App.tsx (AC: #1, #2, #5)
  - [x] 5.1 Import `handleSealTodo` and `computeTimeSpan`
  - [x] 5.2 Guard against sealing while session active for that todo
  - [x] 5.3 Created `onSealCallback` — reads devotion data before sealing
  - [x] 5.4 Updated `completionInfo` state type with `variant` and `timeSpan`
  - [x] 5.5 Pass `onSeal={onSealCallback}` to each TodoCard
  - [x] 5.6 Pass `variant` and `timeSpan` to CompletionMoment
  - [x] 5.7 Card removal automatic via `projectTodoList` — no additional code needed

- [x] Task 6: Tests (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 Added 6 `handleSealTodo` tests (success, error, store removal, shelf addition, nonexistent, no-throw)
  - [x] 6.2 Added 3 CompletionMoment seal variant tests (display, auto-dismiss, aria-label)
  - [x] 6.3 Added 3 TodoCard seal menu tests (show when sessions > 0, hide when 0, onSeal callback)
  - [x] 6.4 Run full test suite: all 341 tests pass

## Dev Notes

### Architecture Compliance

- `sealTodo()` domain function already implemented in `packages/domain/src/todo.ts:131-146`
- Returns `TodoSealedEvent | Error` — follows `Event | Error` pattern (D8)
- `reduceTodo` transitions `active → sealed` on `TodoSealedEvent`
- `projectTodoList` removes sealed todos from `items[]` — card disappears automatically
- `projectShelf` adds sealed todos to shelf with full history
- `projectDevotionRecord` is unaffected by `TodoSealedEvent` (falls through to default)
- [Source: architecture.md#D8 — Error Handling: domain errors returned as values]
- [Source: architecture.md#D7 — Command handler pattern: read → reduce → decide → append → applyEvent]

### Domain Layer (Already Implemented)

- `sealTodo(state: TodoState, clock: Clock, idGenerator: IdGenerator): TodoSealedEvent | Error`
  - Guard: `state.status !== 'active'` → Error
  - Returns: `{ eventType: 'TodoSealed', eventId, aggregateId: state.todoId, schemaVersion, timestamp }`
- `reduceTodo`: `TodoSealed` → `{ status: 'sealed', todoId, title }`
- `projectTodoList`: `TodoSealed` → filters todo out of `items[]`
- `projectShelf`: `TodoSealed` → adds to shelf `items[]` with `{ id, title, pomodoroCount, badge: 'sealed', sealedAt }`

### Existing Patterns to Reuse

- **Command handler**: `handleRenameTodo` in `apps/web/src/commands/todoCommands.ts` is the exact template — read by aggregate → reduce → decide → append → applyEvent
- **CompletionMoment**: Already exists with session variant. Extend with `variant` prop rather than creating a new component
- **DropdownMenu items**: "Rename" item in TodoCard is the template for adding "Seal"

### Key Technical Details

- The card removal is automatic via projection: `TodoSealedEvent` → `projectTodoList` removes from `items[]` → React Flow node list updates → card disappears. No manual DOM removal needed.
- Time span computation uses the DevotionRecord sessions (from `useCanvasStore.devotionRecord`), NOT the event store. Read this data before sealing, because after seal the todo is removed from `todos.items`.
- Copy tone: "Chapter 4 — 23 Pomodoros across 18 days" — declarative, past-tense, no congratulatory language
- `prefers-reduced-motion`: CompletionMoment currently has no CSS animations (appears/disappears via React state). AC #4 is satisfied by default — no additional work unless CSS transitions are added.
- Session active guard: do NOT allow sealing while a session is active for that todo. Check `isSessionActive && activeTodoId === todoId` in `onSealCallback` and skip the seal.

### Project Structure Notes

```
apps/web/src/commands/
  todoCommands.ts             ← MODIFY: add handleSealTodo
packages/ui/src/components/
  TodoCard.tsx                ← MODIFY: add "Seal" menu item + onSeal prop
  CompletionMoment.tsx        ← MODIFY: add variant/timeSpan props for seal display
apps/web/src/
  App.tsx                     ← MODIFY: wire onSealCallback, update completionInfo state
apps/web/src/commands/
  todoCommands.test.ts        ← NEW or MODIFY: handleSealTodo tests
apps/web/src/components/
  CompletionMoment.test.tsx   ← MODIFY: seal variant tests
  TodoCard.test.tsx           ← MODIFY: seal menu item tests
```

### References

- [Source: epics.md#Story 4.4 — acceptance criteria]
- [Source: ux-design-specification.md#Component Strategy — CompletionMoment: "Radix Dialog without overlay dimming, auto-dismisses ~3s"]
- [Source: ux-design-specification.md#UX Consistency Patterns — Copy Tone: "Declarative, past-tense, no congratulatory language"]
- [Source: ux-design-specification.md#Motion Principles — CompletionMoment fade durations]
- [Source: packages/domain/src/todo.ts:131-146 — sealTodo function]
- [Source: packages/domain/src/projections/todoList.ts — TodoSealed removes from items]
- [Source: packages/domain/src/projections/shelf.ts — TodoSealed adds to shelf]
- [Source: apps/web/src/commands/todoCommands.ts — command handler pattern template]
- [Source: packages/ui/src/components/CompletionMoment.tsx — existing session completion UI]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- Fixed exactOptionalPropertyTypes TS error by adding `| undefined` to CompletionMoment's optional props
- Fixed ShelfItem type assertion — field is `lifecycleStatus` not `badge`

### Completion Notes List
- Created `handleSealTodo` command handler following existing pattern (read → reduce → decide → append → applyEvent)
- Added `onSeal` prop and "Seal" menu item to TodoCard (only visible when sessionsCount > 0)
- Created `computeTimeSpan` utility in DevotionRecord.tsx, exported from @tododoro/ui
- Extended CompletionMoment with `variant: 'seal'` and `timeSpan` props — seal shows "[title] — N Pomodoros across D days"
- Wired full seal flow in App.tsx with session-active guard, devotion data pre-read, and CompletionMoment integration
- Card removal is automatic via `projectTodoList` removing sealed todos from items[]
- Added 12 new tests: 6 for handleSealTodo, 3 for CompletionMoment seal variant, 3 for TodoCard seal menu
- All 341 tests pass (158 domain + 175 web + 8 storage), typecheck clean, build succeeds

### Change Log
- 2026-03-14: Implemented Story 4.4 — handleSealTodo command, seal menu item, CompletionMoment seal variant, full wiring
- 2026-03-14: [Code Review Fix] Fixed computeTimeSpan bug — was using raw ms diff instead of calendar days, causing wrong counts for same-day sessions. Added 6 tests for computeTimeSpan.
- 2026-03-14: [Code Review Fix] Deferred seal event until CompletionMoment dismisses (AC #5 compliance) — card remains visible during ceremony, seal fires on dismiss.

### File List
- apps/web/src/commands/todoCommands.ts (modified)
- packages/ui/src/components/TodoCard.tsx (modified)
- packages/ui/src/components/DevotionRecord.tsx (modified)
- packages/ui/src/components/CompletionMoment.tsx (modified)
- packages/ui/src/index.ts (modified)
- apps/web/src/App.tsx (modified)
- apps/web/src/commands/todoCommands.test.ts (modified)
- apps/web/src/components/CompletionMoment.test.tsx (modified)
- apps/web/src/components/TodoCard.test.tsx (modified)
- apps/web/src/components/DevotionRecord.test.tsx (modified)
