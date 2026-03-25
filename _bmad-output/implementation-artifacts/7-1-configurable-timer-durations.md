# Story 7.1: Configurable Timer Durations

Status: done

## Story

As a user,
I want to configure the work session, short break, and long break durations independently,
so that the timer fits my rhythm rather than prescribing it.

## Acceptance Criteria

1. **Given** the app is open, **When** the user clicks the Settings icon (fixed bottom-right corner, keyboard-accessible), **Then** a `SettingsPanel` renders as a Radix Dialog.

2. **Given** the Settings panel is open, **When** it renders, **Then** three Radix Slider controls are visible: "Work session", "Short break", and "Long break", each showing the current value in minutes.

3. **Given** the Settings panel is open, **When** the user adjusts a slider, **Then** the corresponding duration updates immediately in the settings store and is reflected in the next session started.

4. **Given** the user changes the work session duration, **When** they start a new Pomodoro session, **Then** the session uses the new configured duration (not the hardcoded 25-minute default).

5. **Given** a session is currently active, **When** the user changes timer settings, **Then** the active session is NOT affected — the change applies only to future sessions.

6. **Given** the user sets timer values, **When** they reload the page, **Then** the settings persist (via localStorage) and are restored on boot.

7. **Given** the Settings panel is open, **When** the user presses Escape or clicks outside, **Then** the dialog closes.

8. **Given** the Settings panel is open, **When** navigating by keyboard, **Then** Tab moves between sliders, arrow keys adjust values, and all controls have visible focus indicators.

## Tasks / Subtasks

- [x] Task 1: Create `useSettingsStore` Zustand store (AC: #3, #6)
  - [x] 1.1 Create `apps/web/src/stores/useSettingsStore.ts`
  - [x] 1.2 State shape: `{ workDurationMs: number, shortBreakMs: number, longBreakMs: number }`
  - [x] 1.3 Defaults: work=25min, shortBreak=5min, longBreak=15min (all in ms)
  - [x] 1.4 Actions: `setWorkDuration(ms)`, `setShortBreak(ms)`, `setLongBreak(ms)`
  - [x] 1.5 Persist to localStorage via Zustand `persist` middleware
  - [x] 1.6 Write tests: `apps/web/src/stores/useSettingsStore.test.ts`

- [x] Task 2: Create `SettingsPanel` component (AC: #1, #2, #7, #8)
  - [x] 2.1 Create `packages/ui/src/components/SettingsPanel.tsx`
  - [x] 2.2 Use Radix Dialog (already installed: `@radix-ui/react-dialog`)
  - [x] 2.3 Use Radix Slider (already installed: `@radix-ui/react-slider`) for each duration
  - [x] 2.4 Slider ranges: work=5–90min, shortBreak=1–30min, longBreak=1–60min
  - [x] 2.5 Display current value in minutes next to each slider
  - [x] 2.6 Style with Tailwind using existing CSS tokens (`--surface`, `--text-primary`, etc.)
  - [x] 2.7 Export from `packages/ui/src/index.ts`

- [x] Task 3: Wire SettingsIcon to open SettingsPanel (AC: #1)
  - [x] 3.1 Add `onClick` prop to `SettingsIcon` or wire in `App.tsx`
  - [x] 3.2 Add `isSettingsOpen` state and toggle in `App.tsx`
  - [x] 3.3 Render `SettingsPanel` conditionally based on state

- [x] Task 4: Wire session commands to use settings store (AC: #4, #5)
  - [x] 4.1 In `apps/web/src/commands/sessionCommands.ts`, replace `DEFAULT_DURATION_MS` with value from `useSettingsStore.getState().workDurationMs`
  - [x] 4.2 Ensure active sessions are not affected by settings changes

- [x] Task 5: Write component tests (AC: #1–8)
  - [x] 5.1 Create `apps/web/src/components/SettingsPanel.test.tsx`
  - [x] 5.2 Test: dialog opens when triggered, closes on Escape
  - [x] 5.3 Test: sliders render with correct initial values
  - [x] 5.4 Test: slider changes update store values
  - [x] 5.5 Test: keyboard navigation works (Tab between sliders, arrow keys)
  - [x] 5.6 Test: settings persist across store rehydration

- [x] Task 6: Verify CI and no regressions (AC: all)
  - [x] 6.1 `pnpm turbo typecheck` passes
  - [x] 6.2 `pnpm turbo test` passes — all existing + new tests
  - [x] 6.3 `pnpm turbo build` produces clean bundle

## Dev Notes

### What Already Exists (DO NOT RECREATE)

| Artifact | Location | Status |
|---|---|---|
| SettingsIcon component | `packages/ui/src/components/SettingsIcon.tsx` | Exists — button with gear SVG, no click handler yet |
| SettingsIcon rendered in App | `apps/web/src/App.tsx:509` | Positioned fixed bottom-right, ~35% opacity |
| Radix Dialog primitive | `@radix-ui/react-dialog` in `packages/ui/package.json` | Already installed and used by ReleaseRitual, ShelfDrawer, CompletionMoment |
| Radix Slider primitive | `@radix-ui/react-slider` in `packages/ui/package.json` | Already installed, not yet used |
| DEFAULT_DURATION_MS | `apps/web/src/commands/sessionCommands.ts:27` | Hardcoded `25 * 60 * 1000` — must be replaced with settings store value |
| Zustand store pattern | `apps/web/src/stores/useCanvasStore.ts`, `useSessionStore.ts` | Established pattern — follow the same structure |
| CSS design tokens | `apps/web/src/index.css` | Full token system on `:root` and `[data-theme="light"]` |

### Architecture Compliance

- **Zustand persist middleware**: Use `zustand/middleware` `persist` with `localStorage` for settings persistence. This is the standard Zustand approach. Do NOT use domain events for settings — settings are UI-layer concerns, not domain events.
- **No new dependencies**: Radix Dialog and Slider are already installed. Zustand `persist` middleware ships with zustand.
- **Package boundaries**: Settings store lives in `apps/web/src/stores/`. SettingsPanel component lives in `packages/ui/src/components/`. Store is consumed via props or a hook passed from App.tsx — UI package must not import from apps/web.
- **TypeScript strict mode**: All new code must satisfy `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.

### Testing Standards

- Use Vitest + React Testing Library (already configured)
- Test files go in `apps/web/src/components/` for component tests, `apps/web/src/stores/` for store tests
- Follow existing patterns: see `ShelfDrawer.test.tsx` or `CompletionMoment.test.tsx` for Radix Dialog testing patterns
- Mock localStorage for persistence tests

### Project Structure Notes

- Components: `packages/ui/src/components/SettingsPanel.tsx`
- Store: `apps/web/src/stores/useSettingsStore.ts`
- Tests: `apps/web/src/stores/useSettingsStore.test.ts`, `apps/web/src/components/SettingsPanel.test.tsx`
- Wiring: `apps/web/src/App.tsx` (add state + render SettingsPanel)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 7.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — D7 Zustand Store Structure]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Settings panel: Radix Dialog + Slider + Switch]
- [Source: apps/web/src/commands/sessionCommands.ts:27 — DEFAULT_DURATION_MS to replace]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- Radix Slider `aria-label` must be set on `Slider.Thumb`, not `Slider.Root`, for accessible name to propagate to `role="slider"` element in jsdom.

### Completion Notes List
- Created `useSettingsStore` with Zustand persist middleware (localStorage key: `tododoro-settings`). Defaults: 25/5/15 min.
- Created `SettingsPanel` as a Radix Dialog with three Radix Slider controls for work session (5-90 min), short break (1-30 min), and long break (1-60 min).
- SettingsPanel accepts values/callbacks as props to maintain package boundary (UI package does not import from apps/web).
- Added `onClick` prop to `SettingsIcon` and wired it in `App.tsx` with `isSettingsOpen` state.
- Replaced hardcoded `DEFAULT_DURATION_MS` in `sessionCommands.ts` with `useSettingsStore.getState().workDurationMs`. Active sessions are unaffected because duration is captured at session start time.
- 6 store tests (defaults, actions, persistence, rehydration) and 11 component tests (dialog behavior, slider values/ranges, keyboard accessibility).
- All 293 tests pass, typecheck clean, build clean.

### Change Log
- 2026-03-25: Implemented configurable timer durations (Story 7.1) — settings store, SettingsPanel component, wiring in App.tsx, session commands integration.

### File List
- apps/web/src/stores/useSettingsStore.ts (new)
- apps/web/src/stores/useSettingsStore.test.ts (new)
- apps/web/src/components/SettingsPanel.test.tsx (new)
- apps/web/src/App.tsx (modified)
- apps/web/src/commands/sessionCommands.ts (modified)
- packages/ui/src/components/SettingsPanel.tsx (new)
- packages/ui/src/components/SettingsIcon.tsx (modified)
- packages/ui/src/index.ts (modified)
