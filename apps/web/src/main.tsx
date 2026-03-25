import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createEventStore } from './db.js';
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
  createSnapshotIfNeeded,
  deserializeSnapshotState,
} from '@tododoro/domain';
import type { DomainEvent, SnapshotCreatedEvent, SnapshotReadResult } from '@tododoro/domain';
import { useCanvasStore } from './stores/useCanvasStore.js';
import { useSessionStore } from './stores/useSessionStore.js';
import { SystemClock } from './adapters/SystemClock.js';
import { CryptoIdGenerator } from './adapters/CryptoIdGenerator.js';
import { App } from './App.js';
import './index.css';

async function bootstrap() {
  const eventStore = await createEventStore();
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();

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

    // Repair only the post-snapshot events (pre-snapshot events were already repaired at snapshot creation)
    const repairedEvents = repairEvents(rawEvents, clock, idGenerator);

    // Persist any events synthesized by the repair pipeline (e.g. auto-completed orphaned sessions).
    // If persisting a synthesized event fails, skip it — it will be re-created on next boot.
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
    // Re-assignment is necessary: partial execution may have modified some state
    // vars (e.g., todoListState updated before shelfState reduce throws).
    todoListState = INITIAL_TODO_LIST_STATE;
    shelfState = INITIAL_SHELF_STATE;
    devotionState = INITIAL_DEVOTION_RECORD_STATE;
    sessionState = INITIAL_ACTIVE_SESSION_STATE;
  }

  useCanvasStore.getState().bootstrap(todoListState, shelfState, devotionState);
  useSessionStore.getState().bootstrap(sessionState);
}

const rootElement = document.getElementById('app');
if (!rootElement) throw new Error('Root element #app not found');

bootstrap()
  .then(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((_error: unknown) => {
    createRoot(rootElement).render(
      <StrictMode>
        <div className="p-8 text-text-primary">
          <h1>tododoro</h1>
          <p>Something went wrong during startup. Try clearing your browser data and reloading.</p>
        </div>
      </StrictMode>,
    );
  });
