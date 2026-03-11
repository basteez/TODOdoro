import type { DomainEvent } from '../events.js';

export interface TodoListItem {
  readonly id: string;
  readonly title: string;
  readonly position: { readonly x: number; readonly y: number };
  readonly pomodoroCount: number;
  readonly status: 'active';
}

/**
 * Internal projection state. The `pendingSessions` map correlates
 * `SessionStarted` → `SessionCompleted` events so the projection can
 * attribute pomodoro completions to the correct todo item.
 * UI consumers should use `TodoListView` (just the items array).
 */
export interface TodoListState {
  readonly items: ReadonlyArray<TodoListItem>;
  readonly pendingSessions: ReadonlyMap<string, string>; // sessionId → todoId
}

/** Consumer-facing view — only the items array, no internal bookkeeping. */
export type TodoListView = TodoListState['items'];

export type TodoListReadModel = TodoListState;

export const INITIAL_TODO_LIST_STATE: TodoListReadModel = {
  items: [],
  pendingSessions: new Map(),
};

export function projectTodoList(
  state: TodoListReadModel,
  event: DomainEvent,
): TodoListReadModel {
  switch (event.eventType) {
    case 'TodoDeclared':
      return {
        ...state,
        items: [
          ...state.items,
          {
            id: event.aggregateId,
            title: event.title,
            position: { x: 0, y: 0 },
            pomodoroCount: 0,
            status: 'active',
          },
        ],
      };

    case 'TodoRenamed':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === event.aggregateId ? { ...item, title: event.title } : item,
        ),
      };

    case 'TodoPositioned':
      return {
        ...state,
        items: state.items.map((item) =>
          item.id === event.aggregateId
            ? { ...item, position: { x: event.x, y: event.y } }
            : item,
        ),
      };

    case 'TodoSealed':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== event.aggregateId),
      };

    case 'TodoReleased':
      return {
        ...state,
        items: state.items.filter((item) => item.id !== event.aggregateId),
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
      if (!state.items.some((item) => item.id === todoId)) {
        return { ...state, pendingSessions: newPending };
      }
      return {
        items: state.items.map((item) =>
          item.id === todoId
            ? { ...item, pomodoroCount: item.pomodoroCount + 1 }
            : item,
        ),
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
