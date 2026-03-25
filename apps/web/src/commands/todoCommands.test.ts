import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleDeclareTodo, handleRenameTodo, handlePositionTodo, handleSealTodo, handleReleaseTodo } from './todoCommands.js';
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
    count: vi.fn<EventStore['count']>(() => Promise.resolve(0)),
    readFromLatestSnapshot: vi.fn<EventStore['readFromLatestSnapshot']>(() => Promise.resolve({ snapshot: null, events: [] })),
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

  it('does NOT call applyEvent when first append() rejects (atomicity)', async () => {
    const failingStore: EventStore = {
      ...createMockEventStore(),
      append: () => Promise.reject(new Error('Storage failed')),
    };

    const result = await handleDeclareTodo('Test', { x: 0, y: 0 }, failingStore, clock, idGenerator);

    expect(result).toEqual({ ok: false, error: 'Storage failed' });
    // Canvas store must remain empty — no todo was added
    expect(useCanvasStore.getState().todos.items).toHaveLength(0);
  });

  it('applies first event but NOT second when second append() rejects (partial failure)', async () => {
    let appendCallCount = 0;
    const partialFailStore: EventStore = {
      ...createMockEventStore(),
      append: vi.fn(() => {
        appendCallCount++;
        if (appendCallCount === 2) {
          return Promise.reject(new Error('Second write failed'));
        }
        return Promise.resolve();
      }),
    };

    const result = await handleDeclareTodo('Test', { x: 100, y: 200 }, partialFailStore, clock, idGenerator);

    expect(result).toEqual({ ok: false, error: 'Second write failed' });
    // First event (TodoDeclared) was persisted and applied
    expect(useCanvasStore.getState().todos.items).toHaveLength(1);
    expect(useCanvasStore.getState().todos.items[0]!.title).toBe('Test');
    // But position was NOT applied (second event failed)
    expect(useCanvasStore.getState().todos.items[0]!.position).toEqual({ x: 0, y: 0 });
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

describe('handleSealTodo', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  const todoId = 'todo-seal';
  const declaredEvent: DomainEvent = {
    eventType: 'TodoDeclared',
    eventId: 'ev-1',
    aggregateId: todoId,
    schemaVersion: 1,
    timestamp: 500,
    title: 'My sealable todo',
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
    const result = await handleSealTodo(todoId, eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });
  });

  it('appends a TodoSealedEvent to event store', async () => {
    await handleSealTodo(todoId, eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    const call = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.eventType).toBe('TodoSealed');
    expect(call.aggregateId).toBe(todoId);
  });

  it('removes todo from canvas store items after seal', async () => {
    await handleSealTodo(todoId, eventStore, clock, idGenerator);

    const state = useCanvasStore.getState();
    const todo = state.todos.items.find((t) => t.id === todoId);
    expect(todo).toBeUndefined();
  });

  it('adds todo to shelf store after seal', async () => {
    await handleSealTodo(todoId, eventStore, clock, idGenerator);

    const state = useCanvasStore.getState();
    const shelfItem = state.shelf.items.find((t) => t.id === todoId);
    expect(shelfItem).toBeDefined();
    expect(shelfItem!.lifecycleStatus).toBe('sealed');
  });

  it('returns ok: false when todo does not exist (no events)', async () => {
    eventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() => Promise.resolve([])),
    };
    const result = await handleSealTodo('nonexistent', eventStore, clock, idGenerator);
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
      handleSealTodo(todoId, failingStore, clock, idGenerator),
    ).resolves.toBeDefined();
  });
});

describe('handleReleaseTodo', () => {
  let eventStore: EventStore;
  let clock: Clock;
  let idGenerator: IdGenerator;

  const todoId = 'todo-release';
  const declaredEvent: DomainEvent = {
    eventType: 'TodoDeclared',
    eventId: 'ev-1',
    aggregateId: todoId,
    schemaVersion: 1,
    timestamp: 500,
    title: 'My releasable todo',
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

  it('returns ok: true on success with completed_its_purpose', async () => {
    const result = await handleReleaseTodo(todoId, 'completed_its_purpose', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });
  });

  it('returns ok: true on success with was_never_truly_mine', async () => {
    const result = await handleReleaseTodo(todoId, 'was_never_truly_mine', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: true });
  });

  it('appends a TodoReleasedEvent with correct reason to event store', async () => {
    await handleReleaseTodo(todoId, 'completed_its_purpose', eventStore, clock, idGenerator);

    expect(eventStore.append).toHaveBeenCalledTimes(1);
    const call = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(call.eventType).toBe('TodoReleased');
    expect(call.aggregateId).toBe(todoId);
    expect(call.releaseReason).toBe('completed_its_purpose');
  });

  it('removes todo from canvas store items after release', async () => {
    await handleReleaseTodo(todoId, 'was_never_truly_mine', eventStore, clock, idGenerator);

    const state = useCanvasStore.getState();
    const todo = state.todos.items.find((t) => t.id === todoId);
    expect(todo).toBeUndefined();
  });

  it('adds todo to shelf store after release', async () => {
    await handleReleaseTodo(todoId, 'completed_its_purpose', eventStore, clock, idGenerator);

    const state = useCanvasStore.getState();
    const shelfItem = state.shelf.items.find((t) => t.id === todoId);
    expect(shelfItem).toBeDefined();
    expect(shelfItem!.lifecycleStatus).toBe('released');
    expect(shelfItem!.releaseReason).toBe('completed_its_purpose');
  });

  it('returns ok: false when todo is already sealed (non-active)', async () => {
    const sealedEvent: DomainEvent = {
      eventType: 'TodoSealed',
      eventId: 'ev-seal',
      aggregateId: todoId,
      schemaVersion: 1,
      timestamp: 600,
    };
    eventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() =>
        Promise.resolve([declaredEvent, sealedEvent]),
      ),
    };
    const result = await handleReleaseTodo(todoId, 'completed_its_purpose', eventStore, clock, idGenerator);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
    expect(eventStore.append).not.toHaveBeenCalled();
  });

  it('returns ok: false when todo does not exist (no events)', async () => {
    eventStore = {
      ...createMockEventStore(),
      readByAggregate: vi.fn<EventStore['readByAggregate']>(() => Promise.resolve([])),
    };
    const result = await handleReleaseTodo('nonexistent', 'completed_its_purpose', eventStore, clock, idGenerator);
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
      handleReleaseTodo(todoId, 'completed_its_purpose', failingStore, clock, idGenerator),
    ).resolves.toBeDefined();
  });
});
