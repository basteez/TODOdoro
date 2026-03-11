# Story 2.5: Drag Cards to Declare Priority

Status: done

## Story

As a user,
I want to drag todo cards freely across the canvas,
So that I can declare priority through spatial positioning — dragging a card to the centre means it matters now.

## Acceptance Criteria (BDD)

1. **Given** one or more todo cards exist on the canvas
   **When** the user drags a card to a new position
   **Then** the card moves fluidly at 60fps with no perceptible lag (NFR1)

2. **Given** a card drag ends
   **Then** `handlePositionTodo` is called with a 200ms debounce, writing a `TodoPositionedEvent` with the final `{x, y}` coordinates

3. **Given** a card has been dragged and the page is reloaded
   **Then** the card position persists correctly (read from event log on boot)

4. **Given** a card is being dragged
   **Then** the card renders at scale 1.02 with increased shadow

5. **Given** a card is being dragged
   **Then** no position event is written during the drag — only on drag end (debounced 200ms)

## Tasks / Subtasks

- [x] Task 1: Enable React Flow node dragging on TodoCard (AC: #1, #4)
  - [x] Ensure `TodoCard` nodes have `draggable: true` (React Flow default for nodes)
  - [x] Add visual drag state: scale 1.02 + elevated shadow while dragging
  - [x] Use React Flow's `onNodeDragStart` / `onNodeDragStop` to toggle drag styling
  - [x] Tailwind classes for drag state: `scale-[1.02]` + `shadow-lg` (or custom shadow using design tokens)
  - [x] Verify 60fps during drag — React Flow handles this natively, but confirm no expensive re-renders
- [x] Task 2: Create `handlePositionTodo` command handler (AC: #2, #5)
  - [x] Add to `apps/web/src/commands/todoCommands.ts`
  - [x] `handlePositionTodo(todoId: string, position: {x: number, y: number}, eventStore: EventStore, clock: Clock, idGenerator: IdGenerator): Promise<Result>`
  - [x] Pattern: read events by aggregate → reduce → `positionTodo()` → append → `applyEvent()`
- [x] Task 3: Wire drag end → debounced position persist (AC: #2, #5)
  - [x] Handle React Flow `onNodeDragStop` event
  - [x] Debounce 200ms before calling `handlePositionTodo`
  - [x] Use a `useRef` for the debounce timeout to avoid stale closures
  - [x] Cancel pending debounce if another drag starts on the same node
  - [x] NO events written during drag — only on drag stop after debounce
- [x] Task 4: Verify position persistence on reload (AC: #3)
  - [x] Boot sequence already replays `TodoPositionedEvent` via `projectTodoList`
  - [x] Verify: create card → drag → reload → card appears at dragged position
  - [x] Verify: `TodoListReadModel` stores `position: {x, y}` per todo

## Dev Notes

### Architecture Compliance

- Position events are debounced 200ms — prevents event log spam during drag. This is an explicit architecture decision. [Source: architecture.md#Process Patterns]
- `positionTodo()` domain function already exists in `packages/domain/src/todo.ts`
- `TodoPositionedEvent` defined in `packages/domain/src/events.ts`
- Command handler pattern: async, Result union, never throws
- React Flow manages node positions internally — the `onNodeDragStop` callback provides final position
- [Source: architecture.md#Canvas Boundary]

### Performance

- React Flow handles 60fps drag natively — avoid adding state updates or re-renders during drag
- Do NOT call `setState` or `applyEvent` during drag — only on drag end
- `useSessionStore` separation ensures timer ticks don't affect drag performance
- [Source: architecture.md#D7 — Zustand Store Structure]

### Drag Visual Specifications

- During drag: `scale(1.02)` + increased shadow
- At rest: no shadow, no scale transform
- Transition between states should be instant (no easing on drag start/end)
- All via Tailwind utilities — no inline `style={}` (exception: React Flow's own position transform)
- [Source: ux-design-specification.md#Interaction State Patterns — Dragging]

### React Flow Drag Events

```typescript
// React Flow provides these callbacks:
onNodeDragStart?: (event, node, nodes) => void
onNodeDrag?: (event, node, nodes) => void      // ← DO NOT use for position events
onNodeDragStop?: (event, node, nodes) => void   // ← USE THIS + 200ms debounce
```

### Project Structure Notes

Files to modify:
```
packages/ui/src/
  components/
    TodoCard.tsx             ← MODIFY: add drag visual state (scale + shadow)

apps/web/src/
  commands/
    todoCommands.ts          ← MODIFY: add handlePositionTodo
  App.tsx                    ← MODIFY: wire onNodeDragStop → debounced handlePositionTodo
```

### References

- [Source: epics.md#Story 2.5]
- [Source: architecture.md#Canvas Boundary]
- [Source: architecture.md#Process Patterns — 200ms debounce]
- [Source: ux-design-specification.md#Interaction State Patterns — Dragging: Scale 1.02 + shadow increase]
- [Source: packages/domain/src/todo.ts — positionTodo]
- [Source: packages/domain/src/events.ts — TodoPositionedEvent]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No blockers encountered.

### Completion Notes List

- Task 1: Added `dragging` prop destructuring to `TodoCard`. Applied `scale-[1.02] shadow-lg` Tailwind classes via `className` on the card wrapper when `dragging` is true. No transition classes added (instant state change per spec). React Flow's `dragging` NodeProp drives the state — no extra React state needed.
- Task 2: Added `handlePositionTodo` command handler to `todoCommands.ts` following the exact same pattern as `handleRenameTodo` (readByAggregate → reduce → domain fn → append → applyEvent). Full test coverage with 5 tests.
- Task 3: Added `onNodeDragStart` and `onNodeDragStop` props to `ConstellationCanvas`. In `App.tsx`, wired a `useRef`-based 200ms debounce — `onNodeDragStart` clears any pending timeout, `onNodeDragStop` sets a new 200ms timeout that calls `handlePositionTodo` with the node's final position. No state updates during drag.
- Task 4: Position persistence on reload is already handled by the boot sequence replaying `TodoPositionedEvent` via `projectTodoList`. Verified by existing `useCanvasStore` test "projects a TodoPositioned event into the todos read model".
- All 67 tests pass, no regressions.
- Code review fixes applied: corrected `React.MouseEvent` type reference in App.tsx (M1), made debounce cancellation node-specific (M2), added `onNodeDragStart` acceptance test (M3), added 4 debounce behaviour tests in `App.debounce.test.tsx` (M4).

### File List

- packages/ui/src/components/TodoCard.tsx
- packages/ui/src/components/ConstellationCanvas.tsx
- apps/web/src/commands/todoCommands.ts
- apps/web/src/App.tsx
- apps/web/src/components/TodoCard.test.tsx
- apps/web/src/commands/todoCommands.test.ts
- apps/web/src/components/ConstellationCanvas.test.tsx
- apps/web/src/App.debounce.test.tsx

## Change Log

- 2026-03-11: Implemented Story 2.5 — drag cards to declare priority. Added drag visual state (scale 1.02 + shadow) to TodoCard, `handlePositionTodo` command handler, 200ms debounced drag-stop wiring in App.tsx, and `onNodeDragStart`/`onNodeDragStop` props on ConstellationCanvas.
- 2026-03-11: Code review fixes — fixed `React.MouseEvent` type import, made debounce node-specific (won't cancel a pending persist when a different node starts dragging), added missing `onNodeDragStart` prop test, added debounce behaviour tests.
