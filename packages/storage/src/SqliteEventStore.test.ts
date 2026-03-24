import { beforeEach, describe, it, expect, vi } from 'vitest';
import type { TodoDeclaredEvent, SessionStartedEvent, DomainEvent } from '@tododoro/domain';
import { CURRENT_SCHEMA_VERSION } from '@tododoro/domain';

// In-memory mock that simulates SQLite behavior for SQLocal's sql tagged template.
// NOTE: This mock validates behavior (append/read/filter/order) but does NOT
// validate raw SQL syntax. Real SQL correctness requires browser integration
// tests with actual SQLocal + OPFS (deferred to a follow-up story).
interface MockRow {
  seq: number;
  event_id: string;
  event_type: string;
  aggregate_id: string;
  schema_version: number;
  timestamp: number;
  payload: string;
}

let mockRows: MockRow[] = [];
let mockSeqCounter = 0;
let destroyCalled = false;

function normalizeQuery(strings: TemplateStringsArray): string {
  return strings.join('?').replace(/\s+/g, ' ').trim();
}

function mockSql(strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]> {
  const query = normalizeQuery(strings);

  if (query.includes('CREATE TABLE') || query.includes('CREATE INDEX')) {
    return Promise.resolve([]);
  }

  if (query.includes('INSERT INTO events')) {
    const [eventId, eventType, aggregateId, schemaVersion, timestamp, payload] =
      values as [string, string, string, number, number, string];

    const duplicate = mockRows.find((r) => r.event_id === eventId);
    if (duplicate) {
      return Promise.reject(new Error('UNIQUE constraint failed: events.event_id'));
    }

    mockSeqCounter++;
    mockRows.push({
      seq: mockSeqCounter,
      event_id: eventId,
      event_type: eventType,
      aggregate_id: aggregateId,
      schema_version: schemaVersion,
      timestamp: timestamp,
      payload: payload,
    });
    return Promise.resolve([]);
  }

  if (query.includes('WHERE aggregate_id')) {
    const aggId = values[0] as string;
    const filtered = mockRows
      .filter((r) => r.aggregate_id === aggId)
      .sort((a, b) => a.seq - b.seq)
      .map((r) => ({ payload: r.payload }));
    return Promise.resolve(filtered);
  }

  if (query.includes('SELECT payload FROM events')) {
    const sorted = mockRows
      .sort((a, b) => a.seq - b.seq)
      .map((r) => ({ payload: r.payload }));
    return Promise.resolve(sorted);
  }

  return Promise.resolve([]);
}

vi.mock('sqlocal', () => {
  return {
    SQLocal: class MockSQLocal {
      sql = mockSql;
      destroy = () => {
        destroyCalled = true;
        return Promise.resolve();
      };
    },
  };
});

// Import after mock setup
const { SqliteEventStore } = await import('./SqliteEventStore.js');

function makeTodoDeclared(aggregateId = 'todo-1', eventId?: string): TodoDeclaredEvent {
  return {
    eventType: 'TodoDeclared',
    eventId: eventId ?? `evt-${aggregateId}`,
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: 1_000_000,
    title: 'Buy milk',
  };
}

function makeSessionStarted(
  aggregateId = 'session-1',
  todoId: string | null = 'todo-1',
): SessionStartedEvent {
  return {
    eventType: 'SessionStarted',
    eventId: `evt-${aggregateId}`,
    aggregateId,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    timestamp: 1_000_000,
    todoId,
    configuredDurationMs: 25 * 60 * 1000,
  };
}

describe('SqliteEventStore', () => {
  let store: InstanceType<typeof SqliteEventStore>;

  beforeEach(async () => {
    mockRows = [];
    mockSeqCounter = 0;
    destroyCalled = false;
    store = new SqliteEventStore('test.sqlite3');
    await store.initialize();
  });

  describe('initialize', () => {
    it('is idempotent — safe to call multiple times', async () => {
      await store.initialize();
      await store.initialize();
      // No error thrown — initialize can be called repeatedly
    });
  });

  describe('append', () => {
    it('persists a single event and readAll returns it', async () => {
      const event = makeTodoDeclared();
      await store.append(event);
      const events = await store.readAll();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    it('appends multiple events maintaining insertion order', async () => {
      const event1 = makeTodoDeclared('todo-1');
      const event2 = makeTodoDeclared('todo-2');
      await store.append(event1);
      await store.append(event2);
      const events = await store.readAll();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(event1);
      expect(events[1]).toEqual(event2);
    });

    it('rejects duplicate event_id', async () => {
      const event = makeTodoDeclared('todo-1', 'duplicate-id');
      await store.append(event);
      const duplicate: DomainEvent = { ...event, title: 'Different title' };
      await expect(store.append(duplicate)).rejects.toThrow('UNIQUE constraint failed');
    });
  });

  describe('readAll', () => {
    it('returns empty array when store is empty', async () => {
      expect(await store.readAll()).toEqual([]);
    });

    it('returns events in correct order by seq', async () => {
      const events = [
        makeTodoDeclared('todo-1'),
        makeTodoDeclared('todo-2'),
        makeTodoDeclared('todo-3'),
      ];
      for (const event of events) {
        await store.append(event);
      }
      const result = await store.readAll();
      expect(result).toHaveLength(3);
      expect(result[0]!.aggregateId).toBe('todo-1');
      expect(result[1]!.aggregateId).toBe('todo-2');
      expect(result[2]!.aggregateId).toBe('todo-3');
    });
  });

  describe('readByAggregate', () => {
    it('filters correctly by aggregateId', async () => {
      const todo1 = makeTodoDeclared('todo-1');
      const todo2 = makeTodoDeclared('todo-2');
      const session = makeSessionStarted('session-1', 'todo-1');

      await store.append(todo1);
      await store.append(todo2);
      await store.append(session);

      const todo1Events = await store.readByAggregate('todo-1');
      expect(todo1Events).toHaveLength(1);
      expect(todo1Events[0]).toEqual(todo1);

      const sessionEvents = await store.readByAggregate('session-1');
      expect(sessionEvents).toHaveLength(1);
      expect(sessionEvents[0]).toEqual(session);
    });

    it('maintains order within aggregate', async () => {
      const event1 = makeTodoDeclared('todo-1', 'evt-1');
      const event2: DomainEvent = {
        eventType: 'TodoRenamed',
        eventId: 'evt-2',
        aggregateId: 'todo-1',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: 2_000_000,
        title: 'Buy oat milk',
      };

      await store.append(event1);
      await store.append(event2);

      const events = await store.readByAggregate('todo-1');
      expect(events).toHaveLength(2);
      expect(events[0]!.eventId).toBe('evt-1');
      expect(events[1]!.eventId).toBe('evt-2');
    });

    it('returns empty array for unknown aggregateId', async () => {
      await store.append(makeTodoDeclared('todo-1'));
      expect(await store.readByAggregate('nonexistent')).toEqual([]);
    });

    it('returns empty array when store is empty', async () => {
      expect(await store.readByAggregate('todo-1')).toEqual([]);
    });
  });

  describe('tolerant JSON parsing', () => {
    it('readAll skips malformed JSON rows and returns only valid events', async () => {
      const validEvent = makeTodoDeclared('todo-1');
      await store.append(validEvent);

      // Insert a row with malformed JSON directly into mock storage
      mockSeqCounter++;
      mockRows.push({
        seq: mockSeqCounter,
        event_id: 'corrupted-1',
        event_type: 'Unknown',
        aggregate_id: 'todo-corrupted',
        schema_version: 1,
        timestamp: 1_000_000,
        payload: '{truncated',
      });

      const events = await store.readAll();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(validEvent);
    });

    it('readAll returns empty array when ALL rows have malformed JSON', async () => {
      mockSeqCounter++;
      mockRows.push({
        seq: mockSeqCounter,
        event_id: 'corrupted-1',
        event_type: 'Unknown',
        aggregate_id: 'todo-1',
        schema_version: 1,
        timestamp: 1_000_000,
        payload: '{truncated',
      });

      mockSeqCounter++;
      mockRows.push({
        seq: mockSeqCounter,
        event_id: 'corrupted-2',
        event_type: 'Unknown',
        aggregate_id: 'todo-2',
        schema_version: 1,
        timestamp: 2_000_000,
        payload: 'not json at all',
      });

      const events = await store.readAll();
      expect(events).toEqual([]);
    });

    it('readByAggregate returns empty array when ALL matching rows have malformed JSON', async () => {
      mockSeqCounter++;
      mockRows.push({
        seq: mockSeqCounter,
        event_id: 'corrupted-1',
        event_type: 'Unknown',
        aggregate_id: 'todo-1',
        schema_version: 1,
        timestamp: 1_000_000,
        payload: '{truncated',
      });

      mockSeqCounter++;
      mockRows.push({
        seq: mockSeqCounter,
        event_id: 'corrupted-2',
        event_type: 'Unknown',
        aggregate_id: 'todo-1',
        schema_version: 1,
        timestamp: 2_000_000,
        payload: 'not json at all',
      });

      const events = await store.readByAggregate('todo-1');
      expect(events).toEqual([]);
    });

    it('readByAggregate skips malformed JSON rows and returns only valid events', async () => {
      const validEvent = makeTodoDeclared('todo-1');
      await store.append(validEvent);

      // Insert a corrupted row for the same aggregate
      mockSeqCounter++;
      mockRows.push({
        seq: mockSeqCounter,
        event_id: 'corrupted-1',
        event_type: 'Unknown',
        aggregate_id: 'todo-1',
        schema_version: 1,
        timestamp: 2_000_000,
        payload: '{truncated',
      });

      const events = await store.readByAggregate('todo-1');
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(validEvent);
    });
  });

  describe('destroy', () => {
    it('tears down the SQLocal instance', async () => {
      await store.destroy();
      expect(destroyCalled).toBe(true);
    });
  });
});
