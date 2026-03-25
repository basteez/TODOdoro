# Story 6.4: Schema Migration and Event Versioning

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a developer,
I want all stored events to carry a `schemaVersion` field and the upcasting pipeline to handle version differences,
so that the app can always replay events written by any previous version of itself without data loss.

## Acceptance Criteria

1. **Given** events are being written to `SqliteEventStore`, **when** any event is appended, **then** it carries the current `schemaVersion` value in both the `schema_version` column and the event payload — verified by reading raw rows
2. **Given** a simulated v2 schema change (adding a new field with a default to an existing event type), **when** the boot sequence replays v1 events through `upcastEvents()`, **then** the upcasting function transforms v1 events to include the new field with its default value — proving the migration path works end-to-end
3. **Given** the event log contains a mix of v1 events and v2 events, **when** the boot sequence replays all events, **then** v1 events are upcasted to v2 before projection and v2 events pass through unchanged — both are projected correctly without errors (NFR11)
4. **Given** the app successfully replays mixed-version event logs, **when** `pnpm turbo test` is run, **then** all existing tests pass plus new schema migration scenario tests — zero regressions
5. **Given** a future developer needs to add a v3 schema change, **when** they read the upcasting code and tests, **then** the established pattern (versioned upcast functions, pipeline composition, test fixtures) provides a clear, documented template to follow

## Tasks / Subtasks

### Task 1: Verify existing schemaVersion infrastructure is complete (AC: #1)

The infrastructure was built in Stories 1.2 and 6.1. This task verifies every layer persists and reads `schemaVersion` correctly.

- [x] 1.1 Add a test to `SqliteEventStore.test.ts`: append a `TodoDeclaredEvent` with `schemaVersion: 1`, read the raw row via `sql` method, assert both `schema_version` column = 1 AND `JSON.parse(payload).schemaVersion` = 1
- [x] 1.2 Add a test: append two events with different `schemaVersion` values (1 and 2), `readAll()`, assert each event's `schemaVersion` is preserved as written
- [x] 1.3 Verify `CURRENT_SCHEMA_VERSION` constant is exported from `@tododoro/domain` and used consistently — spot-check command handlers in `apps/web/src/commands/` to confirm events are created with `schemaVersion: CURRENT_SCHEMA_VERSION`

### Task 2: Implement a demonstrable v1→v2 upcast migration (AC: #2, #3)

The `upcastEvent()` function in `repair.ts` is currently a pass-through at v1. This task adds a **real but backwards-compatible** schema bump to prove the migration pipeline works end-to-end.

**The v2 change:** Add `configuredDurationMs` field (with default `25 * 60 * 1000` = 25 minutes) to `SessionCompletedEvent` and `SessionAbandonedEvent`. These events currently lack this field — only `SessionStartedEvent` carries it. This is a genuinely useful addition: when viewing the Devotion Record, the configured duration context is immediately available without cross-referencing the start event.

- [x] 2.1 Bump `CURRENT_SCHEMA_VERSION` from `1` to `2` in `packages/domain/src/events.ts`
- [x] 2.2 Add `configuredDurationMs: number` field to `SessionCompletedEvent` and `SessionAbandonedEvent` type definitions in `events.ts`
- [x] 2.3 Implement `upcastFromV1ToV2(event: DomainEvent): DomainEvent` in `repair.ts`:
  - If event is `SessionCompletedEvent` or `SessionAbandonedEvent` with `schemaVersion === 1` (missing `configuredDurationMs`):
    - Set `configuredDurationMs` to `25 * 60 * 1000` (default Pomodoro duration)
    - Set `schemaVersion` to `2`
  - All other events: set `schemaVersion` to `2` (no field changes needed)
- [x] 2.4 Update `upcastEvent()` to call `upcastFromV1ToV2()` when `event.schemaVersion < 2`, then return
- [x] 2.5 Update all command handlers that create `SessionCompletedEvent` and `SessionAbandonedEvent` to include `configuredDurationMs` (passed from the session's `configuredDurationMs` in the command handler context)
- [x] 2.6 Update `autoCloseOrphanedSessions()` in `repair.ts` to include `configuredDurationMs` when synthesizing `SessionCompletedEvent` for orphaned sessions (use the orphaned `SessionStartedEvent.configuredDurationMs`)

### Task 3: Add comprehensive migration test coverage (AC: #2, #3, #4)

- [x] 3.1 In `repair.test.ts`, add test suite `upcastFromV1ToV2`:
  - v1 `SessionCompletedEvent` (no `configuredDurationMs`) → upcasted to v2 with default `1500000`
  - v1 `SessionAbandonedEvent` (no `configuredDurationMs`) → upcasted to v2 with default `1500000`
  - v1 `TodoDeclaredEvent` → upcasted to v2 with schemaVersion bumped, no field changes
  - v2 `SessionCompletedEvent` (already has `configuredDurationMs`) → passes through unchanged
- [x] 3.2 In `repair.test.ts`, update existing `upcastEvents` tests:
  - Events at `CURRENT_SCHEMA_VERSION` (now 2) pass through unchanged
  - Events with `schemaVersion: 1` are upcasted to v2
  - Events with `schemaVersion: 0` are upcasted through v1→v2 (handled by pass-through since v0→v1 has no changes, then v1→v2 adds fields)
- [x] 3.3 In `repair.test.ts`, add `repairEvents pipeline` test: mixed v1+v2 event log → all events projected correctly after pipeline
- [x] 3.4 In `bootstrap.test.ts`, add integration test: boot from mixed v1+v2 event log → all read models hydrated correctly, `SessionCompletedEvent` events have `configuredDurationMs` after upcast
- [x] 3.5 Update all existing test helpers (`makeSessionCompleted`, `makeSessionAbandoned`) to include `configuredDurationMs` field with default value

### Task 4: Update projections and verify downstream compatibility (AC: #3, #4)

- [x] 4.1 Check if any projection (`devotionRecord.ts`, `activeSession.ts`) currently reads `configuredDurationMs` from `SessionCompletedEvent` or `SessionAbandonedEvent` — if not, no projection changes needed (the field is available for future use)
- [x] 4.2 Run `pnpm turbo test` — all tests pass, zero regressions
- [x] 4.3 Run `pnpm turbo typecheck` — zero errors (TypeScript will catch any missing `configuredDurationMs` fields)
- [x] 4.4 Run `pnpm turbo build` — clean production bundle

### Task 5: Document the migration pattern for future developers (AC: #5)

- [x] 5.1 Add a comment block at the top of `upcastEvent()` in `repair.ts` documenting the migration pattern:
  ```
  // Schema Migration Pattern:
  // 1. Bump CURRENT_SCHEMA_VERSION in events.ts
  // 2. Add/modify fields on affected event types
  // 3. Add upcastFromVNToVN+1() function below
  // 4. Chain in upcastEvent(): if (event.schemaVersion < N+1) event = upcastFromVNToVN+1(event)
  // 5. Update command handlers to populate new fields
  // 6. Add tests: v(N) events upcasted correctly, mixed-version replay works
  ```
- [x] 5.2 Ensure the upcast chain is ordered: `v1→v2` runs first, then future `v2→v3`, etc. — sequential application ensures any version can reach current

## Dev Notes

### Critical Context: Migration Infrastructure Already Exists

The migration infrastructure was planned from Day 1 (architecture decision: "schemaVersion on every event from day one"). The following pieces are **already in place**:

| Component | Location | Status |
|-----------|----------|--------|
| `CURRENT_SCHEMA_VERSION = 1` | `packages/domain/src/events.ts:13` | Exists — bump to 2 |
| `schemaVersion` field on all events | `packages/domain/src/events.ts` (all 10 types) | Exists |
| `schema_version` column in SQLite | `packages/storage/src/schema.ts:10` | Exists, default 1 |
| `upcastEvent()` pass-through | `packages/domain/src/repair.ts:52-57` | Exists — add v1→v2 logic |
| `upcastEvents()` pipeline step | `packages/domain/src/repair.ts:46-50` | Exists — no changes |
| `repairEvents()` pipeline | `packages/domain/src/repair.ts:108-118` | Exists — calls upcast at step 3 |
| Boot sequence calls repair | `apps/web/src/main.tsx:35` | Exists — no changes |
| Test fixtures for mismatched versions | `packages/domain/src/repair.test.ts:436-444` | Exists — extend |

**This story's primary work is PROVING the migration path works** by implementing a real v1→v2 schema change, not just verifying the plumbing.

### The v2 Schema Change Rationale

Adding `configuredDurationMs` to `SessionCompletedEvent` and `SessionAbandonedEvent` is:
- **Genuinely useful**: Currently these events only carry `elapsedMs`. The configured duration context (was this a 25-min or 5-min session?) is only on `SessionStartedEvent`. Adding it to completion/abandonment events makes the Devotion Record richer without cross-referencing.
- **Backwards-compatible**: v1 events without the field get a sensible default (25 minutes = standard Pomodoro).
- **Non-breaking**: No projection currently reads this field from completion events, so adding it causes zero regressions.
- **Demonstrates the pattern**: Shows how to add a field, set a default for old events, and chain upcast functions.

### Upcast Pipeline Architecture

```
upcastEvent(event)
  ├── if event.schemaVersion < 2 → upcastFromV1ToV2(event)
  │     ├── SessionCompletedEvent → add configuredDurationMs: 25*60*1000
  │     ├── SessionAbandonedEvent → add configuredDurationMs: 25*60*1000
  │     └── all others → bump schemaVersion to 2
  └── return event  (at CURRENT_SCHEMA_VERSION, pass through)

Future: if event.schemaVersion < 3 → upcastFromV2ToV3(event)
```

### Boot Sequence — No Changes Needed

The boot sequence already handles upcasting correctly:
```
1. createEventStore()              → SqliteEventStore
2. eventStore.readAll()            → raw events (mixed v1+v2)
3. repairEvents()                  → skipUnknown → dedup → UPCAST → autoClose
4. Persist synthesized events      → new events at v2
5. Project state via reduce()      → all events now at v2
6. Bootstrap stores                → React renders
```

Steps 2-3 already ensure all events are upcasted before projection. No changes to `main.tsx` needed.

### Files to Modify

| File | Change |
|------|--------|
| `packages/domain/src/events.ts` | Bump `CURRENT_SCHEMA_VERSION` to 2; add `configuredDurationMs` to `SessionCompletedEvent` and `SessionAbandonedEvent` |
| `packages/domain/src/repair.ts` | Add `upcastFromV1ToV2()`; update `upcastEvent()` to call it; update `autoCloseOrphanedSessions()` to include `configuredDurationMs` in synthesized events |
| `packages/domain/src/repair.test.ts` | Add v1→v2 upcast tests; update existing fixtures; add mixed-version pipeline test |
| `packages/storage/src/SqliteEventStore.test.ts` | Add schemaVersion column/payload verification tests |
| `apps/web/src/commands/sessionCommands.ts` | Add `configuredDurationMs` to `SessionCompletedEvent` and `SessionAbandonedEvent` creation |
| `apps/web/src/bootstrap.test.ts` | Add mixed-version boot integration test |

### Files NOT to Touch

- `packages/domain/src/ports.ts` — EventStore interface unchanged
- `packages/storage/src/schema.ts` — SQLite schema unchanged (schema_version column already exists)
- `packages/storage/src/SqliteEventStore.ts` — reads/writes schemaVersion correctly already
- `packages/storage/src/JsonEventStore.ts` — fallback store, no changes
- `packages/ui/src/*` — zero UI changes
- `apps/web/src/main.tsx` — boot sequence already calls upcast pipeline
- `apps/web/src/stores/*` — zero store changes
- `apps/web/src/db.ts` — event store factory unchanged

### Testing Strategy

**Primary focus: prove the migration pipeline works end-to-end with a real schema change.**

Existing test infrastructure:
- Repair pipeline: 29 tests in `repair.test.ts`
- Bootstrap: tests in `bootstrap.test.ts`
- SqliteEventStore: tests in `SqliteEventStore.test.ts`
- **Total: ~432 tests currently passing**

New tests to add:
1. `SqliteEventStore.test.ts`: schemaVersion persisted in both column and payload (2 tests)
2. `repair.test.ts`: `upcastFromV1ToV2` suite — 4 tests (completed, abandoned, other event, already-v2)
3. `repair.test.ts`: updated `upcastEvents` suite — 3 tests (v2 pass-through, v1 upcasted, v0 upcasted)
4. `repair.test.ts`: mixed v1+v2 pipeline test (1 test)
5. `bootstrap.test.ts`: mixed-version boot integration (1 test)

**Expected: ~10-12 new tests, all existing tests updated and passing.**

### Previous Story Learnings (from Story 6.3)

Key intelligence from Story 6.3:
- **432 tests currently passing** (158 domain + 20+ storage + 247+ web)
- **Mock SQLocal class** pattern in tests: simulates SQLite behavior — follow for new storage tests
- **Bootstrap test pattern**: `bootstrapFromEvents()` helper mirrors `main.tsx:bootstrap()` — extend for mixed-version scenario
- **Tolerant JSON parsing** already in SqliteEventStore — corrupted rows skip gracefully
- **Repair pipeline order matters**: skip unknown → dedup → upcast → auto-close. Upcast runs AFTER dedup, so duplicates don't get upcasted twice
- **Synthesized events** from `autoCloseOrphanedSessions()` need `configuredDurationMs` since they create `SessionCompletedEvent`
- **`exactOptionalPropertyTypes`** TypeScript flag is enabled — adding a required field to an event type will cause compile errors everywhere it's constructed without the field. TypeScript is your guardrail here.

### Git Intelligence

Recent commits (last 5 relevant):
- `26cb243` Merge PR #24: Story 6.3 — tolerant boot from corrupted/incomplete event log
- `c921aa3` feat: tolerant boot from corrupted or incomplete event log
- `95ba9e6` Merge PR #23: Story 6.2 — atomic event writes
- `f5214a1` feat: verify atomic event writes and boot sequence wiring
- `0b73055` Merge PR #22: code review fixes for SQLite event store

Pattern: feature branch → PR → merge to main. Tests always green before merge.

### Anti-Patterns to Avoid

- DO NOT add `console.log` or `console.error` — architecture prohibits production console output
- DO NOT modify `EventStore` interface in `ports.ts`
- DO NOT modify `SqliteEventStore` read/write logic — it already handles `schemaVersion` correctly
- DO NOT create a separate migrations directory or migration files — upcasting is in-memory at boot time, not a database migration
- DO NOT use `new Date()` or `Date.now()` — use `Clock.now()` port
- DO NOT make `configuredDurationMs` optional on the event types — it's required at v2, and the upcast function guarantees all v1 events get it
- DO NOT modify the repair pipeline ORDER in `repairEvents()` — upcast must run after dedup and skip-unknown

### Performance Constraints

- Boot replay target: <50ms for up to 500 events (NFR4)
- Upcasting is O(n) with n = number of events — negligible overhead per event (single property check + optional field addition)
- No database migration needed — upcasting happens in-memory after `readAll()`

### Project Structure Notes

- Package dependency graph: `apps/web → @tododoro/storage → @tododoro/domain` (acyclic)
- TypeScript strict mode: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Monorepo: pnpm workspaces + Turborepo
- Test files co-located: `foo.test.ts` next to `foo.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.4, lines 855-869]
- [Source: _bmad-output/planning-artifacts/prd.md — FR27-31 (Event Storage & Data Integrity)]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR11 (schemaVersion on every event; successful replay of any previous version)]
- [Source: _bmad-output/planning-artifacts/architecture.md — "schemaVersion on every event from day one" constraint, line 65]
- [Source: _bmad-output/planning-artifacts/architecture.md — Cross-cutting concern #1: Event schema versioning, line 71]
- [Source: _bmad-output/planning-artifacts/architecture.md — Nice-to-have gap: Drizzle migration files, line 785]
- [Source: _bmad-output/planning-artifacts/architecture.md — repairEvents pipeline, line 288]
- [Source: packages/domain/src/events.ts — CURRENT_SCHEMA_VERSION, line 13]
- [Source: packages/domain/src/repair.ts — upcastEvent() pass-through, lines 52-57]
- [Source: packages/domain/src/repair.ts — repairEvents() pipeline, lines 108-118]
- [Source: packages/storage/src/schema.ts — schema_version column, line 10]
- [Source: packages/storage/src/SqliteEventStore.ts — append() with schemaVersion, line 35]
- [Source: _bmad-output/implementation-artifacts/6-3-tolerant-boot-from-corrupted-or-incomplete-event-log.md — complete previous story]

## Change Log

- 2026-03-24: Implemented v1→v2 schema migration — added `configuredDurationMs` to `SessionCompletedEvent` and `SessionAbandonedEvent`, implemented `upcastFromV1ToV2()` upcast function, updated all command handlers and test helpers, added 9 new tests (4 upcast unit, 2 pipeline, 2 storage, 1 bootstrap integration). All 441 tests pass, zero regressions. Typecheck and build clean.
- 2026-03-25: Code review fixes — added defensive `schemaVersion` guard in `upcastEvent()` for corrupted events with missing/NaN schemaVersion; added `configuredDurationMs` runtime assertions to `sessionCommands.test.ts` for complete/abandon event tests. All 441 tests pass.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

No debug issues encountered. TypeScript `exactOptionalPropertyTypes` correctly surfaced all construction sites missing the new `configuredDurationMs` field (2 test files: bootstrap.test.ts, sessionCommands.test.ts).

### Completion Notes List

- Bumped `CURRENT_SCHEMA_VERSION` from 1 to 2 in `events.ts`
- Added `configuredDurationMs: number` to `SessionCompletedEvent` and `SessionAbandonedEvent` interfaces
- Implemented `upcastFromV1ToV2()` in `repair.ts` — adds default 25-minute `configuredDurationMs` to v1 session completion/abandonment events, bumps schemaVersion on all others
- Updated `upcastEvent()` to chain v1→v2 upcast when `event.schemaVersion < 2`
- Updated `completeSession()` and `abandonSession()` in `session.ts` to include `configuredDurationMs` from session state
- Updated `autoCloseOrphanedSessions()` to include `configuredDurationMs` in synthesized events
- Added 6-line migration pattern documentation comment above `upcastEvent()`
- No projection changes needed — no projection currently reads `configuredDurationMs` from completion/abandonment events
- Test results: 441 total (164 domain + 26 storage + 251 web), zero regressions
- No files in "Files NOT to Touch" list were modified

### File List

- `packages/domain/src/events.ts` — Modified: bumped CURRENT_SCHEMA_VERSION to 2, added configuredDurationMs to SessionCompletedEvent and SessionAbandonedEvent
- `packages/domain/src/repair.ts` — Modified: added upcastFromV1ToV2(), updated upcastEvent() with migration chain, updated autoCloseOrphanedSessions() with configuredDurationMs, added migration pattern comment
- `packages/domain/src/repair.test.ts` — Modified: added upcastFromV1ToV2 test suite (4 tests), updated upcastEvents tests (3 tests), added mixed v1+v2 pipeline test, updated Scenario 6 test, updated test helpers with configuredDurationMs
- `packages/domain/src/session.ts` — Modified: added configuredDurationMs to completeSession() and abandonSession() return events
- `packages/storage/src/SqliteEventStore.test.ts` — Modified: added 2 schemaVersion persistence tests
- `apps/web/src/bootstrap.test.ts` — Modified: added mixed v1+v2 boot integration test, added CURRENT_SCHEMA_VERSION import, added configuredDurationMs to existing SessionCompleted fixture
- `apps/web/src/commands/sessionCommands.test.ts` — Modified: added configuredDurationMs to SessionCompleted fixture
