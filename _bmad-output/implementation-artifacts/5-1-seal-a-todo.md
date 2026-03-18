# Story 5.1: Seal a Todo

Status: done

## Story

As a user,
I want to declare a todo complete by sealing it,
So that I can make a sovereign declaration — this is done — without a system validating it for me.

## Acceptance Criteria

1. **Given** an active todo card exists on the canvas **When** the user selects "Seal" from the card action menu **Then** `handleSealTodo(todoId, eventStore)` writes a `TodoSealedEvent` to the event store **And** the `CompletionMoment` overlay renders with a summary of total investment
2. **Given** the CompletionMoment overlay for a seal is shown **Then** the overlay auto-dismisses after ~3 seconds or on any user interaction
3. **Given** the CompletionMoment has dismissed **Then** the card animates off the canvas (250ms ease-in; no animation if `prefers-reduced-motion` is set — card removed from DOM immediately)
4. **Given** a todo is sealed **Then** the sealed todo moves into the `ShelfReadModel` in `useCanvasStore`
5. **Given** a todo is sealed and other cards remain on the canvas **Then** the canvas returns to neutral — no empty-state prompt appears

## Tasks / Subtasks

- [x] Task 1: Add card leave-canvas animation (AC: #3)
  - [x] 1.1 Add CSS transition class to TodoCard for opacity+translate animation (250ms ease-in)
  - [x] 1.2 Add `isLeaving` state to trigger the animation before DOM removal
  - [x] 1.3 Respect `prefers-reduced-motion` — skip animation, remove immediately
  - [x] 1.4 Coordinate animation timing: CompletionMoment dismisses → animation plays → seal event fires → card removed
- [x] Task 2: Verify shelf integration (AC: #4)
  - [x] 2.1 Verify `projectShelf` correctly adds sealed todo with full history on `TodoSealedEvent`
  - [x] 2.2 Verify `useCanvasStore.applyEvent` propagates to shelf state
- [x] Task 3: Tests (AC: #1–5)
  - [x] 3.1 Test card leave animation triggers after CompletionMoment dismiss
  - [x] 3.2 Test `prefers-reduced-motion` skips animation
  - [x] 3.3 Run full test suite to verify no regressions

## Dev Notes

### What's Already Implemented (Epic 4, Story 4.4)

Almost everything for this story was implemented in Story 4.4:

- **`handleSealTodo`** command handler: `apps/web/src/commands/todoCommands.ts:102-125` — reads by aggregate → reduces → calls `sealTodo` → appends → applies event
- **`sealTodo`** domain function: `packages/domain/src/todo.ts:131-146` — guard `status !== 'active'` → returns `TodoSealedEvent | Error`
- **CompletionMoment seal variant**: `packages/ui/src/components/CompletionMoment.tsx` — displays `"[title] — N Pomodoros across [timeSpan]"`, auto-dismisses ~3s
- **"Seal" menu item in TodoCard**: `packages/ui/src/components/TodoCard.tsx:311-324` — only shows when `sessionsCount > 0`
- **Seal flow wiring in App.tsx**: `apps/web/src/App.tsx:219-244` — `onSealCallback` reads devotion data, shows CompletionMoment, defers seal event until dismiss
- **Card removal**: Automatic via `projectTodoList` filtering out sealed todos from `items[]`
- **Shelf addition**: Automatic via `projectShelf` adding sealed todo to `items[]` with `lifecycleStatus: 'sealed'`

### What's NEW in This Story

The only new work is the **card leave-canvas animation** (250ms ease-in). Currently, when the seal event fires (on CompletionMoment dismiss), the card is instantly removed from the DOM because `projectTodoList` filters it out.

**Implementation approach**: Add a brief animation between CompletionMoment dismiss and seal event execution:
1. CompletionMoment dismiss callback fires
2. Set a `leavingCardId` state in App.tsx
3. TodoCard detects `isLeaving` via prop → plays CSS opacity + translateY animation (250ms ease-in)
4. After 250ms timeout (or 0ms if `prefers-reduced-motion`), fire `handleSealTodo` which removes the card
5. Clear `leavingCardId`

**`prefers-reduced-motion`**: Use `window.matchMedia('(prefers-reduced-motion: reduce)')` at the App.tsx level to decide timeout duration (0ms vs 250ms). Do NOT add per-component media query checks — the token/CSS level handles visual aspects, but the JS timeout controls DOM removal timing.

### Architecture Compliance

- [Source: architecture.md#D7 — Command handler pattern: read → reduce → decide → append → applyEvent]
- [Source: architecture.md#D8 — Error Handling: domain errors returned as values, never thrown]
- [Source: ux-design-specification.md#Motion Principles — Card leaving canvas: 250ms ease-in, skip if prefers-reduced-motion]
- [Source: ux-design-specification.md#Feedback Patterns — Card sealed: CompletionMoment variant + card leaves canvas]

### Project Structure Notes

```
apps/web/src/
  App.tsx                           ← MODIFY: add leavingCardId state, animation timing before seal
packages/ui/src/components/
  TodoCard.tsx                      ← MODIFY: add isLeaving prop, CSS animation class
```

### Previous Story Intelligence (Story 4.4)

- **Deferred seal pattern**: Seal event fires on CompletionMoment dismiss, NOT immediately on menu click. `pendingSealId` state tracks which todo is being sealed. This pattern must be preserved and extended with animation.
- **Session-active guard**: Cannot seal while session is active for that todo. Check `isSessionActive && activeTodoId === todoId`.
- **Devotion data pre-read**: Read devotion record data BEFORE sealing (after seal, todo is removed from `todos.items`).
- **`exactOptionalPropertyTypes`**: When adding optional props, use `prop?: Type | undefined` pattern (not just `prop?: Type`).

### References

- [Source: epics.md#Story 5.1 — acceptance criteria]
- [Source: ux-design-specification.md#Motion Principles — Card leaving canvas: 250ms ease-in]
- [Source: ux-design-specification.md#Component Strategy — CompletionMoment: Radix Dialog, auto-dismiss ~3s]
- [Source: apps/web/src/App.tsx:219-244 — existing seal flow with deferred seal]
- [Source: packages/ui/src/components/TodoCard.tsx:311-324 — existing Seal menu item]
- [Source: packages/domain/src/projections/shelf.ts:55-70 — TodoSealed adds to shelf]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Implemented card leave-canvas animation (250ms ease-in opacity+translateY) via `isLeaving` prop on TodoCard
- Added `leavingCardId` state in App.tsx to coordinate animation timing between CompletionMoment dismiss and seal event
- `prefers-reduced-motion` check via `window.matchMedia` at App.tsx level sets 0ms delay (immediate DOM removal)
- Shelf integration verified — `projectShelf` and `useCanvasStore.applyEvent` already handle TodoSealedEvent correctly (from Epic 4)
- All existing functionality (AC #1, #2, #4, #5) was already implemented in Story 4.4

### Change Log

- 2026-03-16: Implemented card leave-canvas animation for Story 5.1 — added `isLeaving` prop to TodoCard with CSS transition classes, coordinated animation timing in App.tsx with prefers-reduced-motion support
- 2026-03-16: Code review — fixed incomplete mock in App.seal-animation.test.tsx (added handleReleaseTodo to mock)

### File List

- packages/ui/src/components/TodoCard.tsx (modified — added `isLeaving` prop to TodoCardData, CSS animation classes)
- apps/web/src/App.tsx (modified — added `leavingCardId` state, animation delay in handleCompletionDismiss, `isLeaving` prop pass-through)
- apps/web/src/components/TodoCard.test.tsx (modified — added 3 leaving animation tests)
- apps/web/src/App.seal-animation.test.tsx (new — 4 integration tests for seal animation flow and prefers-reduced-motion)
