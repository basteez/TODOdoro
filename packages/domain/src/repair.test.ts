import { describe, it, expect } from 'vitest';
import type {
  DomainEvent,
  TodoDeclaredEvent,
  SessionStartedEvent,
  SessionCompletedEvent,
  SessionAbandonedEvent,
} from './events.js';
import { CURRENT_SCHEMA_VERSION } from './events.js';
import type { UnknownEvent } from './repair.js';
import {
  deduplicateByEventId,
  upcastEvents,
  skipUnknownEventTypes,
  autoCloseOrphanedSessions,
  repairEvents,
} from './repair.js';
import { FakeClock, FakeIdGenerator } from './testUtils.js';

// --- Test helpers ---

function makeTodoDeclared(
  overrides: Partial<TodoDeclaredEvent> = {},
): TodoDeclaredEvent {
  return {
    eventType: 'TodoDeclared',
    eventId: 'todo-event-1',
    aggregateId: 'todo-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: 1_000_000,
    title: 'Test Todo',
    ...overrides,
  };
}

function makeSessionStarted(
  overrides: Partial<SessionStartedEvent> = {},
): SessionStartedEvent {
  return {
    eventType: 'SessionStarted',
    eventId: 'session-event-1',
    aggregateId: 'session-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: 1_000_000,
    todoId: 'todo-1',
    configuredDurationMs: 1_500_000, // 25 minutes
    ...overrides,
  };
}

function makeSessionCompleted(
  overrides: Partial<SessionCompletedEvent> = {},
): SessionCompletedEvent {
  return {
    eventType: 'SessionCompleted',
    eventId: 'session-completed-1',
    aggregateId: 'session-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: 2_500_000,
    elapsedMs: 1_500_000,
    ...overrides,
  };
}

function makeSessionAbandoned(
  overrides: Partial<SessionAbandonedEvent> = {},
): SessionAbandonedEvent {
  return {
    eventType: 'SessionAbandoned',
    eventId: 'session-abandoned-1',
    aggregateId: 'session-1',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: 1_030_000,
    elapsedMs: 30_000,
    ...overrides,
  };
}

// =============================================================================
// deduplicateByEventId
// =============================================================================

describe('deduplicateByEventId', () => {
  it('returns a single event unchanged', () => {
    const events = [makeTodoDeclared()];
    const result = deduplicateByEventId(events);
    expect(result).toEqual(events);
  });

  it('returns two distinct events unchanged', () => {
    const events = [
      makeTodoDeclared({ eventId: 'e1' }),
      makeTodoDeclared({ eventId: 'e2' }),
    ];
    const result = deduplicateByEventId(events);
    expect(result).toEqual(events);
  });

  it('drops the second event when two events share the same eventId', () => {
    const first = makeTodoDeclared({ eventId: 'dup-id', title: 'First' });
    const second = makeTodoDeclared({ eventId: 'dup-id', title: 'Second' });
    const result = deduplicateByEventId([first, second]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(first);
  });

  it('keeps the first occurrence when events have same eventId but different content', () => {
    const first = makeTodoDeclared({
      eventId: 'dup-id',
      aggregateId: 'todo-a',
      title: 'First',
    });
    const second = makeTodoDeclared({
      eventId: 'dup-id',
      aggregateId: 'todo-b',
      title: 'Second',
    });
    const result = deduplicateByEventId([first, second]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(first);
  });

  it('returns empty array for empty input', () => {
    const result = deduplicateByEventId([]);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// upcastEvents
// =============================================================================

describe('upcastEvents', () => {
  it('passes events at CURRENT_SCHEMA_VERSION through unchanged', () => {
    const events = [
      makeTodoDeclared({ schemaVersion: CURRENT_SCHEMA_VERSION }),
      makeSessionStarted({ schemaVersion: CURRENT_SCHEMA_VERSION }),
    ];
    const result = upcastEvents(events);
    expect(result).toEqual(events);
  });

  it('passes events with lower schemaVersion through unchanged at v1 (future migration point)', () => {
    const event = makeTodoDeclared({
      schemaVersion: 0,
    }) as unknown as DomainEvent;
    const result = upcastEvents([event]);
    expect(result).toEqual([event]);
  });

  it('returns empty array for empty input', () => {
    const result = upcastEvents([]);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// skipUnknownEventTypes
// =============================================================================

describe('skipUnknownEventTypes', () => {
  it('passes through all 9 known event types', () => {
    const knownEvents: DomainEvent[] = [
      makeTodoDeclared({ eventId: 'e1' }),
      {
        eventType: 'TodoRenamed',
        eventId: 'e2',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1_000_000,
        title: 'New Title',
      },
      {
        eventType: 'TodoPositioned',
        eventId: 'e3',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1_000_000,
        x: 10,
        y: 20,
      },
      {
        eventType: 'TodoSealed',
        eventId: 'e4',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1_000_000,
      },
      {
        eventType: 'TodoReleased',
        eventId: 'e5',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1_000_000,
        releaseReason: 'completed_its_purpose',
      },
      makeSessionStarted({ eventId: 'e6' }),
      makeSessionCompleted({ eventId: 'e7' }),
      makeSessionAbandoned({ eventId: 'e8' }),
      {
        eventType: 'SnapshotCreated',
        eventId: 'e9',
        aggregateId: 'system',
        schemaVersion: 1,
        timestamp: 1_000_000,
        snapshotState: {},
      },
    ];
    const result = skipUnknownEventTypes(knownEvents);
    expect(result).toHaveLength(9);
    expect(result).toEqual(knownEvents);
  });

  it('silently drops an event with an unknown eventType', () => {
    const unknown: UnknownEvent = {
      eventType: 'SomeFutureEvent',
      eventId: 'u1',
      aggregateId: 'agg-1',
      schemaVersion: 2,
      timestamp: 1_000_000,
      payload: 'some data',
    };
    const result = skipUnknownEventTypes([unknown]);
    expect(result).toHaveLength(0);
  });

  it('keeps known events and drops unknown events in a mixed array', () => {
    const known = makeTodoDeclared({ eventId: 'k1' });
    const unknown: UnknownEvent = {
      eventType: 'LegacyTodoItemAdded',
      eventId: 'u1',
      aggregateId: 'agg-1',
      schemaVersion: 1,
      timestamp: 1_000_000,
    };
    const known2 = makeSessionStarted({ eventId: 'k2' });
    const result = skipUnknownEventTypes([known, unknown, known2]);
    expect(result).toHaveLength(2);
    expect(result).toEqual([known, known2]);
  });

  it('returns empty array for empty input', () => {
    const result = skipUnknownEventTypes([]);
    expect(result).toEqual([]);
  });
});

// =============================================================================
// autoCloseOrphanedSessions
// =============================================================================

describe('autoCloseOrphanedSessions', () => {
  it('synthesizes SessionCompletedEvent for orphaned session past window', () => {
    const clock = new FakeClock(1_000_000 + 2_000_000); // 2000s elapsed
    const idGen = new FakeIdGenerator();
    const events: DomainEvent[] = [
      makeSessionStarted({
        timestamp: 1_000_000,
        configuredDurationMs: 1_500_000,
      }),
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    expect(result).toHaveLength(2);
    const synthesized = result[1] as SessionCompletedEvent;
    expect(synthesized.eventType).toBe('SessionCompleted');
    expect(synthesized.elapsedMs).toBe(1_500_000);
    expect(synthesized.aggregateId).toBe('session-1');
    expect(synthesized.timestamp).toBe(1_000_000 + 1_500_000);
    expect(synthesized.eventId).toBe('test-id-1');
  });

  it('leaves orphaned session within window unchanged', () => {
    const clock = new FakeClock(1_000_000 + 10_000); // 10s elapsed, window = 25 min
    const idGen = new FakeIdGenerator();
    const events: DomainEvent[] = [
      makeSessionStarted({
        timestamp: 1_000_000,
        configuredDurationMs: 1_500_000,
      }),
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    expect(result).toHaveLength(1);
    expect(result).toEqual(events);
  });

  it('does not modify completed sessions', () => {
    const clock = new FakeClock(5_000_000);
    const idGen = new FakeIdGenerator();
    const events: DomainEvent[] = [
      makeSessionStarted({ aggregateId: 'session-1' }),
      makeSessionCompleted({ aggregateId: 'session-1' }),
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    expect(result).toHaveLength(2);
    expect(result).toEqual(events);
  });

  it('does not modify abandoned sessions', () => {
    const clock = new FakeClock(5_000_000);
    const idGen = new FakeIdGenerator();
    const events: DomainEvent[] = [
      makeSessionStarted({ aggregateId: 'session-1' }),
      makeSessionAbandoned({ aggregateId: 'session-1' }),
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    expect(result).toHaveLength(2);
    expect(result).toEqual(events);
  });

  it('returns empty array for empty input', () => {
    const clock = new FakeClock();
    const idGen = new FakeIdGenerator();
    const result = autoCloseOrphanedSessions([], clock, idGen);
    expect(result).toEqual([]);
  });

  it('handles mixed sessions: one completed, one orphaned past window, one orphaned within window', () => {
    const clock = new FakeClock(1_000_000 + 2_000_000);
    const idGen = new FakeIdGenerator();
    const events: DomainEvent[] = [
      // Session A — completed normally (has matching SessionCompleted)
      makeSessionStarted({ eventId: 'ss-a', aggregateId: 'session-a', timestamp: 500_000, configuredDurationMs: 1_500_000 }),
      makeSessionCompleted({ eventId: 'sc-a', aggregateId: 'session-a', timestamp: 600_000, elapsedMs: 100_000 }),
      // Session B — orphaned past window (no completion, elapsed > configured)
      makeSessionStarted({ eventId: 'ss-b', aggregateId: 'session-b', timestamp: 800_000, configuredDurationMs: 1_500_000 }),
      // Session C — orphaned within window (no completion, elapsed < configured)
      makeSessionStarted({ eventId: 'ss-c', aggregateId: 'session-c', timestamp: 2_500_000, configuredDurationMs: 1_500_000 }),
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    // 4 original + 1 synthesized for session-b only
    expect(result).toHaveLength(5);
    const synthesized = result[4] as SessionCompletedEvent;
    expect(synthesized.eventType).toBe('SessionCompleted');
    expect(synthesized.aggregateId).toBe('session-b');
    expect(synthesized.elapsedMs).toBe(1_500_000);
    // Session C left open (within window) — no synthesized event for it
    expect(result.filter(e => e.eventType === 'SessionCompleted' && e.aggregateId === 'session-c')).toHaveLength(0);
  });

  it('synthesizes completion at exactly the configured duration boundary', () => {
    const clock = new FakeClock(1_000_000 + 1_500_000); // exactly at boundary
    const idGen = new FakeIdGenerator();
    const events: DomainEvent[] = [
      makeSessionStarted({
        timestamp: 1_000_000,
        configuredDurationMs: 1_500_000,
      }),
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    expect(result).toHaveLength(2);
    const synthesized = result[1] as SessionCompletedEvent;
    expect(synthesized.eventType).toBe('SessionCompleted');
    expect(synthesized.elapsedMs).toBe(1_500_000);
  });
});

// =============================================================================
// repairEvents (pipeline composer)
// =============================================================================

describe('repairEvents', () => {
  it('composes all 4 steps: skip unknown → deduplicate → upcast → auto-close', () => {
    const clock = new FakeClock(1_000_000 + 2_000_000);
    const idGen = new FakeIdGenerator();

    const events: (DomainEvent | UnknownEvent)[] = [
      // Unknown event type — should be removed by skipUnknownEventTypes
      {
        eventType: 'LegacyTodoItemAdded',
        eventId: 'unknown-1',
        aggregateId: 'agg-1',
        schemaVersion: 1,
        timestamp: 900_000,
      } as UnknownEvent,
      // Duplicate events — second should be removed by deduplicateByEventId
      makeTodoDeclared({ eventId: 'dup-1' }),
      makeTodoDeclared({ eventId: 'dup-1', title: 'Duplicate' }),
      // Orphaned session past window — should get synthesized completion
      makeSessionStarted({
        eventId: 'ss-1',
        aggregateId: 'session-orphan',
        timestamp: 1_000_000,
        configuredDurationMs: 1_500_000,
      }),
    ];

    const result = repairEvents(events, clock, idGen);

    // unknown removed, duplicate removed → 2 original + 1 synthesized = 3
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(makeTodoDeclared({ eventId: 'dup-1' }));
    expect(result[1]).toEqual(
      makeSessionStarted({
        eventId: 'ss-1',
        aggregateId: 'session-orphan',
        timestamp: 1_000_000,
        configuredDurationMs: 1_500_000,
      }),
    );
    const synthesized = result[2] as SessionCompletedEvent;
    expect(synthesized.eventType).toBe('SessionCompleted');
    expect(synthesized.aggregateId).toBe('session-orphan');
    expect(synthesized.elapsedMs).toBe(1_500_000);
  });

  it('returns empty array for empty input', () => {
    const clock = new FakeClock();
    const idGen = new FakeIdGenerator();
    const result = repairEvents([], clock, idGen);
    expect(result).toEqual([]);
  });

  it('passes events with mismatched schemaVersion through the upcast step in the pipeline', () => {
    const clock = new FakeClock(1_000_000);
    const idGen = new FakeIdGenerator();
    // Event with schemaVersion 0 — upcastEvents should pass it through unchanged at v1
    const oldEvent = makeTodoDeclared({ schemaVersion: 0 }) as unknown as DomainEvent;
    const result = repairEvents([oldEvent], clock, idGen);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(oldEvent);
  });
});

// =============================================================================
// 6 Documented Corruption Scenarios
// =============================================================================

describe('Corruption Scenarios', () => {
  it('Scenario 1 — Duplicate events: same eventId → only first kept', () => {
    const first = makeTodoDeclared({ eventId: 'dup-id', title: 'First' });
    const second = makeTodoDeclared({ eventId: 'dup-id', title: 'Second' });
    const result = deduplicateByEventId([first, second]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(first);
  });

  it('Scenario 2 — Unknown event types: silently removed', () => {
    const unknown: UnknownEvent = {
      eventType: 'LegacyTodoItemAdded',
      eventId: 'legacy-1',
      aggregateId: 'agg-1',
      schemaVersion: 1,
      timestamp: 1_000_000,
    };
    const known = makeTodoDeclared();
    const result = skipUnknownEventTypes([unknown, known]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(known);
  });

  it('Scenario 3 — Orphaned session within window: no synthesized event', () => {
    const clock = new FakeClock(1_000_000 + 10_000); // 10s elapsed
    const idGen = new FakeIdGenerator();
    const events: DomainEvent[] = [
      makeSessionStarted({
        timestamp: 1_000_000,
        configuredDurationMs: 1_500_000,
      }),
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    expect(result).toHaveLength(1);
  });

  it('Scenario 4 — Orphaned session past window: SessionCompletedEvent synthesized', () => {
    const clock = new FakeClock(1_000_000 + 2_000_000); // 2000s elapsed
    const idGen = new FakeIdGenerator();
    const events: DomainEvent[] = [
      makeSessionStarted({
        timestamp: 1_000_000,
        configuredDurationMs: 1_500_000,
      }),
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    expect(result).toHaveLength(2);
    const synthesized = result[1] as SessionCompletedEvent;
    expect(synthesized.eventType).toBe('SessionCompleted');
    expect(synthesized.elapsedMs).toBe(1_500_000);
  });

  it('Scenario 5 — Truncated log: multi-event log ends abruptly after SessionStartedEvent with no completion, clock past window', () => {
    const clock = new FakeClock(1_000_000 + 2_000_000);
    const idGen = new FakeIdGenerator();
    // Log has normal todo events, then a session that was never completed (truncated)
    const events: DomainEvent[] = [
      makeTodoDeclared({ eventId: 'td-1', timestamp: 500_000 }),
      makeTodoDeclared({ eventId: 'td-2', aggregateId: 'todo-2', timestamp: 600_000, title: 'Second Todo' }),
      makeSessionStarted({
        eventId: 'ss-trunc',
        aggregateId: 'session-truncated',
        timestamp: 1_000_000,
        configuredDurationMs: 1_500_000,
      }),
      // Log ends here — no SessionCompleted or SessionAbandoned follows
    ];
    const result = autoCloseOrphanedSessions(events, clock, idGen);
    expect(result).toHaveLength(4); // 3 original + 1 synthesized
    // Original events preserved in order
    expect(result[0]).toEqual(events[0]);
    expect(result[1]).toEqual(events[1]);
    expect(result[2]).toEqual(events[2]);
    // Synthesized completion appended
    const synthesized = result[3] as SessionCompletedEvent;
    expect(synthesized.eventType).toBe('SessionCompleted');
    expect(synthesized.aggregateId).toBe('session-truncated');
    expect(synthesized.elapsedMs).toBe(1_500_000);
  });

  it('Scenario 6 — Mismatched schemaVersion: events with schemaVersion 0 pass through upcastEvents unchanged', () => {
    const event = makeTodoDeclared({
      schemaVersion: 0,
    }) as unknown as DomainEvent;
    const result = upcastEvents([event]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(event);
  });
});
