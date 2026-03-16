# Story 5.3: Release Eulogy for High-Investment Todos

Status: done

## Story

As a user,
I want to see my full Devotion Record one final time before releasing a todo I've invested heavily in,
So that the release is honoured with the weight it deserves, and letting go feels like clarity rather than erasure.

## Acceptance Criteria

1. **Given** an active todo card has more than 5 invested Pomodoros **When** the user selects "Release" from the card action menu **Then** the `ReleaseEulogy` component renders first — before the `ReleaseRitual` dialog
2. **Given** the ReleaseEulogy is shown **Then** it displays the full `DevotionRecord` timeline with the framing copy: "You invested N Pomodoros. It's okay to let it go."
3. **Given** the ReleaseEulogy is shown **Then** a single "Continue" button is present; pressing it dismisses the Eulogy and opens the `ReleaseRitual` two-state dialog
4. **Given** the ReleaseEulogy is shown **Then** pressing Escape cancels the entire release flow — no event is written and the card remains on the canvas
5. **Given** a todo card has 5 or fewer invested Pomodoros **When** the user selects "Release" **Then** the `ReleaseEulogy` does NOT appear — the `ReleaseRitual` dialog opens directly

## Tasks / Subtasks

- [x] Task 1: Create `ReleaseEulogy` component (AC: #1, #2, #3, #4)
  - [x] 1.1 Create `packages/ui/src/components/ReleaseEulogy.tsx`
  - [x] 1.2 Use Radix `Dialog.Root` with `modal={true}` (full overlay, canvas obscured)
  - [x] 1.3 Render `DevotionRecord` component (full timeline variant) inside the dialog
  - [x] 1.4 Framing copy: "You invested N Pomodoros. It's okay to let it go." — declarative, non-judgmental
  - [x] 1.5 Single "Continue" button at the bottom
  - [x] 1.6 Escape closes dialog via Radix default (triggers `onCancel`)
  - [x] 1.7 `aria-label="Release eulogy"` on dialog
  - [x] 1.8 Export from `packages/ui/src/index.ts`

- [x] Task 2: Wire eulogy into release flow in App.tsx (AC: #1, #3, #4, #5)
  - [x] 2.1 Extend `releaseTarget` state to track flow phase: `'eulogy' | 'ritual' | null`
  - [x] 2.2 When `onReleaseCallback` fires AND `pomodoroCount > 5`: set phase to `'eulogy'`
  - [x] 2.3 When `onReleaseCallback` fires AND `pomodoroCount <= 5`: set phase to `'ritual'` (skip eulogy)
  - [x] 2.4 ReleaseEulogy "Continue" → transition phase from `'eulogy'` to `'ritual'`
  - [x] 2.5 ReleaseEulogy Escape/cancel → clear releaseTarget entirely, no event written
  - [x] 2.6 ReleaseRitual reason selected → fire handleReleaseTodo → animation → clear state
  - [x] 2.7 Pass devotion sessions to ReleaseEulogy for DevotionRecord rendering

- [x] Task 3: Tests (AC: #1–5)
  - [x] 3.1 `ReleaseEulogy` tests: renders DevotionRecord, shows framing copy, Continue callback, Escape cancels
  - [x] 3.2 Integration tests: >5 Pomodoros shows Eulogy first; <=5 skips to Ritual
  - [x] 3.3 Flow test: Eulogy Continue → Ritual renders
  - [x] 3.4 Run full test suite

## Dev Notes

### Component Design: ReleaseEulogy

```
Props:
  open: boolean
  todoTitle: string
  pomodoroCount: number
  sessions: ReadonlyArray<DevotionRecordSession>   // from @tododoro/ui
  onContinue: () => void
  onCancel: () => void
```

- Renders the existing `DevotionRecord` component (from `packages/ui/src/components/DevotionRecord.tsx`) — DO NOT duplicate the timeline rendering logic
- Framing copy above the timeline: "You invested N Pomodoros. It's okay to let it go."
- Copy tone: past-tense, declarative. "You invested" not "You spent". "It's okay to let it go" not "Are you sure you want to release?"
- Single "Continue" button below the timeline
- Uses `--surface`, `--text-primary`, `--text-muted` tokens
- Full overlay via Radix Dialog `modal={true}` — same treatment as ReleaseRitual

### Release Flow State Machine (Updated)

```
TodoCard "Release" click
  → session-active guard
  → set releaseTarget = { todoId, pomodoroCount, sessions }
  → pomodoroCount > 5?
      YES → phase = 'eulogy' → render ReleaseEulogy
            → Continue → phase = 'ritual' → render ReleaseRitual
            → Escape → clear releaseTarget (cancel)
      NO  → phase = 'ritual' → render ReleaseRitual directly
  → ReleaseRitual reason selected → handleReleaseTodo → animation → clear
  → ReleaseRitual Escape → clear releaseTarget (cancel)
```

### Architecture Compliance

- [Source: architecture.md — Component location: `packages/ui/src/components/ReleaseEulogy.tsx`]
- [Source: architecture.md#D6 — No router: ReleaseEulogy is a React state-driven dialog]
- [Source: ux-design-specification.md#Overlay & Modal Patterns — Release Eulogy: Full overlay, Escape or Continue]
- [Source: ux-design-specification.md#Copy Tone — "You invested N Pomodoros" declarative, no congratulatory language]

### References

- [Source: epics.md#Story 5.3 — acceptance criteria]
- [Source: ux-design-specification.md#Component Strategy — ReleaseEulogy: FR10, >5 Pomodoro gate]
- [Source: packages/ui/src/components/DevotionRecord.tsx — existing timeline component reused]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Created `ReleaseEulogy` component: Radix Dialog with full overlay, renders DevotionRecord timeline, framing copy "You invested N Pomodoros. It's okay to let it go.", single Continue button, Escape cancels
- Extended `releaseTarget` state in App.tsx with `phase`, `sessions`, and `todoTitle` fields
- Phase logic: `pomodoroCount > 5` → eulogy first, `<= 5` → ritual directly
- ReleaseEulogy Continue transitions phase from 'eulogy' to 'ritual', rendering ReleaseRitual
- 8 ReleaseEulogy component tests covering rendering, callbacks, and accessibility

### Change Log

- 2026-03-16: Implemented Story 5.3 — ReleaseEulogy gates release flow for high-investment todos (>5 Pomodoros), extended App.tsx release state machine with phase tracking
- 2026-03-16: Code review — added 6 missing integration tests (App.release-flow.test.tsx): >5 shows Eulogy, <=5 skips to Ritual, Eulogy Continue → Ritual, Escape cancels, animation delay, isLeaving state

### File List

- packages/ui/src/components/ReleaseEulogy.tsx (new — Radix Dialog with DevotionRecord and framing copy)
- packages/ui/src/index.ts (modified — export ReleaseEulogy)
- apps/web/src/App.tsx (modified — extended releaseTarget with phase/sessions/todoTitle, added handleEulogyContinue, conditional ReleaseEulogy rendering)
- apps/web/src/components/ReleaseEulogy.test.tsx (new — 8 component tests)
