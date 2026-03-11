# Story 2.4: Rename a Todo Card

Status: done

## Story

As a user,
I want to rename any todo card by double-clicking its title,
So that I can refine what an intention means to me as my understanding evolves.

## Acceptance Criteria (BDD)

1. **Given** a todo card exists on the canvas
   **When** the user double-clicks the card title
   **Then** the title becomes an editable inline text field, pre-filled with the current title

2. **Given** the user is editing a card title
   **When** the user presses Enter or clicks away
   **Then** `handleRenameTodo` writes a `TodoRenamedEvent`
   **And** the card title updates immediately on the canvas with no loading state

3. **Given** the user is editing a card title
   **When** the user presses Escape
   **Then** the rename is cancelled and the original title is restored without writing any event

4. **Given** the user clears the title field and confirms
   **Then** the rename is cancelled and the original title is restored (empty titles not permitted)

## Tasks / Subtasks

- [x] Task 1: Add rename mode to `TodoCard` component (AC: #1, #2, #3, #4)
  - [x] Add `isEditing` local state to `TodoCard`
  - [x] Double-click on title text → enter editing mode (set `isEditing: true`)
  - [x] In editing mode: render `<input>` pre-filled with current title, auto-focused, text selected
  - [x] Enter or blur → if title changed AND non-empty: call `onRename(newTitle)` callback; if empty or unchanged: cancel
  - [x] Escape → restore original title, exit editing mode, no callback
  - [x] Prevent React Flow drag while editing (use `nodeDrag` handle or `draggable={false}` during edit)
- [x] Task 2: Create `handleRenameTodo` command handler (AC: #2)
  - [x] Add to `apps/web/src/commands/todoCommands.ts`
  - [x] `handleRenameTodo(todoId: string, newTitle: string, eventStore: EventStore, clock: Clock, idGenerator: IdGenerator): Promise<Result>`
  - [x] Pattern: read events by aggregate → reduce → call `renameTodo()` domain fn → append → `applyEvent()`
  - [x] Return `{ ok: true }` or `{ ok: false, error: string }`
- [x] Task 3: Wire rename flow in `ConstellationCanvas` / `App.tsx` (AC: #1, #2)
  - [x] Pass `onRename` callback to `TodoCard` node data
  - [x] Callback calls `handleRenameTodo` with `todoId`, `newTitle`
  - [x] Store update triggers React Flow re-render with new title

## Dev Notes

### Architecture Compliance

- Command handler follows exact pattern from architecture: async, Result union, never throws
- `renameTodo()` decision function already exists in `packages/domain/src/todo.ts` (Epic 1)
- `TodoRenamedEvent` type defined in `packages/domain/src/events.ts`
- Zustand update only via `applyEvent()` from command handler — never direct `setState` from component
- [Source: architecture.md#Communication Patterns]

### Component Behaviour Details

- Double-click on title enters edit mode — double-click on card body (non-title area) should NOT trigger rename
- During editing, React Flow node dragging must be disabled to prevent conflicts
- React Flow custom nodes: use `nodeDrag` handle or conditionally set `draggable` on the node
- Input field: `--text-primary` colour, same font (Inter Medium 15px), same padding — seamless inline edit feel
- [Source: ux-design-specification.md#Interaction State Patterns]

### Interaction with Story 2.3

- `TodoCard` component created in Story 2.3 — this story extends it with rename capability
- Reuse the same inline editing pattern (input + Enter/Escape/blur) from card creation
- Consider extracting a shared `EditableTitle` subcomponent if the pattern is identical

### Domain Note

- `renameTodo()` preserves Devotion Record — identity is by `todoId`, not title (Story 4.3 covers this explicitly, but the domain already handles it correctly)
- [Source: epics.md#Story 4.3]

### Project Structure Notes

Files to modify:
```
packages/ui/src/
  components/
    TodoCard.tsx             ← MODIFY: add double-click-to-rename, isEditing state

apps/web/src/
  commands/
    todoCommands.ts          ← MODIFY: add handleRenameTodo
  App.tsx                    ← MODIFY: wire onRename callback to TodoCard node data
```

### References

- [Source: epics.md#Story 2.4]
- [Source: architecture.md#Communication Patterns — Command Handler Pattern]
- [Source: packages/domain/src/todo.ts — renameTodo]
- [Source: packages/domain/src/events.ts — TodoRenamedEvent]
- [Source: ux-design-specification.md#Interaction State Patterns]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None — implementation proceeded without blockers.

### Completion Notes List

- Added `onRename: (newTitle: string) => void` to `TodoCardData` type.
- Added local `isRenaming` state to `TodoCard` (separate from external `data.isEditing` used for new card creation). Double-click on title span triggers rename mode; input pre-filled with current title, auto-focused with text selected via `setTimeout` to yield to React Flow's focus management.
- Rename confirm logic: only calls `onRename` when title is non-empty AND changed from original; Escape cancels without calling `onRename`.
- `onMouseDown` stopPropagation on the rename input wrapper prevents React Flow from initiating drag while editing.
- `handleRenameTodo` in `todoCommands.ts` follows exact command handler pattern: reads aggregate events via `readByAggregate`, reduces to state, calls `renameTodo()` domain fn, appends event, applies to Zustand store.
- `App.tsx` passes `onRename` callback in `todoNodes` useMemo; the ephemeral new-card node gets a no-op `onRename`.
- 52 tests pass (8 new rename-mode tests in TodoCard.test.tsx, 6 new handleRenameTodo tests in todoCommands.test.ts). TypeCheck passes.

### File List

- `packages/ui/src/components/TodoCard.tsx` — modified: added `onRename` to `TodoCardData`, added `isRenaming`/`renameValue` local state, double-click handler on title span, rename input rendering, drag prevention via `onMouseDown` stopPropagation
- `apps/web/src/commands/todoCommands.ts` — modified: added `handleRenameTodo` command handler
- `apps/web/src/App.tsx` — modified: import `handleRenameTodo`, add `onRename` callback to `todoNodes` and ephemeral editing node
- `apps/web/src/components/TodoCard.test.tsx` — modified: added `onRename` to default test data, added 8 rename-mode tests
- `apps/web/src/commands/todoCommands.test.ts` — modified: added import of `handleRenameTodo` and `DomainEvent`, added 6 `handleRenameTodo` tests

## Change Log

- 2026-03-11: Implemented Story 2.4 — Rename a Todo Card. Added double-click-to-rename UI in `TodoCard`, `handleRenameTodo` command handler, and wired `onRename` callback in `App.tsx`. All ACs satisfied, 52 tests pass.
- 2026-03-11: Code review fixes — widened `onRename` type to `void | Promise<void>` for type honesty; added 2 missing rename-mode tests (blur-unchanged-title, whitespace-only Enter); added `toHaveBeenCalledTimes(1)` assertion to Enter confirm test. 54 tests pass.
