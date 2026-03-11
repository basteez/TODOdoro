import { describe, it, expect } from 'vitest';
import {
  INITIAL_DEVOTION_RECORD_STATE,
  projectDevotionRecord,
} from './devotionRecord.js';
import type { DevotionRecordReadModel } from './devotionRecord.js';
import { CURRENT_SCHEMA_VERSION } from '../events.js';
import { DUMMY_SNAPSHOT_STATE } from '../testUtils.js';
import type {
  SessionStartedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
  TodoRenamedEvent,
  SnapshotCreatedEvent,
} from '../events.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const BASE_TIMESTAMP = 1_000_000;

function makeSessionStarted(
  aggregateId = 'session-1',
  todoId: string | null = 'todo-1',
  timestamp = BASE_TIMESTAMP,
): SessionStartedEvent {
  return {
    eventType: 'SessionStarted',
    eventId: `evt-start-${aggregateId}`,
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp,
    todoId,
    configuredDurationMs: 25 * 60 * 1000,
  };
}

function makeSessionCompleted(
  aggregateId = 'session-1',
  elapsedMs = 25 * 60 * 1000,
): SessionCompletedEvent {
  return {
    eventType: 'SessionCompleted',
    eventId: `evt-complete-${aggregateId}`,
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 25 * 60 * 1000,
    elapsedMs,
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

function makeTodoRenamed(
  aggregateId = 'todo-1',
  title = 'New title',
): TodoRenamedEvent {
  return {
    eventType: 'TodoRenamed',
    eventId: 'evt-rename',
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: BASE_TIMESTAMP + 1000,
    title,
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
  events: Parameters<typeof projectDevotionRecord>[1][],
  initial: DevotionRecordReadModel = INITIAL_DEVOTION_RECORD_STATE,
): DevotionRecordReadModel {
  return events.reduce(projectDevotionRecord, initial);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('projectDevotionRecord', () => {
  describe('INITIAL_DEVOTION_RECORD_STATE', () => {
    it('starts with empty records and no pending sessions', () => {
      expect(INITIAL_DEVOTION_RECORD_STATE.records.size).toBe(0);
      expect(INITIAL_DEVOTION_RECORD_STATE.pendingSessions.size).toBe(0);
    });
  });

  describe('SessionStarted', () => {
    it('adds linked session to pending', () => {
      const state = projectDevotionRecord(
        INITIAL_DEVOTION_RECORD_STATE,
        makeSessionStarted('session-1', 'todo-1'),
      );
      expect(state.pendingSessions.size).toBe(1);
      expect(state.pendingSessions.get('session-1')).toEqual({
        todoId: 'todo-1',
        startedAt: BASE_TIMESTAMP,
      });
    });

    it('skips exploration session (todoId: null)', () => {
      const state = projectDevotionRecord(
        INITIAL_DEVOTION_RECORD_STATE,
        makeSessionStarted('session-1', null),
      );
      expect(state).toBe(INITIAL_DEVOTION_RECORD_STATE);
    });
  });

  describe('SessionCompleted', () => {
    it('moves pending session to record', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', 'todo-1', BASE_TIMESTAMP),
        makeSessionCompleted('session-1', 25 * 60 * 1000),
      ]);
      expect(state.pendingSessions.size).toBe(0);
      const record = state.records.get('todo-1');
      expect(record).toBeDefined();
      expect(record!.sessions).toHaveLength(1);
      expect(record!.sessions[0]).toEqual({
        sessionId: 'session-1',
        startedAt: BASE_TIMESTAMP,
        elapsedMs: 25 * 60 * 1000,
      });
    });

    it('appends multiple sessions to the same todo', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', 'todo-1', BASE_TIMESTAMP),
        makeSessionCompleted('session-1'),
        makeSessionStarted('session-2', 'todo-1', BASE_TIMESTAMP + 100_000),
        makeSessionCompleted('session-2'),
      ]);
      const record = state.records.get('todo-1');
      expect(record!.sessions).toHaveLength(2);
    });

    it('ignores orphaned SessionCompleted (no matching pending)', () => {
      const state = projectDevotionRecord(
        INITIAL_DEVOTION_RECORD_STATE,
        makeSessionCompleted('unknown-session'),
      );
      expect(state).toBe(INITIAL_DEVOTION_RECORD_STATE);
    });
  });

  describe('SessionAbandoned', () => {
    it('removes from pending without creating a record entry', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionAbandoned('session-1'),
      ]);
      expect(state.pendingSessions.size).toBe(0);
      expect(state.records.size).toBe(0);
    });

    it('returns same reference when session is not in pending', () => {
      const state = projectDevotionRecord(
        INITIAL_DEVOTION_RECORD_STATE,
        makeSessionAbandoned('unknown'),
      );
      expect(state).toBe(INITIAL_DEVOTION_RECORD_STATE);
    });
  });

  describe('TodoRenamed', () => {
    it('does not affect existing record entries', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
        makeTodoRenamed('todo-1', 'Renamed Todo'),
      ]);
      const record = state.records.get('todo-1');
      expect(record).toBeDefined();
      expect(record!.sessions).toHaveLength(1);
    });
  });

  describe('default (unhandled events)', () => {
    it('returns state unchanged for SnapshotCreated', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', 'todo-1'),
        makeSessionCompleted('session-1'),
      ]);
      const next = projectDevotionRecord(state, makeSnapshotCreated());
      expect(next).toBe(state);
    });
  });

  describe('exploration sessions', () => {
    it('exploration sessions do not pollute any todo record', () => {
      const state = applyEvents([
        makeSessionStarted('session-1', null),
        makeSessionCompleted('session-1'),
      ]);
      expect(state.records.size).toBe(0);
    });
  });
});
