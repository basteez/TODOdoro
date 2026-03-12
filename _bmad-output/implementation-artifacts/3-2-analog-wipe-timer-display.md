# Story 3.2: Analog Wipe Timer Display

Status: done

## Story

As a user in an active session,
I want to see a circular analog timer fill rather than a countdown,
so that I experience time as presence accumulating — not a deadline approaching.

## Acceptance Criteria (BDD)

1. **Given** a session is active
   **When** the `AnalogTimerWipe` component renders
   **Then** it displays as a circular SVG ring that fills clockwise from 0% to 100% over the session duration using `stroke-dashoffset` animation
   **And** it carries `role="timer"` with `aria-label="N minutes remaining"` and `aria-live="off"` during the session
   **And** when `prefers-reduced-motion: reduce` is set, the timer renders as a static filled bar showing proportional elapsed time — no animation
   **And** the timer uses Inter Mono / JetBrains Mono for any numeric display at 48px
   **And** no progress alerts, notification sounds, or mid-session interruptions occur while the timer runs

## Tasks / Subtasks

- [x] Task 1: Create `AnalogTimerWipe` component (AC: #1)
  - [x] Create `packages/ui/src/components/AnalogTimerWipe.tsx`
  - [x] SVG circular ring: two `<circle>` elements — background track + foreground fill
  - [x] Use `stroke-dasharray` = circumference, `stroke-dashoffset` = circumference × (1 - progress)
  - [x] Progress = `elapsedMs / configuredDurationMs`, clamped to [0, 1]
  - [x] Ring fills clockwise from 12 o'clock position (rotate SVG -90deg)
  - [x] Foreground stroke colour: `var(--session-active)` (`hsl(210, 60%, 65%)`)
  - [x] Background track colour: `hsl(220, 14%, 20%)` or `var(--surface-border)`
  - [x] Size: small, peripheral — not dominating the canvas (e.g., 80-120px diameter)
- [x] Task 2: Wire timer tick via `requestAnimationFrame` (AC: #1)
  - [x] In `App.tsx` or a dedicated `useSessionTick` hook: when `activeSession.status === 'active'`, start a `requestAnimationFrame` loop
  - [x] Each frame: call `useSessionStore.getState().tick()` which computes `elapsedMs = Date.now() - activeSession.startedAt`
  - [x] **Critical**: `useEffect` with cleanup — always `cancelAnimationFrame(rafId)` on unmount/session end
  - [x] Timer tick updates `useSessionStore.elapsedMs` — only the timer component re-renders (not the canvas)
  - [x] Do NOT use `setInterval` — `requestAnimationFrame` is more accurate and pauses when tab is hidden (desired behaviour)
- [x] Task 3: Numeric display (AC: #1)
  - [x] Show remaining minutes as large numeric: `Math.ceil((configuredDurationMs - elapsedMs) / 60000)`
  - [x] Font: `font-mono` (maps to Inter Mono / JetBrains Mono in Tailwind config)
  - [x] Size: `text-5xl` (48px) or equivalent
  - [x] Colour: `var(--session-active)` for active timer text
  - [x] No seconds display — minutes only, calm and ambient
- [x] Task 4: Fixed-position layout (AC: #1)
  - [x] Position: fixed bottom-left or bottom-center of viewport, outside React Flow canvas
  - [x] Must not interfere with card interactions, drag, or zoom
  - [x] Small footprint — peripheral, not attention-grabbing
  - [x] `z-index` above canvas but below any dialogs/popovers
- [x] Task 5: Accessibility (AC: #1)
  - [x] `role="timer"` on container element
  - [x] `aria-label="N minutes remaining"` — updates as minutes change (not every frame)
  - [x] `aria-live="off"` during session (no screen reader interruptions)
  - [x] On completion: briefly set `aria-live="assertive"` with "Session complete" (handled in Story 3.3)
- [x] Task 6: Reduced motion support (AC: #1)
  - [x] When `prefers-reduced-motion: reduce`: no `stroke-dashoffset` CSS transition
  - [x] Instead: render a static horizontal bar or static ring segment showing proportional elapsed
  - [x] Handle via CSS `@media (prefers-reduced-motion: reduce)` — set `transition: none` on the circle
  - [x] The component still updates position each frame, but no smooth animation between states
- [x] Task 7: Mount/unmount integration (AC: #1)
  - [x] Show `AnalogTimerWipe` only when `activeSession.status === 'active'`
  - [x] Mount in `App.tsx` alongside the canvas — conditional render based on session store
  - [x] On session end (Story 3.3/3.4): unmount component cleanly
- [x] Task 8: Tests (AC: #1)
  - [x] `AnalogTimerWipe.test.tsx`: renders SVG ring, correct progress calculation
  - [x] `AnalogTimerWipe.test.tsx`: `role="timer"` and `aria-label` present
  - [x] `AnalogTimerWipe.test.tsx`: reduced motion renders without animation
  - [x] `useSessionTick` or integration test: rAF loop starts/stops correctly
  - [x] Verify canvas does NOT re-render on timer ticks (store separation test)

## Dev Notes

### Architecture Compliance

- **Store separation is critical**: timer ticks (60fps via rAF) update `useSessionStore.elapsedMs` ONLY. Canvas components subscribe to `useCanvasStore`. This prevents 60fps re-renders of the entire node graph. [Source: architecture.md#D7]
- **`useEffect` with cleanup**: timer rAF loop MUST return `() => cancelAnimationFrame(rafId)`. This is an explicit anti-pattern prevention. [Source: architecture.md#Anti-Patterns]
- **No `setInterval`**: architecture specifies `requestAnimationFrame` for timer ticks. rAF naturally pauses when tab is hidden — desired for crash recovery scenarios (Stories 3.5/3.6).
- **CSS custom properties only**: all colours via `var(--session-active)`, `var(--surface-border)`, etc. Never hardcoded hex/hsl. [Source: architecture.md#Anti-Patterns]
- **`prefers-reduced-motion` at CSS level**: components never check `window.matchMedia` directly — use CSS media queries. [Source: architecture.md#Process Patterns — Tailwind Usage]

### SVG Timer Implementation Details

```
SVG ring approach:
- viewBox="0 0 120 120" (or similar)
- Two <circle> elements: cx="60" cy="60" r="52" (leaves room for stroke)
- strokeWidth="8" (or similar thin ring)
- Background: stroke="var(--surface-border)", full circumference
- Foreground: stroke="var(--session-active)", stroke-dasharray={circumference}, stroke-dashoffset={circumference * (1 - progress)}
- Transform: rotate(-90deg) on SVG to start from 12 o'clock
- Transition: smooth via CSS transition on stroke-dashoffset (respect reduced-motion)
```

### Timer Accuracy

- NFR: timer accuracy ±1s. With rAF at ~60fps, each frame is ~16ms — well within tolerance.
- Elapsed time is calculated from `Date.now() - startedAt` on each tick, not accumulated deltas (prevents drift).
- `startedAt` comes from the `SessionStartedEvent.timestamp` stored in `useSessionStore.activeSession`.

### Key Technical Details

- `useSessionStore` already has `activeSession: ActiveSessionReadModel` — add `elapsedMs: number` field
- Timer display in minutes only (no seconds) — calm, ambient UX. `Math.ceil(remainingMs / 60000)`.
- When `remainingMs <= 0`, timer shows "0" briefly before completion logic fires (Story 3.3)
- No sounds, alerts, or notifications — the timer is silent and peripheral

### Project Structure Notes

Files to create/modify:
```
packages/ui/src/
  components/
    AnalogTimerWipe.tsx         ← NEW: SVG circular timer component
    AnalogTimerWipe.test.tsx    ← NEW: component tests
  index.ts                      ← MODIFY: export AnalogTimerWipe

apps/web/src/
  stores/
    useSessionStore.ts          ← MODIFY: add elapsedMs field, tick() method
  hooks/
    useSessionTick.ts           ← NEW (optional): rAF loop hook, or inline in App.tsx
  App.tsx                       ← MODIFY: mount AnalogTimerWipe, wire tick loop
```

### Previous Story Intelligence

- From Story 2.7: `useEffect` with cleanup was a key pattern. Timer tick loop follows same pattern.
- From Epic 2 retro: "React Flow integration surprises" — ensure timer component doesn't interfere with React Flow's event handling or layout.
- CanvasHint in Story 2.2 used a 3-second auto-dismiss pattern — similar timing patterns may be useful for CompletionMoment (Story 3.3).

### References

- [Source: epics.md#Story 3.2]
- [Source: architecture.md#D7 — useSessionStore owns timer tick state]
- [Source: architecture.md#Process Patterns — useEffect cleanup for timers]
- [Source: architecture.md#Anti-Patterns — no useEffect timer without cleanup]
- [Source: ux-design-specification.md#Component Inventory — AnalogTimerWipe]
- [Source: ux-design-specification.md#Colour Semantics — session-active]
- [Source: ux-design-specification.md#Typography Scale — timer at 48px monospace]
- [Source: ux-design-specification.md#Motion & Reduced Motion — timer wipe static bar fallback]
- [Source: ux-design-specification.md#Accessibility — role="timer", aria-live="off"]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Created `AnalogTimerWipe` SVG circular ring component (100px diameter, 6px stroke)
- Foreground fills clockwise from 12 o'clock using stroke-dashoffset, CSS transition for smooth animation
- Reduced motion: global CSS `transition-duration: 0s` already handles this via index.css
- Created `useSessionTick` hook with rAF loop + proper cleanup
- Timer displays remaining minutes only (Math.ceil), 48px monospace font, --session-active color
- Fixed position bottom-left, z-index 40, pointer-events: none
- Mounted conditionally in App.tsx when session is active
- 11 new tests covering SVG rendering, progress calculation, accessibility attributes

### Change Log

- 2026-03-12: Implemented Story 3.2 — AnalogTimerWipe component, useSessionTick hook, App.tsx integration

### File List

- packages/ui/src/components/AnalogTimerWipe.tsx (NEW)
- packages/ui/src/index.ts (MODIFIED)
- apps/web/src/hooks/useSessionTick.ts (NEW)
- apps/web/src/components/AnalogTimerWipe.test.tsx (NEW)
- apps/web/src/App.tsx (MODIFIED)
