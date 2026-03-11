import type { DomainEvent } from '../events.js';

export interface DevotionSession {
  readonly sessionId: string;
  readonly startedAt: number;
  readonly elapsedMs: number;
}

export interface DevotionRecord {
  readonly todoId: string;
  readonly sessions: ReadonlyArray<DevotionSession>;
}

/**
 * Internal projection state. The `pendingSessions` map correlates
 * `SessionStarted` (which carries `todoId`) with `SessionCompleted`
 * (which only carries `aggregateId` = sessionId) so the projection can
 * attribute elapsed time to the correct todo's devotion record.
 * UI consumers should use `DevotionRecordView` (just the records map).
 */
export interface DevotionRecordReadModel {
  readonly records: ReadonlyMap<string, DevotionRecord>;
  readonly pendingSessions: ReadonlyMap<string, { todoId: string; startedAt: number }>;
}

/** Consumer-facing view — only the records map, no internal bookkeeping. */
export type DevotionRecordView = DevotionRecordReadModel['records'];

export const INITIAL_DEVOTION_RECORD_STATE: DevotionRecordReadModel = {
  records: new Map(),
  pendingSessions: new Map(),
};

export function projectDevotionRecord(
  state: DevotionRecordReadModel,
  event: DomainEvent,
): DevotionRecordReadModel {
  switch (event.eventType) {
    case 'SessionStarted': {
      if (event.todoId === null) return state;
      return {
        ...state,
        pendingSessions: new Map(state.pendingSessions).set(event.aggregateId, {
          todoId: event.todoId,
          startedAt: event.timestamp,
        }),
      };
    }

    case 'SessionCompleted': {
      const pending = state.pendingSessions.get(event.aggregateId);
      if (pending === undefined) return state;

      const existingRecord = state.records.get(pending.todoId);
      const newSession: DevotionSession = {
        sessionId: event.aggregateId,
        startedAt: pending.startedAt,
        elapsedMs: event.elapsedMs,
      };
      const updatedRecord: DevotionRecord = {
        todoId: pending.todoId,
        sessions: [...(existingRecord?.sessions ?? []), newSession],
      };

      const newPending = new Map(state.pendingSessions);
      newPending.delete(event.aggregateId);

      return {
        records: new Map(state.records).set(pending.todoId, updatedRecord),
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
