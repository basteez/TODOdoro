# Story 2.7: Keyboard Navigation for Canvas Controls

Status: review

## Story

As a user who navigates by keyboard,
I want to create cards, start sessions, seal, release, and open settings using keyboard alone,
So that the full canvas experience is accessible without a pointer device.

## Acceptance Criteria (BDD)

1. **Given** the canvas is open
   **When** the user presses Tab
   **Then** focus moves sequentially through all visible todo cards, with a 2px solid `--session-active` focus ring on the focused card (`:focus-visible` only)

2. **Given** a card is focused via keyboard
   **When** the user presses Enter
   **Then** the card action menu opens

3. **Given** the canvas is open
   **When** the user presses `N` (or a documented shortcut) on an empty canvas area
   **Then** the create-card flow is triggered

4. **Given** the app is open
   **Then** the Shelf icon and Settings icon in the canvas corners are reachable and activatable by keyboard

5. **Given** the app is open
   **Then** a skip-to-canvas link is available for keyboard users at the top of the document

6. **Given** any focused element
   **Then** all focus indicators meet WCAG 2.1 AA visibility requirements (NFR16)

## Tasks / Subtasks

- [x] Task 1: Configure React Flow keyboard navigation (AC: #1, #6)
  - [x] Enable React Flow keyboard accessibility: Tab through nodes sequentially
  - [x] React Flow nodes must have `tabIndex={0}` and proper `aria-label`
  - [x] `TodoCard` `aria-label`: `"[title], [N] Pomodoros invested, [state]"` (state: idle/active session)
  - [x] For now, Pomodoro count is 0 for all cards (session features in Epic 3)
- [x] Task 2: Style focus ring (AC: #1, #6)
  - [x] Focus ring: 2px solid `--session-active` colour, 2px offset
  - [x] Apply only on `:focus-visible` — hidden for mouse clicks, shown for keyboard
  - [x] Tailwind: `focus-visible:ring-2 focus-visible:ring-[var(--session-active)] focus-visible:ring-offset-2`
  - [x] Verify contrast meets WCAG 2.1 AA against `--canvas-bg` and `--surface` backgrounds
- [x] Task 3: Enter key opens card action menu (AC: #2)
  - [x] On focused `TodoCard`, Enter key → open a context menu / dropdown
  - [x] For Epic 2: menu items are Rename only (Seal/Release/Start Session are future epics)
  - [x] Use Radix `DropdownMenu` triggered by Enter on focused card
  - [x] Menu is keyboard navigable (Arrow keys, Enter to select, Escape to close) — Radix handles this
- [x] Task 4: `N` shortcut for card creation (AC: #3)
  - [x] Register global keyboard listener for `N` key (when no input/textarea is focused)
  - [x] Trigger create-card flow at canvas centre (or last viewport centre)
  - [x] Use `useEffect` with cleanup: `addEventListener` / `removeEventListener`
  - [x] Guard: do not trigger if user is typing in an input field
- [x] Task 5: Create placeholder Shelf and Settings icons (AC: #4)
  - [x] Add Shelf icon (placeholder) in bottom-right or right edge of canvas — `<button>` with `aria-label="Open shelf"`
  - [x] Add Settings icon (placeholder) in a fixed canvas corner — `<button>` with `aria-label="Open settings"`
  - [x] Both are `<button>` elements, focusable via Tab, activatable via Enter/Space
  - [x] Visual: icon only, ~35% opacity at rest, opacity increase on hover/focus
  - [x] Functionality is placeholder — actual Shelf (Epic 5) and Settings (Epic 7) come later
- [x] Task 6: Skip-to-canvas link (AC: #5)
  - [x] Add visually hidden skip link as first focusable element in the document
  - [x] Text: "Skip to canvas"
  - [x] On activation: move focus to the React Flow canvas container
  - [x] Visually hidden by default, visible on `:focus` (standard skip-link pattern)
  - [x] Tailwind: `sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 ...`

## Dev Notes

### Architecture Compliance

- Keyboard shortcuts registered via `useEffect` with cleanup — always return `() => removeEventListener`. This is an explicit architecture pattern. [Source: architecture.md#Process Patterns]
- No `console.log` in keyboard handlers
- Radix UI handles focus management in dialogs/menus automatically
- [Source: architecture.md#Process Patterns, Anti-Patterns]

### Accessibility Requirements (WCAG 2.1 AA)

- Focus ring: visible, high-contrast, `:focus-visible` only (never show for mouse)
- All interactive elements: minimum role + accessible name
- React Flow `ariaLiveMessage` prop: configure for node add/remove announcements
- Tab order: skip link → canvas → cards (sequential) → Shelf icon → Settings icon
- [Source: ux-design-specification.md#Accessibility Strategy]
- [Source: architecture.md#D8 — Error Boundary, but also general accessibility patterns]

### Focus Ring Specifications

- 2px solid `--session-active` (`hsl(210, 60%, 65%)`)
- 2px offset from element edge
- `:focus-visible` only — `:focus:not(:focus-visible)` gets no ring
- Works on both `--canvas-bg` and `--surface` backgrounds
- High contrast mode: `@media (forced-colors: active)` — use system `Highlight` colour
- [Source: ux-design-specification.md#Accessibility Considerations, Interaction State Patterns]

### React Flow Keyboard Support

- React Flow has built-in keyboard navigation for nodes (Tab to focus, Arrow keys to move)
- Custom nodes need explicit `tabIndex={0}` and focus handling
- `onNodeClick` fires on Enter when node is focused — can be used to trigger action menu
- Check React Flow docs for `nodesFocusable` prop

### Peripheral UI Placement

- Shelf icon: fixed position, right edge or bottom-right corner
- Settings icon: fixed position, corner (architecture suggests minimal fixed-corner icon)
- Both at ~35% opacity, increasing on hover/focus
- These are PLACEHOLDERS — no drawer or dialog wired yet
- [Source: ux-design-specification.md#Action Hierarchy — Peripheral tier]

### Project Structure Notes

Files to create/modify:
```
packages/ui/src/
  components/
    TodoCard.tsx             ← MODIFY: add aria-label, tabIndex, Enter key handler
    ConstellationCanvas.tsx  ← MODIFY: add keyboard handlers, skip link integration
    SkipLink.tsx             ← NEW: skip-to-canvas link component
    ShelfIcon.tsx            ← NEW: placeholder shelf button
    SettingsIcon.tsx         ← NEW: placeholder settings button
  index.ts                   ← MODIFY: export new components

apps/web/src/
  App.tsx                    ← MODIFY: add SkipLink, ShelfIcon, SettingsIcon to layout
```

### References

- [Source: epics.md#Story 2.7]
- [Source: architecture.md#Process Patterns — useEffect with cleanup]
- [Source: ux-design-specification.md#Accessibility Strategy]
- [Source: ux-design-specification.md#Accessibility Considerations — Focus management]
- [Source: ux-design-specification.md#Action Hierarchy — Peripheral tier]
- [Source: ux-design-specification.md#Interaction State Patterns — Focus (keyboard)]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References

### Completion Notes List

- Added `aria-label="${title}, 0 Pomodoros invested, idle"` to idle TodoCard trigger div (AC #1, #6)
- Applied focus ring via Tailwind: `focus-visible:ring-2 focus-visible:ring-session-active focus-visible:ring-offset-2 focus-visible:outline-none` (AC #1, #6)
- Integrated `@radix-ui/react-dropdown-menu` — idle card is wrapped in `DropdownMenu.Root` with controlled `open` state (AC #2)
- Enter key on focused React Flow node detected via `onKeyDown` on ReactFlow → sets `actionMenuNodeId` in App.tsx (AC #2)
- `isMenuOpen` and `onMenuClose` added to `TodoCardData` so App.tsx can control menu state per card (AC #2)
- `N` key global listener in `CanvasInner` via `useEffect` with cleanup; creates card at current viewport centre; guards against input focus (AC #3)
- Created `SkipLink.tsx` — visually hidden skip link pointing to `#main-canvas`, reveals on focus (AC #5)
- Created `ShelfIcon.tsx` — fixed bottom-right button, `aria-label="Open shelf"`, 35% opacity, keyboard focusable (AC #4)
- Created `SettingsIcon.tsx` — fixed top-right button, `aria-label="Open settings"`, 35% opacity, keyboard focusable (AC #4)
- `CanvasInner` wrapper div gets `id="main-canvas" tabIndex={-1}` as skip link target (AC #5)
- `nodesFocusable` prop added to ConstellationCanvas for explicit React Flow Tab navigation (AC #1)
- All 86 tests pass (27 TodoCard tests including 3 new accessibility/menu tests, 7 accessibility component tests, 8 App tests)

### File List

- packages/ui/src/components/ConstellationCanvas.tsx
- packages/ui/src/components/TodoCard.tsx
- packages/ui/src/components/SkipLink.tsx (NEW)
- packages/ui/src/components/ShelfIcon.tsx (NEW)
- packages/ui/src/components/SettingsIcon.tsx (NEW)
- packages/ui/src/index.ts
- apps/web/src/App.tsx
- apps/web/src/components/ConstellationCanvas.test.tsx
- apps/web/src/components/TodoCard.test.tsx
- apps/web/src/components/accessibility.test.tsx (NEW)
- apps/web/src/App.test.tsx
- packages/ui/package.json

### Change Log

- 2026-03-11: Implemented Story 2.7 — keyboard nav, focus ring, action menu, N shortcut, skip link, shelf/settings icons
