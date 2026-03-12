# Story 3.7: Start an Unlinked Exploration Session

Status: done

## Story

As a user,
I want to start a Pomodoro session without linking it to any card,
so that I can focus before knowing what I am focusing on.

## Acceptance Criteria (BDD)

1. **Given** no session is currently active
   **When** the user activates the Exploration session affordance — a fixed-position canvas-level control outside any card
   **Then** `handleStartSession(null, eventStore)` writes a `SessionStartedEvent` with `todoId: null`
   **And** the `AnalogTimerWipe` appears with the same visual treatment as a linked session but with no card foregrounded
   **And** the session runs to completion normally; if < 60 seconds, it is silently abandoned

2. **Given** an Exploration session completes (≥ 60 seconds)
   **When** the `CompletionMoment` appears
   **Then** it offers two options: "Attach to a todo" (opens a card picker) or "Leave unlinked"
   **And** selecting a card calls `handleAttributeExplorationSession(sessionId, todoId, eventStore)`, which updates the session's `todoId` and adds a Devotion dot to the chosen card
   **And** selecting "Leave unlinked" or dismissing stores the session as an unlinked record without modifying any card

## Tasks / Subtasks

- [x] Task 1: Add Exploration session affordance to canvas (AC: #1)
  - [x] Add a fixed-position button outside any card — canvas-level control
  - [x] Position: bottom-left corner (fixed, z-index above canvas)
  - [x] Icon: circle with play triangle — distinct from card-level start buttons
  - [x] `<button aria-label="Start exploration session">` — keyboard accessible, 44x44px touch target
  - [x] Disable when a session is already active
  - [x] Visual: ~35% opacity at rest (same as ShelfIcon/SettingsIcon peripheral pattern)
- [x] Task 2: Wire `handleStartSession(null, ...)` for exploration (AC: #1)
  - [x] Reuse `handleStartSession` from Story 3.1 — pass `null` as `todoId`
  - [x] Domain layer already supports `todoId: null` (Exploration sessions)
  - [x] `SessionStartedEvent` written with `todoId: null`
  - [x] `useSessionStore` updated with active session where `todoId === null`
- [x] Task 3: Session UI without card foregrounding (AC: #1)
  - [x] When `activeSession.todoId === null`: no card gets the blue ring, no cards are dimmed
  - [x] `AnalogTimerWipe` still renders in the same position with the same visual treatment
  - [x] Timer runs normally — completion/abandonment logic from Stories 3.3/3.4 applies identically
  - [x] Adjusted card foregrounding: pass `isSessionActive: false` to cards when `activeTodoId === null`
- [x] Task 4: Create Exploration `CompletionMoment` variant (AC: #2)
  - [x] When an Exploration session completes (todoId === null), show different `CompletionMoment`:
    - Title: "Exploration session — N Pomodoro(s)"
    - Two action buttons: "Attach to a todo" and "Leave unlinked"
    - No auto-dismiss — user must choose (or press Escape to leave unlinked)
  - [x] "Leave unlinked": dismiss dialog, session stays with `todoId: null`
  - [x] Escape: same as "Leave unlinked"
- [x] Task 5: Create card picker for "Attach to a todo" (AC: #2)
  - [x] Created `CardPicker` component using Radix Dialog
  - [x] Lists active todo cards with title + current pomodoro count
  - [x] On card selection: calls `handleAttributeExplorationSession`
  - [x] After attribution: devotion dot appears on the chosen card, dialogs dismiss
  - [x] Shows "No active todos" when empty, "Leave unlinked" always available
- [x] Task 6: Implement `handleAttributeExplorationSession` (AC: #2)
  - [x] New domain event: `SessionAttributedEvent` with `aggregateId` (sessionId), `todoId`
  - [x] Added to `DomainEvent` union in `events.ts`
  - [x] Added projection handling in `devotionRecord.ts` (tracks pendingExplorations → completedExplorations → records)
  - [x] Added projection handling in `todoList.ts` (increments `pomodoroCount` on target)
  - [x] Added to `KNOWN_EVENT_TYPES` in `repair.ts`
  - [x] Command handler: validates exploration session exists, is completed, not already attributed
  - [x] After `applyEvent`: chosen card's `pomodoroCount` increments
- [x] Task 7: Abandonment for exploration sessions (AC: #1)
  - [x] If exploration session cancelled < 60s → `handleAbandonSession` exactly as Story 3.4
  - [x] Silent, no UI, no attribution prompt — same as linked session abandonment
- [x] Task 8: Tests (AC: #1, #2)
  - [x] `sessionCommands.test.ts`: handleAttributeExplorationSession — writes event, updates stores, error cases
  - [x] `ExplorationButton.test.tsx`: renders, fires onClick, disabled during active session, 44px touch target
  - [x] `CardPicker.test.tsx`: lists todos, selection triggers onSelect, "Leave unlinked" triggers onCancel, empty state
  - [x] `CompletionMoment.test.tsx`: exploration variant shows two options, no auto-dismiss
  - [x] `devotionRecord.test.ts`: exploration tracking (pendingExplorations, completedExplorations, attribution)
  - [x] `todoList.test.ts`: SessionAttributed increments pomodoroCount

## Dev Notes

### Architecture Compliance

- **Exploration sessions are first-class**: `todoId: null` is explicitly supported throughout the domain.
- **Command handler pattern**: `handleAttributeExplorationSession` follows established async/Result/never-throws pattern.
- **New event type**: `SessionAttributedEvent` added as the only new domain event in Epic 3.

### Domain Layer Changes

- `SessionAttributedEvent` added to `events.ts`
- `devotionRecord.ts`: Added `pendingExplorations` and `completedExplorations` maps
- `todoList.ts`: `SessionAttributed` increments `pomodoroCount` on target todo
- `repair.ts`: `SessionAttributed` added to KNOWN_EVENT_TYPES

### References

- [Source: epics.md#Story 3.7]
- [Source: architecture.md#D2 — Session aggregate, todoId: null for exploration]
- [Source: architecture.md#Communication Patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Added `SessionAttributedEvent` to domain events union
- Extended `devotionRecord.ts` with `pendingExplorations` and `completedExplorations` tracking
- Extended `todoList.ts` to handle `SessionAttributed` (increment pomodoroCount)
- Created `ExplorationButton` — 44px touch target, 35% opacity, disabled during active session
- Created `CardPicker` — Radix Dialog with todo list, empty state, "Leave unlinked"
- Modified `CompletionMoment` — exploration variant with two action buttons, no auto-dismiss
- Added `handleAttributeExplorationSession` command handler with validation
- Wired exploration flow in App.tsx: button → start → timer → completion → attach/leave
- Adjusted card dimming: no foregrounding during exploration sessions
- 300 total tests (154 domain + 146 web) all passing

### Change Log

- 2026-03-12: Implemented Story 3.7 — exploration sessions with attribution flow

### File List

- packages/domain/src/events.ts (MODIFIED)
- packages/domain/src/index.ts (MODIFIED)
- packages/domain/src/repair.ts (MODIFIED)
- packages/domain/src/projections/devotionRecord.ts (MODIFIED)
- packages/domain/src/projections/devotionRecord.test.ts (MODIFIED)
- packages/domain/src/projections/todoList.ts (MODIFIED)
- packages/domain/src/projections/todoList.test.ts (MODIFIED)
- packages/ui/src/components/ExplorationButton.tsx (NEW)
- packages/ui/src/components/CardPicker.tsx (NEW)
- packages/ui/src/components/CompletionMoment.tsx (MODIFIED)
- packages/ui/src/index.ts (MODIFIED)
- apps/web/src/commands/sessionCommands.ts (MODIFIED)
- apps/web/src/commands/sessionCommands.test.ts (MODIFIED)
- apps/web/src/App.tsx (MODIFIED)
- apps/web/src/components/ExplorationButton.test.tsx (NEW)
- apps/web/src/components/CardPicker.test.tsx (NEW)
- apps/web/src/components/CompletionMoment.test.tsx (MODIFIED)
