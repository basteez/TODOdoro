import type { DomainEvent } from '../events.js';

export interface ShelfItem {
  readonly id: string;
  readonly title: string;
  readonly pomodoroCount: number;
  readonly sealedAt: number | null;
  readonly releasedAt: number | null;
  readonly releaseReason: 'completed_its_purpose' | 'was_never_truly_mine' | null;
  readonly lifecycleStatus: 'sealed' | 'released';
}

/**
 * Internal projection state. Bookkeeping maps track todo titles, pomodoro
 * counts, and pending session→todo attribution so the projection can
 * populate ShelfItem fields at seal/release time and increment counts
 * on SessionCompleted. UI consumers should use `ShelfView` (just the items array).
 */
export interface ShelfState {
  readonly items: ReadonlyArray<ShelfItem>;
  readonly todoTitles: ReadonlyMap<string, string>; // todoId → current title
  readonly todoPomodoroCount: ReadonlyMap<string, number>; // todoId → count
  readonly pendingSessions: ReadonlyMap<string, string>; // sessionId → todoId
}

/** Consumer-facing view — only the shelf items array, no internal bookkeeping. */
export type ShelfView = ShelfState['items'];

export type ShelfReadModel = ShelfState;

export const INITIAL_SHELF_STATE: ShelfReadModel = {
  items: [],
  todoTitles: new Map(),
  todoPomodoroCount: new Map(),
  pendingSessions: new Map(),
};

export function projectShelf(
  state: ShelfReadModel,
  event: DomainEvent,
): ShelfReadModel {
  switch (event.eventType) {
    case 'TodoDeclared':
      return {
        ...state,
        todoTitles: new Map(state.todoTitles).set(event.aggregateId, event.title),
      };

    case 'TodoRenamed':
      return {
        ...state,
        todoTitles: new Map(state.todoTitles).set(event.aggregateId, event.title),
      };

    case 'TodoSealed':
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: event.aggregateId,
            title: state.todoTitles.get(event.aggregateId) ?? '',
            pomodoroCount: state.todoPomodoroCount.get(event.aggregateId) ?? 0,
            sealedAt: event.timestamp,
            releasedAt: null,
            releaseReason: null,
            lifecycleStatus: 'sealed',
          },
        ],
      };

    case 'TodoReleased':
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: event.aggregateId,
            title: state.todoTitles.get(event.aggregateId) ?? '',
            pomodoroCount: state.todoPomodoroCount.get(event.aggregateId) ?? 0,
            sealedAt: null,
            releasedAt: event.timestamp,
            releaseReason: event.releaseReason,
            lifecycleStatus: 'released',
          },
        ],
      };

    case 'SessionStarted': {
      if (event.todoId === null) return state;
      return {
        ...state,
        pendingSessions: new Map(state.pendingSessions).set(
          event.aggregateId,
          event.todoId,
        ),
      };
    }

    case 'SessionCompleted': {
      const todoId = state.pendingSessions.get(event.aggregateId);
      if (todoId === undefined) {
        return state;
      }

      const newPending = new Map(state.pendingSessions);
      newPending.delete(event.aggregateId);

      // Update any already-shelved item directly
      const hasShelfItem = state.items.some((item) => item.id === todoId);
      if (hasShelfItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === todoId
              ? { ...item, pomodoroCount: item.pomodoroCount + 1 }
              : item,
          ),
          pendingSessions: newPending,
        };
      }

      // Pre-shelf tracking: increment running count for future seal/release
      const currentCount = state.todoPomodoroCount.get(todoId) ?? 0;
      const newCounts = new Map(state.todoPomodoroCount).set(todoId, currentCount + 1);
      return {
        ...state,
        todoPomodoroCount: newCounts,
        pendingSessions: newPending,
      };
    }

    case 'SessionAbandoned': {
      if (!state.pendingSessions.has(event.aggregateId)) return state;
      const newPending = new Map(state.pendingSessions);
      newPending.delete(event.aggregateId);
      return { ...state, pendingSessions: newPending };
    }

    default:
      return state;
  }
}
