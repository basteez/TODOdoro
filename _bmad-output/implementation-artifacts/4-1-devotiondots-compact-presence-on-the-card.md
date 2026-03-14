# Story 4.1: DevotionDots — Compact Presence on the Card

Status: ready-for-dev

## Story

As a user,
I want to see a row of amber dots on each card representing my invested Pomodoros,
So that I can feel the weight of my devotion at a glance without opening any panel.

## Acceptance Criteria

1. **Given** a todo card has one or more completed sessions **When** the card is visible on the canvas **Then** the `DevotionDots` component renders below the card title as a row of 6px dots
2. **Given** a todo card has N completed Pomodoros **When** viewing the dots **Then** each completed Pomodoro is represented by a filled amber (`--devotion`) dot and empty slots are rendered at reduced opacity (0.25)
3. **Given** the `DevotionDots` component is rendered **Then** it carries `aria-label="N Pomodoros invested"` (e.g. "3 Pomodoros invested") with correct singular/plural
4. **Given** a session just completed for a linked todo **When** the `SessionCompletedEvent` is applied to the store **Then** the dots update immediately — no page reload required
5. **Given** the dots are rendered on the card **Then** the filled amber dots meet WCAG 2.1 AA contrast requirements for UI components (3:1 minimum) against the card background (`--surface`) in both dark and light themes

## Tasks / Subtasks

- [ ] Task 1: Enhance DevotionDots to show empty slots (AC: #1, #2)
  - [ ] 1.1 Open `packages/ui/src/components/DevotionDots.tsx` — current implementation renders only filled dots with no empty slots
  - [ ] 1.2 Add a `maxVisible` prop (default: 5) that controls how many total slots are rendered; if `count > maxVisible`, render `count` filled dots (all filled, no empties)
  - [ ] 1.3 For `count < maxVisible`: render `count` filled dots + `(maxVisible - count)` empty dots at `opacity: 0.25`
  - [ ] 1.4 For `count === 0`: return `null` (no dots shown) — preserve existing behaviour
  - [ ] 1.5 Keep dot size at 6px, gap at 4px, `marginTop: 6` — match existing layout
  - [ ] 1.6 Empty dots use same `backgroundColor: 'var(--devotion)'` but with `opacity: 0.25`

- [ ] Task 2: Verify WCAG contrast compliance (AC: #5)
  - [ ] 2.1 Verify `--devotion` (`hsl(38, 80%, 58%)`) against `--surface` (`hsl(220, 14%, 13%)`) meets 3:1 ratio for UI components — use browser devtools contrast checker
  - [ ] 2.2 Verify contrast in light theme: `--devotion` against light surface
  - [ ] 2.3 If contrast fails, adjust `--devotion` lightness value in `apps/web/src/index.css` while preserving amber hue

- [ ] Task 3: Update tests (AC: #1, #2, #3, #4)
  - [ ] 3.1 Update `apps/web/src/components/DevotionDots.test.tsx`:
    - Test: renders N filled dots + (maxVisible - N) empty dots when count < maxVisible
    - Test: renders N filled dots with zero empty dots when count >= maxVisible
    - Test: returns null when count is 0
    - Test: aria-label reads "N Pomodoros invested" with correct singular/plural
    - Test: filled dots have full opacity, empty dots have 0.25 opacity
  - [ ] 3.2 Verify existing `TodoCard.test.tsx` still passes (DevotionDots rendered at line 216 of TodoCard.tsx)
  - [ ] 3.3 Run full test suite: `turbo typecheck && turbo test && turbo build`

## Dev Notes

### Architecture Compliance

- DevotionDots is a pure presentational component in `@tododoro/ui` — zero domain dependencies
- Data flows: `useCanvasStore.todos.items[i].pomodoroCount` → TodoCard `sessionsCount` prop → DevotionDots `count` prop
- Immediate updates after session completion are guaranteed by `useCanvasStore.applyEvent()` which calls `projectTodoList` and increments `pomodoroCount`
- [Source: architecture.md#D7 — Zustand Store Structure]
- [Source: architecture.md#D3 — Read Models]

### Existing Code to Modify

- **`packages/ui/src/components/DevotionDots.tsx`**: Current implementation renders only `count` filled dots. Enhance to show `maxVisible` slots with empty dots at reduced opacity.
- **`packages/ui/src/components/TodoCard.tsx:216`**: Already renders `<DevotionDots count={sessionsCount} />` — no change needed here unless adding `maxVisible` override.
- **`apps/web/src/components/DevotionDots.test.tsx`**: Update tests for empty slot rendering.

### Key Technical Details

- Design token `--devotion` is `hsl(38, 80%, 58%)` (warm amber) defined in `apps/web/src/index.css`
- Card surface `--surface` is `hsl(220, 14%, 13%)` in dark theme
- WCAG 2.1 AA for UI components (non-text) requires 3:1 contrast ratio
- The 6px dot size means these are UI components, not text — 3:1 applies, not 4.5:1
- `prefers-reduced-motion` does not affect static dots (no animation)

### Project Structure Notes

```
packages/ui/src/components/
  DevotionDots.tsx          ← MODIFY: add empty slot rendering
apps/web/src/components/
  DevotionDots.test.tsx     ← MODIFY: update tests for new behaviour
```

### References

- [Source: epics.md#Story 4.1 — acceptance criteria]
- [Source: ux-design-specification.md#Component Strategy — DevotionDots]
- [Source: architecture.md#D3 — Read Models (Projections)]
- [Source: packages/ui/src/components/DevotionDots.tsx — current implementation]
- [Source: packages/ui/src/components/TodoCard.tsx:216 — DevotionDots integration]
- [Source: apps/web/src/stores/useCanvasStore.ts — applyEvent triggers projection updates]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
