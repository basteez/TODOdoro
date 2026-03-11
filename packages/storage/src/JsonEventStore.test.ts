import { beforeEach, describe, it, expect } from 'vitest';
import { JsonEventStore } from './JsonEventStore.js';
import type { TodoDeclaredEvent, SessionStartedEvent } from '@tododoro/domain';
import { CURRENT_SCHEMA_VERSION } from '@tododoro/domain';

function makeTodoDeclared(aggregateId = 'todo-1'): TodoDeclaredEvent {
  return {
    eventType: 'TodoDeclared',
    eventId: `evt-${aggregateId}`,
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

describe('JsonEventStore', () => {
  let store: JsonEventStore;

  beforeEach(() => {
    localStorage.clear();
    store = new JsonEventStore();
  });

  describe('readAll', () => {
    it('returns empty array when localStorage is empty', async () => {
      expect(await store.readAll()).toEqual([]);
    });

    it('returns empty array when localStorage contains corrupted JSON', async () => {
      localStorage.setItem('tododoro:events', 'not-valid-json{{{');
      expect(await store.readAll()).toEqual([]);
    });

    it('returns empty array when localStorage contains non-array JSON', async () => {
      localStorage.setItem('tododoro:events', '{"not": "an array"}');
      expect(await store.readAll()).toEqual([]);
    });
  });

  describe('append', () => {
    it('persists event and readAll returns it', async () => {
      const event = makeTodoDeclared();
      await store.append(event);
      const events = await store.readAll();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    it('appends multiple events in order', async () => {
      const event1 = makeTodoDeclared('todo-1');
      const event2 = makeTodoDeclared('todo-2');
      await store.append(event1);
      await store.append(event2);
      const events = await store.readAll();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(event1);
      expect(events[1]).toEqual(event2);
    });
  });

  describe('readByAggregate', () => {
    it('returns only events matching aggregateId', async () => {
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

    it('returns empty array when no events match', async () => {
      await store.append(makeTodoDeclared('todo-1'));
      expect(await store.readByAggregate('nonexistent')).toEqual([]);
    });

    it('returns empty array when localStorage is empty', async () => {
      expect(await store.readByAggregate('todo-1')).toEqual([]);
    });
  });
});
