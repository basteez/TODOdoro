# Story 2.5: Drag Cards to Declare Priority

Status: ready-for-dev

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

- [ ] Task 1: Enable React Flow node dragging on TodoCard (AC: #1, #4)
  - [ ] Ensure `TodoCard` nodes have `draggable: true` (React Flow default for nodes)
  - [ ] Add visual drag state: scale 1.02 + elevated shadow while dragging
  - [ ] Use React Flow's `onNodeDragStart` / `onNodeDragStop` to toggle drag styling
  - [ ] Tailwind classes for drag state: `scale-[1.02]` + `shadow-lg` (or custom shadow using design tokens)
  - [ ] Verify 60fps during drag — React Flow handles this natively, but confirm no expensive re-renders
- [ ] Task 2: Create `handlePositionTodo` command handler (AC: #2, #5)
  - [ ] Add to `apps/web/src/commands/todoCommands.ts`
  - [ ] `handlePositionTodo(todoId: string, position: {x: number, y: number}, eventStore: EventStore, clock: Clock, idGenerator: IdGenerator): Promise<Result>`
  - [ ] Pattern: read events by aggregate → reduce → `positionTodo()` → append → `applyEvent()`
- [ ] Task 3: Wire drag end → debounced position persist (AC: #2, #5)
  - [ ] Handle React Flow `onNodeDragStop` event
  - [ ] Debounce 200ms before calling `handlePositionTodo`
  - [ ] Use a `useRef` for the debounce timeout to avoid stale closures
  - [ ] Cancel pending debounce if another drag starts on the same node
  - [ ] NO events written during drag — only on drag stop after debounce
- [ ] Task 4: Verify position persistence on reload (AC: #3)
  - [ ] Boot sequence already replays `TodoPositionedEvent` via `projectTodoList`
  - [ ] Verify: create card → drag → reload → card appears at dragged position
  - [ ] Verify: `TodoListReadModel` stores `position: {x, y}` per todo

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

### Debug Log References

### Completion Notes List

### File List
