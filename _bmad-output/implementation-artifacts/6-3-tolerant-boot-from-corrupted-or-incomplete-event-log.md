# Story 6.3: Tolerant Boot from Corrupted or Incomplete Event Log

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want the app to always open in a usable state regardless of what is in the event log,
so that no corruption, truncation, or unexpected state ever shows me an error screen.

## Acceptance Criteria

1. **Given** the event log contains duplicate events (same `eventId`), **when** the app boots and runs `repairEvents()`, **then** duplicates are silently removed — only the first occurrence of each `eventId` is kept (FR29)
2. **Given** the event log contains events with unknown `eventType` strings, **when** the app boots and runs `repairEvents()`, **then** unknown events are silently skipped without error (FR30)
3. **Given** the event log contains orphaned `SessionStartedEvent` records (no matching completion), **when** the app boots and runs `repairEvents()`, **then** orphaned sessions past their configured duration are auto-completed; orphaned sessions within window are left open for resume (Story 1.6, NFR9)
4. **Given** the SQLite `events` table contains rows with truncated or malformed JSON in the `payload` column, **when** `SqliteEventStore.readAll()` is called during boot, **then** corrupted rows are skipped gracefully and all valid events are returned — no crash, no unhandled exception (NFR8)
5. **Given** any combination of corruption scenarios (duplicates + unknown types + orphaned sessions + malformed JSON), **when** the app boots, **then** the user sees the canvas with whatever state could be recovered — the repair is entirely invisible, no crash, no error screen (NFR8)
6. **Given** any unrecoverable corruption state, **when** the repair pipeline and projections run, **then** no user data is silently lost — every unrecoverable state has a deterministic fallback: corrupted rows are skipped, projections fall back to `INITIAL_*_STATE` constants, and the canvas renders (NFR9)

## Tasks / Subtasks

### Task 1: Add tolerant JSON parsing to SqliteEventStore (AC: #4)

This is the **critical gap** — currently `SqliteEventStore.readAll()` and `readByAggregate()` call `JSON.parse()` without try-catch. A malformed payload crashes the app before `repairEvents()` is reached.

- [x] 1.1 In `SqliteEventStore.readAll()`, replace `rows.map()` with `rows.flatMap()` using a per-row try-catch that skips corrupted rows:
  ```typescript
  return rows.flatMap((row) => {
    try { return [JSON.parse(row.payload) as DomainEvent]; }
    catch { return []; }
  });
  ```
- [x] 1.2 Apply the same `flatMap` + per-row try-catch pattern to `SqliteEventStore.readByAggregate()`
- [x] 1.3 Add tests to `SqliteEventStore.test.ts` — note: tests must insert rows with raw malformed payload strings (e.g. `'{truncated'`, `'not json at all'`) directly via the mock SQLocal `sql` method, not via `append()` which always produces valid JSON:
  - `readAll()` with one malformed JSON row among valid rows — returns only valid events
  - `readAll()` with ALL rows malformed — returns empty array
  - `readByAggregate()` with malformed JSON row — returns only valid events

### Task 2: Add defensive error handling to bootstrap sequence (AC: #5, #6)

Currently `main.tsx:bootstrap()` has no try-catch around projection functions. If a repaired event has unexpected field values, projections could throw.

- [x] 2.1 Wrap the projection pipeline in `main.tsx:bootstrap()` (steps 3–6 in the boot sequence: `repairEvents()`, synthesized event persistence loop, snapshot lookup, and all four `reduce()` projections) with a try-catch. On failure, fall back to **all** `INITIAL_*_STATE` constants — use all-or-nothing fallback, not partial results. Exact imports: `INITIAL_TODO_LIST_STATE`, `INITIAL_SHELF_STATE`, `INITIAL_DEVOTION_RECORD_STATE`, `INITIAL_ACTIVE_SESSION_STATE` from `@tododoro/domain`
- [x] 2.2 Ensure the catch block still calls `useCanvasStore.bootstrap()` and `useSessionStore.bootstrap()` with the initial states so the canvas renders empty rather than crashing
- [x] 2.3 Also wrap the synthesized event persistence loop (`for (const event of synthesizedEvents) { await eventStore.append(event) }`) — if persisting a synthesized event fails, log nothing, skip it, and continue boot. The synthesized event will be re-created on next boot
- [x] 2.4 Add a test to `bootstrap.test.ts`: projection with an event containing unexpected/corrupted field values — app still boots with empty/initial state

### Task 3 (optional): Verify existing repair pipeline covers all ACs (AC: #1, #2, #3)

The repair pipeline is already implemented and tested (Story 1.6, 29 tests, all 6 scenarios). This task is a quick verification pass — skip if confident from the existing test suite.

- [x] 3.1 Run `pnpm turbo test --filter=@tododoro/domain` and confirm all 29 repair tests pass
- [x] 3.2 Spot-check: confirm `deduplicateByEventId()`, `skipUnknownEventTypes()`, and `autoCloseOrphanedSessions()` each have dedicated test cases — no new tests expected
- [x] 3.3 If any gaps found, add missing test coverage

### Task 4: End-to-end integration verification (AC: #5)

- [x] 4.1 Add an integration-style test to `bootstrap.test.ts`: mock event store returns a mixed set (valid events + duplicates + unknown types + orphaned session) — verify the app boots with correct recovered state
- [x] 4.2 Run `pnpm turbo test` — all tests pass, zero regressions
- [x] 4.3 Run `pnpm turbo typecheck` — zero errors
- [x] 4.4 Run `pnpm turbo build` — clean production bundle

## Dev Notes

### Critical Context: Repair Pipeline Already Implemented

The repair pipeline (`packages/domain/src/repair.ts`) was built in Story 1.6 and is fully tested with 29 tests covering 6 corruption scenarios. Story 6.2 wired it into the boot sequence. **This story's primary work is closing the gap between the storage layer and the repair pipeline.**

The architecture is:
```
SqliteEventStore.readAll()          ← THIS is where the gap is (no JSON error handling)
  → repairEvents()                  ← ALREADY handles: dedup, unknown types, upcast, orphans
    → projections (reduce)          ← ALREADY works, but needs defensive fallback
      → bootstrap stores            ← ALREADY works
        → React renders             ← ALREADY works
```

### The Critical Gap: SqliteEventStore JSON Parsing

`SqliteEventStore.readAll()` at line 46 does:
```typescript
return rows.map((row) => JSON.parse(row.payload) as DomainEvent);
```

If ANY row has truncated/malformed JSON, `JSON.parse()` throws and the entire boot fails. The repair pipeline never executes. The fix: wrap in a per-row try-catch that skips corrupted rows.

**Contrast with JsonEventStore** — `JsonEventStore.readFromStorage()` already has try-catch around `JSON.parse` (line 28) and returns `[]` on failure. SqliteEventStore needs the same pattern, but per-row rather than for the whole array.

### File-Level SQLite Corruption (Already Covered)

If OPFS corrupts the SQLite database file itself, SQLocal will throw during `createEventStore()` initialization — before `readAll()` is ever called. This scenario is **already handled** by `db.ts`, which falls back to `JsonEventStore` when `SqliteEventStore` initialization fails. Story 6.3 does NOT need to address this — the existing fallback covers it. Confirm this during verification but do not re-implement.

### NFR8 — The Core Requirement

> "The app opens in a usable state 100% of the time regardless of event log state (corruption, truncation, orphaned sessions) — canvas renders, no crash or unrecoverable error screen, and session state is recoverable via the repair pipeline"

The boot sequence in `main.tsx` already has a top-level catch (lines 76–84) that renders an error screen. Story 6.3's goal is to ensure we **never reach that catch** for storage-layer corruption — the tolerant reader should handle it internally.

### Repair Pipeline Functions (DO NOT Reinvent)

All 4 functions in `repair.ts` are complete and tested:

| Function | Lines | Purpose |
|----------|-------|---------|
| `skipUnknownEventTypes()` | 59–65 | Filters events with unrecognized `eventType`; maintains `KNOWN_EVENT_TYPES` Set (10 types) |
| `deduplicateByEventId()` | 33–44 | Removes duplicates by `eventId`; keeps first occurrence |
| `upcastEvents()` | 46–57 | Schema migration pipeline; passes through at v1, future migration point |
| `autoCloseOrphanedSessions()` | 67–104 | Detects orphaned `SessionStartedEvent`; synthesizes completion if past window |
| `repairEvents()` | 108–118 | Pipeline composer: skip unknown → dedup → upcast → auto-close orphans |

**Pipeline order matters:** Unknown types filtered first (prevents type errors in dedup/upcast), then dedup, then upcast, then orphan close (synthesizes new events based on final normalized set).

### Boot Sequence Flow (from `main.tsx` lines 23–85)

```
1. createEventStore()                    → SqliteEventStore (or JsonEventStore fallback)
2. eventStore.readAll()                  → all rows from SQLite  ← ADD TOLERANT PARSING HERE
3. repairEvents(allEvents, clock, idGen) → deduplicated, upcasted, orphans handled
4. Persist synthesized events            → loop: await append() for each new event
5. Find last SnapshotCreatedEvent        → optional performance optimization
6. Project state via reduce()            → todoList, shelf, devotion, session  ← ADD FALLBACK HERE
7. useCanvasStore.bootstrap(...)         → hydrate canvas store
8. useSessionStore.bootstrap(...)        → hydrate session store
9. React renders <App />                 → only AFTER bootstrap completes
```

### Existing Code to Reuse (DO NOT Reinvent)

- **Repair pipeline**: `packages/domain/src/repair.ts` — DO NOT modify; all 4 functions are complete
- **Repair tests**: `packages/domain/src/repair.test.ts` — 29 tests covering all 6 corruption scenarios
- **EventStore interface**: `packages/domain/src/ports.ts` — DO NOT modify
- **Boot sequence**: `apps/web/src/main.tsx` — modify only to add projection fallback
- **SqliteEventStore**: `packages/storage/src/SqliteEventStore.ts` — modify `readAll()` and `readByAggregate()` only
- **Bootstrap tests**: `apps/web/src/bootstrap.test.ts` — extend with new corruption scenarios
- **JsonEventStore pattern**: `packages/storage/src/JsonEventStore.ts:readFromStorage()` — reference for try-catch pattern

### Files to Modify

| File | Change |
|------|--------|
| `packages/storage/src/SqliteEventStore.ts` | Add per-row try-catch around `JSON.parse()` in `readAll()` and `readByAggregate()` |
| `packages/storage/src/SqliteEventStore.test.ts` | Add tests for malformed JSON payload handling |
| `apps/web/src/main.tsx` | Add try-catch fallback around projection pipeline in `bootstrap()` |
| `apps/web/src/bootstrap.test.ts` | Add mixed-corruption integration test and projection-failure fallback test |

### Files NOT to Touch

- `packages/domain/src/*` — zero changes to domain (repair pipeline is complete)
- `packages/domain/src/repair.ts` — DO NOT modify
- `packages/domain/src/repair.test.ts` — no new tests needed here; scenarios are covered
- `packages/domain/src/ports.ts` — DO NOT modify EventStore interface
- `packages/storage/src/schema.ts` — no schema changes
- `packages/storage/src/JsonEventStore.ts` — already has try-catch; no changes
- `packages/ui/src/*` — zero changes to UI components
- `apps/web/src/stores/*` — zero changes to Zustand stores
- `apps/web/src/commands/*` — zero changes to command handlers

### Testing Strategy

**Primary focus: verify the app never crashes regardless of storage-layer corruption.**

Existing test infrastructure:
- Repair pipeline: 29 tests in `repair.test.ts` (all 6 scenarios)
- Bootstrap: 5 tests in `bootstrap.test.ts`
- SqliteEventStore: 11 tests in `SqliteEventStore.test.ts`
- JsonEventStore: 9 tests in `JsonEventStore.test.ts` (includes corrupted JSON test)
- **Total: 425 tests currently passing** (158 domain + 20 storage + 247 web)

**New tests to add:**
1. `SqliteEventStore.test.ts`: `readAll()` with malformed JSON rows → only valid events returned
2. `SqliteEventStore.test.ts`: `readAll()` with ALL malformed rows → empty array returned
3. `SqliteEventStore.test.ts`: `readByAggregate()` with malformed JSON row → only valid events returned
4. `bootstrap.test.ts`: mixed-corruption scenario (valid + duplicates + unknown types + orphaned) → correct recovered state
5. `bootstrap.test.ts`: projection failure fallback → app boots with initial state

### Anti-Patterns to Avoid

- DO NOT modify the `repairEvents()` pipeline in `repair.ts` — it is complete and tested
- DO NOT modify the `EventStore` interface in `ports.ts`
- DO NOT add `console.log` or `console.error` in committed code — architecture prohibits production console output
- DO NOT add a global error boundary for storage errors — handle at the storage/bootstrap layer
- DO NOT use `new Date()` or `Date.now()` — use `Clock.now()` port
- DO NOT import from `@tododoro/ui` or `apps/web` in storage package
- DO NOT add batch/transaction support — out of scope

### Performance Constraints

- Boot replay target: <50ms for up to 500 events (NFR4)
- The per-row try-catch in `readAll()` has negligible performance impact — `JSON.parse` only throws on corrupted rows, which is the exceptional case
- Canvas must maintain 60fps during concurrent writes (SQLocal handles this via Web Worker)

### Previous Story Learnings (from Story 6.2)

Key intelligence from Story 6.2:
- **All 9 command handlers** already follow the `await append() → applyEvent()` pattern — no changes needed
- **Boot sequence** already calls `repairEvents()` and persists synthesized events — working correctly
- **425 tests currently passing** (158 domain + 20 storage + 247 web)
- **SQLocal v0.17.0** uses `opfs-sahpool` VFS — does NOT require SharedArrayBuffer
- **Mock SQLocal class** pattern in tests simulates SQLite behavior — follow this pattern for new storage tests
- **Bug fix #21** confirmed singleton pattern (`getEventStore()`) is correct everywhere
- **Code review findings** already addressed: `crossOriginIsolated` check, `destroy()` method, duplicate eventId rejection

### Git Intelligence

Recent commits (last 5 relevant):
- `95ba9e6` Merge PR #23: Story 6.2 — atomic event writes verified
- `f5214a1` feat: verify atomic event writes and boot sequence wiring
- `0b73055` Merge PR #22: code review fixes for SQLite event store
- `5548f06` fix: address code review findings (crossOriginIsolated, destroy, dedup)
- `65d13c8` Merge PR #20: Epic 6 SQLite event store (Story 6.1)

Pattern: feature branch → PR → merge to main. Tests always green before merge.

### Project Structure Notes

- Package dependency graph: `apps/web → @tododoro/storage → @tododoro/domain` (acyclic)
- Storage package has `sqlocal` and `drizzle-orm` as prod dependencies
- TypeScript strict mode: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Monorepo uses pnpm workspaces with Turborepo task orchestration
- Test files co-located with source: `foo.test.ts` next to `foo.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.3, lines 836–852]
- [Source: _bmad-output/planning-artifacts/prd.md — FR28, line 381; FR29, line 382; FR30, line 383]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR8, line 405; NFR9, line 406; NFR10, line 407]
- [Source: _bmad-output/planning-artifacts/architecture.md — Boot Sequence, lines 449–458]
- [Source: _bmad-output/planning-artifacts/architecture.md — Repair Pipeline, line 288; lines 575–577]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data Flow, lines 689–715]
- [Source: _bmad-output/planning-artifacts/architecture.md — Error Handling pattern, lines 464–468]
- [Source: _bmad-output/implementation-artifacts/6-2-atomic-event-writes-and-boot-sequence-wiring.md — complete story]
- [Source: packages/domain/src/repair.ts — repair pipeline implementation]
- [Source: packages/storage/src/SqliteEventStore.ts — readAll() lines 42–47, readByAggregate() lines 49–56]
- [Source: packages/storage/src/JsonEventStore.ts — try-catch pattern, lines 23–31]
- [Source: apps/web/src/main.tsx — bootstrap() function, lines 23–85]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — clean implementation with no blocking issues.

### Completion Notes List

- **Task 1:** Replaced `rows.map()` with `rows.flatMap()` + per-row try-catch in both `readAll()` and `readByAggregate()` of `SqliteEventStore`. Added 3 tests verifying malformed JSON rows are silently skipped.
- **Task 2:** Wrapped the entire projection pipeline in `main.tsx:bootstrap()` with try-catch. On failure, falls back to all `INITIAL_*_STATE` constants. Synthesized event persistence also wrapped with per-event try-catch (skip on failure). `useCanvasStore.bootstrap()` and `useSessionStore.bootstrap()` always called, even on error. Added test with corrupted `SnapshotCreated` event proving fallback to initial state.
- **Task 3:** Verified all 29 repair pipeline tests pass. Confirmed `deduplicateByEventId()`, `skipUnknownEventTypes()`, and `autoCloseOrphanedSessions()` each have dedicated describe blocks. No gaps found.
- **Task 4:** Added mixed-corruption integration test (valid events + duplicate + unknown type + orphaned session). Full test suite passes (430 tests), typecheck clean, production build clean.
- **Code Review (2026-03-24):** 5 findings (0 HIGH, 3 MEDIUM, 2 LOW). Fixed: M1 (readAll rejection test), L1 (readByAggregate all-malformed test), L2 (comment sync). Noted: M2 (shared bootstrap function — future refactor), M3 (non-snapshot catch path is defense-in-depth, unreachable with current projection code). Test count now 432.

### Change Log

- 2026-03-23: Implemented tolerant boot from corrupted/incomplete event log (Story 6.3) — tolerant JSON parsing in SqliteEventStore, defensive bootstrap fallback, integration tests
- 2026-03-24: Code review fixes — added readAll rejection test, readByAggregate all-malformed test, synced catch block comments between main.tsx and bootstrap.test.ts

### File List

- `packages/storage/src/SqliteEventStore.ts` — Modified: `readAll()` and `readByAggregate()` now use `flatMap` + per-row try-catch
- `packages/storage/src/SqliteEventStore.test.ts` — Modified: Added 4 tests for malformed JSON payload handling (3 original + 1 review fix: all-malformed readByAggregate)
- `apps/web/src/main.tsx` — Modified: Wrapped projection pipeline in try-catch with INITIAL_*_STATE fallback; synthesized event persistence wrapped with per-event try-catch; clarified catch block comment
- `apps/web/src/bootstrap.test.ts` — Modified: Updated `bootstrapFromEvents` to mirror main.tsx try-catch; added corruption fallback test, mixed-corruption integration test, and readAll rejection test (review fix)

### Review Follow-ups

- [ ] [Future] Extract shared bootstrap projection logic from `main.tsx` and `bootstrap.test.ts` into a testable function to eliminate code duplication (M2 — low urgency, both files are currently in sync)
