# Story 2.4: Rename a Todo Card

Status: ready-for-dev

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

- [ ] Task 1: Add rename mode to `TodoCard` component (AC: #1, #2, #3, #4)
  - [ ] Add `isEditing` local state to `TodoCard`
  - [ ] Double-click on title text → enter editing mode (set `isEditing: true`)
  - [ ] In editing mode: render `<input>` pre-filled with current title, auto-focused, text selected
  - [ ] Enter or blur → if title changed AND non-empty: call `onRename(newTitle)` callback; if empty or unchanged: cancel
  - [ ] Escape → restore original title, exit editing mode, no callback
  - [ ] Prevent React Flow drag while editing (use `nodeDrag` handle or `draggable={false}` during edit)
- [ ] Task 2: Create `handleRenameTodo` command handler (AC: #2)
  - [ ] Add to `apps/web/src/commands/todoCommands.ts`
  - [ ] `handleRenameTodo(todoId: string, newTitle: string, eventStore: EventStore, clock: Clock, idGenerator: IdGenerator): Promise<Result>`
  - [ ] Pattern: read events by aggregate → reduce → call `renameTodo()` domain fn → append → `applyEvent()`
  - [ ] Return `{ ok: true }` or `{ ok: false, error: string }`
- [ ] Task 3: Wire rename flow in `ConstellationCanvas` / `App.tsx` (AC: #1, #2)
  - [ ] Pass `onRename` callback to `TodoCard` node data
  - [ ] Callback calls `handleRenameTodo` with `todoId`, `newTitle`
  - [ ] Store update triggers React Flow re-render with new title

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

### Debug Log References

### Completion Notes List

### File List
