# Story 4.4: Completion Moment on Todo Seal

Status: ready-for-dev

## Story

As a user,
I want to see a brief dignified summary when I seal a todo,
So that the act of declaring something complete is honoured as a ceremony, not processed as a checkbox.

## Acceptance Criteria

1. **Given** a todo card has accumulated one or more Pomodoros and the user initiates a seal **When** `handleSealTodo` writes a `TodoSealedEvent` **Then** the `CompletionMoment` overlay renders: Radix Dialog without backdrop, showing the todo title, total Pomodoro count, and approximate time span (e.g. "Chapter 4 — 23 Pomodoros across 18 days")
2. **Given** the CompletionMoment overlay for a seal is shown **Then** the overlay auto-dismisses after ~3 seconds or on any user interaction
3. **Given** the CompletionMoment overlay for a seal **Then** copy is declarative and past-tense — no congratulatory language; 1–2 lines maximum
4. **Given** `prefers-reduced-motion: reduce` is set **When** a todo is sealed **Then** the overlay appears and dismisses instantly (no fade animation)
5. **Given** the CompletionMoment has completed (or immediately if reduced-motion) **Then** the card is removed from the canvas

## Tasks / Subtasks

- [ ] Task 1: Create `handleSealTodo` command handler (AC: #1, #5)
  - [ ] 1.1 Add to `apps/web/src/commands/todoCommands.ts`:
    ```typescript
    export async function handleSealTodo(
      todoId: string,
      eventStore: EventStore,
      clock: Clock,
      idGenerator: IdGenerator,
    ): Promise<Result> {
      const events = await eventStore.readByAggregate(todoId);
      const state = events.reduce(reduceTodo, INITIAL_TODO_STATE);
      const event = sealTodo(state, clock, idGenerator);
      if (event instanceof Error) return { ok: false, error: event.message };
      await eventStore.append(event);
      useCanvasStore.getState().applyEvent(event);
      return { ok: true };
    }
    ```
  - [ ] 1.2 Import `sealTodo` from `@tododoro/domain` (already exported)
  - [ ] 1.3 Follow exact same pattern as `handleRenameTodo` and `handlePositionTodo`

- [ ] Task 2: Add "Seal" action to TodoCard dropdown menu (AC: #1)
  - [ ] 2.1 Add `onSeal` callback to `TodoCardData` interface in `packages/ui/src/components/TodoCard.tsx`:
    ```typescript
    onSeal?: (todoId: string) => void;
    ```
  - [ ] 2.2 Add "Seal" item to the existing `DropdownMenu.Content` (after "Rename"):
    ```tsx
    <DropdownMenu.Item style={dropdownItemStyle} onSelect={() => onSeal?.(todoId)}>
      Seal
    </DropdownMenu.Item>
    ```
  - [ ] 2.3 Style: same `dropdownItemStyle` as "Rename" — no special colour, no icon
  - [ ] 2.4 Only show "Seal" when `sessionsCount > 0` (cannot seal a todo with zero investment)

- [ ] Task 3: Compute time span for CompletionMoment display (AC: #1, #3)
  - [ ] 3.1 Create helper function in `packages/ui/src/components/DevotionRecord.tsx` or a shared util:
    ```typescript
    function computeTimeSpan(sessions: ReadonlyArray<{ startedAt: number }>): string {
      if (sessions.length === 0) return '';
      const firstDate = new Date(sessions[0].startedAt);
      const lastDate = new Date(sessions[sessions.length - 1].startedAt);
      const diffDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      if (diffDays <= 1) return '1 day';
      return `${diffDays} days`;
    }
    ```
  - [ ] 3.2 Export this utility so it can be used by both DevotionRecord and the seal CompletionMoment

- [ ] Task 4: Enhance CompletionMoment for seal variant (AC: #1, #2, #3, #4)
  - [ ] 4.1 The existing `CompletionMoment` already handles session completion. For seal, the display differs:
    - Session completion: "[Todo title] — N Pomodoros added"
    - **Seal**: "[Todo title] — N Pomodoros across D days"
  - [ ] 4.2 Option A (recommended): Add a `variant` prop to CompletionMoment:
    ```typescript
    interface CompletionMomentProps {
      todoTitle: string | null;
      pomodoroCount: number;
      open: boolean;
      onDismiss: () => void;
      onAttach?: (() => void) | undefined;
      variant?: 'session' | 'seal';   // NEW
      timeSpan?: string;               // NEW: e.g. "18 days"
    }
    ```
  - [ ] 4.3 When `variant === 'seal'`: display "[todoTitle] — N Pomodoros across [timeSpan]"
  - [ ] 4.4 Seal variant uses same auto-dismiss (3s), same any-keypress dismiss, same click-anywhere dismiss — identical behaviour to session completion
  - [ ] 4.5 `prefers-reduced-motion`: already handled if CSS transitions are used; verify fade-in/out respects the media query. Currently CompletionMoment has no CSS transitions — appears/disappears instantly already. AC #4 is satisfied by default.

- [ ] Task 5: Wire seal flow in App.tsx (AC: #1, #2, #5)
  - [ ] 5.1 Import `handleSealTodo` in `apps/web/src/App.tsx`
  - [ ] 5.2 Create `onSealCallback`:
    ```typescript
    const onSealCallback = useCallback(async (todoId: string) => {
      const todo = todos.items.find((t) => t.id === todoId);
      if (!todo) return;
      const devotionRecord = useCanvasStore.getState().devotionRecord;
      const record = devotionRecord.records.get(todoId);
      const sessions = record?.sessions ?? [];
      const timeSpan = computeTimeSpan(sessions);
      const result = await handleSealTodo(todoId, eventStore, clock, idGenerator);
      if (result.ok) {
        setCompletionInfo({
          todoTitle: todo.title,
          pomodoroCount: todo.pomodoroCount,
          sessionId: null,
          variant: 'seal',
          timeSpan,
        });
      }
    }, [todos.items]);
    ```
  - [ ] 5.3 Update `completionInfo` state type to include `variant` and `timeSpan`:
    ```typescript
    { todoTitle: string | null; pomodoroCount: number; sessionId: string | null; variant?: 'session' | 'seal'; timeSpan?: string }
    ```
  - [ ] 5.4 Pass `onSeal={onSealCallback}` to each TodoCard node data in the mapping (lines 218-244)
  - [ ] 5.5 Pass `variant` and `timeSpan` to CompletionMoment:
    ```tsx
    <CompletionMoment
      todoTitle={completionInfo.todoTitle}
      pomodoroCount={completionInfo.pomodoroCount}
      open={true}
      onDismiss={() => setCompletionInfo(null)}
      onAttach={completionInfo.sessionId ? onAttachExplorationSession : undefined}
      variant={completionInfo.variant ?? 'session'}
      timeSpan={completionInfo.timeSpan}
    />
    ```
  - [ ] 5.6 Card removal: after `handleSealTodo` succeeds, the `TodoSealedEvent` is applied via `useCanvasStore.applyEvent()` which calls `projectTodoList`. The `reduceTodo` function transitions the todo to `status: 'sealed'`, and `projectTodoList` removes sealed todos from `items[]`. The card disappears from the canvas automatically. **No additional removal code needed.**

- [ ] Task 6: Tests (AC: #1, #2, #3, #4, #5)
  - [ ] 6.1 Add `handleSealTodo` tests in `apps/web/src/commands/todoCommands.test.ts` (create if needed):
    - Test: successfully seals an active todo
    - Test: returns error when sealing a non-active todo
    - Test: updates canvas store — todo removed from items
    - Test: updates shelf store — todo appears in shelf items
  - [ ] 6.2 Update `CompletionMoment.test.tsx`:
    - Test: seal variant displays "[title] — N Pomodoros across D days"
    - Test: seal variant auto-dismisses after 3s
    - Test: seal variant dismisses on keypress
  - [ ] 6.3 Update `TodoCard.test.tsx`:
    - Test: "Seal" menu item appears when sessionsCount > 0
    - Test: "Seal" menu item hidden when sessionsCount === 0
    - Test: onSeal callback called with todoId when "Seal" selected
  - [ ] 6.4 Run full test suite: `turbo typecheck && turbo test && turbo build`

## Dev Notes

### Architecture Compliance

- `sealTodo()` domain function already implemented in `packages/domain/src/todo.ts:131-146`
- Returns `TodoSealedEvent | Error` — follows `Event | Error` pattern (D8)
- `reduceTodo` transitions `active → sealed` on `TodoSealedEvent`
- `projectTodoList` removes sealed todos from `items[]` — card disappears automatically
- `projectShelf` adds sealed todos to shelf with full history
- `projectDevotionRecord` is unaffected by `TodoSealedEvent` (falls through to default)
- [Source: architecture.md#D8 — Error Handling: domain errors returned as values]
- [Source: architecture.md#D7 — Command handler pattern: read → reduce → decide → append → applyEvent]

### Domain Layer (Already Implemented)

- `sealTodo(state: TodoState, clock: Clock, idGenerator: IdGenerator): TodoSealedEvent | Error`
  - Guard: `state.status !== 'active'` → Error
  - Returns: `{ eventType: 'TodoSealed', eventId, aggregateId: state.todoId, schemaVersion, timestamp }`
- `reduceTodo`: `TodoSealed` → `{ status: 'sealed', todoId, title }`
- `projectTodoList`: `TodoSealed` → filters todo out of `items[]`
- `projectShelf`: `TodoSealed` → adds to shelf `items[]` with `{ id, title, pomodoroCount, badge: 'sealed', sealedAt }`

### Existing Patterns to Reuse

- **Command handler**: `handleRenameTodo` in `apps/web/src/commands/todoCommands.ts` is the exact template — read by aggregate → reduce → decide → append → applyEvent
- **CompletionMoment**: Already exists with session variant. Extend with `variant` prop rather than creating a new component
- **DropdownMenu items**: "Rename" item in TodoCard is the template for adding "Seal"

### Key Technical Details

- The card removal is automatic via projection: `TodoSealedEvent` → `projectTodoList` removes from `items[]` → React Flow node list updates → card disappears. No manual DOM removal needed.
- Time span computation uses the DevotionRecord sessions (from `useCanvasStore.devotionRecord`), NOT the event store. Read this data before sealing, because after seal the todo is removed from `todos.items`.
- Copy tone: "Chapter 4 — 23 Pomodoros across 18 days" — declarative, past-tense, no congratulatory language
- `prefers-reduced-motion`: CompletionMoment currently has no CSS animations (appears/disappears via React state). AC #4 is satisfied by default — no additional work unless CSS transitions are added.
- Session active guard: do NOT allow sealing while a session is active for that todo. Check `isSessionActive && activeTodoId === todoId` in `onSealCallback` and skip the seal.

### Project Structure Notes

```
apps/web/src/commands/
  todoCommands.ts             ← MODIFY: add handleSealTodo
packages/ui/src/components/
  TodoCard.tsx                ← MODIFY: add "Seal" menu item + onSeal prop
  CompletionMoment.tsx        ← MODIFY: add variant/timeSpan props for seal display
apps/web/src/
  App.tsx                     ← MODIFY: wire onSealCallback, update completionInfo state
apps/web/src/commands/
  todoCommands.test.ts        ← NEW or MODIFY: handleSealTodo tests
apps/web/src/components/
  CompletionMoment.test.tsx   ← MODIFY: seal variant tests
  TodoCard.test.tsx           ← MODIFY: seal menu item tests
```

### References

- [Source: epics.md#Story 4.4 — acceptance criteria]
- [Source: ux-design-specification.md#Component Strategy — CompletionMoment: "Radix Dialog without overlay dimming, auto-dismisses ~3s"]
- [Source: ux-design-specification.md#UX Consistency Patterns — Copy Tone: "Declarative, past-tense, no congratulatory language"]
- [Source: ux-design-specification.md#Motion Principles — CompletionMoment fade durations]
- [Source: packages/domain/src/todo.ts:131-146 — sealTodo function]
- [Source: packages/domain/src/projections/todoList.ts — TodoSealed removes from items]
- [Source: packages/domain/src/projections/shelf.ts — TodoSealed adds to shelf]
- [Source: apps/web/src/commands/todoCommands.ts — command handler pattern template]
- [Source: packages/ui/src/components/CompletionMoment.tsx — existing session completion UI]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
