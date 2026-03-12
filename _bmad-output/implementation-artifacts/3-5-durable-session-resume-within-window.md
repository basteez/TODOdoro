# Story 3.5: Durable Session — Resume Within Window

Status: ready-for-dev

## Story

As a user,
I want my active session to resume automatically if I reopen the app while the timer window has not elapsed,
so that accidental tab closes or browser crashes never cost me a session.

## Acceptance Criteria (BDD)

1. **Given** a session is active and the app is closed or the tab is hidden/crashed
   **When** the user reopens the app before the configured session duration has elapsed since `SessionStartedEvent.timestamp`
   **Then** the boot sequence calls `repairEvents()`, detects the orphaned `SessionStartedEvent`, and determines the session window is still open
   **And** `useSessionStore` is initialised with the session in-progress, with the timer resumed at the correct elapsed position
   **And** the `AnalogTimerWipe` renders showing the already-elapsed portion filled
   **And** the active card's blue ring is shown and other cards are dimmed — the session UI is fully restored
   **And** no user action is required to resume; recovery is automatic and invisible

## Tasks / Subtasks

- [ ] Task 1: Verify repair pipeline handles in-window orphans correctly (AC: #1)
  - [ ] `autoCloseOrphanedSessions` in `packages/domain/src/repair.ts` already handles this:
    - Finds `SessionStartedEvent` without matching `SessionCompleted`/`SessionAbandoned`
    - If `clock.now() - startedAt < configuredDurationMs` → does NOT synthesize completion (session still valid)
  - [ ] Verify this with explicit test: orphaned session within window → no synthetic event added
  - [ ] After repair, the `SessionStartedEvent` remains in the repaired event list without a closing event
- [ ] Task 2: Bootstrap detects in-progress session (AC: #1)
  - [ ] In `main.tsx` bootstrap: after `repairEvents()`, project `ActiveSessionReadModel` from repaired events
  - [ ] If projected state is `{ status: 'active', ... }`, the session is still in-progress
  - [ ] Pass this active session to `useSessionStore.getState().bootstrap(sessionState)`
  - [ ] The existing bootstrap already does this — verify it works with an orphaned-but-valid session
- [ ] Task 3: Session UI auto-restores on boot (AC: #1)
  - [ ] When `useSessionStore.activeSession.status === 'active'` after bootstrap:
    - `AnalogTimerWipe` mounts automatically (conditional render in App.tsx)
    - Timer rAF loop starts (picks up from `startedAt`, calculates correct elapsed)
    - Active card's blue ring and card dimming applied (reads `activeSession.todoId`)
  - [ ] No special "resume" code needed — the same reactive UI used during normal session start handles this
  - [ ] The timer shows correct elapsed position: `Date.now() - activeSession.startedAt` already accounts for time while app was closed
- [ ] Task 4: Edge case — app reopened at boundary (AC: #1)
  - [ ] If app reopens when `elapsed >= configuredDurationMs` → this is Story 3.6 (auto-complete), not resume
  - [ ] Ensure clean boundary: repair pipeline makes the determination, not bootstrap code
  - [ ] If repair adds a synthetic `SessionCompletedEvent`, bootstrap sees idle state → no resume
- [ ] Task 5: Tests (AC: #1)
  - [ ] `repair.test.ts`: orphaned session within window → no synthetic completion added
  - [ ] Bootstrap integration test: given events with orphaned in-window session → `useSessionStore.activeSession.status === 'active'`
  - [ ] UI test: when bootstrapped with active session → timer displays, card highlighted, correct elapsed shown
  - [ ] Boundary test: session started 24:59 ago with 25:00 duration → resumes (1 second left)

## Dev Notes

### Architecture Compliance

- **Boot sequence order**: `readAll → repairEvents → project → bootstrap → render`. Resume happens naturally within this flow. [Source: architecture.md#Communication Patterns — Event Replay Boot Sequence]
- **No special resume logic**: the event-sourced architecture handles this automatically. If the last session event is `SessionStarted` without a closing event, projections produce `{ status: 'active' }`. The UI renders accordingly.
- **Repair pipeline is the single source of truth**: all orphan detection and auto-close decisions happen in `repairEvents()`. Bootstrap code never makes these decisions. [Source: packages/domain/src/repair.ts]

### Domain Layer (Already Implemented)

- `autoCloseOrphanedSessions(events, clock, idGenerator)` in `repair.ts`:
  - Finds `SessionStarted` events without matching `Completed`/`Abandoned`
  - If `clock.now() - timestamp < configuredDurationMs` → leaves the event as-is (session still valid)
  - If `clock.now() - timestamp >= configuredDurationMs` → synthesizes `SessionCompletedEvent` (Story 3.6)
- `projectActiveSession(state, event)` in `projections/activeSession.ts`:
  - `SessionStarted` → `{ status: 'active', sessionId, todoId, startedAt, configuredDurationMs }`
  - Without a closing event, final projected state IS active

### Why This Works Automatically

1. App boots → reads all events from localStorage
2. `repairEvents()` sees orphaned `SessionStarted` with `clock.now() - timestamp < duration` → no change
3. `projectActiveSession` over repaired events → `{ status: 'active', startedAt: originalTimestamp }`
4. Bootstrap stores active session in `useSessionStore`
5. React renders → `activeSession.status === 'active'` → timer mounts, card highlights
6. rAF loop calculates `Date.now() - startedAt` → correct elapsed position

### Key Technical Details

- `startedAt` is the ORIGINAL `SessionStartedEvent.timestamp` — not the reopen time. This means elapsed time correctly includes the time the app was closed.
- rAF naturally stopped when tab was hidden/closed. On reopen, first tick picks up correct wall-clock elapsed.
- If `elapsedMs >= configuredDurationMs` on first tick after reopen → immediate completion (race handled by guard in tick loop from Story 3.3).

### Boundary Risk (Epic 2 Retro)

Epic 2 retro flagged Stories 3.5 and 3.6 as "boundary stories" requiring extra refinement attention. Key risks:
- Race between rAF first tick and completion: ensure completion fires exactly once
- `JsonEventStore` localStorage timing: append is synchronous but wrapped in async — no real race, but test it
- Tab visibility API: rAF pauses when tab is hidden. On un-hide, first frame may have a large time jump → completion may fire immediately. This is correct behaviour.

### Project Structure Notes

Files to create/modify:
```
apps/web/src/
  main.tsx                      ← VERIFY: bootstrap already handles active session projection
  App.tsx                       ← VERIFY: session UI renders correctly from bootstrap state

packages/domain/src/
  repair.ts                     ← VERIFY: autoCloseOrphanedSessions leaves in-window sessions
  repair.test.ts                ← ADD: explicit in-window orphan test if not already present
```

Minimal new code expected — mostly verification and testing that existing architecture handles this scenario.

### Previous Story Intelligence

- From Story 1-7 (boot sequence wiring): bootstrap already projects all four read models from events. Session projection is included.
- From Epic 2 retro: "No integration tests for boot sequence" flagged as MEDIUM debt. This story is a good place to add a boot-with-active-session integration test.
- From Epic 1 retro: "Complexity lives at boundaries, not in domain logic" — the boot sequence edge cases are the real risk here.

### References

- [Source: epics.md#Story 3.5]
- [Source: architecture.md#Communication Patterns — Event Replay Boot Sequence]
- [Source: architecture.md#D7 — useSessionStore bootstrap]
- [Source: packages/domain/src/repair.ts — autoCloseOrphanedSessions]
- [Source: packages/domain/src/projections/activeSession.ts — projectActiveSession]
- [Source: apps/web/src/main.tsx — bootstrap function]
- [Source: epic-2-retro — boundary stories need extra attention]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
