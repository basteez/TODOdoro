# Story 2.3: Create and Title a Todo Card

Status: ready-for-dev

## Story

As a user,
I want to create a new todo card on the canvas by clicking an empty area and typing a title,
So that I can place an intention on the canvas with near-zero friction.

## Acceptance Criteria (BDD)

1. **Given** the canvas is open and has fewer than 100 active todo cards
   **When** the user double-clicks an empty area of the canvas
   **Then** a new `TodoCard` node appears at the click position with an editable title field focused

2. **Given** the user is typing a title on a new card
   **When** the user presses Enter or clicks away
   **Then** `handleDeclareTodo` writes a `TodoDeclaredEvent` and a `TodoPositionedEvent` to the event store
   **And** the card appears on the canvas immediately — no loading state, no spinner; feedback within 100ms (NFR7)
   **And** the new card displays with `--surface` background, 1px `--surface-border` border, title in Inter Medium at 15px

3. **Given** the user is creating a new card
   **When** the user presses Escape
   **Then** the action is cancelled, the card is removed without writing any event

4. **Given** the canvas already has 100 active todo cards
   **When** the user attempts to create a new card
   **Then** no new card is created and a brief inline message indicates the canvas is full

## Tasks / Subtasks

- [ ] Task 1: Create `TodoCard` React Flow custom node (AC: #1, #2)
  - [ ] Create `packages/ui/src/components/TodoCard.tsx`
  - [ ] Implement as a React Flow custom node using `NodeProps`
  - [ ] Card anatomy: editable title (Inter Medium 15px), card action trigger area (placeholder for future stories)
  - [ ] Card styling: `--surface` background, 1px `--surface-border` border, 20–28px internal padding, min ~160×72px
  - [ ] States: Idle, Editing (title field focused with cursor)
  - [ ] Title input: uncontrolled input or `contentEditable` with `--text-primary` colour
  - [ ] On Enter or blur: call `onConfirm(title)` callback with trimmed title
  - [ ] On Escape: call `onCancel()` callback
  - [ ] Empty title on confirm → treat as cancel (do not create card)
  - [ ] Register as custom node type in React Flow: `nodeTypes={{ todoCard: TodoCard }}`
  - [ ] Export from `packages/ui/src/index.ts`
- [ ] Task 2: Create `handleDeclareTodo` command handler (AC: #2)
  - [ ] Create `apps/web/src/commands/todoCommands.ts`
  - [ ] Implement `handleDeclareTodo(title: string, position: {x: number, y: number}, eventStore: EventStore, clock: Clock, idGenerator: IdGenerator): Promise<Result>`
  - [ ] Pattern: read events → reduce state → call `declareTodo()` decision fn → append `TodoDeclaredEvent` → call `positionTodo()` → append `TodoPositionedEvent` → call `useCanvasStore.getState().applyEvent()` for EACH event
  - [ ] Return `{ ok: true }` or `{ ok: false, error: string }`
  - [ ] Never throw — errors as values
- [ ] Task 3: Wire double-click canvas → create card flow (AC: #1, #2, #3)
  - [ ] In `ConstellationCanvas`, handle `onPaneClick` or `onDoubleClick` on the React Flow pane
  - [ ] Convert screen coordinates to flow coordinates using `reactFlowInstance.screenToFlowPosition()`
  - [ ] Create a temporary "editing" node at the click position (local state, not yet persisted)
  - [ ] On confirm: call `handleDeclareTodo` → card persists in store → React Flow re-renders with new node
  - [ ] On cancel (Escape or empty title): remove temporary node from local state
- [ ] Task 4: Enforce 100-card cap (AC: #4)
  - [ ] Before creating a temporary editing node, check `useCanvasStore(s => s.todos).length >= 100`
  - [ ] If at cap: show brief inline message (small text near click position or toast-like) then dismiss after 2s
  - [ ] The `declareTodo()` domain decision function should also enforce this — belt and suspenders
- [ ] Task 5: Map TodoListReadModel to React Flow nodes (AC: #1, #2)
  - [ ] In `App.tsx` or `ConstellationCanvas`: derive `Node[]` from `useCanvasStore(s => s.todos)`
  - [ ] Each todo maps to: `{ id: todoId, type: 'todoCard', position: { x, y }, data: { title, ... } }`
  - [ ] Pass derived nodes to React Flow `<ReactFlow nodes={nodes} ...>`

## Dev Notes

### Architecture Compliance

- **Command handler pattern:** `handleDeclareTodo` in `apps/web/src/commands/todoCommands.ts` — async, returns Result union, never throws. Reads events → reduces → calls domain decision fn → appends → updates store. [Source: architecture.md#Communication Patterns]
- **Domain decision functions** are pure, return `DomainEvent | Error`, imported from `@tododoro/domain`. The command handler is the imperative shell. [Source: architecture.md#Communication Patterns]
- **Zustand updates:** Only from command handlers via `useCanvasStore.getState().applyEvent(event)` — never `setState` from components. [Source: architecture.md#Communication Patterns]
- **No loading states** per action — all writes are imperceptible (NFR7). Only `isBooting` flag exists. [Source: architecture.md#Process Patterns]

### Domain Integration

- `declareTodo(state, title, clock, idGenerator)` — already implemented in `packages/domain/src/todo.ts` (Epic 1, Story 1.3)
- `positionTodo(state, position)` — already implemented in `packages/domain/src/todo.ts`
- Both functions are pure and return `DomainEvent | Error`
- `TodoDeclaredEvent` and `TodoPositionedEvent` types defined in `packages/domain/src/events.ts`
- 100-card cap enforced in `declareTodo()` decision function — verify this exists
- [Source: architecture.md#Structure Patterns — packages/domain/src/]

### React Flow Custom Node Pattern

- Register custom node types: `const nodeTypes = useMemo(() => ({ todoCard: TodoCard }), [])`
- MUST memoize `nodeTypes` — React Flow re-mounts nodes if the object identity changes
- Node data type: `{ title: string; todoId: string; sessionsCount: number }` (extend as needed in later stories)
- Handle coordinates: React Flow works in flow-space; use `screenToFlowPosition()` for click-to-position conversion

### Component Interaction Flow

```
User double-clicks canvas
  → ConstellationCanvas.onDoubleClick
  → Check 100-card cap
  → Create temp editing node (local state)
  → User types title + Enter
  → handleDeclareTodo(title, position, eventStore, clock, idGenerator)
    → declareTodo() → TodoDeclaredEvent
    → positionTodo() → TodoPositionedEvent
    → eventStore.append(event)
    → useCanvasStore.getState().applyEvent(event)
  → Store updates → React Flow re-renders with persisted node
  → Remove temp editing node (now replaced by real node)
```

### Card Visual Specifications

- Background: `--surface` (`hsl(220, 14%, 13%)`)
- Border: 1px solid `--surface-border` (`hsl(220, 12%, 20%)`)
- Title: Inter Medium, 15px (`base` scale), `--text-primary`
- Padding: 20–28px internal
- Minimum size: ~160×72px
- No shadows at rest — shadows appear during drag (Story 2.5)
- [Source: ux-design-specification.md#Visual Design Foundation, Component Strategy — TodoCard]

### Project Structure Notes

Files to create/modify:
```
packages/ui/src/
  components/
    TodoCard.tsx             ← NEW: React Flow custom node
  index.ts                   ← MODIFY: export TodoCard

apps/web/src/
  commands/
    todoCommands.ts          ← NEW: handleDeclareTodo
  App.tsx                    ← MODIFY: wire node mapping, pass to ConstellationCanvas
```

Modify `ConstellationCanvas.tsx` to:
- Accept `nodeTypes` and `nodes` props (or wire internally)
- Handle `onDoubleClick` on pane for card creation
- Manage temporary editing node state

### References

- [Source: epics.md#Story 2.3]
- [Source: architecture.md#Communication Patterns — Command Handler Pattern]
- [Source: architecture.md#Structure Patterns — apps/web/src/commands/]
- [Source: architecture.md#Canvas Boundary]
- [Source: ux-design-specification.md#Component Strategy — TodoCard]
- [Source: ux-design-specification.md#Visual Design Foundation]
- [Source: packages/domain/src/todo.ts — declareTodo, positionTodo]
- [Source: packages/domain/src/events.ts — TodoDeclaredEvent, TodoPositionedEvent]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
