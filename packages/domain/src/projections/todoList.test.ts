import { describe, it, expect } from 'vitest';
import {
  INITIAL_TODO_LIST_STATE,
  projectTodoList,
} from './todoList.js';
import type { TodoListReadModel } from './todoList.js';
import { CURRENT_SCHEMA_VERSION } from '../events.js';
import { DUMMY_SNAPSHOT_STATE } from '../testUtils.js';
import type {
  TodoDeclaredEvent,
  TodoRenamedEvent,
  TodoPositionedEvent,
  TodoSealedEvent,
  TodoReleasedEvent,
  SessionStartedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
  SessionAttributedEvent,
  SnapshotCreatedEvent,
} from '../events.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const BASE_TIMESTAMP = 1_000_000;

function makeTodoDeclared(
  aggregateId = 'todo-1',
  title = 'Buy milk',
): TodoDeclaredEvent {
  return {
    eventType: 'TodoDeclared',
    eventId: 'evt-1',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP,
    title,
  };
}

function makeTodoRenamed(
  aggregateId = 'todo-1',
  title = 'Buy oat milk',
): TodoRenamedEvent {
  return {
    eventType: 'TodoRenamed',
    eventId: 'evt-2',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 1000,
    title,
  };
}

function makeTodoPositioned(
  aggregateId = 'todo-1',
  x = 100,
  y = 200,
): TodoPositionedEvent {
  return {
    eventType: 'TodoPositioned',
    eventId: 'evt-3',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 2000,
    x,
    y,
  };
}

function makeTodoSealed(aggregateId = 'todo-1'): TodoSealedEvent {
  return {
    eventType: 'TodoSealed',
    eventId: 'evt-4',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 3000,
  };
}

function makeTodoReleased(
  aggregateId = 'todo-1',
  releaseReason: 'completed_its_purpose' | 'was_never_truly_mine' = 'completed_its_purpose',
): TodoReleasedEvent {
  return {
    eventType: 'TodoReleased',
    eventId: 'evt-5',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 3000,
    releaseReason,
  };
}

function makeSessionStarted(
  aggregateId = 'session-1',
  todoId: string | null = 'todo-1',
): SessionStartedEvent {
  return {
    eventType: 'SessionStarted',
    eventId: 'evt-6',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 4000,
    todoId,
    configuredDurationMs: 25 * 60 * 1000,
  };
}

function makeSessionCompleted(
  aggregateId = 'session-1',
): SessionCompletedEvent {
  return {
    eventType: 'SessionCompleted',
    eventId: 'evt-7',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 5000,
    elapsedMs: 25 * 60 * 1000,
  };
}

function makeSessionAbandoned(
  aggregateId = 'session-1',
): SessionAbandonedEvent {
  return {
    eventType: 'SessionAbandoned',
    eventId: 'evt-8',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 5000,
    elapsedMs: 30_000,
  };
}

function makeSnapshotCreated(): SnapshotCreatedEvent {
  return {
    eventType: 'SnapshotCreated',
    eventId: 'evt-9',
    aggregateId: 'system',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 6000,
    snapshotState: DUMMY_SNAPSHOT_STATE,
  };
}

/** Helper: apply a sequence of events to build up state */
function applyEvents(
  events: Parameters<typeof projectTodoList>[1][],
  initial: TodoListReadModel = INITIAL_TODO_LIST_STATE,
): TodoListReadModel {
  return events.reduce(projectTodoList, initial);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('projectTodoList', () => {
  describe('INITIAL_TODO_LIST_STATE', () => {
    it('starts with empty items and no pending sessions', () => {
      expect(INITIAL_TODO_LIST_STATE.items).toEqual([]);
      expect(INITIAL_TODO_LIST_STATE.pendingSessions.size).toBe(0);
    });
  });

  describe('TodoDeclared', () => {
    it('adds item with correct initial state', () => {
      const state = projectTodoList(INITIAL_TODO_LIST_STATE, makeTodoDeclared());
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual({
        id: 'todo-1',
        title: 'Buy milk',
        position: { x: 0, y: 0 },
        pomodoroCount: 0,
        status: 'active',
      });
    });

    it('adds multiple items', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'First'),
        makeTodoDeclared('todo-2', 'Second'),
      ]);
      expect(state.items).toHaveLength(2);
      expect(state.items[0]!.id).toBe('todo-1');
      expect(state.items[1]!.id).toBe('todo-2');
    });
  });

  describe('TodoRenamed', () => {
    it('updates title of matching item', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'Old title'),
        makeTodoRenamed('todo-1', 'New title'),
      ]);
      expect(state.items[0]!.title).toBe('New title');
    });

    it('ignores non-matching items', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'First'),
        makeTodoDeclared('todo-2', 'Second'),
        makeTodoRenamed('todo-1', 'Updated First'),
      ]);
      expect(state.items[0]!.title).toBe('Updated First');
      expect(state.items[1]!.title).toBe('Second');
    });
  });

  describe('TodoPositioned', () => {
    it('updates position of matching item', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeTodoPositioned('todo-1', 50, 75),
      ]);
      expect(state.items[0]!.position).toEqual({ x: 50, y: 75 });
    });

    it('leaves non-matching items unchanged', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeTodoDeclared('todo-2'),
        makeTodoPositioned('todo-1', 50, 75),
      ]);
      expect(state.items[1]!.position).toEqual({ x: 0, y: 0 });
    });
  });

  describe('TodoSealed', () => {
    it('removes item from list', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeTodoSealed('todo-1'),
      ]);
      expect(state.items).toHaveLength(0);
    });

    it('only removes the matching item', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeTodoDeclared('todo-2'),
        makeTodoSealed('todo-1'),
      ]);
      expect(state.items).toHaveLength(1);
      expect(state.items[0]!.id).toBe('todo-2');
    });
  });

  describe('TodoReleased', () => {
    it('removes item from list', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeTodoReleased('todo-1'),
      ]);
      expect(state.items).toHaveLength(0);
    });
  });

  describe('SessionCompleted — pomodoroCount', () => {
    it('increments pomodoroCount on linked todo', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(1);
    });

    it('increments multiple times for multiple sessions', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
        makeSessionStarted('session-2', 'todo-1'),
        makeSessionCompleted('session-2'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(2);
    });

    it('does not change items for exploration session (todoId: null)', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionStarted('session-1', null),
        makeSessionCompleted('session-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(0);
    });

    it('handles SessionCompleted with unknown session (no pending)', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionCompleted('unknown-session'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(0);
    });

    it('only increments matching item when multiple items exist', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeTodoDeclared('todo-2'),
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(1);
      expect(state.items[1]!.pomodoroCount).toBe(0);
    });

    it('does not increment if linked todo no longer exists in items', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionStarted('session-1', 'todo-1'),
        makeTodoSealed('todo-1'),
        makeSessionCompleted('session-1'),
      ]);
      expect(state.items).toHaveLength(0);
    });
  });

  describe('SessionAbandoned', () => {
    it('removes pending session without affecting items', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionAbandoned('session-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(0);
      expect(state.pendingSessions.size).toBe(0);
    });

    it('returns same reference when session is not in pending', () => {
      const initial = applyEvents([makeTodoDeclared('todo-1')]);
      const state = projectTodoList(initial, makeSessionAbandoned('unknown'));
      expect(state).toBe(initial);
    });
  });

  describe('SessionAttributed', () => {
    function makeSessionAttributed(
      aggregateId: string,
      todoId: string,
    ): SessionAttributedEvent {
      return {
        eventType: 'SessionAttributed',
        eventId: `evt-attr-${aggregateId}`,
        aggregateId,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: BASE_TIMESTAMP + 30 * 60 * 1000,
        todoId,
      };
    }

    it('increments pomodoroCount on target todo', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionStarted('session-1', null),
        makeSessionCompleted('session-1'),
        makeSessionAttributed('session-1', 'todo-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(1);
    });

    it('ignores attribution for non-existent todo', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionAttributed('session-1', 'non-existent'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(0);
    });

    it('stacks with existing pomodoro count', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1'),
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
        makeSessionStarted('session-2', null),
        makeSessionCompleted('session-2'),
        makeSessionAttributed('session-2', 'todo-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(2);
    });
  });

  describe('default (unhandled events)', () => {
    it('returns state unchanged for SnapshotCreated', () => {
      const initial = applyEvents([makeTodoDeclared('todo-1')]);
      const state = projectTodoList(initial, makeSnapshotCreated());
      expect(state).toBe(initial);
    });
  });
});
