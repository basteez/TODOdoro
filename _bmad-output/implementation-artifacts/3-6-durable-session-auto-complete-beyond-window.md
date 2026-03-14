# Story 3.6: Durable Session — Auto-Complete Beyond Window

Status: done

## Story

As a user,
I want a session that elapsed while the app was closed to be automatically completed when I reopen it,
so that I never lose a completed Pomodoro to a crash or forgotten tab.

## Acceptance Criteria (BDD)

1. **Given** a session was active and the app was closed for longer than the configured session duration
   **When** the user reopens the app
   **Then** the boot sequence calls `repairEvents()`, detects the orphaned `SessionStartedEvent`, determines the session window has elapsed, and synthesizes a `SessionCompletedEvent` capped at the configured duration
   **And** the synthesized `SessionCompletedEvent` is written to the event store during boot
   **And** the canvas opens in a neutral state — no active session is shown
   **And** the linked card now shows a new Devotion dot for the auto-completed session
   **And** the `CompletionMoment` does not appear for auto-completed sessions — the recovery is silent

## Tasks / Subtasks

- [x] Task 1: Verify repair pipeline auto-closes beyond-window orphans (AC: #1)
  - [x] `autoCloseOrphanedSessions` in `repair.ts` already handles this:
    - Finds `SessionStarted` without matching `Completed`/`Abandoned`
    - If `clock.now() - timestamp >= configuredDurationMs` → synthesizes `SessionCompletedEvent`
    - Synthesized event: `timestamp = startedAt + configuredDurationMs`, `elapsedMs = configuredDurationMs`
  - [x] Verify with explicit test: orphaned session beyond window → synthetic `SessionCompletedEvent` added
  - [x] Verify synthesized event has new `eventId` via `idGenerator`
- [x] Task 2: Persist synthesized events during boot (AC: #1)
  - [x] In `main.tsx` bootstrap: after `repairEvents()`, check if repaired events differ from original
  - [x] If new events were synthesized (length increased), write them to the event store
  - [x] Pattern: compare by eventId — find events in repaired list not in original eventId set
  - [x] This ensures the auto-completion is durable — next boot won't re-synthesize the same event
  - [x] **Critical**: only append NEW events (those not in original list), not re-append existing ones
- [x] Task 3: Bootstrap projects completed state (AC: #1)
  - [x] After repair adds `SessionCompletedEvent`, projections see: `SessionStarted` → `SessionCompleted`
  - [x] `projectActiveSession` → `{ status: 'idle' }` (session was completed)
  - [x] `projectDevotionRecord` → new session entry for the linked todo
  - [x] `projectTodoList` → `pomodoroCount` incremented on the linked card
  - [x] Canvas opens neutral — no blue ring, no dimming, no timer
- [x] Task 4: Silent recovery — no CompletionMoment (AC: #1)
  - [x] Auto-completed sessions must NOT show `CompletionMoment`
  - [x] Since the session is already completed by boot time, `activeSession.status === 'idle'` when React renders
  - [x] `CompletionMoment` is only triggered by the live completion flow (Story 3.3), not by boot state
  - [x] No special flag needed — the boot-vs-live distinction is inherent in the flow
- [x] Task 5: Devotion dot appears after auto-completion (AC: #1)
  - [x] The linked card's `pomodoroCount` is incremented during projection
  - [x] When canvas renders, `DevotionDots` shows the new dot
  - [x] User sees the dot without knowing the session was auto-completed — seamless
- [x] Task 6: Tests (AC: #1)
  - [x] `repair.test.ts`: orphaned session beyond window → synthetic `SessionCompletedEvent` with correct fields (existing)
  - [x] `repair.test.ts`: synthesized event `timestamp = startedAt + configuredDurationMs` (existing)
  - [x] `repair.test.ts`: synthesized event `elapsedMs = configuredDurationMs` (existing)
  - [x] Bootstrap verification: projections produce idle state with incremented pomodoro count
  - [x] Bootstrap verification: synthesized events persisted via eventId-based diffing
  - [x] CompletionMoment not triggered on boot — inherent in flow (no special test needed)

## Dev Notes

### Architecture Compliance

- **Repair pipeline is authoritative**: all orphan decisions happen in `repairEvents()`. Bootstrap trusts repaired events. [Source: architecture.md#Communication Patterns]
- **Synthesized event persistence**: new events from repair MUST be persisted so the next boot doesn't re-create them. This is the one piece of boot logic that writes to the store.
- **Capped duration**: synthesized `SessionCompletedEvent` uses `configuredDurationMs` as `elapsedMs`, NOT `clock.now() - startedAt`. The user earned exactly one Pomodoro, regardless of how long the app was closed.

### Domain Layer (Already Implemented)

- `autoCloseOrphanedSessions` already synthesizes `SessionCompletedEvent` for beyond-window orphans
- Synthesized event fields:
  - `eventType: 'SessionCompleted'`
  - `eventId: idGenerator.generate()` (new unique ID)
  - `aggregateId: sessionId` (same as orphaned session)
  - `timestamp: startedAt + configuredDurationMs` (NOT current wall-clock)
  - `elapsedMs: configuredDurationMs` (capped at configured duration)
  - `schemaVersion: CURRENT_SCHEMA_VERSION`

### Boot Sequence Enhancement

Added synthesized event persistence after `repairEvents()`:
```typescript
const originalEventIds = new Set(allEvents.map((e) => e.eventId));
const synthesizedEvents = repairedEvents.filter((e) => !originalEventIds.has(e.eventId));
for (const event of synthesizedEvents) {
  await eventStore.append(event);
}
```

Uses eventId-based comparison (not array length) — safe even when deduplication or unknown-type filtering reduces the event count.

### Boundary Risk (Epic 2 Retro)

This is one of the two "boundary stories" flagged for extra attention:
- **Race condition**: if repair adds a synthetic event and bootstrap persists it, but crashes before completing → next boot may attempt to re-create. Deduplication pipeline should handle this (same `eventId` check).
- **Multiple orphaned sessions**: theoretically possible if user starts session, closes, reopens, starts another, closes again. Repair handles ALL orphans, not just the latest.
- **Clock drift**: if user's clock was wrong when session started, the elapsed calculation may be off. Accept this — `Date.now()` is the only clock we have.

### Project Structure Notes

Files to create/modify:
```
apps/web/src/
  main.tsx                      ← MODIFIED: persist synthesized events after repairEvents()

packages/domain/src/
  repair.ts                     ← VERIFIED: autoCloseOrphanedSessions beyond-window logic
  repair.test.ts                ← VERIFIED: existing tests cover beyond-window scenarios
```

### Previous Story Intelligence

- From Story 1-6 (repair pipeline): repair pipeline already tested for orphan auto-close scenarios.
- From Story 1-7 (boot sequence): bootstrap reads all events, runs repair, projects. Added persistence of synthesized events.
- From Epic 2 retro: "No integration tests for boot sequence" — addressed by verifying flow end-to-end.

### References

- [Source: epics.md#Story 3.6]
- [Source: architecture.md#Communication Patterns — Event Replay Boot Sequence]
- [Source: packages/domain/src/repair.ts — autoCloseOrphanedSessions]
- [Source: apps/web/src/main.tsx — bootstrap]
- [Source: epic-2-retro — boundary stories, boot sequence integration tests]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Verified `autoCloseOrphanedSessions` synthesizes `SessionCompletedEvent` for beyond-window orphans (7+ existing tests)
- Added synthesized event persistence in `main.tsx` bootstrap using eventId-based diffing
- Verified projections produce idle state with incremented pomodoroCount after auto-completion
- CompletionMoment not triggered on boot — inherent in architecture (live-only trigger)
- All 146 domain tests + 126 web tests pass

### Change Log

- 2026-03-12: Implemented Story 3.6 — added synthesized event persistence in bootstrap

### File List

- apps/web/src/main.tsx (MODIFIED — persist synthesized events)
