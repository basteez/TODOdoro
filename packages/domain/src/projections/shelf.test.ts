import { describe, it, expect } from 'vitest';
import {
  INITIAL_SHELF_STATE,
  projectShelf,
} from './shelf.js';
import type { ShelfReadModel } from './shelf.js';
import { CURRENT_SCHEMA_VERSION } from '../events.js';
import { DUMMY_SNAPSHOT_STATE } from '../testUtils.js';
import type {
  TodoDeclaredEvent,
  TodoRenamedEvent,
  TodoSealedEvent,
  TodoReleasedEvent,
  SessionStartedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
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

function makeTodoSealed(
  aggregateId = 'todo-1',
  timestamp = BASE_TIMESTAMP + 3000,
): TodoSealedEvent {
  return {
    eventType: 'TodoSealed',
    eventId: 'evt-seal',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp,
  };
}

function makeTodoReleased(
  aggregateId = 'todo-1',
  releaseReason: 'completed_its_purpose' | 'was_never_truly_mine' = 'completed_its_purpose',
  timestamp = BASE_TIMESTAMP + 3000,
): TodoReleasedEvent {
  return {
    eventType: 'TodoReleased',
    eventId: 'evt-release',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp,
    releaseReason,
  };
}

function makeSessionStarted(
  aggregateId = 'session-1',
  todoId: string | null = 'todo-1',
): SessionStartedEvent {
  return {
    eventType: 'SessionStarted',
    eventId: `evt-start-${aggregateId}`,
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
    eventId: `evt-complete-${aggregateId}`,
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
    eventId: `evt-abandon-${aggregateId}`,
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 5000,
    elapsedMs: 30_000,
  };
}

function makeSnapshotCreated(): SnapshotCreatedEvent {
  return {
    eventType: 'SnapshotCreated',
    eventId: 'evt-snap',
    aggregateId: 'system',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 6000,
    snapshotState: DUMMY_SNAPSHOT_STATE,
  };
}

function applyEvents(
  events: Parameters<typeof projectShelf>[1][],
  initial: ShelfReadModel = INITIAL_SHELF_STATE,
): ShelfReadModel {
  return events.reduce(projectShelf, initial);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('projectShelf', () => {
  describe('INITIAL_SHELF_STATE', () => {
    it('starts with empty items and bookkeeping maps', () => {
      expect(INITIAL_SHELF_STATE.items).toEqual([]);
      expect(INITIAL_SHELF_STATE.todoTitles.size).toBe(0);
      expect(INITIAL_SHELF_STATE.todoPomodoroCount.size).toBe(0);
      expect(INITIAL_SHELF_STATE.pendingSessions.size).toBe(0);
    });
  });

  describe('TodoDeclared', () => {
    it('tracks title for later shelving', () => {
      const state = projectShelf(INITIAL_SHELF_STATE, makeTodoDeclared('todo-1', 'My task'));
      expect(state.todoTitles.get('todo-1')).toBe('My task');
      expect(state.items).toHaveLength(0);
    });
  });

  describe('TodoRenamed', () => {
    it('updates tracked title', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'Old'),
        makeTodoRenamed('todo-1', 'New'),
      ]);
      expect(state.todoTitles.get('todo-1')).toBe('New');
    });
  });

  describe('TodoSealed', () => {
    it('adds sealed item to shelf with correct fields', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'Buy milk'),
        makeTodoSealed('todo-1', BASE_TIMESTAMP + 3000),
      ]);
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual({
        id: 'todo-1',
        title: 'Buy milk',
        pomodoroCount: 0,
        sealedAt: BASE_TIMESTAMP + 3000,
        releasedAt: null,
        releaseReason: null,
        lifecycleStatus: 'sealed',
      });
    });

    it('preserves pomodoroCount accumulated before sealing', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'Buy milk'),
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
        makeTodoSealed('todo-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(1);
    });
  });

  describe('TodoReleased', () => {
    it('adds released item with completed_its_purpose', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'Buy milk'),
        makeTodoReleased('todo-1', 'completed_its_purpose', BASE_TIMESTAMP + 3000),
      ]);
      expect(state.items).toHaveLength(1);
      expect(state.items[0]).toEqual({
        id: 'todo-1',
        title: 'Buy milk',
        pomodoroCount: 0,
        sealedAt: null,
        releasedAt: BASE_TIMESTAMP + 3000,
        releaseReason: 'completed_its_purpose',
        lifecycleStatus: 'released',
      });
    });

    it('adds released item with was_never_truly_mine', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'Buy milk'),
        makeTodoReleased('todo-1', 'was_never_truly_mine'),
      ]);
      expect(state.items[0]!.releaseReason).toBe('was_never_truly_mine');
      expect(state.items[0]!.lifecycleStatus).toBe('released');
    });
  });

  describe('SessionCompleted on already-shelved item', () => {
    it('increments pomodoroCount on shelf item', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'Buy milk'),
        makeTodoSealed('todo-1'),
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(1);
    });
  });

  describe('SessionStarted with null todoId', () => {
    it('does not track exploration sessions', () => {
      const state = projectShelf(INITIAL_SHELF_STATE, makeSessionStarted('session-1', null));
      expect(state).toBe(INITIAL_SHELF_STATE);
    });
  });

  describe('SessionCompleted with no pending', () => {
    it('handles orphaned session completion gracefully', () => {
      const state = projectShelf(INITIAL_SHELF_STATE, makeSessionCompleted('unknown'));
      expect(state.items).toHaveLength(0);
    });
  });

  describe('SessionAbandoned', () => {
    it('removes pending session without affecting shelf', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionAbandoned('session-1'),
      ]);
      expect(state.pendingSessions.size).toBe(0);
      expect(state.items).toHaveLength(0);
    });

    it('returns same reference when session is not in pending', () => {
      const state = projectShelf(INITIAL_SHELF_STATE, makeSessionAbandoned('unknown'));
      expect(state).toBe(INITIAL_SHELF_STATE);
    });
  });

  describe('TodoSealed without prior TodoDeclared', () => {
    it('falls back to empty title and zero pomodoroCount', () => {
      const state = projectShelf(INITIAL_SHELF_STATE, makeTodoSealed('unknown-todo'));
      expect(state.items[0]!.title).toBe('');
      expect(state.items[0]!.pomodoroCount).toBe(0);
    });
  });

  describe('TodoReleased without prior TodoDeclared', () => {
    it('falls back to empty title and zero pomodoroCount', () => {
      const state = projectShelf(INITIAL_SHELF_STATE, makeTodoReleased('unknown-todo'));
      expect(state.items[0]!.title).toBe('');
      expect(state.items[0]!.pomodoroCount).toBe(0);
    });
  });

  describe('SessionCompleted with multiple shelf items', () => {
    it('only increments matching item, leaves others unchanged', () => {
      const state = applyEvents([
        makeTodoDeclared('todo-1', 'First'),
        makeTodoDeclared('todo-2', 'Second'),
        makeTodoSealed('todo-1'),
        makeTodoSealed('todo-2'),
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
      ]);
      expect(state.items[0]!.pomodoroCount).toBe(1);
      expect(state.items[1]!.pomodoroCount).toBe(0);
    });
  });

  describe('default (unhandled events)', () => {
    it('returns state unchanged for SnapshotCreated', () => {
      const initial = applyEvents([makeTodoDeclared('todo-1')]);
      const state = projectShelf(initial, makeSnapshotCreated());
      expect(state).toBe(initial);
    });
  });
});
