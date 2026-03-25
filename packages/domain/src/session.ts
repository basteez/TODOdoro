import type {
  DomainEvent,
  SessionStartedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
} from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';
import type { Clock, IdGenerator } from './ports.js';

export type SessionState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'active';
      readonly sessionId: string;
      readonly todoId: string | null; // null = Exploration session
      readonly startedAt: number; // ms since epoch (clock.now() at SessionStarted)
      readonly configuredDurationMs: number;
    };

export const INITIAL_SESSION_STATE: SessionState = { status: 'idle' };

export function reduceSession(state: SessionState, event: DomainEvent): SessionState {
  switch (event.eventType) {
    case 'SessionStarted':
      if (state.status !== 'idle') return state; // defensive — ignore duplicate start
      return {
        status: 'active',
        sessionId: event.aggregateId,
        todoId: event.todoId,
        startedAt: event.timestamp,
        configuredDurationMs: event.configuredDurationMs,
      };
    case 'SessionCompleted':
    case 'SessionAbandoned':
      if (state.status !== 'active') return state; // defensive
      if (event.aggregateId !== state.sessionId) return state; // ignore events from other sessions
      return { status: 'idle' };
    default:
      return state; // All non-session events are ignored
  }
}

export function startSession(
  state: SessionState,
  todoId: string | null,
  configuredDurationMs: number,
  clock: Clock,
  idGenerator: IdGenerator,
): SessionStartedEvent | Error {
  if (state.status !== 'idle') {
    return new Error('Cannot start session: a session is already active');
  }
  const sessionId = idGenerator.generate();
  return {
    eventType: 'SessionStarted',
    eventId: idGenerator.generate(),
    aggregateId: sessionId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: clock.now(),
    todoId,
    configuredDurationMs,
  };
}

export function completeSession(
  state: SessionState,
  clock: Clock,
  idGenerator: IdGenerator,
): SessionCompletedEvent | Error {
  if (state.status !== 'active') {
    return new Error('Cannot complete session: no active session');
  }
  const now = clock.now();
  const elapsedMs = now - state.startedAt;
  return {
    eventType: 'SessionCompleted',
    eventId: idGenerator.generate(),
    aggregateId: state.sessionId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: now,
    elapsedMs,
    configuredDurationMs: state.configuredDurationMs,
  };
}

export function abandonSession(
  state: SessionState,
  clock: Clock,
  idGenerator: IdGenerator,
): SessionAbandonedEvent | Error {
  if (state.status !== 'active') {
    return new Error('Cannot abandon session: no active session');
  }
  const now = clock.now();
  const elapsedMs = now - state.startedAt;
  return {
    eventType: 'SessionAbandoned',
    eventId: idGenerator.generate(),
    aggregateId: state.sessionId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: now,
    elapsedMs,
    configuredDurationMs: state.configuredDurationMs,
  };
}
