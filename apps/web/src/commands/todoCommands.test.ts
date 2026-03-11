import { describe, it, expect, beforeEach, vi } from 'vitest';
import { handleDeclareTodo } from './todoCommands.js';
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
