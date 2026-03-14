# Story 3.3: Session Completion and First Devotion Dot

Status: done

## Story

As a user,
I want the session to complete automatically when the timer reaches zero,
so that I receive quiet acknowledgment and see the first evidence of my devotion appear on the card.

## Acceptance Criteria (BDD)

1. **Given** an active session is running
   **When** the timer duration elapses
   **Then** `handleCompleteSession` writes a `SessionCompletedEvent` to the event store
   **And** the `CompletionMoment` overlay appears: a Radix Dialog without backdrop overlay; shows the todo title + "1 Pomodoro added"; auto-dismisses after ~3 seconds or on any user interaction
   **And** the `CompletionMoment` copy is past-tense, 1–2 lines maximum, with no congratulatory language
   **And** when `prefers-reduced-motion: reduce` is set, the `CompletionMoment` appears and dismisses instantly with no fade
   **And** after dismissal, the active card's blue ring is removed, all cards return to normal opacity, and the canvas returns to its neutral state
   **And** a `DevotionDots` row appears on the card showing one filled amber dot at 6px with `aria-label="1 Pomodoro invested"`

## Tasks / Subtasks

- [x] Task 1: Implement `handleCompleteSession` in `sessionCommands.ts` (AC: #1)
  - [x] Add to `apps/web/src/commands/sessionCommands.ts`
  - [x] Pattern: read session events by aggregateId → reduce to `SessionState` → call `completeSession()` → append → update stores
  - [x] `await eventStore.append(event)` before any UI update
  - [x] After append: `useSessionStore.getState().endSession()` + `useCanvasStore.getState().applyEvent(event)`
  - [x] `applyEvent` will trigger `projectDevotionRecord` and `projectTodoList` — incrementing pomodoro count and adding devotion session
- [x] Task 2: Auto-completion trigger (AC: #1)
  - [x] In the rAF tick loop (from Story 3.2): check if `elapsedMs >= configuredDurationMs`
  - [x] When elapsed: call `handleCompleteSession(eventStore, clock, idGenerator)` exactly once
  - [x] Guard against double-fire: check `activeSession.status === 'active'` before calling
  - [x] Stop the rAF loop immediately after completion
- [x] Task 3: Create `CompletionMoment` component (AC: #1)
  - [x] Create `packages/ui/src/components/CompletionMoment.tsx`
  - [x] Use `@radix-ui/react-dialog` — `Dialog.Root` with `modal={false}` (no backdrop overlay)
  - [x] Content: todo title + "1 Pomodoro added" (or "N Pomodoros added" — always singular/plural correct)
  - [x] Copy style: past-tense, declarative, 1–2 lines max. Example: "Chapter 4 — 1 Pomodoro added"
  - [x] No congratulatory language — no "Great job!", no emoji, no fanfare
  - [x] Auto-dismiss after ~3 seconds via `setTimeout` in `useEffect` (with cleanup)
  - [x] Dismiss on any user interaction: click anywhere, keypress, or Escape
  - [x] Position: centered or near the active card — brief, unobtrusive
- [x] Task 4: Reduced motion for CompletionMoment (AC: #1)
  - [x] When `prefers-reduced-motion: reduce`: no fade-in/fade-out animation
  - [x] Appear instantly, dismiss instantly (still auto-dismiss after ~3s or immediately on interaction)
  - [x] CSS: `@media (prefers-reduced-motion: reduce) { transition: none; animation: none; }`
- [x] Task 5: Canvas state reset after dismissal (AC: #1)
  - [x] On CompletionMoment dismiss: remove blue ring from active card, restore all cards to full opacity
  - [x] This happens via `useSessionStore.endSession()` → `activeSession` back to `{ status: 'idle' }`
  - [x] Components reading `activeSession.status` will automatically re-render without the session UI
  - [x] `AnalogTimerWipe` unmounts (conditional on `activeSession.status === 'active'`)
- [x] Task 6: Create `DevotionDots` component (AC: #1)
  - [x] Create `packages/ui/src/components/DevotionDots.tsx`
  - [x] Props: `count: number` (number of completed Pomodoros)
  - [x] Render a row of 6px filled amber dots (`var(--devotion)`)
  - [x] `aria-label="N Pomodoros invested"` (e.g., "1 Pomodoro invested", "3 Pomodoros invested")
  - [x] Position: below the card title in `TodoCard`
  - [x] Only render if `count > 0` — no empty dot placeholders in this story
- [x] Task 7: Wire `DevotionDots` into `TodoCard` (AC: #1)
  - [x] `TodoCard` already receives `sessionsCount` in `TodoCardData` (currently always 0)
  - [x] Render `<DevotionDots count={sessionsCount} />` below the title when `sessionsCount > 0`
  - [x] `sessionsCount` is already wired from `TodoListReadModel.pomodoroCount` through `applyEvent`
  - [x] After session completion, `applyEvent(SessionCompletedEvent)` increments `pomodoroCount` → dots appear
- [x] Task 8: Tests (AC: #1)
  - [x] `sessionCommands.test.ts`: handleCompleteSession writes event, updates both stores
  - [x] `CompletionMoment.test.tsx`: renders with title and pomodoro count, auto-dismisses, no congratulatory text
  - [x] `CompletionMoment.test.tsx`: dismiss on click/keypress/Escape
  - [x] `DevotionDots.test.tsx`: renders correct number of dots, correct aria-label, amber colour
  - [x] Integration: after session completes, card shows devotion dot, canvas returns to neutral

## Dev Notes

### Architecture Compliance

- **Command handler pattern**: `handleCompleteSession` follows same pattern as `handleStartSession`. [Source: architecture.md#Communication Patterns]
- **Two-store update**: `SessionCompletedEvent` updates `useSessionStore` (session → idle) AND `useCanvasStore` (devotion record + pomodoro count via `applyEvent`). [Source: architecture.md#D7]
- **Radix Dialog**: use `modal={false}` to avoid backdrop. CompletionMoment must not trap focus or block canvas. [Source: ux-design-specification.md#Component Inventory]
- **No `console.log`**, no congratulatory language, no sounds.

### Domain Layer (Already Implemented)

- `completeSession(state, clock, idGenerator)` → `SessionCompletedEvent | Error` in `packages/domain/src/session.ts`
- `SessionCompletedEvent` contains `elapsedMs` (actual elapsed, not configured duration)
- `projectDevotionRecord` handles `SessionCompleted` — matches via `pendingSessions` map to attribute to correct todoId
- `projectTodoList` handles `SessionCompleted` — increments `pomodoroCount` on matching todo

### Completion Detection Logic

- In the rAF tick loop: `if (elapsedMs >= configuredDurationMs && activeSession.status === 'active')`
- Must guard with status check — completion handler sets status to idle, preventing re-fire
- Alternative: use a `completionFiredRef` (useRef) to prevent double invocation during the same frame

### CompletionMoment Copy Guidelines

- Pattern: "[Todo Title] — N Pomodoro(s) added"
- Past tense, declarative: "Added" not "Adding", "Invested" not "Investing"
- No emoji, no exclamation marks, no "Well done" / "Nice work" / "Keep going"
- 1-2 lines maximum — brief acknowledgment, not a celebration

### DevotionDots Rendering

- Each dot: 6px diameter circle, `var(--devotion)` fill (amber)
- Row layout: `flex gap-1` (4px gaps between dots)
- WCAG contrast: amber dots must have 3:1 contrast against card background (`--surface`)
- `hsl(38, 80%, 58%)` against `hsl(220, 14%, 13%)` → check contrast ratio (should be ~4.5:1+)

### Project Structure Notes

Files to create/modify:
```
apps/web/src/
  commands/
    sessionCommands.ts          ← MODIFY: add handleCompleteSession
    sessionCommands.test.ts     ← MODIFY: add completion tests
  App.tsx                       ← MODIFY: wire completion trigger in tick loop, mount CompletionMoment

packages/ui/src/
  components/
    CompletionMoment.tsx        ← NEW: Radix Dialog completion overlay
    CompletionMoment.test.tsx   ← NEW
    DevotionDots.tsx            ← NEW: amber dot row component
    DevotionDots.test.tsx       ← NEW
    TodoCard.tsx                ← MODIFY: render DevotionDots below title
  index.ts                      ← MODIFY: export new components
```

### Previous Story Intelligence

- From Story 2.2 (`CanvasHint`): auto-dismiss after 3 seconds pattern with `setTimeout` + `useEffect` cleanup. Reuse same approach.
- From Epic 2 retro: "Missing test cases caught in code review" — ensure all AC are covered: auto-dismiss, interaction dismiss, reduced motion, correct copy.

### References

- [Source: epics.md#Story 3.3]
- [Source: architecture.md#Communication Patterns — Command Handler Pattern]
- [Source: architecture.md#D7 — Two-store update]
- [Source: ux-design-specification.md#Component Inventory — CompletionMoment, DevotionDots]
- [Source: ux-design-specification.md#Colour Semantics — devotion (amber)]
- [Source: ux-design-specification.md#Motion & Reduced Motion]
- [Source: packages/domain/src/session.ts — completeSession]
- [Source: packages/domain/src/projections/devotionRecord.ts — pendingSessions tracking]
- [Source: packages/domain/src/projections/todoList.ts — pomodoroCount increment]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Implemented `handleCompleteSession` in sessionCommands.ts (already created in 3.1)
- Auto-completion trigger in App.tsx: detects elapsedMs >= configuredDurationMs, fires once via completionFiredRef
- Created `CompletionMoment` component — Radix Dialog (modal=false), past-tense copy, auto-dismiss 3s
- Created `DevotionDots` component — 6px amber dots, correct aria-label, flex row layout
- Wired DevotionDots into TodoCard below title (conditional on sessionsCount > 0)
- Canvas state reset happens via endSession() → idle → React re-renders without session UI
- 14 new tests (7 CompletionMoment + 7 DevotionDots)

### Change Log

- 2026-03-12: Implemented Story 3.3 — completion trigger, CompletionMoment, DevotionDots

### File List

- packages/ui/src/components/CompletionMoment.tsx (NEW)
- packages/ui/src/components/DevotionDots.tsx (NEW)
- packages/ui/src/components/TodoCard.tsx (MODIFIED)
- packages/ui/src/index.ts (MODIFIED)
- apps/web/src/App.tsx (MODIFIED)
- apps/web/src/components/CompletionMoment.test.tsx (NEW)
- apps/web/src/components/DevotionDots.test.tsx (NEW)
