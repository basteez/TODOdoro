import type { DomainEvent } from '../events.js';

export type ActiveSessionReadModel =
  | { readonly status: 'idle' }
  | {
      readonly status: 'active';
      readonly sessionId: string;
      readonly todoId: string | null;
      readonly startedAt: number;
      readonly configuredDurationMs: number;
    };

export const INITIAL_ACTIVE_SESSION_STATE: ActiveSessionReadModel = { status: 'idle' };

export function projectActiveSession(
  state: ActiveSessionReadModel,
  event: DomainEvent,
): ActiveSessionReadModel {
  switch (event.eventType) {
    case 'SessionStarted':
      return {
        status: 'active',
        sessionId: event.aggregateId,
        todoId: event.todoId,
        startedAt: event.timestamp,
        configuredDurationMs: event.configuredDurationMs,
      };

    case 'SessionCompleted':
      return { status: 'idle' };

    case 'SessionAbandoned':
      return { status: 'idle' };

    default:
      return state;
  }
}
