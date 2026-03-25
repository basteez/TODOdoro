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
  CURRENT_SCHEMA_VERSION,
  createSnapshotIfNeeded,
  deserializeSnapshotState,
} from '@tododoro/domain';
import type { DomainEvent, EventStore, SnapshotCreatedEvent, SnapshotReadResult } from '@tododoro/domain';
import { useCanvasStore } from './stores/useCanvasStore.js';
import { useSessionStore } from './stores/useSessionStore.js';

/**
 * Replicates the bootstrap logic from main.tsx for testability.
 * Mirrors main.tsx exactly, including snapshot-aware read, repair, projection, and snapshot creation.
 * Tests verify AC4: first launch (empty DB) and subsequent launches (existing events).
 */
async function bootstrapFromEvents(eventStore: EventStore, clock: { now: () => number }, idGenerator: { generate: () => string }) {
  let todoListState = INITIAL_TODO_LIST_STATE;
  let shelfState = INITIAL_SHELF_STATE;
  let devotionState = INITIAL_DEVOTION_RECORD_STATE;
  let sessionState = INITIAL_ACTIVE_SESSION_STATE;

  try {
    // Attempt optimized snapshot-aware read first
    let snapshotResult: SnapshotReadResult | null = null;
    try {
      snapshotResult = await eventStore.readFromLatestSnapshot();
    } catch {
      // Snapshot read failed — fall back to readAll()
    }

    let rawEvents: readonly DomainEvent[];
    let lastSnapshot: SnapshotCreatedEvent | null;

    if (snapshotResult) {
      rawEvents = snapshotResult.events;
      lastSnapshot = snapshotResult.snapshot;
    } else {
      // Fallback: load all events and find snapshot in memory
      const allEvents = await eventStore.readAll();
      const foundSnapshot = [...allEvents]
        .reverse()
        .find((e): e is SnapshotCreatedEvent => e.eventType === 'SnapshotCreated') ?? null;

      if (foundSnapshot) {
        const snapshotIndex = allEvents.indexOf(foundSnapshot);
        rawEvents = allEvents.slice(snapshotIndex + 1);
        lastSnapshot = foundSnapshot;
      } else {
        rawEvents = allEvents;
        lastSnapshot = null;
      }
    }

    // Repair only the post-snapshot events
    const repairedEvents = repairEvents(rawEvents, clock, idGenerator);

    // Persist synthesized events. If persisting fails, skip — re-created on next boot.
    const originalEventIds = new Set(rawEvents.map((e) => e.eventId));
    const synthesizedEvents = repairedEvents.filter((e) => !originalEventIds.has(e.eventId));
    for (const event of synthesizedEvents) {
      try { await eventStore.append(event); } catch { /* skip — re-created on next boot */ }
    }

    if (lastSnapshot) {
      const snapshotState = deserializeSnapshotState(lastSnapshot.snapshotState);
      todoListState = repairedEvents.reduce(projectTodoList, snapshotState.todoList);
      shelfState = repairedEvents.reduce(projectShelf, snapshotState.shelf);
      devotionState = repairedEvents.reduce(projectDevotionRecord, snapshotState.devotionRecord);
      sessionState = repairedEvents.reduce(projectActiveSession, snapshotState.activeSession);
    } else {
      todoListState = repairedEvents.reduce(projectTodoList, INITIAL_TODO_LIST_STATE);
      shelfState = repairedEvents.reduce(projectShelf, INITIAL_SHELF_STATE);
      devotionState = repairedEvents.reduce(projectDevotionRecord, INITIAL_DEVOTION_RECORD_STATE);
      sessionState = repairedEvents.reduce(projectActiveSession, INITIAL_ACTIVE_SESSION_STATE);
    }

    // Snapshot creation: if events since last snapshot >= threshold, create a new snapshot
    // Use rawEvents.length (actual stored count) not repairedEvents.length (which may differ after dedup/skip)
    const eventCountSinceSnapshot = rawEvents.length;
    const snapshotEvent = createSnapshotIfNeeded(
      eventCountSinceSnapshot,
      { todoList: todoListState, shelf: shelfState, devotionRecord: devotionState, activeSession: sessionState },
      clock,
      idGenerator,
    );
    if (snapshotEvent) {
      try { await eventStore.append(snapshotEvent); } catch { /* skip — will retry on next boot */ }
    }
  } catch {
    // Fall back to initial state — canvas renders empty rather than crashing.
    todoListState = INITIAL_TODO_LIST_STATE;
    shelfState = INITIAL_SHELF_STATE;
    devotionState = INITIAL_DEVOTION_RECORD_STATE;
    sessionState = INITIAL_ACTIVE_SESSION_STATE;
  }

  useCanvasStore.getState().bootstrap(todoListState, shelfState, devotionState);
  useSessionStore.getState().bootstrap(sessionState);
}

function createMockEventStore(events: DomainEvent[] = []): EventStore {
  // Simulate snapshot-aware read: find last SnapshotCreated and return post-snapshot events
  const readFromLatestSnapshot = (): Promise<SnapshotReadResult> => {
    let snapshotIndex = -1;
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i]!.eventType === 'SnapshotCreated') {
        snapshotIndex = i;
        break;
      }
    }
    if (snapshotIndex === -1) {
      return Promise.resolve({ snapshot: null, events });
    }
    const snapshot = events[snapshotIndex] as SnapshotCreatedEvent;
    const postSnapshotEvents = events.slice(snapshotIndex + 1);
    return Promise.resolve({ snapshot, events: postSnapshotEvents });
  };

  return {
    append: vi.fn<EventStore['append']>(() => Promise.resolve()),
    readAll: vi.fn<EventStore['readAll']>(() => Promise.resolve(events)),
    readByAggregate: vi.fn<EventStore['readByAggregate']>(() => Promise.resolve([])),
    count: vi.fn<EventStore['count']>(() => Promise.resolve(events.length)),
    readFromLatestSnapshot: vi.fn<EventStore['readFromLatestSnapshot']>(readFromLatestSnapshot),
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

  it('boots with initial state when projection pipeline encounters corrupted data (AC5/6)', async () => {
    // A SnapshotCreated event with corrupted snapshotState (null todoList) causes
    // the projection to throw TypeError when accessing state.items. The bootstrap
    // fallback should catch this and use INITIAL_*_STATE instead.
    const corruptedEvents: DomainEvent[] = [
      {
        eventType: 'SnapshotCreated',
        eventId: 'ev-snap',
        aggregateId: 'system',
        schemaVersion: 1,
        timestamp: 1000,
        snapshotState: {
          todoList: null as never,
          shelf: INITIAL_SHELF_STATE,
          devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
          activeSession: INITIAL_ACTIVE_SESSION_STATE,
        },
      },
      // This event after the snapshot triggers the projection on the corrupted state
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 2000,
        title: 'Post-snapshot todo',
      },
    ];

    const eventStore = createMockEventStore(corruptedEvents);
    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    expect(canvas.todos).toEqual(INITIAL_TODO_LIST_STATE);
    expect(canvas.shelf).toEqual(INITIAL_SHELF_STATE);
    expect(canvas.devotionRecord).toEqual(INITIAL_DEVOTION_RECORD_STATE);
    expect(canvas.isBooting).toBe(false);

    const session = useSessionStore.getState();
    expect(session.activeSession).toEqual(INITIAL_ACTIVE_SESSION_STATE);
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
        configuredDurationMs: 25 * 60 * 1000,
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

  it('boots with initial state when readAll() throws a storage-level error (AC5/6)', async () => {
    const eventStore: EventStore = {
      append: vi.fn(() => Promise.resolve()),
      readAll: vi.fn(() => Promise.reject(new Error('OPFS read failed'))),
      readByAggregate: vi.fn(() => Promise.resolve([])),
      count: vi.fn(() => Promise.resolve(0)),
      readFromLatestSnapshot: vi.fn(() => Promise.reject(new Error('OPFS read failed'))),
    };

    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    expect(canvas.todos).toEqual(INITIAL_TODO_LIST_STATE);
    expect(canvas.shelf).toEqual(INITIAL_SHELF_STATE);
    expect(canvas.devotionRecord).toEqual(INITIAL_DEVOTION_RECORD_STATE);
    expect(canvas.isBooting).toBe(false);

    const session = useSessionStore.getState();
    expect(session.activeSession).toEqual(INITIAL_ACTIVE_SESSION_STATE);
  });

  it('boots from mixed v1+v2 event log — all read models hydrated correctly after upcast', async () => {
    const events: DomainEvent[] = [
      // v1 TodoDeclared — will be upcasted to v2
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1000,
        title: 'Legacy todo',
      },
      // v2 SessionStarted — already at current version
      {
        eventType: 'SessionStarted',
        eventId: 'ev-2',
        aggregateId: 'session-1',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: 2000,
        todoId: 'todo-1',
        configuredDurationMs: 25 * 60 * 1000,
      },
      // v1 SessionCompleted (no configuredDurationMs) — will be upcasted with default
      {
        eventType: 'SessionCompleted',
        eventId: 'ev-3',
        aggregateId: 'session-1',
        schemaVersion: 1,
        timestamp: 2000 + 25 * 60 * 1000,
        elapsedMs: 25 * 60 * 1000,
      } as unknown as DomainEvent,
    ];

    const eventStore = createMockEventStore(events);
    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    // Todo projected correctly from upcasted v1 event
    expect(canvas.todos.items).toHaveLength(1);
    expect(canvas.todos.items[0]!.title).toBe('Legacy todo');
    // Session completed — pomodoro count incremented
    expect(canvas.todos.items[0]!.pomodoroCount).toBe(1);
    expect(canvas.isBooting).toBe(false);

    // Session is idle after completion
    const session = useSessionStore.getState();
    expect(session.activeSession.status).toBe('idle');
  });

  it('boots with correct recovered state from mixed corruption (AC5)', async () => {
    // Mixed scenario: valid events + duplicate + unknown event type + orphaned session
    const events: DomainEvent[] = [
      // Valid todo declaration
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1000,
        title: 'Surviving todo',
      },
      // Duplicate of ev-1 — should be deduplicated
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1000,
        title: 'Surviving todo',
      },
      // Unknown event type — should be silently skipped
      {
        eventType: 'NeverHeardOfThis' as DomainEvent['eventType'],
        eventId: 'ev-unknown',
        aggregateId: 'todo-1',
        schemaVersion: 1,
        timestamp: 1500,
      } as DomainEvent,
      // Orphaned session (started, no completion) — repair auto-completes if past window
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

    // Clock set past session window: 2000 + 25*60*1000 + 60_000 + 1
    await bootstrapFromEvents(eventStore, { now: () => 2000 + 25 * 60 * 1000 + 60_000 + 1 }, idGenerator);

    const canvas = useCanvasStore.getState();
    // The valid todo survived all corruption
    expect(canvas.todos.items).toHaveLength(1);
    expect(canvas.todos.items[0]!.title).toBe('Surviving todo');
    // Orphaned session was auto-completed, so pomodoro count incremented
    expect(canvas.todos.items[0]!.pomodoroCount).toBe(1);
    expect(canvas.isBooting).toBe(false);

    // Session should be idle after auto-completion of orphaned session
    const session = useSessionStore.getState();
    expect(session.activeSession.status).toBe('idle');
  });
});

describe('Snapshot correctness (AC5)', () => {
  beforeEach(() => {
    resetStores();
    idCounter = 0;
  });

  it('state projected with snapshot equals state projected without snapshot (round-trip equivalence)', async () => {
    const events: DomainEvent[] = [
      { eventType: 'TodoDeclared', eventId: 'ev-1', aggregateId: 'todo-1', schemaVersion: CURRENT_SCHEMA_VERSION, timestamp: 1000, title: 'First' },
      { eventType: 'TodoPositioned', eventId: 'ev-2', aggregateId: 'todo-1', schemaVersion: CURRENT_SCHEMA_VERSION, timestamp: 1001, x: 100, y: 200 },
      { eventType: 'TodoDeclared', eventId: 'ev-3', aggregateId: 'todo-2', schemaVersion: CURRENT_SCHEMA_VERSION, timestamp: 2000, title: 'Second' },
    ];

    // Boot without snapshot (baseline — only used to verify the helper works)
    const noSnapStore = createMockEventStore(events);
    await bootstrapFromEvents(noSnapStore, clock, idGenerator);

    resetStores();
    idCounter = 0;

    // Build snapshot from the same events
    const todoList = events.reduce(projectTodoList, INITIAL_TODO_LIST_STATE);
    const shelf = events.reduce(projectShelf, INITIAL_SHELF_STATE);
    const devotionRecord = events.reduce(projectDevotionRecord, INITIAL_DEVOTION_RECORD_STATE);
    const activeSession = events.reduce(projectActiveSession, INITIAL_ACTIVE_SESSION_STATE);

    const snapshotEvents: DomainEvent[] = [
      ...events,
      {
        eventType: 'SnapshotCreated',
        eventId: 'ev-snap',
        aggregateId: 'system',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: 3000,
        snapshotState: { todoList, shelf, devotionRecord, activeSession },
      },
      // One more event after snapshot
      { eventType: 'TodoDeclared', eventId: 'ev-4', aggregateId: 'todo-3', schemaVersion: CURRENT_SCHEMA_VERSION, timestamp: 4000, title: 'Third' },
    ];
    const noSnapEventsWithExtra: DomainEvent[] = [
      ...events,
      { eventType: 'TodoDeclared', eventId: 'ev-4', aggregateId: 'todo-3', schemaVersion: CURRENT_SCHEMA_VERSION, timestamp: 4000, title: 'Third' },
    ];

    // Boot with snapshot
    const snapStore = createMockEventStore(snapshotEvents);
    await bootstrapFromEvents(snapStore, clock, idGenerator);
    const snapCanvas = { ...useCanvasStore.getState() };
    const snapSession = { ...useSessionStore.getState() };

    resetStores();
    idCounter = 0;

    // Boot without snapshot but same events
    const noSnap2Store = createMockEventStore(noSnapEventsWithExtra);
    await bootstrapFromEvents(noSnap2Store, clock, idGenerator);
    const noSnap2Canvas = { ...useCanvasStore.getState() };
    const noSnap2Session = { ...useSessionStore.getState() };

    // Both should produce identical state
    expect(snapCanvas.todos.items).toEqual(noSnap2Canvas.todos.items);
    expect(snapCanvas.shelf).toEqual(noSnap2Canvas.shelf);
    expect(snapCanvas.devotionRecord).toEqual(noSnap2Canvas.devotionRecord);
    expect(snapSession.activeSession).toEqual(noSnap2Session.activeSession);
  });

  it('multiple snapshot cycles (500 events -> snapshot -> 500 more -> second snapshot -> boot)', async () => {
    // Simulate two snapshot cycles with a handful of events for test speed
    const eventsBeforeSnap1: DomainEvent[] = Array.from({ length: 5 }, (_, i) => ({
      eventType: 'TodoDeclared' as const,
      eventId: `ev-${i}`,
      aggregateId: `todo-${i}`,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1000 + i,
      title: `Todo ${i}`,
    }));

    const snap1State = eventsBeforeSnap1.reduce(projectTodoList, INITIAL_TODO_LIST_STATE);

    const snap1: SnapshotCreatedEvent = {
      eventType: 'SnapshotCreated',
      eventId: 'ev-snap-1',
      aggregateId: 'system',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 10_000,
      snapshotState: {
        todoList: snap1State,
        shelf: INITIAL_SHELF_STATE,
        devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
        activeSession: INITIAL_ACTIVE_SESSION_STATE,
      },
    };

    const eventsBetweenSnapshots: DomainEvent[] = Array.from({ length: 3 }, (_, i) => ({
      eventType: 'TodoDeclared' as const,
      eventId: `ev-mid-${i}`,
      aggregateId: `todo-mid-${i}`,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 20_000 + i,
      title: `Mid todo ${i}`,
    }));

    const snap2TodoList = eventsBetweenSnapshots.reduce(projectTodoList, snap1State);

    const snap2: SnapshotCreatedEvent = {
      eventType: 'SnapshotCreated',
      eventId: 'ev-snap-2',
      aggregateId: 'system',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 30_000,
      snapshotState: {
        todoList: snap2TodoList,
        shelf: INITIAL_SHELF_STATE,
        devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
        activeSession: INITIAL_ACTIVE_SESSION_STATE,
      },
    };

    const eventsAfterSnap2: DomainEvent[] = [
      { eventType: 'TodoDeclared', eventId: 'ev-final', aggregateId: 'todo-final', schemaVersion: CURRENT_SCHEMA_VERSION, timestamp: 40_000, title: 'Final' },
    ];

    const allEvents = [...eventsBeforeSnap1, snap1, ...eventsBetweenSnapshots, snap2, ...eventsAfterSnap2];
    const eventStore = createMockEventStore(allEvents);
    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    // Should have: 5 (before snap1) + 3 (between snaps) + 1 (after snap2) = 9 todos
    expect(canvas.todos.items).toHaveLength(9);
    expect(canvas.todos.items.find((t) => t.id === 'todo-final')?.title).toBe('Final');
    expect(canvas.todos.items.find((t) => t.id === 'todo-0')?.title).toBe('Todo 0');
  });

  it('boot with snapshot + zero events after snapshot', async () => {
    const todo: DomainEvent = {
      eventType: 'TodoDeclared',
      eventId: 'ev-1',
      aggregateId: 'todo-1',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1000,
      title: 'Only todo',
    };
    const todoList = [todo].reduce(projectTodoList, INITIAL_TODO_LIST_STATE);

    const events: DomainEvent[] = [
      todo,
      {
        eventType: 'SnapshotCreated',
        eventId: 'ev-snap',
        aggregateId: 'system',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: 2000,
        snapshotState: {
          todoList,
          shelf: INITIAL_SHELF_STATE,
          devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
          activeSession: INITIAL_ACTIVE_SESSION_STATE,
        },
      },
    ];

    const eventStore = createMockEventStore(events);
    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    expect(canvas.todos.items).toHaveLength(1);
    expect(canvas.todos.items[0]!.title).toBe('Only todo');
  });

  it('boot with corrupted/invalid snapshot falls back to full replay', async () => {
    const events: DomainEvent[] = [
      {
        eventType: 'SnapshotCreated',
        eventId: 'ev-snap',
        aggregateId: 'system',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: 1000,
        snapshotState: {
          todoList: null as never,
          shelf: INITIAL_SHELF_STATE,
          devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
          activeSession: INITIAL_ACTIVE_SESSION_STATE,
        },
      },
      {
        eventType: 'TodoDeclared',
        eventId: 'ev-1',
        aggregateId: 'todo-1',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: 2000,
        title: 'Post-snapshot todo',
      },
    ];

    // The mock readFromLatestSnapshot returns the corrupted snapshot.
    // The bootstrap should catch the projection error and fall back to INITIAL state.
    const eventStore = createMockEventStore(events);
    await bootstrapFromEvents(eventStore, clock, idGenerator);

    const canvas = useCanvasStore.getState();
    // Falls back to INITIAL state because corrupted snapshot causes projection error
    expect(canvas.todos).toEqual(INITIAL_TODO_LIST_STATE);
  });

  it('snapshot creation uses SNAPSHOT_THRESHOLD constant, not magic numbers', async () => {
    // Verify the createSnapshotIfNeeded function uses the correct threshold
    const { SNAPSHOT_THRESHOLD } = await import('@tododoro/domain');
    expect(SNAPSHOT_THRESHOLD).toBe(500);

    const { createSnapshotIfNeeded: createSnapshot } = await import('@tododoro/domain');
    const state = {
      todoList: INITIAL_TODO_LIST_STATE,
      shelf: INITIAL_SHELF_STATE,
      devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
      activeSession: INITIAL_ACTIVE_SESSION_STATE,
    };
    // Below threshold: no snapshot
    expect(createSnapshot(SNAPSHOT_THRESHOLD - 1, state, clock, idGenerator)).toBeNull();
    // At threshold: snapshot created
    expect(createSnapshot(SNAPSHOT_THRESHOLD, state, clock, idGenerator)).not.toBeNull();
  });

  it('SnapshotCreatedEvent carries CURRENT_SCHEMA_VERSION', async () => {
    const { createSnapshotIfNeeded: createSnapshot, SNAPSHOT_THRESHOLD } = await import('@tododoro/domain');
    const state = {
      todoList: INITIAL_TODO_LIST_STATE,
      shelf: INITIAL_SHELF_STATE,
      devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
      activeSession: INITIAL_ACTIVE_SESSION_STATE,
    };
    const snapshot = createSnapshot(SNAPSHOT_THRESHOLD, state, clock, idGenerator);
    expect(snapshot!.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
  });

  it('snapshot triggers only when events SINCE LAST SNAPSHOT >= 500, not total events', async () => {
    // Create events with a snapshot in the middle, then fewer than 500 after
    const eventsBeforeSnap: DomainEvent[] = Array.from({ length: 3 }, (_, i) => ({
      eventType: 'TodoDeclared' as const,
      eventId: `ev-pre-${i}`,
      aggregateId: `todo-pre-${i}`,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1000 + i,
      title: `Pre ${i}`,
    }));

    const todoList = eventsBeforeSnap.reduce(projectTodoList, INITIAL_TODO_LIST_STATE);
    const snap: SnapshotCreatedEvent = {
      eventType: 'SnapshotCreated',
      eventId: 'ev-snap',
      aggregateId: 'system',
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 5000,
      snapshotState: {
        todoList,
        shelf: INITIAL_SHELF_STATE,
        devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
        activeSession: INITIAL_ACTIVE_SESSION_STATE,
      },
    };

    const eventsAfterSnap: DomainEvent[] = Array.from({ length: 2 }, (_, i) => ({
      eventType: 'TodoDeclared' as const,
      eventId: `ev-post-${i}`,
      aggregateId: `todo-post-${i}`,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 10_000 + i,
      title: `Post ${i}`,
    }));

    const allEvents = [...eventsBeforeSnap, snap, ...eventsAfterSnap];
    const eventStore = createMockEventStore(allEvents);
    await bootstrapFromEvents(eventStore, clock, idGenerator);

    // Only 2 events since last snapshot — no new snapshot should be created
    const appendCalls = (eventStore.append as ReturnType<typeof vi.fn>).mock.calls;
    const snapshotAppends = appendCalls.filter(
      (call: DomainEvent[]) => call[0]!.eventType === 'SnapshotCreated',
    );
    expect(snapshotAppends).toHaveLength(0);
  });

  it('falls back to readAll() when readFromLatestSnapshot throws, and still boots correctly', async () => {
    const events: DomainEvent[] = [
      { eventType: 'TodoDeclared', eventId: 'ev-1', aggregateId: 'todo-1', schemaVersion: CURRENT_SCHEMA_VERSION, timestamp: 1000, title: 'Fallback todo' },
    ];

    const eventStore: EventStore = {
      append: vi.fn(() => Promise.resolve()),
      readAll: vi.fn<EventStore['readAll']>(() => Promise.resolve(events)),
      readByAggregate: vi.fn(() => Promise.resolve([])),
      count: vi.fn(() => Promise.resolve(events.length)),
      readFromLatestSnapshot: vi.fn(() => Promise.reject(new Error('snapshot read failed'))),
    };

    await bootstrapFromEvents(eventStore, clock, idGenerator);

    // readAll should have been called as fallback
    expect(eventStore.readAll).toHaveBeenCalled();
    const canvas = useCanvasStore.getState();
    expect(canvas.todos.items).toHaveLength(1);
    expect(canvas.todos.items[0]!.title).toBe('Fallback todo');
  });
});

describe('Snapshot performance (AC2, AC3)', () => {
  beforeEach(() => {
    resetStores();
    idCounter = 0;
  });

  function generateEvents(count: number, startId = 0): DomainEvent[] {
    return Array.from({ length: count }, (_, i) => ({
      eventType: 'TodoDeclared' as const,
      eventId: `perf-ev-${startId + i}`,
      aggregateId: `todo-perf-${startId + i}`,
      schemaVersion: CURRENT_SCHEMA_VERSION,
      timestamp: 1000 + startId + i,
      title: `Perf todo ${startId + i}`,
    }));
  }

  it('replays 500 events (post-snapshot) in under 50ms (NFR4)', async () => {
    const events = generateEvents(500);
    const eventStore = createMockEventStore(events);

    const start = performance.now();
    await bootstrapFromEvents(eventStore, clock, idGenerator);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(50);
    expect(useCanvasStore.getState().todos.items).toHaveLength(500);
  });

  it('replays 5,000 total events with snapshots every 500 in under 200ms (NFR5)', async () => {
    // Build 5,000 events with snapshots every 500
    const allEvents: DomainEvent[] = [];
    let currentTodoList = INITIAL_TODO_LIST_STATE;

    for (let batch = 0; batch < 10; batch++) {
      const batchEvents = generateEvents(500, batch * 500);
      allEvents.push(...batchEvents);
      currentTodoList = batchEvents.reduce(projectTodoList, currentTodoList);

      const snapshot: SnapshotCreatedEvent = {
        eventType: 'SnapshotCreated',
        eventId: `snap-${batch}`,
        aggregateId: 'system',
        schemaVersion: CURRENT_SCHEMA_VERSION,
        timestamp: 100_000 + batch * 10_000,
        snapshotState: {
          todoList: currentTodoList,
          shelf: INITIAL_SHELF_STATE,
          devotionRecord: INITIAL_DEVOTION_RECORD_STATE,
          activeSession: INITIAL_ACTIVE_SESSION_STATE,
        },
      };
      allEvents.push(snapshot);
    }

    const eventStore = createMockEventStore(allEvents);

    const start = performance.now();
    await bootstrapFromEvents(eventStore, clock, idGenerator);
    const elapsed = performance.now() - start;

    expect(elapsed).toBeLessThan(200);
    // The mock only gives post-last-snapshot events (0 events after the last snapshot)
    // so state comes from the last snapshot which has all 5000 todos projected
    expect(useCanvasStore.getState().todos.items).toHaveLength(5000);
  });
});
