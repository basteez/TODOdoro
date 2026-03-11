# Story 2.7: Keyboard Navigation for Canvas Controls

Status: ready-for-dev

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

- [ ] Task 1: Configure React Flow keyboard navigation (AC: #1, #6)
  - [ ] Enable React Flow keyboard accessibility: Tab through nodes sequentially
  - [ ] React Flow nodes must have `tabIndex={0}` and proper `aria-label`
  - [ ] `TodoCard` `aria-label`: `"[title], [N] Pomodoros invested, [state]"` (state: idle/active session)
  - [ ] For now, Pomodoro count is 0 for all cards (session features in Epic 3)
- [ ] Task 2: Style focus ring (AC: #1, #6)
  - [ ] Focus ring: 2px solid `--session-active` colour, 2px offset
  - [ ] Apply only on `:focus-visible` — hidden for mouse clicks, shown for keyboard
  - [ ] Tailwind: `focus-visible:ring-2 focus-visible:ring-[var(--session-active)] focus-visible:ring-offset-2`
  - [ ] Verify contrast meets WCAG 2.1 AA against `--canvas-bg` and `--surface` backgrounds
- [ ] Task 3: Enter key opens card action menu (AC: #2)
  - [ ] On focused `TodoCard`, Enter key → open a context menu / dropdown
  - [ ] For Epic 2: menu items are Rename only (Seal/Release/Start Session are future epics)
  - [ ] Use Radix `DropdownMenu` triggered by Enter on focused card
  - [ ] Menu is keyboard navigable (Arrow keys, Enter to select, Escape to close) — Radix handles this
- [ ] Task 4: `N` shortcut for card creation (AC: #3)
  - [ ] Register global keyboard listener for `N` key (when no input/textarea is focused)
  - [ ] Trigger create-card flow at canvas centre (or last viewport centre)
  - [ ] Use `useEffect` with cleanup: `addEventListener` / `removeEventListener`
  - [ ] Guard: do not trigger if user is typing in an input field
- [ ] Task 5: Create placeholder Shelf and Settings icons (AC: #4)
  - [ ] Add Shelf icon (placeholder) in bottom-right or right edge of canvas — `<button>` with `aria-label="Open shelf"`
  - [ ] Add Settings icon (placeholder) in a fixed canvas corner — `<button>` with `aria-label="Open settings"`
  - [ ] Both are `<button>` elements, focusable via Tab, activatable via Enter/Space
  - [ ] Visual: icon only, ~35% opacity at rest, opacity increase on hover/focus
  - [ ] Functionality is placeholder — actual Shelf (Epic 5) and Settings (Epic 7) come later
- [ ] Task 6: Skip-to-canvas link (AC: #5)
  - [ ] Add visually hidden skip link as first focusable element in the document
  - [ ] Text: "Skip to canvas"
  - [ ] On activation: move focus to the React Flow canvas container
  - [ ] Visually hidden by default, visible on `:focus` (standard skip-link pattern)
  - [ ] Tailwind: `sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 ...`

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

### Debug Log References

### Completion Notes List

### File List
