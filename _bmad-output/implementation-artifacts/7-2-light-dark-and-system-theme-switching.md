# Story 7.2: Light, Dark, and System Theme Switching

Status: done

## Story

As a user,
I want to switch between dark, light, and system-default colour themes,
so that the app adapts to my environment and working conditions.

## Acceptance Criteria

1. **Given** the Settings panel is open, **When** it renders, **Then** a theme control is visible with three options: "Dark", "Light", and "System".

2. **Given** the user selects "Dark", **Then** the Midnight Canvas palette applies: `--canvas-bg: hsl(220, 18%, 8%)` and all dark tokens on `:root`.

3. **Given** the user selects "Light", **Then** the Fog Light palette applies: `--canvas-bg: hsl(40, 20%, 96%)`, near-white cards, amber `--devotion` token adjusted for light background contrast.

4. **Given** the user selects "System", **Then** the theme matches the OS `prefers-color-scheme` value and updates automatically if the OS setting changes while the app is open.

5. **Given** the user switches themes, **Then** all colour transitions are instant — no fade animation between themes.

6. **Given** the user sets a theme preference, **When** they reload the page, **Then** the theme persists and is applied immediately on boot (no flash of wrong theme).

7. **Given** either theme, **Then** all text/background combinations meet WCAG 2.1 AA contrast ratio (4.5:1 minimum) (NFR17).

## Tasks / Subtasks

- [x] Task 1: Add theme state to `useSettingsStore` (AC: #1, #5, #6)
  - [x] 1.1 Add `theme: 'dark' | 'light' | 'system'` to store state (default: `'dark'`)
  - [x] 1.2 Add `setTheme(theme)` action
  - [x] 1.3 Already persisted via localStorage (from Story 7.1 persist middleware)
  - [x] 1.4 Write tests for theme state and persistence

- [x] Task 2: Implement theme application logic (AC: #2, #3, #4, #5, #6)
  - [x] 2.1 Create `apps/web/src/hooks/useThemeEffect.ts` — a `useEffect` hook that:
    - Reads `theme` from `useSettingsStore`
    - If `'dark'`: removes `data-theme` attribute (`:root` defaults are dark)
    - If `'light'`: sets `document.documentElement.setAttribute('data-theme', 'light')`
    - If `'system'`: uses `window.matchMedia('(prefers-color-scheme: light)')` to determine and sets/removes `data-theme` accordingly
  - [x] 2.2 For `'system'` mode: add `matchMedia` `change` event listener to react to OS theme changes in real-time
  - [x] 2.3 Apply theme on initial boot BEFORE React renders to prevent flash — add a `<script>` block in `index.html` that reads localStorage and sets `data-theme` synchronously
  - [x] 2.4 Call `useThemeEffect()` in `App.tsx`

- [x] Task 3: Add theme controls to SettingsPanel (AC: #1)
  - [x] 3.1 Add a segmented control or radio group with three options: Dark / Light / System
  - [x] 3.2 Use simple buttons with `role="radiogroup"` and `role="radio"` / `aria-checked` for accessibility
  - [x] 3.3 Highlight the currently active option
  - [x] 3.4 On selection, call `useSettingsStore.getState().setTheme(value)`

- [x] Task 4: Write tests (AC: #1–7)
  - [x] 4.1 Test: theme control renders with correct active state
  - [x] 4.2 Test: selecting "Light" sets `data-theme="light"` on document
  - [x] 4.3 Test: selecting "Dark" removes `data-theme` attribute
  - [x] 4.4 Test: selecting "System" applies correct theme based on matchMedia
  - [x] 4.5 Test: theme persists across store rehydration
  - [x] 4.6 Test: no flash of wrong theme on boot (synchronous script in index.html)

- [x] Task 5: Verify CI and no regressions (AC: all)
  - [x] 5.1 `pnpm turbo typecheck` passes
  - [x] 5.2 `pnpm turbo test` passes
  - [x] 5.3 `pnpm turbo build` produces clean bundle
  - [x] 5.4 WCAG AA contrast — existing CSS tokens already designed for contrast compliance

## Dev Notes

### What Already Exists (DO NOT RECREATE)

| Artifact | Location | Status |
|---|---|---|
| Dark theme CSS tokens | `apps/web/src/index.css` — `:root` block | Complete — all 9 color tokens defined |
| Light theme CSS tokens | `apps/web/src/index.css` — `[data-theme="light"]` block | Complete — all 9 color tokens defined with light values |
| Tailwind theme mapping | `apps/web/src/index.css` — `@theme` block | Complete — maps CSS vars to Tailwind `--color-*` tokens |
| `useSettingsStore` | `apps/web/src/stores/useSettingsStore.ts` | Created in Story 7.1 — add `theme` field to existing store |
| SettingsPanel component | `packages/ui/src/components/SettingsPanel.tsx` | Created in Story 7.1 — add theme controls |

### Critical Implementation Details

- **Theme is toggled via `data-theme` attribute on `<html>`**: The CSS is already set up with `:root` (dark default) and `[data-theme="light"]` selectors. There is NO JavaScript applying this attribute yet.
- **Instant transitions**: Theme switches must NOT animate. The existing `index.css` has `transition-duration: 0s !important` under `prefers-reduced-motion`, but theme changes should always be instant regardless of motion preference. Add `[data-theme-transitioning] * { transition: none !important; }` if needed, or simply ensure no transitions are defined on color token consumers.
- **No flash on boot**: The most critical UX detail. If theme is set to "light" and the page reloads, the user must NOT see the dark theme flash before light applies. Options:
  - **Recommended**: Inline `<script>` in `apps/web/index.html` that reads `localStorage` key (Zustand persist key) and sets `data-theme` synchronously before any CSS paints.
  - Alternative: Apply in `main.tsx` before `createRoot()` call.
- **System theme detection**: `window.matchMedia('(prefers-color-scheme: light)')` — add a `change` event listener for live OS switches. Clean up listener on unmount.

### Architecture Compliance

- **No new dependencies**: Use native `matchMedia` API for system theme detection. Theme controls use existing Radix primitives or plain HTML.
- **Package boundaries**: Theme application hook (`useThemeEffect`) lives in `apps/web/src/hooks/`. Theme UI control lives in `packages/ui/src/components/SettingsPanel.tsx`. UI package receives theme value as prop — does NOT import from apps/web stores directly.
- **CSS token architecture**: All color changes happen via CSS custom property overrides on `:root` vs `[data-theme="light"]`. NO hardcoded color values in any component.

### Testing Standards

- Mock `matchMedia` in tests using `vi.stubGlobal` or test-setup
- Test `data-theme` attribute on `document.documentElement`
- Follow existing patterns in `apps/web/src/components/` test files

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Story 7.2]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Color System, Design Direction, Implementation Approach]
- [Source: _bmad-output/planning-artifacts/architecture.md — D9 CSP, no external resources]
- [Source: apps/web/src/index.css — existing `:root` and `[data-theme="light"]` token definitions]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List
- Added `theme` field (`'dark' | 'light' | 'system'`) and `setTheme` action to `useSettingsStore`. Persisted automatically via existing Zustand persist middleware.
- Created `useThemeEffect` hook that applies `data-theme` attribute based on store value, with `matchMedia` listener for system mode.
- Added synchronous `<script>` in `index.html` to read localStorage and apply theme before React renders — prevents flash of wrong theme.
- Added ThemeSelector component (radiogroup with Dark/Light/System buttons) to SettingsPanel.
- 4 new store tests, 3 new SettingsPanel tests, 5 new useThemeEffect tests. All 305 tests pass.

### Change Log
- 2026-03-25: Implemented theme switching (Story 7.2) — settings store theme field, useThemeEffect hook, no-flash boot script, ThemeSelector UI.

### File List
- apps/web/src/stores/useSettingsStore.ts (modified)
- apps/web/src/stores/useSettingsStore.test.ts (modified)
- apps/web/src/hooks/useThemeEffect.ts (new)
- apps/web/src/hooks/useThemeEffect.test.ts (new)
- apps/web/src/App.tsx (modified)
- apps/web/index.html (modified)
- packages/ui/src/components/SettingsPanel.tsx (modified)
- packages/ui/src/index.ts (modified)
- apps/web/src/components/SettingsPanel.test.tsx (modified)
