import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  repairEvents,
  projectTodoList,
  INITIAL_TODO_LIST_STATE,
  projectShelf,
  INITIAL_SHELF_STATE,
  projectDevotionRecord,
  INITIAL_DEVOTION_RECORD_STATE,
  projectActiveSession,
  INITIAL_ACTIVE_SESSION_STATE,
} from '@tododoro/domain';
import type { DomainEvent, EventStore, SnapshotCreatedEvent } from '@tododoro/domain';
import { useCanvasStore } from './stores/useCanvasStore.js';
import { useSessionStore } from './stores/useSessionStore.js';

/**
 * Replicates the bootstrap logic from main.tsx for testability.
 * Mirrors main.tsx exactly, including the SnapshotCreatedEvent replay path.
 * Tests verify AC4: first launch (empty DB) and subsequent launches (existing events).
 */
async function bootstrapFromEvents(eventStore: EventStore, clock: { now: () => number }, idGenerator: { generate: () => string }) {
  const allEvents = await eventStore.readAll();
  const repairedEvents = repairEvents(allEvents, clock, idGenerator);

  // Persist synthesized events
  const originalEventIds = new Set(allEvents.map((e) => e.eventId));
  const synthesizedEvents = repairedEvents.filter((e) => !originalEventIds.has(e.eventId));
  for (const event of synthesizedEvents) {
    await eventStore.append(event);
  }

  const lastSnapshot = [...repairedEvents]
    .reverse()
    .find((e): e is SnapshotCreatedEvent => e.eventType === 'SnapshotCreated');

  let todoListState;
  let shelfState;
  let devotionState;
  let sessionState;

  if (lastSnapshot) {
    const snapshotIndex = repairedEvents.indexOf(lastSnapshot);
    const eventsAfterSnapshot = repairedEvents.slice(snapshotIndex + 1);
    todoListState = eventsAfterSnapshot.reduce(projectTodoList, lastSnapshot.snapshotState.todoList);
    shelfState = eventsAfterSnapshot.reduce(projectShelf, lastSnapshot.snapshotState.shelf);
    devotionState = eventsAfterSnapshot.reduce(projectDevotionRecord, lastSnapshot.snapshotState.devotionRecord);
    sessionState = eventsAfterSnapshot.reduce(projectActiveSession, lastSnapshot.snapshotState.activeSession);
  } else {
    todoListState = repairedEvents.reduce(projectTodoList, INITIAL_TODO_LIST_STATE);
    shelfState = repairedEvents.reduce(projectShelf, INITIAL_SHELF_STATE);
    devotionState = repairedEvents.reduce(projectDevotionRecord, INITIAL_DEVOTION_RECORD_STATE);
    sessionState = repairedEvents.reduce(projectActiveSession, INITIAL_ACTIVE_SESSION_STATE);
  }

  useCanvasStore.getState().bootstrap(todoListState, shelfState, devotionState);
  useSessionStore.getState().bootstrap(sessionState);
}

function createMockEventStore(events: DomainEvent[] = []): EventStore {
  return {
    append: vi.fn<EventStore['append']>(() => Promise.resolve()),
    readAll: vi.fn<EventStore['readAll']>(() => Promise.resolve(events)),
    readByAggregate: vi.fn<EventStore['readByAggregate']>(() => Promise.resolve([])),
  };
}

function resetStores() {
  useCanvasStore.setState({
    todos: INITIAL_TODO_LIST_STATE,
    shelf: INITIAL_SHELF_STATE,
    devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
    isBooting: true,
  });
  useSessionStore.setState({
    activeSession: INITIAL_ACTIVE_SESSION_STATE,
    elapsedMs: 0,
  });
}

const clock = { now: () => 100_000 };
let idCounter = 0;
const idGenerator = { generate: () => `synth-${++idCounter}` };

describe('Boot sequence (AC4)', () => {
  beforeEach(() => {
    resetStores();
    idCounter = 0;
  });

  it('boots with empty event store → canvas has zero todos, session is idle (AC4.1)', async () => {
    const eventStore = createMockEventStore([]);

    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    expect(canvas.todos.items).toHaveLength(0);
    expect(canvas.isBooting).toBe(false);

    const session = useSessionStore.getState();
    expect(session.activeSession.status).toBe('idle');
  });

  it('boots with existing events → state is correctly reconstructed (AC4.2)', async () => {
    const events: DomainEvent[] = [
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1000,
        title: 'My first todo',
      },
      {
        eventType: 'TodoPositioned',
        eventId: 'ev-2',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1001,
        x: 150,
        y: 250,
      },
    ];

    const eventStore = createMockEventStore(events);

    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    expect(canvas.todos.items).toHaveLength(1);
    expect(canvas.todos.items[0]!.title).toBe('My first todo');
    expect(canvas.todos.items[0]!.position).toEqual({ x: 150, y: 250 });
    expect(canvas.isBooting).toBe(false);

    const session = useSessionStore.getState();
    expect(session.activeSession.status).toBe('idle');
  });

  it('boots with active session → session state reconstructed as active (AC4.2)', async () => {
    const events: DomainEvent[] = [
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1000,
        title: 'Working todo',
      },
      {
        eventType: 'SessionStarted',
        eventId: 'ev-2',
        aggregateId: 'session-1',
        schemaVersion: 1,
        timestamp: 2000,
        todoId: 'todo-1',
        configuredDurationMs: 25 * 60 * 1000,
      },
    ];

    const eventStore = createMockEventStore(events);

    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const session = useSessionStore.getState();
    expect(session.activeSession.status).toBe('active');
    if (session.activeSession.status === 'active') {
      expect(session.activeSession.sessionId).toBe('session-1');
      expect(session.activeSession.todoId).toBe('todo-1');
    }
  });

  it('boots from snapshot — projects only events after snapshot (AC4.2)', async () => {
    const snapshotTodoList = {
      items: [
        { id: 'todo-1', title: 'Snapshotted todo', position: { x: 50, y: 50 }, pomodoroCount: 3, status: 'active' as const },
      ],
      pendingSessions: new Map(),
    };
    const events: DomainEvent[] = [
      // Events BEFORE snapshot — should be ignored during projection
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1000,
        title: 'Snapshotted todo',
      },
      {
        eventType: 'TodoPositioned',
        eventId: 'ev-2',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1001,
        x: 50,
        y: 50,
      },
      // The snapshot captures state at this point
      {
        eventType: 'SnapshotCreated',
        eventId: 'ev-snap',
        aggregateId: 'system',
        schemaVersion: 1,
        timestamp: 2000,
        snapshotState: {
          todoList: snapshotTodoList,
          shelf: INITIAL_SHELF_STATE,
          devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
          activeSession: INITIAL_ACTIVE_SESSION_STATE,
        },
      },
      // Event AFTER snapshot — should be projected on top of snapshot state
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-3',
        aggregateId: 'todo-2',
        schemaVersion: 1,
        timestamp: 3000,
        title: 'Post-snapshot todo',
      },
    ];

    const eventStore = createMockEventStore(events);
    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    // Both the snapshotted todo and the post-snapshot todo should be present
    expect(canvas.todos.items).toHaveLength(2);
    expect(canvas.todos.items.find((t) => t.id === 'todo-1')?.title).toBe('Snapshotted todo');
    expect(canvas.todos.items.find((t) => t.id === 'todo-1')?.pomodoroCount).toBe(3);
    expect(canvas.todos.items.find((t) => t.id === 'todo-2')?.title).toBe('Post-snapshot todo');
    expect(canvas.isBooting).toBe(false);
  });

  it('persists synthesized events from repair pipeline on boot (AC4.3)', async () => {
    // An orphaned session (started but never completed/abandoned) triggers the repair pipeline
    // to synthesize a SessionAutoCompletedEvent
    const events: DomainEvent[] = [
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1000,
        title: 'A todo',
      },
      {
        eventType: 'SessionStarted',
        eventId: 'ev-2',
        aggregateId: 'session-1',
        schemaVersion: 1,
        timestamp: 2000,
        todoId: 'todo-1',
        configuredDurationMs: 25 * 60 * 1000,
      },
      {
        eventType: 'SessionCompleted',
        eventId: 'ev-3',
        aggregateId: 'session-1',
        schemaVersion: 1,
        timestamp: 2000 + 25 * 60 * 1000,
        elapsedMs: 25 * 60 * 1000,
      },
      // Orphaned session: started but never completed
      {
        eventType: 'SessionStarted',
        eventId: 'ev-4',
        aggregateId: 'session-2',
        schemaVersion: 1,
        timestamp: 50_000,
        todoId: 'todo-1',
        configuredDurationMs: 25 * 60 * 1000,
      },
    ];

    const eventStore = createMockEventStore(events);

    // Orphaned session-2 started at 50_000 with 25min duration.
    // Clock at 50_000 + 25*60*1000 + 60_000 + 1 = 1_610_001ms → past session window.
    // Repair pipeline should auto-complete the orphaned session.
    await bootstrapFromEvents(eventStore, { now: () => 50_000 + 25 * 60 * 1000 + 60_000 + 1 }, idGenerator);

    // The repair pipeline MUST have synthesized at least one event and persisted it
    const appendedEvents = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls.map(
      (call: DomainEvent[]) => call[0]!,
    );
    expect(appendedEvents.length).toBeGreaterThan(0);
    // Verify each appended event has a synthesized ID (not from original set)
    for (const event of appendedEvents) {
      expect(['ev-1', 'ev-2', 'ev-3', 'ev-4']).not.toContain(event.eventId);
    }

    // After boot, the orphaned session should be resolved — session is idle
    const session = useSessionStore.getState();
    expect(session.activeSession.status).toBe('idle');
  });
});
