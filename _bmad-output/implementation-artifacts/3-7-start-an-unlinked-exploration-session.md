# Story 3.7: Start an Unlinked Exploration Session

Status: ready-for-dev

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

- [ ] Task 1: Add Exploration session affordance to canvas (AC: #1)
  - [ ] Add a fixed-position button outside any card — canvas-level control
  - [ ] Position: near the `AnalogTimerWipe` area or in a fixed corner (e.g., bottom-left alongside timer area)
  - [ ] Icon: a play/focus icon distinct from card-level start buttons
  - [ ] `<button aria-label="Start exploration session">` — keyboard accessible, ≥44x44px touch target
  - [ ] Disable when a session is already active
  - [ ] Visual: subtle, ~35% opacity at rest (same as ShelfIcon/SettingsIcon peripheral pattern)
- [ ] Task 2: Wire `handleStartSession(null, ...)` for exploration (AC: #1)
  - [ ] Reuse `handleStartSession` from Story 3.1 — pass `null` as `todoId`
  - [ ] Domain layer already supports `todoId: null` (Exploration sessions)
  - [ ] `SessionStartedEvent` written with `todoId: null`
  - [ ] `useSessionStore` updated with active session where `todoId === null`
- [ ] Task 3: Session UI without card foregrounding (AC: #1)
  - [ ] When `activeSession.todoId === null`: no card gets the blue ring, no cards are dimmed
  - [ ] `AnalogTimerWipe` still renders in the same position with the same visual treatment
  - [ ] Timer runs normally — completion/abandonment logic from Stories 3.3/3.4 applies identically
  - [ ] Adjust card foregrounding logic: only apply blue ring + dimming when `activeSession.todoId !== null`
- [ ] Task 4: Create Exploration `CompletionMoment` variant (AC: #2)
  - [ ] When an Exploration session completes (todoId === null), show a different `CompletionMoment`:
    - Title: "Exploration session — 1 Pomodoro"
    - Two action buttons: "Attach to a todo" and "Leave unlinked"
    - No auto-dismiss — user must choose (or press Escape to leave unlinked)
  - [ ] "Leave unlinked": dismiss dialog, session stays with `todoId: null` in devotion record — no card affected
  - [ ] Escape: same as "Leave unlinked"
- [ ] Task 5: Create card picker for "Attach to a todo" (AC: #2)
  - [ ] When "Attach to a todo" is clicked: show a list/grid of current active todo cards
  - [ ] Use a Radix Dialog or Popover with the list of cards from `useCanvasStore.todos.items`
  - [ ] Each card: title + current pomodoro count — simple clickable list
  - [ ] On card selection: call `handleAttributeExplorationSession(sessionId, todoId, eventStore)`
  - [ ] After attribution: devotion dot appears on the chosen card, CompletionMoment dismisses
- [ ] Task 6: Implement `handleAttributeExplorationSession` (AC: #2)
  - [ ] Create a new domain event or use an existing mechanism to attribute an exploration session
  - [ ] **Check domain layer**: is there a `SessionAttributedEvent` or similar? If not, this needs domain work:
    - New event type: `SessionAttributedEvent` with `sessionId`, `todoId`, `originalTodoId: null`
    - Add to `DomainEvent` union in `events.ts`
    - Add projection handling in `devotionRecord.ts` and `todoList.ts`
    - Add to `reduceSession` if needed (session aggregate may not need to track this)
  - [ ] Command handler: read session events → verify session exists and is completed with `todoId: null` → write attribution event → update stores
  - [ ] After `applyEvent`: the chosen card's `pomodoroCount` increments and a `DevotionSession` entry appears
- [ ] Task 7: Abandonment for exploration sessions (AC: #1)
  - [ ] If exploration session cancelled < 60s → `handleAbandonSession` exactly as Story 3.4
  - [ ] Silent, no UI, no attribution prompt — same as linked session abandonment
- [ ] Task 8: Tests (AC: #1, #2)
  - [ ] `sessionCommands.test.ts`: handleStartSession with null todoId writes correct event
  - [ ] UI test: exploration button renders, fires handleStartSession(null, ...), disabled during active session
  - [ ] UI test: no card foregrounding during exploration session
  - [ ] `CompletionMoment.test.tsx`: exploration variant shows two options
  - [ ] Card picker test: lists active todos, selection triggers attribution
  - [ ] `handleAttributeExplorationSession.test.ts`: writes attribution event, updates stores
  - [ ] Integration: complete exploration → attach to card → devotion dot appears on that card
  - [ ] Integration: complete exploration → leave unlinked → no card affected

## Dev Notes

### Architecture Compliance

- **Exploration sessions are first-class**: `todoId: null` is explicitly supported throughout the domain. [Source: architecture.md#D2 — Aggregate Model]
- **Command handler pattern**: all new handlers follow the established async/Result/never-throws pattern. [Source: architecture.md#Communication Patterns]
- **New event type consideration**: `SessionAttributedEvent` may need to be added to the domain. Check if the epics/PRD specify `handleAttributeExplorationSession` — it's mentioned in the epics. This is the ONLY new domain event in Epic 3.

### Domain Layer Analysis

**Already supported:**
- `startSession(state, null, configuredDurationMs, clock, idGenerator)` → `SessionStartedEvent` with `todoId: null`
- `completeSession` and `abandonSession` work identically for exploration sessions
- `projectDevotionRecord` tracks sessions by `sessionId` — exploration sessions are stored but not attributed to any todo

**Likely needs addition:**
- The epics reference `handleAttributeExplorationSession(sessionId, todoId, eventStore)` — this implies a post-completion attribution mechanism
- Check if `events.ts` already has a `SessionAttributedEvent` type
- If not, add: `SessionAttributedEvent { eventType: 'SessionAttributed'; sessionId; todoId; timestamp }`
- Update `projectDevotionRecord`: on `SessionAttributed`, move session from unlinked to the specified todo's record
- Update `projectTodoList`: on `SessionAttributed`, increment `pomodoroCount` on the target todo
- **CI gate**: any domain change requires 100% test coverage before proceeding

### Exploration Session Affordance Placement

- Fixed-position canvas control — similar to ShelfIcon/SettingsIcon pattern from Story 2.7
- Bottom-left corner works well: timer area is there, exploration is a "start timer" action
- Icon: could be a simple play triangle without a card icon, or a compass/explore icon
- Must be visually distinct from card-level start buttons to avoid confusion

### Card Picker Design

- Simple list of active todo titles — no complex UI needed
- Read from `useCanvasStore(s => s.todos.items)` — already available
- Radix `Dialog` or `Select` component — list items are clickable
- After selection: dialog closes, attribution happens, devotion dot appears
- If no active todos exist: show "No active todos" message, only "Leave unlinked" available

### Project Structure Notes

Files to create/modify:
```
packages/domain/src/
  events.ts                     ← MODIFY: add SessionAttributedEvent (if not present)
  projections/
    devotionRecord.ts           ← MODIFY: handle SessionAttributed
    devotionRecord.test.ts      ← MODIFY: add attribution tests
    todoList.ts                 ← MODIFY: handle SessionAttributed
    todoList.test.ts            ← MODIFY: add attribution tests
  index.ts                      ← MODIFY: export new types

apps/web/src/
  commands/
    sessionCommands.ts          ← MODIFY: add handleAttributeExplorationSession
    sessionCommands.test.ts     ← MODIFY: add attribution tests
  App.tsx                       ← MODIFY: add exploration button, wire card picker, adjust card dimming logic

packages/ui/src/
  components/
    ExplorationButton.tsx       ← NEW: exploration session start button
    ExplorationButton.test.tsx  ← NEW
    CardPicker.tsx              ← NEW: card selection dialog for attribution
    CardPicker.test.tsx         ← NEW
    CompletionMoment.tsx        ← MODIFY: add exploration variant with two options
  index.ts                      ← MODIFY: export new components
```

### Previous Story Intelligence

- From Story 2.7: ShelfIcon/SettingsIcon at ~35% opacity, fixed position, keyboard accessible — exact same pattern for ExplorationButton.
- From Story 3.1: `handleStartSession` already supports `null` todoId — no changes needed for the start flow.
- From Story 3.3: `CompletionMoment` needs conditional rendering — exploration vs. linked completion.

### References

- [Source: epics.md#Story 3.7]
- [Source: architecture.md#D2 — Session aggregate, todoId: null for exploration]
- [Source: architecture.md#Communication Patterns]
- [Source: ux-design-specification.md#Action Hierarchy — Peripheral tier]
- [Source: packages/domain/src/session.ts — startSession with null todoId]
- [Source: packages/domain/src/projections/devotionRecord.ts — pending session tracking]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
