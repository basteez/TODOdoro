# Story 3.4: Session Abandonment Below 60-Second Threshold

Status: done

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

- [x] Task 1: Implement `handleAbandonSession` in `sessionCommands.ts` (AC: #1)
  - [x] Add to `apps/web/src/commands/sessionCommands.ts`
  - [x] Pattern: read session events by aggregateId → reduce → call `abandonSession()` → append → update stores
  - [x] `await eventStore.append(event)` before any UI update
  - [x] After append: `useSessionStore.getState().endSession()` + `useCanvasStore.getState().applyEvent(event)`
  - [x] `applyEvent(SessionAbandonedEvent)` does NOT increment pomodoro count or add devotion session (domain projections handle this)
- [x] Task 2: Add cancel/abandon affordance to the session UI (AC: #1)
  - [x] Add a cancel button/action accessible during an active session
  - [x] Options: (a) small X button on the `AnalogTimerWipe`, (b) Escape key handler, (c) click on the timer to cancel
  - [x] Recommended: small X button on timer + Escape key as additional trigger
  - [x] Cancel button: `<button aria-label="Cancel session">` — minimal, not prominent
  - [x] On cancel click: check elapsed time. If < 60s → call `handleAbandonSession`. If ≥ 60s → call `handleCompleteSession` (early completion, not abandonment)
- [x] Task 3: Silent abandonment — no CompletionMoment (AC: #1)
  - [x] When `handleAbandonSession` is called, do NOT show `CompletionMoment`
  - [x] Canvas returns to neutral immediately: blue ring removed, cards un-dimmed, timer unmounted
  - [x] No toast, no message, no confirmation dialog, no animation — completely silent
  - [x] The absence of ceremony IS the design — stopping early carries zero shame
- [x] Task 4: Verify domain projections exclude abandoned sessions (AC: #2)
  - [x] `projectDevotionRecord`: already ignores `SessionAbandoned` — verify with test
  - [x] `projectTodoList`: already does NOT increment `pomodoroCount` on `SessionAbandoned` — verify with test
  - [x] No new domain code needed — projections already handle this correctly
  - [x] Add UI-level tests confirming no dots appear after abandonment
- [x] Task 5: 60-second threshold logic (AC: #1)
  - [x] The 60-second threshold is a UI-level decision, not domain-level
  - [x] When user cancels: `const elapsedMs = Date.now() - activeSession.startedAt`
  - [x] If `elapsedMs < 60_000` → `handleAbandonSession()`
  - [x] If `elapsedMs >= 60_000` → `handleCompleteSession()` (user earned the Pomodoro)
  - [x] This threshold may become configurable in Epic 7 — keep as a named constant: `const ABANDON_THRESHOLD_MS = 60_000`
- [x] Task 6: Tests (AC: #1, #2)
  - [x] `sessionCommands.test.ts`: handleAbandonSession writes event, updates stores
  - [x] Integration: cancel at 30s → no devotion dot, no CompletionMoment, canvas neutral
  - [x] Integration: cancel at 90s → CompletionMoment shown, devotion dot appears (early completion, not abandonment)
  - [x] Verify abandoned sessions excluded from devotion record display

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

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- `handleAbandonSession` already created in Story 3.1 sessionCommands.ts
- Added cancel button (X icon) on AnalogTimerWipe with `onCancel` prop
- Escape key listener in App.tsx during active session
- 60-second threshold: < 60s → abandon (silent), >= 60s → early complete (with CompletionMoment)
- Named constant `ABANDON_THRESHOLD_MS = 60_000`
- Silent abandonment: no CompletionMoment, no devotion dot, canvas returns to neutral
- Domain projections already exclude abandoned sessions from devotion/pomodoro counts

### Change Log

- 2026-03-12: Implemented Story 3.4 — cancel button, Escape key, 60-second threshold

### File List

- packages/ui/src/components/AnalogTimerWipe.tsx (MODIFIED)
- apps/web/src/App.tsx (MODIFIED)
- apps/web/src/commands/sessionCommands.test.ts (MODIFIED)
