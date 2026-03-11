# Story 2.1: App Shell, Design Tokens, and Canvas Scaffold

Status: done

## Story

As a user,
I want to open tododoro and see a full-viewport canvas with the correct visual identity,
So that the spatial model is established from the very first moment and the app feels intentional and considered.

## Acceptance Criteria (BDD)

1. **Given** the monorepo foundation is in place (Epic 1)
   **When** the app is opened in a modern browser
   **Then** the viewport is filled entirely by the canvas — no top navigation bar, no sidebar, no persistent UI rails

2. **Given** the app renders
   **Then** the dark (Midnight Canvas) theme is applied by default: `--canvas-bg: hsl(220, 18%, 8%)`, `--surface: hsl(220, 14%, 13%)`, `--devotion: hsl(38, 80%, 58%)`, `--session-active: hsl(210, 60%, 65%)`, `--text-primary: hsl(220, 10%, 88%)`
   **And** all colour tokens are defined as CSS custom properties on `:root` in `apps/web/src/index.css`; no hardcoded hex or hsl values appear in component files

3. **Given** the app renders
   **Then** React Flow is initialised as `ConstellationCanvas` with pan, zoom, and an empty node set
   **And** `useCanvasStore` is initialised with `isBooting: false` after the boot sequence completes

4. **Given** the app is loaded
   **Then** First Contentful Paint is under 1.5 seconds on standard broadband (static CDN, no server round-trip)

## Tasks / Subtasks

- [x] Task 1: Install frontend dependencies (AC: #1, #3)
  - [x] Add `@xyflow/react` to `@tododoro/ui` package.json
  - [x] Add `tailwindcss` v4 + `@tailwindcss/vite` to `apps/web` devDependencies
  - [x] Add `@radix-ui/react-dialog`, `@radix-ui/react-context-menu`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `@radix-ui/react-switch`, `@radix-ui/react-slider` to `@tododoro/ui`
  - [x] Run `pnpm install` and verify lockfile
- [x] Task 2: Define design tokens in `apps/web/src/index.css` (AC: #2)
  - [x] Replace current `style.css` with `index.css` containing Tailwind v4 directives (`@import "tailwindcss"`)
  - [x] Define all CSS custom properties on `:root` (dark/Midnight Canvas default):
    - `--canvas-bg: hsl(220, 18%, 8%)`
    - `--surface: hsl(220, 14%, 13%)`
    - `--surface-border: hsl(220, 12%, 20%)`
    - `--devotion: hsl(38, 80%, 58%)`
    - `--session-active: hsl(210, 60%, 65%)`
    - `--text-primary: hsl(220, 10%, 88%)`
    - `--text-muted: hsl(220, 8%, 50%)`
    - `--sealed: hsl(155, 35%, 52%)`
    - `--released: hsl(270, 20%, 55%)`
  - [x] Define `[data-theme="light"]` overrides: warm off-white canvas (`hsl(40, 20%, 96%)`), near-white cards, devotion amber unchanged
  - [x] Configure Tailwind v4 `@theme` section to map CSS custom properties to utility classes
  - [x] Update `main.tsx` import from `./style.css` to `./index.css`
- [x] Task 3: Create `ConstellationCanvas` component (AC: #1, #3)
  - [x] Create `packages/ui/src/components/ConstellationCanvas.tsx`
  - [x] Import `ReactFlow`, `Background`, `Controls` from `@xyflow/react`
  - [x] Import `@xyflow/react/dist/style.css` in the component
  - [x] Configure React Flow with: `fitView`, pan on drag, zoom on scroll, empty `nodes` + `edges` arrays
  - [x] Apply `--canvas-bg` via React Flow's `style` prop or CSS variable override
  - [x] Full viewport: the component fills its parent container (100vw × 100vh)
  - [x] Export from `packages/ui/src/index.ts`
- [x] Task 4: Wire `App.tsx` with React ErrorBoundary and ConstellationCanvas (AC: #1, #3)
  - [x] Create `apps/web/src/App.tsx` with a root ErrorBoundary wrapping `ConstellationCanvas`
  - [x] ErrorBoundary: single root-level, renders fallback message on uncaught React errors
  - [x] Update `main.tsx` to render `<App />` instead of the placeholder `<div>`
  - [x] Canvas renders only when `useCanvasStore(s => s.isBooting)` is `false`
- [x] Task 5: Resolve tech debt — `useCanvasStore.applyEvent` (AC: #3)
  - [x] Add `applyEvent(event: DomainEvent): void` method to `useCanvasStore`
  - [x] `applyEvent` must call all projection functions: `projectTodoList`, `projectShelf`, `projectDevotionRecord` with current state + event, then update store
  - [x] This is HIGH priority tech debt from Epic 1 retrospective
- [x] Task 6: Verify build and CI (AC: #4)
  - [x] Run `pnpm turbo build` — ensure no TypeScript errors
  - [x] Run `pnpm turbo typecheck` — clean pass
  - [x] Verify dev server starts and renders full-viewport canvas
  - [x] Verify FCP < 1.5s (dev server is acceptable baseline)

## Dev Notes

### Architecture Compliance

- **No router.** The app has a single persistent view (canvas). No `<BrowserRouter>` or equivalent. Shelf = React state-driven drawer. Settings = Radix Dialog. [Source: architecture.md#D6]
- **Two Zustand stores:** `useCanvasStore` (TodoList + Shelf + DevotionRecord + isBooting) and `useSessionStore` (ActiveSession + timer tick). Timer ticks must never trigger canvas re-renders. [Source: architecture.md#D7]
- **Single ErrorBoundary at app root.** Domain errors are returned as values, never thrown. The boundary is last-resort only. [Source: architecture.md#D8]
- **CSP headers** in `vite.config.ts` (dev) and `vercel.json` (prod): `default-src 'self'`, `script-src 'self' 'wasm-unsafe-eval'`, `style-src 'self' 'unsafe-inline'`, `connect-src 'none'`. [Source: architecture.md#D9]

### Technical Stack (exact versions)

- React 19 (already installed)
- Vite 7 (already installed)
- Zustand 5 (already installed)
- `@xyflow/react` — latest stable (React Flow v12+)
- Tailwind CSS v4 — use `@tailwindcss/vite` plugin, NOT PostCSS
- Radix UI — latest stable per-component packages

### Design Token Strategy

- All colours as CSS custom properties on `:root` — Tailwind v4 consumes them via `@theme`
- No hardcoded `hsl(...)` or `#hex` in any component file — EVER
- `prefers-reduced-motion` handled at CSS token level — all transition durations resolve to `0`
- Dark mode is default; light mode via `[data-theme="light"]` on `<html>` element
- [Source: ux-design-specification.md#Color System, architecture.md#Naming Patterns]

### Canvas Implementation

- React Flow manages node rendering, viewport state, drag positions internally
- `apps/web` maps `TodoListReadModel` → React Flow `Node[]` before passing to `ConstellationCanvas`
- Canvas boundary: drag end → `handlePositionTodo` (debounced 200ms) → `TodoPositionedEvent` → `applyEvent` → re-render
- For this story: empty node set only — card creation is Story 2.3
- [Source: architecture.md#Canvas Boundary]

### Critical Patterns

- **Naming:** Component files `PascalCase.tsx`, utility files `camelCase.ts`, CSS tokens `--kebab-case`
- **Styling:** All via Tailwind utility classes — never `style={}` (exception: React Flow node positioning)
- **Zustand:** Components subscribe via selectors ONLY: `useCanvasStore(s => s.isBooting)` — never subscribe to whole store
- **No `console.log` or `console.error`** in committed code
- [Source: architecture.md#Implementation Patterns]

### Previous Epic Learnings

- Complexity lives at boundaries (scaffolding, wiring) — this story IS a boundary story, expect surprises
- `useCanvasStore.applyEvent` is stubbed — MUST be resolved in this story (HIGH tech debt)
- Run `pnpm turbo typecheck && pnpm turbo build` after every major change
- [Source: epic-1-retro]

### Project Structure Notes

Files to create/modify:
```
apps/web/src/
  index.css          ← NEW: replaces style.css; Tailwind directives + all CSS tokens
  App.tsx            ← NEW: root component with ErrorBoundary + ConstellationCanvas
  main.tsx           ← MODIFY: render <App />, update CSS import
  stores/
    useCanvasStore.ts ← MODIFY: add applyEvent method

packages/ui/src/
  components/
    ConstellationCanvas.tsx  ← NEW: React Flow canvas component
  index.ts           ← MODIFY: export ConstellationCanvas

packages/ui/package.json  ← MODIFY: add @xyflow/react, @radix-ui/* deps
apps/web/package.json     ← MODIFY: add tailwindcss, @tailwindcss/vite
apps/web/vite.config.ts   ← MODIFY: add @tailwindcss/vite plugin
```

Delete: `apps/web/src/style.css` (replaced by `index.css`)

### References

- [Source: architecture.md#Frontend Architecture — D6, D7, D8]
- [Source: architecture.md#Implementation Patterns — Naming, Structure, Tailwind Usage]
- [Source: architecture.md#Project Structure — Complete Directory Structure]
- [Source: ux-design-specification.md#Design System Foundation — Color System, Typography]
- [Source: ux-design-specification.md#Component Strategy — ConstellationCanvas]
- [Source: epics.md#Story 2.1]
- [Source: epic-1-retro — Tech Debt, Action Items]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Stale `.tsbuildinfo` / `dist/` caches caused TS6305 errors during initial build verification. Fixed by cleaning all dist + tsbuildinfo artifacts and force-rebuilding.
- jsdom lacks `ResizeObserver` (required by React Flow). Added a polyfill stub in `test-setup.ts`.
- `@tododoro/ui` package needed `build` script added (`tsc -b`) for turbo's `^build` dependency chain to work.

### Completion Notes List

- Installed all frontend dependencies: @xyflow/react, Tailwind CSS v4, all Radix UI component packages
- Created `index.css` with full Midnight Canvas dark theme tokens, light theme overrides, Tailwind v4 `@theme` mapping, and `prefers-reduced-motion` support
- Built `ConstellationCanvas` component with React Flow (pan, zoom, empty nodes, canvas-bg styling)
- Created `App.tsx` with root ErrorBoundary wrapping ConstellationCanvas, conditional on `isBooting` state
- Implemented `applyEvent(event: DomainEvent)` on `useCanvasStore` — calls `projectTodoList`, `projectShelf`, `projectDevotionRecord` and updates store (resolves HIGH priority Epic 1 tech debt)
- Added test infrastructure for `apps/web`: vitest + jsdom + @testing-library/react with ResizeObserver polyfill
- 8 new tests: 6 for useCanvasStore (bootstrap + applyEvent), 2 for App (boot gating + canvas rendering)
- All 161 tests pass across monorepo (145 domain + 8 storage + 8 web), zero regressions
- Build output: 378.76 kB JS (121.05 kB gzip), 20.89 kB CSS (4.25 kB gzip)

### Change Log

- 2026-03-11: Implemented Story 2.1 — App Shell, Design Tokens, and Canvas Scaffold
- 2026-03-11: Code review fixes — added CSP header to vite.config.ts (D9), moved ErrorBoundary to wrap boot gate, replaced inline styles with Tailwind classes, pinned dependency versions, removed redundant wrapper div in ConstellationCanvas, fixed test to use scoped container queries

### File List

New files:
- apps/web/src/index.css
- apps/web/src/App.tsx
- apps/web/src/App.test.tsx
- apps/web/src/test-setup.ts
- apps/web/src/stores/useCanvasStore.test.ts
- apps/web/vitest.config.ts
- packages/ui/src/components/ConstellationCanvas.tsx

Modified files:
- apps/web/src/main.tsx
- apps/web/src/stores/useCanvasStore.ts
- apps/web/vite.config.ts
- apps/web/package.json
- packages/ui/src/index.ts
- packages/ui/package.json
- packages/ui/tsconfig.json
- pnpm-lock.yaml

Deleted files:
- apps/web/src/style.css
