import type { EventStore } from '@tododoro/domain';
import { JsonEventStore, SqliteEventStore } from '@tododoro/storage';

/** Which storage backend was selected on boot. */
export let activeStoreType: 'sqlite' | 'json' = 'json';

let _eventStore: EventStore | null = null;

/**
 * Returns the event store singleton created during bootstrap.
 * Must be called after `createEventStore()` has resolved.
 */
export function getEventStore(): EventStore {
  if (!_eventStore) throw new Error('Event store not initialized — call createEventStore() first');
  return _eventStore;
}

/** @internal Test-only: inject an event store without async initialization. */
export function _setEventStoreForTest(store: EventStore): void {
  _eventStore = store;
}

export async function createEventStore(): Promise<EventStore> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      // AC#4: Verify Cross-Origin Isolation headers (COOP/COEP) are present.
      // SQLocal's opfs-sahpool VFS does NOT require SharedArrayBuffer, so it
      // works without COOP/COEP — but the headers are expected for CSP compliance.
      if (!crossOriginIsolated) {
        // Headers not configured — OPFS still works via opfs-sahpool VFS,
        // but this indicates a deployment configuration gap.
      }

      const store = new SqliteEventStore('tododoro.sqlite3');
      await store.initialize();
      activeStoreType = 'sqlite';
      _eventStore = store;
      return store;
    } catch {
      // OPFS not available — fall back to localStorage.
    }
  }
  const fallback = new JsonEventStore();
  _eventStore = fallback;
  return fallback;
}
