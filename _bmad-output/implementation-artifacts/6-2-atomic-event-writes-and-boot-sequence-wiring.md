# Story 6.2: Atomic Event Writes and Boot Sequence Wiring

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a user,
I want every session start to be durably persisted before the timer begins,
so that I never have an in-memory-only timer state that can be lost if the app closes.

## Acceptance Criteria

1. **Given** `SqliteEventStore` is implemented (Story 6.1), **when** `apps/web/src/db.ts` switches from `JsonEventStore` to `SqliteEventStore`, **then** the boot sequence in `main.tsx` correctly initialises `SqliteEventStore` and runs the full repair + projection pipeline before rendering
2. **And** `handleStartSession` awaits the `append()` call and only starts the timer tick after the `SessionStartedEvent` is confirmed written (NFR10)
3. **And** all other command handlers (`handleDeclareTodo`, `handleSealTodo`, `handleReleaseTodo`, etc.) similarly await `append()` before updating Zustand state
4. **And** the app opens correctly on first launch (empty OPFS database) and on subsequent launches with existing event data
5. **And** `pnpm turbo build` produces a clean production bundle with OPFS storage active

## Tasks / Subtasks

### IMPORTANT: Story 6.1 already implemented most of this wiring

During Story 6.1 implementation, the boot sequence wiring and await-before-update pattern were already completed. This story's primary work is **verification, testing, and addressing any remaining gaps**.

- [x] Task 1: Verify AC1 — Boot sequence wiring (AC: #1)
  - [x] 1.1 Confirm `main.tsx` calls `createEventStore()` → `readAll()` → `repairEvents()` → projections → `bootstrap()` → render
  - [x] 1.2 Confirm `db.ts` creates `SqliteEventStore` as primary with `JsonEventStore` fallback
  - [x] 1.3 Confirm boot sequence handles empty OPFS database (first launch) — projections start from `INITIAL_*_STATE` constants
  - [x] 1.4 Confirm boot sequence replays existing event data on subsequent launches

- [x] Task 2: Verify AC2 — handleStartSession atomicity (AC: #2)
  - [x] 2.1 Confirm `sessionCommands.ts:handleStartSession` calls `await eventStore.append(event)` BEFORE `useSessionStore.getState().startSession()` (which triggers the timer tick)
  - [x] 2.2 Confirm that if `append()` throws, the catch block returns `{ ok: false }` and the session store is NOT updated (timer never starts)
  - [x] 2.3 Add test: `handleStartSession` does NOT call `useSessionStore.startSession()` when `append()` rejects

- [x] Task 3: Verify AC3 — All command handlers await append (AC: #3)
  - [x] 3.1 Audit every handler in `todoCommands.ts` (5 handlers) and `sessionCommands.ts` (4 handlers) — confirm each calls `await eventStore.append()` before any `applyEvent()` or Zustand state mutation
  - [x] 3.2 Special attention: `handleDeclareTodo` creates 2 events (TodoDeclared + TodoPositioned) — both are persisted sequentially with `await` before their respective `applyEvent()` calls
  - [x] 3.3 Add tests for at least `handleDeclareTodo` and `handleStartSession` confirming Zustand is NOT updated when `append()` rejects

- [x] Task 4: Verify AC4 — First launch and subsequent launches (AC: #4)
  - [x] 4.1 Test: app boots with empty OPFS database → canvas renders with zero todos, no active session
  - [x] 4.2 Test: app boots with existing events → state is correctly reconstructed from event log
  - [x] 4.3 Test: app boots after events were synthesized by repair pipeline → synthesized events are persisted and replayed on next boot

- [x] Task 5: Verify AC5 — Production bundle (AC: #5)
  - [x] 5.1 Run `pnpm turbo build` — confirm zero errors, clean production bundle
  - [x] 5.2 Confirm SQLite WASM binary and worker scripts are included in the output
  - [x] 5.3 Run `pnpm turbo typecheck` — zero errors
  - [x] 5.4 Run `pnpm turbo test` — all tests pass

- [x] Task 6: Address any gaps found during verification (AC: all)
  - [x] 6.1 Fix any handlers that do NOT properly await before Zustand update
  - [x] 6.2 Add any missing error handling for append failures
  - [x] 6.3 Ensure all new/changed code passes CI (`typecheck`, `test`, `build`)

## Dev Notes

### Critical Context: Most Work Already Done in Story 6.1

Story 6.1's implementation went beyond its strict scope and already completed the boot sequence wiring and command handler patterns that Story 6.2 requires. Specifically:

- `db.ts` already creates `SqliteEventStore` as primary, `JsonEventStore` as fallback
- `main.tsx` already calls `createEventStore()` and runs the full repair + projection pipeline
- All 9 command handlers already follow the `await append() → applyEvent()` pattern
- The `getEventStore()` singleton pattern is already in place

**This story is primarily a verification and testing story.** The dev agent should:
1. Read and verify the current code matches each AC
2. Add any missing test coverage for the atomic write guarantee
3. Fix any gaps found
4. Confirm production build works

### NFR10 — The Core Requirement

> "Event writes are atomic — a `SessionStarted` event is persisted before the timer begins; no in-memory-only timer state exists"

The critical path is `handleStartSession` in `sessionCommands.ts`:
```
await eventStore.append(event);          // Line 32: persist FIRST
useSessionStore.getState().startSession({...});  // Line 33: THEN start timer
useCanvasStore.getState().applyEvent(event);     // Line 40: THEN update canvas
```

If `append()` throws, the `catch` block on line 43 returns `{ ok: false }` — the session store and canvas store are never updated, so the timer never starts. This is correct.

### Command Handler Audit (Current State)

All handlers in `todoCommands.ts` and `sessionCommands.ts` follow the same pattern:
```typescript
await eventStore.append(event);              // persist first
useCanvasStore.getState().applyEvent(event); // then update Zustand
```

**9 handlers total, all already correct:**

| Handler | File | Events | Pattern |
|---------|------|--------|---------|
| `handleDeclareTodo` | todoCommands.ts:15 | 2 (Declared + Positioned) | Sequential await+apply for each |
| `handlePositionTodo` | todoCommands.ts:51 | 1 | await → applyEvent |
| `handleRenameTodo` | todoCommands.ts:77 | 1 | await → applyEvent |
| `handleSealTodo` | todoCommands.ts:103 | 1 | await → applyEvent |
| `handleReleaseTodo` | todoCommands.ts:128 | 1 | await → applyEvent |
| `handleStartSession` | sessionCommands.ts:17 | 1 | await → startSession → applyEvent |
| `handleCompleteSession` | sessionCommands.ts:49 | 1 | await → endSession → applyEvent |
| `handleAbandonSession` | sessionCommands.ts:74 | 1 | await → endSession → applyEvent |
| `handleAttributeExplorationSession` | sessionCommands.ts:99 | 1 | await → applyEvent |

### Boot Sequence (Current State)

`main.tsx` boot flow (already implemented):
```
createEventStore()                     → SqliteEventStore or JsonEventStore fallback
eventStore.readAll()                   → all persisted events
repairEvents(allEvents, clock, idGen)  → repaired event stream
persist synthesized events             → loop: await append() for each new event
find last snapshot                     → optional SnapshotCreatedEvent
project state from events              → todoList, shelf, devotion, session
useCanvasStore.bootstrap(...)          → hydrate canvas store
useSessionStore.bootstrap(...)         → hydrate session store
React renders <App />                  → only AFTER bootstrap completes
```

### Known Edge Case: Multi-Event Handlers

`handleDeclareTodo` produces 2 events (TodoDeclared + TodoPositioned) and persists them sequentially:
```typescript
await eventStore.append(declareResult);   // event 1
applyEvent(declareResult);
await eventStore.append(positionResult);  // event 2
applyEvent(positionResult);
```

If the second `append` fails, the first event is persisted but the position is not. On next boot, the todo would appear at position (0,0) since no `TodoPositionedEvent` exists. This is acceptable for v1 — the todo still exists and can be repositioned. The ACs don't require transaction support.

### Existing Code to Reuse (DO NOT Reinvent)

- **EventStore interface**: `packages/domain/src/ports.ts` — DO NOT modify
- **SqliteEventStore**: `packages/storage/src/SqliteEventStore.ts` — already implements EventStore
- **db.ts singleton**: `apps/web/src/db.ts` — `createEventStore()` + `getEventStore()`
- **Boot sequence**: `apps/web/src/main.tsx` — already wired correctly
- **Command handlers**: `apps/web/src/commands/todoCommands.ts` and `sessionCommands.ts` — already await before Zustand update
- **Existing test mocks**: `apps/web/src/test-setup.ts` — mocks `db.ts` `getEventStore` for tests

### Files to Verify (NOT Expected to Modify)

| File | What to Verify |
|------|----------------|
| `apps/web/src/main.tsx` | Boot sequence: createEventStore → readAll → repair → project → bootstrap → render |
| `apps/web/src/db.ts` | SqliteEventStore primary, JsonEventStore fallback, singleton pattern |
| `apps/web/src/commands/todoCommands.ts` | All 5 handlers await append before applyEvent |
| `apps/web/src/commands/sessionCommands.ts` | All 4 handlers await append before Zustand update |
| `apps/web/src/App.tsx` | eventStore retrieved via `getEventStore()` singleton |
| `packages/storage/src/SqliteEventStore.ts` | append() does single INSERT (atomic per SQLite guarantee) |

### Files Potentially to Modify

| File | Potential Change |
|------|-----------------|
| `apps/web/src/commands/todoCommands.test.ts` | Add tests for append-failure → no Zustand update |
| `apps/web/src/commands/sessionCommands.test.ts` | Add tests for append-failure → no session start |

### Files NOT to Touch

- `packages/domain/src/*` — zero changes to domain
- `packages/storage/src/SqliteEventStore.ts` — already correct, no changes needed
- `packages/storage/src/schema.ts` — type reference only
- `packages/ui/src/*` — zero changes to UI components
- `apps/web/src/stores/*` — zero changes to Zustand stores

### Testing Strategy

**Primary focus: verify the atomic write guarantee under failure conditions.**

Existing test infrastructure:
- Command handler tests already exist (`todoCommands.test.ts`, `sessionCommands.test.ts`)
- `test-setup.ts` mocks `getEventStore()` for web app tests
- SqliteEventStore has 11 tests in `SqliteEventStore.test.ts`

**New tests to add:**
1. `handleStartSession` with a failing `append()` → verify `useSessionStore.startSession()` is NOT called
2. `handleDeclareTodo` with a failing `append()` on first event → verify `applyEvent()` is NOT called
3. `handleDeclareTodo` with `append()` succeeding first but failing second → verify first event IS applied but second is NOT
4. Boot sequence with empty event store → verify initial state is used
5. Boot sequence with existing events → verify correct replay

### Anti-Patterns to Avoid

- DO NOT add batch/transaction support to EventStore interface — out of scope for this story
- DO NOT modify the EventStore interface in `ports.ts`
- DO NOT add `console.log` or `console.error` in committed code
- DO NOT change the boot sequence order in `main.tsx`
- DO NOT import from `@tododoro/ui` or `apps/web` in storage package
- DO NOT use `new Date()` or `Date.now()` — use `Clock.now()` port

### Performance Constraints

- Event writes MUST NOT block main thread (SQLocal handles this via Web Worker)
- Canvas must maintain 60fps during concurrent writes
- Boot replay target: <50ms for up to 500 events (NFR4)

### Previous Story Learnings (from Story 6.1)

Key intelligence from Story 6.1 implementation:
- **SQLocal v0.17.0** uses `opfs-sahpool` VFS — does NOT require SharedArrayBuffer
- **Vite worker format** must be `'es'` for SQLocal's Web Worker bundling (already set in `vite.config.ts`)
- **Tests use a mock SQLocal class** that simulates SQLite behavior — pattern to follow for new tests
- **415 tests currently passing** (158 domain + 19 storage + 238 web) — zero regressions expected
- **SQLite WASM binary** (860 KB) and worker scripts are properly bundled in production build
- **Bug fix #21** (2026-03-23): Switched `App.tsx` from disconnected `JsonEventStore` to shared singleton via `getEventStore()` — confirms singleton pattern is now correct everywhere
- **Code review findings** already addressed: `crossOriginIsolated` check, `destroy()` method, duplicate eventId rejection in JsonEventStore

### Project Structure Notes

- Package dependency graph: `apps/web → @tododoro/storage → @tododoro/domain` (acyclic)
- Storage package has `sqlocal` and `drizzle-orm` as prod dependencies
- TypeScript strict mode: `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Monorepo uses pnpm workspaces with Turborepo task orchestration

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.2, lines 818-833]
- [Source: _bmad-output/planning-artifacts/architecture.md — Command Handler Pattern, lines 417-433]
- [Source: _bmad-output/planning-artifacts/architecture.md — Boot Sequence, lines 449-458]
- [Source: _bmad-output/planning-artifacts/architecture.md — Data Flow, lines 689-715]
- [Source: _bmad-output/planning-artifacts/prd.md — NFR10, line 407]
- [Source: _bmad-output/implementation-artifacts/6-1-sqlite-event-store-with-drizzle-schema.md — complete story]
- [Source: apps/web/src/main.tsx — current boot sequence]
- [Source: apps/web/src/db.ts — event store singleton]
- [Source: apps/web/src/commands/todoCommands.ts — 5 command handlers]
- [Source: apps/web/src/commands/sessionCommands.ts — 4 command handlers]
- [Source: packages/storage/src/SqliteEventStore.ts — SQLite implementation]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

None — no blocking issues encountered.

### Completion Notes List

- **Verification (Tasks 1-3):** All existing code confirmed correct. Boot sequence in `main.tsx` follows full pipeline: `createEventStore()` → `readAll()` → `repairEvents()` → persist synthesized → project state → `bootstrap()` → render. `db.ts` creates `SqliteEventStore` as primary with `JsonEventStore` fallback. All 9 command handlers (5 todo + 4 session) correctly `await append()` before any Zustand state mutation. No code changes required.
- **Atomicity tests (Tasks 2.3, 3.3):** Added 4 new tests to `sessionCommands.test.ts` and `todoCommands.test.ts` verifying that when `append()` rejects: (a) `handleStartSession` does NOT call `startSession()` (session stays idle), (b) `handleStartSession` does NOT update canvas store, (c) `handleDeclareTodo` does NOT call `applyEvent()` (canvas stays empty), (d) `handleDeclareTodo` partial failure (second append rejects) applies first event but not second.
- **Boot sequence tests (Task 4):** Created `bootstrap.test.ts` with 5 tests: empty event store boots to initial state, existing events reconstruct correct state, active session persists across boot, snapshot-based replay, repair pipeline synthesizes and persists events for orphaned sessions.
- **Production bundle (Task 5):** `pnpm turbo build` produces clean bundle — SQLite WASM binary (860KB) and worker scripts included. `pnpm turbo typecheck` zero errors. `pnpm turbo test` all 425 tests pass (158 domain + 20 storage + 247 web).
- **Gap analysis (Task 6):** No gaps found — all handlers were already correctly implementing the await-before-update pattern. No code fixes needed; only test coverage additions.
- **Code review fixes:** Fixed conditional assertion in AC4.3 test (was silently passing). Added SnapshotCreatedEvent replay path to bootstrap test helper (was missing from main.tsx mirror). Added snapshot-based boot test. Fixed misleading comment.

### Change Log

- 2026-03-23: Added atomicity tests for `handleStartSession` and `handleDeclareTodo` append-failure scenarios
- 2026-03-23: Added boot sequence tests (empty store, existing events, active session, repair pipeline)
- 2026-03-23: Verified all 9 command handlers, boot sequence, and production bundle — no code changes needed
- 2026-03-23: Code review fixes — unconditional assertion for AC4.3, snapshot replay path and test, misleading comment fix

### File List

- `apps/web/src/commands/sessionCommands.test.ts` (modified) — added 2 tests for NFR10 atomicity guarantee
- `apps/web/src/commands/todoCommands.test.ts` (modified) — added 2 tests for append-failure behavior
- `apps/web/src/bootstrap.test.ts` (new) — 5 tests for boot sequence AC4 verification (including snapshot replay)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified) — status: ready-for-dev → in-progress → review → done
- `_bmad-output/implementation-artifacts/6-2-atomic-event-writes-and-boot-sequence-wiring.md` (modified) — task completion, Dev Agent Record, status update
