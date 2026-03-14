# Story 4.3: Devotion Record Preserved Across Title Renames

Status: ready-for-dev

## Story

As a user,
I want my Devotion Record to remain intact if I rename a card,
So that evolving how I name an intention never erases the history of showing up for it.

## Acceptance Criteria

1. **Given** a todo card has accumulated Devotion dots over multiple sessions **When** the user renames the card (triggering a `TodoRenamedEvent`) **Then** the card's full session history is unchanged — the Devotion Record still shows all previous sessions
2. **Given** a todo has been renamed **When** viewing DevotionDots **Then** DevotionDots still shows the correct count
3. **Given** the DevotionRecordReadModel projection **Then** it uses `todoId` (not `title`) as the stable identity key — title changes are irrelevant to the record
4. **Given** a todo has been renamed and sessions exist **When** the page is reloaded **Then** the full history is still present after replaying events from the event store

## Tasks / Subtasks

- [ ] Task 1: Verify domain projection correctness (AC: #3)
  - [ ] 1.1 Read `packages/domain/src/projections/devotionRecord.ts` and confirm:
    - `DevotionRecordReadModel.records` is keyed by `todoId` (not title) ✓
    - `projectDevotionRecord` never reads or uses `event.title` from `TodoRenamedEvent`
    - `TodoRenamedEvent` falls through to `default: return state` — no projection change
  - [ ] 1.2 This is a verification task — if the above holds, no code changes needed to the projection

- [ ] Task 2: Add explicit domain projection tests (AC: #1, #3)
  - [ ] 2.1 Add test to `packages/domain/src/projections/devotionRecord.test.ts`:
    ```
    it('TodoRenamedEvent does not alter existing devotion records', () => {
      // Setup: session started + completed for todo-1
      // Apply TodoRenamedEvent for todo-1
      // Assert: records.get('todo-1').sessions unchanged
    })
    ```
  - [ ] 2.2 Add test: rename does not create a new record entry
    ```
    it('TodoRenamedEvent does not create new record entries', () => {
      // Setup: session started + completed for todo-1
      // Apply TodoRenamedEvent for todo-1
      // Assert: records.size === 1 (still only todo-1)
    })
    ```
  - [ ] 2.3 Add test: multiple renames followed by new session — record accumulates correctly
    ```
    it('sessions accumulate correctly across multiple renames', () => {
      // Setup: session-1 started + completed for todo-1
      // Rename todo-1 → "New Title"
      // session-2 started + completed for todo-1
      // Rename todo-1 → "Another Title"
      // session-3 started + completed for todo-1
      // Assert: records.get('todo-1').sessions.length === 3
    })
    ```

- [ ] Task 3: Add integration test for full flow (AC: #1, #2, #4)
  - [ ] 3.1 Add integration test in `apps/web/src/commands/todoCommands.test.ts` (create if needed) or in a new test file:
    ```
    it('DevotionDots count preserved after rename command', () => {
      // Setup: declare todo, start+complete 3 sessions, rename todo
      // Assert: useCanvasStore todos.items[0].pomodoroCount === 3
      // Assert: useCanvasStore devotionRecord.records.get(todoId).sessions.length === 3
    })
    ```
  - [ ] 3.2 Add test for persistence: verify event store replay produces same state after rename
    ```
    it('full replay after rename preserves devotion record', () => {
      // Append: TodoDeclared, SessionStarted, SessionCompleted, TodoRenamed
      // Replay all events through projectDevotionRecord from initial state
      // Assert: devotion record for todoId has 1 session
    })
    ```

- [ ] Task 4: Verify UI integration (AC: #2)
  - [ ] 4.1 Verify in `apps/web/src/App.tsx` that todo node mapping reads `pomodoroCount` from `todos.items` (not derived from title)
  - [ ] 4.2 Confirm `TodoCard` receives `sessionsCount` from `item.pomodoroCount` which is projected by `projectTodoList` using `todoId`
  - [ ] 4.3 No code changes expected — this is a verification that the existing data flow is identity-based

- [ ] Task 5: Run full test suite (AC: #4)
  - [ ] 5.1 `turbo typecheck && turbo test && turbo build` — all must pass
  - [ ] 5.2 Verify domain coverage stays at 100% (new tests should increase or maintain coverage)

## Dev Notes

### Architecture Compliance

- The event-sourced design deliberately uses `aggregateId` (= `todoId`) as the stable identity key across all projections
- `TodoRenamedEvent` only carries `aggregateId` and `title` — no other projections are affected
- `DevotionRecordReadModel.records` is `Map<todoId, DevotionRecord>` — title is not stored in the projection
- `TodoListReadModel` updates the title but `pomodoroCount` remains tied to `todoId`
- [Source: architecture.md#D4 — Event payload: "aggregateId is the stable entity identifier"]
- [Source: architecture.md#D3 — Read Models are projected from events using aggregateId]

### Domain Layer (Already Implemented)

- `projectDevotionRecord` in `packages/domain/src/projections/devotionRecord.ts`:
  - Handles: `SessionStarted`, `SessionCompleted`, `SessionAbandoned`, `SessionAttributed`
  - Does NOT handle: `TodoDeclared`, `TodoRenamed`, `TodoPositioned`, `TodoSealed`, `TodoReleased`
  - `TodoRenamedEvent` falls through to `default: return state` — identity preservation is automatic
- `projectTodoList` in `packages/domain/src/projections/todoList.ts`:
  - `TodoRenamedEvent` updates `title` but not `pomodoroCount`
  - `pomodoroCount` is incremented only by `SessionCompletedEvent`

### Existing Patterns to Reuse

- Test helpers in `packages/domain/src/testUtils.ts`: `FakeClock`, `FakeIdGenerator`
- Event factory helpers already used in `devotionRecord.test.ts`: `makeSessionStarted()`, `makeSessionCompleted()`
- Need to add `makeTodoRenamed()` helper following same pattern
- Command test pattern from `sessionCommands.test.ts` if it exists, or create new test file

### Key Technical Details

- This story is primarily a **verification and testing** story — the implementation is already correct by design
- The risk this story mitigates: a future refactor might accidentally key devotion records by title instead of todoId
- Explicit tests serve as regression guards: if someone changes the projection keying, tests will fail
- The `pomodoroCount` in `TodoListReadModel` is also identity-based (keyed by `todoId` in the items array `id` field)

### Project Structure Notes

```
packages/domain/src/projections/
  devotionRecord.test.ts     ← MODIFY: add rename-preservation tests
apps/web/src/commands/
  todoCommands.test.ts       ← NEW or MODIFY: add integration test
```

### References

- [Source: epics.md#Story 4.3 — acceptance criteria]
- [Source: packages/domain/src/projections/devotionRecord.ts — projection handles SessionStarted/Completed only]
- [Source: packages/domain/src/projections/todoList.ts — pomodoroCount incremented by SessionCompleted]
- [Source: packages/domain/src/events.ts — TodoRenamedEvent carries aggregateId + title]
- [Source: architecture.md#D4 — Event naming: aggregateId is stable entity identifier]
- [Source: packages/domain/src/todo.ts — renameTodo uses state.todoId as aggregateId]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
