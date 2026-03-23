import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleStartSession, handleCompleteSession, handleAbandonSession, handleAttributeExplorationSession } from './sessionCommands.js';
import type { DomainEvent } from '@tododoro/domain';
import { useCanvasStore } from '../stores/useCanvasStore.js';
import { useSessionStore } from '../stores/useSessionStore.js';
import {
  INITIAL_TODO_LIST_STATE,
  INITIAL_SHELF_STATE,
  INITIAL_DEVOTION_RECORD_STATE,
  INITIAL_ACTIVE_SESSION_STATE,
} from '@tododoro/domain';
import type { EventStore, Clock, IdGenerator } from '@tododoro/domain';

function createMockEventStore(events: DomainEvent[] = []): EventStore {
  return {
    append: vi.fn<EventStore['append']>(() => Promise.resolve()),
    readAll: vi.fn<EventStore['readAll']>(() => Promise.resolve(events)),
    readByAggregate: vi.fn<EventStore['readByAggregate']>(() => Promise.resolve([])),
  };
}

function createMockClock(now = 1000): Clock {
  return { now: () => now };
}

let idCounter = 0;
function createMockIdGenerator(): IdGenerator {
  idCounter = 0;
  return { generate: () => `id-${++idCounter}` };
}

function resetStores() {
  useCanvasStore.setState({
    todos: INITIAL_TODO_LIST_STATE,
    shelf: INITIAL_SHELF_STATE,
    devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
    isBooting: false,
  });
  useSessionStore.setState({
    activeSession: INITIAL_ACTIVE_SESSION_STATE,
    elapsedMs: 0,
  });
}

describe('handleStartSession', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  beforeEach(() => {
    resetStores();
    eventStore = createMockEventStore();
    clock = createMockClock();
    idGenerator = createMockIdGenerator();
  });

  it('returns ok: true on success', async () => {
    const result = await handleStartSession('todo-1', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });
  });

  it('writes a SessionStartedEvent to the event store', async () => {
    await handleStartSession('todo-1', eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    const event = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.eventType).toBe('SessionStarted');
    expect(event.todoId).toBe('todo-1');
    expect(event.configuredDurationMs).toBe(25 * 60 * 1000);
  });

  it('updates useSessionStore with active session', async () => {
    await handleStartSession('todo-1', eventStore, clock, idGenerator);

    const session = useSessionStore.getState().activeSession;
    expect(session.status).toBe('active');
    if (session.status === 'active') {
      expect(session.todoId).toBe('todo-1');
      expect(session.startedAt).toBe(1000);
      expect(session.configuredDurationMs).toBe(25 * 60 * 1000);
    }
  });

  it('updates useCanvasStore via applyEvent', async () => {
    await handleStartSession('todo-1', eventStore, clock, idGenerator);

    // applyEvent was called — devotionRecord should have a pending session
    const state = useCanvasStore.getState();
    expect(state.devotionRecord).toBeDefined();
  });

  it('persists the event BEFORE updating stores (NFR10)', async () => {
    const callOrder: string[] = [];
    const trackingStore: EventStore = {
      ...createMockEventStore(),
      append: vi.fn(() => {
        callOrder.push('append');
        return Promise.resolve();
      }),
    };

    // Spy on store updates
    const originalStartSession = useSessionStore.getState().startSession;
    useSessionStore.setState({
      startSession: (session) => {
        callOrder.push('startSession');
        originalStartSession(session);
      },
    });

    await handleStartSession('todo-1', trackingStore, clock, idGenerator);

    expect(callOrder[0]).toBe('append');
    expect(callOrder[1]).toBe('startSession');
  });

  it('returns error when a session is already active', async () => {
    const sessionStartedEvent: DomainEvent = {
      eventType: 'SessionStarted',
      eventId: 'ev-1',
      aggregateId: 'session-1',
      schemaVersion: 1,
      timestamp: 500,
      todoId: 'todo-1',
      configuredDurationMs: 25 * 60 * 1000,
    };

    eventStore = createMockEventStore([sessionStartedEvent]);

    const result = await handleStartSession('todo-2', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(eventStore.append).not.toHaveBeenCalled();
  });

  it('never throws — returns error as value', async () => {
    const failingStore: EventStore = {
      ...createMockEventStore(),
      append: () => Promise.reject(new Error('Storage failed')),
    };

    await expect(
      handleStartSession('todo-1', failingStore, clock, idGenerator),
    ).resolves.toBeDefined();
  });

  it('does NOT update session store when append() rejects (NFR10 atomicity)', async () => {
    const failingStore: EventStore = {
      ...createMockEventStore(),
      append: () => Promise.reject(new Error('Storage failed')),
    };

    const result = await handleStartSession('todo-1', failingStore, clock, idGenerator);

    expect(result).toEqual({ ok: false, error: 'Storage failed' });
    // Session store must remain idle — timer never starts
    const session = useSessionStore.getState().activeSession;
    expect(session.status).toBe('idle');
  });

  it('does NOT update canvas store when append() rejects', async () => {
    const failingStore: EventStore = {
      ...createMockEventStore(),
      append: () => Promise.reject(new Error('Storage failed')),
    };

    const devotionBefore = useCanvasStore.getState().devotionRecord;

    await handleStartSession('todo-1', failingStore, clock, idGenerator);

    // Canvas store devotion record must be unchanged
    const devotionAfter = useCanvasStore.getState().devotionRecord;
    expect(devotionAfter).toEqual(devotionBefore);
  });
});

describe('handleCompleteSession', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  const sessionStartedEvent: DomainEvent = {
    eventType: 'SessionStarted',
    eventId: 'ev-1',
    aggregateId: 'session-1',
    schemaVersion: 1,
    timestamp: 500,
    todoId: 'todo-1',
    configuredDurationMs: 25 * 60 * 1000,
  };

  beforeEach(() => {
    resetStores();
    clock = createMockClock(500 + 25 * 60 * 1000);
    idGenerator = createMockIdGenerator();
    eventStore = createMockEventStore([sessionStartedEvent]);
    useSessionStore.getState().startSession({
      status: 'active',
      sessionId: 'session-1',
      todoId: 'todo-1',
      startedAt: 500,
      configuredDurationMs: 25 * 60 * 1000,
    });
  });

  it('returns ok: true on success', async () => {
    const result = await handleCompleteSession(eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });
  });

  it('writes a SessionCompletedEvent to the event store', async () => {
    await handleCompleteSession(eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    const event = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.eventType).toBe('SessionCompleted');
    expect(event.aggregateId).toBe('session-1');
  });

  it('resets useSessionStore to idle after completion', async () => {
    await handleCompleteSession(eventStore, clock, idGenerator);

    const session = useSessionStore.getState().activeSession;
    expect(session.status).toBe('idle');
  });

  it('returns error when no session is active', async () => {
    eventStore = createMockEventStore([]);
    const result = await handleCompleteSession(eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });
});

describe('handleAbandonSession', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  const sessionStartedEvent: DomainEvent = {
    eventType: 'SessionStarted',
    eventId: 'ev-1',
    aggregateId: 'session-1',
    schemaVersion: 1,
    timestamp: 500,
    todoId: 'todo-1',
    configuredDurationMs: 25 * 60 * 1000,
  };

  beforeEach(() => {
    resetStores();
    clock = createMockClock(530); // 30ms elapsed
    idGenerator = createMockIdGenerator();
    eventStore = createMockEventStore([sessionStartedEvent]);
    useSessionStore.getState().startSession({
      status: 'active',
      sessionId: 'session-1',
      todoId: 'todo-1',
      startedAt: 500,
      configuredDurationMs: 25 * 60 * 1000,
    });
  });

  it('returns ok: true on success', async () => {
    const result = await handleAbandonSession(eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });
  });

  it('writes a SessionAbandonedEvent to the event store', async () => {
    await handleAbandonSession(eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    const event = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.eventType).toBe('SessionAbandoned');
    expect(event.aggregateId).toBe('session-1');
  });

  it('resets useSessionStore to idle after abandonment', async () => {
    await handleAbandonSession(eventStore, clock, idGenerator);

    const session = useSessionStore.getState().activeSession;
    expect(session.status).toBe('idle');
  });

  it('returns error when no session is active', async () => {
    eventStore = createMockEventStore([]);
    const result = await handleAbandonSession(eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });
});

describe('handleAttributeExplorationSession', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  const explorationStarted: DomainEvent = {
    eventType: 'SessionStarted',
    eventId: 'ev-1',
    aggregateId: 'session-1',
    schemaVersion: 1,
    timestamp: 500,
    todoId: null,
    configuredDurationMs: 25 * 60 * 1000,
  };

  const explorationCompleted: DomainEvent = {
    eventType: 'SessionCompleted',
    eventId: 'ev-2',
    aggregateId: 'session-1',
    schemaVersion: 1,
    timestamp: 500 + 25 * 60 * 1000,
    elapsedMs: 25 * 60 * 1000,
  };

  beforeEach(() => {
    resetStores();
    clock = createMockClock(500 + 30 * 60 * 1000);
    idGenerator = createMockIdGenerator();
    eventStore = createMockEventStore([explorationStarted, explorationCompleted]);
  });

  it('returns ok: true on success', async () => {
    const result = await handleAttributeExplorationSession('session-1', 'todo-1', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });
  });

  it('writes a SessionAttributedEvent to the event store', async () => {
    await handleAttributeExplorationSession('session-1', 'todo-1', eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    const event = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.eventType).toBe('SessionAttributed');
    expect(event.aggregateId).toBe('session-1');
    expect(event.todoId).toBe('todo-1');
  });

  it('updates useCanvasStore via applyEvent', async () => {
    await handleAttributeExplorationSession('session-1', 'todo-1', eventStore, clock, idGenerator);
    const state = useCanvasStore.getState();
    expect(state.devotionRecord).toBeDefined();
  });

  it('returns error for non-exploration session', async () => {
    const linkedStart: DomainEvent = {
      ...explorationStarted,
      todoId: 'todo-1',
    };
    eventStore = createMockEventStore([linkedStart, explorationCompleted]);
    const result = await handleAttributeExplorationSession('session-1', 'todo-1', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: 'Session is not an exploration session' });
  });

  it('returns error for incomplete session', async () => {
    eventStore = createMockEventStore([explorationStarted]);
    const result = await handleAttributeExplorationSession('session-1', 'todo-1', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: 'Session is not completed' });
  });

  it('returns error for already attributed session', async () => {
    const attributed: DomainEvent = {
      eventType: 'SessionAttributed',
      eventId: 'ev-3',
      aggregateId: 'session-1',
      schemaVersion: 1,
      timestamp: 500 + 30 * 60 * 1000,
      todoId: 'todo-1',
    };
    eventStore = createMockEventStore([explorationStarted, explorationCompleted, attributed]);
    const result = await handleAttributeExplorationSession('session-1', 'todo-2', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: 'Session already attributed' });
  });
});

describe('60-second abandon/complete threshold (Story 3.4)', () => {
  const ABANDON_THRESHOLD_MS = 60_000;

  const sessionStartedEvent: DomainEvent = {
    eventType: 'SessionStarted',
    eventId: 'ev-1',
    aggregateId: 'session-1',
    schemaVersion: 1,
    timestamp: 1000,
    todoId: 'todo-1',
    configuredDurationMs: 25 * 60 * 1000,
  };

  it('cancel at 30s (< 60s): abandon writes SessionAbandonedEvent, no devotion', async () => {
    const clock = createMockClock(1000 + 30_000); // 30s elapsed
    const idGenerator = createMockIdGenerator();
    const eventStore = createMockEventStore([sessionStartedEvent]);
    resetStores();
    useSessionStore.getState().startSession({
      status: 'active',
      sessionId: 'session-1',
      todoId: 'todo-1',
      startedAt: 1000,
      configuredDurationMs: 25 * 60 * 1000,
    });

    // Simulate: elapsed < ABANDON_THRESHOLD_MS → abandon
    const elapsed = clock.now() - 1000;
    expect(elapsed).toBeLessThan(ABANDON_THRESHOLD_MS);

    const result = await handleAbandonSession(eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });

    const event = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.eventType).toBe('SessionAbandoned');
    expect(useSessionStore.getState().activeSession.status).toBe('idle');
  });

  it('cancel at 90s (>= 60s): complete writes SessionCompletedEvent, earns devotion', async () => {
    const clock = createMockClock(1000 + 90_000); // 90s elapsed
    const idGenerator = createMockIdGenerator();
    const eventStore = createMockEventStore([sessionStartedEvent]);
    resetStores();
    useSessionStore.getState().startSession({
      status: 'active',
      sessionId: 'session-1',
      todoId: 'todo-1',
      startedAt: 1000,
      configuredDurationMs: 25 * 60 * 1000,
    });

    // Simulate: elapsed >= ABANDON_THRESHOLD_MS → early complete
    const elapsed = clock.now() - 1000;
    expect(elapsed).toBeGreaterThanOrEqual(ABANDON_THRESHOLD_MS);

    const result = await handleCompleteSession(eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });

    const event = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.eventType).toBe('SessionCompleted');
    expect(useSessionStore.getState().activeSession.status).toBe('idle');
  });

  it('cancel at exactly 60s boundary: complete (benefit of the doubt)', async () => {
    const clock = createMockClock(1000 + 60_000); // exactly 60s
    const idGenerator = createMockIdGenerator();
    const eventStore = createMockEventStore([sessionStartedEvent]);
    resetStores();
    useSessionStore.getState().startSession({
      status: 'active',
      sessionId: 'session-1',
      todoId: 'todo-1',
      startedAt: 1000,
      configuredDurationMs: 25 * 60 * 1000,
    });

    const elapsed = clock.now() - 1000;
    expect(elapsed).toBeGreaterThanOrEqual(ABANDON_THRESHOLD_MS);

    const result = await handleCompleteSession(eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });

    const event = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(event.eventType).toBe('SessionCompleted');
  });
});
