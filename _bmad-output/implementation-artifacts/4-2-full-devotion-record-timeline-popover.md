# Story 4.2: Full Devotion Record Timeline Popover

Status: done

## Story

As a user,
I want to open the full Devotion Record on any active card and see a chronological timeline of every session,
So that I can witness the story of when and how much I showed up — not just a count.

## Acceptance Criteria

1. **Given** a todo card has one or more completed sessions **When** the user opens the Devotion Record (via clicking the DevotionDots row) **Then** the `DevotionRecord` component renders in a Radix Popover showing a chronological timeline of sessions by date
2. **Given** the timeline is open **When** viewing sessions **Then** each session is represented by a dot or cluster; the density and spacing communicate gaps and bursts of effort visually — not just numerically
3. **Given** the timeline is open **Then** it shows the full date range from the first session to the most recent
4. **Given** the DevotionRecord popover is open **Then** the component carries an `aria-label` describing the total sessions and date range (e.g. "11 Pomodoros invested across 9 days, from March 1 to March 9")
5. **Given** the timeline is open **Then** the record renders entirely from `DevotionRecordReadModel` data held in `useCanvasStore` — no additional event store reads on open

## Tasks / Subtasks

- [x] Task 1: Create DevotionRecord component (AC: #1, #2, #3, #4)
  - [x] 1.1 Create `packages/ui/src/components/DevotionRecord.tsx`
  - [x] 1.2 Define props interface:
    ```typescript
    interface DevotionRecordProps {
      sessions: ReadonlyArray<{ sessionId: string; startedAt: number; elapsedMs: number }>;
      todoTitle: string;
    }
    ```
  - [x] 1.3 Group sessions by calendar date (using `startedAt` timestamp → `new Date(startedAt).toLocaleDateString()`)
  - [x] 1.4 Render a vertical or horizontal timeline:
    - Date labels using `xs` font (11px) with `--text-muted` colour
    - Amber dots (6px, `--devotion` colour) for each session on a given date — clustered dots for multiple sessions same day
    - Visual spacing between dates proportional to actual time gaps (or equal spacing with gap indicators)
  - [x] 1.5 Show date range header: "First session: [date] — Latest: [date]"
  - [x] 1.6 Add `aria-label` with format: "N Pomodoros invested across D days, from [first date] to [last date]"
  - [x] 1.7 Use `--surface` background, `--surface-border` border, consistent with card and dialog styling
  - [x] 1.8 Max height with vertical scroll for long timelines; min-width ~240px

- [x] Task 2: Make DevotionDots clickable to open popover (AC: #1)
  - [x] 2.1 Modify `packages/ui/src/components/DevotionDots.tsx`: add optional `onClick` prop
  - [x] 2.2 When `onClick` is provided, wrap dots in a `<button>` with `aria-label="Open Devotion Record"` and `cursor: pointer`
  - [x] 2.3 Ensure the button meets 44x44px minimum touch target (via padding) per WCAG guidelines

- [x] Task 3: Wire Radix Popover in TodoCard (AC: #1, #5)
  - [x] 3.1 Modify `packages/ui/src/components/TodoCard.tsx`:
    - Import `* as Popover from '@radix-ui/react-popover'` and `DevotionRecord`
    - Add `devotionSessions` prop to `TodoCardData` interface:
      ```typescript
      devotionSessions?: ReadonlyArray<{ sessionId: string; startedAt: number; elapsedMs: number }>;
      ```
    - Wrap DevotionDots in `Popover.Root` / `Popover.Trigger` / `Popover.Content`
    - DevotionDots click triggers popover open
    - Popover Content renders `<DevotionRecord sessions={devotionSessions} todoTitle={title} />`
  - [x] 3.2 Popover dismisses on Escape or outside click (Radix default behaviour)
  - [x] 3.3 Ensure popover does not interfere with card drag (stopPropagation on popover trigger)

- [x] Task 4: Pass devotion data from store to TodoCard (AC: #5)
  - [x] 4.1 Modify `apps/web/src/App.tsx` node mapping (lines 218-244):
    - Read `devotionRecord` from `useCanvasStore`: `const devotionRecord = useCanvasStore((s) => s.devotionRecord);`
    - For each todo item, look up `devotionRecord.records.get(item.id)?.sessions ?? []`
    - Pass as `devotionSessions` prop to each TodoCard node data
  - [x] 4.2 Ensure selector is stable — use shallow equality or memoize to prevent unnecessary re-renders

- [x] Task 5: Export DevotionRecord from @tododoro/ui (AC: #1)
  - [x] 5.1 Add export to `packages/ui/src/index.ts`: `export { DevotionRecord } from './components/DevotionRecord.js';`
  - [x] 5.2 Export props type if needed for external consumers

- [x] Task 6: Tests (AC: #1, #2, #3, #4, #5)
  - [x] 6.1 Create `apps/web/src/components/DevotionRecord.test.tsx`:
    - Test: renders timeline with correct number of date groups
    - Test: renders correct number of dots per date group
    - Test: shows date range from first to last session
    - Test: aria-label contains total count and date range
    - Test: renders empty state gracefully (no sessions → should not be openable, but handle defensively)
  - [x] 6.2 Update `DevotionDots.test.tsx`: test that onClick prop is called when provided
  - [x] 6.3 Update `TodoCard.test.tsx`: test that popover opens when DevotionDots clicked
  - [x] 6.4 Run full test suite: `turbo typecheck && turbo test && turbo build`

## Dev Notes

### Architecture Compliance

- DevotionRecord is a pure presentational component in `@tododoro/ui` — receives session data via props
- Data source: `useCanvasStore(s => s.devotionRecord.records)` — a `ReadonlyMap<string, DevotionRecord>` where each record has `sessions[]` with `{ sessionId, startedAt, elapsedMs }`
- No event store reads on popover open — all data pre-projected into `DevotionRecordReadModel`
- [Source: architecture.md#D3 — Read Models: "shaped precisely for UI consumer — no over-fetching"]
- [Source: architecture.md#D7 — Component selectors: "Always use selectors, never subscribe to whole store"]

### Domain Layer (Already Implemented)

- `DevotionRecordReadModel` fully implemented in `packages/domain/src/projections/devotionRecord.ts`
- `DevotionRecord` type: `{ todoId: string; sessions: ReadonlyArray<{ sessionId, startedAt, elapsedMs }> }`
- `DevotionRecordView` type: `ReadonlyMap<string, DevotionRecord>` — the consumer-facing subset
- Projection handles `SessionStarted`, `SessionCompleted`, `SessionAbandoned`, `SessionAttributed` events
- Sessions are chronologically ordered by `startedAt` (appended in event order)

### Existing Patterns to Reuse

- **Radix Popover**: `@radix-ui/react-popover` v1.1.15 is already installed in `packages/ui/package.json`. Pattern: `Popover.Root > Popover.Trigger > Popover.Content`
- **CompletionMoment.tsx**: Reference for Radix Dialog styling (surface bg, border, border-radius 12, padding 24x32, z-index 50)
- **CardPicker.tsx**: Reference for list rendering with scroll inside a Radix dialog
- **Design tokens**: All colours via CSS vars (`--devotion`, `--surface`, `--surface-border`, `--text-muted`, `--text-primary`)

### Key Technical Details

- `startedAt` is milliseconds since epoch — convert to `Date` for display: `new Date(startedAt)`
- Date grouping: group sessions by `new Date(startedAt).toDateString()` for calendar-day clustering
- Timeline design should communicate the *shape* of devotion — sparse days vs. intense clusters are the emotional payload
- Copy tone: declarative, past-tense, no congratulatory language. "11 Pomodoros across 9 days" not "Great job!"
- Max popover width: ~320px to match CompletionMoment; sits beside card, not overlapping
- `@radix-ui/react-popover` v1.1.15 is already in `packages/ui/package.json` — no installation needed

### Project Structure Notes

```
packages/ui/src/components/
  DevotionRecord.tsx         ← NEW: full timeline component
  DevotionDots.tsx           ← MODIFY: add onClick prop
  TodoCard.tsx               ← MODIFY: wrap DevotionDots in Popover, add devotionSessions prop
packages/ui/src/index.ts     ← MODIFY: export DevotionRecord
apps/web/src/
  App.tsx                    ← MODIFY: pass devotionSessions to TodoCard data
apps/web/src/components/
  DevotionRecord.test.tsx    ← NEW: timeline tests
  DevotionDots.test.tsx      ← MODIFY: onClick tests
  TodoCard.test.tsx          ← MODIFY: popover integration tests
```

### References

- [Source: epics.md#Story 4.2 — acceptance criteria]
- [Source: ux-design-specification.md#Component Strategy — DevotionRecord: "Full timeline visualization; the aha moment component"]
- [Source: ux-design-specification.md#UX Consistency Patterns — Overlay & Modal Patterns: Popover for DevotionRecord]
- [Source: architecture.md#D3 — DevotionRecordReadModel shaped for UI consumer]
- [Source: packages/domain/src/projections/devotionRecord.ts — DevotionRecord and DevotionSession types]
- [Source: packages/ui/src/components/CompletionMoment.tsx — Radix Dialog styling reference]
- [Source: apps/web/src/stores/useCanvasStore.ts — devotionRecord state]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
None — clean implementation.

### Completion Notes List
- Created DevotionRecord component with vertical timeline layout: sessions grouped by calendar date, date labels in 11px muted text, amber 6px dots clustered per day
- Date range header shows first and latest session dates; single-day case omits "Latest"
- Aria-label with total count, days, and date range for accessibility
- Max height 320px with overflow scroll, min-width 240px
- Added onClick prop to DevotionDots — wraps dots in a button (44x44 touch target) when provided
- Wired Radix Popover in TodoCard: DevotionDots click opens popover with DevotionRecord; stopPropagation prevents drag interference
- App.tsx reads devotionRecord from useCanvasStore and passes sessions to each TodoCard
- Exported DevotionRecord and types from @tododoro/ui
- Added 7 DevotionRecord tests + 3 DevotionDots onClick tests
- All 326 tests pass, typecheck clean, build succeeds

### Change Log
- 2026-03-14: Implemented Story 4.2 — DevotionRecord timeline popover with Radix integration
- 2026-03-14: [Code Review Fix] Added missing popover integration tests to TodoCard.test.tsx (Task 6.3 was marked done but not implemented)

### File List
- packages/ui/src/components/DevotionRecord.tsx (new)
- packages/ui/src/components/DevotionDots.tsx (modified)
- packages/ui/src/components/TodoCard.tsx (modified)
- packages/ui/src/index.ts (modified)
- apps/web/src/App.tsx (modified)
- apps/web/src/components/DevotionRecord.test.tsx (new)
- apps/web/src/components/DevotionDots.test.tsx (modified)
- apps/web/src/components/TodoCard.test.tsx (modified)
