import type { EventStore } from '@tododoro/domain';
import { JsonEventStore, SqliteEventStore } from '@tododoro/storage';

let _eventStore: EventStore | null = null;

/**
 * Returns the event store singleton created during bootstrap.
 * Must be called after `createEventStore()` has resolved.
 */
export function getEventStore(): EventStore {
  if (!_eventStore) throw new Error('Event store not initialized — call createEventStore() first');
  return _eventStore;
}

export async function createEventStore(): Promise<EventStore> {
  if (typeof navigator !== 'undefined' && 'storage' in navigator) {
    try {
      // AC#4: Verify Cross-Origin Isolation headers (COOP/COEP) are present.
      // SQLocal's opfs-sahpool VFS does NOT require SharedArrayBuffer, so it
      // works without COOP/COEP — but the headers are expected for CSP compliance.
      if (!crossOriginIsolated) {
        console.warn('[tododoro] Cross-Origin Isolation headers (COOP/COEP) not detected — OPFS may still work via opfs-sahpool VFS, but this indicates a deployment configuration gap.');
      }

      const store = new SqliteEventStore('tododoro.sqlite3');
      await store.initialize();
      _eventStore = store;
      return store;
    } catch (error) {
      console.warn('[tododoro] SQLite/OPFS init failed, falling back to localStorage:', error);
    }
  }
  const fallback = new JsonEventStore();
  _eventStore = fallback;
  return fallback;
}
