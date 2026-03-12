# Story 3.4: Session Abandonment Below 60-Second Threshold

Status: ready-for-dev

## Story

As a user,
I want sessions under 60 seconds to be silently discarded,
so that accidental starts or interruptions never pollute my Devotion Record and there is no shame in stopping.

## Acceptance Criteria (BDD)

1. **Given** an active session is running
   **When** the user cancels the session within the first 60 seconds
   **Then** `handleAbandonSession` writes a `SessionAbandonedEvent` to the event store
   **And** no Devotion dot is added to the card
   **And** the `CompletionMoment` does not appear — abandonment is completely silent
   **And** the canvas returns immediately to its neutral state with no messaging, no confirmation, and no shame indicator

2. **Given** an active session was abandoned
   **When** the Devotion Record is viewed on the linked card
   **Then** the abandoned session does not appear in the timeline

## Tasks / Subtasks

- [ ] Task 1: Implement `handleAbandonSession` in `sessionCommands.ts` (AC: #1)
  - [ ] Add to `apps/web/src/commands/sessionCommands.ts`
  - [ ] Pattern: read session events by aggregateId → reduce → call `abandonSession()` → append → update stores
  - [ ] `await eventStore.append(event)` before any UI update
  - [ ] After append: `useSessionStore.getState().endSession()` + `useCanvasStore.getState().applyEvent(event)`
  - [ ] `applyEvent(SessionAbandonedEvent)` does NOT increment pomodoro count or add devotion session (domain projections handle this)
- [ ] Task 2: Add cancel/abandon affordance to the session UI (AC: #1)
  - [ ] Add a cancel button/action accessible during an active session
  - [ ] Options: (a) small X button on the `AnalogTimerWipe`, (b) Escape key handler, (c) click on the timer to cancel
  - [ ] Recommended: small X button on timer + Escape key as additional trigger
  - [ ] Cancel button: `<button aria-label="Cancel session">` — minimal, not prominent
  - [ ] On cancel click: check elapsed time. If < 60s → call `handleAbandonSession`. If ≥ 60s → call `handleCompleteSession` (early completion, not abandonment)
- [ ] Task 3: Silent abandonment — no CompletionMoment (AC: #1)
  - [ ] When `handleAbandonSession` is called, do NOT show `CompletionMoment`
  - [ ] Canvas returns to neutral immediately: blue ring removed, cards un-dimmed, timer unmounted
  - [ ] No toast, no message, no confirmation dialog, no animation — completely silent
  - [ ] The absence of ceremony IS the design — stopping early carries zero shame
- [ ] Task 4: Verify domain projections exclude abandoned sessions (AC: #2)
  - [ ] `projectDevotionRecord`: already ignores `SessionAbandoned` — verify with test
  - [ ] `projectTodoList`: already does NOT increment `pomodoroCount` on `SessionAbandoned` — verify with test
  - [ ] No new domain code needed — projections already handle this correctly
  - [ ] Add UI-level tests confirming no dots appear after abandonment
- [ ] Task 5: 60-second threshold logic (AC: #1)
  - [ ] The 60-second threshold is a UI-level decision, not domain-level
  - [ ] When user cancels: `const elapsedMs = Date.now() - activeSession.startedAt`
  - [ ] If `elapsedMs < 60_000` → `handleAbandonSession()`
  - [ ] If `elapsedMs >= 60_000` → `handleCompleteSession()` (user earned the Pomodoro)
  - [ ] This threshold may become configurable in Epic 7 — keep as a named constant: `const ABANDON_THRESHOLD_MS = 60_000`
- [ ] Task 6: Tests (AC: #1, #2)
  - [ ] `sessionCommands.test.ts`: handleAbandonSession writes event, updates stores
  - [ ] Integration: cancel at 30s → no devotion dot, no CompletionMoment, canvas neutral
  - [ ] Integration: cancel at 90s → CompletionMoment shown, devotion dot appears (early completion, not abandonment)
  - [ ] Verify abandoned sessions excluded from devotion record display

## Dev Notes

### Architecture Compliance

- **Command handler pattern**: same as other session commands. [Source: architecture.md#Communication Patterns]
- **Silent by design**: no UI feedback on abandonment. This is intentional product philosophy — "no shame in stopping." [Source: epics.md#Story 3.4, ux-design-specification.md]
- **60-second threshold**: UI-level constant, not in domain. Domain `abandonSession()` always succeeds regardless of elapsed time. The threshold decision lives in the cancel handler.

### Domain Layer (Already Implemented)

- `abandonSession(state, clock, idGenerator)` → `SessionAbandonedEvent | Error` in `packages/domain/src/session.ts`
- `SessionAbandonedEvent` contains `elapsedMs` — records actual elapsed time
- `projectDevotionRecord` ignores `SessionAbandoned` events — no devotion record entry created
- `projectTodoList` does NOT increment `pomodoroCount` on `SessionAbandoned`

### Cancel Interaction Design

- Cancel button on timer: small, subtle, doesn't dominate. Think "X" icon at ~16px, `opacity-50` at rest, full on hover.
- Escape key: register via `useEffect` with cleanup when session is active. Same pattern as keyboard shortcuts in Story 2.7.
- Both cancel paths funnel to the same logic: check elapsed → abandon or early-complete.

### Edge Cases

- User cancels at exactly 60.000 seconds: `>=` → complete (not abandon). Give the user the benefit.
- User cancels at 59.999 seconds: `<` → abandon. Clean threshold.
- Tab visibility: if tab was hidden, `Date.now()` still returns correct wall-clock time. Elapsed calculation is correct regardless of rAF pauses.

### Project Structure Notes

Files to create/modify:
```
apps/web/src/
  commands/
    sessionCommands.ts          ← MODIFY: add handleAbandonSession
    sessionCommands.test.ts     ← MODIFY: add abandonment tests
  App.tsx                       ← MODIFY: wire cancel handler, Escape key listener during session

packages/ui/src/
  components/
    AnalogTimerWipe.tsx         ← MODIFY: add cancel button/affordance
```

### Previous Story Intelligence

- From Story 2.7: Escape key listener pattern — `useEffect` with `addEventListener('keydown', ...)` and cleanup. Reuse exactly.
- The cancel handler must not conflict with Radix Dialog Escape handling if CompletionMoment is somehow open (shouldn't be, but defensive).

### References

- [Source: epics.md#Story 3.4]
- [Source: architecture.md#Communication Patterns]
- [Source: ux-design-specification.md — no shame design principle]
- [Source: packages/domain/src/session.ts — abandonSession]
- [Source: packages/domain/src/projections/devotionRecord.ts — ignores SessionAbandoned]
- [Source: packages/domain/src/projections/todoList.ts — no pomodoroCount on abandoned]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
