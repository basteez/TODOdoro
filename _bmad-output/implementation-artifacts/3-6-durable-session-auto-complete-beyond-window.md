# Story 3.6: Durable Session — Auto-Complete Beyond Window

Status: ready-for-dev

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

- [ ] Task 1: Verify repair pipeline auto-closes beyond-window orphans (AC: #1)
  - [ ] `autoCloseOrphanedSessions` in `repair.ts` already handles this:
    - Finds `SessionStarted` without matching `Completed`/`Abandoned`
    - If `clock.now() - timestamp >= configuredDurationMs` → synthesizes `SessionCompletedEvent`
    - Synthesized event: `timestamp = startedAt + configuredDurationMs`, `elapsedMs = configuredDurationMs`
  - [ ] Verify with explicit test: orphaned session beyond window → synthetic `SessionCompletedEvent` added
  - [ ] Verify synthesized event has new `eventId` via `idGenerator`
- [ ] Task 2: Persist synthesized events during boot (AC: #1)
  - [ ] In `main.tsx` bootstrap: after `repairEvents()`, check if repaired events differ from original
  - [ ] If new events were synthesized (length increased), write them to the event store
  - [ ] Pattern: `for (const event of synthesizedEvents) { await eventStore.append(event); }`
  - [ ] This ensures the auto-completion is durable — next boot won't re-synthesize the same event
  - [ ] **Critical**: only append NEW events (those not in original list), not re-append existing ones
- [ ] Task 3: Bootstrap projects completed state (AC: #1)
  - [ ] After repair adds `SessionCompletedEvent`, projections see: `SessionStarted` → `SessionCompleted`
  - [ ] `projectActiveSession` → `{ status: 'idle' }` (session was completed)
  - [ ] `projectDevotionRecord` → new session entry for the linked todo
  - [ ] `projectTodoList` → `pomodoroCount` incremented on the linked card
  - [ ] Canvas opens neutral — no blue ring, no dimming, no timer
- [ ] Task 4: Silent recovery — no CompletionMoment (AC: #1)
  - [ ] Auto-completed sessions must NOT show `CompletionMoment`
  - [ ] Since the session is already completed by boot time, `activeSession.status === 'idle'` when React renders
  - [ ] `CompletionMoment` is only triggered by the live completion flow (Story 3.3), not by boot state
  - [ ] No special flag needed — the boot-vs-live distinction is inherent in the flow
- [ ] Task 5: Devotion dot appears after auto-completion (AC: #1)
  - [ ] The linked card's `pomodoroCount` is incremented during projection
  - [ ] When canvas renders, `DevotionDots` shows the new dot
  - [ ] User sees the dot without knowing the session was auto-completed — seamless
- [ ] Task 6: Tests (AC: #1)
  - [ ] `repair.test.ts`: orphaned session beyond window → synthetic `SessionCompletedEvent` with correct fields
  - [ ] `repair.test.ts`: synthesized event `timestamp = startedAt + configuredDurationMs`
  - [ ] `repair.test.ts`: synthesized event `elapsedMs = configuredDurationMs` (capped, not wall-clock)
  - [ ] Bootstrap integration: given beyond-window orphan → boot to neutral state with incremented pomodoro count
  - [ ] Bootstrap integration: verify synthesized events are persisted to event store
  - [ ] Verify no CompletionMoment shown on boot with auto-completed session

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

Current bootstrap in `main.tsx`:
```typescript
const allEvents = await eventStore.readAll();
const repairedEvents = repairEvents(allEvents, clock, idGenerator);
// ... project state from repairedEvents
```

Enhancement needed:
```typescript
const allEvents = await eventStore.readAll();
const repairedEvents = repairEvents(allEvents, clock, idGenerator);

// Persist any synthesized events
if (repairedEvents.length > allEvents.length) {
  const newEvents = repairedEvents.slice(allEvents.length);
  for (const event of newEvents) {
    await eventStore.append(event);
  }
}

// ... project state from repairedEvents (unchanged)
```

**Important**: `repairEvents` may also remove events (deduplication, unknown types). Compare by content, not just length, or track synthesized events separately. Check the actual repair pipeline return type.

### Boundary Risk (Epic 2 Retro)

This is one of the two "boundary stories" flagged for extra attention:
- **Race condition**: if repair adds a synthetic event and bootstrap persists it, but crashes before completing → next boot may attempt to re-create. Deduplication pipeline should handle this (same `eventId` check).
- **Multiple orphaned sessions**: theoretically possible if user starts session, closes, reopens, starts another, closes again. Repair handles ALL orphans, not just the latest.
- **Clock drift**: if user's clock was wrong when session started, the elapsed calculation may be off. Accept this — `Date.now()` is the only clock we have.

### Project Structure Notes

Files to create/modify:
```
apps/web/src/
  main.tsx                      ← MODIFY: persist synthesized events after repairEvents()

packages/domain/src/
  repair.ts                     ← VERIFY: autoCloseOrphanedSessions beyond-window logic
  repair.test.ts                ← ADD: explicit beyond-window orphan test if not present
```

Minimal new code — mainly enhancing bootstrap to persist synthesized events.

### Previous Story Intelligence

- From Story 1-6 (repair pipeline): repair pipeline already tested for orphan auto-close scenarios. Verify tests cover the beyond-window case specifically.
- From Story 1-7 (boot sequence): bootstrap reads all events, runs repair, projects. Adding persistence of synthesized events is the one enhancement.
- From Epic 2 retro: "No integration tests for boot sequence" — this is the story to add them.

### References

- [Source: epics.md#Story 3.6]
- [Source: architecture.md#Communication Patterns — Event Replay Boot Sequence]
- [Source: packages/domain/src/repair.ts — autoCloseOrphanedSessions]
- [Source: apps/web/src/main.tsx — bootstrap]
- [Source: epic-2-retro — boundary stories, boot sequence integration tests]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
