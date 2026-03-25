import type { SnapshotCreatedEvent, SnapshotState } from './events.js';
import { CURRENT_SCHEMA_VERSION, SNAPSHOT_THRESHOLD } from './events.js';
import type { Clock, IdGenerator } from './ports.js';

/** Convert Map fields in SnapshotState to JSON-safe arrays for serialization. */
export function serializeSnapshotState(state: SnapshotState): SnapshotState {
  return {
    ...state,
    todoList: {
      ...state.todoList,
      pendingSessions: Array.from(state.todoList.pendingSessions.entries()) as unknown as SnapshotState['todoList']['pendingSessions'],
    },
  };
}

/** Reconstruct Map fields in SnapshotState after JSON deserialization. */
export function deserializeSnapshotState(state: SnapshotState): SnapshotState {
  const raw = state.todoList.pendingSessions;
  const pendingSessions: SnapshotState['todoList']['pendingSessions'] =
    raw instanceof Map ? raw :
    Array.isArray(raw) ? new Map(raw as [string, string][]) :
    new Map();
  return {
    ...state,
    todoList: {
      ...state.todoList,
      pendingSessions,
    },
  };
}

export function createSnapshotIfNeeded(
  eventCountSinceLastSnapshot: number,
  currentState: SnapshotState,
  clock: Clock,
  idGenerator: IdGenerator,
): SnapshotCreatedEvent | null {
  if (eventCountSinceLastSnapshot < SNAPSHOT_THRESHOLD) {
    return null;
  }

  return {
    eventType: 'SnapshotCreated',
    eventId: idGenerator.generate(),
    aggregateId: 'system',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: clock.now(),
    snapshotState: serializeSnapshotState(currentState),
  };
}
