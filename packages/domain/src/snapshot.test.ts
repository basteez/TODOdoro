import { describe, it, expect } from 'vitest';
import { createSnapshotIfNeeded, serializeSnapshotState, deserializeSnapshotState } from './snapshot.js';
import { SNAPSHOT_THRESHOLD, CURRENT_SCHEMA_VERSION } from './events.js';
import { INITIAL_TODO_LIST_STATE } from './projections/todoList.js';
import { INITIAL_SHELF_STATE } from './projections/shelf.js';
import { INITIAL_DEVOTION_RECORD_STATE } from './projections/devotionRecord.js';
import { INITIAL_ACTIVE_SESSION_STATE } from './projections/activeSession.js';
import type { SnapshotState } from './events.js';

const snapshotState: SnapshotState = {
  todoList: INITIAL_TODO_LIST_STATE,
  shelf: INITIAL_SHELF_STATE,
  devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
  activeSession: INITIAL_ACTIVE_SESSION_STATE,
};

const clock = { now: () => 1_000_000 };
const idGenerator = { generate: () => 'snap-id-1' };

describe('createSnapshotIfNeeded', () => {
  it('returns null when event count is below threshold', () => {
    const result = createSnapshotIfNeeded(SNAPSHOT_THRESHOLD - 1, snapshotState, clock, idGenerator);
    expect(result).toBeNull();
  });

  it('returns null when event count is zero', () => {
    const result = createSnapshotIfNeeded(0, snapshotState, clock, idGenerator);
    expect(result).toBeNull();
  });

  it('returns SnapshotCreatedEvent when event count equals threshold', () => {
    const result = createSnapshotIfNeeded(SNAPSHOT_THRESHOLD, snapshotState, clock, idGenerator);
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('SnapshotCreated');
    expect(result!.aggregateId).toBe('system');
    expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(result!.timestamp).toBe(1_000_000);
    expect(result!.eventId).toBe('snap-id-1');
    expect(result!.snapshotState).toEqual(serializeSnapshotState(snapshotState));
  });

  it('returns SnapshotCreatedEvent when event count exceeds threshold', () => {
    const result = createSnapshotIfNeeded(SNAPSHOT_THRESHOLD + 100, snapshotState, clock, idGenerator);
    expect(result).not.toBeNull();
    expect(result!.eventType).toBe('SnapshotCreated');
  });

  it('uses SNAPSHOT_THRESHOLD constant, not a magic number', () => {
    // At exactly threshold - 1, no snapshot
    const below = createSnapshotIfNeeded(SNAPSHOT_THRESHOLD - 1, snapshotState, clock, idGenerator);
    expect(below).toBeNull();
    // At exactly threshold, snapshot
    const at = createSnapshotIfNeeded(SNAPSHOT_THRESHOLD, snapshotState, clock, idGenerator);
    expect(at).not.toBeNull();
  });

  it('snapshot carries CURRENT_SCHEMA_VERSION', () => {
    const result = createSnapshotIfNeeded(SNAPSHOT_THRESHOLD, snapshotState, clock, idGenerator);
    expect(result!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('serializes pendingSessions Map as entries array for JSON safety', () => {
    const stateWithPending: SnapshotState = {
      ...snapshotState,
      todoList: {
        ...snapshotState.todoList,
        pendingSessions: new Map([['session-1', 'todo-1'], ['session-2', 'todo-2']]),
      },
    };
    const result = createSnapshotIfNeeded(SNAPSHOT_THRESHOLD, stateWithPending, clock, idGenerator);
    // After JSON round-trip, entries array is preserved (unlike Map which becomes {})
    const roundTripped = JSON.parse(JSON.stringify(result!.snapshotState));
    expect(Array.isArray(roundTripped.todoList.pendingSessions)).toBe(true);
    expect(roundTripped.todoList.pendingSessions).toEqual([['session-1', 'todo-1'], ['session-2', 'todo-2']]);
  });
});

describe('serializeSnapshotState', () => {
  it('converts pendingSessions Map to entries array', () => {
    const state: SnapshotState = {
      todoList: { items: [], pendingSessions: new Map([['s1', 't1']]) },
      shelf: INITIAL_SHELF_STATE,
      devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
      activeSession: INITIAL_ACTIVE_SESSION_STATE,
    };
    const serialized = serializeSnapshotState(state);
    const raw = serialized.todoList.pendingSessions as unknown;
    expect(Array.isArray(raw)).toBe(true);
    expect(raw).toEqual([['s1', 't1']]);
  });

  it('handles empty Map', () => {
    const serialized = serializeSnapshotState(snapshotState);
    const raw = serialized.todoList.pendingSessions as unknown;
    expect(Array.isArray(raw)).toBe(true);
    expect(raw).toEqual([]);
  });
});

describe('deserializeSnapshotState', () => {
  it('reconstructs Map from entries array', () => {
    // Simulate what comes back after JSON round-trip
    const jsonState = JSON.parse(JSON.stringify(serializeSnapshotState({
      todoList: { items: [], pendingSessions: new Map([['s1', 't1'], ['s2', 't2']]) },
      shelf: INITIAL_SHELF_STATE,
      devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
      activeSession: INITIAL_ACTIVE_SESSION_STATE,
    }))) as SnapshotState;
    const deserialized = deserializeSnapshotState(jsonState);
    expect(deserialized.todoList.pendingSessions).toBeInstanceOf(Map);
    expect(deserialized.todoList.pendingSessions.get('s1')).toBe('t1');
    expect(deserialized.todoList.pendingSessions.get('s2')).toBe('t2');
  });

  it('handles empty entries array', () => {
    const jsonState = JSON.parse(JSON.stringify(serializeSnapshotState(snapshotState))) as SnapshotState;
    const deserialized = deserializeSnapshotState(jsonState);
    expect(deserialized.todoList.pendingSessions).toBeInstanceOf(Map);
    expect(deserialized.todoList.pendingSessions.size).toBe(0);
  });

  it('handles legacy {} from old Map serialization gracefully', () => {
    // Simulate old broken format: Map serialized as {}
    const brokenState = {
      todoList: { items: [], pendingSessions: {} },
      shelf: INITIAL_SHELF_STATE,
      devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
      activeSession: INITIAL_ACTIVE_SESSION_STATE,
    } as unknown as SnapshotState;
    const deserialized = deserializeSnapshotState(brokenState);
    expect(deserialized.todoList.pendingSessions).toBeInstanceOf(Map);
    expect(deserialized.todoList.pendingSessions.size).toBe(0);
  });

  it('passes through already-deserialized Map', () => {
    const deserialized = deserializeSnapshotState(snapshotState);
    expect(deserialized.todoList.pendingSessions).toBeInstanceOf(Map);
  });
});
