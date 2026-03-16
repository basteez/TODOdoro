# Story 5.4: The Shelf — Personal Archive

Status: done

## Story

As a user,
I want to open the Shelf and see all my sealed and released todos with their full histories,
So that the lifecycle of my intentions is visible over time — a personal archive, not a graveyard.

## Acceptance Criteria

1. **Given** at least one todo has been sealed or released **When** the user activates the Shelf icon (fixed canvas corner, ~35% opacity, keyboard-accessible) **Then** the `ShelfDrawer` opens as a Radix Sheet sliding in from the right; the canvas remains visible behind it
2. **Given** the ShelfDrawer is open **Then** the drawer carries `aria-label="Shelf"`
3. **Given** the ShelfDrawer is open **Then** each `ShelfCard` displays: todo title, sealed or released badge with distinct colours (`--sealed` muted sage / `--released` muted lavender), the compact `DevotionRecord` timeline, and the date sealed/released
4. **Given** the ShelfDrawer is open **Then** sealed and released todos carry visually distinct badges — equal visual dignity, no hierarchy between them
5. **Given** the ShelfDrawer is open **Then** the Shelf renders from `ShelfReadModel` data in `useCanvasStore` — no additional event store reads on open
6. **Given** the ShelfDrawer is open **Then** pressing Escape or clicking the canvas area behind the drawer closes it
7. **Given** `prefers-reduced-motion: reduce` is set **Then** the ShelfDrawer opens and closes without the slide animation

## Tasks / Subtasks

- [x] Task 1: Create `ShelfCard` component (AC: #3, #4)
  - [x] 1.1 Create `packages/ui/src/components/ShelfCard.tsx`
  - [x] 1.2 Display todo title, lifecycle badge (sealed/released), compact DevotionRecord, date
  - [x] 1.3 Sealed badge: `--sealed` token (`hsl(155, 35%, 52%)` muted sage)
  - [x] 1.4 Released badge: `--released` token (`hsl(270, 20%, 55%)` muted lavender)
  - [x] 1.5 Use `DevotionRecord` component for compact timeline (reuse existing)
  - [x] 1.6 Format date as readable date string (e.g. "Mar 15")
  - [x] 1.7 Export from `packages/ui/src/index.ts`

- [x] Task 2: Create `ShelfDrawer` component (AC: #1, #2, #5, #6, #7)
  - [x] 2.1 Create `packages/ui/src/components/ShelfDrawer.tsx`
  - [x] 2.2 Use Radix `Dialog` with drawer styling (slide from right)
  - [x] 2.3 Slide in from right; canvas visible behind (semi-transparent overlay)
  - [x] 2.4 `aria-label="Shelf"` on the drawer
  - [x] 2.5 Render `ShelfCard` for each item from `ShelfReadModel.items`
  - [x] 2.6 Chronological order (most recent first)
  - [x] 2.7 Escape or clicking outside closes
  - [x] 2.8 Respect `prefers-reduced-motion` — motion-reduce:animate-none class
  - [x] 2.9 Export from `packages/ui/src/index.ts`

- [x] Task 3: Wire ShelfIcon to open ShelfDrawer (AC: #1)
  - [x] 3.1 Add `isShelfOpen` state in Canvas component
  - [x] 3.2 Wire ShelfIcon `onClick` to toggle `isShelfOpen`
  - [x] 3.3 Pass shelf items from `useCanvasStore((s) => s.shelf.items)` to ShelfDrawer
  - [x] 3.4 Pass devotion records from `useCanvasStore((s) => s.devotionRecord)` for compact timelines

- [x] Task 4: Add design tokens for sealed/released (AC: #3, #4)
  - [x] 4.1 Verified `--sealed` and `--released` CSS custom properties already exist in `apps/web/src/index.css`
  - [x] 4.2 `--sealed: hsl(155, 35%, 52%)` already present in both themes
  - [x] 4.3 `--released: hsl(270, 20%, 55%)` already present in both themes

- [x] Task 5: Tests (AC: #1–7)
  - [x] 5.1 `ShelfCard` tests: renders title, badge colour, DevotionRecord, date
  - [x] 5.2 `ShelfDrawer` tests: renders items, aria-label, Escape closes
  - [x] 5.3 Integration: ShelfIcon wired in Canvas component
  - [x] 5.4 Run full test suite

## Dev Notes

### Shelf Data (Already Available)

- **`ShelfReadModel`**: `useCanvasStore((s) => s.shelf)` — already populated on boot and updated on every event via `projectShelf`
- **DevotionRecord data**: `useCanvasStore((s) => s.devotionRecord.records)` — Map of `todoId → { sessions[] }`. Used for compact timeline in ShelfCard.

### Architecture Compliance

- [Source: architecture.md#D6 — No router: Shelf is a React state–driven drawer (`isShelfOpen: boolean`)]
- [Source: architecture.md#D7 — Zustand store: ShelfReadModel lives in useCanvasStore]

### References

- [Source: epics.md#Story 5.4 — acceptance criteria]
- [Source: ux-design-specification.md#Component Strategy — ShelfDrawer, ShelfCard]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Created ShelfCard component with title, lifecycle badge (sealed/released with distinct colors), compact DevotionRecord timeline, and formatted date
- Created ShelfDrawer component using Radix Dialog with drawer styling (slides from right, semi-transparent overlay, canvas visible behind)
- Added onClick prop to ShelfIcon, wired in Canvas component with isShelfOpen state
- Shelf renders from ShelfReadModel data — no event store reads on open
- Design tokens (--sealed, --released) already existed in both themes
- 13 new tests: 7 ShelfCard + 6 ShelfDrawer

### Change Log

- 2026-03-16: Implemented Story 5.4 — ShelfDrawer and ShelfCard components, wired ShelfIcon to open drawer with shelf data from store
- 2026-03-16: Code review — added missing @keyframes slide-in-right to index.css (animation was non-functional), fixed sort test to use reverse-ordered items

### File List

- packages/ui/src/components/ShelfCard.tsx (new — individual shelf item display with badge and timeline)
- packages/ui/src/components/ShelfDrawer.tsx (new — Radix Dialog right drawer with sorted shelf items)
- packages/ui/src/components/ShelfIcon.tsx (modified — added onClick prop)
- packages/ui/src/index.ts (modified — export ShelfCard, ShelfDrawer)
- apps/web/src/App.tsx (modified — added isShelfOpen state in Canvas, wired ShelfIcon and ShelfDrawer)
- apps/web/src/components/ShelfCard.test.tsx (new — 7 tests)
- apps/web/src/components/ShelfDrawer.test.tsx (new — 6 tests)
