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
 *
 * `pendingExplorations` tracks exploration sessions (todoId=null) that
 * are in-progress, so we have `startedAt` when they complete.
 *
 * `completedExplorations` stores completed exploration sessions that
 * haven't been attributed yet, so `SessionAttributed` can retroactively
 * add them to a todo's devotion record.
 *
 * UI consumers should use `DevotionRecordView` (just the records map).
 */
export interface DevotionRecordReadModel {
  readonly records: ReadonlyMap<string, DevotionRecord>;
  readonly pendingSessions: ReadonlyMap<string, { todoId: string; startedAt: number }>;
  readonly pendingExplorations: ReadonlyMap<string, { startedAt: number }>;
  readonly completedExplorations: ReadonlyMap<string, { startedAt: number; elapsedMs: number }>;
}

/** Consumer-facing view — only the records map, no internal bookkeeping. */
export type DevotionRecordView = DevotionRecordReadModel['records'];

export const INITIAL_DEVOTION_RECORD_STATE: DevotionRecordReadModel = {
  records: new Map(),
  pendingSessions: new Map(),
  pendingExplorations: new Map(),
  completedExplorations: new Map(),
};

export function projectDevotionRecord(
  state: DevotionRecordReadModel,
  event: DomainEvent,
): DevotionRecordReadModel {
  switch (event.eventType) {
    case 'SessionStarted': {
      if (event.todoId === null) {
        return {
          ...state,
          pendingExplorations: new Map(state.pendingExplorations).set(event.aggregateId, {
            startedAt: event.timestamp,
          }),
        };
      }
      return {
        ...state,
        pendingSessions: new Map(state.pendingSessions).set(event.aggregateId, {
          todoId: event.todoId,
          startedAt: event.timestamp,
        }),
      };
    }

    case 'SessionCompleted': {
      // Check linked sessions first
      const pending = state.pendingSessions.get(event.aggregateId);
      if (pending !== undefined) {
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
          ...state,
          records: new Map(state.records).set(pending.todoId, updatedRecord),
          pendingSessions: newPending,
        };
      }

      // Check exploration sessions
      const exploration = state.pendingExplorations.get(event.aggregateId);
      if (exploration !== undefined) {
        const newPendingExplorations = new Map(state.pendingExplorations);
        newPendingExplorations.delete(event.aggregateId);
        return {
          ...state,
          pendingExplorations: newPendingExplorations,
          completedExplorations: new Map(state.completedExplorations).set(event.aggregateId, {
            startedAt: exploration.startedAt,
            elapsedMs: event.elapsedMs,
          }),
        };
      }

      return state;
    }

    case 'SessionAbandoned': {
      // Clean up linked pending
      if (state.pendingSessions.has(event.aggregateId)) {
        const newPending = new Map(state.pendingSessions);
        newPending.delete(event.aggregateId);
        return { ...state, pendingSessions: newPending };
      }
      // Clean up exploration pending
      if (state.pendingExplorations.has(event.aggregateId)) {
        const newPendingExplorations = new Map(state.pendingExplorations);
        newPendingExplorations.delete(event.aggregateId);
        return { ...state, pendingExplorations: newPendingExplorations };
      }
      return state;
    }

    case 'SessionAttributed': {
      const completed = state.completedExplorations.get(event.aggregateId);
      if (completed === undefined) return state;

      const existingRecord = state.records.get(event.todoId);
      const newSession: DevotionSession = {
        sessionId: event.aggregateId,
        startedAt: completed.startedAt,
        elapsedMs: completed.elapsedMs,
      };
      const updatedRecord: DevotionRecord = {
        todoId: event.todoId,
        sessions: [...(existingRecord?.sessions ?? []), newSession],
      };

      const newCompleted = new Map(state.completedExplorations);
      newCompleted.delete(event.aggregateId);

      return {
        ...state,
        records: new Map(state.records).set(event.todoId, updatedRecord),
        completedExplorations: newCompleted,
      };
    }

    default:
      return state;
  }
}
