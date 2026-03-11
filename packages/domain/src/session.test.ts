import { describe, it, expect } from 'vitest';
import {
  INITIAL_SESSION_STATE,
  reduceSession,
  startSession,
  completeSession,
  abandonSession,
} from './session.js';
import type { SessionState } from './session.js';
import type { TodoDeclaredEvent } from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';

// ---------------------------------------------------------------------------
// Test utilities (inline — not shared per architecture convention)
// ---------------------------------------------------------------------------

class FakeClock {
  private _now: number;
  constructor(now = 1_000_000) {
    this._now = now;
  }
  now(): number {
    return this._now;
  }
  advance(ms: number): void {
    this._now += ms;
  }
}

class FakeIdGenerator {
  private _counter = 0;
  generate(): string {
    return `test-id-${++this._counter}`;
  }
}

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

function makeActiveState(
  sessionId = 'session-1',
  todoId: string | null = 'todo-1',
  startedAt = 1_000_000,
  configuredDurationMs = 1_500_000,
): Extract<SessionState, { status: 'active' }> {
  return { status: 'active', sessionId, todoId, startedAt, configuredDurationMs };
}

// ---------------------------------------------------------------------------
// INITIAL_SESSION_STATE
// ---------------------------------------------------------------------------

describe('INITIAL_SESSION_STATE', () => {
  it('has status idle', () => {
    expect(INITIAL_SESSION_STATE).toEqual({ status: 'idle' });
  });
});

// ---------------------------------------------------------------------------
// reduceSession
// ---------------------------------------------------------------------------

describe('reduceSession', () => {
  it('SessionStarted: transitions idle → active', () => {
    const clock = new FakeClock(1_000_000);
    const ids = new FakeIdGenerator();
    const event = startSession(INITIAL_SESSION_STATE, 'todo-1', 1_500_000, clock, ids);
    expect(event).not.toBeInstanceOf(Error);
    const result = reduceSession(
      INITIAL_SESSION_STATE,
      event as Exclude<typeof event, Error>,
    );
    expect(result.status).toBe('active');
    if (result.status === 'active') {
      expect(result.todoId).toBe('todo-1');
      expect(result.configuredDurationMs).toBe(1_500_000);
      expect(result.startedAt).toBe(1_000_000);
    }
  });

  it('SessionStarted: returns state unchanged when already active (defensive guard)', () => {
    const active = makeActiveState();
    const sessionStarted = {
      eventType: 'SessionStarted' as const,
      eventId: 'e-dup',
      aggregateId: 'session-dup',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 2_000_000,
      todoId: null as null,
      configuredDurationMs: 1_500_000,
    };
    const result = reduceSession(active, sessionStarted);
    expect(result).toBe(active);
  });

  it('SessionCompleted: transitions active → idle', () => {
    const active = makeActiveState();
    const clock = new FakeClock(1_060_000);
    const ids = new FakeIdGenerator();
    const event = completeSession(active, clock, ids);
    expect(event).not.toBeInstanceOf(Error);
    const result = reduceSession(active, event as Exclude<typeof event, Error>);
    expect(result).toEqual({ status: 'idle' });
  });

  it('SessionCompleted: returns state unchanged when idle (defensive guard)', () => {
    const completedEvent = {
      eventType: 'SessionCompleted' as const,
      eventId: 'e1',
      aggregateId: 'session-1',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1_060_000,
      elapsedMs: 60_000,
    };
    const result = reduceSession(INITIAL_SESSION_STATE, completedEvent);
    expect(result).toBe(INITIAL_SESSION_STATE);
  });

  it('SessionAbandoned: transitions active → idle', () => {
    const active = makeActiveState();
    const clock = new FakeClock(1_059_999);
    const ids = new FakeIdGenerator();
    const event = abandonSession(active, clock, ids);
    expect(event).not.toBeInstanceOf(Error);
    const result = reduceSession(active, event as Exclude<typeof event, Error>);
    expect(result).toEqual({ status: 'idle' });
  });

  it('SessionAbandoned: returns state unchanged when idle (defensive guard)', () => {
    const abandonedEvent = {
      eventType: 'SessionAbandoned' as const,
      eventId: 'e2',
      aggregateId: 'session-1',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1_059_999,
      elapsedMs: 59_999,
    };
    const result = reduceSession(INITIAL_SESSION_STATE, abandonedEvent);
    expect(result).toBe(INITIAL_SESSION_STATE);
  });

  it('SessionCompleted: returns state unchanged when aggregateId does not match active sessionId', () => {
    const active = makeActiveState('session-1');
    const completedEvent = {
      eventType: 'SessionCompleted' as const,
      eventId: 'e-mismatch',
      aggregateId: 'session-OTHER',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1_060_000,
      elapsedMs: 60_000,
    };
    const result = reduceSession(active, completedEvent);
    expect(result).toBe(active);
  });

  it('SessionAbandoned: returns state unchanged when aggregateId does not match active sessionId', () => {
    const active = makeActiveState('session-1');
    const abandonedEvent = {
      eventType: 'SessionAbandoned' as const,
      eventId: 'e-mismatch-2',
      aggregateId: 'session-OTHER',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1_059_999,
      elapsedMs: 59_999,
    };
    const result = reduceSession(active, abandonedEvent);
    expect(result).toBe(active);
  });

  it('default: ignores non-session events (TodoDeclared)', () => {
    const active = makeActiveState();
    const todoEvent: TodoDeclaredEvent = {
      eventType: 'TodoDeclared',
      eventId: 'todo-evt-1',
      aggregateId: 'todo-abc',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 2_000_000,
      title: 'Write tests',
    };
    const result = reduceSession(active, todoEvent);
    expect(result).toBe(active);
  });

  it('default: ignores non-session events when idle (TodoDeclared)', () => {
    const todoEvent: TodoDeclaredEvent = {
      eventType: 'TodoDeclared',
      eventId: 'todo-evt-2',
      aggregateId: 'todo-xyz',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1_000_000,
      title: 'Another todo',
    };
    const result = reduceSession(INITIAL_SESSION_STATE, todoEvent);
    expect(result).toBe(INITIAL_SESSION_STATE);
  });
});

// ---------------------------------------------------------------------------
// startSession
// ---------------------------------------------------------------------------

describe('startSession', () => {
  it('success: with todoId (linked session)', () => {
    const clock = new FakeClock(5_000);
    const ids = new FakeIdGenerator();
    const result = startSession(INITIAL_SESSION_STATE, 'todo-42', 1_500_000, clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('SessionStarted');
    expect(event.todoId).toBe('todo-42');
    expect(event.configuredDurationMs).toBe(1_500_000);
    expect(event.timestamp).toBe(5_000);
    expect(event.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(event.eventId).toBeDefined();
    expect(event.aggregateId).toBeDefined();
  });

  it('success: with todoId null (Exploration session)', () => {
    const clock = new FakeClock(10_000);
    const ids = new FakeIdGenerator();
    const result = startSession(INITIAL_SESSION_STATE, null, 1_500_000, clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('SessionStarted');
    expect(event.todoId).toBeNull();
    expect(event.timestamp).toBe(10_000);
  });

  it('uses clock.now() for timestamp', () => {
    const clock = new FakeClock(999_999);
    const result = startSession(INITIAL_SESSION_STATE, 'todo-1', 25 * 60 * 1000, clock, new FakeIdGenerator());
    expect(result).not.toBeInstanceOf(Error);
    expect((result as Exclude<typeof result, Error>).timestamp).toBe(999_999);
  });

  it('uses idGenerator.generate() for eventId and aggregateId', () => {
    const ids = new FakeIdGenerator();
    const result = startSession(INITIAL_SESSION_STATE, 'todo-1', 1_500_000, new FakeClock(), ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.aggregateId).toBe('test-id-1');
    expect(event.eventId).toBe('test-id-2');
  });

  it('error: session already active', () => {
    const active = makeActiveState();
    const result = startSession(active, 'todo-2', 1_500_000, new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Cannot start session: a session is already active');
  });
});

// ---------------------------------------------------------------------------
// completeSession
// ---------------------------------------------------------------------------

describe('completeSession', () => {
  it('success: returns SessionCompletedEvent with correct shape', () => {
    const clock = new FakeClock(1_060_000);
    const active = makeActiveState('session-99', 'todo-5', 1_000_000, 1_500_000);
    const ids = new FakeIdGenerator();
    const result = completeSession(active, clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('SessionCompleted');
    expect(event.aggregateId).toBe('session-99');
    expect(event.elapsedMs).toBe(60_000); // 1_060_000 - 1_000_000
    expect(event.timestamp).toBe(1_060_000);
    expect(event.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(event.eventId).toBe('test-id-1');
  });

  it('calculates elapsedMs from clock.now() - startedAt', () => {
    const clock = new FakeClock(1_000_000);
    const active = makeActiveState('s-1', 'todo-1', 1_000_000);
    clock.advance(120_000); // 2 minutes elapsed
    const result = completeSession(active, clock, new FakeIdGenerator());
    expect(result).not.toBeInstanceOf(Error);
    expect((result as Exclude<typeof result, Error>).elapsedMs).toBe(120_000);
  });

  it('error: idle state — no active session', () => {
    const result = completeSession(INITIAL_SESSION_STATE, new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Cannot complete session: no active session');
  });
});

// ---------------------------------------------------------------------------
// abandonSession
// ---------------------------------------------------------------------------

describe('abandonSession', () => {
  it('success: returns SessionAbandonedEvent with correct shape', () => {
    const clock = new FakeClock(1_059_999);
    const active = makeActiveState('session-7', 'todo-3', 1_000_000, 1_500_000);
    const ids = new FakeIdGenerator();
    const result = abandonSession(active, clock, ids);
    expect(result).not.toBeInstanceOf(Error);
    const event = result as Exclude<typeof result, Error>;
    expect(event.eventType).toBe('SessionAbandoned');
    expect(event.aggregateId).toBe('session-7');
    expect(event.elapsedMs).toBe(59_999); // 1_059_999 - 1_000_000
    expect(event.timestamp).toBe(1_059_999);
    expect(event.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(event.eventId).toBe('test-id-1');
  });

  it('calculates elapsedMs from clock.now() - startedAt', () => {
    const clock = new FakeClock(1_000_000);
    const active = makeActiveState('s-2', 'todo-2', 1_000_000);
    clock.advance(30_000); // 30 seconds elapsed
    const result = abandonSession(active, clock, new FakeIdGenerator());
    expect(result).not.toBeInstanceOf(Error);
    expect((result as Exclude<typeof result, Error>).elapsedMs).toBe(30_000);
  });

  it('error: idle state — no active session', () => {
    const result = abandonSession(INITIAL_SESSION_STATE, new FakeClock(), new FakeIdGenerator());
    expect(result).toBeInstanceOf(Error);
    expect((result as Error).message).toBe('Cannot abandon session: no active session');
  });
});

// ---------------------------------------------------------------------------
// 60-second boundary tests
// ---------------------------------------------------------------------------

describe('60-second boundary', () => {
  it('completeSession records elapsedMs: 60000 (exactly at boundary)', () => {
    const clock = new FakeClock(1_000_000);
    const startedEvent = startSession(INITIAL_SESSION_STATE, null, 1_500_000, clock, new FakeIdGenerator());
    expect(startedEvent).not.toBeInstanceOf(Error);
    const state = reduceSession(INITIAL_SESSION_STATE, startedEvent as Exclude<typeof startedEvent, Error>);
    clock.advance(60_000); // exactly 60 seconds
    const result = completeSession(state, clock, new FakeIdGenerator());
    expect(result).not.toBeInstanceOf(Error);
    expect((result as Exclude<typeof result, Error>).elapsedMs).toBe(60_000);
  });

  it('abandonSession records elapsedMs: 59999 (1ms under boundary)', () => {
    const clock = new FakeClock(1_000_000);
    const startedEvent = startSession(INITIAL_SESSION_STATE, null, 1_500_000, clock, new FakeIdGenerator());
    expect(startedEvent).not.toBeInstanceOf(Error);
    const state = reduceSession(INITIAL_SESSION_STATE, startedEvent as Exclude<typeof startedEvent, Error>);
    clock.advance(59_999); // 1ms under threshold
    const result = abandonSession(state, clock, new FakeIdGenerator());
    expect(result).not.toBeInstanceOf(Error);
    expect((result as Exclude<typeof result, Error>).elapsedMs).toBe(59_999);
  });
});
