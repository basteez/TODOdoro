import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { JsonEventStore } from '@tododoro/storage';
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
import type { SnapshotCreatedEvent } from '@tododoro/domain';
import { useCanvasStore } from './stores/useCanvasStore.js';
import { useSessionStore } from './stores/useSessionStore.js';
import { SystemClock } from './adapters/SystemClock.js';
import { CryptoIdGenerator } from './adapters/CryptoIdGenerator.js';
import { App } from './App.js';
import './index.css';

async function bootstrap() {
  const eventStore = new JsonEventStore();
  const clock = new SystemClock();
  const idGenerator = new CryptoIdGenerator();

  const allEvents = await eventStore.readAll();
  const repairedEvents = repairEvents(allEvents, clock, idGenerator);

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
