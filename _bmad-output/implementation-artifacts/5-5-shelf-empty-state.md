# Story 5.5: Shelf Empty State

Status: done

## Story

As a user,
I want to see a neutral empty state when the Shelf has no entries,
So that the absence of archived todos feels honest, not like a missing feature or a failure.

## Acceptance Criteria

1. **Given** no todos have been sealed or released **When** the user opens the Shelf **Then** the `ShelfDrawer` opens and displays the text "Nothing here yet" — neutral, no illustration, no CTA, no directive prompt
2. **Given** the Shelf is empty **Then** the empty state does not suggest any action the user should take
3. **Given** the Shelf is empty **Then** the empty state copy does not imply the user is behind or missing something

## Tasks / Subtasks

- [x] Task 1: Add empty state to ShelfDrawer (AC: #1, #2, #3)
  - [x] 1.1 In `ShelfDrawer`, check if `items.length === 0`
  - [x] 1.2 Render "Nothing here yet" — centred, `--text-muted` colour, `font-size: 14px`
  - [x] 1.3 No illustration, no button, no CTA, no directive copy
  - [x] 1.4 Same drawer structure (header, scrollable area) — just empty content area

- [x] Task 2: Tests (AC: #1–3)
  - [x] 2.1 Test empty state renders "Nothing here yet" when items is empty array
  - [x] 2.2 Test no buttons or links in empty state
  - [x] 2.3 Test non-empty state still renders ShelfCards normally
  - [x] 2.4 Run full test suite

## Dev Notes

### Implementation (Trivial)

Small addition to ShelfDrawer: conditional check for empty items renders neutral empty state.

### References

- [Source: ux-design-specification.md#Empty State Patterns — Shelf: "Nothing here yet"]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Added empty state to ShelfDrawer: "Nothing here yet" — centred, muted colour, no CTA/illustration
- 3 new tests: empty state renders, no buttons/links present, non-empty state unaffected

### Change Log

- 2026-03-16: Implemented Story 5.5 — Shelf empty state "Nothing here yet" in ShelfDrawer

### File List

- packages/ui/src/components/ShelfDrawer.tsx (modified — added empty state conditional)
- apps/web/src/components/ShelfDrawer.test.tsx (modified — 3 additional tests for empty state)
