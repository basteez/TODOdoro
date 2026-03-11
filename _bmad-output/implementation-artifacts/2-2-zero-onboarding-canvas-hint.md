# Story 2.2: Zero-Onboarding Canvas Hint

Status: done

## Story

As a user opening the app for the first time,
I want to see a brief ambient hint that dissolves on its own,
So that I understand the canvas metaphor without being given a tutorial, and the philosophy begins on the first frame.

## Acceptance Criteria (BDD)

1. **Given** the app is opened and the canvas is empty (no active todo cards)
   **When** the canvas renders
   **Then** the `CanvasHint` component renders centred on the canvas with italic text: *"Start with what calls to you"*

2. **Given** the hint is displayed
   **Then** the hint fades out via CSS transition after 3 seconds and is removed from the DOM after the transition completes

3. **Given** `prefers-reduced-motion: reduce` is set
   **Then** the hint appears and is removed from the DOM after 3 seconds with no fade animation

4. **Given** the canvas has one or more existing todo cards
   **Then** the hint does not appear

5. **Given** any page in the app
   **Then** no other onboarding, tooltip, tutorial, or getting-started element appears anywhere

## Tasks / Subtasks

- [x] Task 1: Create `CanvasHint` component (AC: #1, #2, #3)
  - [x] Create `packages/ui/src/components/CanvasHint.tsx`
  - [x] Render centred italic text: "Start with what calls to you" using `--text-muted` colour
  - [x] CSS transition: `opacity 1 → 0` over 500ms ease-in, triggered after 3s delay
  - [x] After transition completes, remove from DOM (use `onTransitionEnd` or `setTimeout` for cleanup)
  - [x] `prefers-reduced-motion: reduce` — no fade animation, just render for 3s then remove from DOM
  - [x] Use Tailwind utilities only — no inline styles
  - [x] Export from `packages/ui/src/index.ts`
- [x] Task 2: Integrate CanvasHint into ConstellationCanvas (AC: #1, #4)
  - [x] Show `CanvasHint` only when `useCanvasStore(s => s.todos)` has zero active todos
  - [x] Position as a centred overlay on the canvas (not a React Flow node)
  - [x] Hide immediately when the first card is created (reactive to store changes)
- [x] Task 3: Verify reduced-motion behaviour (AC: #3)
  - [x] Test with OS `prefers-reduced-motion: reduce` toggled on
  - [x] Confirm hint appears, stays 3s, vanishes instantly (no fade)

## Dev Notes

### Architecture Compliance

- `CanvasHint` lives in `packages/ui/src/components/CanvasHint.tsx` — PascalCase file name
- Component reads canvas state via props passed from parent, NOT by importing Zustand directly (ui package has no Zustand dependency)
- All styling via Tailwind utilities — no `style={}` props
- All colour via CSS custom properties — no hardcoded values
- [Source: architecture.md#Naming Patterns, Structure Patterns]

### Component Specifications

- Typography: Inter italic, `--text-muted` colour, `base` size (15px)
- Position: absolute centre of the canvas viewport — use CSS `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center`
- Motion: CSS `transition: opacity 500ms ease-in` — Tailwind `transition-opacity duration-500 ease-in`
- Reduced motion: Tailwind `motion-reduce:transition-none` — component uses `setTimeout(3000)` for DOM removal regardless
- No `aria-live` needed — hint is decorative/ambient, not assertive
- [Source: ux-design-specification.md#Component Strategy — CanvasHint, Motion Principles]

### Empty State Philosophy

- The hint is the ONLY onboarding element — no tooltips, no tutorials, no getting-started flows
- Empty canvas after all cards archived: no hint appears (hint is first-launch only when `todos` is empty AND app has never had cards — simplify: just check current empty state)
- Copy is exact: "Start with what calls to you" — do not change wording
- [Source: ux-design-specification.md#Empty State Patterns]

### Integration with Story 2.1

- Depends on `ConstellationCanvas` being created in Story 2.1
- `CanvasHint` renders as an overlay ON the canvas, not inside React Flow's node system
- Canvas background (`--canvas-bg`) is the backdrop — hint text must have sufficient contrast

### Project Structure Notes

Files to create/modify:
```
packages/ui/src/
  components/
    CanvasHint.tsx           ← NEW
  index.ts                   ← MODIFY: export CanvasHint

apps/web/src/
  App.tsx                    ← MODIFY: pass isEmpty prop to ConstellationCanvas or render CanvasHint conditionally
```

### References

- [Source: epics.md#Story 2.2]
- [Source: ux-design-specification.md#Empty State Patterns]
- [Source: ux-design-specification.md#Component Strategy — CanvasHint]
- [Source: ux-design-specification.md#Motion Principles]
- [Source: architecture.md#Naming Patterns, Structure Patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No issues encountered during implementation.

### Completion Notes List

- Created `CanvasHint` component in `packages/ui/src/components/CanvasHint.tsx` with props-based API (`isEmpty` boolean)
- Component renders centred italic text "Start with what calls to you" with `--text-muted` colour via Tailwind utilities
- Fade-out uses CSS `transition-opacity duration-500 ease-in` triggered after 3s via `setTimeout`
- DOM removal via fallback `setTimeout` at 3.5s (works regardless of CSS transition, safe for `prefers-reduced-motion`)
- `motion-reduce:transition-none` Tailwind class disables animation for reduced-motion users
- Integrated into `App.tsx` Canvas component — reads `todos.items.length === 0` from Zustand store and passes `isEmpty` prop
- CanvasHint rendered as absolute overlay on top of ConstellationCanvas, not inside React Flow node system
- 10 unit tests for CanvasHint component + 2 integration tests in App.test.tsx
- All tests pass (145 domain + 8 storage + 20 web), no regressions
- TypeScript compiles cleanly for both UI package and web app

### File List

- `packages/ui/src/components/CanvasHint.tsx` — NEW: CanvasHint component
- `packages/ui/src/index.ts` — MODIFIED: added CanvasHint export
- `apps/web/src/App.tsx` — MODIFIED: integrated CanvasHint with isEmpty prop from store
- `apps/web/src/components/CanvasHint.test.tsx` — NEW: 10 unit tests for CanvasHint
- `apps/web/src/App.test.tsx` — MODIFIED: added 2 integration tests for CanvasHint visibility

## Change Log

- 2026-03-11: Implemented Story 2.2 — CanvasHint component with ambient fade-out, reduced-motion support, and store-driven empty-state detection
- 2026-03-11: Code review fixes — (H1) fixed state reset so hint re-appears when canvas becomes empty again; (H2) fixed timer cleanup race condition using refs; (M1) removed unnecessary useCallback; added re-show test
