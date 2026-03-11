import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleDeclareTodo, handleRenameTodo, handlePositionTodo } from './todoCommands.js';
import type { DomainEvent } from '@tododoro/domain';
import { useCanvasStore } from '../stores/useCanvasStore.js';
import {
  INITIAL_TODO_LIST_STATE,
  INITIAL_SHELF_STATE,
  INITIAL_DEVOTION_RECORD_STATE,
} from '@tododoro/domain';
import type { EventStore, Clock, IdGenerator } from '@tododoro/domain';

function createMockEventStore(): EventStore {
  return {
    append: vi.fn<EventStore['append']>(() => Promise.resolve()),
    readAll: vi.fn<EventStore['readAll']>(() => Promise.resolve([])),
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

function resetStore() {
  useCanvasStore.setState({
    todos: INITIAL_TODO_LIST_STATE,
    shelf: INITIAL_SHELF_STATE,
    devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
    isBooting: false,
  });
}

describe('handleDeclareTodo', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  beforeEach(() => {
    resetStore();
    eventStore = createMockEventStore();
    clock = createMockClock();
    idGenerator = createMockIdGenerator();
  });

  it('returns ok: true on success', async () => {
    const result = await handleDeclareTodo(
      'My todo',
      { x: 100, y: 200 },
      eventStore,
      clock,
      idGenerator,
    );
    expect(result).toEqual({ ok: true });
  });

  it('appends TodoDeclaredEvent and TodoPositionedEvent to event store', async () => {
    await handleDeclareTodo('My todo', { x: 100, y: 200 }, eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(2);

    const firstCall = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(firstCall.eventType).toBe('TodoDeclared');
    expect(firstCall.title).toBe('My todo');

    const secondCall = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[1]![0];
    expect(secondCall.eventType).toBe('TodoPositioned');
    expect(secondCall.x).toBe(100);
    expect(secondCall.y).toBe(200);
  });

  it('updates the canvas store via applyEvent for each event', async () => {
    await handleDeclareTodo('My todo', { x: 100, y: 200 }, eventStore, clock, idGenerator);

    const state = useCanvasStore.getState();
    expect(state.todos.items).toHaveLength(1);
    expect(state.todos.items[0]!.title).toBe('My todo');
    expect(state.todos.items[0]!.position).toEqual({ x: 100, y: 200 });
  });

  it('returns ok: false when title is empty', async () => {
    const result = await handleDeclareTodo('', { x: 0, y: 0 }, eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(eventStore.append).not.toHaveBeenCalled();
  });

  it('returns ok: false when at 100-card cap', async () => {
    // Set up store with 100 items
    const items = Array.from({ length: 100 }, (_, i) => ({
      id: `todo-${i}`,
      title: `Todo ${i}`,
      position: { x: 0, y: 0 },
      pomodoroCount: 0,
      status: 'active' as const,
    }));
    useCanvasStore.setState({
      todos: { items, pendingSessions: new Map() },
    });

    const result = await handleDeclareTodo(
      'One too many',
      { x: 0, y: 0 },
      eventStore,
      clock,
      idGenerator,
    );
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(eventStore.append).not.toHaveBeenCalled();
  });

  it('never throws — returns error as value', async () => {
    const failingStore: EventStore = {
      ...createMockEventStore(),
      append: () => Promise.reject(new Error('Storage failed')),
    };

    // Even with a failing store, the function should not throw
    // (though it may propagate the error as a result)
    await expect(
      handleDeclareTodo('Test', { x: 0, y: 0 }, failingStore, clock, idGenerator),
    ).resolves.toBeDefined();
  });
});

describe('handleRenameTodo', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  const todoId = 'todo-abc';
  const declaredEvent: DomainEvent = {
    eventType: 'TodoDeclared',
    eventId: 'ev-1',
    aggregateId: todoId,
    schemaVersion: 1,
    timestamp: 500,
    title: 'Original title',
  };

  beforeEach(() => {
    resetStore();
    clock = createMockClock();
    idGenerator = createMockIdGenerator();
    eventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() =>
        Promise.resolve([declaredEvent]),
      ),
    };
    // Seed store with the todo
    useCanvasStore.getState().applyEvent(declaredEvent);
  });

  it('returns ok: true on success', async () => {
    const result = await handleRenameTodo(
      todoId,
      'New title',
      eventStore,
      clock,
      idGenerator,
    );
    expect(result).toEqual({ ok: true });
  });

  it('appends a TodoRenamedEvent to event store', async () => {
    await handleRenameTodo(todoId, 'New title', eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    const call = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.eventType).toBe('TodoRenamed');
    expect(call.aggregateId).toBe(todoId);
    expect(call.title).toBe('New title');
  });

  it('updates the canvas store title via applyEvent', async () => {
    await handleRenameTodo(todoId, 'New title', eventStore, clock, idGenerator);

    const state = useCanvasStore.getState();
    const todo = state.todos.items.find((t) => t.id === todoId);
    expect(todo?.title).toBe('New title');
  });

  it('returns ok: false when new title is empty', async () => {
    const result = await handleRenameTodo(todoId, '', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(eventStore.append).not.toHaveBeenCalled();
  });

  it('returns ok: false when todo does not exist (no events)', async () => {
    eventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() => Promise.resolve([])),
    };
    const result = await handleRenameTodo(
      'nonexistent-id',
      'New title',
      eventStore,
      clock,
      idGenerator,
    );
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(eventStore.append).not.toHaveBeenCalled();
  });

  it('never throws — returns error as value', async () => {
    const failingStore: EventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() =>
        Promise.resolve([declaredEvent]),
      ),
      append: () => Promise.reject(new Error('Storage failed')),
    };
    await expect(
      handleRenameTodo(todoId, 'New title', failingStore, clock, idGenerator),
    ).resolves.toBeDefined();
  });
});

describe('handlePositionTodo', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  const todoId = 'todo-xyz';
  const declaredEvent: DomainEvent = {
    eventType: 'TodoDeclared',
    eventId: 'ev-1',
    aggregateId: todoId,
    schemaVersion: 1,
    timestamp: 500,
    title: 'My todo',
  };

  beforeEach(() => {
    resetStore();
    clock = createMockClock();
    idGenerator = createMockIdGenerator();
    eventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() =>
        Promise.resolve([declaredEvent]),
      ),
    };
    useCanvasStore.getState().applyEvent(declaredEvent);
  });

  it('returns ok: true on success', async () => {
    const result = await handlePositionTodo(todoId, { x: 50, y: 75 }, eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });
  });

  it('appends a TodoPositionedEvent to event store', async () => {
    await handlePositionTodo(todoId, { x: 50, y: 75 }, eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    const call = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.eventType).toBe('TodoPositioned');
    expect(call.aggregateId).toBe(todoId);
    expect(call.x).toBe(50);
    expect(call.y).toBe(75);
  });

  it('updates the canvas store position via applyEvent', async () => {
    await handlePositionTodo(todoId, { x: 300, y: 400 }, eventStore, clock, idGenerator);

    const state = useCanvasStore.getState();
    const todo = state.todos.items.find((t) => t.id === todoId);
    expect(todo?.position).toEqual({ x: 300, y: 400 });
  });

  it('returns ok: false when todo does not exist (no events)', async () => {
    eventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() => Promise.resolve([])),
    };
    const result = await handlePositionTodo('nonexistent', { x: 0, y: 0 }, eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(eventStore.append).not.toHaveBeenCalled();
  });

  it('never throws — returns error as value', async () => {
    const failingStore: EventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() =>
        Promise.resolve([declaredEvent]),
      ),
      append: () => Promise.reject(new Error('Storage failed')),
    };
    await expect(
      handlePositionTodo(todoId, { x: 0, y: 0 }, failingStore, clock, idGenerator),
    ).resolves.toBeDefined();
  });
});
