import { describe, it, expect } from 'vitest';
import {
  INITIAL_ACTIVE_SESSION_STATE,
  projectActiveSession,
} from './activeSession.js';
import type { ActiveSessionReadModel } from './activeSession.js';
import { CURRENT_SCHEMA_VERSION } from '../events.js';
import type {
  SessionStartedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
  TodoDeclaredEvent,
  SnapshotCreatedEvent,
} from '../events.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const BASE_TIMESTAMP = 1_000_000;

function makeSessionStarted(
  aggregateId = 'session-1',
  todoId: string | null = 'todo-1',
): SessionStartedEvent {
  return {
    eventType: 'SessionStarted',
    eventId: `evt-start-${aggregateId}`,
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP,
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
    timestamp: BASE_TIMESTAMP + 25 * 60 * 1000,
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
    timestamp: BASE_TIMESTAMP + 30_000,
    elapsedMs: 30_000,
  };
}

function makeTodoDeclared(): TodoDeclaredEvent {
  return {
    eventType: 'TodoDeclared',
    eventId: 'evt-todo',
    aggregateId: 'todo-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP,
    title: 'Buy milk',
  };
}

function makeSnapshotCreated(): SnapshotCreatedEvent {
  return {
    eventType: 'SnapshotCreated',
    eventId: 'evt-snap',
    aggregateId: 'system',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 6000,
    snapshotState: {},
  };
}

function applyEvents(
  events: Parameters<typeof projectActiveSession>[1][],
  initial: ActiveSessionReadModel = INITIAL_ACTIVE_SESSION_STATE,
): ActiveSessionReadModel {
  return events.reduce(projectActiveSession, initial);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('projectActiveSession', () => {
  describe('INITIAL_ACTIVE_SESSION_STATE', () => {
    it('starts as idle', () => {
      expect(INITIAL_ACTIVE_SESSION_STATE).toEqual({ status: 'idle' });
    });
  });

  describe('SessionStarted', () => {
    it('transitions to active with all fields', () => {
      const state = projectActiveSession(
        INITIAL_ACTIVE_SESSION_STATE,
        makeSessionStarted('session-1', 'todo-1'),
      );
      expect(state).toEqual({
        status: 'active',
        sessionId: 'session-1',
        todoId: 'todo-1',
        startedAt: BASE_TIMESTAMP,
        configuredDurationMs: 25 * 60 * 1000,
      });
    });

    it('supports exploration session (todoId: null)', () => {
      const state = projectActiveSession(
        INITIAL_ACTIVE_SESSION_STATE,
        makeSessionStarted('session-1', null),
      );
      expect(state.status).toBe('active');
      if (state.status === 'active') {
        expect(state.todoId).toBeNull();
      }
    });
  });

  describe('SessionCompleted', () => {
    it('returns to idle from active', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
      ]);
      expect(state).toEqual({ status: 'idle' });
    });

    it('remains idle when already idle (defensive)', () => {
      const state = projectActiveSession(
        INITIAL_ACTIVE_SESSION_STATE,
        makeSessionCompleted('unknown'),
      );
      expect(state).toEqual({ status: 'idle' });
    });
  });

  describe('SessionAbandoned', () => {
    it('returns to idle from active', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionAbandoned('session-1'),
      ]);
      expect(state).toEqual({ status: 'idle' });
    });
  });

  describe('default (unhandled events)', () => {
    it('returns idle state unchanged for non-session event', () => {
      const state = projectActiveSession(
        INITIAL_ACTIVE_SESSION_STATE,
        makeTodoDeclared(),
      );
      expect(state).toBe(INITIAL_ACTIVE_SESSION_STATE);
    });

    it('returns active state unchanged for non-session event', () => {
      const active = projectActiveSession(
        INITIAL_ACTIVE_SESSION_STATE,
        makeSessionStarted('session-1', 'todo-1'),
      );
      const state = projectActiveSession(active, makeTodoDeclared());
      expect(state).toBe(active);
    });

    it('returns state unchanged for SnapshotCreated', () => {
      const state = projectActiveSession(
        INITIAL_ACTIVE_SESSION_STATE,
        makeSnapshotCreated(),
      );
      expect(state).toBe(INITIAL_ACTIVE_SESSION_STATE);
    });
  });
});
