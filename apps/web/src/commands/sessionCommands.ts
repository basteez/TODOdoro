import {
  startSession,
  completeSession,
  abandonSession,
  reduceSession,
  INITIAL_SESSION_STATE,
  CURRENT_SCHEMA_VERSION,
} from '@tododoro/domain';
import type { EventStore, Clock, IdGenerator, SessionAttributedEvent } from '@tododoro/domain';
import { useSessionStore } from '../stores/useSessionStore.js';
import { useCanvasStore } from '../stores/useCanvasStore.js';

type Result = { ok: true } | { ok: false; error: string };

const DEFAULT_DURATION_MS = 25 * 60 * 1000; // 25 minutes

export async function handleStartSession(
  todoId: string | null,
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const events = await eventStore.readAll();
    const sessionState = events.reduce(reduceSession, INITIAL_SESSION_STATE);

    const event = startSession(sessionState, todoId, DEFAULT_DURATION_MS, clock, idGenerator);
    if (event instanceof Error) {
      return { ok: false, error: event.message };
    }

    await eventStore.append(event);
    useSessionStore.getState().startSession({
      status: 'active',
      sessionId: event.aggregateId,
      todoId: event.todoId,
      startedAt: event.timestamp,
      configuredDurationMs: event.configuredDurationMs,
    });
    useCanvasStore.getState().applyEvent(event);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

export async function handleCompleteSession(
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const events = await eventStore.readAll();
    const sessionState = events.reduce(reduceSession, INITIAL_SESSION_STATE);

    const event = completeSession(sessionState, clock, idGenerator);
    if (event instanceof Error) {
      return { ok: false, error: event.message };
    }

    await eventStore.append(event);
    useSessionStore.getState().endSession();
    useCanvasStore.getState().applyEvent(event);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

export async function handleAbandonSession(
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const events = await eventStore.readAll();
    const sessionState = events.reduce(reduceSession, INITIAL_SESSION_STATE);

    const event = abandonSession(sessionState, clock, idGenerator);
    if (event instanceof Error) {
      return { ok: false, error: event.message };
    }

    await eventStore.append(event);
    useSessionStore.getState().endSession();
    useCanvasStore.getState().applyEvent(event);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}

export async function handleAttributeExplorationSession(
  sessionId: string,
  todoId: string,
  eventStore: EventStore,
  clock: Clock,
  idGenerator: IdGenerator,
): Promise<Result> {
  try {
    const events = await eventStore.readAll();

    const started = events.find(
      (e) => e.eventType === 'SessionStarted' && e.aggregateId === sessionId,
    );
    if (!started || started.eventType !== 'SessionStarted' || started.todoId !== null) {
      return { ok: false, error: 'Session is not an exploration session' };
    }

    const completed = events.find(
      (e) => e.eventType === 'SessionCompleted' && e.aggregateId === sessionId,
    );
    if (!completed) {
      return { ok: false, error: 'Session is not completed' };
    }

    const alreadyAttributed = events.find(
      (e) => e.eventType === 'SessionAttributed' && e.aggregateId === sessionId,
    );
    if (alreadyAttributed) {
      return { ok: false, error: 'Session already attributed' };
    }

    const event: SessionAttributedEvent = {
      eventType: 'SessionAttributed',
      eventId: idGenerator.generate(),
      aggregateId: sessionId,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: clock.now(),
      todoId,
    };

    await eventStore.append(event);
    useCanvasStore.getState().applyEvent(event);

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return { ok: false, error: message };
  }
}
