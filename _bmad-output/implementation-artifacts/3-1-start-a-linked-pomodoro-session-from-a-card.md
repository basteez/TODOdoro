# Story 3.1: Start a Linked Pomodoro Session from a Card

Status: ready-for-dev

## Story

As a user,
I want to start a Pomodoro session directly from a todo card on the canvas,
so that focus begins with a single deliberate action and the session is tied to my intention.

## Acceptance Criteria (BDD)

1. **Given** a todo card exists on the canvas and no session is currently active
   **When** the user clicks the start-session affordance on the card (always visible, not hover-only)
   **Then** `handleStartSession(todoId, eventStore)` writes a `SessionStartedEvent` to the event store before the timer begins (NFR10)
   **And** `useSessionStore` is updated with the new `ActiveSessionReadModel`
   **And** the active card is visually foregrounded with a 2px `--session-active` blue ring
   **And** all other canvas cards are dimmed to reduce distraction
   **And** the `AnalogTimerWipe` overlay appears — small, fixed-position, peripheral; never full-canvas
   **And** the action produces visible feedback within 100ms (NFR7)

2. **Given** a session is already active
   **When** the user attempts to start another session from any card
   **Then** no new session is started and the existing session continues uninterrupted

## Tasks / Subtasks

- [ ] Task 1: Create `sessionCommands.ts` with `handleStartSession` (AC: #1)
  - [ ] Create `apps/web/src/commands/sessionCommands.ts`
  - [ ] Implement `handleStartSession(todoId: string, eventStore: EventStore, clock: Clock, idGenerator: IdGenerator): Promise<Result>`
  - [ ] Pattern: read session events → reduce to `SessionState` → call `startSession()` → append event → update both stores
  - [ ] Must `await eventStore.append()` BEFORE starting the timer (NFR10: event persisted before UI)
  - [ ] After append: call `useSessionStore.getState().startSession(activeSessionModel)` and `useCanvasStore.getState().applyEvent(event)`
  - [ ] Default `configuredDurationMs`: 25 * 60 * 1000 (25 minutes) — hardcoded for now, configurable in Epic 7
- [ ] Task 2: Extend `useSessionStore` with session lifecycle methods (AC: #1)
  - [ ] Add `startSession(session: ActiveSessionReadModel): void` — sets `activeSession` to active state
  - [ ] Add `tick(): void` — updates `elapsedMs` from `Date.now() - startedAt` (used by timer display, Story 3.2)
  - [ ] Add `endSession(): void` — resets `activeSession` to idle
  - [ ] Store shape: `{ activeSession: ActiveSessionReadModel; elapsedMs: number; bootstrap; startSession; tick; endSession }`
- [ ] Task 3: Add start-session affordance to `TodoCard` (AC: #1, #2)
  - [ ] Add a visible play/start button to `TodoCard` — always visible, not hover-dependent (WCAG touch target ≥44x44px)
  - [ ] Button: `<button aria-label="Start session for [title]">` with a play icon (simple SVG triangle or Radix icon)
  - [ ] On click: call `handleStartSession(todoId, eventStore, clock, idGenerator)`
  - [ ] Disable button when a session is already active (read from `useSessionStore`)
  - [ ] Pass `isSessionActive` and `isActiveCard` as props via `TodoCardData`
- [ ] Task 4: Visual foregrounding of active card (AC: #1)
  - [ ] Active card: add 2px `--session-active` ring (same style as focus ring but permanent during session)
  - [ ] All other cards: apply `opacity-40` or similar dimming class
  - [ ] Read `activeSession.todoId` from `useSessionStore` in `App.tsx` or `ConstellationCanvas`
  - [ ] Pass `isActiveCard` boolean to each `TodoCard` node data
- [ ] Task 5: Guard against concurrent sessions (AC: #2)
  - [ ] Domain layer already handles this: `startSession()` returns `Error` if state is not idle
  - [ ] UI guard: disable all start-session buttons when `activeSession.status === 'active'`
  - [ ] Visual: dimmed start button + `cursor-not-allowed` when session active
- [ ] Task 6: Tests (AC: #1, #2)
  - [ ] `sessionCommands.test.ts`: handleStartSession writes event, updates stores, returns ok
  - [ ] `sessionCommands.test.ts`: handleStartSession returns error when session already active
  - [ ] `TodoCard.test.tsx`: start button renders, fires callback, disabled when session active
  - [ ] `App.test.tsx` or integration: active card gets blue ring, other cards dimmed
  - [ ] Verify event is persisted before any UI update (NFR10 compliance)

## Dev Notes

### Architecture Compliance

- **Command handler pattern**: follow `todoCommands.ts` exactly — `async`, returns `Result`, never throws, reads events → reduces state → calls domain fn → appends → updates stores. [Source: architecture.md#Communication Patterns]
- **Two-store update**: session events must update BOTH `useSessionStore` (active session state) AND `useCanvasStore` (devotion record, todo pomodoro count via `applyEvent`). [Source: architecture.md#D7]
- **Event before UI**: `await eventStore.append(event)` must resolve BEFORE any store update or timer start. This is NFR10. [Source: architecture.md#Process Patterns]
- **No `console.log`** in production code. [Source: architecture.md#Anti-Patterns]
- **`useEffect` cleanup**: if any `useEffect` is added for session state watching, always return a cleanup function. [Source: architecture.md#Anti-Patterns]

### Domain Layer (Already Implemented)

The session aggregate in `packages/domain/src/session.ts` is fully implemented:
- `startSession(state, todoId, configuredDurationMs, clock, idGenerator)` → `SessionStartedEvent | Error`
- `SessionState` type: `{ status: 'idle' } | { status: 'active'; sessionId; todoId; startedAt; configuredDurationMs }`
- `reduceSession(state, event)` handles SessionStarted/Completed/Abandoned transitions
- `projectActiveSession(state, event)` in `packages/domain/src/projections/activeSession.ts`
- All session domain tests at 100% coverage

### Existing Patterns to Reuse

- `handleDeclareTodo` in `apps/web/src/commands/todoCommands.ts` — exact template for command handler
- `TodoCard.tsx` dropdown menu pattern (Radix `DropdownMenu`) — can add "Start Session" menu item
- `useCanvasStore.getState().applyEvent(event)` — already handles session events in projections

### Key Technical Details

- `configuredDurationMs`: hardcode `25 * 60 * 1000` (25 min). Settings (Epic 7) will make this configurable
- `todoId` param: pass the card's `todoId` from `TodoCardData`
- Session start button should be OUTSIDE the dropdown menu — always visible on the card, not hidden in actions
- React Flow custom nodes: start button needs its own click handler that doesn't conflict with node selection/drag

### Project Structure Notes

Files to create/modify:
```
apps/web/src/
  commands/
    sessionCommands.ts          ← NEW: handleStartSession (+ handleCompleteSession, handleAbandonSession stubs for later stories)
    sessionCommands.test.ts     ← NEW: command handler tests
  stores/
    useSessionStore.ts          ← MODIFY: add startSession, tick, endSession methods
  App.tsx                       ← MODIFY: read activeSession, pass isActiveCard/isSessionActive to card nodes

packages/ui/src/
  components/
    TodoCard.tsx                ← MODIFY: add start-session button, accept isActiveCard/isSessionActive props
    TodoCard.test.tsx           ← MODIFY: add session button tests
    ConstellationCanvas.tsx     ← MODIFY: pass session state to card nodes (if not handled in App.tsx)
```

### Previous Story Intelligence

From Epic 2 retrospective:
- React Flow custom node interactions can conflict — test that start button click doesn't trigger node selection/drag
- Self-review against spec before submitting — check every AC line
- Radix UI handles focus management automatically in menus — leverage this
- Touch targets must be ≥44x44px (WCAG) — caught as issue in Story 2.6

### References

- [Source: epics.md#Story 3.1]
- [Source: architecture.md#Communication Patterns — Command Handler Pattern]
- [Source: architecture.md#D7 — Zustand Store Structure]
- [Source: architecture.md#Process Patterns — Event before UI (NFR10)]
- [Source: architecture.md#Anti-Patterns]
- [Source: ux-design-specification.md#Component Inventory — TodoCard]
- [Source: ux-design-specification.md#Interaction State Patterns — Active Session]
- [Source: packages/domain/src/session.ts — startSession function]
- [Source: packages/domain/src/projections/activeSession.ts — projectActiveSession]
- [Source: apps/web/src/commands/todoCommands.ts — command handler template]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
