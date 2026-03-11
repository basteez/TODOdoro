# Story 2.2: Zero-Onboarding Canvas Hint

Status: ready-for-dev

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

- [ ] Task 1: Create `CanvasHint` component (AC: #1, #2, #3)
  - [ ] Create `packages/ui/src/components/CanvasHint.tsx`
  - [ ] Render centred italic text: "Start with what calls to you" using `--text-muted` colour
  - [ ] CSS transition: `opacity 1 → 0` over 500ms ease-in, triggered after 3s delay
  - [ ] After transition completes, remove from DOM (use `onTransitionEnd` or `setTimeout` for cleanup)
  - [ ] `prefers-reduced-motion: reduce` — no fade animation, just render for 3s then remove from DOM
  - [ ] Use Tailwind utilities only — no inline styles
  - [ ] Export from `packages/ui/src/index.ts`
- [ ] Task 2: Integrate CanvasHint into ConstellationCanvas (AC: #1, #4)
  - [ ] Show `CanvasHint` only when `useCanvasStore(s => s.todos)` has zero active todos
  - [ ] Position as a centred overlay on the canvas (not a React Flow node)
  - [ ] Hide immediately when the first card is created (reactive to store changes)
- [ ] Task 3: Verify reduced-motion behaviour (AC: #3)
  - [ ] Test with OS `prefers-reduced-motion: reduce` toggled on
  - [ ] Confirm hint appears, stays 3s, vanishes instantly (no fade)

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

### Debug Log References

### Completion Notes List

### File List
